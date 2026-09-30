import { describe, expect, it } from "vitest";
import { canSee, toEdgeView, toNodeView } from "./access";
import { answerFor, draftAnswer, searchGraph } from "./ai";
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

const budgetIn = (list: typeof nodes) =>
  list.find((n) => n.id === "n-ai-budget") as (typeof nodes)[0];

const ask = (me: typeof kobe, question: string, graph = { nodes, edges }) => {
  const { hits, visited } = searchGraph(question, graph.nodes, graph.edges);
  return answerFor(question, me.id, hits, visited, graph.nodes, people);
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
    const budget = nodes.find((n) => n.id === "n-ai-budget");
    if (!budget) throw new Error("fixture");
    const view = toNodeView(budget, julien.id);
    expect(view).toEqual(expect.objectContaining({ locked: true }));
    expect(JSON.stringify(view)).not.toContain("€40k");
  });

  it("hides the meaning of edges touching a locked node", () => {
    const edge = edges.find((e) => e.targetId === "n-ai-budget");
    if (!edge) throw new Error("fixture");
    const visible = new Set(
      nodes.filter((n) => canSee(n, julien.id)).map((n) => n.id),
    );
    expect(toEdgeView(edge, visible)).not.toHaveProperty("description");
  });
});

describe("ask", () => {
  it("answers from what you own", () => {
    const result = ask(kobe, "How big is the AI tooling budget?");
    expect(result.answer?.text).toContain("€40k");
    expect(result.people).toEqual([]);
  });

  it("points Kobe to Filip for the December cut-off", () => {
    const result = ask(kobe, "When is the payroll cut-off in December?");
    expect(result.answer).toBeNull();
    expect(result.people[0]?.person.id).toBe(filip.id);
  });

  it("drafts Filip's reply from what he knows", () => {
    const draft = draftAnswer(
      "When is the payroll cut-off in December?",
      kobe,
      filip.id,
      ["n-cutoff-december"],
      nodes,
      edges,
    );
    expect(draft?.text).toMatch(/^Hi Kobe! .*14 December/);
  });

  it("points Filip to Kobe for the deploy freeze", () => {
    const result = ask(filip, "Is there a deploy freeze over the holidays?");
    expect(result.answer).toBeNull();
    expect(result.people[0]?.person.id).toBe(kobe.id);
  });

  it("drafts Kobe's reply from what he knows", () => {
    const draft = draftAnswer(
      "Is there a deploy freeze over the holidays?",
      filip,
      kobe.id,
      ["n-deploy-freeze"],
      nodes,
      edges,
    );
    expect(draft?.text).toMatch(/^Hi Filip! .*14 December to 4 January/);
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
      recipientId: kobe.id,
      recipient: kobe,
      nodeIds: ["n-ai-budget"],
    });
    const graph = applyAnswers(nodes, edges, [approved]);
    expect(canSee(budgetIn(graph.nodes), julien.id)).toBe(true);
    expect(canSee(budgetIn(graph.nodes), filip.id)).toBe(false);
    expect(canSee(budgetIn(nodes), julien.id)).toBe(false);
  });
});
