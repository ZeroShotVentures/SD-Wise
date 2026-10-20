import type { EdgeView, KnowledgeSource, NodeView } from "./types";

// Topic clusters for the zoomed-out graph. Communities come from the graph's
// structure (Louvain), so they work for any data; names come from the titles
// of the facts in each cluster. Only titles the viewer can see are used, so a
// cluster name never leaks a locked fact.

export type Cluster = {
  id: number;
  label: string;
  nodeIds: string[];
  // Facts the viewer can open.
  visible: number;
  // Most common source, for the cluster's tint.
  source: KnowledgeSource;
};

export type Clustering = {
  clusters: Cluster[];
  // Nodes in tiny or edgeless communities have no cluster.
  clusterOf: Map<string, number>;
  // Edge counts between clusters, keyed "a:b" with a < b.
  bridges: Map<string, number>;
};

const MIN_SIZE = 6;

// Below 1 favours fewer, larger communities.
const RESOLUTION = 1;

type Link = [number, number, number];

// Multi-level Louvain: move nodes to the neighbouring community with the best
// modularity gain until nothing moves, collapse communities into nodes, repeat.
// Deterministic for a given input order.
export function louvain(
  count: number,
  links: readonly Link[],
  resolution = 1,
): number[] {
  let membership = Array.from({ length: count }, (_, i) => i);
  let size = count;
  let edges = links;

  for (let level = 0; level < 12; level++) {
    const adj = Array.from({ length: size }, () => new Map<number, number>());
    const degree = new Float64Array(size);
    let total = 0;
    for (const [a, b, w] of edges) {
      degree[a] = (degree[a] ?? 0) + w;
      degree[b] = (degree[b] ?? 0) + w;
      total += 2 * w;
      if (a === b) continue;
      adj[a]?.set(b, (adj[a]?.get(b) ?? 0) + w);
      adj[b]?.set(a, (adj[b]?.get(a) ?? 0) + w);
    }
    if (total === 0) break;

    const community = Int32Array.from({ length: size }, (_, i) => i);
    const sum = Float64Array.from(degree);
    let changed = false;
    for (let pass = 0, moved = true; moved && pass < 32; pass++) {
      moved = false;
      for (let i = 0; i < size; i++) {
        const own = community[i] as number;
        const k = degree[i] as number;
        const toCommunity = new Map<number, number>();
        for (const [j, w] of adj[i] ?? []) {
          const c = community[j] as number;
          toCommunity.set(c, (toCommunity.get(c) ?? 0) + w);
        }
        sum[own] = (sum[own] as number) - k;
        let best = own;
        let bestGain =
          (toCommunity.get(own) ?? 0) -
          (resolution * (sum[own] as number) * k) / total;
        for (const [c, w] of toCommunity) {
          const gain = w - (resolution * (sum[c] as number) * k) / total;
          if (gain > bestGain + 1e-9) {
            best = c;
            bestGain = gain;
          }
        }
        sum[best] = (sum[best] as number) + k;
        if (best !== own) {
          community[i] = best;
          moved = true;
          changed = true;
        }
      }
    }
    if (!changed) break;

    const renumber = new Map<number, number>();
    for (const c of community)
      if (!renumber.has(c)) renumber.set(c, renumber.size);
    const next = (i: number) => renumber.get(community[i] as number) as number;
    membership = membership.map(next);
    const merged = new Map<string, Link>();
    for (const [a, b, w] of edges) {
      const [x, y] = [next(a), next(b)].toSorted((p, q) => p - q) as [
        number,
        number,
      ];
      const key = `${x}:${y}`;
      const link = merged.get(key);
      if (link) link[2] += w;
      else merged.set(key, [x, y, w]);
    }
    edges = [...merged.values()];
    size = renumber.size;
  }
  return membership;
}

const STOP = new Set(
  `a an and are as at be by for from has have in is it its new of on or our
  the their this to was we were will with about after before into over per
  via vs not no all any more most out up off than then that these those who
  what when why how which can could should would did does do done just still`
    .split(/\s+/)
    .filter(Boolean),
);

// Words that say when, not what: fine inside a phrase, useless as a name.
const NOISE = new Set(
  `january february march april may june july august september october
  november december q1 q2 q3 q4`.split(/\s+/),
);

