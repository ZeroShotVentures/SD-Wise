"use client";

import {
  ArrowLeft,
  AtSign,
  Download,
  FileText,
  Hash,
  Paperclip,
  Phone,
  SendHorizontal,
  Smile,
  Sparkles,
  Users,
  Video,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { askWise } from "@/app/teams/actions";
import type { Person } from "@/lib/graph/types";
import type { Call } from "./call-overlay";
import {
  CANNED_REPLIES,
  type Conversation,
  EMOJIS,
  FILES,
  MEMBERS,
  type Message,
  QUICK_REACTIONS,
  type Reaction,
  type Team,
  WISE_ID,
  WISE_SUGGESTIONS,
} from "./data";
import { RequestCard, RequestComposer } from "./request-card";
import { RequestAvatar, TeamsAvatar } from "./teams-avatar";
import { Popover, useNotify, WiseMark } from "./ui";
import { WiseCard } from "./wise-card";

function pick<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function now() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fileSize(bytes: number) {
  return bytes > 1_000_000
    ? `${(bytes / 1_000_000).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1000))} KB`;
}

function toggleReaction(reactions: Reaction[] = [], emoji: string) {
  const existing = reactions.find((r) => r.emoji === emoji);
  if (!existing) return [...reactions, { emoji, count: 1, mine: true }];
  return reactions
    .map((r) =>
      r.emoji !== emoji
        ? r
        : r.mine
          ? { emoji, count: r.count - 1, mine: false }
          : { emoji, count: r.count + 1, mine: true },
    )
    .filter((r) => r.count > 0);
}

type Tab = "chat" | "files" | "about";

export function ConversationPane({
  me,
  conversation,
  team,
  nameOf,
  onBack,
  onCall,
  onUpdate,
}: {
  me: Person;
  conversation: Conversation;
  team?: Team;
  nameOf: (id: string) => string;
  onBack: () => void;
  onCall: (call: Call) => void;
  onUpdate: (fn: (c: Conversation) => Conversation) => void;
}) {
  const notify = useNotify();
  const [tab, setTab] = useState<Tab>("chat");
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState<string | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const { kind, messages, request, sent } = conversation;
  const isMine = (id: string) => id === "me" || id === me.id;
  const busy = typing !== null;
  const first = conversation.memberIds[0] ?? WISE_ID;
  const asked = messages.some((m) => isMine(m.authorId));

  const append = (message: Omit<Message, "id" | "time">) =>
    onUpdate((c) => ({
      ...c,
      messages: [
        ...c.messages,
        { ...message, id: crypto.randomUUID(), time: now() },
      ],
    }));

  const replyLater = () => {
    if (kind !== "chat" && kind !== "group") return;
    const responder = pick(conversation.memberIds);
    if (!responder) return;
    setTimeout(() => setTyping(responder), 800);
    setTimeout(() => {
      setTyping(null);
      append({ authorId: responder, text: pick(CANNED_REPLIES) ?? "👍" });
    }, 2600);
  };

  const send = async (text: string) => {
    const body = text.trim();
    if (!body || busy) return;
    setDraft("");
    append({ authorId: "me", text: body });

    if (kind !== "wise") {
      replyLater();
      return;
    }
    setTyping(WISE_ID);
    try {
      const result = await askWise(body);
      append({
        authorId: WISE_ID,
        text: "",
        wise: {
          question: result.question,
          text: result.answer?.text ?? null,
          facts: result.facts,
          moreAvailable: result.moreAvailable,
          askColleague: result.askColleague,
        },
      });
    } catch {
      append({
        authorId: WISE_ID,
        text: "Sorry, I couldn't answer that right now. Try again in a moment.",
      });
    } finally {
      setTyping(null);
    }
  };

  const insert = (text: string) => {
    const el = input.current;
    const start = el?.selectionStart ?? draft.length;
    const end = el?.selectionEnd ?? draft.length;
    setDraft(draft.slice(0, start) + text + draft.slice(end));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + text.length, start + text.length);
    });
  };

  const attach = (file: File | undefined) => {
    if (!file) return;
    if (kind === "wise") {
      notify("SD Wise reads your connected sources, not attachments");
      return;
    }
    append({
      authorId: "me",
      text: "",
      file: { name: file.name, size: fileSize(file.size) },
    });
    replyLater();
  };

  const react = (messageId: string, emoji: string) =>
    onUpdate((c) => ({
      ...c,
      messages: c.messages.map((m) =>
        m.id === messageId
          ? { ...m, reactions: toggleReaction(m.reactions, emoji) }
          : m,
      ),
    }));

  const reply = (messageId: string, text: string) =>
    onUpdate((c) => ({
      ...c,
      messages: c.messages.map((m) =>
        m.id === messageId
          ? {
              ...m,
              thread: [
                ...(m.thread ?? []),
                { id: crypto.randomUUID(), authorId: "me", text, time: now() },
              ],
            }
          : m,
      ),
    }));

  const tabs: [Tab, string][] =
    kind === "request" || kind === "sent"
      ? []
      : kind === "wise"
        ? [
            ["chat", "Chat"],
            ["about", "About"],
          ]
        : [
            ["chat", kind === "channel" ? "Posts" : "Chat"],
            ["files", "Files"],
          ];

  const subtitle =
    kind === "wise"
      ? "App · Answers from your company brain"
      : kind === "request"
        ? `Question via SD Wise · ${request?.asker.role}`
        : kind === "sent"
          ? `Your question via SD Wise${sent?.recipientId ? ` · ${sent.recipient.role}` : ""}`
          : kind === "chat"
            ? MEMBERS[first]?.role
            : kind === "group"
              ? `${conversation.memberIds.length + 1} people`
              : team?.name;

  // Not the bot, nor a colleague SD Wise keeps hidden.
  const callable = first !== WISE_ID;
  const startCall = (video: boolean) =>
    onCall({
      title:
        kind === "channel"
          ? `${team?.name} › ${conversation.title}`
          : conversation.title,
      avatarId: first,
      video,
    });

  const memberIds =
    kind === "wise" ? Object.keys(MEMBERS) : conversation.memberIds;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[#e0e0e0] px-3 sm:px-5">
        <button
          type="button"
          onClick={onBack}
          className="-ml-1 inline-flex size-8 items-center justify-center rounded-md text-[#616161] hover:bg-[#f5f5f5] md:hidden"
        >
          <ArrowLeft className="size-4" />
          <span className="sr-only">Back</span>
        </button>
        {kind === "channel" ? (
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-md text-white"
            style={{ backgroundColor: team?.color }}
          >
            <Hash className="size-4" />
          </span>
        ) : kind === "group" ? (
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#e8ebfa] text-[#5b5fc7]">
            <Users className="size-4" />
          </span>
        ) : kind === "request" || kind === "sent" ? (
          <RequestAvatar id={first} name={conversation.title} />
        ) : (
          <TeamsAvatar
            id={first}
            name={conversation.title}
            presence={MEMBERS[first]?.presence}
          />
        )}
        <div className="min-w-0">
          <h1 className="truncate text-base leading-tight font-bold">
            {conversation.title}
          </h1>
          <p className="truncate text-xs text-[#616161]">{subtitle}</p>
        </div>
        {tabs.length > 0 && (
          <div
            role="tablist"
            className="ml-2 hidden items-center gap-4 self-stretch text-sm sm:ml-4 sm:flex"
          >
            {tabs.map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={`flex h-full items-center border-b-2 ${
                  tab === key
                    ? "border-[#5b5fc7] font-semibold"
                    : "border-transparent text-[#616161] hover:text-[#242424]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        {callable && (
          <div className="ml-auto flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => startCall(true)}
              className="flex h-8 items-center gap-1.5 rounded-md border border-[#d1d1d1] px-2.5 text-sm font-medium transition-colors hover:bg-[#f5f5f5]"
            >
              <Video className="size-4" />
              <span className="hidden sm:inline">Meet</span>
            </button>
            {kind !== "channel" && (
              <button
                type="button"
                title="Audio call"
                onClick={() => startCall(false)}
                className="flex size-8 items-center justify-center rounded-md border border-[#d1d1d1] transition-colors hover:bg-[#f5f5f5]"
              >
                <Phone className="size-4" />
                <span className="sr-only">Audio call</span>
              </button>
            )}
          </div>
        )}
      </header>

      {tab === "about" ? (
        <AboutWise />
      ) : tab === "files" ? (
        <FilesTab
          conversation={conversation}
          nameOf={nameOf}
          onOpen={(name) => notify(`Opening ${name} isn't part of this demo`)}
        />
      ) : (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto bg-[#fafafa] px-3 py-4 sm:px-6">
            <div className="mx-auto flex min-h-full max-w-3xl flex-col">
              {messages.length === 0 ? (
                <div className="m-auto flex flex-col items-center gap-3 py-10 text-center">
                  <TeamsAvatar id={first} name={conversation.title} size="lg" />
                  <p className="text-base font-semibold">
                    Start your conversation with{" "}
                    {conversation.title.split(" ")[0]}
                  </p>
                  <button
                    type="button"
                    onClick={() => send("Hi 👋")}
                    className="rounded-md border border-[#d1d1d1] bg-white px-3 py-1.5 text-sm font-medium transition-colors hover:border-[#5b5fc7] hover:text-[#5b5fc7]"
                  >
                    Say hi 👋
                  </button>
                </div>
              ) : (
                <>
                  <div className="mb-2 flex items-center gap-3 text-xs text-[#616161]">
                    <span className="h-px flex-1 bg-[#e0e0e0]" />
                    {kind === "request"
                      ? "From SD Wise"
                      : kind === "sent"
                        ? "Via SD Wise"
                        : "Today"}
                    <span className="h-px flex-1 bg-[#e0e0e0]" />
                  </div>
                  {messages.map((m, i) =>
                    kind === "channel" ? (
                      <ChannelPost
                        key={m.id}
                        message={m}
                        nameOf={nameOf}
                        onReact={(e) => react(m.id, e)}
                        onReply={(text) => reply(m.id, text)}
                      />
                    ) : (
                      <ChatMessage
                        key={m.id}
                        message={m}
                        name={nameOf(m.authorId)}
                        mine={isMine(m.authorId)}
                        grouped={messages[i - 1]?.authorId === m.authorId}
                        reactable={kind !== "request" && kind !== "sent"}
                        onReact={(e) => react(m.id, e)}
                      />
                    ),
                  )}
                </>
              )}
              {kind === "wise" && !asked && (
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {WISE_SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      disabled={busy}
                      onClick={() => send(s)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#d1d1d1] bg-white px-3 py-1.5 text-xs text-[#424242] shadow-sm transition-colors hover:border-[#5b5fc7] hover:text-[#5b5fc7] disabled:opacity-50"
                    >
                      <Sparkles className="size-3.5 text-[#5b5fc7]" />
                      {s}
                    </button>
                  ))}
                </div>
              )}
              {typing && (
                <div className="animate-fade mt-3 flex items-center gap-2 text-xs text-[#616161]">
                  <TeamsAvatar id={typing} name={nameOf(typing)} size="sm" />
                  <span className="flex items-center gap-1 rounded-md bg-white px-3 py-2.5 shadow-sm">
                    <Dot delay="0ms" />
                    <Dot delay="150ms" />
                    <Dot delay="300ms" />
                  </span>
                  {typing === WISE_ID
                    ? "SD Wise is searching the company brain..."
                    : `${nameOf(typing).split(" ")[0]} is typing...`}
                </div>
              )}
              {/* Remounts whenever the thread grows, which scrolls it into view. */}
              <div
                key={`${messages.length}-${typing}`}
                ref={(el) => el?.scrollIntoView({ block: "end" })}
              />
            </div>
          </div>

          <footer className="shrink-0 bg-[#fafafa] px-3 pb-4 sm:px-6">
            <div className="mx-auto max-w-3xl">
              {request ? (
                request.status === "PENDING" ? (
                  <RequestComposer item={request} />
                ) : (
                  <p className="rounded-md border border-dashed border-[#d1d1d1] px-3 py-2.5 text-center text-xs text-[#616161]">
                    This question is handled. SD Wise closed the conversation.
                  </p>
                )
              ) : sent ? (
                <p className="rounded-md border border-dashed border-[#d1d1d1] px-3 py-2.5 text-center text-xs text-[#616161]">
                  {sent.status === "PENDING"
                    ? "SD Wise posts the answer here as soon as it's in."
                    : "This question is handled. SD Wise closed the conversation."}
                  {sent.answerNodeId && (
                    <>
                      {" "}
                      <Link
                        href={`/graph?node=${sent.answerNodeId}`}
                        className="font-semibold text-[#5b5fc7] hover:underline"
                      >
                        View in SD Wise
                      </Link>
                    </>
                  )}
                </p>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    send(draft);
                  }}
                  className="rounded-md border-b-2 border-transparent bg-white shadow-sm focus-within:border-[#5b5fc7]"
                >
                  <textarea
                    ref={input}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        send(draft);
                      }
                    }}
                    rows={1}
                    placeholder={
                      kind === "wise"
                        ? "Ask SD Wise anything"
                        : kind === "channel"
                          ? "Start a post"
                          : "Type a message"
                    }
                    className="block max-h-40 w-full resize-none bg-transparent px-3 pt-2.5 text-sm outline-none placeholder:text-[#616161]"
                  />
                  <div className="flex items-center gap-0.5 px-1.5 pb-1.5">
                    <Popover
                      label="Emoji"
                      placement="top-start"
                      trigger={<Smile className="size-4" />}
                    >
                      {(close) => (
                        <div className="grid grid-cols-6 gap-0.5 p-1">
                          {EMOJIS.map((e) => (
                            <button
                              key={e}
                              type="button"
                              onClick={() => {
                                insert(e);
                                close();
                              }}
                              className="flex size-8 items-center justify-center rounded-md text-lg hover:bg-[#f5f5f5]"
                            >
                              {e}
                            </button>
                          ))}
                        </div>
                      )}
                    </Popover>
                    <button
                      type="button"
                      title="Attach file"
                      onClick={() => fileInput.current?.click()}
                      className="inline-flex size-8 items-center justify-center rounded-md text-[#616161] transition-colors hover:bg-[#f0f0f0] hover:text-[#5b5fc7]"
                    >
                      <Paperclip className="size-4" />
                      <span className="sr-only">Attach file</span>
                    </button>
                    <input
                      ref={fileInput}
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        attach(e.target.files?.[0]);
                        e.target.value = "";
                      }}
                    />
                    <Popover
                      label="Mention someone"
                      placement="top-start"
                      trigger={<AtSign className="size-4" />}
                    >
                      {(close) => (
                        <>
                          <p className="px-2.5 pt-1.5 pb-1 text-xs font-semibold text-[#616161]">
                            Mention
                          </p>
                          {memberIds.map((id) => (
                            <button
                              key={id}
                              type="button"
                              onClick={() => {
                                insert(`@${nameOf(id)} `);
                                close();
                              }}
                              className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-[#f5f5f5]"
                            >
                              <TeamsAvatar
                                id={id}
                                name={nameOf(id)}
                                size="sm"
                              />
                              {nameOf(id)}
                            </button>
                          ))}
                        </>
                      )}
                    </Popover>
                    <button
                      type="submit"
                      disabled={!draft.trim() || busy}
                      className="ml-auto inline-flex size-8 items-center justify-center rounded-md text-[#5b5fc7] transition-colors hover:bg-[#f5f5f5] disabled:text-[#c7c7c7]"
                    >
                      <SendHorizontal className="size-4" />
                      <span className="sr-only">Send</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </footer>
        </>
      )}
    </div>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="size-1.5 animate-bounce rounded-full bg-[#9e9e9e]"
      style={{ animationDelay: delay }}
    />
  );
}

