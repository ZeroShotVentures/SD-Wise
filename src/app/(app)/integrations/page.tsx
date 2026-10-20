import type { Metadata } from "next";
import { IntegrationsView } from "@/components/integrations/integrations-view";
import { Page as PageShell } from "@/components/shell/page";
import { mcpResource } from "@/lib/auth";
import { requirePerson } from "@/lib/graph/me";
import { getIntegrations } from "@/lib/graph/service";
import { getMcpClients } from "@/lib/mcp/clients";
import { toolSummaries } from "@/lib/mcp/tools";
import { isAdmin, requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Integrations" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const me = await requirePerson();
  const { user } = await requireSession();
  const [{ tab }, clients, integrations, canManage] = await Promise.all([
    searchParams,
    getMcpClients(user.id),
    getIntegrations(me),
    isAdmin(user),
  ]);

  return (
    <PageShell
      title="Integrations"
      description="Connect the places where your company talks and writes, and bring SD Wise into the AI tools you already use."
    >
      <IntegrationsView
        tab={tab === "mcp" ? "mcp" : "sources"}
        integrations={integrations}
        canManage={canManage}
        mcp={{ url: mcpResource, clients, tools: toolSummaries() }}
      />
    </PageShell>
  );
}
