import type { Metadata } from "next";
import { IntegrationsView } from "@/components/integrations/integrations-view";
import { Page as PageShell } from "@/components/shell/page";
import { mcpResource } from "@/lib/auth";
import { requirePerson } from "@/lib/graph/me";
import { getIntegrations } from "@/lib/graph/service";
import { getMcpClients } from "@/lib/mcp/clients";
import { toolSummaries } from "@/lib/mcp/tools";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Integrations" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requirePerson();
  const { user } = await requireSession();
  const [{ tab }, clients, integrations] = await Promise.all([
    searchParams,
    getMcpClients(user.id),
    getIntegrations(),
  ]);

  return (
    <PageShell
      title="Integrations"
      description="Connect where your company talks and writes, and use SD Wise from your AI tools."
    >
      <IntegrationsView
        tab={tab === "mcp" ? "mcp" : "sources"}
        integrations={integrations}
        mcp={{ url: mcpResource, clients, tools: toolSummaries() }}
      />
    </PageShell>
  );
}
