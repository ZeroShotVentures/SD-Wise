import { describe, expect, it } from "vitest";
import { canSee, toEdgeView, toNodeView } from "./access";
import { clusterGraph, louvain } from "./clusters";
import { edges, nodes } from "./fixtures";
import { islandKey, placeIslands, seat } from "./layout";
import type { EdgeView, NodeView } from "./types";

const viewFor = (personId: string) => {
  const visible = new Set(
    nodes.filter((n) => canSee(n, personId)).map((n) => n.id),
  );
  return {
    nodes: nodes.map((n) => toNodeView(n, personId)),
    edges: edges.map((e) => toEdgeView(e, visible)),
  };
};

const fact = (id: string, title: string, locked = false): NodeView =>
  locked
    ? {
        id,
        locked: true,
        source: "EMAIL",
        integrationId: null,
        createdAt: "2026-01-01",
        isNew: false,
      }
    : {
        id,
        locked: false,
        isNew: false,
        title,
        content: title,
        contentSummary: title,
        source: "MESSAGE",
        integrationId: null,
        sourceDescription: "",
        visibility: "PUBLIC",
        ownerIds: [],
        createdAt: "2026-01-01",
      };

const link = (sourceId: string, targetId: string): EdgeView => ({
  id: `${sourceId}-${targetId}`,
  sourceId,
  targetId,
  locked: true,
});

// Two dense groups of eight, joined by a single edge.
function twoGroups(lockSecond = false) {
  const a = Array.from({ length: 8 }, (_, i) =>
    fact(`a${i}`, `Kras renewal ${i}`),
  );
  const b = Array.from({ length: 8 }, (_, i) =>
    fact(`b${i}`, `Secret merger ${i}`, lockSecond),
  );
  const ring = (group: NodeView[]) =>
    group.flatMap((n, i) => group.slice(i + 1).map((m) => link(n.id, m.id)));
  return {
    nodes: [...a, ...b],
    edges: [...ring(a), ...ring(b), link("a0", "b0")],
  };
}

describe("louvain", () => {
  it("splits two triangles joined by one edge", () => {
    const membership = louvain(6, [
      [0, 1, 1],
      [1, 2, 1],
      [0, 2, 1],
      [3, 4, 1],
      [4, 5, 1],
      [3, 5, 1],
      [2, 3, 1],
    ]);
    expect(new Set(membership.slice(0, 3)).size).toBe(1);
    expect(new Set(membership.slice(3)).size).toBe(1);
    expect(membership[0]).not.toBe(membership[3]);
  });

  it("leaves nodes without edges on their own", () => {
    expect(louvain(3, [])).toEqual([0, 1, 2]);
  });
});

describe("clusterGraph", () => {
  it("finds the groups, names them and counts the edge between them", () => {
    const graph = twoGroups();
    const { clusters, clusterOf, bridges } = clusterGraph(
      graph.nodes,
      graph.edges,
    );
    expect(clusters).toHaveLength(2);
    expect(clusterOf.get("a3")).toBe(clusterOf.get("a5"));
    expect(clusterOf.get("a3")).not.toBe(clusterOf.get("b3"));
    expect(clusters.map((c) => c.label).toSorted()).toEqual([
      "Kras renewal",
      "Secret merger",
    ]);
    expect([...bridges.values()]).toEqual([1]);
  });

  it("never names a cluster after facts the viewer can't see", () => {
    const graph = twoGroups(true);
    const { clusters } = clusterGraph(graph.nodes, graph.edges);
    const locked = clusters.find((c) => c.nodeIds.includes("b0"));
    expect(locked?.visible).toBe(0);
    expect(locked?.label).toBe("Private knowledge");
    expect(clusters.map((c) => c.label).join(" ")).not.toMatch(/merger/i);
  });

  it("names every cluster of the demo graph from visible titles only", () => {
    const view = viewFor("p-kobe");
    const { clusters } = clusterGraph(view.nodes, view.edges);
    const hidden = nodes
      .filter((n) => !canSee(n, "p-kobe"))
      .map((n) => n.title.toLowerCase());
    const shown = new Set(
      nodes.filter((n) => canSee(n, "p-kobe")).map((n) => n.title),
    );
    expect(clusters.length).toBeGreaterThan(10);
    for (const cluster of clusters) {
      for (const part of cluster.label.split(" · ")) {
        if (part === "Private knowledge") continue;
        // Every phrase in a name appears in a title the viewer can see.
        const inVisible = [...shown].some((t) =>
          t.toLowerCase().includes(part.toLowerCase()),
        );
        expect({ part, inVisible }).toEqual({ part, inVisible: true });
      }
    }
    expect(hidden.length).toBeGreaterThan(0);
  });

  it("gives every cluster a different name", () => {
    const view = viewFor("p-kobe");
    const labels = clusterGraph(view.nodes, view.edges)
      .clusters.map((c) => c.label)
      .filter((l) => l !== "Private knowledge");
    expect(new Set(labels).size).toBe(labels.length);
  });
});

describe("placeIslands", () => {
  const view = viewFor("p-kobe");
  const clustering = clusterGraph(view.nodes, view.edges);
  const loose = view.nodes.length - clustering.clusterOf.size;

  it("keeps islands apart", () => {
    const { islands, loose: rest } = placeIslands(clustering, loose);
    const all = [...islands, ...(rest ? [rest] : [])];
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        const a = all[i];
        const b = all[j];
        if (!a || !b) continue;
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(a.r + b.r);
      }
    }
  });

  it("keeps islands that were already placed where they were", () => {
    const first = placeIslands(clustering, loose);
    const spots = new Map(
      clustering.clusters.map((c, i) => [
        islandKey(c.nodeIds),
        { ...(first.islands[i] as NonNullable<(typeof first.islands)[0]>) },
      ]),
    );
    const moved = { x: 5000, y: -5000, r: 1 };
    const key = islandKey(clustering.clusters[0]?.nodeIds ?? []);
    spots.set(key, moved);
    const again = placeIslands(clustering, loose, spots);
    expect(again.islands[0]).toMatchObject({ x: 5000, y: -5000 });
    expect(again.islands[1]).toEqual(first.islands[1]);
  });

  it("seats nodes inside their island", () => {
    const island = { x: 100, y: 50, r: 80 };
    for (let i = 0; i < 40; i++) {
      const { x, y } = seat(island, i, 40);
      expect(Math.hypot(x - 100, y - 50)).toBeLessThan(80);
    }
  });
});
