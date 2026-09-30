"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePerson } from "@/lib/graph/me";
import * as graph from "@/lib/graph/service";

const id = z.string().min(1).max(100);
const question = z.string().trim().min(3).max(500);

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
  const data = z
    .object({ recipientId: id, question, nodeIds: z.array(id).max(10) })
    .parse(input);
  await graph.askPerson(me, data.recipientId, data.question, data.nodeIds);
  revalidatePath("/", "layout");
}

export async function requestAccess(input: {
  nodeId: string;
  ownerId: string;
}) {
  const me = await requirePerson();
  const data = z.object({ nodeId: id, ownerId: id }).parse(input);
  await graph.requestAccess(me, data.nodeId, data.ownerId);
  revalidatePath("/", "layout");
}

export async function markSeen(nodeId: string) {
  const me = await requirePerson();
  await graph.markSeen(me, id.parse(nodeId));
}
