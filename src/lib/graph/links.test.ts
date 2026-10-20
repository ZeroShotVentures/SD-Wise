import { describe, expect, it } from "vitest";
import { toEdgeView, toNodeView } from "./access";
import { clusterGraph } from "./clusters";
import { edges, integrations, nodes } from "./fixtures";
import { looseLinks } from "./links";
import type { KnowledgeEdge, KnowledgeNode } from "./types";

const links = looseLinks(nodes, edges);
const linked = [...edges, ...links];

const between = (facts: KnowledgeNode[], all: KnowledgeEdge[]) => {
  const ids = new Set(facts.map((n) => n.id));
  return all.filter((e) => ids.has(e.sourceId) && ids.has(e.targetId));
};

// How many pieces the facts fall into, following edges either way.
function pieces(facts: KnowledgeNode[], all: KnowledgeEdge[]) {
  const parent = new Map(facts.map((n) => [n.id, n.id]));
  const root = (id: string): string => {
    const up = parent.get(id) as string;
    return up === id ? id : root(up);
  };
  for (const e of between(facts, all)) {
    parent.set(root(e.sourceId), root(e.targetId));
  }
  return new Set(facts.map((n) => root(n.id))).size;
}

// Facts the graph view can't put on a topic island.
function loose(facts: KnowledgeNode[], all: KnowledgeEdge[]) {
  const { clusterOf } = clusterGraph(
    facts.map((n) => toNodeView(n, "p-kobe")),
    between(facts, all).map((e) => toEdgeView(e, new Set())),
  );
  return facts.length - clusterOf.size;
}

describe("loose links", () => {
  it("put every fact of the fixture graph on a topic", () => {
    expect(loose(nodes, edges)).toBeGreaterThan(600);
    expect(loose(nodes, linked)).toBe(0);
  });

  it("keep the whole graph, and every source, in one piece", () => {
    expect(pieces(nodes, linked)).toBe(1);
    for (const id of new Set(nodes.map((n) => n.integrationId))) {
      const own = nodes.filter((n) => n.integrationId === id);
      expect(pieces(own, linked)).toBe(1);
    }
  });

  it("leave nothing loose when a source is disconnected", () => {
    for (const off of integrations.filter((i) => i.connected)) {
      const rest = nodes.filter((n) => n.integrationId !== off.id);
      expect(loose(rest, linked)).toBe(0);
    }
  });

  it("are only added once", () => {
    expect(looseLinks(nodes, linked)).toEqual([]);
  });

  it("join facts that share a word, and say which", () => {
    for (const link of links) {
      expect(link.kind).toBe("RELATES_TO");
      expect(link.description).toMatch(/^Both mention \S/);
    }
  });
});
