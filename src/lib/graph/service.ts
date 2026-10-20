import "server-only";
import { after } from "next/server";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { canSee, toEdgeView, toNodeView } from "./access";
import { answerFor, draftFacts, lockedHits, searchGraph } from "./ai";
import {
  answerNodeId,
  applyAnswers,
  questionIdOf,
  type ResolvedQuery,
  unseenFor,
} from "./answers";
import * as fixtures from "./fixtures";
import { writeAnswer, writeDraft } from "./llm";
import type {
  AskResult,
  GraphView,
  InboxItem,
  Integration,
  KnowledgeEdge,
  KnowledgeNode,
  Person,
  ShareScope,
} from "./types";

// The knowledge graph and integrations are still mocked (fixtures, in
// memory). Questions between people are stored in the database, so asking,
// answering and access requests work across instances.

const globalForGraph = globalThis as unknown as {
  sdWiseIntegrations?: Integration[];
};

function integrations() {
  globalForGraph.sdWiseIntegrations ??= structuredClone(fixtures.integrations);
  return globalForGraph.sdWiseIntegrations;
}

export function resetIntegrations() {
  globalForGraph.sdWiseIntegrations = undefined;
}

const withPeople = {
  asker: { include: { user: { select: { name: true } } } },
  recipient: { include: { user: { select: { name: true } } } },
} satisfies Prisma.QuestionInclude;

type QuestionRow = Prisma.QuestionGetPayload<{ include: typeof withPeople }>;
type PersonRow = QuestionRow["asker"];

// Names come from the fixtures (the graph's people), else from the linked
// account.
function toPerson(row: PersonRow): Person {
  return (
    fixtures.people.find((p) => p.id === row.id) ?? {
      id: row.id,
      name: row.user?.name ?? row.role,
      role: row.role,
      department: row.department,
    }
  );
}

function toQuery(row: QuestionRow): ResolvedQuery {
  const answered = row.status === "ANSWERED";
  return {
    id: row.id,
    kind: row.kind,
    askerId: row.askerId,
    recipientId: row.recipientId,
    question: row.question,
    nodeIds: row.nodeIds,
    status: row.status,
    answer: row.answer,
    shareScope: row.shareScope,
    answerNodeId: !answered
      ? null
      : row.kind === "ACCESS"
        ? (row.nodeIds[0] ?? null)
        : answerNodeId(row.id),
    createdAt: row.createdAt.toISOString(),
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
    seenAt: row.seenAt?.toISOString() ?? null,
    asker: toPerson(row.asker),
    recipient: toPerson(row.recipient),
  };
}

export async function personFor(userId: string): Promise<Person | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, person: true },
  });
  if (!user?.person) return null;
  return toPerson({ ...user.person, user: { name: user.name } });
}

// The fixture graph with answers layered on, minus disconnected sources.
async function loadGraph() {
  const answered = (
    await prisma.question.findMany({
      where: { status: "ANSWERED" },
      include: withPeople,
      orderBy: { resolvedAt: "asc" },
    })
  ).map(toQuery);
  const { nodes, edges } = applyAnswers(
    fixtures.nodes,
    fixtures.edges,
    answered,
  );
  const off = new Set(
    integrations()
      .filter((i) => !i.connected)
      .map((i) => i.id),
  );
  const live = nodes.filter(
    (n) => !n.integrationId || !off.has(n.integrationId),
  );
  const ids = new Set(live.map((n) => n.id));
  return {
    all: nodes,
    nodes: live,
    edges: edges.filter((e) => ids.has(e.sourceId) && ids.has(e.targetId)),
    answered,
  };
}

export async function getGraph(me: Person): Promise<GraphView> {
  const { nodes, edges, answered } = await loadGraph();
  const visible = new Set(
    nodes.filter((n) => canSee(n, me.id)).map((n) => n.id),
  );
  const unseen = unseenFor(me.id, answered);
  return {
    me,
    people: fixtures.people,
    integrations: integrations(),
    nodes: nodes.map((n) => toNodeView(n, me.id, unseen)),
    edges: edges.map((e) => toEdgeView(e, visible)),
  };
}

// Ids reach Prisma filters, so refuse anything that isn't a plain string: an
// object like { not: "x" } would otherwise be read as a query operator. Only
// the parsed value is passed on to Prisma.
const Id = z.string().min(1).max(100);

function parseId(value: unknown): string {
  const parsed = Id.safeParse(value);
  if (!parsed.success) throw new Error("Invalid id");
  return parsed.data;
}

