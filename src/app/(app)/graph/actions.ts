"use server";

import { revalidatePath } from "next/cache";
import { requirePerson } from "@/lib/graph/me";
import {
  askPersonInput,
  id,
  question,
  requestAccessInput,
  requestMoreInput,
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
  await graph.askPerson(me, data.recipientId, data.question, data.nodeIds);
  revalidatePath("/", "layout");
}

export async function requestAccess(input: {
  nodeId: string;
  ownerId: string;
}) {
  const me = await requirePerson();
  const data = requestAccessInput.parse(input);
  await graph.requestAccess(me, data.nodeId, data.ownerId);
  revalidatePath("/", "layout");
}

export async function requestMore(input: { question: string }) {
  const me = await requirePerson();
  const data = requestMoreInput.parse(input);
  await graph.requestMore(me, data.question);
  revalidatePath("/", "layout");
}

export async function markSeen(nodeId: string) {
  const me = await requirePerson();
  await graph.markSeen(me, id.parse(nodeId));
}
