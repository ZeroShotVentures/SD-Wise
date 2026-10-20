"use client";

import { Check, KeyRound, Lightbulb, Send, X } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { requestMore } from "@/app/(app)/graph/actions";
import { SOURCES } from "@/lib/graph/meta";
import type { AskResult, GraphView } from "@/lib/graph/types";

type AskResultProps = {
  result: AskResult;
  view: GraphView;
  // On phones the inspector sheet takes over; the answer comes back after.
  covered: boolean;
  onSelectNode: (id: string) => void;
  onClose: () => void;
};

export function AskResultCard({
  result,
  view,
  covered,
  onSelectNode,
  onClose,
}: AskResultProps) {
  const { answer, moreAvailable } = result;

  return (
    <section
      className={`animate-rise absolute inset-x-3 top-[4.5rem] z-10 flex max-h-[calc(100%-12rem)] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl shadow-black/30 md:top-24 md:right-auto md:left-6 md:max-h-[calc(100%-15rem)] md:w-[26rem] ${covered ? "max-md:hidden" : ""}`}
    >
      <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-3 sm:px-5 sm:py-4">
        <div>
          <p className="text-xs font-semibold tracking-wider text-muted uppercase">
            You asked
          </p>
          <p className="mt-1 font-medium text-navy">{result.question}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="-m-1.5 rounded-md p-2 text-muted hover:bg-canvas hover:text-navy"
        >
          <X className="size-4" />
          <span className="sr-only">Clear</span>
        </button>
      </header>
      <div className="flex min-h-0 flex-col gap-5 overflow-y-auto overscroll-contain p-4 sm:p-5">
        {answer && (
          <div>
            <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-brand uppercase">
              <Lightbulb className="size-3.5" /> From what you know
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-ink">
              {answer.text}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {answer.nodeIds.map((id) => {
                const node = view.nodes.find((n) => n.id === id);
                if (!node || node.locked) return null;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onSelectNode(id)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-left text-xs text-muted transition-colors hover:border-brand hover:text-navy sm:px-2 sm:py-0.5"
                  >
                    <span
                      className="size-1.5 rounded-full"
                      style={{ backgroundColor: SOURCES[node.source].color }}
                    />
                    {node.title}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {moreAvailable && <RequestMore question={result.question} />}

        {!answer && !moreAvailable && (
          <div className="rounded-xl bg-canvas p-4 text-sm text-muted">
            Nobody in the graph seems to know this yet. Try other words, or
            connect more sources in{" "}
            <Link href="/integrations" className="font-medium text-brand">
              Integrations
            </Link>
            .
          </div>
        )}
      </div>
    </section>
  );
}

// The request reruns the search on the server, so it carries the original
// question rather than an edited one.
export function RequestMore({ question }: { question: string }) {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const send = () =>
    startTransition(async () => {
      setError("");
      try {
        await requestMore({ question });
        setSent(true);
      } catch {
        setError("Couldn't send. Try again.");
      }
    });

  return (
    <div className="rounded-xl border border-line p-4">
      <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-worx-red uppercase">
        <KeyRound className="size-3.5" /> Colleagues know more
      </h3>
      <p className="mt-2 text-sm text-ink">
        Some of what they know about this isn&apos;t shared with you. SD Wise
        can pass your question on, and they decide whether to share it.
      </p>
      {error && <p className="mt-2 text-xs text-worx-red">{error}</p>}
      {sent ? (
        <p className="mt-3 text-xs text-muted">
          <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
            <Check className="size-3.5" /> Asked.
          </span>{" "}
          You&apos;ll see it in{" "}
          <Link href="/inbox?tab=sent" className="font-medium text-brand">
            Inbox → Sent
          </Link>{" "}
          if it&apos;s shared.
        </p>
      ) : (
        <button
          type="button"
          onClick={send}
          disabled={pending}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-xs font-medium text-white hover:bg-brand-dark disabled:opacity-50 sm:py-1.5"
        >
          <Send className="size-3" />
          {pending ? "Asking..." : "Ask a colleague"}
        </button>
      )}
    </div>
  );
}
