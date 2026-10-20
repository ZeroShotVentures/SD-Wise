import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AskOwners } from "@/components/graph/ask-result";
import { Page as PageShell } from "@/components/shell/page";
import { requirePerson } from "@/lib/graph/me";
import { question as questionSchema } from "@/lib/graph/schemas";

export const metadata: Metadata = { title: "Ask a colleague" };

// Where the "Ask a colleague" link from an MCP answer lands when colleagues
// know more. Opening the link sends nothing; only the button does, so a link
// can't ask on someone's behalf.
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ question?: string }>;
}) {
  await requirePerson();
  const parsed = questionSchema.safeParse((await searchParams).question);
  if (!parsed.success) notFound();

  return (
    <PageShell
      title="Ask a colleague"
      description={`You asked: ${parsed.data}`}
    >
      <div className="max-w-md bg-white">
        <AskOwners question={parsed.data} />
      </div>
    </PageShell>
  );
}
