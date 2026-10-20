"use client";

import { Check, KeyRound, Lightbulb, Send, UserRound, X } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { askOwners, askPerson, colleagues } from "@/app/(app)/graph/actions";
import { SOURCES } from "@/lib/graph/meta";
import type { AskResult, GraphView, Person } from "@/lib/graph/types";

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
  const { answer, moreAvailable, askColleague, lockedHits } = result;

  return (
    <section
      className={`animate-rise absolute inset-x-3 top-3 z-10 flex max-h-[calc(100%-10rem)] flex-col overflow-hidden rounded-lg border border-line bg-white shadow-xl shadow-ink/10 md:top-4 md:right-auto md:left-4 md:max-h-[calc(100%-11rem)] md:w-[26rem] ${covered ? "max-md:hidden" : ""}`}
    >
      <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
        <div className="min-w-0">
          <p className="text-xs text-muted">You asked</p>
          <p className="mt-0.5 text-sm font-medium text-ink">
            {result.question}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="-mr-1.5 inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-subtle hover:text-ink"
        >
          <X className="size-4" />
          <span className="sr-only">Clear</span>
        </button>
      </header>
      <div className="flex min-h-0 flex-col gap-4 overflow-y-auto overscroll-contain p-4">
        {answer && (
          <div>
            {answer.nodeIds.length > 0 && (
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wider text-brand uppercase">
                <Lightbulb className="size-3.5" /> From what you know
              </h3>
            )}
            <p className="text-sm leading-relaxed text-ink">{answer.text}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {answer.nodeIds.map((id) => {
                const node = view.nodes.find((n) => n.id === id);
                if (!node || node.locked) return null;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onSelectNode(id)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-line bg-white px-2 py-1 text-left text-xs text-muted transition-colors hover:border-line-strong hover:bg-subtle hover:text-ink sm:py-0.5"
                  >
                    <span
                      className="size-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: SOURCES[node.source].ink }}
                    />
                    {node.title}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {moreAvailable && (
          <AskOwners question={result.question} lit={lockedHits.length} />
        )}

        {askColleague && <AskColleague question={result.question} />}
      </div>
    </section>
  );
}

const withheld = (lit: number) =>
  lit === 0
    ? "Some of what they know about this isn't shared with you."
    : lit === 1
      ? "The locked fact lit up in red matches this, but isn't shared with you."
      : `The ${lit} locked facts lit up in red match this, but aren't shared with you.`;

// Sends the question to whoever knows the locked matches, with a drafted
// answer. The search reruns on the server, so it carries the original
// question rather than an edited one. `lit` counts the locked matches lit up
// on the graph, when there is one.
export function AskOwners({
  question,
  lit = 0,
}: {
  question: string;
  lit?: number;
}) {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const send = () =>
    startTransition(async () => {
      setError("");
      try {
        await askOwners({ question });
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
        {withheld(lit)} SD Wise can send your question to who knows, with an
        answer drafted for them. They decide what to tell you.
      </p>
      {error && <p className="mt-2 text-xs text-worx-red">{error}</p>}
      {sent ? (
        <p className="mt-3 text-xs text-muted">
          <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
            <Check className="size-3.5" /> Asked.
          </span>{" "}
          You&apos;ll see their answer in{" "}
          <Link href="/inbox?tab=sent" className="font-medium text-brand">
            Inbox → Sent
          </Link>
          .
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

// For questions nothing in the graph answers: the asker picks who to send it
// to, and they get it in their inbox with a drafted reply.
export function AskColleague({ question }: { question: string }) {
  const [people, setPeople] = useState<Person[] | null>(null);
  const [recipientId, setRecipientId] = useState("");
  const [sentTo, setSentTo] = useState<Person | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const open = () =>
    startTransition(async () => {
      setError("");
      try {
        const list = await colleagues();
        setPeople(list);
        setRecipientId(list[0]?.id ?? "");
      } catch {
        setError("Couldn't load your colleagues. Try again.");
      }
    });

  const send = () =>
    startTransition(async () => {
      setError("");
      try {
        await askPerson({ recipientId, question, nodeIds: [] });
        setSentTo(people?.find((p) => p.id === recipientId) ?? null);
      } catch {
        setError("Couldn't send. Try again.");
      }
    });

  const button =
    "inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-xs font-medium text-white hover:bg-brand-dark disabled:opacity-50 sm:py-1.5";

  return (
    <div className="rounded-xl border border-line p-4">
      <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-brand uppercase">
        <UserRound className="size-3.5" /> Ask a colleague
      </h3>
      {error && <p className="mt-2 text-xs text-worx-red">{error}</p>}
      {sentTo ? (
        <p className="mt-3 text-xs text-muted">
          <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
            <Check className="size-3.5" /> Sent to {sentTo.name}.
          </span>{" "}
          You&apos;ll see the answer in{" "}
          <Link href="/inbox?tab=sent" className="font-medium text-brand">
            Inbox → Sent
          </Link>
          .
        </p>
      ) : people ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            value={recipientId}
            onChange={(e) => setRecipientId(e.target.value)}
            aria-label="Colleague"
            className="min-w-0 flex-1 rounded-lg border border-line bg-white px-2 py-1.5 text-sm text-ink"
          >
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {p.role}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={send}
            disabled={pending || !recipientId}
            className={button}
          >
            <Send className="size-3" />
            {pending ? "Sending..." : "Send question"}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={open}
          disabled={pending}
          className={`mt-3 ${button}`}
        >
          <UserRound className="size-3" />
          {pending ? "Loading..." : "Ask a colleague"}
        </button>
      )}
    </div>
  );
}
