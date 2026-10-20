// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toNodeView } from "@/lib/graph/access";
import { answerFor, searchGraph } from "@/lib/graph/ai";
import { edges, nodes, people } from "@/lib/graph/fixtures";

vi.mock("server-only", () => ({}));

const julien = people.find((p) => p.id === "p-julien");
if (!julien) throw new Error("fixture");

const mocks = vi.hoisted(() => ({
  authenticate: vi.fn<(r: Request) => Promise<unknown>>(),
}));
vi.mock("@/lib/mcp/auth", () => ({ authenticate: mocks.authenticate }));
vi.mock("@/lib/graph/service", () => ({
  ask: async (me: { id: string }, q: string) => {
    const { hits, visited } = searchGraph(q, nodes, edges);
    return answerFor(q, me.id, hits, visited, nodes, people);
  },
  getGraph: async (me: { id: string }) => ({
    people,
    nodes: nodes.map((n) => toNodeView(n, me.id)),
  }),
  getInbox: async () => ({ received: [], sent: [] }),
}));

const rpc = (body: unknown) =>
  new Request("http://localhost/api/mcp", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
    },
    body: JSON.stringify(body),
  });

describe("/api/mcp", () => {
  beforeEach(() => vi.resetAllMocks());

  it("returns 401 without a valid token", async () => {
    mocks.authenticate.mockResolvedValue(null);
    const { POST } = await import("./route");
    const res = await POST(
      rpc({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    );
    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).toBe("Bearer");
  });

  it("lists the tools", async () => {
    mocks.authenticate.mockResolvedValue(julien);
    const { POST } = await import("./route");
    const res = await POST(
      rpc({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    );
    const body = await res.json();
    expect(
      body.result.tools.map((t: { name: string }) => t.name).toSorted(),
    ).toEqual(["ask", "ask_person", "list_inbox", "request_access"]);
  });

  it("answers `ask` as the token owner without leaking locked facts", async () => {
    mocks.authenticate.mockResolvedValue(julien);
    const { POST } = await import("./route");
    const res = await POST(
      rpc({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: "ask",
          arguments: { question: "What does Kras pay per payslip?" },
        },
      }),
    );
    const text = (await res.json()).result.content[0].text as string;
    expect(JSON.parse(text).lockedFacts.length).toBeGreaterThan(0);
    expect(text).not.toContain("€4.20");
  });

  it("only allows POST", async () => {
    const { GET } = await import("./route");
    expect(GET().status).toBe(405);
  });
});
