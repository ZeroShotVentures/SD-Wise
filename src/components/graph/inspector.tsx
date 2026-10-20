"use client";

import {
  ArrowRight,
  Globe,
  Link2,
  Lock,
  MessageSquareQuote,
  X,
} from "lucide-react";
import { Avatar } from "@/components/shell/avatar";
import { Badge } from "@/components/ui/badge";
import { eyebrowClass, iconButtonClass } from "@/components/ui/styles";
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
    // A bottom sheet on phones, a panel on the right from md up.
    <aside className="animate-rise absolute inset-x-0 bottom-0 z-30 flex max-h-[65%] flex-col overflow-hidden rounded-t-xl border-t border-line bg-white shadow-2xl shadow-ink/10 md:inset-x-auto md:top-0 md:right-0 md:bottom-0 md:z-10 md:max-h-none md:w-96 md:rounded-none md:border-t-0 md:border-l md:shadow-none">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-line px-5">
        <p className="text-sm font-medium text-ink">
          {selection.kind === "node" ? "Fact details" : "Connection"}
        </p>
        <button type="button" onClick={onClose} className={iconButtonClass}>
          <X className="size-4" />
          <span className="sr-only">Close</span>
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5">
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
  const source = SOURCES[node.source];
  const connections = view.edges.filter(
    (e) => e.sourceId === node.id || e.targetId === node.id,
  );

  if (node.locked) {
    return (
      <div className="flex flex-col gap-6">
        <div className="rounded-lg border border-line bg-subtle p-4">
          <span className="inline-flex size-8 items-center justify-center rounded-md border border-line bg-white text-muted">
            <Lock className="size-4" />
          </span>
          <h2 className="mt-3 font-semibold text-ink">
            You don&apos;t have access
          </h2>
          <p className="mt-1 text-sm text-muted">
            This was said in {source.label.toLowerCase()} on{" "}
            {sourceLabel(node, view)},{" "}
            {dateFormat.format(new Date(node.createdAt))}. Only the people who
            were there can see it.
          </p>
        </div>
        <p className="text-sm text-muted">
          Ask SD Wise a question about it. When this matches, Ask a colleague
          sends your question to someone who was there, and they decide what to
          tell you. You only see who once they answer.
        </p>
      </div>
    );
  }

  const owners = node.ownerIds.flatMap(
    (id) => view.people.find((p) => p.id === id) ?? [],
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge>
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: source.ink }}
            />
            {source.label}
          </Badge>
          <VisibilityBadge visibility={node.visibility} />
          {node.isNew && (
            <Badge tone="success" dot>
              New for you
            </Badge>
          )}
        </div>
        <h2 className="mt-3 text-base font-semibold tracking-tight text-ink">
          {node.title}
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">
          {node.contentSummary}
        </p>
      </div>

      <section>
        <h3 className={`flex items-center gap-1.5 ${eyebrowClass}`}>
          <MessageSquareQuote className="size-3.5" /> What was said
        </h3>
        <blockquote className="mt-2 rounded-md border border-line bg-canvas px-3.5 py-3 text-sm leading-relaxed whitespace-pre-line text-ink">
          {node.content}
        </blockquote>
        <p className="mt-2 text-xs text-muted">
          {sourceLabel(node, view)} · {node.sourceDescription} ·{" "}
          {dateFormat.format(new Date(node.createdAt))}
        </p>
      </section>

      <section>
        <h3 className={eyebrowClass}>Owned by</h3>
        <ul className="mt-2 flex flex-wrap gap-2">
          {owners.map((person) => (
            <li
              key={person.id}
              className="flex items-center gap-2 rounded-full border border-line py-0.5 pr-2.5 pl-0.5 text-sm text-ink"
            >
              <Avatar id={person.id} name={person.name} size="sm" />
              {person.name}
            </li>
          ))}
        </ul>
      </section>

      {connections.length > 0 && (
        <section>
          <h3 className={`flex items-center gap-1.5 ${eyebrowClass}`}>
            <Link2 className="size-3.5" /> Connections
            <span className="font-normal tracking-normal normal-case tabular-nums">
              {connections.length}
            </span>
          </h3>
          <ul className="mt-2 -mx-2 flex flex-col">
            {connections.map((edge) => {
              const otherId =
                edge.sourceId === node.id ? edge.targetId : edge.sourceId;
              const other = view.nodes.find((n) => n.id === otherId);
              return (
                <li key={edge.id}>
                  <button
                    type="button"
                    onClick={() => onSelectNode(otherId)}
                    className="group flex w-full items-center gap-2 rounded-md px-2 py-2.5 text-left text-sm text-ink hover:bg-subtle md:py-1.5"
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
                    <ArrowRight className="size-3.5 text-faint opacity-0 transition-opacity group-hover:opacity-100" />
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
        <div className="rounded-lg border border-line bg-subtle p-4">
          <span className="inline-flex size-8 items-center justify-center rounded-md border border-line bg-white text-muted">
            <Lock className="size-4" />
          </span>
          <h2 className="mt-3 font-semibold text-ink">
            You can&apos;t see this connection
          </h2>
          <p className="mt-1 text-sm text-muted">
            At least one side is a fact you don&apos;t have access to.
          </p>
        </div>
      ) : (
        <div>
          <Badge tone="brand">{EDGE_KINDS[edge.kind]}</Badge>
          <p className="mt-3 text-base font-semibold tracking-tight text-ink">
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
              className="flex w-full items-center gap-3 rounded-lg border border-line p-3 text-left transition-colors hover:border-line-strong hover:bg-canvas"
            >
              <span
                className="flex size-7 shrink-0 items-center justify-center rounded-full"
                style={{
                  backgroundColor: node.locked
                    ? "#d5dae1"
                    : SOURCES[node.source].ink,
                }}
              >
                {node.locked && <Lock className="size-3.5 text-white" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ink">
                  {node.locked ? "Locked fact" : node.title}
                </span>
                <span className="block text-xs text-muted">
                  {SOURCES[node.source].label}
                </span>
              </span>
              <ArrowRight className="size-4 text-faint" />
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

function VisibilityBadge({ visibility }: { visibility: "PUBLIC" | "PRIVATE" }) {
  return visibility === "PUBLIC" ? (
    <Badge>
      <Globe className="size-3" /> Everyone
    </Badge>
  ) : (
    <Badge>
      <Lock className="size-3" /> Private
    </Badge>
  );
}
