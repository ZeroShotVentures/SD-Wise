"use client";

import { ArrowRight, Check, Search, ShieldCheck, X } from "lucide-react";
import {
  startTransition,
  useEffect,
  useOptimistic,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { setConnected } from "@/app/(app)/integrations/actions";
import {
  CATEGORIES,
  dateFormat,
  INTEGRATIONS,
  type IntegrationCategory,
  SUITES,
  type Suite,
} from "@/lib/graph/meta";
import type { IntegrationStats } from "@/lib/graph/types";
import { ConnectDialog } from "./connect-dialog";
import { Logo } from "./logo";

type Filter = "All" | "Connected" | IntegrationCategory;
type Connecting = {
  items: [IntegrationStats, ...IntegrationStats[]];
  suite?: Suite;
};
type Toast = { id: number; message: string; undo?: () => void };

const count = new Intl.NumberFormat("en");

const matches = (integration: IntegrationStats, query: string) => {
  const meta = INTEGRATIONS[integration.type];
  const haystack = [
    meta.label,
    meta.description,
    meta.category,
    meta.provider,
    meta.suite && SUITES[meta.suite].label,
  ]
    .join(" ")
    .toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .every((word) => haystack.includes(word));
};

export function Sources({
  integrations,
}: {
  integrations: IntegrationStats[];
}) {
  const [items, setOptimistic] = useOptimistic(
    integrations,
    (state, change: { ids: string[]; connected: boolean }) =>
      state.map((i) =>
        change.ids.includes(i.id) ? { ...i, connected: change.connected } : i,
      ),
  );
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("All");
  const [connecting, setConnecting] = useState<Connecting | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const search = useRef<HTMLInputElement>(null);
  const toastId = useRef(0);

  // "/" jumps to search, like most app directories.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.key !== "/" || target.closest("input, textarea, dialog")) return;
      e.preventDefault();
      search.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  const change = (ids: string[], connected: boolean) =>
    startTransition(async () => {
      setOptimistic({ ids, connected });
      await setConnected({ ids, connected });
    });

  const disconnect = (integration: IntegrationStats) => {
    const { label } = INTEGRATIONS[integration.type];
    change([integration.id], false);
    setToast({
      id: ++toastId.current,
      message: `${label} disconnected. Its facts left the graph.`,
      undo: () => change([integration.id], true),
    });
  };

  const connected = items.filter((i) => i.connected);
  const visible = items.filter(
    (i) =>
      matches(i, query.trim()) &&
      (filter === "All" ||
        (filter === "Connected"
          ? i.connected
          : INTEGRATIONS[i.type].category === filter)),
  );
  const filters: [Filter, number][] = [
    ["All", items.length],
    ["Connected", connected.length],
    ...CATEGORIES.map(
      (c) =>
        [
          c,
          items.filter((i) => INTEGRATIONS[i.type].category === c).length,
        ] as [Filter, number],
    ),
  ];
  // Grouped by category, except search results, which rank as one list.
  const groups = (
    query.trim()
      ? [{ title: null, items: visible }]
      : CATEGORIES.map((c) => ({
          title: c,
          items: visible.filter((i) => INTEGRATIONS[i.type].category === c),
        }))
  ).filter((g) => g.items.length > 0);

  return (
    <div className="flex flex-col gap-8">
      <SuiteHero
        suite="microsoft"
        items={items.filter((i) => INTEGRATIONS[i.type].suite === "microsoft")}
        onConnect={(pick) => {
          const [head, ...rest] = pick;
          if (head)
            setConnecting({ items: [head, ...rest], suite: "microsoft" });
        }}
      />

      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
          <input
            ref={search}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setQuery("");
                e.currentTarget.blur();
              }
            }}
            placeholder={`Search ${items.length} sources`}
            aria-label="Search sources"
            className="w-full rounded-xl bg-white py-2.5 pr-10 pl-10 text-base text-ink ring-1 ring-line transition-shadow outline-none placeholder:text-muted focus:ring-2 focus:ring-brand sm:text-sm"
          />
          {/* No hint on touch screens: there's no "/" key to press. */}
          {!query && (
            <kbd className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 rounded border border-line px-1.5 font-mono text-[11px] text-muted pointer-coarse:hidden">
              /
            </kbd>
          )}
        </div>
        <fieldset className="-mx-4 flex min-w-0 gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:-mx-1 sm:px-1">
          <legend className="sr-only">Filter sources</legend>
          {filters.map(([key, n]) => (
            <button
              key={key}
              type="button"
              aria-pressed={filter === key}
              onClick={() => setFilter(key)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all sm:py-1 ${
                filter === key
                  ? "bg-navy text-white shadow-sm"
                  : "bg-white text-muted ring-1 ring-line hover:text-navy"
              }`}
            >
              {key}
              <span
                className={`text-xs tabular-nums ${
                  filter === key ? "text-white/60" : "text-muted/70"
                }`}
              >
                {n}
              </span>
            </button>
          ))}
        </fieldset>
      </div>

      {groups.length === 0 ? (
        <div className="animate-fade rounded-2xl border border-dashed border-line px-6 py-12 text-center">
          <p className="font-medium text-navy">
            {query.trim()
              ? `Nothing matches "${query.trim()}"`
              : "Nothing connected yet"}
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setFilter("All");
            }}
            className="mt-2 text-sm font-medium text-brand hover:text-brand-dark"
          >
            Show all sources
          </button>
        </div>
      ) : (
        groups.map((group) => (
          <section key={group.title ?? "results"}>
            <div className="flex items-baseline justify-between">
              <h2 className="text-xs font-semibold tracking-wider text-muted uppercase">
                {group.title ?? `${group.items.length} results`}
              </h2>
              {group.title && (
                <span className="text-xs text-muted">
                  {group.items.filter((i) => i.connected).length} of{" "}
                  {group.items.length} connected
                </span>
              )}
            </div>
            <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {group.items.map((integration, i) => (
                <IntegrationCard
                  key={integration.id}
                  integration={integration}
                  index={i}
                  onConnect={() => {
                    const { suite } = INTEGRATIONS[integration.type];
                    setConnecting({ items: [integration], suite });
                  }}
                  onDisconnect={() => disconnect(integration)}
                />
              ))}
            </div>
          </section>
        ))
      )}

      <p className="flex items-start gap-2.5 text-sm text-muted">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand" />
        <span>
          <span className="font-medium text-navy">Private by default.</span>{" "}
          Every fact is owned by the people who were in the conversation, or who
          can open the file. Nobody else sees it unless an owner shares it.
        </span>
      </p>

      {connecting && (
        <ConnectDialog
          items={connecting.items}
          suite={connecting.suite}
          onClose={() => setConnecting(null)}
        />
      )}

      {toast &&
        // A portal, so the animated (transformed) tab can't pin it.
        createPortal(
          <output
            key={toast.id}
            className="animate-rise fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-1/2 z-40 flex w-max max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-3 rounded-xl bg-navy py-2.5 pr-2.5 pl-4 text-sm text-white shadow-2xl sm:gap-4 md:bottom-6"
          >
            {toast.message}
            {toast.undo && (
              <button
                type="button"
                onClick={() => {
                  toast.undo?.();
                  setToast(null);
                }}
                className="rounded-md bg-white/10 px-2.5 py-1 font-medium text-worx-yellow transition-colors hover:bg-white/20"
              >
                Undo
              </button>
            )}
            <button
              type="button"
              onClick={() => setToast(null)}
              className="rounded-md p-1 text-white/60 hover:text-white"
            >
              <X className="size-4" />
              <span className="sr-only">Dismiss</span>
            </button>
          </output>,
          document.body,
        )}
    </div>
  );
}

function SuiteHero({
  suite,
  items,
  onConnect,
}: {
  suite: Suite;
  items: IntegrationStats[];
  onConnect: (items: IntegrationStats[]) => void;
}) {
  const meta = SUITES[suite];
  const remaining = items.filter((i) => !i.connected);
  const done = items.length - remaining.length;
  const facts = items
    .filter((i) => i.connected)
    .reduce((sum, i) => sum + i.facts, 0);
  const apps = [
    ...new Set(
      items.map((i) =>
        INTEGRATIONS[i.type].label
          .replace("Microsoft ", "")
          .replace(" meetings", ""),
      ),
    ),
  ];

  return (
    <section className="@container relative overflow-hidden rounded-3xl bg-white p-5 ring-1 ring-line sm:p-8">
      {/* Microsoft's four colours, blurred into the corner. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-16 size-72 opacity-25 blur-3xl"
      >
        <div className="grid size-full grid-cols-2 gap-2">
          <span className="rounded-full bg-[#f25022]" />
          <span className="rounded-full bg-[#7fba00]" />
          <span className="rounded-full bg-[#00a4ef]" />
          <span className="rounded-full bg-[#ffb900]" />
        </div>
      </div>

      <div className="relative flex flex-col gap-6 @3xl:flex-row @3xl:items-center @3xl:justify-between">
        <div className="flex items-start gap-4">
          <Logo name={meta.logo} size="lg" />
          <div>
            <p className="text-xs font-semibold tracking-wider text-brand uppercase">
              Suite
            </p>
            <h2 className="text-xl font-semibold tracking-tight text-navy">
              {meta.label}
            </h2>
            <p className="mt-1 max-w-lg text-sm text-muted">
              One sign-in for {apps.slice(0, -1).join(", ")} and {apps.at(-1)}.
              SD Wise reads through {meta.api} with your own permissions, and
              never writes anything back.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-4">
          <Ring value={done} total={items.length} />
          {remaining.length > 0 ? (
            <button
              type="button"
              onClick={() => onConnect(remaining)}
              className="group flex flex-1 items-center justify-center gap-2.5 rounded-lg bg-[#2f2f2f] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-black active:scale-[0.98] @3xl:flex-none"
            >
              <Logo name="microsoft" size="xs" className="ring-0" />
              {done === 0
                ? "Connect Microsoft 365"
                : `Connect ${remaining.length} more`}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          ) : (
            <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-700">
              <Check className="size-4" /> All apps connected
            </span>
          )}
        </div>
      </div>

      <ul className="relative mt-6 grid grid-cols-2 gap-2 @lg:grid-cols-3 @5xl:grid-cols-6">
        {items.map((item) => {
          const app = INTEGRATIONS[item.type];
          return (
            <li key={item.id}>
              <button
                type="button"
                disabled={item.connected}
                onClick={() => onConnect([item])}
                title={
                  item.connected
                    ? `${app.label} is connected`
                    : `Connect ${app.label}`
                }
                className="group flex w-full items-center gap-2.5 rounded-xl bg-white/70 p-2 text-left ring-1 ring-line backdrop-blur transition-all enabled:hover:-translate-y-0.5 enabled:hover:shadow-md enabled:hover:ring-brand/30 disabled:cursor-default"
              >
                <span className="relative">
                  <Logo
                    name={app.logo}
                    size="sm"
                    className={
                      item.connected
                        ? ""
                        : "opacity-60 grayscale transition group-hover:opacity-100 group-hover:grayscale-0"
                    }
                  />
                  {item.connected && (
                    <span className="absolute -right-1 -bottom-1 flex size-3.5 items-center justify-center rounded-full bg-emerald-500 text-white ring-2 ring-white">
                      <Check className="size-2.5" strokeWidth={3.5} />
                    </span>
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-medium text-navy">
                    {app.label
                      .replace("Microsoft ", "")
                      .replace("Teams meetings", "Meetings")}
                  </span>
                  <span className="block text-[11px] text-muted">
                    {item.connected ? "Connected" : "Connect"}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {facts > 0 && (
        <p className="relative mt-4 text-xs text-muted">
          {count.format(facts)} facts from {meta.label} so far
        </p>
      )}
    </section>
  );
}

function Ring({ value, total }: { value: number; total: number }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative size-12">
      <span className="sr-only">
        {value} of {total} apps connected
      </span>
      <svg aria-hidden viewBox="0 0 44 44" className="size-full -rotate-90">
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          strokeWidth="4"
          className="stroke-canvas"
        />
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - value / total)}
          className="stroke-emerald-500 transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <span
        aria-hidden
        className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-navy tabular-nums"
      >
        {value}/{total}
      </span>
    </div>
  );
}

function IntegrationCard({
  integration,
  index,
  onConnect,
  onDisconnect,
}: {
  integration: IntegrationStats;
  index: number;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  const meta = INTEGRATIONS[integration.type];

  return (
    <article
      className="animate-rise group flex flex-col rounded-2xl bg-white p-5 ring-1 ring-line transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-navy/5"
      style={{ animationDelay: `${Math.min(index, 8) * 30}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <Logo name={meta.logo} />
        {integration.connected ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60 [animation-iteration-count:2]" />
              <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
            </span>
            Connected
          </span>
        ) : (
          meta.suite && (
            <span className="text-[11px] font-medium text-muted">
              {SUITES[meta.suite].label}
            </span>
          )
        )}
      </div>
      <h3 className="mt-4 font-semibold text-navy">{meta.label}</h3>
      <p className="mt-1 flex-1 text-sm text-muted">{meta.description}</p>
      {meta.includes && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-muted">
          <span className="flex -space-x-1">
            {meta.includes.map((logo) => (
              <Logo
                key={logo}
                name={logo}
                size="xs"
                className="ring-2 ring-white"
              />
            ))}
          </span>
          Word, Excel and PowerPoint
        </div>
      )}

      {integration.connected ? (
        <div className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-3">
          <p className="min-w-0 text-xs text-muted">
            {integration.facts > 0 ? (
              <>
                <span className="font-medium text-navy tabular-nums">
                  {count.format(integration.facts)}
                </span>{" "}
                facts ·{" "}
                <span className="tabular-nums">
                  {count.format(integration.people)}
                </span>{" "}
                people
              </>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <span className="size-1.5 animate-pulse rounded-full bg-brand" />
                Indexing
              </span>
            )}
            {integration.connectedAt && (
              <span className="block">
                since {dateFormat.format(new Date(integration.connectedAt))}
              </span>
            )}
          </p>
          <button
            type="button"
            onClick={onDisconnect}
            className="shrink-0 rounded-lg px-3 py-2 text-xs font-medium text-muted transition-colors hover:bg-red-50 hover:text-worx-red"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onConnect}
          className="mt-4 flex items-center justify-center gap-1.5 rounded-lg bg-brand-soft px-3 py-2.5 text-sm font-medium sm:py-2 text-brand transition-colors hover:bg-brand hover:text-white"
        >
          Connect
          <ArrowRight className="size-3.5 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
        </button>
      )}
    </article>
  );
}
