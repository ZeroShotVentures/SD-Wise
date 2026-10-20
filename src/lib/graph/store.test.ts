// @vitest-environment node
import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { canSee } from "./access";
import { answerNodeId } from "./answers";
import { edges, integrations, nodes } from "./fixtures";
import { seedGraph } from "./seed";
import {
  type Db,
  grantAccess,
  readGraph,
  readNodes,
  saveAnswer,
  syncAnswers,
  toQuery,
  withPeople,
} from "./store";

// Runs against the Postgres in TEST_DATABASE_URL (CI sets it), which must be
// on this machine. Every test starts from the fixture graph without any
// questions, in a transaction that is rolled back, so the database is left as
// it was.
const url = process.env.TEST_DATABASE_URL;
if (url && !["localhost", "127.0.0.1"].includes(new URL(url).hostname)) {
  throw new Error("TEST_DATABASE_URL must point at a database on localhost");
}

const prisma = url
  ? new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) })
  : null;

afterAll(() => prisma?.$disconnect());

const ROLLBACK = new Error("rollback");

async function rolledBack(test: (tx: Db) => Promise<void>) {
  if (!prisma) throw new Error("No database");
  try {
    await prisma.$transaction(
      async (tx) => {
        await seedGraph(tx);
        // Takes the answers and access they added with them.
        await tx.question.deleteMany();
        await test(tx);
        throw ROLLBACK;
      },
      { timeout: 60_000 },
    );
  } catch (error) {
    if (error !== ROLLBACK) throw error;
  }
}

const node = async (tx: Db, id: string) => {
  const [found] = await readNodes(tx, [id]);
  if (!found) throw new Error(`No node ${id}`);
  return found;
};

const answered = (
  tx: Db,
  data: { kind: "QUESTION" | "ACCESS"; askerId: string; recipientId: string },
  nodeIds: string[],
) =>
  tx.question.create({
    data: {
      ...data,
      question: "When is the payroll cut-off in December?",
      nodeIds,
      status: "ANSWERED",
      answer: data.kind === "QUESTION" ? "14 December." : null,
      shareScope: "ASKER",
      resolvedAt: new Date(),
    },
    include: withPeople,
  });

describe.skipIf(!prisma)("graph in the database", () => {
  it("holds the fixture graph, and seeding again changes nothing", () =>
    rolledBack(async (tx) => {
      await Promise.all(
        integrations.map(({ id, connected }) =>
          tx.integrations.update({ where: { id }, data: { connected } }),
        ),
      );
      const again = await seedGraph(tx);
      expect(again.added).toEqual({
        integrations: 0,
        people: 0,
        nodes: 0,
        access: 0,
        edges: 0,
      });
      expect(again.updated).toEqual({ people: 0, nodes: 0 });

      const pricing = nodes.find((n) => n.id === "n-kras-pricing");
      expect(await node(tx, "n-kras-pricing")).toEqual({
        ...pricing,
        createdAt: new Date(pricing?.createdAt ?? "").toISOString(),
      });

      const connected = new Set(
        integrations.filter((i) => i.connected).map((i) => i.id),
      );
      const live = nodes.filter(
        (n) => n.integrationId && connected.has(n.integrationId),
      );
      const graph = await readGraph(tx);
      const fixtureIds = graph.nodes
        .map((n) => n.id)
        .filter((id) => !id.startsWith("n-answer-"));
      expect(fixtureIds.toSorted()).toEqual(live.map((n) => n.id).toSorted());
      expect(graph.edges.filter((e) => e.kind !== "ANSWERS").length).toBe(
        edges.filter((e) => fixtureIds.includes(e.sourceId)).length,
      );
    }));

  it("drops facts from a disconnected source, and their edges", () =>
    rolledBack(async (tx) => {
      await tx.integrations.update({
        where: { id: "i-slack" },
        data: { connected: false },
      });
      const graph = await readGraph(tx);
      const ids = new Set(graph.nodes.map((n) => n.id));
      expect(graph.nodes.some((n) => n.integrationId === "i-slack")).toBe(
        false,
      );
      expect(
        graph.edges.every((e) => ids.has(e.sourceId) && ids.has(e.targetId)),
      ).toBe(true);
    }));

  it("turns an answer into a node, until the question is deleted", () =>
    rolledBack(async (tx) => {
      const before = await tx.knowledgeNode.findUniqueOrThrow({
        where: { id: "n-cutoff-december" },
      });
      const row = await answered(
        tx,
        { kind: "QUESTION", askerId: "p-kobe", recipientId: "p-filip" },
        ["n-cutoff-december", "n-kras-pricing"],
      );
      await saveAnswer(tx, toQuery(row));

      const answer = await node(tx, answerNodeId(row.id));
      expect(answer.ownerIds).toEqual(["p-filip"]);
      expect(canSee(answer, "p-kobe")).toBe(true);
      expect(canSee(answer, "p-julien")).toBe(false);
      // Filip can't see the Kras pricing, so the answer isn't linked to it.
      const linked = await tx.knowledgeEdge.findMany({
        where: { sourceId: answer.id },
      });
      expect(linked.map((e) => [e.targetId, e.kind])).toEqual([
        ["n-cutoff-december", "ANSWERS"],
      ]);
      const after = await tx.knowledgeNode.findUniqueOrThrow({
        where: { id: "n-cutoff-december" },
      });
      expect(after.edgeCount).toBe(before.edgeCount + 1);

      await tx.question.delete({ where: { id: row.id } });
      expect(await readNodes(tx, [answer.id])).toEqual([]);
    }));

  it("grants access to the asker only, until the request is deleted", () =>
    rolledBack(async (tx) => {
      const row = await answered(
        tx,
        { kind: "ACCESS", askerId: "p-julien", recipientId: "p-bram" },
        ["n-kras-pricing"],
      );
      await grantAccess(tx, row);
      const pricing = await node(tx, "n-kras-pricing");
      expect(canSee(pricing, "p-julien")).toBe(true);
      expect(canSee(pricing, "p-kobe")).toBe(false);
      expect(pricing.ownerIds).toEqual(["p-bram", "p-lotte"]);

      await tx.question.delete({ where: { id: row.id } });
      expect(canSee(await node(tx, "n-kras-pricing"), "p-julien")).toBe(false);
    }));

  it("writes each earlier answer once", () =>
    rolledBack(async (tx) => {
      await syncAnswers(tx);
      const row = await answered(
        tx,
        { kind: "QUESTION", askerId: "p-kobe", recipientId: "p-filip" },
        ["n-cutoff-december"],
      );
      expect(await syncAnswers(tx)).toBe(1);
      expect(await syncAnswers(tx)).toBe(0);
      expect(await readNodes(tx, [answerNodeId(row.id)])).toHaveLength(1);
    }));
});
