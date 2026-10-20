"use server";

import { revalidatePath } from "next/cache";
import { requirePerson } from "@/lib/graph/me";
import {
  askOwnersInput,
  askPersonInput,
  id,
  question,
} from "@/lib/graph/schemas";
import * as graph from "@/lib/graph/service";

export async function askGraph(input: string) {
  const me = await requirePerson();
  return graph.ask(me, question.parse(input));
}

export async function askPerson(input: {
  recipientId: string;
  question: string;
  nodeIds: string[];
}) {
  const me = await requirePerson();
  const data = askPersonInput.parse(input);
  const created = await graph.askPerson(
    me,
    data.recipientId,
    data.question,
    data.nodeIds,
  );
  revalidatePath("/", "layout");
  return created.id;
}

export async function colleagues() {
  const me = await requirePerson();
  return graph.colleagues(me);
}

export async function askOwners(input: { question: string }) {
  const me = await requirePerson();
  const data = askOwnersInput.parse(input);
  await graph.askOwners(me, data.question);
  revalidatePath("/", "layout");
}

export async function markSeen(nodeId: string) {
  const me = await requirePerson();
  await graph.markSeen(me, id.parse(nodeId));
}
