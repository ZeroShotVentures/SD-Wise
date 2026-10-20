"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";

export function CopyButton({
  value,
  label = "Copy",
  tone = "light",
  compact = false,
}: {
  value: string;
  label?: string;
  tone?: "light" | "dark";
  // Icon only; the label is for screen readers.
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
        } catch {
          // Clipboard blocked (insecure context): the text is selectable.
        }
      }}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-md text-xs ${compact ? "p-1" : "px-2 py-1"} font-medium transition-colors ${
        tone === "dark"
          ? "bg-white/10 text-white hover:bg-white/20"
          : "bg-white text-navy ring-1 ring-line hover:bg-canvas"
      }`}
    >
      {copied ? (
        <Check className="animate-pop size-3.5 text-emerald-500" />
      ) : (
        <Copy className="size-3.5" />
      )}
      <span aria-live="polite" className={compact ? "sr-only" : ""}>
        {copied ? "Copied" : label}
      </span>
    </button>
  );
}
