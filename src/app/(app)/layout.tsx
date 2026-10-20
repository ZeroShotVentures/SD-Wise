import { ImpersonationBanner } from "@/components/shell/impersonation-banner";
import { Sidebar, TabBar } from "@/components/shell/sidebar";
import { pendingCount, personFor } from "@/lib/graph/service";
import { getSession } from "@/lib/session";

// Not an auth check: layouts don't re-render on navigation, so each page
// still calls requireSession(). This only feeds the navigation.
export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  const person = session ? await personFor(session.user.id) : null;
  const pending = person ? await pendingCount(person) : 0;

  // dvh, not vh: mobile browsers shrink the viewport as their toolbars show.
  return (
    <div className="flex h-dvh overflow-hidden bg-canvas">
      <Sidebar person={person} pending={pending} />
      <div className="flex min-w-0 flex-1 flex-col">
        <ImpersonationBanner />
        <main className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {children}
        </main>
        <TabBar pending={pending} />
      </div>
    </div>
  );
}
