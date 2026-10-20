"use client";

import { useState } from "react";
import type { IntegrationStats } from "@/lib/graph/types";
import type { McpClient } from "@/lib/mcp/clients";
import type { ToolSummary } from "@/lib/mcp/tools";
import { Logo } from "./logo";
import { Mcp } from "./mcp";
import { Sources } from "./sources";

export type Tab = "sources" | "mcp";

export function IntegrationsView({
  tab: initialTab,
  integrations,
  canManage,
  mcp,
}: {
  tab: Tab;
  integrations: IntegrationStats[];
  canManage: boolean;
  mcp: { url: string; clients: McpClient[]; tools: ToolSummary[] };
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const connected = integrations.filter((i) => i.connected).length;

  return (
    <div>
      <div
        role="tablist"
        aria-label="Integrations"
        className="mb-6 flex gap-1 rounded-xl bg-white p-1 ring-1 ring-line sm:mb-8 sm:inline-flex"
      >
        {(
          [
            ["sources", "Sources", `${connected}/${integrations.length}`],
            ["mcp", "MCP", mcp.clients.length ? `${mcp.clients.length}` : ""],
          ] as const
        ).map(([key, label, badge]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => {
              setTab(key);
              window.history.replaceState(null, "", `/integrations?tab=${key}`);
            }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors sm:flex-none sm:py-1.5 ${
              tab === key ? "bg-navy text-white" : "text-muted hover:text-navy"
            }`}
          >
            {key === "mcp" && (
              <Logo name="mcp" size="xs" className="size-4 rounded ring-0" />
            )}
            {label}
            {badge && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] leading-none font-semibold tabular-nums ${
                  tab === key
                    ? "bg-white/15 text-white"
                    : "bg-canvas text-muted"
                }`}
              >
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      <div key={tab} className="animate-rise">
        {tab === "sources" ? (
          <Sources integrations={integrations} canManage={canManage} />
        ) : (
          <Mcp {...mcp} />
        )}
      </div>
    </div>
  );
}
