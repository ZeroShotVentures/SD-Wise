"use server";

import { requirePerson } from "@/lib/graph/me";
import { question } from "@/lib/graph/schemas";
import * as graph from "@/lib/graph/service";

export async function askWise(input: string) {
  const me = await requirePerson();
  const result = await graph.ask(me, question.parse(input));
  const facts = result.answer
    ? await graph.factsFor(me, result.answer.nodeIds)
    : [];
  return { ...result, facts };
}
