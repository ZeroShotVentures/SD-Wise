import { describe, expect, it } from "vitest";
import { canSee, toEdgeView, toNodeView } from "./access";
import { answerFor, draftFacts, lockedHits, searchGraph } from "./ai";
import {
  answerNodeId,
  applyAnswers,
  type ResolvedQuery,
  unseenFor,
} from "./answers";
import { edges, nodes, people } from "./fixtures";

const person = (id: string) => {
  const p = people.find((x) => x.id === id);
  if (!p) throw new Error(id);
  return p;
};

const kobe = person("p-kobe");
const filip = person("p-filip");
const julien = person("p-julien");
const bram = person("p-bram");

const pricingIn = (list: typeof nodes) =>
  list.find((n) => n.id === "n-kras-pricing") as (typeof nodes)[0];

const ask = (me: typeof kobe, question: string, graph = { nodes, edges }) => {
  const { hits, visited } = searchGraph(question, graph.nodes, graph.edges);
  return answerFor(question, me.id, hits, visited, graph.nodes);
};

const query = (q: Partial<ResolvedQuery>): ResolvedQuery => ({
  id: "q-1",
  kind: "QUESTION",
  askerId: kobe.id,
  recipientId: filip.id,
  asker: kobe,
  recipient: filip,
  question: "When is the payroll cut-off in December?",
  nodeIds: ["n-cutoff-december"],
  status: "ANSWERED",
  answer: "14 December.",
  shareScope: "ASKER",
  answerNodeId: null,
  createdAt: "2026-09-30T10:00:00Z",
  resolvedAt: "2026-09-30T11:00:00Z",
  seenAt: null,
  ...q,
});

describe("redaction", () => {
  it("never sends locked content to the viewer", () => {
    const pricing = nodes.find((n) => n.id === "n-kras-pricing");
    if (!pricing) throw new Error("fixture");
    const view = toNodeView(pricing, julien.id);
    expect(view).toEqual(expect.objectContaining({ locked: true }));
    expect(JSON.stringify(view)).not.toContain("€4.20");
    // Nor who knows it.
    expect(view).not.toHaveProperty("ownerIds");
    for (const id of pricing.ownerIds) {
      expect(JSON.stringify(view)).not.toContain(id);
    }
  });

  it("hides the meaning of edges touching a locked node", () => {
    const edge = edges.find((e) => e.sourceId === "n-kras-pricing");
    if (!edge) throw new Error("fixture");
    const visible = new Set(
      nodes.filter((n) => canSee(n, julien.id)).map((n) => n.id),
    );
    expect(toEdgeView(edge, visible)).not.toHaveProperty("description");
  });
});

describe("ask", () => {
  it("answers from what you own", () => {
    const result = ask(bram, "What do we charge Kras per payslip?");
    expect(result.answer?.text).toContain("€4.20");
    expect(result.moreAvailable).toBe(false);
  });

  it("tells Kobe there's more on the December cut-off, not who has it", () => {
    const result = ask(kobe, "When is the payroll cut-off in December?");
    expect(result.answer).toBeNull();
    expect(result.moreAvailable).toBe(true);
    expect(result.hits).toEqual([]);
    expect(JSON.stringify(result)).not.toContain("n-cutoff-december");
    expect(JSON.stringify(result)).not.toContain(filip.id);
  });

  it("answers from what Filip sees and hints at the rest", () => {
    const result = ask(filip, "Year-end payroll run");
    expect(result.answer?.nodeIds).toEqual(["n-year-end-run", "n-bulk-261"]);
    expect(result.moreAvailable).toBe(true);
    expect(JSON.stringify(result)).not.toContain('n-bulk-19"');
    expect(JSON.stringify(result)).not.toContain("n-bulk-1130");
  });

  it("routes a request to the owner of the locked match", () => {
    const question = "When is the payroll cut-off in December?";
    const { hits } = searchGraph(question, nodes, edges);
    const owners = lockedHits(kobe.id, hits, nodes).map((n) => n.ownerIds[0]);
    expect(owners).toContain(filip.id);
  });

  it("drafts Filip's reply from what he knows", () => {
    const facts = draftFacts(
      "When is the payroll cut-off in December?",
      filip.id,
      ["n-cutoff-december"],
      nodes,
      edges,
    );
    expect(facts.map((n) => n.id)).toContain("n-cutoff-december");
    expect(facts.every((n) => canSee(n, filip.id))).toBe(true);
  });

  it("points Filip to Kobe for the deploy freeze", () => {
    const result = ask(filip, "Is there a deploy freeze over the holidays?");
    expect(result.answer).toBeNull();
    expect(result.moreAvailable).toBe(true);
    expect(JSON.stringify(result)).not.toContain(kobe.id);
  });

  it("drafts Kobe's reply from what he knows", () => {
    const facts = draftFacts(
      "Is there a deploy freeze over the holidays?",
      kobe.id,
      ["n-deploy-freeze"],
      nodes,
      edges,
    );
    expect(facts.map((n) => n.id)).toContain("n-deploy-freeze");
    expect(facts.every((n) => canSee(n, kobe.id))).toBe(true);
  });

  it("drafts nothing from facts the recipient can't see", () => {
    expect(
      draftFacts(
        "What do we charge Kras?",
        julien.id,
        ["n-kras-pricing"],
        nodes,
        edges,
      ).map((n) => n.id),
    ).not.toContain("n-kras-pricing");
  });

  it("links Kobe's and Filip's knowledge in the graph", () => {
    const shared = nodes.filter(
      (n) => canSee(n, kobe.id) && canSee(n, filip.id),
    );
    expect(shared.map((n) => n.id)).toContain("n-engine-capacity");
  });
});

