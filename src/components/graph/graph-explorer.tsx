"use client";

import { Lock } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { askGraph, markSeen } from "@/app/(app)/graph/actions";
import { SOURCES } from "@/lib/graph/meta";
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

export function GraphExplorer({
  view,
  focusId,
}: {
  view: GraphView;
  focusId: string | null;
}) {
  const apiRef = useRef<GraphApi | undefined>(undefined);
  const [nodeIndex] = useState(() => new Map<string, GraphNode>());
  const run = useRef(0);
  const [selection, setSelection] = useState<Selection>(
    focusId ? { kind: "node", id: focusId } : null,
  );
  const [highlight, setHighlight] = useState<Highlight>(EMPTY);
  const [status, setStatus] = useState<string | null>(null);
  const [result, setResult] = useState<AskResult | null>(null);
  const [error, setError] = useState("");

  const visible = view.nodes.filter((n) => !n.locked).length;

  const centerOn = useCallback(
    (id: string, zoom?: number) => {
      const api = apiRef.current;
      const node = nodeIndex.get(id);
      if (!api || node?.x === undefined || node.y === undefined) return;
      api.centerAt(node.x, node.y, 600);
      if (zoom) api.zoom(zoom, 600);
    },
    [nodeIndex],
  );

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
      api.zoomToFit(800, 180, (n) => hits.has(String(n.id)));
      // Nudge the hits right so the answer card doesn't cover them.
      setTimeout(() => {
        const zoom = Math.min(api.zoom(), 2.2);
        const center = api.centerAt();
        api.zoom(zoom, 400);
        api.centerAt(center.x - 200 / zoom, center.y, 400);
      }, 850);
    }
    setStatus(null);
    setResult(res);
  };

  return (
    <div className="relative h-full min-h-[640px] overflow-hidden bg-navy-deep">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,109,216,0.18),transparent_65%)]"
      />
      <GraphCanvas
        nodes={view.nodes}
        edges={view.edges}
        selectedId={selection?.id ?? null}
        highlight={highlight}
        apiRef={apiRef}
        nodeIndex={nodeIndex}
        onSelectNode={selectNode}
        onSelectEdge={(id) => setSelection({ kind: "edge", id })}
        onBackground={() => setSelection(null)}
      />

      <header className="pointer-events-none absolute top-6 left-6 z-10">
        <h1 className="text-xl font-semibold tracking-tight text-white">
          Company brain
        </h1>
        <p className="mt-1 text-sm text-white/60">
          {view.nodes.length} facts · you can see {visible}, the rest is known
          by colleagues
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

      {result && (
        <AskResultCard
          result={result}
          view={view}
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
        <p className="absolute bottom-32 left-1/2 z-20 -translate-x-1/2 rounded-lg bg-worx-red px-3 py-1.5 text-sm text-white">
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
