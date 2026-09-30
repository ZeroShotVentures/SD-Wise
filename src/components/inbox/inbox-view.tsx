"use client";

import {
  ArrowUpRight,
  Globe,
  KeyRound,
  Lock,
  MessageCircleQuestion,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { approveAccess, decline, sendAnswer } from "@/app/(app)/inbox/actions";
import { Avatar } from "@/components/shell/avatar";
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

  return (
    <div>
      <div
        role="tablist"
        className="inline-flex gap-1 rounded-xl bg-white p-1 ring-1 ring-line"
      >
        {(
          [
            ["received", "Received", pending.length],
            ["sent", "Sent", sent.filter((q) => q.status === "PENDING").length],
          ] as const
        ).map(([key, label, count]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => {
              setTab(key);
              window.history.replaceState(null, "", `/inbox?tab=${key}`);
            }}
            className={`flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === key ? "bg-navy text-white" : "text-muted hover:text-navy"
            }`}
          >
            {label}
            {count > 0 && (
              <span
                className={`rounded-full px-1.5 text-[11px] ${
                  tab === key ? "bg-white/20" : "bg-canvas"
                }`}
              >
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "received" ? (
        <div className="mt-6 flex flex-col gap-4">
          {pending.length === 0 && (
            <Empty text="You're all caught up. Nobody is waiting on you." />
          )}
          {pending.map((item) =>
            item.kind === "ACCESS" ? (
              <AccessRequest key={item.id} item={item} />
            ) : (
              <QuestionReview key={item.id} item={item} />
            ),
          )}
          {handled.length > 0 && (
            <>
              <h2 className="mt-6 text-xs font-semibold tracking-wider text-muted uppercase">
                Handled
              </h2>
              {handled.map((item) => (
                <Resolved key={item.id} item={item} perspective="received" />
              ))}
            </>
          )}
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          {sent.length === 0 && (
            <Empty text="Questions you ask colleagues from the graph show up here." />
          )}
          {sent.map((item) => (
            <Resolved key={item.id} item={item} perspective="sent" />
          ))}
        </div>
      )}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p className="rounded-2xl border border-dashed border-line bg-white p-10 text-center text-sm text-muted">
      {text}
    </p>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <article className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-line">
      {children}
    </article>
  );
}

function Asker({ item, verb }: { item: InboxItem; verb: string }) {
  return (
    <div className="flex items-center gap-3">
      <Avatar id={item.asker.id} name={item.asker.name} />
      <p className="flex-1 text-sm">
        <span className="font-semibold text-navy">{item.asker.name}</span>{" "}
        <span className="text-muted">
          {verb} · {item.asker.role}
        </span>
      </p>
      <time className="text-xs text-muted">{timeAgo(item.createdAt)}</time>
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
    <Card>
      <Asker item={item} verb="asked you" />
      <p className="mt-4 flex items-start gap-2 text-lg font-medium text-navy">
        <MessageCircleQuestion className="mt-1 size-5 shrink-0 text-brand" />
        {item.question}
      </p>

      <div className="mt-5">
        <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-brand uppercase">
          <Sparkles className="size-3.5" />
          {item.suggestedAnswer
            ? "Drafted from what you know"
            : "Nothing you know matches, write an answer"}
        </p>
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          rows={4}
          aria-label="Answer"
          className="mt-2 w-full resize-y rounded-xl border border-line bg-canvas/50 px-4 py-3 text-sm leading-relaxed outline-none focus:border-brand focus:bg-white"
        />
        {item.nodeTitles.length > 0 && (
          <p className="mt-2 text-xs text-muted">
            Based on: {item.nodeTitles.join(", ")}
          </p>
        )}
      </div>

      <fieldset className="mt-5">
        <legend className="text-xs font-semibold tracking-wider text-muted uppercase">
          Who can know this afterwards
        </legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <ScopeOption
            checked={scope === "ASKER"}
            onChange={() => setScope("ASKER")}
            icon={<Lock className="size-4" />}
            title={`Only ${askerName}`}
            text={`${askerName} can know it, but it stays private in the graph.`}
          />
          <ScopeOption
            checked={scope === "PUBLIC"}
            onChange={() => setScope("PUBLIC")}
            icon={<Globe className="size-4" />}
            title="Everyone"
            text="It's not a secret anymore. Anyone can find this answer."
          />
        </div>
      </fieldset>

      {error && <p className="mt-4 text-sm text-worx-red">{error}</p>}
      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => decline(item.id))}
          className="rounded-lg px-4 py-2 text-sm font-medium text-muted hover:bg-canvas hover:text-navy disabled:opacity-50"
        >
          Decline
        </button>
        <button
          type="button"
          disabled={pending || !answer.trim()}
          onClick={() =>
            run(() => sendAnswer({ queryId: item.id, answer, scope }))
          }
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {pending ? "Sending..." : `Send to ${askerName}`}
        </button>
      </div>
    </Card>
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
      className={`flex cursor-pointer gap-3 rounded-xl border p-3 transition-colors ${
        checked
          ? "border-brand bg-brand-soft"
          : "border-line hover:border-muted"
      }`}
    >
      <input
        type="radio"
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      <span className={checked ? "text-brand" : "text-muted"}>{icon}</span>
      <span>
        <span className="block text-sm font-medium text-navy">{title}</span>
        <span className="block text-xs text-muted">{text}</span>
      </span>
    </label>
  );
}

function AccessRequest({ item }: { item: InboxItem }) {
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
    <Card>
      <Asker item={item} verb="wants access" />
      <div className="mt-4 flex items-start gap-3 rounded-xl bg-canvas p-4">
        <KeyRound className="mt-0.5 size-5 shrink-0 text-worx-yellow" />
        <div>
          <p className="text-sm text-muted">
            {askerName} found this in the graph but can&apos;t see it:
          </p>
          <p className="mt-1 font-medium text-navy">
            {item.nodeTitles.join(", ") || "A fact you own"}
          </p>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted">
        Sharing gives only {askerName} access. It stays private for everyone
        else.
      </p>
      {error && <p className="mt-4 text-sm text-worx-red">{error}</p>}
      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => decline(item.id))}
          className="rounded-lg px-4 py-2 text-sm font-medium text-muted hover:bg-canvas hover:text-navy disabled:opacity-50"
        >
          Decline
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => approveAccess(item.id))}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {pending ? "Sharing..." : `Share with ${askerName}`}
        </button>
      </div>
    </Card>
  );
}

