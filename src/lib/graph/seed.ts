import type { Prisma } from "@/generated/prisma/client";
import * as fixtures from "./fixtures";
import {
  accessRows,
  type Db,
  linkLooseFacts,
  nodeRow,
  recountEdges,
  syncAnswers,
} from "./store";

// The graph as a demo starts: the company graph in fixtures.ts and the
// questions already in people's inboxes. People and their accounts are not
// part of it (see prisma/accounts.ts).

const at = (iso: string) => new Date(iso);

// Questions already in people's inboxes when the demo starts.
export const demoQuestions: Prisma.QuestionCreateManyInput[] = [
  {
    id: "q-demo-oauth",
    kind: "QUESTION",
    askerId: "p-timon",
    recipientId: "p-victor",
    question: "When does the Payroll API switch to OAuth?",
    nodeIds: ["n-api-oauth"],
    createdAt: at("2026-09-29T09:12:00Z"),
  },
  {
    id: "q-demo-kras-pricing",
    kind: "ACCESS",
    askerId: "p-julien",
    recipientId: "p-bram",
    question: "Can I see what you know about this?",
    nodeIds: ["n-kras-pricing"],
    createdAt: at("2026-09-29T14:40:00Z"),
  },
  {
    id: "q-demo-renewal",
    kind: "QUESTION",
    askerId: "p-victor",
    recipientId: "p-dario",
    question: "Did we agree on a renewal discount for Kras?",
    nodeIds: ["n-kras-renewal"],
    createdAt: at("2026-09-30T10:30:00Z"),
  },
  {
    id: "q-demo-oauth-date",
    kind: "QUESTION",
    askerId: "p-victor",
    recipientId: "p-kobe",
    question: "Is the OAuth go-live still mid-December?",
    nodeIds: ["n-api-oauth"],
    createdAt: at("2026-09-30T08:05:00Z"),
  },
  {
    id: "q-demo-ai-budget",
    kind: "QUESTION",
    askerId: "p-julien",
    recipientId: "p-kobe",
    question: "Is the AI tooling budget approved?",
    nodeIds: ["n-ai-budget"],
    status: "ANSWERED",
    answer:
      "Yes, €40k is approved for Q4. We need to pick a vendor before November.",
    shareScope: "ASKER",
    createdAt: at("2026-09-26T15:20:00Z"),
    resolvedAt: at("2026-09-26T16:01:00Z"),
    seenAt: at("2026-09-26T16:30:00Z"),
  },
  {
    id: "q-demo-sla",
    kind: "QUESTION",
    askerId: "p-pieter",
    recipientId: "p-filip",
    question: "Does the two-day payroll SLA also hold in December?",
    nodeIds: ["n-payroll-sla"],
    createdAt: at("2026-09-30T07:45:00Z"),
  },
];

// One Person row per person in the fixtures: missing ones are added and
// changed ones updated, one query per changed row. The graph seed and the
// account seed (prisma/accounts.ts) both start here.
export async function seedPeople(db: Db) {
  const existing = new Map(
    (await db.person.findMany()).map((row) => [row.id, row]),
  );
  const { count } = await db.person.createMany({
    data: fixtures.people.filter((p) => !existing.has(p.id)),
  });
  const changed = fixtures.people.filter((p) => {
    const row = existing.get(p.id);
    return (
      row &&
      (row.name !== p.name ||
        row.role !== p.role ||
        row.department !== p.department)
    );
  });
  await Promise.all(
    changed.map(({ id, ...data }) => db.person.update({ where: { id }, data })),
  );
  return { added: count, updated: changed.length };
}

// Replaces the graph with the one a demo starts from. Deletes every question,
// with the answers and access it added, every fact and edge, and which
// sources are connected; then writes the fixture graph, the demo questions
// and their answers, and links facts cut off from the rest (links.ts). People
// are only added or updated, so accounts and their sessions stay. Run it in a
// transaction.
export async function seedGraph(db: Db) {
  const deleted = {
    questions: (await db.question.deleteMany()).count,
    // Edges and access go with their facts.
    facts: (await db.knowledgeNode.deleteMany()).count,
  };
  await db.integrations.deleteMany();

  await db.integrations.createMany({
    data: fixtures.integrations.map(({ connectedAt, ...integration }) => ({
      ...integration,
      connectedAt: connectedAt ? new Date(connectedAt) : null,
    })),
  });
  const people = await seedPeople(db);
  await db.knowledgeNode.createMany({ data: fixtures.nodes.map(nodeRow) });
  await db.nodeAccess.createMany({ data: fixtures.nodes.flatMap(accessRows) });
  await db.knowledgeEdge.createMany({ data: fixtures.edges });
  await db.question.createMany({ data: demoQuestions });
  const answers = await syncAnswers(db);
  const links = await linkLooseFacts(db);
  await recountEdges(db);

  return {
    deleted,
    people,
    written: {
      facts: fixtures.nodes.length,
      edges: fixtures.edges.length,
      questions: demoQuestions.length,
      answers,
      links,
    },
  };
}
