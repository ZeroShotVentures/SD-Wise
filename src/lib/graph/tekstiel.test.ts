import { describe, expect, it } from "vitest";
import { canSee } from "./access";
import { answerFor, lockedHits, searchGraph } from "./ai";
import { edges, nodes } from "./fixtures";
import { tekstielEdges, tekstielNodes } from "./tekstiel-fixtures";

// The demo graph: the fixtures plus what `pnpm db:seed:tekstiel` adds.
const graph = {
  nodes: [...nodes, ...tekstielNodes],
  edges: [...edges, ...tekstielEdges],
};
const question = "How is the onboarding of Tekstiel NV going?";

describe("Tekstiel NV demo", () => {
  const { hits, visited } = searchGraph(question, graph.nodes, graph.edges);
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));

  it("only uses people and facts that exist", () => {
    const ids = new Set(graph.nodes.map((n) => n.id));
    for (const e of tekstielEdges) {
      expect(ids.has(e.sourceId) && ids.has(e.targetId)).toBe(true);
    }
  });

  it("finds the Tekstiel NV facts, some Kobe can see and some he can't", () => {
    expect(hits.every((id) => id.startsWith("n-tekstiel-"))).toBe(true);
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
      "n-tekstiel-integration",
      "n-tekstiel-migration",
    ]);
    expect(result.moreAvailable).toBe(true);
    const owners = lockedHits("p-kobe", hits, graph.nodes).map(
      (n) => n.ownerIds[0],
    );
    expect(owners.toSorted()).toEqual(["p-bram", "p-filip"]);
  });
});
