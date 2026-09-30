"use client";

import { Check, Lightbulb, Send, Users, X } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { askPerson } from "@/app/(app)/graph/actions";
import { Avatar } from "@/components/shell/avatar";
import { SOURCES } from "@/lib/graph/meta";
import type { AskResult, GraphView, SuggestedPerson } from "@/lib/graph/types";

type AskResultProps = {
  result: AskResult;
  view: GraphView;
  onSelectNode: (id: string) => void;
  onClose: () => void;
};

export function AskResultCard({
  result,
  view,
  onSelectNode,
  onClose,
}: AskResultProps) {
  const { answer, people } = result;

  return (
    <section className="animate-rise absolute top-24 left-6 z-10 flex max-h-[calc(100%-15rem)] w-[26rem] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl shadow-black/30">
      <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <p className="text-xs font-semibold tracking-wider text-muted uppercase">
            You asked
          </p>
          <p className="mt-1 font-medium text-navy">{result.question}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-muted hover:bg-canvas hover:text-navy"
        >
          <X className="size-4" />
          <span className="sr-only">Clear</span>
        </button>
      </header>
      <div className="flex flex-col gap-5 overflow-y-auto p-5">
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
                    className="inline-flex items-center gap-1.5 rounded-full border border-line px-2 py-0.5 text-xs text-muted transition-colors hover:border-brand hover:text-navy"
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

        {people.length > 0 && (
          <div>
            <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-worx-red uppercase">
              <Users className="size-3.5" />
              {answer ? "Others know more" : "People who might know"}
            </h3>
            <p className="mt-1 text-xs text-muted">
              You can&apos;t see what they know, but you can ask them.
            </p>
            <ul className="mt-3 flex flex-col gap-2">
              {people.map((suggestion) => (
                <PersonSuggestion
                  key={suggestion.person.id}
                  suggestion={suggestion}
                  question={result.question}
                />
              ))}
            </ul>
          </div>
        )}

        {!answer && people.length === 0 && (
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

function PersonSuggestion({
  suggestion,
  question,
}: {
  suggestion: SuggestedPerson;
  question: string;
}) {
  const { person, reason, nodeIds } = suggestion;
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(question);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const firstName = person.name.split(" ")[0];

  const send = () =>
    startTransition(async () => {
      setError("");
      try {
        await askPerson({ recipientId: person.id, question: text, nodeIds });
        setSent(true);
        setOpen(false);
      } catch {
        setError("Couldn't send. Try again.");
      }
    });

  return (
    <li className="rounded-xl border border-line p-3">
      <div className="flex items-center gap-3">
        <Avatar id={person.id} name={person.name} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {person.name}{" "}
            <span className="font-normal text-muted">· {person.role}</span>
          </p>
          <p className="text-xs text-muted">{reason}</p>
        </div>
        {sent ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
            <Check className="size-3.5" /> Asked
          </span>
        ) : (
          !open && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="shrink-0 rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-dark"
            >
              Ask {firstName}
            </button>
          )
        )}
      </div>
      {open && (
        <div className="mt-3 flex flex-col gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            aria-label={`Question for ${person.name}`}
            className="w-full resize-none rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand"
          />
          {error && <p className="text-xs text-worx-red">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted hover:bg-canvas"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={send}
              disabled={pending || text.trim().length < 3}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-dark disabled:opacity-50"
            >
              <Send className="size-3" /> {pending ? "Sending..." : "Send"}
            </button>
          </div>
        </div>
      )}
      {sent && (
        <p className="mt-2 text-xs text-muted">
          {firstName} gets a drafted answer to review. Track it in{" "}
          <Link href="/inbox?tab=sent" className="font-medium text-brand">
            Inbox → Sent
          </Link>
          .
        </p>
      )}
    </li>
  );
}
