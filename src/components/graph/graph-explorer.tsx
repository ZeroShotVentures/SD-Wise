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
  locked: new Set(),
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
      className="flex size-11 items-center justify-center text-muted transition-colors hover:bg-subtle hover:text-ink md:size-8"
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

    // Walk the path: entry nodes first, then their neighbours. Locked matches
    // light up too, so Ask a colleague points at something on the graph.
    const locked = new Set(res.lockedHits);
    const hits = new Set([...res.hits, ...res.lockedHits]);
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
        locked,
      });
      // Sequential on purpose: each step is a frame of the animation.
      // oxlint-disable-next-line no-await-in-loop
      await sleep(i < hits.size ? 450 : 160);
    }
    if (id !== run.current) return;

    setHighlight({
      scanning: null,
      visited: new Set(res.visited),
      hits,
      locked,
    });
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

  const count = new Intl.NumberFormat("en");

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-line bg-white px-4 sm:px-6">
        <div className="flex min-w-0 items-baseline gap-3">
          <h1 className="shrink-0 text-base font-semibold tracking-tight text-ink">
            Company brain
          </h1>
          <p className="truncate text-sm text-muted">
            <span className="text-ink tabular-nums">
              {count.format(view.nodes.length)}
            </span>{" "}
            facts
            <span className="max-sm:hidden">
              {" "}
              in{" "}
              <span className="text-ink tabular-nums">
                {clustering.clusters.length}
              </span>{" "}
              topics
            </span>{" "}
            ·{" "}
            <span className="text-ink tabular-nums">
              {count.format(visible)}
            </span>{" "}
            visible to you
          </p>
        </div>
        <ul
          aria-label="Legend"
          className="hidden shrink-0 items-center gap-4 text-xs text-muted lg:flex"
        >
          {(["MESSAGE", "MEETING", "EMAIL", "OTHER"] as const).map((source) => (
            <li key={source} className="flex items-center gap-1.5">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: SOURCES[source].ink }}
              />
              {SOURCES[source].label}
            </li>
          ))}
          <li className="flex items-center gap-1.5">
            <span className="flex size-3 items-center justify-center rounded-full bg-[#d5dae1]">
              <Lock className="size-2 text-white" strokeWidth={3} />
            </span>
            No access
          </li>
        </ul>
      </header>

      <div
        ref={rootRef}
        className="relative min-h-0 flex-1 overflow-hidden bg-canvas md:min-h-[580px]"
      >
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

        <div
          // On phones the answer card and inspector sheet span the width.
          className={`absolute top-3 right-3 z-10 flex flex-col overflow-hidden rounded-lg border border-line bg-white shadow-sm transition-[right] sm:top-4 ${selection ? "md:right-[25rem]" : "md:right-4"} ${selection || result ? "max-md:hidden" : ""}`}
        >
          <ZoomButton label="Zoom in" onClick={() => zoomBy(ZOOM.step)}>
            <Plus className="size-4" />
          </ZoomButton>
          {/* Phones pinch to zoom; the slider would only get in the way. */}
          <div className="flex justify-center border-y border-line py-2 max-md:hidden">
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
              className="h-24 w-4 cursor-pointer accent-brand [direction:rtl] [writing-mode:vertical-lr]"
            />
          </div>
          <ZoomButton label="Zoom out" onClick={() => zoomBy(1 / ZOOM.step)}>
            <Minus className="size-4" />
          </ZoomButton>
          <div className="border-t border-line">
            <ZoomButton label="Fit to screen" onClick={fitToScreen}>
              <Maximize className="size-4" />
            </ZoomButton>
          </div>
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
          <p
            role="alert"
            className="absolute bottom-32 left-1/2 z-20 w-max max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-center text-sm text-red-700 shadow-sm"
          >
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
    </div>
  );
}
