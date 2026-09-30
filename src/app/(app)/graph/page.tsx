import type { Metadata } from "next";
import { GraphExplorer } from "@/components/graph/graph-explorer";
import { requirePerson } from "@/lib/graph/me";
import { getGraph } from "@/lib/graph/service";

export const metadata: Metadata = { title: "Graph" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ node?: string }>;
}) {
  const me = await requirePerson();
  const { node } = await searchParams;
  return <GraphExplorer view={await getGraph(me)} focusId={node ?? null} />;
}
