"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import * as graph from "@/lib/graph/service";
import { disconnectMcpClient } from "@/lib/mcp/clients";
import { requireAdmin, requireSession } from "@/lib/session";

const id = z.string().min(1).max(100);

// Mocked: no OAuth, connecting just flips the flags in the database. Facts
// from a disconnected source drop out of the graph and search, for everyone,
// so only admins can do it.
export async function setConnected(input: {
  ids: string[];
  connected: boolean;
}) {
  await requireAdmin();
  const data = z
    .object({ ids: z.array(id).min(1).max(20), connected: z.boolean() })
    .parse(input);
  await graph.setConnected(data.ids, data.connected);
  revalidatePath("/", "layout");
}

// Real: revokes what the user granted an MCP client.
export async function disconnectClient(clientId: string) {
  const { user } = await requireSession();
  await disconnectMcpClient(
    user.id,
    z.string().min(1).max(2048).parse(clientId),
  );
  revalidatePath("/integrations");
}
