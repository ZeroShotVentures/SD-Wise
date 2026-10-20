"use client";

import { ArrowUpRight, Globe, Inbox, Lock, Send, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { decline, sendAnswer } from "@/app/(app)/inbox/actions";
import { Avatar } from "@/components/shell/avatar";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import {
  cardClass,
  eyebrowClass,
  ghostButtonClass,
  primaryButtonClass,
} from "@/components/ui/styles";
import { Tabs } from "@/components/ui/tabs";
import { timeAgo } from "@/lib/graph/meta";
import type { InboxItem, QueryStatus, ShareScope } from "@/lib/graph/types";

type Tab = "received" | "sent";

export function InboxView({
  received,
  sent,
  tab: initialTab,
}: {
  received: InboxItem[];
  sent: InboxItem[];
  tab: Tab;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const pending = received.filter((q) => q.status === "PENDING");
  const handled = received.filter((q) => q.status !== "PENDING");
  const waiting = sent.filter((q) => q.status === "PENDING").length;

  return (
    <div>
      <Tabs
        label="Inbox"
        value={tab}
        onChange={setTab}
        items={[
          { key: "received", label: "Received", count: pending.length || "" },
          { key: "sent", label: "Sent", count: waiting || "" },
        ]}
      />

      {tab === "received" ? (
        <div className="mt-6 flex flex-col gap-8">
          <section>
            <SectionHeading
              title="Waiting for you"
              count={pending.length}
              hint="Colleagues asked about something you know."
            />
            {pending.length === 0 ? (
              <Empty
                title="You're all caught up"
                text="Nobody is waiting on an answer from you."
              />
            ) : (
              <div className="flex flex-col gap-4">
                {pending.map((item) => (
                  <QuestionReview key={item.id} item={item} />
                ))}
              </div>
            )}
          </section>
          {handled.length > 0 && (
            <section>
              <SectionHeading title="Handled" count={handled.length} />
              <List items={handled} perspective="received" />
            </section>
          )}
        </div>
      ) : (
        <div className="mt-6">
          {sent.length === 0 ? (
            <Empty
              title="No questions sent yet"
              text="When you ask a colleague from the graph, the question and their answer show up here."
              action={
                <Link href="/graph" className={primaryButtonClass}>
                  Ask the graph
                </Link>
              }
            />
          ) : (
            <List items={sent} perspective="sent" />
          )}
        </div>
      )}
    </div>
  );
}

function SectionHeading({
  title,
  count,
  hint,
}: {
  title: string;
  count: number;
  hint?: string;
}) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-4">
      <h2 className="text-sm font-semibold text-ink">
        {title}{" "}
        <span className="font-normal text-muted tabular-nums">{count}</span>
      </h2>
      {hint && <p className="text-xs text-muted max-sm:hidden">{hint}</p>}
    </div>
  );
}

