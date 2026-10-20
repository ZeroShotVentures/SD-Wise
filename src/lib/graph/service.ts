import "server-only";
import { after } from "next/server";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { canSee, toEdgeView, toNodeView } from "./access";
import { answerFor, draftFacts, lockedHits, searchGraph } from "./ai";
import {
  publishable,
  questionIdOf,
  type ResolvedQuery,
  unseenFor,
} from "./answers";
import { writeAnswer, writeDraft, writeGeneral } from "./llm";
import {
  type Db,
  integrationStats,
  personSelect,
  readGraph,
  readIntegrations,
  readLiveNodes,
  readPeople,
  saveAnswer,
  toQuery,
  withPeople,
} from "./store";
import type {
  AskResult,
  GraphView,
  InboxItem,
  IntegrationStats,
  KnowledgeEdge,
  KnowledgeNode,
  Person,
  ShareScope,
} from "./types";

// The knowledge graph lives in Postgres (store.ts): facts, edges, who can see
// them, and the questions between people whose answers add to it.
// Integrations are still mocked: connecting a source only flips a flag.

export async function personFor(userId: string): Promise<Person | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { person: { select: personSelect } },
  });
  return user?.person ?? null;
}

export async function getGraph(me: Person): Promise<GraphView> {
  const [{ nodes, edges }, people, integrations, unseenAnswers] =
    await Promise.all([
      readGraph(prisma),
      readPeople(prisma),
      readIntegrations(prisma),
      prisma.question.findMany({
        where: { askerId: me.id, status: "ANSWERED", seenAt: null },
        include: withPeople,
      }),
    ]);
  const visible = new Set(
    nodes.filter((n) => canSee(n, me.id)).map((n) => n.id),
  );
  const unseen = unseenFor(me.id, unseenAnswers.map(toQuery));
  return {
    me,
    people,
    integrations,
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
  const rawQuestionId = questionIdOf(parseId(rawNodeId));
  if (!rawQuestionId) return;
  await prisma.question.updateMany({
    where: {
      id: { equals: parseId(rawQuestionId) },
      askerId: me.id,
      status: "ANSWERED",
      seenAt: null,
    },
    data: { seenAt: new Date() },
  });
}

// Asking calls Claude and sending notifies colleagues (and drafts a reply with
// Claude), so both are capped per person, for the app and MCP clients alike.
const MINUTE = 60_000;
const limitAsks = (me: Person) => rateLimit(`ask:${me.id}`, 20, MINUTE);
const limitSends = (me: Person) => rateLimit(`send:${me.id}`, 10, MINUTE);

// Drafts written per inbox load. The rest are written on later loads.
const DRAFTS_PER_LOAD = 5;

// The newest questions an inbox load reads, sent and received together.
const INBOX_LIMIT = 200;

export async function ask(me: Person, question: string): Promise<AskResult> {
  await limitAsks(me);
  const { nodes, edges } = await readGraph(prisma);
  const { hits, visited } = searchGraph(question, nodes, edges);
  const result = answerFor(question, me.id, hits, visited, nodes);
  // answerFor only puts facts `me` can see in the answer.
  const nodeIds = result.answer?.nodeIds ?? [];
  const facts = nodeIds.flatMap((id) => nodes.find((n) => n.id === id) ?? []);
  const text = facts.length ? await writeAnswer(question, facts) : null;
  if (text) return { ...result, answer: { text, nodeIds } };
  // No fact answers it. Claude answers questions that need none, like "what
  // time is it?", and otherwise says so and points to a colleague. Locked
  // matches already offer their own Ask a colleague.
  const general = await writeGeneral(question);
  return {
    ...result,
    answer: { text: general.text, nodeIds: [] },
    askColleague: !general.answered && !result.moreAvailable,
  };
}

// Everyone `me` can send a question to.
export async function colleagues(me: Person) {
  const people = await readPeople(prisma);
  return people.filter((p) => p.id !== me.id);
}

// Lets a client cite an answer's facts without loading the whole graph.
export async function factsFor(me: Person, ids: string[]) {
  const nodes = await readLiveNodes(prisma, ids.map(parseId));
  return nodes
    .filter((n) => canSee(n, me.id))
    .map(({ id, title, source }) => ({ id, title, source }));
}

// Sends the question to the owners of the locked facts that match it, one
// question per owner with the facts of theirs it matched, and drafts each
// their reply. They answer the asker or everyone, or decline; their facts stay
// theirs. The search reruns here so the asker never learns which facts or
// whose. Returns nothing either way, so asking can't confirm that anything
// matched.
export async function askOwners(me: Person, question: string) {
  await limitSends(me);
  const { nodes, edges } = await readGraph(prisma);
  const { hits } = searchGraph(question, nodes, edges);
  const byOwner = new Map<string, string[]>();
  for (const node of lockedHits(me.id, hits, nodes)) {
    const ownerId = node.ownerIds[0];
    if (!ownerId) continue;
    byOwner.set(ownerId, [...(byOwner.get(ownerId) ?? []), node.id]);
  }
  await Promise.all(
    [...byOwner].map(async ([recipientId, nodeIds]) => {
      const existing = await prisma.question.findFirst({
        where: {
          routed: true,
          status: "PENDING",
          askerId: me.id,
          recipientId,
          nodeIds: { hasSome: nodeIds },
        },
      });
      if (existing) return;
      await send(me, { recipientId, question, nodeIds, routed: true });
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
  await limitSends(me);
  const recipient = await prisma.person.findUnique({
    where: { id: recipientId },
    select: { id: true },
  });
  if (!recipient) throw new Error("Unknown person");
  return send(me, { recipientId, question, nodeIds, routed: false });
}

async function send(
  me: Person,
  data: {
    recipientId: string;
    question: string;
    nodeIds: string[];
    routed: boolean;
  },
) {
  const created = await prisma.question.create({
    data: { ...data, askerId: me.id },
    include: withPeople,
  });
  // Draft the reply now, so it's ready when the recipient opens their inbox.
  after(async () => {
    await draftReply(toQuery(created), await readGraph(prisma));
  });
  return created;
}

type Graph = { nodes: KnowledgeNode[]; edges: KnowledgeEdge[] };

const replyFacts = (q: ResolvedQuery, graph: Graph) =>
  draftFacts(q.question, q.recipientId, q.nodeIds, graph.nodes, graph.edges);

// The draft can draw on any fact the recipient can see, not just the matched
// ones, so all of those must be publishable for the answer to go to everyone.
const canShareAll = (q: ResolvedQuery, graph: Graph) =>
  publishable(replyFacts(q, graph), q.recipientId);

// Claude drafts the recipient's reply once, from what they can see, and it's
// stored: "" when nothing they know answers it, null until written. A failed
// call leaves it null, so the next inbox load tries again.
async function draftReply(q: ResolvedQuery, graph: Graph) {
  const facts = replyFacts(q, graph);
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

// Resolves a pending question addressed to me. The status check is part of
// the update, so a question can only be resolved once.
async function resolve(
  db: Db,
  me: Person,
  rawQueryId: string,
  data: Prisma.QuestionUpdateManyMutationInput,
) {
  const queryId = parseId(rawQueryId);
  const { count } = await db.question.updateMany({
    where: {
      id: { equals: queryId },
      recipientId: me.id,
      status: "PENDING",
    },
    data: { ...data, resolvedAt: new Date() },
  });
  if (count === 0) throw new Error("Nothing to answer");
}

// The answer becomes a node in the same transaction, so a question is never
// answered without one.
export async function answerQuery(
  me: Person,
  rawQueryId: string,
  answer: string,
  scope: ShareScope,
) {
  const queryId = parseId(rawQueryId);
  await prisma.$transaction(async (tx) => {
    await resolve(tx, me, queryId, {
      status: "ANSWERED",
      answer,
      shareScope: scope,
    });
    const row = await tx.question.findUniqueOrThrow({
      where: { id: queryId },
      include: withPeople,
    });
    const q = toQuery(row);
    if (scope === "PUBLIC" && !canShareAll(q, await readGraph(tx))) {
      throw new Error("Based on private facts that aren't yours to share");
    }
    await saveAnswer(tx, q);
  });
}

export async function declineQuery(me: Person, queryId: string) {
  await resolve(prisma, me, queryId, { status: "DECLINED" });
}

const HIDDEN_OWNER = {
  id: "owner",
  name: "A colleague who knows",
  role: "Colleague",
};

export async function getInbox(me: Person) {
  const rows = await prisma.question.findMany({
    where: { OR: [{ recipientId: me.id }, { askerId: me.id }] },
    include: withPeople,
    orderBy: { createdAt: "desc" },
    take: INBOX_LIMIT,
  });

  const queries = rows.map(toQuery);

  // Only the recipient ever sees the draft. Questions sent before drafting
  // existed, or whose drafting failed, get theirs now.
  const drafts = new Map(rows.map((row) => [row.id, row.draft]));
  const draftable = (q: ResolvedQuery) =>
    q.recipientId === me.id && q.status === "PENDING";
  const undrafted = queries
    .filter((q) => draftable(q) && drafts.get(q.id) === null)
    .slice(0, DRAFTS_PER_LOAD);
  const readDraftGraph = async () => {
    if (!queries.some(draftable)) return null;
    const graph = await readGraph(prisma);
    await Promise.all(
      undrafted.map(async (q) => drafts.set(q.id, await draftReply(q, graph))),
    );
    return graph;
  };
  const [nodes, graph] = await Promise.all([
    readLiveNodes(prisma, [...new Set(queries.flatMap((q) => q.nodeIds))]),
    readDraftGraph(),
  ]);
  const byId = new Map(nodes.map((n) => [n.id, n]));

  const toItem = (q: ResolvedQuery): InboxItem => ({
    ...q,
    suggestedAnswer: (draftable(q) && drafts.get(q.id)) || null,
    nodeTitles: q.nodeIds.flatMap((id) => {
      const node = byId.get(id);
      return node && canSee(node, me.id) ? [node.title] : [];
    }),
    canShareAll: draftable(q) && graph !== null && canShareAll(q, graph),
  });

  // A question SD Wise routed mustn't tell the asker whose facts matched it,
  // until that person answers.
  const hideOwner = (item: InboxItem): InboxItem =>
    item.routed && item.status !== "ANSWERED"
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

export async function getIntegrations(me: Person): Promise<IntegrationStats[]> {
  const [integrations, stats] = await Promise.all([
    readIntegrations(prisma),
    integrationStats(prisma, me.id),
  ]);
  return integrations.map((integration) => {
    const { facts, people } = stats.get(integration.id) ?? {
      facts: 0,
      people: 0,
    };
    return Object.assign(integration, { facts, people });
  });
}

// Mocked: no OAuth, connecting just flips the flags, for everyone. A suite
// (Microsoft 365) connects several integrations with one sign-in.
export async function setConnected(ids: string[], connected: boolean) {
  await prisma.$transaction(async (tx) => {
    const { count } = await tx.integrations.updateMany({
      where: { id: { in: ids } },
      data: { connected, connectedAt: connected ? new Date() : null },
    });
    if (count !== new Set(ids).size) throw new Error("Unknown integration");
  });
}
