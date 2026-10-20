"use client";

import {
  Inbox,
  LogOut,
  Network,
  Plug,
  Settings,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { admin, signOut, useSession } from "@/lib/auth-client";
import type { Person } from "@/lib/graph/types";
import { Avatar } from "./avatar";
import { Brand } from "./brand";

type NavItem = {
  href: string;
  label: string;
  icon: typeof Network;
  badge: number;
};

// One list for both navs, so phones and desktops reach the same places.
function useNav(pending: number) {
  const { data } = useSession();
  const showAdmin =
    !!data &&
    admin.checkRolePermission({
      role: (data.user.role ?? "user") as "admin" | "user",
      permissions: { user: ["list"] },
    });

  const main: NavItem[] = [
    { href: "/graph", label: "Graph", icon: Network, badge: 0 },
    { href: "/inbox", label: "Inbox", icon: Inbox, badge: pending },
    { href: "/integrations", label: "Integrations", icon: Plug, badge: 0 },
  ];
  const secondary: NavItem[] = [
    { href: "/settings", label: "Settings", icon: Settings, badge: 0 },
    ...(showAdmin
      ? [{ href: "/admin", label: "Admin", icon: ShieldCheck, badge: 0 }]
      : []),
  ];
  return { main, secondary };
}

export function useSignOut() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      router.replace("/sign-in");
      router.refresh();
    } catch {
      setSigningOut(false);
    }
  };

  return { signingOut, handleSignOut };
}

type SidebarProps = {
  person: Person | null;
  pending: number;
};

export function Sidebar({ person, pending }: SidebarProps) {
  const pathname = usePathname();
  const { data } = useSession();
  const { main, secondary } = useNav(pending);
  const { signingOut, handleSignOut } = useSignOut();
  const name = person?.name ?? data?.user.name ?? "";

  const renderLink = ({ href, label, icon: Icon, badge }: NavItem) => {
    const active = pathname.startsWith(href);
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        className={`group flex h-8 items-center gap-2.5 rounded-md px-2.5 text-sm font-medium transition-colors ${
          active
            ? "bg-subtle text-ink"
            : "text-muted hover:bg-subtle/70 hover:text-ink"
        }`}
      >
        <Icon
          className={`size-4 shrink-0 ${active ? "text-brand" : "text-faint group-hover:text-muted"}`}
          strokeWidth={1.75}
        />
        <span className="flex-1">{label}</span>
        {badge > 0 && (
          <span className="min-w-5 rounded-full bg-brand px-1.5 py-px text-center text-[11px] leading-4 font-semibold text-white tabular-nums">
            {badge}
            <span className="sr-only"> waiting</span>
          </span>
        )}
      </Link>
    );
  };

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-white md:flex">
      <div className="flex h-14 items-center border-b border-line px-5">
        <Link href="/graph" aria-label="SD Wise home">
          <Brand />
        </Link>
      </div>
      <nav aria-label="Main" className="flex flex-col gap-0.5 px-3 pt-4">
        <p className="px-2.5 pb-1.5 text-[11px] font-semibold tracking-wider text-faint uppercase">
          Workspace
        </p>
        {main.map(renderLink)}
      </nav>
      <nav aria-label="Account" className="flex flex-col gap-0.5 px-3 pt-6">
        <p className="px-2.5 pb-1.5 text-[11px] font-semibold tracking-wider text-faint uppercase">
          Account
        </p>
        {secondary.map(renderLink)}
      </nav>
      <div className="mt-auto border-t border-line p-3">
        <div className="flex items-center gap-2.5 rounded-md px-1.5 py-1">
          {person && <Avatar id={person.id} name={person.name} />}
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-medium text-ink">{name}</p>
            <p className="truncate text-xs text-muted">
              {person?.role ?? data?.user.email}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            title="Sign out"
            className="rounded-md p-1.5 text-faint transition-colors hover:bg-subtle hover:text-ink disabled:opacity-50"
          >
            <LogOut className="size-4" />
            <span className="sr-only">Sign out</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

// Phones get a bottom tab bar instead of the sidebar: every destination
// stays one tap away, within reach of the thumb.
export function TabBar({ pending }: { pending: number }) {
  const pathname = usePathname();
  const { main, secondary } = useNav(pending);

  return (
    <nav
      aria-label="Main"
      className="flex shrink-0 border-t border-line bg-white px-1 pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {[...main, ...secondary].map(({ href, label, icon: Icon, badge }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
              active ? "text-brand" : "text-muted active:text-ink"
            }`}
          >
            <span className="relative">
              <Icon className="size-5" strokeWidth={active ? 2 : 1.75} />
              {badge > 0 && (
                <span className="absolute -top-1.5 left-3 rounded-full bg-brand px-1.5 py-0.5 text-[10px] leading-none font-semibold text-white ring-2 ring-white">
                  {badge}
                  <span className="sr-only"> waiting</span>
                </span>
              )}
            </span>
            <span className="max-w-full truncate px-0.5">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
