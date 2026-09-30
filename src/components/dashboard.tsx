"use client";

import { useState } from "react";
import { sendVerificationEmail } from "@/lib/auth-client";

type DashboardUser = {
  email: string;
  emailVerified: boolean;
};

type DashboardProps = {
  user: DashboardUser;
  emailEnabled: boolean;
};

export function Dashboard({ user, emailEnabled }: DashboardProps) {
  const [error, setError] = useState("");
  const [verification, setVerification] = useState<"idle" | "sending" | "sent">(
    "idle",
  );

  const handleResendVerification = async () => {
    setError("");
    setVerification("sending");
    try {
      const { error: sendError } = await sendVerificationEmail({
        email: user.email,
        callbackURL: "/dashboard",
      });
      if (sendError) {
        setError(sendError.message ?? "Unable to send verification email");
        setVerification("idle");
        return;
      }
      setVerification("sent");
    } catch {
      setError("Unable to send verification email");
      setVerification("idle");
    }
  };

  return (
    <>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Welcome back
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Signed in as{" "}
          <span className="font-medium text-zinc-900 dark:text-zinc-50">
            {user.email}
          </span>
        </p>
      </header>

      {emailEnabled && !user.emailVerified && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <p>
            {verification === "sent"
              ? "Verification email sent. Check your inbox."
              : "Please verify your email address."}
          </p>
          {verification !== "sent" && (
            <button
              onClick={handleResendVerification}
              disabled={verification === "sending"}
              className="font-medium hover:underline disabled:opacity-50"
            >
              {verification === "sending"
                ? "Sending..."
                : "Resend verification email"}
            </button>
          )}
        </div>
      )}

      {error && (
        <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}
    </>
  );
}
