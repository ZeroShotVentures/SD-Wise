import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas px-6 font-sans">
      <div className="max-w-sm space-y-4 text-center">
        <p className="text-sm font-medium text-muted">404</p>
        <h1 className="text-xl font-semibold tracking-tight text-ink">
          Page not found
        </h1>
        <p className="text-sm text-muted">
          The page you&apos;re looking for doesn&apos;t exist or has moved.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-md bg-brand px-3.5 py-2 text-sm font-medium text-white shadow-xs transition-colors hover:bg-brand-dark"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
