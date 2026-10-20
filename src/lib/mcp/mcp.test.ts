import { beforeEach, describe, expect, it, vi } from "vitest";
import { toNodeView } from "@/lib/graph/access";
import { answerFor, searchGraph } from "@/lib/graph/ai";
import { edges, nodes, people } from "@/lib/graph/fixtures";
import { formatAsk } from "./format";

vi.mock("server-only", () => ({}));

const julien = people.find((p) => p.id === "p-julien");
if (!julien) throw new Error("fixture");

describe("formatAsk", () => {
  it("never puts locked content in the tool output", () => {
    const question = "What does Kras pay per payslip?";
    const { hits, visited } = searchGraph(question, nodes, edges);
    const result = answerFor(question, julien.id, hits, visited, nodes, people);
    const views = nodes.map((n) => toNodeView(n, julien.id));
    const pricing = nodes.find((n) => n.id === "n-kras-pricing");
    if (!pricing) throw new Error("fixture");
    expect(hits).toContain(pricing.id);

    const out = formatAsk(result, views, people);
    const text = JSON.stringify(out);
    expect(out.lockedFacts.map((f) => f.id)).toContain(pricing.id);
    expect(text).not.toContain(pricing.content);
    expect(text).not.toContain(pricing.contentSummary);
    expect(text).not.toContain(pricing.title);
  });
});

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn<(args: unknown) => Promise<unknown>>(),
  update: vi.fn<(args: unknown) => Promise<unknown>>(),
  personFor: vi.fn<(userId: string) => Promise<unknown>>(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { mcpToken: { findUnique: mocks.findUnique, update: mocks.update } },
}));
vi.mock("@/lib/graph/service", () => ({ personFor: mocks.personFor }));

const request = (token?: string) =>
  new Request("http://localhost/api/mcp", {
    method: "POST",
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });

describe("authenticate", () => {
  beforeEach(() => vi.resetAllMocks());

  it("rejects requests without a token", async () => {
    const { authenticate } = await import("./auth");
    expect(await authenticate(request())).toBeNull();
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("rejects unknown tokens", async () => {
    mocks.findUnique.mockResolvedValue(null);
    const { authenticate } = await import("./auth");
    expect(await authenticate(request("sdw_nope"))).toBeNull();
  });

  it("rejects tokens of banned users", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "t1",
      user: { id: "u1", banned: true },
    });
    const { authenticate } = await import("./auth");
    expect(await authenticate(request("sdw_x"))).toBeNull();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("acts as the token owner, looked up by hash", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "t1",
      user: { id: "u1", banned: false },
    });
    mocks.personFor.mockResolvedValue(julien);
    const { authenticate } = await import("./auth");
    const { hashToken } = await import("./tokens");
    expect(await authenticate(request("sdw_x"))).toEqual(julien);
    expect(mocks.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tokenHash: hashToken("sdw_x") } }),
    );
    expect(mocks.personFor).toHaveBeenCalledWith("u1");
  });
});