const words = (title: string) =>
  title
    .replace(/…/g, " ")
    .split(/[^\p{L}\p{N}&'.-]+/u)
    .map((w) => w.replace(/^[.'-]+|[.'-]+$/g, ""))
    .filter((w) => w.length > 1);

const skip = (w: string | undefined) =>
  w === undefined || STOP.has(w.toLowerCase()) || /^\d+$/.test(w);

// Runs of one to three words that don't start or end on a stop word.
function phrases(title: string): string[] {
  const ws = words(title);
  const out = new Set<string>();
  ws.forEach((w, i) => {
    if (skip(w)) return;
    if (!NOISE.has(w.toLowerCase())) out.add(w);
    for (let len = 2; len <= 3; len++) {
      const run = ws.slice(i, i + len);
      if (run.length === len && !skip(run[len - 1])) out.add(run.join(" "));
    }
  });
  return [...out];
}

// Names each cluster after the phrases that are common in it and rare
// elsewhere (TF-IDF over visible titles).
function nameClusters(titles: string[][]): string[] {
  const counts = titles.map((list) => {
    const count = new Map<string, number>();
    for (const title of list) {
      for (const p of phrases(title)) count.set(p, (count.get(p) ?? 0) + 1);
    }
    return count;
  });
  const spread = new Map<string, number>();
  for (const count of counts) {
    for (const p of count.keys()) spread.set(p, (spread.get(p) ?? 0) + 1);
  }
  // Clusters come largest first; a name (or part of one) taken by a bigger
  // cluster is skipped.
  const used = new Set<string>();
  return counts.map((count, i) => {
    const total = titles[i]?.length ?? 0;
    const ranked = [...count]
      .filter(([, n]) => n >= Math.min(2, total))
      .map(([p, n]) => {
        const idf = Math.log((counts.length + 1) / (spread.get(p) ?? 1));
        const length = p.split(" ").length;
        return [p, n * idf * (1 + 0.5 * (length - 1))] as const;
      })
      .toSorted((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    const top = ranked[0]?.[1] ?? 0;
    const picked: string[] = [];
    for (const [p, score] of ranked) {
      // A second phrase only when it's nearly as telling as the first.
      if (score < top * 0.6) break;
      const lower = p.toLowerCase();
      if ([...used].some((u) => u.includes(lower) || lower.includes(u))) {
        continue;
      }
      // Skip a phrase that repeats a word already in the name.
      if (picked.some((q) => overlaps(q.toLowerCase(), lower))) continue;
      picked.push(p);
      if (picked.length === 2) break;
    }
    // Everything telling is taken: settle for the best name not used yet.
    if (!picked.length) {
      const fallback = ranked.find(([p]) => !used.has(p.toLowerCase()));
      if (fallback) picked.push(fallback[0]);
    }
    for (const p of picked) used.add(p.toLowerCase());
    return picked
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(" · ");
  });
}

const overlaps = (a: string, b: string) => {
  const set = new Set(a.split(" "));
  return b.split(" ").some((w) => set.has(w));
};

export function clusterGraph(
  nodes: readonly NodeView[],
  edges: readonly EdgeView[],
): Clustering {
  const index = new Map(nodes.map((n, i) => [n.id, i]));
  const links: Link[] = [];
  for (const e of edges) {
    const a = index.get(e.sourceId);
    const b = index.get(e.targetId);
    if (a !== undefined && b !== undefined && a !== b) links.push([a, b, 1]);
  }
  const membership = louvain(nodes.length, links, RESOLUTION);

  const groups = new Map<number, number[]>();
  membership.forEach((c, i) => {
    groups.set(c, [...(groups.get(c) ?? []), i]);
  });
  const kept = [...groups.values()]
    .filter((members) => members.length >= MIN_SIZE)
    .toSorted(
      (a, b) => b.length - a.length || (a[0] as number) - (b[0] as number),
    );

  const titles = kept.map((members) =>
    members.flatMap((i) => {
      const node = nodes[i] as NodeView;
      return node.locked ? [] : [node.title];
    }),
  );
  const names = nameClusters(titles);

  const clusterOf = new Map<string, number>();
  const clusters: Cluster[] = kept.map((members, id) => {
    const sources = new Map<KnowledgeSource, number>();
    let visible = 0;
    for (const i of members) {
      const node = nodes[i] as NodeView;
      clusterOf.set(node.id, id);
      sources.set(node.source, (sources.get(node.source) ?? 0) + 1);
      if (!node.locked) visible++;
    }
    const source =
      [...sources].toSorted((a, b) => b[1] - a[1])[0]?.[0] ?? "OTHER";
    return {
      id,
      label: names[id] || "Private knowledge",
      nodeIds: members.map((i) => (nodes[i] as NodeView).id),
      visible,
      source,
    };
  });

  const bridges = new Map<string, number>();
  for (const e of edges) {
    const a = clusterOf.get(e.sourceId);
    const b = clusterOf.get(e.targetId);
    if (a === undefined || b === undefined || a === b) continue;
    const key = a < b ? `${a}:${b}` : `${b}:${a}`;
    bridges.set(key, (bridges.get(key) ?? 0) + 1);
  }

  return { clusters, clusterOf, bridges };
}
