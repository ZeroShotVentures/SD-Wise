"use client";

import { type RefObject, useEffect, useMemo, useRef, useState } from "react";
import ForceGraph, {
  type ForceGraphMethods,
  type LinkObject,
  type NodeObject,
} from "react-force-graph-2d";
import type { Cluster, Clustering } from "@/lib/graph/clusters";
import { type Island, islandKey, placeIslands, seat } from "@/lib/graph/layout";
import { SOURCES, ZOOM } from "@/lib/graph/meta";
import type { EdgeView, NodeView } from "@/lib/graph/types";

export type GraphNode = NodeObject<{
  id: string;
  view: NodeView;
  degree: number;
}>;
export type GraphLink = LinkObject<
  { id: string; view: NodeView; degree: number },
  { id: string; view: EdgeView }
>;
export type GraphApi = ForceGraphMethods<GraphNode, GraphLink>;

export type Highlight = {
  scanning: string | null;
  visited: ReadonlySet<string>;
  hits: ReadonlySet<string>;
  // Hits the viewer can't open, lit in red.
  locked: ReadonlySet<string>;
};

type GraphCanvasProps = {
  nodes: NodeView[];
  edges: EdgeView[];
  clustering: Clustering;
  selectedId: string | null;
  highlight: Highlight;
  apiRef: RefObject<GraphApi | undefined>;
  // Node objects by id; the graph library writes their positions onto them.
  nodeIndex: Map<string, GraphNode>;
  onSelectNode: (id: string) => void;
  onSelectEdge: (id: string) => void;
  onBackground: () => void;
  onZoom: (k: number) => void;
};

const YELLOW = "#ffbe00";
const RED = "#f1002f";
const LOCKED_FILL = "#2a3640";
const LOCKED_STROKE = "#56666f";
const INK = "rgba(8,16,26,0.86)";
const LOOSE_COLOR = "#8fa3b3";

// Semantic zoom. Zoomed out the graph is a map of topic islands; zooming in
// fades in the edges, then the names of the busiest facts, then all of them.
// Values are zoom levels (screen pixels per graph unit).
const LOD = {
  // Island names and the bundled links between islands.
  topics: [0.3, 0.55],
  // Single edges.
  edges: [0.2, 0.8],
  // Fact names.
  labels: [0.5, 0.8],
} as const;

const smooth = ([from, to]: readonly [number, number], k: number) => {
  const t = Math.min(1, Math.max(0, (k - from) / (to - from)));
  return t * t * (3 - 2 * t);
};

// Batched by colour in the library, so keep the number of distinct colours low.
const white = (alpha: number) =>
  `rgba(255,255,255,${(Math.round(alpha * 50) / 50).toFixed(2)})`;

