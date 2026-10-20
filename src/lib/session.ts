import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "./auth";
import { prisma } from "./prisma";

// An impersonation session is only as good as the admin who started it: once
// they're deleted, banned or no longer an admin, it ends, whatever its expiry.
async function impersonatorRevoked(adminId: string) {
  const admin = await prisma.user.findUnique({
    where: { id: adminId },
    select: { id: true, role: true, banned: true, banExpires: true },
  });
  if (!admin) return true;
  if (admin.banned && (!admin.banExpires || admin.banExpires > new Date())) {
    return true;
  }
  return !(await isAdmin(admin));
}

// The session for these request headers, ending it first if it impersonates
// for an admin who's been revoked. The auth route calls this too, so a stale
// impersonation can't use Better Auth's own endpoints either.
export async function verifiedSession(requestHeaders: Headers) {
  const session = await auth.api.getSession({ headers: requestHeaders });
  const adminId = session?.session.impersonatedBy;
  if (session && adminId && (await impersonatorRevoked(adminId))) {
    await auth.api.revokeSession({
      body: { token: session.session.token },
      headers: requestHeaders,
    });
    return null;
  }
  return session;
}

export const getSession = cache(async () => verifiedSession(await headers()));

// Call in every page, Server Action and Route Handler that needs a user. The
// proxy only does an optimistic cookie check and is not a security boundary.
export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  return session;
}

export async function isAdmin(user: { id: string; role?: string | null }) {
  const { success } = await auth.api.userHasPermission({
    body: {
      userId: user.id,
      role: (user.role ?? undefined) as "admin" | "user" | undefined,
      permissions: { user: ["list"] },
    },
  });
  return success;
}

// Same contract as requireSession(), for /admin. Non-admins get a 404 so the
// portal's existence isn't revealed. Better Auth re-checks permissions on every
// admin endpoint, so this guards pages, not data.
export async function requireAdmin() {
  const session = await requireSession();
  if (!(await isAdmin(session.user))) notFound();
  return session;
}
