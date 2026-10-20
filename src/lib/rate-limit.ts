import "server-only";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";

// Fixed window per key, counted in the table better-auth rate limits with.
// Keys are prefixed with "app:" so they never collide with better-auth's.
// One upsert, so concurrent requests can't both slip under the limit.
export async function rateLimit(key: string, max: number, windowMs: number) {
  const now = BigInt(Date.now());
  const windowStart = now - BigInt(windowMs);
  const [row] = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO "rateLimit" ("id", "key", "count", "lastRequest")
    VALUES (${randomUUID()}, ${`app:${key}`}, 1, ${now})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "rateLimit"."lastRequest" < ${windowStart}
        THEN 1 ELSE "rateLimit"."count" + 1 END,
      "lastRequest" = CASE WHEN "rateLimit"."lastRequest" < ${windowStart}
        THEN ${now} ELSE "rateLimit"."lastRequest" END
    RETURNING "count"`;
  if (!row || row.count > max) {
    throw new Error("Too many requests. Try again in a minute.");
  }
}
