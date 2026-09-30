import type { Metadata } from "next";
import { IntegrationGrid } from "@/components/integrations/integration-grid";
import { Page as PageShell } from "@/components/shell/page";
import { requirePerson } from "@/lib/graph/me";
import { getIntegrations } from "@/lib/graph/service";

export const metadata: Metadata = { title: "Integrations" };

export default async function Page() {
  await requirePerson();

  return (
    <PageShell
      title="Integrations"
      description="Connect the places where your company talks. SD Wise extracts facts, and only the people in the conversation can see them."
    >
      <IntegrationGrid integrations={getIntegrations()} />
    </PageShell>
  );
}