function ReactionBar({
  onReact,
  className,
}: {
  onReact: (emoji: string) => void;
  className: string;
}) {
  return (
    <div
      className={`absolute -top-4 z-10 hidden items-center gap-0.5 rounded-md border border-[#e0e0e0] bg-white p-0.5 shadow-md group-hover:flex ${className}`}
    >
      {QUICK_REACTIONS.map((e) => (
        <button
          key={e}
          type="button"
          onClick={() => onReact(e)}
          className="flex size-7 items-center justify-center rounded text-base transition-transform hover:scale-125"
        >
          {e}
        </button>
      ))}
    </div>
  );
}

function Reactions({
  reactions,
  onReact,
}: {
  reactions?: Reaction[];
  onReact: (emoji: string) => void;
}) {
  if (!reactions?.length) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {reactions.map((r) => (
        <button
          key={r.emoji}
          type="button"
          onClick={() => onReact(r.emoji)}
          className={`flex h-6 items-center gap-1 rounded-full border px-2 text-xs shadow-sm transition-colors ${
            r.mine
              ? "border-[#5b5fc7] bg-[#e8ebfa]"
              : "border-[#e0e0e0] bg-white hover:border-[#5b5fc7]"
          }`}
        >
          {r.emoji} <span className="text-[#616161]">{r.count}</span>
        </button>
      ))}
    </div>
  );
}

