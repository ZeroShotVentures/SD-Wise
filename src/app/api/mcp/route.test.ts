// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toNodeView } from "@/lib/graph/access";
import { answerFor, searchGraph } from "@/lib/graph/ai";
import { edges, nodes, people } from "@/lib/graph/fixtures";

vi.mock("server-only", () => ({}));

const julien = people.find((p) => p.id === "p-julien");
if (!julien) throw new Error("fixture");

const mocks = vi.hoisted(() => ({
  personFor: vi.fn<(userId: string) => Promise<unknown>>(),
}));

// The real requireMcpAuth guards every request, except that a test can stand
// in for a verified access token with the x-test-sub header.
vi.mock("@better-auth/mcp", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@better-auth/mcp")>();
  return {
    ...actual,
    requireMcpAuth: ((auth, handler, opts) => {
      const guarded = actual.requireMcpAuth(auth, handler, opts);
      return async (request: Request) => {
        const sub = request.headers.get("x-test-sub");
        return sub ? handler(request, { sub }) : guarded(request);
      };
    }) satisfies typeof actual.requireMcpAuth,
  };
});

vi.mock("@/lib/graph/service", () => ({
  personFor: mocks.personFor,
  ask: async (me: { id: string }, q: string) => {
    const { hits, visited } = searchGraph(q, nodes, edges);
    return answerFor(q, me.id, hits, visited, nodes);
  },
  getGraph: async (me: { id: string }) => ({
    people,
    nodes: nodes.map((n) => toNodeView(n, me.id)),
  }),
  getInbox: async () => ({ received: [], sent: [] }),
}));

const rpc = (body: unknown, headers: Record<string, string> = {}) =>
  new Request("http://localhost:3000/api/mcp", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      ...headers,
    },
    body: JSON.stringify(body),
  });

const asUser = { "x-test-sub": "u-julien" };

async function result(res: Response) {
  const text = await res.text();
  const data = text.startsWith("{")
    ? text
    : (text.split("\n").find((l) => l.startsWith("data: ")) ?? "").slice(6);
  return JSON.parse(data).result;
}

describe("/api/mcp", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.personFor.mockImplementation(async (id) =>
      id === "u-julien" ? julien : null,
    );
  });

  it("challenges requests without an access token", async () => {
    const { POST } = await import("./route");
    const res = await POST(
      rpc({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    );
    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).toContain(
      "/.well-known/oauth-protected-resource",
    );
  });

  it("rejects a forged token", async () => {
    const { POST } = await import("./route");
    const res = await POST(
      rpc(
        { jsonrpc: "2.0", id: 1, method: "tools/list" },
        { authorization: "Bearer not-a-jwt" },
      ),
    );
    expect(res.status).toBe(401);
  });

  it("refuses users without a place in the graph", async () => {
    const { POST } = await import("./route");
    const res = await POST(
      rpc(
        { jsonrpc: "2.0", id: 1, method: "tools/list" },
        { "x-test-sub": "u-other" },
      ),
    );
    expect(res.status).toBe(403);
  });

  it("lists the tools", async () => {
    const { POST } = await import("./route");
    const res = await POST(
      rpc({ jsonrpc: "2.0", id: 1, method: "tools/list" }, asUser),
    );
    const { tools } = await result(res);
    expect(tools.map((t: { name: string }) => t.name).toSorted()).toEqual([
      "ask",
      "list_inbox",
      "request_more",
    ]);
    expect(
      tools.find((t: { name: string }) => t.name === "request_more"),
    ).toMatchObject({ _meta: { ui: { visibility: ["app"] } } });
    const ask = tools.find((t: { name: string }) => t.name === "ask");
    expect(ask.title).toBe("Ask the company brain");
    expect(ask.annotations.readOnlyHint).toBe(true);
  });

  it("serves `ask` with an MCP App card", async () => {
    const { POST } = await import("./route");
    const list = await result(
      await POST(rpc({ jsonrpc: "2.0", id: 1, method: "tools/list" }, asUser)),
    );
    expect(
      list.tools.find((t: { name: string }) => t.name === "ask"),
    ).toMatchObject({
      _meta: { ui: { resourceUri: "ui://sd-wise/ask.html" } },
    });

    const read = await result(
      await POST(
        rpc(
          {
            jsonrpc: "2.0",
            id: 2,
            method: "resources/read",
            params: { uri: "ui://sd-wise/ask.html" },
          },
          asUser,
        ),
      ),
    );
    const [page] = read.contents;
    expect(page.mimeType).toBe("text/html;profile=mcp-app");
    expect(page.text).toContain("Request access");
    expect(page.text).toContain("const App = ");
    expect(page.text).not.toMatch(/export\s*\{/);
  });

  it("serves `list_inbox` with an MCP App card", async () => {
    const { POST } = await import("./route");
    const list = await result(
      await POST(rpc({ jsonrpc: "2.0", id: 1, method: "tools/list" }, asUser)),
    );
    expect(
      list.tools.find((t: { name: string }) => t.name === "list_inbox"),
    ).toMatchObject({
      _meta: { ui: { resourceUri: "ui://sd-wise/inbox.html" } },
    });

    const read = await result(
      await POST(
        rpc(
          {
            jsonrpc: "2.0",
            id: 2,
            method: "resources/read",
            params: { uri: "ui://sd-wise/inbox.html" },
          },
          asUser,
        ),
      ),
    );
    const [page] = read.contents;
    expect(page.mimeType).toBe("text/html;profile=mcp-app");
    expect(page.text).toContain("SD Wise inbox");
    expect(page.text).toContain("/inbox");

    const call = await result(
      await POST(
        rpc(
          {
            jsonrpc: "2.0",
            id: 3,
            method: "tools/call",
            params: { name: "list_inbox", arguments: {} },
          },
          asUser,
        ),
      ),
    );
    expect(call.structuredContent).toEqual({ received: [], sent: [] });
  });

  it("answers `ask` as the token's user without leaking locked facts", async () => {
    const { POST } = await import("./route");
    const res = await POST(
      rpc(
        {
          jsonrpc: "2.0",
          id: 2,
          method: "tools/call",
          params: {
            name: "ask",
            arguments: { question: "What does Kras pay per payslip?" },
          },
        },
        asUser,
      ),
    );
    const text = (await result(res)).content[0].text as string;
    expect(mocks.personFor).toHaveBeenCalledWith("u-julien");
    expect(JSON.parse(text).moreAvailable).toBe(true);
    expect(text).not.toContain("€4.20");
    expect(text).not.toContain("p-bram");
  });
});
