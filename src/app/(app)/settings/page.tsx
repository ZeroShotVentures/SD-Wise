import type { Metadata } from "next";
import Link from "next/link";
import { DeleteAccount } from "@/components/settings/delete-account";
import { PasswordForm } from "@/components/settings/password-form";
import { ProfileForm } from "@/components/settings/profile-form";
import { Section } from "@/components/settings/section";
import { SignOut } from "@/components/settings/sign-out";
import { Page as PageShell } from "@/components/shell/page";
import { Badge } from "@/components/ui/badge";
import { secondaryButtonClass } from "@/components/ui/styles";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { describeUserAgent } from "@/lib/user-agent";
import { revokeOtherSessions, revokeSession } from "./actions";

export const metadata: Metadata = { title: "Settings" };

const dateFormat = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

export default async function Page() {
  const { user, session } = await requireSession();

  const [accounts, sessions] = await Promise.all([
    prisma.account.findMany({
      where: { userId: user.id },
      select: { providerId: true },
    }),
    prisma.session.findMany({
      where: {
        userId: user.id,
        expiresAt: { gt: new Date() },
        impersonatedBy: null,
      },
      select: { id: true, userAgent: true, ipAddress: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const hasPassword = accounts.some((a) => a.providerId === "credential");
  const otherSessions = sessions.filter((s) => s.id !== session.id);

  return (
    <PageShell
      title="Settings"
      description="Manage your profile, security and account."
      width="narrow"
    >
      <div className="flex flex-col gap-6 md:gap-8">
        <Section title="Profile" description={`Your email is ${user.email}.`}>
          <ProfileForm name={user.name} />
        </Section>

        {hasPassword && (
          <Section
            title="Password"
            description="Changing your password signs out all other devices."
          >
            <PasswordForm />
          </Section>
        )}

        <Section
          title="Sessions"
          description="Devices that are currently signed in to your account."
        >
          <ul className="-my-3 divide-y divide-line">
            {sessions.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-4 py-3 text-sm"
              >
                <div className="min-w-0 wrap-anywhere">
                  <p className="flex flex-wrap items-center gap-2 font-medium text-ink">
                    {describeUserAgent(s.userAgent)}
                    {s.id === session.id && (
                      <Badge tone="success" dot>
                        This device
                      </Badge>
                    )}
                  </p>
                  <p className="text-muted">
                    {[
                      s.ipAddress,
                      `signed in ${dateFormat.format(s.createdAt)} UTC`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                {s.id !== session.id && (
                  <form action={revokeSession.bind(null, s.id)}>
                    <button type="submit" className={secondaryButtonClass}>
                      Revoke
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
          {otherSessions.length > 0 && (
            <form
              action={revokeOtherSessions}
              className="mt-4 border-t border-line pt-4"
            >
              <button type="submit" className={secondaryButtonClass}>
                Sign out all other devices
              </button>
            </form>
          )}
        </Section>

        <Section
          title="Connect your AI"
          description="Use SD Wise from Claude, ChatGPT, Copilot, Cursor or VS Code over MCP. Your client signs you in here, and it only sees what you can see."
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">
              Setup guides and the clients you allowed live under Integrations.
            </p>
            <Link href="/integrations?tab=mcp" className={secondaryButtonClass}>
              Manage AI clients
            </Link>
          </div>
        </Section>

        {/* The sidebar holds sign out on wider screens. */}
        <div className="md:hidden">
          <Section title="Account" description={`Signed in as ${user.email}.`}>
            <SignOut />
          </Section>
        </div>

        <Section
          title="Delete account"
          tone="danger"
          description="Permanently delete your account and all of its data. This can't be undone."
        >
          <DeleteAccount hasPassword={hasPassword} />
        </Section>
      </div>
    </PageShell>
  );
}