function FileChip({ name, size }: { name: string; size: string }) {
  return (
    <div className="flex w-64 max-w-full items-center gap-3 rounded-md border border-[#e0e0e0] bg-white px-3 py-2.5 shadow-sm">
      <FileText className="size-6 shrink-0 text-[#5b5fc7]" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="text-xs text-[#616161]">{size}</p>
      </div>
    </div>
  );
}

function ChatMessage({
  message: m,
  name,
  mine,
  grouped,
  reactable,
  onReact,
}: {
  message: Message;
  name: string;
  mine: boolean;
  grouped: boolean;
  reactable: boolean;
  onReact: (emoji: string) => void;
}) {
  return (
    <div
      className={`animate-fade flex gap-2 ${mine ? "justify-end" : ""} ${grouped ? "mt-1" : "mt-4"}`}
    >
      {!mine && (
        <span className="w-8 shrink-0">
          {!grouped && <TeamsAvatar id={m.authorId} name={name} />}
        </span>
      )}
      <div
        className={`flex max-w-[85%] min-w-0 flex-col sm:max-w-[75%] ${mine ? "items-end" : "items-start"}`}
      >
        {!grouped && (
          <p className="mb-1 px-0.5 text-xs text-[#616161]">
            {!mine && (
              <span className="mr-2 font-semibold text-[#424242]">{name}</span>
            )}
            {m.time}
          </p>
        )}
        <div className="group relative w-full">
          {m.request ? (
            <RequestCard item={m.request} />
          ) : m.wise ? (
            <WiseCard reply={m.wise} />
          ) : m.file ? (
            <div className={mine ? "flex justify-end" : ""}>
              <FileChip {...m.file} />
            </div>
          ) : (
            <div className={mine ? "flex justify-end" : ""}>
              <div
                className={`rounded-md px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                  mine ? "bg-[#e8ebfa]" : "bg-white shadow-sm"
                }`}
              >
                {m.text}
              </div>
            </div>
          )}
          {reactable && !m.request && (
            <ReactionBar
              onReact={onReact}
              className={mine ? "right-1" : "left-1"}
            />
          )}
        </div>
        <Reactions reactions={m.reactions} onReact={onReact} />
      </div>
    </div>
  );
}

