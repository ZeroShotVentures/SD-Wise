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

  const renderLink = ({ href, label, icon: Icon, badge }: NavItem) => {
    const active = pathname.startsWith(href);
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          active
            ? "bg-white/10 text-white"
            : "text-white/60 hover:bg-white/5 hover:text-white"
        }`}
      >
        <Icon
          className={`size-4 ${active ? "text-worx-yellow" : ""}`}
          strokeWidth={2}
        />
        <span className="flex-1">{label}</span>
        {badge > 0 && (
          <span className="rounded-full bg-worx-red px-1.5 py-0.5 text-[10px] leading-none font-semibold text-white">
            {badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <aside className="hidden w-60 shrink-0 flex-col bg-navy px-3 py-5 md:flex">
      <Link href="/graph" className="px-3">
        <Brand />
      </Link>
      <nav className="mt-8 flex flex-col gap-1">{main.map(renderLink)}</nav>
      <nav className="mt-6 flex flex-col gap-1 border-t border-white/10 pt-6">
        {secondary.map(renderLink)}
      </nav>
      <div className="mt-auto flex items-center gap-3 rounded-xl bg-white/5 p-3">
        {person && <Avatar id={person.id} name={person.name} />}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">
            {person?.name ?? data?.user.name}
          </p>
          <p className="truncate text-xs text-white/50">{person?.role}</p>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          title="Sign out"
          className="rounded-md p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
        >
          <LogOut className="size-4" />
          <span className="sr-only">Sign out</span>
        </button>
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
      className="flex shrink-0 bg-navy px-1 pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {[...main, ...secondary].map(({ href, label, icon: Icon, badge }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
              active ? "text-white" : "text-white/55 active:text-white"
            }`}
          >
            <span className="relative">
              <Icon
                className={`size-5 ${active ? "text-worx-yellow" : ""}`}
                strokeWidth={2}
              />
              {badge > 0 && (
                <span className="absolute -top-1.5 left-3 rounded-full bg-worx-red px-1.5 py-0.5 text-[10px] leading-none font-semibold text-white ring-2 ring-navy">
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
