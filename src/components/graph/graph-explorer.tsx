"use client";

import { Lock, Maximize, Minus, Plus } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { askGraph, markSeen } from "@/app/(app)/graph/actions";
import { clusterGraph } from "@/lib/graph/clusters";
import { SOURCES, ZOOM } from "@/lib/graph/meta";
import type { AskResult, GraphView } from "@/lib/graph/types";
import { AskBar } from "./ask-bar";
import { AskResultCard } from "./ask-result";
import type { GraphApi, GraphNode, Highlight } from "./graph-canvas";
import { Inspector } from "./inspector";

const GraphCanvas = dynamic(() => import("./graph-canvas"), { ssr: false });

type Selection = { kind: "node" | "edge"; id: string } | null;

const EMPTY: Highlight = {
  scanning: null,
  visited: new Set(),
  hits: new Set(),
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// The slider is logarithmic so each notch zooms by the same factor.
const ZOOM_RANGE = Math.log(ZOOM.max / ZOOM.min);
const zoomToSlider = (k: number) => (Math.log(k / ZOOM.min) / ZOOM_RANGE) * 100;
const sliderToZoom = (value: number) =>
  ZOOM.min * Math.exp((value / 100) * ZOOM_RANGE);

// Below Tailwind's md breakpoint panels become sheets over the graph, so the
// camera has to keep what matters clear of them.
const isPhone = () => !window.matchMedia("(min-width: 48rem)").matches;

function ZoomButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex size-11 items-center justify-center transition-colors hover:bg-white/10 hover:text-white md:size-9"
    >
      {children}
    </button>
  );
}

