"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePerson } from "@/lib/graph/me";
import * as graph from "@/lib/graph/service";

// Mocked: no OAuth, connecting just flips the flag. Facts from a disconnected
// source drop out of the graph and search.
export async function setConnected(input: { id: string; connected: boolean }) {
  await requirePerson();
  const data = z
    .object({ id: z.string().min(1).max(100), connected: z.boolean() })
    .parse(input);
  graph.setConnected(data.id, data.connected);
  revalidatePath("/", "layout");
}
