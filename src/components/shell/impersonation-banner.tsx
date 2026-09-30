"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { admin, useSession } from "@/lib/auth-client";

export function ImpersonationBanner() {
  const router = useRouter();
  const { data } = useSession();
  const [stopping, setStopping] = useState(false);

  if (!data?.session.impersonatedBy) return null;

  const handleStop = async () => {
    setStopping(true);
    const res = await admin.stopImpersonating().catch(() => null);
    if (!res || res.error) {
      setStopping(false);
      return;
    }
    router.replace(`/admin/users/${data.user.id}`);
    router.refresh();
  };

  return (
    <div className="flex items-center justify-between gap-4 bg-worx-yellow px-6 py-2 text-sm text-navy">
      <p>
        Viewing SD Wise as <strong>{data.user.name || data.user.email}</strong>.
        Actions you take affect their account.
      </p>
      <button
        type="button"
        onClick={handleStop}
        disabled={stopping}
        className="shrink-0 rounded-lg bg-navy px-3 py-1 font-medium text-white transition-colors hover:bg-navy-deep disabled:opacity-50"
      >
        {stopping ? "Stopping..." : "Stop impersonating"}
      </button>
    </div>
  );
}
