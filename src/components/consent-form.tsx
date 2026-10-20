"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import {
  eyebrowClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/ui/styles";
import { oauth2 } from "@/lib/auth-client";

const SCOPE_LABEL: Record<string, string> = {
  openid: "Know who you are",
  profile: "See your name",
  email: "See your email address",
  offline_access: "Stay connected until you revoke it",
};

const UNSAFE_PROTOCOLS = new Set(["javascript:", "data:", "vbscript:"]);

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
      const url = res.data?.url && new URL(res.data.url, window.location.href);
      // The client's registered redirect_uri, which may be a native app
      // scheme (cursor://), so only script-running schemes are refused.
      if (url && !UNSAFE_PROTOCOLS.has(url.protocol)) {
        window.location.assign(url);
        return;
      }
      setError(res.error?.message ?? "Something went wrong");
    } catch {
      setError("Something went wrong");
    }
    setLoading(false);
  };

  return (
    <div className="w-full max-w-sm">
      <div className="mb-6 text-center">
        <h1 className="text-xl font-semibold tracking-tight text-ink">
          Allow {clientName}?
        </h1>
        <p className="mt-1 text-sm text-muted">
          It will use SD Wise as {email}, and only see what you can see.
        </p>
      </div>

      <div className="rounded-lg border border-line bg-white shadow-sm">
        <div className="p-6">
          <p className={eyebrowClass}>It will be able to</p>
          <ul className="mt-3 space-y-2.5 text-sm text-ink">
            {[
              "Ask questions and send them to colleagues",
              ...scopes.map((scope) => SCOPE_LABEL[scope] ?? scope),
            ].map((line) => (
              <li key={line} className="flex items-start gap-2.5">
                <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                {line}
              </li>
            ))}
          </ul>
          {error && (
            <p
              role="alert"
              className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {error}
            </p>
          )}
        </div>

        <div className="flex gap-2 rounded-b-lg border-t border-line bg-canvas px-6 py-4">
          <button
            type="button"
            disabled={loading}
            onClick={() => decide(false)}
            className={`flex-1 py-2.5 ${secondaryButtonClass}`}
          >
            Deny
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => decide(true)}
            className={`flex-1 ${primaryButtonClass}`}
          >
            Allow
          </button>
        </div>
      </div>
    </div>
  );
}
