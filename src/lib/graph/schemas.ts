import { z } from "zod";

// Input shapes shared by the Server Actions and the MCP tools.
export const id = z.string().min(1).max(100);
export const question = z.string().trim().min(3).max(500);

export const askPersonInput = z.object({
  recipientId: id,
  question,
  nodeIds: z.array(id).max(10),
});

export const requestAccessInput = z.object({ nodeId: id, ownerId: id });