export async function markSeen(me: Person, rawNodeId: string) {
  const nodeId = parseId(rawNodeId);
  const rawQuestionId = questionIdOf(nodeId);
  const questionId = rawQuestionId ? parseId(rawQuestionId) : null;
  await prisma.question.updateMany({
    where: {
      askerId: me.id,
      status: "ANSWERED",
      seenAt: null,
      OR: [
        { kind: "ACCESS", nodeIds: { has: nodeId } },
        ...(questionId ? [{ id: { equals: questionId } }] : []),
      ],
    },
    data: { seenAt: new Date() },
  });
}

export async function ask(me: Person, question: string): Promise<AskResult> {
  const { nodes, edges } = await loadGraph();
  const { hits, visited } = searchGraph(question, nodes, edges);
  const result = answerFor(question, me.id, hits, visited, nodes);
  if (!result.answer) return result;
  // answerFor only puts facts `me` can see in the answer.
  const facts = result.answer.nodeIds.flatMap(
    (id) => nodes.find((n) => n.id === id) ?? [],
  );
  const text = await writeAnswer(question, facts);
  return {
    ...result,
    answer: text ? { text, nodeIds: result.answer.nodeIds } : null,
  };
}

// Asks the owners of locked facts matching the question to share them. The
// search reruns here so the asker never learns which facts or whose. One
// request per owner, carrying the asker's question as context. Returns
// nothing either way, so a request can't confirm that anything matched.
export async function requestMore(me: Person, question: string) {
  const { nodes, edges } = await loadGraph();
  const { hits } = searchGraph(question, nodes, edges);
  const byOwner = new Map<string, string[]>();
  for (const node of lockedHits(me.id, hits, nodes)) {
    const ownerId = node.ownerIds[0];
    if (!ownerId) continue;
    byOwner.set(ownerId, [...(byOwner.get(ownerId) ?? []), node.id]);
  }
  await Promise.all(
    [...byOwner].map(async ([ownerId, nodeIds]) => {
      const existing = await prisma.question.findFirst({
        where: {
          kind: "ACCESS",
          status: "PENDING",
          askerId: me.id,
          recipientId: ownerId,
          nodeIds: { hasSome: nodeIds },
        },
      });
      if (existing) return;
      await prisma.question.create({
        data: {
          kind: "ACCESS",
          askerId: me.id,
          recipientId: ownerId,
          question,
          nodeIds,
        },
      });
    }),
  );
}

export async function askPerson(
  me: Person,
  recipientId: string,
  question: string,
  nodeIds: string[],
) {
  if (recipientId === me.id) throw new Error("Can't ask yourself");
  const recipient = await prisma.person.findUnique({
    where: { id: recipientId },
    select: { id: true },
  });
  if (!recipient) throw new Error("Unknown person");
  const created = await prisma.question.create({
    data: {
      kind: "QUESTION",
      askerId: me.id,
      recipientId,
      question,
      nodeIds,
    },
    include: withPeople,
  });
  // Draft the reply now, so it's ready when the recipient opens their inbox.
  after(async () => {
    await draftReply(toQuery(created), await loadGraph());
  });
  return created;
}

// Claude drafts the recipient's reply once, from what they can see, and it's
// stored: "" when nothing they know answers it, null until written. A failed
// call leaves it null, so the next inbox load tries again.
async function draftReply(
  q: ResolvedQuery,
  graph: { nodes: KnowledgeNode[]; edges: KnowledgeEdge[] },
) {
  const facts = draftFacts(
    q.question,
    q.recipientId,
    q.nodeIds,
    graph.nodes,
    graph.edges,
  );
  let draft: string;
  try {
    draft = facts.length
      ? ((await writeDraft(q.question, q.asker, facts)) ?? "")
      : "";
  } catch (error) {
    console.error(`Drafting a reply to question ${q.id} failed`, error);
    return null;
  }
  // Keeps the first draft when the inbox and `after` race to write one.
  await prisma.question.updateMany({
    where: { id: q.id, draft: null },
    data: { draft },
  });
  return draft;
}

export async function requestAccess(
  me: Person,
  nodeId: string,
  ownerId: string,
) {
  const { all } = await loadGraph();
  const node = all.find((n) => n.id === nodeId);
  if (!node) throw new Error("Unknown node");
  if (!node.ownerIds.includes(ownerId)) throw new Error("Not an owner");
  if (canSee(node, me.id)) throw new Error("Already has access");
  const existing = await prisma.question.findFirst({
    where: {
      kind: "ACCESS",
      status: "PENDING",
      askerId: me.id,
      nodeIds: { has: nodeId },
    },
  });
  if (existing) return existing;
  return prisma.question.create({
    data: {
      kind: "ACCESS",
      askerId: me.id,
      recipientId: ownerId,
      question: "Can I see what you know about this?",
      nodeIds: [nodeId],
    },
  });
}