const withAlpha = (hex: string, alpha: number) => {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${alpha})`;
};

// Radius in graph units, with a floor in screen pixels so facts stay visible
// as dots when zoomed far out.
const radius = (degree: number, k: number) =>
  Math.max(3 + Math.sqrt(degree) * 1.2, (1.4 + Math.sqrt(degree) * 0.5) / k);

const endId = (end: GraphLink["source"]) =>
  typeof end === "object" ? String(end?.id) : String(end);

const clip = (text: string, max = 32) =>
  text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;

type Group = {
  key: string;
  cluster: Cluster | null; // null: facts with no topic
  island: Island;
  members: GraphNode[];
  color: string;
};

type Box = { x: number; y: number; w: number; h: number };

const overlaps = (a: Box, boxes: Box[]) =>
  boxes.some(
    (b) =>
      a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h,
  );

function drawLock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
) {
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = s * 0.18;
  ctx.beginPath();
  ctx.arc(x, y - s * 0.15, s * 0.28, Math.PI, 0);
  ctx.stroke();
  ctx.fillRect(x - s * 0.4, y - s * 0.15, s * 0.8, s * 0.6);
}

// Keeps each fact on its island: a gentle pull to the centre, and a firm one
// once it drifts past the shore.
function islandForce(islandOf: ReadonlyMap<string, Island>) {
  let nodes: GraphNode[] = [];
  const force = (alpha: number) => {
    for (const node of nodes) {
      const island = islandOf.get(node.id);
      if (!island || node.x === undefined || node.y === undefined) continue;
      const dx = island.x - node.x;
      const dy = island.y - node.y;
      const outside = Math.hypot(dx, dy) > island.r;
      const pull = (outside ? 0.25 : 0.03) * alpha;
      node.vx = (node.vx ?? 0) + dx * pull;
      node.vy = (node.vy ?? 0) + dy * pull;
    }
  };
  force.initialize = (all: GraphNode[]) => {
    nodes = all;
  };
  return force;
}

export default function GraphCanvas({
  nodes,
  edges,
  clustering,
  selectedId,
  highlight,
  apiRef,
  nodeIndex,
  onSelectNode,
  onSelectEdge,
  onBackground,
  onZoom,
}: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [hoverId, setHoverId] = useState<string | null>(null);
  const zoomRef = useRef(1);
  // Island spots survive re-clustering so the map doesn't reshuffle.
  const [islandSpots] = useState(() => new Map<string, Island>());
  // Where each island actually is, measured every frame from its members.
  const [shores] = useState(() => new Map<string, Island>());
  const shore = (g: Group) => shores.get(g.key) ?? g.island;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) {
        setSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const { degree, neighbours } = useMemo(() => {
    const degrees = new Map<string, number>();
    const adjacent = new Map<string, Set<string>>();
    for (const e of edges) {
      degrees.set(e.sourceId, (degrees.get(e.sourceId) ?? 0) + 1);
      degrees.set(e.targetId, (degrees.get(e.targetId) ?? 0) + 1);
      adjacent.set(
        e.sourceId,
        (adjacent.get(e.sourceId) ?? new Set()).add(e.targetId),
      );
      adjacent.set(
        e.targetId,
        (adjacent.get(e.targetId) ?? new Set()).add(e.sourceId),
      );
    }
    return { degree: degrees, neighbours: adjacent };
  }, [edges]);

  const { islands, loose } = useMemo(() => {
    const looseCount = nodes.length - clustering.clusterOf.size;
    const placed = placeIslands(clustering, looseCount, islandSpots);
    clustering.clusters.forEach((c, i) => {
      const island = placed.islands[i];
      if (island) islandSpots.set(islandKey(c.nodeIds), island);
    });
    if (placed.loose) islandSpots.set("loose", placed.loose);
    return placed;
  }, [clustering, nodes.length, islandSpots]);

  // Reuse node objects across updates so the layout doesn't jump when the
  // graph grows (an answer or an access grant). New nodes start on their
  // island, busiest in the middle.
  const { data, groups, groupOf, islandOf } = useMemo(() => {
    const byId = new Map(nodes.map((view) => [view.id, view]));
    const islandById = new Map<string, Island>();
    const groupById = new Map<string, Group>();
    const list: Group[] = [];

    const addGroup = (
      key: string,
      cluster: Cluster | null,
      island: Island,
      ids: string[],
      color: string,
    ) => {
      const sorted = [...ids].toSorted(
        (a, b) => (degree.get(b) ?? 0) - (degree.get(a) ?? 0),
      );
      const group: Group = {
        key,
        cluster,
        island,
        members: [],
        color,
      };
      sorted.forEach((id, i) => {
        const view = byId.get(id);
        if (!view) return;
        let node = nodeIndex.get(id);
        if (!node) {
          node = { id, view, degree: 0, ...seat(island, i, sorted.length) };
          nodeIndex.set(id, node);
        }
        node.view = view;
        node.degree = degree.get(id) ?? 0;
        islandById.set(id, island);
        groupById.set(id, group);
        group.members.push(node);
      });
      list.push(group);
    };

    clustering.clusters.forEach((cluster, i) => {
      const island = islands[i];
      if (island) {
        addGroup(
          islandKey(cluster.nodeIds),
          cluster,
          island,
          cluster.nodeIds,
          SOURCES[cluster.source].color,
        );
      }
    });
    if (loose) {
      const rest = nodes
        .filter((n) => !clustering.clusterOf.has(n.id))
        .map((n) => n.id);
      addGroup("loose", null, loose, rest, LOOSE_COLOR);
    }

    const graphNodes = nodes.flatMap((view) => nodeIndex.get(view.id) ?? []);
    const links: GraphLink[] = edges.map((view) => ({
      id: view.id,
      view,
      source: view.sourceId,
      target: view.targetId,
    }));
    return {
      data: { nodes: graphNodes, links },
      groups: list,
      groupOf: groupById,
      islandOf: islandById,
    };
  }, [nodes, edges, clustering, islands, loose, degree, nodeIndex]);

  // Labels compete for space; the busiest facts win.
  const byImportance = useMemo(
    () =>
      data.nodes
        .filter((n) => !n.view.locked)
        .toSorted((a, b) => b.degree - a.degree),
    [data.nodes],
  );

  const ready = size.width > 0;
  useEffect(() => {
    const api = apiRef.current;
    if (!ready || !api) return;
    api.d3Force("center", null);
    api.d3Force("charge")?.strength?.(-30)?.distanceMax?.(120);
    api
      .d3Force("link")
      ?.distance?.(24)
      ?.strength?.((link: GraphLink) => {
        const same =
          groupOf.get(endId(link.source)) === groupOf.get(endId(link.target));
        return same ? 0.3 : 0;
      });
    api.d3Force("island", islandForce(islandOf));
  }, [apiRef, ready, groupOf, islandOf]);

  // Open on the whole map, before the simulation has settled.
  const framed = useRef(false);
  useEffect(() => {
    const api = apiRef.current;
    if (!ready || !api || framed.current || !groups.length) return;
    framed.current = true;
    const xs = groups.flatMap((g) => [
      g.island.x - g.island.r,
      g.island.x + g.island.r,
    ]);
    const ys = groups.flatMap((g) => [
      g.island.y - g.island.r,
      g.island.y + g.island.r,
    ]);
    const [x0, x1, y0, y1] = [
      Math.min(...xs),
      Math.max(...xs),
      Math.min(...ys),
      Math.max(...ys),
    ];
    const k = Math.min(
      (size.width - 120) / (x1 - x0),
      (size.height - 220) / (y1 - y0),
    );
    api.zoom(k);
    // Leave room for the header above and the ask bar below.
    api.centerAt((x0 + x1) / 2, (y0 + y1) / 2 + 20 / k);
  }, [apiRef, ready, groups, size]);

  const searching = highlight.visited.size > 0 || highlight.scanning !== null;
  const focus = hoverId && !searching ? hoverId : null;
  const focusSet = focus ? neighbours.get(focus) : undefined;
  const inFocus = (id: string) => id === focus || !!focusSet?.has(id);

  const zoomToGroup = (group: Group) =>
    apiRef.current?.zoomToFit(700, 70, (n) => groupOf.get(n.id) === group);

  const drawNode = (
    node: GraphNode,
    ctx: CanvasRenderingContext2D,
    k: number,
  ) => {
    const { view } = node;
    const x = node.x ?? 0;
    const y = node.y ?? 0;
    const t = Date.now() / 1000;
    const isHit = highlight.hits.has(view.id);
    const isVisited = highlight.visited.has(view.id);
    const isScan = highlight.scanning === view.id;
    const isLockedHit = highlight.locked.has(view.id);
    // What the search touches stays easy to spot at any zoom.
    const r = Math.max(
      radius(node.degree, k),
      isHit || isVisited || isScan ? 4 / k : 0,
    );
    const isSelected = selectedId === view.id;
    const dim =
      (searching && !isVisited && !isScan) ||
      (focus !== null && !inFocus(view.id));

    ctx.globalAlpha = dim ? 0.18 : 1;

    if (isHit) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 3);
      ctx.beginPath();
      ctx.arc(x, y, r + (5 + pulse * 3) / Math.min(k, 1), 0, 2 * Math.PI);
      ctx.fillStyle = isLockedHit
        ? `rgba(241,0,47,${0.2 + pulse * 0.14})`
        : `rgba(255,190,0,${0.18 + pulse * 0.12})`;
      ctx.fill();
    }
    if (view.isNew) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 4);
      ctx.beginPath();
      ctx.arc(x, y, r + (4 + pulse * 4) / Math.min(k, 1), 0, 2 * Math.PI);
      ctx.strokeStyle = `rgba(47,214,163,${0.9 - pulse * 0.6})`;
      ctx.lineWidth = 1.5 / k;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    if (view.locked) {
      ctx.fillStyle = LOCKED_FILL;
      ctx.fill();
      // Details only once the node is big enough to show them.
      if (r * k > 5) {
        ctx.setLineDash([2, 2]);
        ctx.strokeStyle = LOCKED_STROKE;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.setLineDash([]);
        drawLock(ctx, x, y, r);
      }
    } else {
      ctx.fillStyle = SOURCES[view.source].color;
      ctx.fill();
      if (r * k > 5) {
        ctx.strokeStyle = "rgba(255,255,255,0.35)";
        ctx.lineWidth = 1 / k;
        ctx.stroke();
      }
    }

    if (isVisited || isScan) {
      ctx.beginPath();
      ctx.arc(x, y, r + 2 / k, 0, 2 * Math.PI);
      ctx.strokeStyle = isScan ? "#ffffff" : isLockedHit ? RED : YELLOW;
      ctx.lineWidth = (isScan ? 2 : 1.4) / k;
      ctx.stroke();
    }
    if (isSelected || view.id === focus) {
      ctx.beginPath();
      ctx.arc(x, y, r + 3 / k, 0, 2 * Math.PI);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2 / k;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  };

  // Behind the nodes: a glow per island and, zoomed out, one bundled line per
  // pair of linked islands.
  const drawUnderlay = (ctx: CanvasRenderingContext2D, k: number) => {
    for (const g of groups) {
      if (!g.members.length) continue;
      let sx = 0;
      let sy = 0;
      for (const n of g.members) {
        sx += n.x ?? 0;
        sy += n.y ?? 0;
      }
      const x = sx / g.members.length;
      const y = sy / g.members.length;
      let spread = 0;
      for (const n of g.members) {
        spread += ((n.x ?? 0) - x) ** 2 + ((n.y ?? 0) - y) ** 2;
      }
      shores.set(g.key, {
        x,
        y,
        r: Math.sqrt(spread / g.members.length) * 1.45 + 12,
      });
    }

    const topics = 1 - smooth(LOD.topics, k);
    const dimAll = searching || focus ? 0.4 : 1;
    for (const g of groups) {
      const glow = (0.05 + 0.13 * topics) * dimAll;
      const gradient = ctx.createRadialGradient(
        shore(g).x,
        shore(g).y,
        0,
        shore(g).x,
        shore(g).y,
        shore(g).r * 1.25,
      );
      gradient.addColorStop(0, withAlpha(g.color, glow));
      gradient.addColorStop(0.7, withAlpha(g.color, glow * 0.45));
      gradient.addColorStop(1, withAlpha(g.color, 0));
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(shore(g).x, shore(g).y, shore(g).r * 1.25, 0, 2 * Math.PI);
      ctx.fill();
    }

    if (topics <= 0.01) return;
    ctx.lineCap = "round";
    for (const [key, count] of clustering.bridges) {
      if (count < 3) continue;
      const [a, b] = key.split(":").map(Number) as [number, number];
      const ga = groups[a];
      const gb = groups[b];
      if (!ga || !gb) continue;
      const dx = shore(gb).x - shore(ga).x;
      const dy = shore(gb).y - shore(ga).y;
      const length = Math.hypot(dx, dy);
      // From shore to shore, so the bundles don't pile up in the middle.
      const from = Math.min(shore(ga).r * 0.7, length * 0.3) / length;
      const to = 1 - Math.min(shore(gb).r * 0.7, length * 0.3) / length;
      const cx = (shore(ga).x + shore(gb).x) / 2 - dy * 0.12;
      const cy = (shore(ga).y + shore(gb).y) / 2 + dx * 0.12;
      const strength = Math.min(1, count / 25);
      ctx.strokeStyle = white((0.05 + 0.2 * strength) * topics * dimAll);
      ctx.lineWidth = (0.6 + Math.log2(count) * 0.8) / k;
      ctx.beginPath();
      ctx.moveTo(shore(ga).x + dx * from, shore(ga).y + dy * from);
      ctx.quadraticCurveTo(
        cx,
        cy,
        shore(ga).x + dx * to,
        shore(ga).y + dy * to,
      );
      ctx.stroke();
    }
  };

  const onScreen = (sx: number, sy: number, pad = 0) =>
    sx > -pad && sy > -pad && sx < size.width + pad && sy < size.height + pad;

  // On top, in screen pixels: island names, then fact names where they fit.
  const drawOverlay = (ctx: CanvasRenderingContext2D, k: number) => {
    const m = ctx.getTransform();
    const ratio = m.a / k;
    const tx = m.e / ratio;
    const ty = m.f / ratio;
    const toScreen = (x = 0, y = 0) => [x * k + tx, y * k + ty] as const;
    ctx.save();
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    const taken: Box[] = [];

    const label = (node: GraphNode, strong: boolean, alpha: number) => {
      const [sx, sy] = toScreen(node.x, node.y);
      if (!onScreen(sx, sy, 40)) return true;
      const text = node.view.locked ? "Locked" : clip(node.view.title);
      ctx.font = `${strong ? 600 : 500} 12px Inter, sans-serif`;
      const w = ctx.measureText(text).width + 8;
      const top = sy + radius(node.degree, k) * k + 3;
      const box = { x: sx - w / 2, y: top, w, h: 16 };
      if (!strong && overlaps(box, taken)) return false;
      taken.push(box);
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3;
      ctx.strokeText(text, sx, top + 8);
      ctx.fillStyle = node.view.locked
        ? "rgba(255,255,255,0.45)"
        : "rgba(255,255,255,0.92)";
      ctx.fillText(text, sx, top + 8);
      return true;
    };

    // Always named: what you picked, what the search found, what you point at.
    const pinned = new Set<string>(highlight.hits);
    if (selectedId) pinned.add(selectedId);
    if (hoverId) pinned.add(hoverId);
    for (const id of pinned) {
      const node = nodeIndex.get(id);
      if (node) label(node, true, 1);
    }
    if (focusSet) {
      for (const id of focusSet) {
        const node = nodeIndex.get(id);
        if (node) label(node, false, 0.9);
      }
    }

    // Zoomed out, island names sit in the middle of each island. Zoomed in,
    // they move to the shore as captions so you know where you are.
    const topics = 1 - smooth(LOD.topics, k);
    const order = [...groups].toSorted(
      (a, b) => b.members.length - a.members.length,
    );
    for (const g of order) {
      const count = g.members.length;
      const reach = shore(g).r * k;
      if (count < 12 || reach < 18) continue;
      const name = g.cluster ? g.cluster.label : "Not connected yet";
      if (topics > 0.5) {
        const [sx, sy] = toScreen(shore(g).x, shore(g).y);
        if (!onScreen(sx, sy)) continue;
        const sub = !g.cluster
          ? `${count} facts`
          : g.cluster.visible
            ? `${count} facts · ${g.cluster.visible} yours`
            : `${count} facts · locked`;
        const fontSize = Math.round(Math.min(15, 10.5 + reach / 16));
        const showSub = reach > 40;
        ctx.font = `600 ${fontSize}px Inter, sans-serif`;
        const w = ctx.measureText(name).width + 12;
        const h = fontSize + (showSub ? 18 : 6);
        const box = { x: sx - w / 2, y: sy - h / 2, w, h };
        if (overlaps(box, taken)) continue;
        taken.push(box);

        ctx.globalAlpha = (topics - 0.5) * 2 * (searching ? 0.55 : 1);
        const nameY = showSub ? sy - 7 : sy;
        ctx.strokeStyle = INK;
        ctx.lineWidth = 4;
        ctx.strokeText(name, sx, nameY);
        ctx.fillStyle = "#ffffff";
        ctx.fillText(name, sx, nameY);
        if (showSub) {
          ctx.font = "500 11px Inter, sans-serif";
          ctx.lineWidth = 3;
          ctx.strokeText(sub, sx, sy + fontSize / 2 + 3);
          ctx.fillStyle = "rgba(255,255,255,0.6)";
          ctx.fillText(sub, sx, sy + fontSize / 2 + 3);
        }
      } else {
        const [sx, sy] = toScreen(shore(g).x, shore(g).y - shore(g).r * 1.05);
        if (!onScreen(sx, sy, 100)) continue;
        const caption = name.toUpperCase();
        ctx.font = "600 11px Inter, sans-serif";
        ctx.letterSpacing = "1.5px";
        const w = ctx.measureText(caption).width + 12;
        const box = { x: sx - w / 2, y: sy - 9, w, h: 18 };
        if (overlaps(box, taken)) {
          ctx.letterSpacing = "0px";
          continue;
        }
        taken.push(box);
        ctx.globalAlpha = (0.5 - topics) * 2 * (searching || focus ? 0.4 : 1);
        ctx.strokeStyle = INK;
        ctx.lineWidth = 3;
        ctx.strokeText(caption, sx, sy);
        ctx.fillStyle = withAlpha(g.color, 0.9);
        ctx.fillText(caption, sx, sy);
        ctx.letterSpacing = "0px";
      }
    }

    const names = smooth(LOD.labels, k) * (searching || focus ? 0.2 : 1);
    if (names > 0.01) {
      let placed = 0;
      for (const node of byImportance) {
        if (placed > 160) break;
        if (pinned.has(node.id) || focusSet?.has(node.id)) continue;
        // Zoomed partway in, only the hubs get a name.
        if (node.degree < (1 - smooth([0.5, 2], k)) * 10) break;
        const [sx, sy] = toScreen(node.x, node.y);
        if (!onScreen(sx, sy)) continue;
        if (label(node, false, names)) placed++;
      }
    }
    ctx.restore();
  };

  const linkLit = (link: GraphLink) =>
    highlight.visited.has(endId(link.source)) &&
    highlight.visited.has(endId(link.target));

  const linkFocused = (link: GraphLink) =>
    focus !== null &&
    (endId(link.source) === focus || endId(link.target) === focus);

  const sameIsland = (link: GraphLink) =>
    groupOf.get(endId(link.source)) === groupOf.get(endId(link.target));

  return (
    <div ref={containerRef} className="absolute inset-0">
      {ready && (
        <ForceGraph<GraphNode, GraphLink>
          ref={apiRef as React.MutableRefObject<GraphApi | undefined>}
          width={size.width}
          height={size.height}
          graphData={data}
          backgroundColor="rgba(0,0,0,0)"
          autoPauseRedraw={false}
          cooldownTicks={240}
          minZoom={ZOOM.min}
          maxZoom={ZOOM.max}
          nodeRelSize={6}
          nodeLabel={() => ""}
          nodeCanvasObject={drawNode}
          nodePointerAreaPaint={(node, color, ctx, k) => {
            const r = radius(node.degree, k) + 3 / k;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(node.x ?? 0, node.y ?? 0, r, 0, 2 * Math.PI);
            ctx.fill();
          }}
          onRenderFramePre={drawUnderlay}
          onRenderFramePost={drawOverlay}
          linkVisibility={(link) => {
            const k = zoomRef.current;
            if (selectedId === link.id || linkLit(link) || linkFocused(link)) {
              return true;
            }
            // Zoomed out, links between islands are drawn as bundles instead.
            return sameIsland(link)
              ? k > LOD.edges[0] * 0.5
              : k > LOD.topics[0];
          }}
          linkColor={(link) => {
            if (selectedId === link.id) return "#ffffff";
            if (linkLit(link)) return "rgba(255,190,0,0.85)";
            if (linkFocused(link)) return "rgba(255,255,255,0.85)";
            if (searching || focus) return white(0.04);
            const detail = smooth(LOD.edges, zoomRef.current);
            const base = sameIsland(link)
              ? 0.08 + 0.24 * detail
              : 0.05 * smooth(LOD.topics, zoomRef.current);
            return white(link.view.locked ? base * 0.55 : base);
          }}
          linkLineDash={(link) =>
            link.view.locked && zoomRef.current > 1 ? [2, 3] : null
          }
          linkWidth={(link) =>
            selectedId === link.id
              ? 2.5
              : linkLit(link) || linkFocused(link)
                ? 1.8
                : zoomRef.current < LOD.edges[1]
                  ? 0.6
                  : 1
          }
          linkHoverPrecision={6}
          linkDirectionalParticles={(link) => (linkLit(link) ? 2 : 0)}
          linkDirectionalParticleWidth={2.5}
          linkDirectionalParticleColor={() => YELLOW}
          onNodeClick={(node) => {
            const group = groupOf.get(node.id);
            // On the map, a click dives into the island.
            if (group && smooth(LOD.topics, zoomRef.current) < 0.5) {
              zoomToGroup(group);
            } else {
              onSelectNode(node.id);
            }
          }}
          onLinkClick={(link) => onSelectEdge(link.id)}
          onNodeHover={(node) => setHoverId(node?.id ?? null)}
          onBackgroundClick={(event) => {
            const api = apiRef.current;
            if (api && smooth(LOD.topics, zoomRef.current) < 0.5) {
              const p = api.screen2GraphCoords(event.offsetX, event.offsetY);
              const hit = groups.find(
                (g) =>
                  Math.hypot(shore(g).x - p.x, shore(g).y - p.y) < shore(g).r,
              );
              if (hit) {
                zoomToGroup(hit);
                return;
              }
            }
            onBackground();
          }}
          onZoom={({ k }) => {
            zoomRef.current = k;
            onZoom(k);
          }}
        />
      )}
    </div>
  );
}
