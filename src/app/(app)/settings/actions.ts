"use server";

import { refresh } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { createToken, revokeToken } from "@/lib/mcp/tokens";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

export async function revokeSession(sessionId: string) {
  const { session } = await requireSession();
  const target = await prisma.session.findFirst({
    where: { id: sessionId, userId: session.userId },
    select: { token: true },
  });
  if (!target || sessionId === session.id) return;

  await auth.api.revokeSession({
    headers: await headers(),
    body: { token: target.token },
  });
  refresh();
}

export async function revokeOtherSessions() {
  await requireSession();
  await auth.api.revokeOtherSessions({ headers: await headers() });
  refresh();
}

// Returns the plain token, shown once.
export async function createMcpToken(label: string) {
  const { user } = await requireSession();
  const name = z.string().trim().min(1).max(60).parse(label);
  const token = await createToken(user.id, name);
  refresh();
  return token;
}

export async function revokeMcpToken(tokenId: string) {
  const { user } = await requireSession();
  await revokeToken(user.id, tokenId);
  refresh();
}
