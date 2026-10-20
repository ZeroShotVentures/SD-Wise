import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { answerGraph, answerNodeId, type ResolvedQuery } from "./answers";
import type { Integration, KnowledgeNode, Person, Query } from "./types";

// The knowledge graph in Postgres: facts, who can see them, the edges between
// them, and the answers and access that questions add. Every function takes
// the client or a transaction, so the app and the seed scripts share them.

export type Db = PrismaClient | Prisma.TransactionClient;

export const personSelect = {
  id: true,
  name: true,
  role: true,
  department: true,
} satisfies Prisma.PersonSelect;

export const withPeople = {
  asker: { select: personSelect },
  recipient: { select: personSelect },
} satisfies Prisma.QuestionInclude;

type QuestionRow = Prisma.QuestionGetPayload<{ include: typeof withPeople }>;

const nodeSelect = {
  id: true,
  title: true,
  content: true,
  contentSummary: true,
  source: true,
  integrationId: true,
  sourceDescription: true,
  visibility: true,
  createdAt: true,
  access: {
    select: { personId: true, owner: true },
    orderBy: { position: "asc" },
  },
} satisfies Prisma.KnowledgeNodeSelect;

type NodeRow = Prisma.KnowledgeNodeGetPayload<{ select: typeof nodeSelect }>;

const edgeSelect = {
  id: true,
  sourceId: true,
  targetId: true,
  kind: true,
  description: true,
} satisfies Prisma.KnowledgeEdgeSelect;

function toNode({ access, createdAt, ...node }: NodeRow): KnowledgeNode {
  return {
    ...node,
    ownerIds: access.filter((a) => a.owner).map((a) => a.personId),
    accessIds: access.map((a) => a.personId),
    createdAt: createdAt.toISOString(),
  };
}

// A node's columns, without who can see it.
export function nodeRow({
  ownerIds: _owners,
  accessIds: _access,
  createdAt,
  ...node
}: KnowledgeNode) {
  return { ...node, createdAt: new Date(createdAt) };
}

// Owners first, in order, then the rest of the access list.
export function accessRows(node: KnowledgeNode) {
  return [...new Set([...node.ownerIds, ...node.accessIds])].map(
    (personId, position) => ({
      nodeId: node.id,
      personId,
      owner: node.ownerIds.includes(personId),
      position,
    }),
  );
}

export function toQuery(row: QuestionRow): ResolvedQuery {
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
    asker: row.asker,
    recipient: row.recipient,
  };
}

// Facts from connected sources and answers written in SD Wise, with the edges
// between them. Oldest first: the topic islands depend on the order, so they
// come out the same on every load.
export async function readGraph(db: Db) {
  const [rows, edges] = await Promise.all([
    db.knowledgeNode.findMany({
      where: {
        OR: [{ integrationId: null }, { integration: { connected: true } }],
      },
      select: nodeSelect,
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    }),
    db.knowledgeEdge.findMany({ select: edgeSelect, orderBy: { id: "asc" } }),
  ]);
  const nodes = rows.map(toNode);
  const ids = new Set(nodes.map((n) => n.id));
  return {
    nodes,
    edges: edges.filter((e) => ids.has(e.sourceId) && ids.has(e.targetId)),
  };
}

// Nodes by id, whether or not their source is connected.
export async function readNodes(db: Db, ids: string[]) {
  if (ids.length === 0) return [];
  const rows = await db.knowledgeNode.findMany({
    where: { id: { in: ids } },
    select: nodeSelect,
  });
  return rows.map(toNode);
}

export function readPeople(db: Db): Promise<Person[]> {
  return db.person.findMany({
    select: personSelect,
    orderBy: [{ name: "asc" }, { id: "asc" }],
  });
}

// In the order the Integrations page lists them, which is the enum's order.
export async function readIntegrations(db: Db): Promise<Integration[]> {
  const rows = await db.integrations.findMany({
    orderBy: [{ type: "asc" }, { id: "asc" }],
  });
  return rows.map(({ id, type, connected, connectedAt }) => ({
    id,
    type,
    connected,
    connectedAt: connectedAt?.toISOString() ?? null,
  }));
}

// Facts per source and how many people own them, connected or not. Answers
// have no source.
export async function integrationStats(db: Db) {
  const rows = await db.$queryRaw<
    { integrationId: string; facts: bigint; people: bigint }[]
  >`
    SELECT n."integrationId",
      COUNT(DISTINCT n.id) AS facts,
      COUNT(DISTINCT a."personId") AS people
    FROM "KnowledgeNode" n
    LEFT JOIN "NodeAccess" a ON a."nodeId" = n.id AND a.owner
    WHERE n."integrationId" IS NOT NULL
    GROUP BY n."integrationId"
  `;
  return new Map(
    rows.map((r) => [
      r.integrationId,
      { facts: Number(r.facts), people: Number(r.people) },
    ]),
  );
}

// edgeCount: the edges in and out of each node, for every node or the given
// ones.
export async function recountEdges(db: Db, ids?: string[]) {
  await db.$executeRaw`
    UPDATE "KnowledgeNode" n
    SET "edgeCount" = (
      SELECT COUNT(*) FROM "KnowledgeEdge" e
      WHERE e."sourceId" = n.id OR e."targetId" = n.id
    )
    ${ids ? Prisma.sql`WHERE n.id = ANY(${ids})` : Prisma.empty}
  `;
}

// Writes an answered question as a node linked to the facts it was based on.
// Deleting the question deletes the node, its edges and its access list.
export async function saveAnswer(db: Db, q: ResolvedQuery) {
  const { node, edges } = answerGraph(q, await readNodes(db, q.nodeIds));
  await db.knowledgeNode.create({
    data: { ...nodeRow(node), questionId: q.id },
  });
  await db.nodeAccess.createMany({ data: accessRows(node) });
  await db.knowledgeEdge.createMany({ data: edges });
  await recountEdges(db, [node.id, ...edges.map((e) => e.targetId)]);
  return node;
}

// An approved access request adds the asker to the nodes' access lists.
// Deleting the request takes the access away again.
export async function grantAccess(
  db: Db,
  q: Pick<Query, "id" | "askerId" | "nodeIds">,
) {
  const nodes = await db.knowledgeNode.findMany({
    where: { id: { in: q.nodeIds } },
    select: { id: true },
  });
  await db.nodeAccess.createMany({
    data: nodes.map(({ id }) => ({
      nodeId: id,
      personId: q.askerId,
      questionId: q.id,
    })),
    skipDuplicates: true,
  });
}

// Writes the answers and access grants that aren't in the graph yet, oldest
// first, since an answer only links facts its author could see by then. For
// questions answered before the graph moved to the database, and the demo
// questions. Returns how many answers it wrote.
export async function syncAnswers(db: Db) {
  const [answered, written] = await Promise.all([
    db.question.findMany({
      where: { status: "ANSWERED" },
      include: withPeople,
      orderBy: [{ resolvedAt: "asc" }, { id: "asc" }],
    }),
    db.knowledgeNode.findMany({
      where: { questionId: { not: null } },
      select: { questionId: true },
    }),
  ]);
  const done = new Set(written.map((n) => n.questionId));
  let added = 0;
  for (const row of answered) {
    if (row.kind === "ACCESS") {
      // oxlint-disable-next-line no-await-in-loop
      await grantAccess(db, row);
    } else if (!done.has(row.id)) {
      // oxlint-disable-next-line no-await-in-loop
      await saveAnswer(db, toQuery(row));
      added += 1;
    }
  }
  return added;
}
