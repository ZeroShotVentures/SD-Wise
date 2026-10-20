import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

const PREFIX = "sdw_";

export const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export function bearerToken(request: Request) {
  const match = /^Bearer\s+(\S+)$/i.exec(
    request.headers.get("authorization") ?? "",
  );
  return match?.[1] ?? null;
}

// The plain token is returned once; only its hash is stored.
export async function createToken(userId: string, label: string) {
  const token = PREFIX + randomBytes(32).toString("base64url");
  await prisma.mcpToken.create({
    data: {
      userId,
      label,
      tokenHash: hashToken(token),
      prefix: token.slice(0, PREFIX.length + 4),
    },
  });
  return token;
}

export function listTokens(userId: string) {
  return prisma.mcpToken.findMany({
    where: { userId },
    select: {
      id: true,
      label: true,
      prefix: true,
      createdAt: true,
      lastUsedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export function revokeToken(userId: string, tokenId: string) {
  return prisma.mcpToken.deleteMany({ where: { id: tokenId, userId } });
}

// The user behind a token, or null when it is unknown, or the user is banned.
export async function resolveToken(token: string) {
  const row = await prisma.mcpToken.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { id: true, user: { select: { id: true, banned: true } } },
  });
  if (!row || row.user.banned) return null;
  await prisma.mcpToken.update({
    where: { id: row.id },
    data: { lastUsedAt: new Date() },
  });
  return row.user.id;
}
