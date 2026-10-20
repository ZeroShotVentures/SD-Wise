import { APIError } from "better-auth/api";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BanForm } from "@/components/admin/ban-form";
import { ImpersonateButton } from "@/components/admin/impersonate-button";
import { RemoveUser } from "@/components/admin/remove-user";
import { SetPasswordForm } from "@/components/admin/set-password-form";
import { UserBadges } from "@/components/admin/user-badges";
import { Section } from "@/components/settings/section";
import { Page as PageShell } from "@/components/shell/page";
import { Badge } from "@/components/ui/badge";
import { secondaryButtonClass } from "@/components/ui/styles";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin, requireAdmin } from "@/lib/session";
import { describeUserAgent } from "@/lib/user-agent";
import { revokeUserSession, revokeUserSessions } from "./actions";

export const metadata: Metadata = { title: "User · Admin" };

const dateFormat = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

const providerLabels: Record<string, string> = {
  credential: "Password",
};

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user: currentUser } = await requireAdmin();
  const { id } = await params;
  const requestHeaders = await headers();

  const target = await auth.api
    .getUser({ headers: requestHeaders, query: { id } })
    .catch((error) => {
      if (error instanceof APIError && error.status === "NOT_FOUND")
        return null;
      throw error;
    });
  if (!target) notFound();

  const [{ sessions }, accounts] = await Promise.all([
    auth.api.listUserSessions({
      headers: requestHeaders,
      body: { userId: id },
    }),
    prisma.account.findMany({
      where: { userId: id },
      select: { providerId: true },
    }),
  ]);
  const isSelf = target.id === currentUser.id;
  const targetIsAdmin = await isAdmin(target);
  const activeSessions = sessions
    .filter((s) => new Date(s.expiresAt) > new Date())
    .toSorted((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  const methods = accounts.map(
    (a) => providerLabels[a.providerId] ?? a.providerId,
  );

  return (
    <PageShell
      back={{ href: "/admin", label: "All users" }}
      width="narrow"
      title={
        <span className="flex flex-wrap items-center gap-3 wrap-anywhere">
          {target.name || target.email}
          <UserBadges user={target} />
        </span>
      }
      description={
        <span className="wrap-anywhere">
          {[
            target.email,
            `joined ${dateFormat.format(new Date(target.createdAt))} UTC`,
            methods.length > 0 && `signs in with ${methods.join(", ")}`,
          ]
            .filter(Boolean)
            .join(" · ")}
          <span className="mt-1 block font-mono text-xs break-all text-faint">
            {target.id}
          </span>
        </span>
      }
    >
      <div className="flex flex-col gap-6 md:gap-8">
        {isSelf ? (
          <Section title="This is you">
            <p className="text-sm text-muted">
              Admin actions are disabled on your own account. Manage it in{" "}
              <Link
                href="/settings"
                className="font-medium text-brand hover:text-brand-dark"
              >
                Settings
              </Link>
              .
            </p>
          </Section>
        ) : (
          <>
            <Section
              title="Impersonate"
              description="Sign in as this user to see what they see. The session ends after an hour or when you stop impersonating, and is hidden from the user's session list."
            >
              {targetIsAdmin ? (
                <p className="text-sm text-muted">
                  Admins can&apos;t be impersonated.
                </p>
              ) : (
                <ImpersonateButton userId={target.id} />
              )}
            </Section>

            <Section
              title={target.banned ? "Banned" : "Ban"}
              description={
                target.banned
                  ? [
                      `Reason: ${target.banReason || "none given"}.`,
                      target.banExpires
                        ? `Expires ${dateFormat.format(new Date(target.banExpires))} UTC.`
                        : "Never expires.",
                    ].join(" ")
                  : "Banned users are signed out everywhere and can't sign in until the ban is lifted or expires."
              }
            >
              <BanForm userId={target.id} banned={!!target.banned} />
            </Section>

            <Section
              title="Sessions"
              description="Devices currently signed in to this account."
            >
              {activeSessions.length === 0 ? (
                <p className="text-sm text-muted">No active sessions.</p>
              ) : (
                <>
                  <ul className="-my-3 divide-y divide-line">
                    {activeSessions.map((s) => (
                      <li
                        key={s.id}
                        className="flex items-center justify-between gap-4 py-3 text-sm"
                      >
                        <div className="min-w-0 wrap-anywhere">
                          <p className="flex flex-wrap items-center gap-2 font-medium text-ink">
                            {describeUserAgent(s.userAgent ?? null)}
                            {s.impersonatedBy && (
                              <Badge tone="warning">Impersonation</Badge>
                            )}
                          </p>
                          <p className="text-muted">
                            {[
                              s.ipAddress,
                              `signed in ${dateFormat.format(new Date(s.createdAt))} UTC`,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </div>
                        <form
                          action={revokeUserSession.bind(null, target.id, s.id)}
                        >
                          <button
                            type="submit"
                            className={secondaryButtonClass}
                          >
                            Revoke
                          </button>
                        </form>
                      </li>
                    ))}
                  </ul>
                  <form
                    action={revokeUserSessions.bind(null, target.id)}
                    className="mt-4 border-t border-line pt-4"
                  >
                    <button type="submit" className={secondaryButtonClass}>
                      Sign out everywhere
                    </button>
                  </form>
                </>
              )}
            </Section>

            <Section
              title="Password"
              description={
                methods.includes("Password")
                  ? "Replace this user's password. Their existing sessions stay signed in."
                  : "This user has no password yet. Setting one lets them sign in with email and password."
              }
            >
              <SetPasswordForm userId={target.id} />
            </Section>

            <Section
              title="Delete user"
              tone="danger"
              description="Permanently delete this user and all of their data. This can't be undone."
            >
              <RemoveUser userId={target.id} email={target.email} />
            </Section>
          </>
        )}
      </div>
    </PageShell>
  );
}
