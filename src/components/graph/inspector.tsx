"use client";

import {
  ArrowRight,
  Check,
  Globe,
  Link2,
  Lock,
  MessageSquareQuote,
  X,
} from "lucide-react";
import { useState, useTransition } from "react";
import { requestAccess } from "@/app/(app)/graph/actions";
import { Avatar } from "@/components/shell/avatar";
import {
  dateFormat,
  EDGE_KINDS,
  INTEGRATIONS,
  SOURCES,
} from "@/lib/graph/meta";
import type { EdgeView, GraphView, NodeView } from "@/lib/graph/types";

type InspectorProps = {
  view: GraphView;
  selection: { kind: "node" | "edge"; id: string };
  onSelectNode: (id: string) => void;
  onClose: () => void;
};

const sourceLabel = (node: NodeView, view: GraphView) => {
  const integration = view.integrations.find(
    (i) => i.id === node.integrationId,
  );
  return integration ? INTEGRATIONS[integration.type].label : "SD Wise";
};

export function Inspector({
  view,
  selection,
  onSelectNode,
  onClose,
}: InspectorProps) {
  const node =
    selection.kind === "node"
      ? view.nodes.find((n) => n.id === selection.id)
      : undefined;
  const edge =
    selection.kind === "edge"
      ? view.edges.find((e) => e.id === selection.id)
      : undefined;

  return (
    <aside className="animate-rise absolute top-4 right-4 bottom-4 z-10 flex w-96 flex-col overflow-hidden rounded-2xl bg-white shadow-2xl shadow-black/30">
      <header className="flex items-center justify-between border-b border-line px-5 py-3">
        <p className="text-xs font-semibold tracking-wider text-muted uppercase">
          {selection.kind === "node" ? "Fact" : "Connection"}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-muted hover:bg-canvas hover:text-navy"
        >
          <X className="size-4" />
          <span className="sr-only">Close</span>
        </button>
      </header>
      <div className="flex-1 overflow-y-auto p-5">
        {node && (
          <NodeDetails node={node} view={view} onSelectNode={onSelectNode} />
        )}
        {edge && (
          <EdgeDetails edge={edge} view={view} onSelectNode={onSelectNode} />
        )}
      </div>
    </aside>
  );
}

