"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas px-6 font-sans">
      <div className="max-w-sm space-y-4 text-center">
        <h1 className="text-xl font-semibold tracking-tight text-ink">
          Something went wrong
        </h1>
        <p className="text-sm text-muted">
          An unexpected error occurred. Please try again.
          {error.digest && (
            <span className="mt-1 block font-mono text-xs">
              Reference: {error.digest}
            </span>
          )}
        </p>
        <button
          type="button"
          onClick={() => retry()}
          className="inline-flex items-center justify-center rounded-md bg-brand px-3.5 py-2 text-sm font-medium text-white shadow-xs transition-colors hover:bg-brand-dark"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