export function GraphExplorer({
  view,
  focusId,
}: {
  view: GraphView;
  focusId: string | null;
}) {
  const apiRef = useRef<GraphApi | undefined>(undefined);
  const rootRef = useRef<HTMLDivElement>(null);
  const [nodeIndex] = useState(() => new Map<string, GraphNode>());
  const run = useRef(0);
  const [selection, setSelection] = useState<Selection>(
    focusId ? { kind: "node", id: focusId } : null,
  );
  const [highlight, setHighlight] = useState<Highlight>(EMPTY);
  const [status, setStatus] = useState<string | null>(null);
  const [result, setResult] = useState<AskResult | null>(null);
  const [error, setError] = useState("");
  const [zoomLevel, setZoomLevel] = useState(1);

  const visible = view.nodes.filter((n) => !n.locked).length;
  const clustering = useMemo(
    () => clusterGraph(view.nodes, view.edges),
    [view.nodes, view.edges],
  );

  const centerOn = useCallback(
    (id: string, zoom?: number) => {
      const api = apiRef.current;
      const node = nodeIndex.get(id);
      if (!api || node?.x === undefined || node.y === undefined) return;
      // On phones the inspector sheet covers up to the bottom 65%: put the
      // node a fifth of the way down, between the header and the sheet.
      const lift = isPhone() ? (rootRef.current?.clientHeight ?? 0) * 0.3 : 0;
      api.centerAt(node.x, node.y + lift / (zoom ?? api.zoom()), 600);
      if (zoom) api.zoom(zoom, 600);
    },
    [nodeIndex],
  );

  const zoomBy = (factor: number) => {
    const api = apiRef.current;
    if (api) api.zoom(api.zoom() * factor, 300);
  };

  const fitToScreen = () => apiRef.current?.zoomToFit(600, 60);

  const selectNode = useCallback(
    (id: string) => {
      setSelection({ kind: "node", id });
      const node = view.nodes.find((n) => n.id === id);
      if (node?.isNew) markSeen(id).catch(() => {});
    },
    [view.nodes],
  );

  useEffect(() => {
    if (!focusId) return;
    const timer = setTimeout(() => centerOn(focusId, 2.5), 1500);
    return () => clearTimeout(timer);
  }, [focusId, centerOn]);

  const clear = () => {
    run.current++;
    setHighlight(EMPTY);
    setResult(null);
    setStatus(null);
  };

  const ask = async (question: string) => {
    const id = ++run.current;
    setError("");
    setResult(null);
    setSelection(null);
    setHighlight(EMPTY);
    setStatus(`Searching ${view.nodes.length} facts…`);

    // Probe random nodes while the search runs: the "embedding lookup".
    const ids = view.nodes.map((n) => n.id);
    const scan = setInterval(() => {
      const next = ids[Math.floor(Math.random() * ids.length)] ?? null;
      setHighlight((h) => ({ ...h, scanning: next }));
    }, 90);

    let res: AskResult;
    try {
      [res] = await Promise.all([askGraph(question), sleep(1400)]);
    } catch {
      clearInterval(scan);
      if (id !== run.current) return;
      setHighlight(EMPTY);
      setStatus(null);
      setError("Something went wrong while searching. Try again.");
      return;
    } finally {
      clearInterval(scan);
    }
    if (id !== run.current) return;

    // Walk the path: entry nodes first, then their neighbours.
    const hits = new Set(res.hits);
    setStatus(
      res.visited.length
        ? `Following ${res.visited.length} connections…`
        : "No matching facts",
    );
    for (let i = 0; i < res.visited.length; i++) {
      if (id !== run.current) return;
      const seen = res.visited.slice(0, i + 1);
      setHighlight({
        scanning: res.visited[i] ?? null,
        visited: new Set(seen),
        hits: new Set(seen.filter((n) => hits.has(n))),
      });
      // Sequential on purpose: each step is a frame of the animation.
      // oxlint-disable-next-line no-await-in-loop
      await sleep(i < hits.size ? 450 : 160);
    }
    if (id !== run.current) return;

    setHighlight({ scanning: null, visited: new Set(res.visited), hits });
    const api = apiRef.current;
    if (api && hits.size) {
      const phone = isPhone();
      api.zoomToFit(800, phone ? 60 : 180, (n) => hits.has(String(n.id)));
      // Nudge the hits clear of the answer card: it sits to the left on
      // wide screens and across the top on phones.
      setTimeout(() => {
        const zoom = Math.min(api.zoom(), 2.2);
        const center = api.centerAt();
        const height = rootRef.current?.clientHeight ?? 0;
        api.zoom(zoom, 400);
        if (phone)
          api.centerAt(center.x, center.y - (height * 0.2) / zoom, 400);
        else api.centerAt(center.x - 200 / zoom, center.y, 400);
      }, 850);
    }
    setStatus(null);
    setResult(res);
  };

  return (
    <div
      ref={rootRef}
      className="relative h-full overflow-hidden bg-navy-deep md:min-h-[640px]"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,109,216,0.18),transparent_65%)]"
      />
      <GraphCanvas
        nodes={view.nodes}
        edges={view.edges}
        clustering={clustering}
        selectedId={selection?.id ?? null}
        highlight={highlight}
        apiRef={apiRef}
        nodeIndex={nodeIndex}
        onSelectNode={(id) => {
          selectNode(id);
          if (isPhone()) centerOn(id);
        }}
        onSelectEdge={(id) => setSelection({ kind: "edge", id })}
        onBackground={() => setSelection(null)}
        onZoom={setZoomLevel}
      />

      <header className="pointer-events-none absolute top-4 left-4 z-10 sm:top-6 sm:left-6">
        <h1 className="text-lg font-semibold tracking-tight text-white sm:text-xl">
          Company brain
        </h1>
        <p className="mt-0.5 text-xs text-white/60 sm:mt-1 sm:text-sm">
          {view.nodes.length} facts in {clustering.clusters.length} topics · you
          can see {visible}
          <span className="max-sm:hidden">
            , the rest is known by colleagues
          </span>
        </p>
      </header>

      <ul className="absolute bottom-6 left-6 z-10 hidden flex-col gap-1.5 rounded-xl bg-black/30 p-3 text-xs text-white/70 backdrop-blur xl:flex">
        {(["MESSAGE", "MEETING", "EMAIL", "OTHER"] as const).map((source) => (
          <li key={source} className="flex items-center gap-2">
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: SOURCES[source].color }}
            />
            {SOURCES[source].label}
          </li>
        ))}
        <li className="flex items-center gap-2">
          <Lock className="size-2.5" /> No access
        </li>
      </ul>

      <div
        // On phones the answer card and inspector sheet span the width.
        className={`absolute top-1/2 right-3 z-10 flex -translate-y-1/2 flex-col overflow-hidden rounded-xl bg-black/30 text-white/70 backdrop-blur transition-[right] ${selection ? "md:right-[26rem]" : "md:right-6"} ${selection || result ? "max-md:hidden" : ""}`}
      >
        <ZoomButton label="Zoom in" onClick={() => zoomBy(ZOOM.step)}>
          <Plus className="size-4" />
        </ZoomButton>
        {/* Phones pinch to zoom; the slider would only get in the way. */}
        <div className="flex justify-center py-2 max-md:hidden">
          <input
            type="range"
            aria-label="Zoom"
            min={0}
            max={100}
            step={0.5}
            value={zoomToSlider(zoomLevel)}
            onChange={(e) =>
              apiRef.current?.zoom(sliderToZoom(Number(e.target.value)))
            }
            className="h-32 w-4 cursor-pointer accent-white [direction:rtl] [writing-mode:vertical-lr]"
          />
        </div>
        <ZoomButton label="Zoom out" onClick={() => zoomBy(1 / ZOOM.step)}>
          <Minus className="size-4" />
        </ZoomButton>
        <ZoomButton label="Fit to screen" onClick={fitToScreen}>
          <Maximize className="size-4" />
        </ZoomButton>
      </div>

      {result && (
        <AskResultCard
          result={result}
          view={view}
          covered={selection !== null}
          onSelectNode={(id) => {
            selectNode(id);
            centerOn(id);
          }}
          onClose={clear}
        />
      )}

      {selection && (
        <Inspector
          key={selection.id}
          view={view}
          selection={selection}
          onSelectNode={(id) => {
            selectNode(id);
            centerOn(id);
          }}
          onClose={() => setSelection(null)}
        />
      )}

      {error && (
        <p className="absolute bottom-32 left-1/2 z-20 w-max max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-lg bg-worx-red px-3 py-1.5 text-center text-sm text-white">
          {error}
        </p>
      )}

      <AskBar
        busy={status !== null}
        narrow={selection !== null}
        status={status}
        onAsk={ask}
      />
    </div>
  );
}
