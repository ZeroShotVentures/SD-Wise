import type { Metadata } from "next";
import { TeamsView } from "@/components/teams/teams-view";
import { requirePerson } from "@/lib/graph/me";
import { getInbox } from "@/lib/graph/service";

export const metadata: Metadata = { title: "Teams" };

async function loadInbox() {
  const me = await requirePerson();
  const { received, sent } = await getInbox(me);
  // One clock for server and client, so relative times hydrate identically.
  return { me, received, sent, now: Date.now() };
}

export default async function Page() {
  const { me, received, sent, now } = await loadInbox();
  return <TeamsView me={me} received={received} sent={sent} now={now} />;
}
