"use client";

import { Check, KeyRound, Lightbulb, Send, UserRound, X } from "lucide-react";
import Link from "next/link";
import { createContext, useContext, useState, useTransition } from "react";
import { askOwners, askPerson, colleagues } from "@/app/(app)/graph/actions";
import { SOURCES } from "@/lib/graph/meta";
import type { AskResult, GraphView, Person } from "@/lib/graph/types";

// Where a sent question's answer shows up: Inbox → Sent, unless the host shows
// sent questions itself, like Teams with a chat per question. Gets the
// question's id when there's exactly one.
export const ShowSent = createContext<((questionId?: string) => void) | null>(
  null,
);

function SentLink({ questionId }: { questionId?: string }) {
  const show = useContext(ShowSent);
  return show ? (
    <button
      type="button"
      onClick={() => show(questionId)}
      className="font-medium text-brand hover:underline"
    >
      Your questions
    </button>
  ) : (
    <Link href="/inbox?tab=sent" className="font-medium text-brand">
      Inbox → Sent
    </Link>
  );
}

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
          You&apos;ll see their answer in <SentLink />.
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
  const [sent, setSent] = useState<{ id: string; to: Person } | null>(null);
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
        const id = await askPerson({ recipientId, question, nodeIds: [] });
        const to = people?.find((p) => p.id === recipientId);
        setSent(to ? { id, to } : null);
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
      {sent ? (
        <p className="mt-3 text-xs text-muted">
          <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
            <Check className="size-3.5" /> Sent to {sent.to.name}.
          </span>{" "}
          You&apos;ll see the answer in <SentLink questionId={sent.id} />.
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
