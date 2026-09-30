"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePerson } from "@/lib/graph/me";
import * as graph from "@/lib/graph/service";

const id = z.string().min(1).max(100);

export async function sendAnswer(input: {
  queryId: string;
  answer: string;
  scope: "ASKER" | "PUBLIC";
}) {
  const me = await requirePerson();
  const data = z
    .object({
      queryId: id,
      answer: z.string().trim().min(1).max(2000),
      scope: z.enum(["ASKER", "PUBLIC"]),
    })
    .parse(input);
  await graph.answerQuery(me, data.queryId, data.answer, data.scope);
  revalidatePath("/", "layout");
}

export async function approveAccess(queryId: string) {
  const me = await requirePerson();
  await graph.approveAccess(me, id.parse(queryId));
  revalidatePath("/", "layout");
}

export async function decline(queryId: string) {
  const me = await requirePerson();
  await graph.declineQuery(me, id.parse(queryId));
  revalidatePath("/", "layout");
}
