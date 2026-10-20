"use client";

import { useState } from "react";
import { Tabs } from "@/components/ui/tabs";
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
  mcp,
}: {
  tab: Tab;
  integrations: IntegrationStats[];
  mcp: { url: string; clients: McpClient[]; tools: ToolSummary[] };
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const connected = integrations.filter((i) => i.connected).length;

  return (
    <div>
      <Tabs
        label="Integrations"
        value={tab}
        onChange={setTab}
        items={[
          {
            key: "sources",
            label: "Sources",
            count: `${connected}/${integrations.length}`,
          },
          {
            key: "mcp",
            label: "MCP server",
            count: mcp.clients.length || "",
            icon: (
              <Logo name="mcp" size="xs" className="size-4 rounded ring-0" />
            ),
          },
        ]}
      />

      <div key={tab} className="animate-fade mt-6 sm:mt-8">
        {tab === "sources" ? (
          <Sources integrations={integrations} />
        ) : (
          <Mcp {...mcp} />
        )}
      </div>
    </div>
  );
}
