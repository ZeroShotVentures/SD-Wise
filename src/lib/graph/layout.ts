import type { Clustering } from "./clusters";

// Where each topic island sits. Islands are discs sized by their fact count,
// packed so that topics with many links between them end up side by side.

export type Island = { x: number; y: number; r: number };

// Graph units per square root of a node count; roughly the gap between nodes.
export const SPACING = 15;
const GAP = 70;
// Screens are wider than tall, so the map spreads sideways.
const ASPECT = 1.5;

// Stable key for a cluster across re-clusterings: its first node.
export const islandKey = (nodeIds: readonly string[]) => nodeIds[0] ?? "";

export const islandRadius = (count: number) =>
  SPACING * Math.sqrt(Math.max(count, 1)) + 10;

// Islands already placed keep their spot, so the graph doesn't move when an
// answer or an access grant re-clusters it.
export function placeIslands(
  { clusters, bridges }: Pick<Clustering, "clusters" | "bridges">,
  // Nodes outside any cluster get an island of their own.
  looseCount: number,
  previous: ReadonlyMap<string, Island> = new Map(),
): { islands: Island[]; loose: Island | null } {
  const placed: Island[] = [];
  const islands: (Island | undefined)[] = Array.from({
    length: clusters.length,
  });
  const fits = (x: number, y: number, r: number) =>
    placed.every((p) => Math.hypot(p.x - x, p.y - y) >= p.r + r + GAP);

  // Search outward along a spiral from where the island would like to be.
  const find = (x: number, y: number, r: number): Island => {
    for (let t = 0; ; t++) {
      const angle = t * 0.45;
      const dist = t * 6;
      const cx = x + Math.cos(angle) * dist * ASPECT;
      const cy = y + Math.sin(angle) * dist;
      if (fits(cx, cy, r)) return { x: cx, y: cy, r };
    }
  };

  const order = clusters.map((_, i) => i);
  const kept = order.filter((i) =>
    previous.has(islandKey(clusters[i]?.nodeIds ?? [])),
  );
  for (const i of kept) {
    const cluster = clusters[i];
    if (!cluster) continue;
    const old = previous.get(islandKey(cluster.nodeIds)) as Island;
    const island = { ...old, r: islandRadius(cluster.nodeIds.length) };
    islands[i] = island;
    placed.push(island);
  }

  for (const i of order) {
    const cluster = clusters[i];
    if (!cluster || islands[i]) continue;
    // Pull towards the islands it shares the most edges with.
    let x = 0;
    let y = 0;
    let weight = 0;
    islands.forEach((other, j) => {
      if (!other) return;
      const w = bridges.get(i < j ? `${i}:${j}` : `${j}:${i}`) ?? 0;
      x += other.x * w;
      y += other.y * w;
      weight += w;
    });
    const r = islandRadius(cluster.nodeIds.length);
    const island = weight ? find(x / weight, y / weight, r) : find(0, 0, r);
    islands[i] = island;
    placed.push(island);
  }

  // Every cluster has its spot by now.
  const done = islands as Island[];
  if (!looseCount) return { islands: done, loose: null };
  const prior = previous.get("loose");
  const r = islandRadius(looseCount);
  return { islands: done, loose: prior ? { ...prior, r } : find(0, 0, r) };
}

const GOLDEN = Math.PI * (3 - Math.sqrt(5));

// Sunflower spread: the i-th of n points evenly filling a disc, first ones
// in the middle.
export function seat(island: Island, i: number, n: number) {
  const d = (island.r - 10) * Math.sqrt((i + 0.5) / Math.max(n, 1));
  return {
    x: island.x + Math.cos(i * GOLDEN) * d,
    y: island.y + Math.sin(i * GOLDEN) * d,
  };
}
