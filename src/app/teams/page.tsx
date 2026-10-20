import type { Metadata } from "next";
import { TeamsView } from "@/components/teams/teams-view";
import { requirePerson } from "@/lib/graph/me";
import { getInbox } from "@/lib/graph/service";

export const metadata: Metadata = { title: "Teams" };

async function loadInbox() {
  const me = await requirePerson();
  const { received } = await getInbox(me);
  // One clock for server and client, so relative times hydrate identically.
  return { me, received, now: Date.now() };
}

export default async function Page() {
  const { me, received, now } = await loadInbox();
  return <TeamsView me={me} inbox={received} now={now} />;
}
