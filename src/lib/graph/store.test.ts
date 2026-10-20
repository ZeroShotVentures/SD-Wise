// @vitest-environment node
import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { canSee, toEdgeView, toNodeView } from "./access";
import { answerNodeId } from "./answers";
import { clusterGraph } from "./clusters";
import { edges, integrations, nodes } from "./fixtures";
import { demoQuestions, seedGraph } from "./seed";
import {
  type Db,
  linkLooseFacts,
  readGraph,
  readNodes,
  saveAnswer,
  syncAnswers,
  toQuery,
  withPeople,
} from "./store";

// Runs against the Postgres in TEST_DATABASE_URL (CI sets it), which must be
// on this machine. Every test starts from the graph a demo starts from, in a
// transaction that is rolled back, so the database is left as it was.
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
  data: { askerId: string; recipientId: string; routed?: boolean },
  nodeIds: string[],
) =>
  tx.question.create({
    data: {
      ...data,
      question: "When is the payroll cut-off in December?",
      nodeIds,
      status: "ANSWERED",
      answer: "14 December.",
      shareScope: "ASKER",
      resolvedAt: new Date(),
    },
    include: withPeople,
  });

// Each test reads or rewrites the whole graph, which takes a few seconds.
describe.skipIf(!prisma)("graph in the database", { timeout: 60_000 }, () => {
  it("puts the graph back to how a demo starts, and leaves accounts alone", () =>
    rolledBack(async (tx) => {
      // What testing leaves behind: answers, a disconnected source. The account has to survive.
      const now = new Date();
      const user = await tx.user.upsert({
        where: { personId: "p-kobe" },
        create: {
          id: "u-test-kobe",
          name: "Kobe Verdonck",
          email: "kobe-test@sdwise.be",
          emailVerified: true,
          createdAt: now,
          updatedAt: now,
          personId: "p-kobe",
        },
        update: {},
      });
      const asked = await answered(
        tx,
        { askerId: "p-kobe", recipientId: "p-filip" },
        ["n-cutoff-december"],
      );
      await saveAnswer(tx, toQuery(asked));
      const routed = await answered(
        tx,
        { askerId: "p-julien", recipientId: "p-bram", routed: true },
        ["n-norvik-pricing"],
      );
      await saveAnswer(tx, toQuery(routed));
      await tx.integrations.update({
        where: { id: "i-slack" },
        data: { connected: false },
      });

      const { deleted } = await seedGraph(tx);
      expect(deleted.questions).toBe(demoQuestions.length + 2);
      const left = await tx.question.findMany({ select: { id: true } });
      expect(left.map((q) => q.id).toSorted()).toEqual(
        demoQuestions.map((q) => q.id).toSorted(),
      );
      expect(await readNodes(tx, [answerNodeId(asked.id)])).toEqual([]);
      const pricing = nodes.find((n) => n.id === "n-norvik-pricing");
      expect(await node(tx, "n-norvik-pricing")).toEqual({
        ...pricing,
        createdAt: new Date(pricing?.createdAt ?? "").toISOString(),
      });
      expect(await tx.user.findUnique({ where: { id: user.id } })).not.toBe(
        null,
      );

      // Every source is back as it was, so every fixture fact and edge shows.
      const connected = new Set(
        integrations.filter((i) => i.connected).map((i) => i.id),
      );
      const live = nodes.filter(
        (n) => n.integrationId && connected.has(n.integrationId),
      );
      const graph = await readGraph(tx);
      const shown = new Set(graph.nodes.map((n) => n.id));
      expect(live.every((n) => shown.has(n.id))).toBe(true);
      const drawn = new Set(graph.edges.map((e) => e.id));
      expect(edges.every((e) => drawn.has(e.id))).toBe(true);
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
        { askerId: "p-kobe", recipientId: "p-filip" },
        ["n-cutoff-december", "n-norvik-pricing"],
      );
      await saveAnswer(tx, toQuery(row));

      const answer = await node(tx, answerNodeId(row.id));
      expect(answer.ownerIds).toEqual(["p-filip"]);
      expect(canSee(answer, "p-kobe")).toBe(true);
      expect(canSee(answer, "p-julien")).toBe(false);
      // Filip can't see the Norvik pricing, so the answer isn't linked to it.
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

  it("answers a routed question without sharing the facts behind it", () =>
    rolledBack(async (tx) => {
      const row = await answered(
        tx,
        { askerId: "p-julien", recipientId: "p-bram", routed: true },
        ["n-norvik-pricing"],
      );
      const answer = await saveAnswer(tx, toQuery(row));
      const saved = await node(tx, answer.id);
      expect(canSee(saved, "p-julien")).toBe(true);
      expect(canSee(saved, "p-kobe")).toBe(false);
      const pricing = await node(tx, "n-norvik-pricing");
      expect(canSee(pricing, "p-julien")).toBe(false);
      expect(pricing.accessIds).toEqual(["p-bram", "p-lotte"]);
    }));

  it("links facts cut off from the graph, so every fact is on a topic", () =>
    rolledBack(async (tx) => {
      await linkLooseFacts(tx);
      expect(await linkLooseFacts(tx)).toBe(0);
      const graph = await readGraph(tx);
      const { clusterOf } = clusterGraph(
        graph.nodes.map((n) => toNodeView(n, "p-kobe")),
        graph.edges.map((e) => toEdgeView(e, new Set())),
      );
      expect(clusterOf.size).toBe(graph.nodes.length);
    }));

  it("links an answer based on nothing the recipient could see", () =>
    rolledBack(async (tx) => {
      await linkLooseFacts(tx);
      // Julien can't see the Norvik pricing, so his answer has no fact to link.
      const row = await answered(
        tx,
        { askerId: "p-kobe", recipientId: "p-julien" },
        ["n-norvik-pricing"],
      );
      await saveAnswer(tx, toQuery(row));
      const id = answerNodeId(row.id);
      const links = await tx.knowledgeEdge.findMany({
        where: { OR: [{ sourceId: id }, { targetId: id }] },
      });
      expect(links).toHaveLength(1);
      expect(links[0]?.kind).toBe("RELATES_TO");
    }));

  it("writes each earlier answer once", () =>
    rolledBack(async (tx) => {
      await syncAnswers(tx);
      const row = await answered(
        tx,
        { askerId: "p-kobe", recipientId: "p-filip" },
        ["n-cutoff-december"],
      );
      expect(await syncAnswers(tx)).toBe(1);
      expect(await syncAnswers(tx)).toBe(0);
      expect(await readNodes(tx, [answerNodeId(row.id)])).toHaveLength(1);
    }));
});
