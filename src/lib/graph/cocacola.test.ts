import { describe, expect, it } from "vitest";
import { canSee } from "./access";
import { answerFor, lockedHits, searchGraph } from "./ai";
import * as cocacola from "./cocacola-fixtures";
import { edges, nodes } from "./fixtures";
import { looseLinks } from "./links";

// The graph as `pnpm db:seed` writes it: the fixtures, oldest first, with the
// links that join facts cut off from the rest.
const all = nodes.toSorted(
  (a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
);
const graph = { nodes: all, edges: [...edges, ...looseLinks(all, edges)] };
const question = "How is the onboarding of Coca Cola going?";

describe("Coca-Cola demo", () => {
  const { hits, visited } = searchGraph(question, graph.nodes, graph.edges);
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));

  it("only links facts that exist", () => {
    for (const e of cocacola.edges) {
      expect(byId.has(e.sourceId) && byId.has(e.targetId)).toBe(true);
    }
  });

  it("finds the Coca-Cola facts, some Kobe can see and some he can't", () => {
    expect(hits.every((id) => id.startsWith("n-cocacola-"))).toBe(true);
    expect(visited.length).toBeGreaterThanOrEqual(10);
    const seen = visited.filter((id) => {
      const node = byId.get(id);
      return node && canSee(node, "p-kobe");
    });
    expect(seen.length).toBeGreaterThan(3);
    expect(visited.length - seen.length).toBeGreaterThan(3);
  });

  it("answers from what Kobe knows and offers to ask the rest", () => {
    const result = answerFor(question, "p-kobe", hits, visited, graph.nodes);
    expect(result.answer?.nodeIds.toSorted()).toEqual([
      "n-cocacola-integration",
      "n-cocacola-migration",
    ]);
    expect(result.moreAvailable).toBe(true);
    const owners = lockedHits("p-kobe", hits, graph.nodes).map(
      (n) => n.ownerIds[0],
    );
    expect(owners.toSorted()).toEqual(["p-bram", "p-filip"]);
  });
});