describe("answers", () => {
  it("become a node only the asker and recipient can see", () => {
    const graph = applyAnswers(nodes, edges, [query({})]);
    const id = answerNodeId("q-1");
    const node = graph.nodes.find((n) => n.id === id);
    if (!node) throw new Error("no answer node");
    expect(canSee(node, kobe.id)).toBe(true);
    expect(canSee(node, julien.id)).toBe(false);
    expect(graph.edges).toContainEqual(
      expect.objectContaining({ sourceId: id, targetId: "n-cutoff-december" }),
    );
    expect(ask(kobe, "payroll cut-off december", graph).answer?.text).toBe(
      "14 December.",
    );
  });

  it("are public when shared with everyone", () => {
    const graph = applyAnswers(nodes, edges, [query({ shareScope: "PUBLIC" })]);
    const node = graph.nodes.find((n) => n.id === answerNodeId("q-1"));
    expect(node && canSee(node, julien.id)).toBe(true);
  });

  it("ignore pending questions", () => {
    const graph = applyAnswers(nodes, edges, [query({ status: "PENDING" })]);
    expect(graph.nodes).toHaveLength(nodes.length);
  });

  it("are new to the asker until seen", () => {
    expect(unseenFor(kobe.id, [query({})])).toEqual(
      new Set([answerNodeId("q-1")]),
    );
    expect(unseenFor(filip.id, [query({})]).size).toBe(0);
    expect(
      unseenFor(kobe.id, [query({ seenAt: "2026-09-30T12:00:00Z" })]),
    ).toEqual(new Set());
  });
});

describe("access requests", () => {
  it("grant access to the asker only, without touching the fixtures", () => {
    const approved = query({
      kind: "ACCESS",
      askerId: julien.id,
      asker: julien,
      recipientId: bram.id,
      recipient: bram,
      nodeIds: ["n-kras-pricing"],
    });
    const graph = applyAnswers(nodes, edges, [approved]);
    expect(canSee(pricingIn(graph.nodes), julien.id)).toBe(true);
    expect(canSee(pricingIn(graph.nodes), kobe.id)).toBe(false);
    expect(canSee(pricingIn(nodes), julien.id)).toBe(false);
  });
});

describe("bulk fixtures", () => {
  it("add up to about 10,000 data points", () => {
    const total = people.length + nodes.length + edges.length;
    expect(total).toBeGreaterThan(9_900);
    expect(total).toBeLessThan(11_000);
  });

  it("only link nodes and people that exist", () => {
    const ids = new Set(nodes.map((n) => n.id));
    const known = new Set(people.map((p) => p.id));
    expect(ids.size).toBe(nodes.length);
    expect(edges.every((e) => ids.has(e.sourceId) && ids.has(e.targetId))).toBe(
      true,
    );
    expect(
      nodes.every(
        (n) => n.ownerIds.length > 0 && n.ownerIds.every((o) => known.has(o)),
      ),
    ).toBe(true);
  });
});
