"use client";

import { type RefObject, useEffect, useMemo, useRef, useState } from "react";
import ForceGraph, {
  type ForceGraphMethods,
  type LinkObject,
  type NodeObject,
} from "react-force-graph-2d";
import { SOURCES } from "@/lib/graph/meta";
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
};

type GraphCanvasProps = {
  nodes: NodeView[];
  edges: EdgeView[];
  selectedId: string | null;
  highlight: Highlight;
  apiRef: RefObject<GraphApi | undefined>;
  // Node objects by id; the graph library writes their positions onto them.
  nodeIndex: Map<string, GraphNode>;
  onSelectNode: (id: string) => void;
  onSelectEdge: (id: string) => void;
  onBackground: () => void;
};

const YELLOW = "#ffbe00";
const LOCKED_FILL = "#2a3640";
const LOCKED_STROKE = "#56666f";

// Canvas-space rectangle on screen this frame, for culling.
type Frame = { minX: number; minY: number; maxX: number; maxY: number };

const endId = (end: GraphLink["source"]) =>
  typeof end === "object" ? String(end?.id) : String(end);

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

export default function GraphCanvas({
  nodes,
  edges,
  selectedId,
  highlight,
  apiRef,
  nodeIndex,
  onSelectNode,
  onSelectEdge,
  onBackground,
}: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [hoverId, setHoverId] = useState<string | null>(null);
  const frame = useRef<Frame | null>(null);
  const time = useRef(0);
  const zoom = useRef(1);
  // Large graphs arrive laid out; small ones are left to the simulation.
  const staticLayout = useMemo(() => nodes.some((n) => n.pos), [nodes]);

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

  // Reuse node objects across updates so the layout doesn't jump when the
  // graph grows (an answer or an access grant).
  const data = useMemo(() => {
    const degree = new Map<string, number>();
    for (const e of edges) {
      degree.set(e.sourceId, (degree.get(e.sourceId) ?? 0) + 1);
      degree.set(e.targetId, (degree.get(e.targetId) ?? 0) + 1);
    }
    const graphNodes = nodes.map((view) => {
      const existing = nodeIndex.get(view.id);
      const node: GraphNode = existing ?? { id: view.id, view, degree: 0 };
      if (!existing && view.pos) [node.x, node.y] = view.pos;
      node.view = view;
      node.degree = degree.get(view.id) ?? 0;
      nodeIndex.set(view.id, node);
      return node;
    });
    // Nodes without a position (new answers) go next to what they link to.
    for (const [i, node] of graphNodes.entries()) {
      if (node.x !== undefined) continue;
      const edge = edges.find(
        (e) => e.sourceId === node.id || e.targetId === node.id,
      );
      const other =
        edge &&
        nodeIndex.get(
          edge.sourceId === node.id ? edge.targetId : edge.sourceId,
        );
      if (other?.x === undefined || other.y === undefined) continue;
      const angle = i * 2.39996; // golden angle, so siblings fan out
      node.x = other.x + Math.cos(angle) * 24;
      node.y = other.y + Math.sin(angle) * 24;
    }
    const links: GraphLink[] = edges.map((view) => ({
      id: view.id,
      view,
      source: view.sourceId,
      target: view.targetId,
    }));
    return { nodes: graphNodes, links };
  }, [nodes, edges, nodeIndex]);

  const ready = size.width > 0;
  useEffect(() => {
    const api = apiRef.current;
    if (!ready || !api) return;
    if (staticLayout) {
      api.zoomToFit(0, 40);
      return;
    }
    api.d3Force("charge")?.strength?.(-140);
    api.d3Force("link")?.distance?.(55);
  }, [apiRef, ready, staticLayout]);

  const searching = highlight.visited.size > 0 || highlight.scanning !== null;

  const drawNode = (
    node: GraphNode,
    ctx: CanvasRenderingContext2D,
    scale: number,
  ) => {
    const { view } = node;
    const x = node.x ?? 0;
    const y = node.y ?? 0;
    const r = 4 + Math.min(node.degree, 6) * 0.9;
    const f = frame.current;
    if (
      f &&
      (x + r < f.minX || x - r > f.maxX || y + r < f.minY || y - r > f.maxY)
    ) {
      return;
    }
    const t = time.current;
    const isHit = highlight.hits.has(view.id);
    const isVisited = highlight.visited.has(view.id);
    const isScan = highlight.scanning === view.id;
    const isSelected = selectedId === view.id;
    const dim = searching && !isVisited && !isScan;

    ctx.globalAlpha = dim ? 0.25 : 1;

    // Zoomed far out: plain dots, the details wouldn't be visible anyway.
    if (r * scale < 2.5 && !isHit && !isVisited && !isScan && !isSelected) {
      ctx.fillStyle = view.locked ? LOCKED_STROKE : SOURCES[view.source].color;
      ctx.beginPath();
      ctx.arc(x, y, Math.max(r, 1 / scale), 0, 2 * Math.PI);
      ctx.fill();
      ctx.globalAlpha = 1;
      return;
    }

    if (isHit) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 3);
      ctx.beginPath();
      ctx.arc(x, y, r + 5 + pulse * 3, 0, 2 * Math.PI);
      ctx.fillStyle = `rgba(255,190,0,${0.18 + pulse * 0.12})`;
      ctx.fill();
    }
    if (view.isNew) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 4);
      ctx.beginPath();
      ctx.arc(x, y, r + 4 + pulse * 4, 0, 2 * Math.PI);
      ctx.strokeStyle = `rgba(47,214,163,${0.9 - pulse * 0.6})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    if (view.locked) {
      ctx.fillStyle = LOCKED_FILL;
      ctx.fill();
      ctx.setLineDash([2, 2]);
      ctx.strokeStyle = LOCKED_STROKE;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]);
      drawLock(ctx, x, y, r);
    } else {
      ctx.fillStyle = SOURCES[view.source].color;
      ctx.fill();
    }

    if (isVisited || isScan) {
      ctx.beginPath();
      ctx.arc(x, y, r + 2, 0, 2 * Math.PI);
      ctx.strokeStyle = isScan ? "#ffffff" : YELLOW;
      ctx.lineWidth = isScan ? 2 : 1.2;
      ctx.stroke();
    }
    if (isSelected) {
      ctx.beginPath();
      ctx.arc(x, y, r + 3, 0, 2 * Math.PI);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Crowded graphs only label hubs until you zoom in further.
    const labelScale = staticLayout && node.degree < 4 ? 3 : 1.6;
    const showLabel =
      scale > labelScale || isSelected || isHit || hoverId === view.id;
    if (showLabel) {
      // Draw text in screen pixels; tiny canvas fonts scaled up render badly.
      const label = view.locked ? "Locked" : view.title;
      ctx.save();
      ctx.translate(x, y + r + 3);
      ctx.scale(1 / scale, 1 / scale);
      ctx.font = `${isHit || isSelected ? 600 : 500} 12px Inter, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = view.locked
        ? "rgba(255,255,255,0.45)"
        : "rgba(255,255,255,0.9)";
      ctx.fillText(label, 0, 0);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  };

  const linkLit = (link: GraphLink) =>
    highlight.visited.has(endId(link.source)) &&
    highlight.visited.has(endId(link.target));

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
          cooldownTicks={staticLayout ? 0 : 120}
          enableNodeDrag={!staticLayout}
          minZoom={staticLayout ? 0.08 : 0.5}
          maxZoom={4}
          nodeRelSize={6}
          nodeLabel={() => ""}
          onRenderFramePre={(ctx, scale) => {
            const m = ctx.getTransform().inverse();
            const a = m.transformPoint({ x: 0, y: 0 });
            const b = m.transformPoint({
              x: ctx.canvas.width,
              y: ctx.canvas.height,
            });
            frame.current = { minX: a.x, minY: a.y, maxX: b.x, maxY: b.y };
            time.current = Date.now() / 1000;
            zoom.current = scale;
          }}
          nodeCanvasObject={drawNode}
          nodePointerAreaPaint={(node, color, ctx) => {
            const r = 4 + Math.min(node.degree, 6) * 0.9 + 3;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(node.x ?? 0, node.y ?? 0, r, 0, 2 * Math.PI);
            ctx.fill();
          }}
          linkColor={(link) => {
            if (selectedId === link.id) return "#ffffff";
            if (linkLit(link)) return "rgba(255,190,0,0.85)";
            if (searching) return "rgba(255,255,255,0.06)";
            // Fade lines when zoomed out so thousands don't turn into a haze.
            const fade = Math.min(1, 0.35 + zoom.current * 0.65);
            const alpha = (link.view.locked ? 0.12 : 0.28) * fade;
            return `rgba(255,255,255,${alpha.toFixed(2)})`;
          }}
          linkLineDash={(link) => (link.view.locked ? [2, 3] : null)}
          linkWidth={(link) =>
            selectedId === link.id ? 2.5 : linkLit(link) ? 1.8 : 1
          }
          linkHoverPrecision={6}
          linkDirectionalParticles={(link) => (linkLit(link) ? 2 : 0)}
          linkDirectionalParticleWidth={2.5}
          linkDirectionalParticleColor={() => YELLOW}
          onNodeClick={(node) => onSelectNode(node.id)}
          onLinkClick={(link) => onSelectEdge(link.id)}
          onNodeHover={(node) => setHoverId(node?.id ?? null)}
          onBackgroundClick={onBackground}
        />
      )}
    </div>
  );
}
