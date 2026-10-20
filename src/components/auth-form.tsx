"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  inputClass,
  labelClass,
  primaryButtonClass,
} from "@/components/ui/styles";
import { signIn } from "@/lib/auth-client";

type AuthFormProps = {
  callbackURL: string;
};

export function AuthForm({ callbackURL }: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await signIn.email({ email, password });
      if (res.error) {
        setError(res.error.message ?? "Sign in failed");
        setLoading(false);
        return;
      }
      // Signing in during an MCP client's OAuth flow continues that flow.
      if (res.data && "redirect" in res.data && res.data.url) {
        window.location.href = res.data.url;
        return;
      }
      router.replace(callbackURL);
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm">
      <div className="mb-6 text-center">
        <h1 className="text-xl font-semibold tracking-tight text-ink">
          Sign in
        </h1>
        <p className="mt-1 text-sm text-muted">
          Use your work email to open the company brain.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-lg border border-line bg-white p-6 shadow-sm"
      >
        <div className="space-y-1.5">
          <label htmlFor="email" className={labelClass}>
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            required
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className={labelClass}>
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className={inputClass}
          />
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className={`w-full ${primaryButtonClass}`}
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
