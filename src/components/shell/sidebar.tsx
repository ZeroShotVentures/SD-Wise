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

type SidebarProps = {
  person: Person | null;
  pending: number;
};

export function Sidebar({ person, pending }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data } = useSession();
  const [signingOut, setSigningOut] = useState(false);

  const showAdmin =
    !!data &&
    admin.checkRolePermission({
      role: (data.user.role ?? "user") as "admin" | "user",
      permissions: { user: ["list"] },
    });

  const main = [
    { href: "/graph", label: "Graph", icon: Network, badge: 0 },
    { href: "/inbox", label: "Inbox", icon: Inbox, badge: pending },
    { href: "/integrations", label: "Integrations", icon: Plug, badge: 0 },
  ];
  const secondary = [
    { href: "/settings", label: "Settings", icon: Settings, badge: 0 },
    ...(showAdmin
      ? [{ href: "/admin", label: "Admin", icon: ShieldCheck, badge: 0 }]
      : []),
  ];

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

  const renderLink = ({ href, label, icon: Icon, badge }: (typeof main)[0]) => {
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
    <aside className="flex w-60 shrink-0 flex-col bg-navy px-3 py-5">
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