function NodeDetails({
  node,
  view,
  onSelectNode,
}: {
  node: NodeView;
  view: GraphView;
  onSelectNode: (id: string) => void;
}) {
  const owners = node.ownerIds.flatMap(
    (id) => view.people.find((p) => p.id === id) ?? [],
  );
  const source = SOURCES[node.source];
  const connections = view.edges.filter(
    (e) => e.sourceId === node.id || e.targetId === node.id,
  );

  if (node.locked) {
    return (
      <div className="flex flex-col gap-6">
        <div className="rounded-xl bg-navy p-5 text-white">
          <span className="inline-flex size-9 items-center justify-center rounded-full bg-white/10">
            <Lock className="size-4" />
          </span>
          <h2 className="mt-3 font-semibold">You don&apos;t have access</h2>
          <p className="mt-1 text-sm text-white/70">
            This was said in {source.label.toLowerCase()} on{" "}
            {sourceLabel(node, view)},{" "}
            {dateFormat.format(new Date(node.createdAt))}. Only the people who
            were there can see it.
          </p>
        </div>
        <section>
          <h3 className="text-xs font-semibold tracking-wider text-muted uppercase">
            People who know
          </h3>
          <ul className="mt-3 flex flex-col gap-2">
            {owners.map((person) => (
              <li
                key={person.id}
                className="flex items-center gap-3 rounded-xl border border-line p-3"
              >
                <Avatar id={person.id} name={person.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{person.name}</p>
                  <p className="truncate text-xs text-muted">{person.role}</p>
                </div>
                <RequestAccessButton nodeId={node.id} ownerId={person.id} />
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">
            They get a request in their inbox and decide whether to share it
            with you.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium text-navy"
            style={{ backgroundColor: `${source.color}26` }}
          >
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: source.color }}
            />
            {source.label}
          </span>
          <VisibilityBadge visibility={node.visibility} />
          {node.isNew && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
              New for you
            </span>
          )}
        </div>
        <h2 className="mt-3 text-lg font-semibold tracking-tight text-navy">
          {node.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink">
          {node.contentSummary}
        </p>
      </div>

      <section>
        <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-muted uppercase">
          <MessageSquareQuote className="size-3.5" /> What was said
        </h3>
        <blockquote className="mt-2 rounded-xl border-l-4 border-brand bg-canvas px-4 py-3 text-sm whitespace-pre-line text-ink/80">
          {node.content}
        </blockquote>
        <p className="mt-2 text-xs text-muted">
          {sourceLabel(node, view)} · {node.sourceDescription} ·{" "}
          {dateFormat.format(new Date(node.createdAt))}
        </p>
      </section>

      <section>
        <h3 className="text-xs font-semibold tracking-wider text-muted uppercase">
          Owned by
        </h3>
        <ul className="mt-2 flex flex-wrap gap-2">
          {owners.map((person) => (
            <li
              key={person.id}
              className="flex items-center gap-2 rounded-full border border-line py-1 pr-3 pl-1 text-sm"
            >
              <Avatar id={person.id} name={person.name} size="sm" />
              {person.name}
            </li>
          ))}
        </ul>
      </section>

      {connections.length > 0 && (
        <section>
          <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-muted uppercase">
            <Link2 className="size-3.5" /> Connections
          </h3>
          <ul className="mt-2 flex flex-col gap-1">
            {connections.map((edge) => {
              const otherId =
                edge.sourceId === node.id ? edge.targetId : edge.sourceId;
              const other = view.nodes.find((n) => n.id === otherId);
              return (
                <li key={edge.id}>
                  <button
                    type="button"
                    onClick={() => onSelectNode(otherId)}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-canvas"
                  >
                    <span className="w-20 shrink-0 text-xs text-muted">
                      {edge.locked ? "Hidden" : EDGE_KINDS[edge.kind]}
                    </span>
                    <span className="flex-1 truncate">
                      {other && !other.locked ? (
                        other.title
                      ) : (
                        <span className="inline-flex items-center gap-1 text-muted">
                          <Lock className="size-3" /> Locked fact
                        </span>
                      )}
                    </span>
                    <ArrowRight className="size-3.5 text-muted" />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

function EdgeDetails({
  edge,
  view,
  onSelectNode,
}: {
  edge: EdgeView;
  view: GraphView;
  onSelectNode: (id: string) => void;
}) {
  const ends = [edge.sourceId, edge.targetId].flatMap(
    (id) => view.nodes.find((n) => n.id === id) ?? [],
  );

  return (
    <div className="flex flex-col gap-6">
      {edge.locked ? (
        <div className="rounded-xl bg-navy p-5 text-white">
          <span className="inline-flex size-9 items-center justify-center rounded-full bg-white/10">
            <Lock className="size-4" />
          </span>
          <h2 className="mt-3 font-semibold">
            You can&apos;t see this connection
          </h2>
          <p className="mt-1 text-sm text-white/70">
            At least one side is a fact you don&apos;t have access to. Open the
            locked fact to see who knows.
          </p>
        </div>
      ) : (
        <div>
          <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand-dark">
            {EDGE_KINDS[edge.kind]}
          </span>
          <p className="mt-3 text-lg font-semibold tracking-tight text-navy">
            {edge.description}
          </p>
        </div>
      )}
      <ol className="flex flex-col gap-2">
        {ends.map((node, i) => (
          <li key={node.id}>
            {i === 1 && (
              <p className="mb-2 pl-4 text-xs text-muted">
                {edge.locked
                  ? "connects to"
                  : EDGE_KINDS[edge.kind].toLowerCase()}
              </p>
            )}
            <button
              type="button"
              onClick={() => onSelectNode(node.id)}
              className="flex w-full items-center gap-3 rounded-xl border border-line p-3 text-left hover:border-brand"
            >
              <span
                className="flex size-8 shrink-0 items-center justify-center rounded-full"
                style={{
                  backgroundColor: node.locked
                    ? "#2a3640"
                    : SOURCES[node.source].color,
                }}
              >
                {node.locked && <Lock className="size-3.5 text-white/80" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {node.locked ? "Locked fact" : node.title}
                </span>
                <span className="block text-xs text-muted">
                  {SOURCES[node.source].label}
                </span>
              </span>
              <ArrowRight className="size-4 text-muted" />
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

function VisibilityBadge({ visibility }: { visibility: "PUBLIC" | "PRIVATE" }) {
  return visibility === "PUBLIC" ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-canvas px-2 py-0.5 text-xs font-medium text-muted">
      <Globe className="size-3" /> Everyone
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-canvas px-2 py-0.5 text-xs font-medium text-muted">
      <Lock className="size-3" /> Private
    </span>
  );
}

function RequestAccessButton({
  nodeId,
  ownerId,
}: {
  nodeId: string;
  ownerId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(false);

  if (sent) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
        <Check className="size-3.5" /> Requested
      </span>
    );
  }
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          try {
            await requestAccess({ nodeId, ownerId });
            setSent(true);
          } catch {
            setError(true);
          }
        })
      }
      className="shrink-0 rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-50"
    >
      {pending ? "Sending..." : error ? "Try again" : "Request access"}
    </button>
  );
}
