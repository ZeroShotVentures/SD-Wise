import type { Metadata } from "next";
import { InboxView } from "@/components/inbox/inbox-view";
import { Page as PageShell } from "@/components/shell/page";
import { requirePerson } from "@/lib/graph/me";
import { getInbox } from "@/lib/graph/service";

export const metadata: Metadata = { title: "Inbox" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const me = await requirePerson();
  const { tab } = await searchParams;
  const inbox = getInbox(me);

  return (
    <PageShell
      title="Inbox"
      description="Questions colleagues think you can answer, and the ones you asked."
    >
      <InboxView
        received={inbox.received}
        sent={inbox.sent}
        tab={tab === "sent" ? "sent" : "received"}
      />
    </PageShell>
  );
}
