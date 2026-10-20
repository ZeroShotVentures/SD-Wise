"use client";

import {
  Globe,
  Lock,
  MessageCircleQuestion,
  RotateCcw,
  SendHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { useState, useTransition } from "react";
import { decline, sendAnswer } from "@/app/(app)/inbox/actions";
import type { InboxItem, ShareScope } from "@/lib/graph/types";

export function requestStatus(item: InboxItem) {
  if (item.status === "ANSWERED")
    return { label: "Answered", className: "bg-emerald-100 text-emerald-800" };
  if (item.status === "DECLINED")
    return { label: "Declined", className: "bg-[#f0f0f0] text-[#616161]" };
  return { label: "Waiting on you", className: "bg-amber-100 text-amber-800" };
}

const firstName = (item: InboxItem) => item.asker.name.split(" ")[0];

// The bot's Adaptive Card in the thread. Replying happens in the composer.
export function RequestCard({ item }: { item: InboxItem }) {
  const status = requestStatus(item);

  return (
    <div className="w-full max-w-lg overflow-hidden rounded-md border border-[#e0e0e0] bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-[#f0f0f0] bg-[#fafafa] px-4 py-2.5">
        <MessageCircleQuestion className="size-4 shrink-0 text-[#5b5fc7]" />
        <p className="min-w-0 flex-1 truncate text-sm">
          <span className="font-semibold">{item.asker.name}</span>{" "}
          <span className="text-[#616161]">
            {item.routed ? "asked about what you know" : "asked you"}
          </span>
        </p>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${status.className}`}
        >
          {status.label}
        </span>
      </div>

      <div className="p-4">
        <p className="text-base leading-snug font-semibold">{item.question}</p>
        {item.nodeTitles.length > 0 && (
          <p className="mt-2 text-xs text-[#616161]">
            Related facts you know: {item.nodeTitles.join(", ")}
          </p>
        )}
        {item.status === "PENDING" && (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-[#5b5fc7]">
            <Sparkles className="size-3.5 shrink-0" />
            {item.suggestedAnswer
              ? "I drafted an answer below. Edit it or write your own."
              : "Write your answer below."}
          </p>
        )}
      </div>
    </div>
  );
}

// Takes the place of the message box while a question waits on you.
export function RequestComposer({ item }: { item: InboxItem }) {
  const [answer, setAnswer] = useState(item.suggestedAnswer ?? "");
  const [scope, setScope] = useState<ShareScope>("ASKER");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const name = firstName(item);
  const drafted = !!item.suggestedAnswer;
  const edited = drafted && answer !== item.suggestedAnswer;

  const run = (fn: () => Promise<void>) =>
    startTransition(async () => {
      setError("");
      try {
        await fn();
      } catch {
        setError("Something went wrong. Try again.");
      }
    });

  const send = () => {
    if (!answer.trim() || pending) return;
    run(() => sendAnswer({ queryId: item.id, answer, scope }));
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
      className="rounded-md border-b-2 border-transparent bg-white shadow-sm focus-within:border-[#5b5fc7]"
    >
      <div className="flex items-center gap-2 px-3 pt-2.5 text-xs">
        <span className="flex items-center gap-1.5 font-semibold text-[#5b5fc7]">
          <Sparkles className="size-3.5" />
          {drafted
            ? edited
              ? "Your edit of the SD Wise draft"
              : "Drafted by SD Wise"
            : `Answer ${name}`}
        </span>
        {edited && (
          <button
            type="button"
            onClick={() => setAnswer(item.suggestedAnswer ?? "")}
            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[#616161] hover:bg-[#f5f5f5] hover:text-[#242424]"
          >
            <RotateCcw className="size-3" /> Use draft
          </button>
        )}
      </div>
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
          }
        }}
        rows={Math.min(6, Math.max(2, Math.ceil(answer.length / 90)))}
        aria-label={`Answer to ${name}`}
        placeholder={`Type your answer to ${name}`}
        className="block w-full resize-none bg-transparent px-3 pt-1.5 text-sm leading-relaxed outline-none placeholder:text-[#616161]"
      />
      {error && <p className="px-3 pt-1 text-sm text-[#c4314b]">{error}</p>}
      <div className="flex flex-wrap items-center gap-2 px-2 pt-1 pb-2">
        <fieldset className="flex items-center gap-1.5">
          <legend className="sr-only">Who can know this afterwards</legend>
          <ScopeChip
            checked={scope === "ASKER"}
            onChange={() => setScope("ASKER")}
            icon={<Lock className="size-3.5" />}
            label={`Only ${name}`}
          />
          <ScopeChip
            checked={scope === "PUBLIC"}
            onChange={() => setScope("PUBLIC")}
            icon={<Globe className="size-3.5" />}
            label="Everyone"
          />
        </fieldset>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => decline(item.id))}
            className={SECONDARY}
          >
            <X className="size-4" /> Decline
          </button>
          <button
            type="submit"
            disabled={pending || !answer.trim()}
            className={PRIMARY}
          >
            <SendHorizontal className="size-4" />
            {pending ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </form>
  );
}

const SECONDARY =
  "flex h-8 items-center justify-center gap-1.5 rounded-md border border-[#d1d1d1] px-3 text-sm font-medium transition-colors hover:bg-[#f5f5f5] disabled:opacity-50";
const PRIMARY =
  "flex h-8 items-center justify-center gap-1.5 rounded-md bg-[#5b5fc7] px-3 text-sm font-medium text-white transition-colors hover:bg-[#4f52b2] disabled:opacity-50";

function ScopeChip({
  checked,
  onChange,
  icon,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <label
      className={`flex h-7 cursor-pointer items-center gap-1.5 rounded-full border px-2.5 text-xs transition-colors has-focus-visible:ring-2 has-focus-visible:ring-[#5b5fc7] ${
        checked
          ? "border-[#5b5fc7] bg-[#e8ebfa] text-[#5b5fc7]"
          : "border-[#d1d1d1] text-[#424242] hover:border-[#5b5fc7]"
      }`}
    >
      <input
        type="radio"
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      {icon}
      {label}
    </label>
  );
}
