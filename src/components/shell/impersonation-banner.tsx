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
    <div className="flex items-center justify-between gap-3 bg-worx-yellow px-4 py-2 text-xs text-navy sm:gap-4 sm:px-6 sm:text-sm">
      <p className="min-w-0 wrap-anywhere">
        Viewing SD Wise as <strong>{data.user.name || data.user.email}</strong>.{" "}
        <span className="max-sm:hidden">
          Actions you take affect their account.
        </span>
      </p>
      <button
        type="button"
        onClick={handleStop}
        disabled={stopping}
        className="shrink-0 rounded-lg bg-navy px-3 py-1.5 font-medium text-white transition-colors hover:bg-navy-deep disabled:opacity-50"
      >
        {stopping ? (
          "Stopping..."
        ) : (
          <>
            Stop<span className="max-sm:hidden"> impersonating</span>
          </>
        )}
      </button>
    </div>
  );
}
