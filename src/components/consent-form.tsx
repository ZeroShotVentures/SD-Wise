"use client";

import { useState } from "react";
import { oauth2 } from "@/lib/auth-client";

const SCOPE_LABEL: Record<string, string> = {
  openid: "Know who you are",
  profile: "See your name",
  email: "See your email address",
  offline_access: "Stay connected until you revoke it",
};

type ConsentFormProps = {
  clientName: string;
  email: string;
  scopes: string[];
};

export function ConsentForm({ clientName, email, scopes }: ConsentFormProps) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const decide = async (accept: boolean) => {
    setError("");
    setLoading(true);
    try {
      const res = await oauth2.consent({ accept });
      if (res.data?.url) {
        window.location.href = res.data.url;
        return;
      }
      setError(res.error?.message ?? "Something went wrong");
    } catch {
      setError("Something went wrong");
    }
    setLoading(false);
  };

  return (
    <div className="w-full max-w-sm space-y-6 rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Allow {clientName}?
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          It will use SD Wise as {email}, and only see what you can see.
        </p>
      </div>

      <ul className="space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
        <li>Ask questions and send them to colleagues</li>
        {scopes.map((scope) => (
          <li key={scope}>{SCOPE_LABEL[scope] ?? scope}</li>
        ))}
      </ul>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          disabled={loading}
          onClick={() => decide(false)}
          className="flex-1 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          Deny
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => decide(true)}
          className="flex-1 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Allow
        </button>
      </div>
    </div>
  );
}
