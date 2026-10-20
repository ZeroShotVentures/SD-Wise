import "server-only";
import { prisma } from "@/lib/prisma";

export type McpClient = {
  clientId: string;
  name: string;
  uri: string | null;
  scopes: string[];
  connectedAt: string;
  // The last time the client was issued a token: signing in or refreshing.
  lastActiveAt: string | null;
};

// MCP clients (Claude, Cursor, ...) the user allowed to act as them, from the
// OAuth consents Better Auth stores when they click Allow.
export async function getMcpClients(userId: string): Promise<McpClient[]> {
  // The newest token of each kind per client.
  const latest = {
    where: { userId },
    distinct: "clientId",
    select: { clientId: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  } as const;
  const [consents, refreshed, issued] = await Promise.all([
    prisma.oauthConsent.findMany({
      where: { userId },
      include: { oauthclient: { select: { name: true, uri: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.oauthRefreshToken.findMany(latest),
    prisma.oauthAccessToken.findMany(latest),
  ]);

  const lastActive = new Map<string, Date>();
  for (const token of [...refreshed, ...issued]) {
    const seen = lastActive.get(token.clientId);
    if (!seen || token.createdAt > seen) {
      lastActive.set(token.clientId, token.createdAt);
    }
  }

  const byClient = new Map<string, McpClient>();
  for (const consent of consents) {
    if (byClient.has(consent.clientId)) continue;
    byClient.set(consent.clientId, {
      clientId: consent.clientId,
      name: consent.oauthclient.name ?? "MCP client",
      uri: consent.oauthclient.uri,
      scopes: consent.scopes,
      connectedAt: consent.createdAt.toISOString(),
      lastActiveAt: lastActive.get(consent.clientId)?.toISOString() ?? null,
    });
  }
  return [...byClient.values()];
}

// Forgets the consent and revokes the client's refresh tokens, so it has to
// ask again. Access tokens are self-contained JWTs: one already issued keeps
// working until it expires, at most an hour.
export async function disconnectMcpClient(userId: string, clientId: string) {
  const where = { userId, clientId };
  const revoked = new Date();
  await prisma.$transaction([
    prisma.oauthConsent.deleteMany({ where }),
    prisma.oauthRefreshToken.updateMany({
      where: { ...where, revoked: null },
      data: { revoked },
    }),
    prisma.oauthAccessToken.updateMany({
      where: { ...where, revoked: null },
      data: { revoked },
    }),
  ]);
}