function ChannelPost({
  message,
  nameOf,
  onReact,
  onReply,
}: {
  message: Message;
  nameOf: (id: string) => string;
  onReact: (emoji: string) => void;
  onReply: (text: string) => void;
}) {
  const [replying, setReplying] = useState(false);
  const [draft, setDraft] = useState("");
  const name = nameOf(message.authorId);
  const thread = message.thread ?? [];
  const count = (message.replies ?? 0) + thread.length;

  const submit = () => {
    if (!draft.trim()) return;
    onReply(draft.trim());
    setDraft("");
  };

  return (
    <article className="animate-fade mt-4 rounded-md bg-white shadow-sm">
      <div className="group relative flex gap-3 p-4">
        <TeamsAvatar id={message.authorId} name={name} />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-[#616161]">
            <span className="mr-2 font-semibold text-[#424242]">{name}</span>
            {message.time}
          </p>
          {message.file ? (
            <div className="mt-2">
              <FileChip {...message.file} />
            </div>
          ) : (
            <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap">
              {message.text}
            </p>
          )}
          <Reactions reactions={message.reactions} onReact={onReact} />
        </div>
        <ReactionBar onReact={onReact} className="right-3" />
      </div>
      {thread.length > 0 && (
        <div className="flex flex-col gap-3 border-t border-[#f0f0f0] py-3 pr-4 pl-14">
          {thread.map((r) => (
            <div key={r.id} className="flex gap-2.5">
              <TeamsAvatar
                id={r.authorId}
                name={nameOf(r.authorId)}
                size="sm"
              />
              <div className="min-w-0">
                <p className="text-xs text-[#616161]">
                  <span className="mr-2 font-semibold text-[#424242]">
                    {nameOf(r.authorId)}
                  </span>
                  {r.time}
                </p>
                <p className="text-sm whitespace-pre-wrap">{r.text}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="border-t border-[#f0f0f0] px-4 py-2">
        {replying ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="flex items-center gap-2"
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setReplying(false);
              }}
              placeholder="Reply"
              aria-label={`Reply to ${name}`}
              className="h-8 min-w-0 flex-1 rounded-md border-b-2 border-transparent bg-[#f5f5f5] px-3 text-sm outline-none focus:border-[#5b5fc7] focus:bg-white"
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              className="inline-flex size-8 items-center justify-center rounded-md text-[#5b5fc7] hover:bg-[#f5f5f5] disabled:text-[#c7c7c7]"
            >
              <SendHorizontal className="size-4" />
              <span className="sr-only">Send reply</span>
            </button>
          </form>
        ) : (
          <div className="flex items-center gap-3 text-xs">
            {count > 0 && (
              <span className="font-semibold text-[#5b5fc7]">
                {count} {count === 1 ? "reply" : "replies"}
              </span>
            )}
            <button
              type="button"
              onClick={() => setReplying(true)}
              className="flex items-center gap-1 rounded px-1.5 py-1 text-[#616161] transition-colors hover:bg-[#f5f5f5] hover:text-[#5b5fc7]"
            >
              Reply
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

function FilesTab({
  conversation,
  nameOf,
  onOpen,
}: {
  conversation: Conversation;
  nameOf: (id: string) => string;
  onOpen: (name: string) => void;
}) {
  const shared = conversation.messages.flatMap((m) =>
    m.file
      ? [
          {
            key: m.id,
            name: m.file.name,
            logo: null,
            authorId: m.authorId,
            time: m.time,
          },
        ]
      : [],
  );
  const related = FILES.filter((f) =>
    conversation.memberIds.includes(f.authorId),
  ).map((f) => Object.assign({ key: f.name }, f));
  const files = [...shared, ...related];

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-[#fafafa] px-3 py-4 sm:px-6">
      <div className="mx-auto max-w-3xl">
        {files.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center text-sm text-[#616161]">
            <FileText className="size-8 text-[#c7c7c7]" />
            No files shared here yet.
          </div>
        ) : (
          <div className="overflow-hidden rounded-md bg-white shadow-sm">
            {files.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => onOpen(f.name)}
                className="group flex w-full items-center gap-3 border-b border-[#f0f0f0] px-4 py-3 text-left last:border-0 hover:bg-[#fafafa]"
              >
                {f.logo ? (
                  <Image
                    src={`/logos/${f.logo}.svg`}
                    alt=""
                    width={24}
                    height={24}
                    className="size-6"
                  />
                ) : (
                  <FileText className="size-6 text-[#5b5fc7]" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {f.name}
                  </span>
                  <span className="block text-xs text-[#616161]">
                    Shared by {nameOf(f.authorId)} · {f.time}
                  </span>
                </span>
                <Download className="size-4 text-[#616161] opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AboutWise() {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-[#fafafa] px-3 py-8 sm:px-6">
      <div className="mx-auto flex max-w-md flex-col items-center rounded-md bg-white p-6 text-center shadow-sm">
        <WiseMark className="size-16" />
        <h2 className="mt-3 text-lg font-bold">SD Wise</h2>
        <p className="text-xs text-[#616161]">by SD Worx</p>
        <p className="mt-4 text-sm leading-relaxed text-[#424242]">
          The company brain. Ask anything and SD Wise answers with what
          you&apos;re allowed to see. When a colleague knows more, it asks them
          for you, and their questions for you show up here as chats.
        </p>
        <ul className="mt-4 w-full space-y-2 text-left text-sm">
          {[
            "Answers from Teams, Outlook, SharePoint and more",
            "Respects who may see what",
            "Routes questions to the person who knows",
          ].map((line) => (
            <li key={line} className="flex items-center gap-2">
              <Sparkles className="size-3.5 shrink-0 text-[#5b5fc7]" />
              {line}
            </li>
          ))}
        </ul>
        <Link
          href="/graph"
          className="mt-6 rounded-md bg-[#5b5fc7] px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[#4f52b2]"
        >
          Open SD Wise
        </Link>
      </div>
    </div>
  );
}