function Empty({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-dashed border-line-strong bg-white px-6 py-12 text-center">
      <span className="flex size-10 items-center justify-center rounded-md border border-line bg-subtle text-muted">
        <Inbox className="size-5" strokeWidth={1.75} />
      </span>
      <p className="mt-3 text-sm font-medium text-ink">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted">{text}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function QuestionReview({ item }: { item: InboxItem }) {
  const [answer, setAnswer] = useState(item.suggestedAnswer ?? "");
  const [scope, setScope] = useState<ShareScope>("ASKER");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const askerName = item.asker.name.split(" ")[0];

  const run = (fn: () => Promise<void>) =>
    startTransition(async () => {
      setError("");
      try {
        await fn();
      } catch {
        setError("Something went wrong. Try again.");
      }
    });

  return (
    <article className={cardClass}>
      <header className="flex items-start gap-3 border-b border-line px-4 py-3 sm:px-5">
        <Avatar id={item.asker.id} name={item.asker.name} />
        <div className="min-w-0 flex-1">
          <p className="text-sm">
            <span className="font-medium text-ink">{item.asker.name}</span>{" "}
            <span className="text-muted">
              {item.routed ? "asked SD Wise about what you know" : "asked you"}
            </span>
          </p>
          <p className="text-xs text-muted">{item.asker.role}</p>
        </div>
        <time className="shrink-0 text-xs text-muted">
          {timeAgo(item.createdAt)}
        </time>
      </header>

      <div className="px-4 py-4 sm:px-5">
        <p className="text-base font-medium text-ink">{item.question}</p>

        <div className="mt-5">
          <div className="flex items-center justify-between gap-3">
            <label
              htmlFor={`answer-${item.id}`}
              className="flex items-center gap-1.5 text-sm font-medium text-ink"
            >
              Your answer
            </label>
            {item.suggestedAnswer ? (
              <Badge tone="brand">
                <Sparkles className="size-3" /> Drafted from what you know
              </Badge>
            ) : (
              <span className="text-xs text-muted">
                Nothing you know matches yet
              </span>
            )}
          </div>
          <textarea
            id={`answer-${item.id}`}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={4}
            placeholder={`Write what ${askerName} should know…`}
            className="mt-2 w-full resize-y rounded-md border border-line-strong bg-white px-3 py-2.5 text-base leading-relaxed text-ink shadow-xs transition-[border-color,box-shadow] outline-none placeholder:text-faint focus:border-brand focus:ring-3 focus:ring-brand/15 sm:text-sm"
          />
          {item.nodeTitles.length > 0 && (
            <p className="mt-1.5 text-xs text-muted">
              Based on {item.nodeTitles.join(", ")}
            </p>
          )}
        </div>

        <fieldset className="mt-5">
          <legend className="text-sm font-medium text-ink">
            Who can know this afterwards
          </legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <ScopeOption
              checked={scope === "ASKER"}
              onChange={() => setScope("ASKER")}
              icon={<Lock className="size-4" />}
              title={`Only ${askerName}`}
              text="Stays private in the graph."
            />
            <ScopeOption
              checked={scope === "PUBLIC"}
              onChange={() => setScope("PUBLIC")}
              icon={<Globe className="size-4" />}
              title="Everyone"
              text="Anyone in the company can find this answer."
            />
          </div>
        </fieldset>
      </div>

      <footer className="flex items-center gap-2 rounded-b-lg border-t border-line bg-canvas px-4 py-3 sm:justify-end sm:px-5">
        {error && (
          <p role="alert" className="mr-auto text-sm text-worx-red">
            {error}
          </p>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => decline(item.id))}
          className={`${ghostButtonClass} max-sm:flex-1`}
        >
          Decline
        </button>
        <button
          type="button"
          disabled={pending || !answer.trim()}
          onClick={() =>
            run(() => sendAnswer({ queryId: item.id, answer, scope }))
          }
          className={`${primaryButtonClass} max-sm:flex-2`}
        >
          <Send className="size-3.5" />
          {pending
            ? "Sending..."
            : scope === "PUBLIC"
              ? "Send and share with everyone"
              : `Send to ${askerName}`}
        </button>
      </footer>
    </article>
  );
}

function ScopeOption({
  checked,
  onChange,
  icon,
  title,
  text,
}: {
  checked: boolean;
  onChange: () => void;
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors has-focus-visible:ring-3 has-focus-visible:ring-brand/15 ${
        checked
          ? "border-brand bg-brand-soft/50"
          : "border-line hover:border-line-strong hover:bg-canvas"
      }`}
    >
      <input
        type="radio"
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      <span
        className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border ${
          checked ? "border-brand bg-brand" : "border-line-strong bg-white"
        }`}
      >
        {checked && <span className="size-1.5 rounded-full bg-white" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-sm font-medium text-ink">
          <span className={checked ? "text-brand" : "text-muted"}>{icon}</span>
          {title}
        </span>
        <span className="mt-0.5 block text-xs text-muted">{text}</span>
      </span>
    </label>
  );
}

const STATUS: Record<QueryStatus, { label: string; tone: BadgeTone }> = {
  PENDING: { label: "Waiting", tone: "warning" },
  ANSWERED: { label: "Answered", tone: "success" },
  DECLINED: { label: "Declined", tone: "neutral" },
};

// Resolved and sent questions as one bordered list: who, what, where it
// stands, and the answer underneath when there is one.
function List({
  items,
  perspective,
}: {
  items: InboxItem[];
  perspective: Tab;
}) {
  return (
    <ul className={`divide-y divide-line ${cardClass}`}>
      {items.map((item) => {
        const other = perspective === "sent" ? item.recipient : item.asker;
        const status = STATUS[item.status];
        return (
          <li key={item.id} className="flex gap-3 px-4 py-4 sm:px-5">
            <Avatar id={other.id} name={other.name} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className="min-w-0 truncate text-sm">
                  <span className="text-muted">
                    {perspective === "sent" ? "To" : "From"}{" "}
                  </span>
                  <span className="font-medium text-ink">{other.name}</span>
                </p>
                <Badge tone={status.tone}>{status.label}</Badge>
                <time className="ml-auto text-xs text-muted">
                  {timeAgo(item.resolvedAt ?? item.createdAt)}
                </time>
              </div>
              <p className="mt-1 text-sm text-ink">{item.question}</p>
              {item.answer && (
                <div className="mt-2.5 rounded-md border border-line bg-canvas px-3 py-2.5">
                  <p className={eyebrowClass}>Answer</p>
                  <p className="mt-1 text-sm leading-relaxed text-ink">
                    {item.answer}
                  </p>
                </div>
              )}
              {item.status === "ANSWERED" && item.answerNodeId && (
                <Link
                  href={`/graph?node=${item.answerNodeId}`}
                  className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand hover:text-brand-dark"
                >
                  View in graph <ArrowUpRight className="size-3.5" />
                </Link>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
