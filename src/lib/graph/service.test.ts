// @vitest-environment node
import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import type { KnowledgeNode } from "./types";

// Runs against the Postgres in TEST_DATABASE_URL, like store.test.ts. The
// people it asks with are its own and are deleted afterwards, with their
// questions.
const url = process.env.TEST_DATABASE_URL;
if (url && !["localhost", "127.0.0.1"].includes(new URL(url).hostname)) {
  throw new Error("TEST_DATABASE_URL must point at a database on localhost");
}

const db = vi.hoisted(() => ({ prisma: null as PrismaClient | null }));
db.prisma = url
  ? new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) })
  : null;

const locked = vi.hoisted(() => ({ nodes: [] as Partial<KnowledgeNode>[] }));

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ after: () => {} }));
vi.mock("@/lib/prisma", () => ({
  get prisma() {
    return db.prisma;
  },
}));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: async () => {} }));
vi.mock("./llm", () => ({}));
vi.mock("./store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./store")>()),
  readGraph: async () => ({ nodes: [], edges: [] }),
}));
// askOwners routes to the owners of whatever locked facts the test sets.
vi.mock("./ai", () => ({
  searchGraph: () => ({ hits: [], visited: [] }),
  lockedHits: () => locked.nodes,
}));

const { askOwners, askPerson } = await import("./service");

const prefix = `p-test-send-${Date.now()}`;
const asker = {
  id: `${prefix}-asker`,
  name: "Asker",
  role: "Tester",
  department: "IT" as const,
};
const recipient = (i: number) => ({
  ...asker,
  id: `${prefix}-r${i}`,
  name: `Recipient ${i}`,
});
const recipients = [0, 1, 2, 3, 4].map(recipient);
const first = recipient(0);
const second = recipient(1);

// Sends n questions to a colleague, one after the other.
const fill = (recipientId: string, n: number) =>
  Array.from({ length: n }).reduce<Promise<unknown>>(
    (sent) =>
      sent.then(() =>
        askPerson(asker, recipientId, "When is the cut-off?", []),
      ),
    Promise.resolve(),
  );

const pending = () =>
  db.prisma?.question.count({
    where: { askerId: asker.id, status: "PENDING" },
  });

describe.skipIf(!db.prisma)("sending questions", { timeout: 60_000 }, () => {
  beforeEach(async () => {
    await db.prisma?.person.deleteMany({
      where: { id: { startsWith: prefix } },
    });
    await db.prisma?.person.createMany({ data: [asker, ...recipients] });
    locked.nodes = [];
  });

  afterAll(async () => {
    await db.prisma?.person.deleteMany({
      where: { id: { startsWith: prefix } },
    });
    await db.prisma?.$disconnect();
  });

  it("caps the unanswered questions to one colleague, even sent at once", async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 12 }, () =>
        askPerson(asker, first.id, "When is the cut-off?", []),
      ),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(5);
    expect(await pending()).toBe(5);
  });

  it("caps the unanswered questions in all", async () => {
    await Promise.all(recipients.slice(0, 4).map((r) => fill(r.id, 5)));
    await expect(
      askPerson(asker, recipient(4).id, "When is the cut-off?", []),
    ).rejects.toThrow("Too many unanswered questions");
    expect(await pending()).toBe(20);
  });

  it("routes a question once per owner, even sent at once", async () => {
    locked.nodes = [
      { id: "n-1", ownerIds: [first.id] },
      { id: "n-2", ownerIds: [second.id] },
    ];
    await Promise.all(
      Array.from({ length: 8 }, () => askOwners(asker, "Who owns payroll?")),
    );
    expect(await pending()).toBe(2);
  });

  it("drops routed questions over the cap without saying so", async () => {
    await fill(first.id, 5);
    locked.nodes = [{ id: "n-1", ownerIds: [first.id] }];
    await expect(
      askOwners(asker, "Who owns payroll?"),
    ).resolves.toBeUndefined();
    expect(await pending()).toBe(5);
  });
});