const STATUS: Record<QueryStatus, { label: string; className: string }> = {
  PENDING: { label: "Waiting", className: "bg-amber-100 text-amber-800" },
  ANSWERED: { label: "Answered", className: "bg-emerald-100 text-emerald-800" },
  DECLINED: { label: "Declined", className: "bg-canvas text-muted" },
};

function Resolved({
  item,
  perspective,
}: {
  item: InboxItem;
  perspective: Tab;
}) {
  const other = perspective === "sent" ? item.recipient : item.asker;
  const status =
    item.kind === "ACCESS" && item.status === "ANSWERED"
      ? { ...STATUS.ANSWERED, label: "Access granted" }
      : STATUS[item.status];

  return (
    <Card>
      <div className="flex items-center gap-3">
        <Avatar id={other.id} name={other.name} />
        <p className="flex-1 text-sm">
          <span className="text-muted">
            {perspective === "sent" ? "To" : "From"}{" "}
          </span>
          <span className="font-semibold text-navy">{other.name}</span>
        </p>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}
        >
          {status.label}
        </span>
        <time className="text-xs text-muted">
          {timeAgo(item.resolvedAt ?? item.createdAt)}
        </time>
      </div>
      <p className="mt-3 font-medium text-navy">
        {item.kind === "ACCESS"
          ? `Access to: ${item.nodeTitles.join(", ") || "a locked fact"}`
          : item.question}
      </p>
      {item.answer && (
        <p className="mt-2 rounded-xl bg-canvas px-4 py-3 text-sm leading-relaxed">
          {item.answer}
        </p>
      )}
      {item.status === "ANSWERED" && item.answerNodeId && (
        <Link
          href={`/graph?node=${item.answerNodeId}`}
          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
        >
          View in graph <ArrowUpRight className="size-3.5" />
        </Link>
      )}
    </Card>
  );
}
