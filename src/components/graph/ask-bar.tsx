"use client";

import { ArrowUp, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";

const EXAMPLES = [
  "What do we charge Kras?",
  "When does the API move to OAuth?",
  "How much is double holiday pay?",
  "When does Payroll Cloud v3 launch?",
];

type AskBarProps = {
  busy: boolean;
  // Leave room for the inspector panel on the right, or on phones, where
  // the inspector is a sheet over the bottom, step aside entirely.
  narrow: boolean;
  status: string | null;
  onAsk: (question: string) => void;
};

export function AskBar({ busy, narrow, status, onAsk }: AskBarProps) {
  const [value, setValue] = useState("");

  const submit = (question: string) => {
    const q = question.trim();
    if (q.length < 3 || busy) return;
    setValue(q);
    onAsk(q);
  };

  return (
    <div
      className={`pointer-events-none absolute bottom-3 left-0 z-20 flex flex-col items-center gap-2 px-3 sm:bottom-6 sm:gap-3 sm:px-6 ${
        narrow ? "max-md:hidden md:right-[25rem]" : "right-0"
      }`}
    >
      {status ? (
        <p className="animate-rise pointer-events-auto flex items-center gap-2 rounded-full bg-black/40 px-3 py-1.5 text-xs font-medium text-white/80 backdrop-blur">
          <Loader2 className="size-3.5 animate-spin text-worx-yellow" />
          {status}
        </p>
      ) : (
        // One swipeable row on phones instead of a stack of wrapped chips.
        <div className="pointer-events-auto -mx-3 flex max-w-[calc(100%+1.5rem)] gap-2 overflow-x-auto px-3 [scrollbar-width:none] sm:mx-0 sm:max-w-full sm:flex-wrap sm:justify-center sm:px-0">
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => submit(example)}
              className="shrink-0 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs whitespace-nowrap text-white/70 backdrop-blur transition-colors hover:border-white/30 hover:text-white sm:py-1"
            >
              {example}
            </button>
          ))}
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(value);
        }}
        className="pointer-events-auto flex w-full max-w-2xl items-center gap-3 rounded-2xl bg-white p-2 pl-4 shadow-2xl shadow-black/40 ring-1 ring-black/5 focus-within:ring-2 focus-within:ring-brand"
      >
        <Sparkles className="size-5 shrink-0 text-brand" />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Ask the company brain anything…"
          aria-label="Ask the graph"
          enterKeyHint="search"
          className="min-w-0 flex-1 bg-transparent py-2 text-base text-navy outline-none placeholder:text-muted sm:text-sm"
        />
        <button
          type="submit"
          disabled={busy || value.trim().length < 3}
          className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white transition-colors hover:bg-brand-dark disabled:bg-line disabled:text-muted sm:size-9"
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ArrowUp className="size-4" />
          )}
          <span className="sr-only">Ask</span>
        </button>
      </form>
    </div>
  );
}