// Resolves a pending question addressed to me. The status check is part of
// the update, so a question can only be resolved once.
async function resolve(
  me: Person,
  rawQueryId: string,
  kind: "QUESTION" | "ACCESS" | undefined,
  data: Prisma.QuestionUpdateManyMutationInput,
) {
  const queryId = parseId(rawQueryId);
  const { count } = await prisma.question.updateMany({
    where: {
      id: { equals: queryId },
      recipientId: me.id,
      status: "PENDING",
      kind,
    },
    data: { ...data, resolvedAt: new Date() },
  });
  if (count === 0) throw new Error("Nothing to answer");
}

export async function answerQuery(
  me: Person,
  queryId: string,
  answer: string,
  scope: ShareScope,
) {
  await resolve(me, queryId, "QUESTION", {
    status: "ANSWERED",
    answer,
    shareScope: scope,
  });
}

export async function approveAccess(me: Person, rawQueryId: string) {
  const queryId = parseId(rawQueryId);
  const [query, { all }] = await Promise.all([
    prisma.question.findUnique({ where: { id: queryId } }),
    loadGraph(),
  ]);
  const owns = query?.nodeIds.every((id) =>
    all.find((n) => n.id === id)?.ownerIds.includes(me.id),
  );
  if (query?.kind === "ACCESS" && !owns) throw new Error("Not an owner");
  await resolve(me, queryId, "ACCESS", {
    status: "ANSWERED",
    shareScope: "ASKER",
  });
}

export async function declineQuery(me: Person, queryId: string) {
  await resolve(me, queryId, undefined, { status: "DECLINED" });
}

const HIDDEN_OWNER = { id: "owner", name: "The owner", role: "Owner" };

export async function getInbox(me: Person) {
  const [rows, graph] = await Promise.all([
    prisma.question.findMany({
      where: { OR: [{ recipientId: me.id }, { askerId: me.id }] },
      include: withPeople,
      orderBy: { createdAt: "desc" },
    }),
    loadGraph(),
  ]);

  const queries = rows.map(toQuery);

  // Only the recipient ever sees the draft. Questions sent before drafting
  // existed, or whose drafting failed, get theirs now.
  const drafts = new Map(rows.map((row) => [row.id, row.draft]));
  const draftable = (q: ResolvedQuery) =>
    q.recipientId === me.id && q.kind === "QUESTION" && q.status === "PENDING";
  await Promise.all(
    queries
      .filter((q) => draftable(q) && drafts.get(q.id) === null)
      .map(async (q) => drafts.set(q.id, await draftReply(q, graph))),
  );

  const toItem = (q: ResolvedQuery): InboxItem => ({
    ...q,
    suggestedAnswer: (draftable(q) && drafts.get(q.id)) || null,
    nodeTitles: q.nodeIds.flatMap((id) => {
      const node = graph.all.find((n) => n.id === id);
      return node && canSee(node, me.id) ? [node.title] : [];
    }),
  });

  // Until an owner shares, an access request mustn't tell the asker who it
  // went to. Once shared, the fact itself names its owners.
  const hideOwner = (item: InboxItem): InboxItem =>
    item.kind === "ACCESS" && item.status !== "ANSWERED"
      ? {
          ...item,
          recipientId: "",
          recipient: { ...HIDDEN_OWNER, department: me.department },
        }
      : item;

  return {
    received: queries.filter((q) => q.recipientId === me.id).map(toItem),
    sent: queries
      .filter((q) => q.askerId === me.id)
      .map(toItem)
      .map(hideOwner),
  };
}

export function pendingCount(me: Person) {
  return prisma.question.count({
    where: { recipientId: me.id, status: "PENDING" },
  });
}

export function getIntegrations() {
  return integrations().map((integration) => {
    const nodes = fixtures.nodes.filter(
      (n) => n.integrationId === integration.id,
    );
    return {
      id: integration.id,
      type: integration.type,
      connected: integration.connected,
      connectedAt: integration.connectedAt,
      facts: nodes.length,
      people: new Set(nodes.flatMap((n) => n.ownerIds)).size,
    };
  });
}

// Mocked: no OAuth, connecting just flips the flags in memory. A suite
// (Microsoft 365) connects several integrations with one sign-in.
export function setConnected(ids: string[], connected: boolean) {
  const all = integrations();
  const targets = ids.map((id) => {
    const integration = all.find((i) => i.id === id);
    if (!integration) throw new Error("Unknown integration");
    return integration;
  });
  const now = new Date().toISOString();
  for (const integration of targets) {
    integration.connected = connected;
    integration.connectedAt = connected ? now : null;
  }
  return targets;
}
