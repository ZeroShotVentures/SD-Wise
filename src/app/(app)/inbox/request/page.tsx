import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RequestMore } from "@/components/graph/ask-result";
import { Page as PageShell } from "@/components/shell/page";
import { requirePerson } from "@/lib/graph/me";
import { question as questionSchema } from "@/lib/graph/schemas";

export const metadata: Metadata = { title: "Request access" };

// Where the "Request access" link from an MCP answer lands. Opening the link
// sends nothing; only the button does, so a link can't make a request on
// someone's behalf.
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ question?: string }>;
}) {
  await requirePerson();
  const parsed = questionSchema.safeParse((await searchParams).question);
  if (!parsed.success) notFound();

  return (
    <PageShell title="Request access" description={`You asked: ${parsed.data}`}>
      <div className="max-w-md bg-white">
        <RequestMore question={parsed.data} />
      </div>
    </PageShell>
  );
}
