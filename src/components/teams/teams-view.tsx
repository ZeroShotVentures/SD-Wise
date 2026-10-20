"use client";

import {
  Bell,
  CalendarDays,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Ellipsis,
  Hash,
  LayoutGrid,
  ListFilter,
  MessageSquareText,
  RotateCcw,
  Search,
  SquarePen,
  Users,
  X,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ShowSent } from "@/components/graph/ask-result";
import { timeAgo } from "@/lib/graph/meta";
import type { InboxItem, Person } from "@/lib/graph/types";
import { CalendarPane } from "./calendar-pane";
import { type Call, CallOverlay } from "./call-overlay";
import { ConversationPane } from "./conversation-pane";
import {
  ACTIVITY,
  type ActivityItem,
  APPS,
  CONVERSATIONS,
  type Conversation,
  MEMBERS,
  type Message,
  type Presence,
  TEAMS,
  WISE_ID,
} from "./data";
import { requestStatus } from "./request-card";
import {
  PRESENCE,
  PresenceDot,
  RequestAvatar,
  TeamsAvatar,
} from "./teams-avatar";
import {
  IconButton,
  MenuItem,
  NotifyProvider,
  Popover,
  useNotify,
  WiseMark,
} from "./ui";

type Section = "activity" | "chat" | "teams" | "calendar";

const REFRESH_MS = 15_000;

// The signed-in person may be one of the mock colleagues.
function initialConversations(meId: string) {
  const all = structuredClone(CONVERSATIONS).filter(
    (c) => !(c.kind === "chat" && c.memberIds[0] === meId),
  );
  for (const c of all) c.memberIds = c.memberIds.filter((id) => id !== meId);
  return all;
}

const requestChatId = (item: InboxItem) => `q-${item.id}`;

const unreadOf = (list: Conversation[]) =>
  list.reduce((sum, c) => sum + (c.unread ?? 0), 0);

function confirmation(item: InboxItem) {
  const first = item.asker.name.split(" ")[0];
  return item.status === "ANSWERED"
    ? `Sent to ${first}. Your answer is now a fact in their graph${item.shareScope === "PUBLIC" ? ", visible to everyone" : ""}.`
    : `Declined. ${first} won't get an answer from you on this one.`;
}

// Each question SD Wise routes to you becomes its own chat with the bot.
function requestConversation(
  item: InboxItem,
  seen: boolean,
  now: number,
): Conversation {
  const asked = timeAgo(item.createdAt, now);
  const resolved = item.resolvedAt ? timeAgo(item.resolvedAt, now) : asked;
  const messages: Message[] = [
    {
      id: `${item.id}-card`,
      authorId: WISE_ID,
      time: asked,
      text: "",
      request: item,
    },
  ];
  if (item.status === "ANSWERED" && item.answer)
    messages.push({
      id: `${item.id}-answer`,
      authorId: "me",
      time: resolved,
      text: item.answer,
    });
  if (item.status !== "PENDING")
    messages.push({
      id: `${item.id}-done`,
      authorId: WISE_ID,
      time: resolved,
      text: confirmation(item),
    });
  return {
    id: requestChatId(item),
    kind: "request",
    title: item.asker.name,
    memberIds: [item.asker.id],
    unread: item.status === "PENDING" && !seen ? 1 : 0,
    request: item,
    messages,
  };
}

const sentChatId = (questionId: string) => `s-${questionId}`;

// Each question you send through SD Wise becomes its own chat with whoever it
// went to, and their answer lands in it.
function sentConversation(
  item: InboxItem,
  seen: boolean,
  now: number,
): Conversation {
  const asked = timeAgo(item.createdAt, now);
  const resolved = item.resolvedAt ? timeAgo(item.resolvedAt, now) : asked;
  // getInbox clears the id while SD Wise keeps who it went to hidden.
  const hidden = !item.recipientId;
  const who = hidden
    ? "a colleague who knows"
    : item.recipient.name.split(" ")[0];
  const messages: Message[] = [
    {
      id: `${item.id}-question`,
      authorId: "me",
      time: asked,
      text: item.question,
    },
    {
      id: `${item.id}-sent`,
      authorId: WISE_ID,
      time: asked,
      text: `Sent to ${who}. I'll post the answer here.`,
    },
  ];
  if (item.status === "ANSWERED" && item.answer)
    messages.push(
      {
        id: `${item.id}-answer`,
        authorId: item.recipient.id,
        time: resolved,
        text: item.answer,
      },
      {
        id: `${item.id}-done`,
        authorId: WISE_ID,
        time: resolved,
        text: `${who}'s answer is now a fact in your graph${item.shareScope === "PUBLIC" ? ", visible to everyone" : ""}.`,
      },
    );
  if (item.status === "DECLINED")
    messages.push({
      id: `${item.id}-done`,
      authorId: WISE_ID,
      time: resolved,
      text: `Declined by ${who}. Ask someone else from the SD Wise chat.`,
    });
  return {
    id: sentChatId(item.id),
    kind: "sent",
    title: item.recipient.name,
    memberIds: hidden ? [] : [item.recipient.id],
    // An answer is new until you open it here or find it in the graph.
    unread: item.status === "ANSWERED" && !item.seenAt && !seen ? 1 : 0,
    sent: item,
    messages,
  };
}

type Props = {
  me: Person;
  received: InboxItem[];
  sent: InboxItem[];
  now: number;
};

export function TeamsView(props: Props) {
  return (
    <NotifyProvider>
      <Teams {...props} />
    </NotifyProvider>
  );
}

function Teams({ me, received, sent, now }: Props) {
  const router = useRouter();
  const notify = useNotify();
  const [section, setSection] = useState<Section>("chat");
  const [history, setHistory] = useState({ stack: ["c-wise"], index: 0 });
  const [query, setQuery] = useState("");
  const [presence, setPresence] = useState<Presence>("available");
  const [call, setCall] = useState<Call | null>(null);
  const [readActivity, setReadActivity] = useState<string[]>([]);
  const [seenRequests, setSeenRequests] = useState<string[]>([]);
  // Phones show either the list or the open conversation.
  const [listOpen, setListOpen] = useState(true);
  const [conversations, setConversations] = useState(() =>
    initialConversations(me.id),
  );

  const requests = useMemo(
    () =>
      received
        .toSorted(
          (a, b) =>
            Number(b.status === "PENDING") - Number(a.status === "PENDING"),
        )
        .map((item) =>
          requestConversation(item, seenRequests.includes(item.id), now),
        ),
    [received, seenRequests, now],
  );
  const asked = useMemo(
    () =>
      sent.map((item) =>
        sentConversation(item, seenRequests.includes(item.id), now),
      ),
    [sent, seenRequests, now],
  );
  const all = useMemo(
    () => [...requests, ...asked, ...conversations],
    [requests, asked, conversations],
  );

  const activeId = history.stack[history.index] ?? "c-wise";
  const active = all.find((c) => c.id === activeId);

  // New questions arrive without a reload.
  useEffect(() => {
    const refresh = () => router.refresh();
    const timer = window.setInterval(refresh, REFRESH_MS);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [router]);

  const known = useRef(new Set(received.map((q) => q.id)));
  const sentStatus = useRef(new Map(sent.map((q) => [q.id, q.status])));

  const people = new Map(
    [...received.map((q) => q.asker), ...sent.map((q) => q.recipient)].map(
      (p) => [p.id, p.name],
    ),
  );
  const nameOf = (id: string) =>
    id === "me" || id === me.id
      ? me.name
      : id === WISE_ID
        ? "SD Wise"
        : (MEMBERS[id]?.name ?? people.get(id) ?? id);

  const show = (id: string) => {
    const target = all.find((c) => c.id === id);
    setSection(target?.teamId ? "teams" : "chat");
    setListOpen(false);
    const question = target?.request ?? target?.sent;
    if (question) {
      setSeenRequests((seen) =>
        seen.includes(question.id) ? seen : [...seen, question.id],
      );
    }
    setConversations((list) =>
      list.map((c) => (c.id === id && c.unread ? { ...c, unread: 0 } : c)),
    );
  };

  const open = (id: string) => {
    show(id);
    if (id === activeId) return;
    setHistory(({ stack, index }) => ({
      stack: [...stack.slice(0, index + 1), id],
      index: index + 1,
    }));
  };

  // Setters only, so a toast can open the chat whenever it's clicked.
  const openQuestion = useCallback((id: string, questionId: string) => {
    setSection("chat");
    setListOpen(false);
    setSeenRequests((seen) =>
      seen.includes(questionId) ? seen : [...seen, questionId],
    );
    setHistory(({ stack, index }) =>
      stack[index] === id
        ? { stack, index }
        : { stack: [...stack.slice(0, index + 1), id], index: index + 1 },
    );
  }, []);

  // The Ask cards in the SD Wise chat point here instead of Inbox → Sent.
  const showSent = useCallback(
    (questionId?: string) => {
      if (questionId) {
        openQuestion(sentChatId(questionId), questionId);
        return;
      }
      setSection("chat");
      setListOpen(true);
    },
    [openQuestion],
  );

  useEffect(() => {
    for (const item of received) {
      if (known.current.has(item.id)) continue;
      known.current.add(item.id);
      if (item.status !== "PENDING") continue;
      notify(`${item.asker.name} asked you something via SD Wise`, {
        label: "Open",
        run: () => openQuestion(requestChatId(item), item.id),
      });
    }
  }, [received, notify, openQuestion]);

  // So do answers to what you asked. A question you just sent isn't news.
  useEffect(() => {
    for (const item of sent) {
      const before = sentStatus.current.get(item.id);
      sentStatus.current.set(item.id, item.status);
      if (before !== "PENDING" || item.status === "PENDING") continue;
      notify(
        `${item.recipient.name} ${item.status === "ANSWERED" ? "answered" : "declined"} your question`,
        {
          label: "Open",
          run: () => openQuestion(sentChatId(item.id), item.id),
        },
      );
    }
  }, [sent, notify, openQuestion]);

  const step = (delta: number) => {
    const index = history.index + delta;
    const id = history.stack[index];
    if (!id) return;
    setHistory({ ...history, index });
    show(id);
  };

  const startChat = (memberId: string) => {
    const id = `c-new-${memberId}`;
    const member = MEMBERS[memberId];
    if (!member) return;
    if (!conversations.some((c) => c.id === id)) {
      setConversations((list) => [
        ...list,
        {
          id,
          kind: "chat",
          title: member.name,
          memberIds: [memberId],
          messages: [],
        },
      ]);
    }
    setSection("chat");
    setListOpen(false);
    setHistory(({ stack, index }) => ({
      stack: [...stack.slice(0, index + 1), id],
      index: index + 1,
    }));
  };

  const update = (id: string, fn: (c: Conversation) => Conversation) =>
    setConversations((list) => list.map((c) => (c.id === id ? fn(c) : c)));

  const requestActivity: ActivityItem[] = received
    .filter((q) => q.status === "PENDING")
    .map((q) => ({
      id: `act-${q.id}`,
      authorId: q.asker.id,
      action: "asked you via SD Wise",
      text: q.question,
      time: timeAgo(q.createdAt, now),
      conversationId: requestChatId(q),
    }));
  const answerActivity: ActivityItem[] = sent
    .filter((q) => q.status === "ANSWERED" && !q.seenAt)
    .map((q) => ({
      id: `act-${q.id}`,
      authorId: q.recipient.id,
      action: "answered you via SD Wise",
      text: q.answer ?? q.question,
      time: timeAgo(q.resolvedAt ?? q.createdAt, now),
      conversationId: sentChatId(q.id),
    }));
  const activity = [...requestActivity, ...answerActivity, ...ACTIVITY];
  const isRead = (item: ActivityItem) =>
    readActivity.includes(item.id) ||
    seenRequests.some((id) => item.id === `act-${id}`);

  const markAllRead = () => {
    setConversations((list) =>
      list.map((c) => (c.unread ? { ...c, unread: 0 } : c)),
    );
    setReadActivity(activity.map((a) => a.id));
    setSeenRequests([...received, ...sent].map((q) => q.id));
    notify("Everything is marked as read");
  };

  const reset = () => {
    setConversations(initialConversations(me.id));
    setReadActivity([]);
    setSeenRequests([]);
    setHistory({ stack: ["c-wise"], index: 0 });
    setSection("chat");
    setQuery("");
    notify("Demo reset");
  };

  const rail: {
    id: Section;
    label: string;
    icon: typeof Bell;
    badge: number;
  }[] = [
    {
      id: "activity",
      label: "Activity",
      icon: Bell,
      badge: activity.filter((a) => !isRead(a)).length,
    },
    {
      id: "chat",
      label: "Chat",
      icon: MessageSquareText,
      badge: unreadOf(all.filter((c) => !c.teamId)),
    },
    {
      id: "teams",
      label: "Teams",
      icon: Users,
      badge: unreadOf(all.filter((c) => c.teamId)),
    },
    { id: "calendar", label: "Calendar", icon: CalendarDays, badge: 0 },
  ];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.request?.question.toLowerCase().includes(q) ||
        c.messages.some((m) => m.text.toLowerCase().includes(q)),
    );
  }, [all, query]);

  const chattingWith = new Set(
    conversations.filter((c) => c.kind === "chat").map((c) => c.memberIds[0]),
  );
  const newChatCandidates = Object.values(MEMBERS).filter(
    (m) => m.id !== me.id && !chattingWith.has(m.id),
  );

  return (
    <ShowSent value={showSent}>
      <div className="flex h-dvh flex-col overflow-hidden bg-[#ebebeb] text-[#242424]">
        <header className="grid h-12 shrink-0 grid-cols-[1fr_minmax(0,36rem)_1fr] items-center gap-2 px-2 sm:px-3">
          <div className="flex items-center gap-1">
            <Image
              src="/logos/teams.svg"
              alt="Microsoft Teams"
              width={24}
              height={24}
              className="mr-1 size-6"
            />
            <span className="hidden items-center sm:flex">
              <IconButton
                label="Back"
                onClick={() => step(-1)}
                disabled={history.index === 0}
              >
                <ChevronLeft className="size-4" />
              </IconButton>
              <IconButton
                label="Forward"
                onClick={() => step(1)}
                disabled={history.index >= history.stack.length - 1}
              >
                <ChevronRight className="size-4" />
              </IconButton>
            </span>
          </div>

          <label className="flex h-8 w-full items-center gap-2 rounded-md bg-white px-3 text-sm text-[#616161] shadow-sm focus-within:ring-2 focus-within:ring-[#5b5fc7]">
            <Search className="size-4 shrink-0" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (section !== "chat" && section !== "teams")
                  setSection("chat");
                setListOpen(true);
              }}
              placeholder="Search people, chats and messages"
              className="w-full min-w-0 bg-transparent text-[#242424] outline-none placeholder:text-[#616161]"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="rounded p-0.5 hover:bg-[#f0f0f0]"
              >
                <X className="size-3.5" />
                <span className="sr-only">Clear search</span>
              </button>
            )}
          </label>

          <div className="flex items-center justify-end gap-1">
            <Popover
              label="Settings and more"
              trigger={<Ellipsis className="size-4" />}
            >
              {(close) => (
                <>
                  <MenuItem
                    icon={<CheckCheck className="size-4" />}
                    onClick={() => {
                      markAllRead();
                      close();
                    }}
                  >
                    Mark all as read
                  </MenuItem>
                  <MenuItem
                    icon={<RotateCcw className="size-4" />}
                    onClick={() => {
                      reset();
                      close();
                    }}
                  >
                    Reset demo
                  </MenuItem>
                </>
              )}
            </Popover>
            <Popover
              label="Your profile"
              triggerClassName="relative inline-flex rounded-full"
              trigger={
                <TeamsAvatar id={me.id} name={me.name} presence={presence} />
              }
            >
              {(close) => (
                <>
                  <div className="flex items-center gap-3 border-b border-[#f0f0f0] px-2.5 pt-2 pb-3">
                    <TeamsAvatar
                      id={me.id}
                      name={me.name}
                      size="lg"
                      presence={presence}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {me.name}
                      </p>
                      <p className="truncate text-xs text-[#616161]">
                        {me.role}
                      </p>
                    </div>
                  </div>
                  <div className="pt-1">
                    {(Object.keys(PRESENCE) as Presence[]).map((p) => (
                      <MenuItem
                        key={p}
                        icon={<PresenceDot presence={p} className="ring-0" />}
                        selected={p === presence}
                        onClick={() => {
                          setPresence(p);
                          close();
                        }}
                      >
                        {PRESENCE[p].label}
                      </MenuItem>
                    ))}
                  </div>
                </>
              )}
            </Popover>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          <nav
            aria-label="Apps"
            className="flex w-[4.25rem] shrink-0 flex-col items-center gap-1 py-1"
          >
            {rail.map(({ id, label, icon: Icon, badge }) => (
              <RailButton
                key={id}
                label={label}
                current={section === id}
                badge={badge}
                onClick={() => {
                  setSection(id);
                  setListOpen(true);
                }}
              >
                <Icon
                  className="size-5"
                  strokeWidth={section === id ? 2.2 : 1.6}
                />
              </RailButton>
            ))}
            <RailButton
              label="SD Wise"
              current={false}
              badge={0}
              onClick={() => open("c-wise")}
            >
              <WiseMark className="size-6" />
            </RailButton>
            <Popover
              label="Apps"
              placement="right"
              triggerClassName="flex w-14 flex-col items-center gap-1 rounded-md py-1.5 text-[10px] text-[#616161] transition-colors hover:bg-white/60 hover:text-[#5b5fc7]"
              trigger={
                <>
                  <span className="flex size-6 items-center justify-center">
                    <LayoutGrid className="size-5" strokeWidth={1.6} />
                  </span>
                  <span aria-hidden>Apps</span>
                </>
              }
            >
              {(close) => (
                <>
                  <p className="px-2.5 pt-1.5 pb-1 text-xs font-semibold text-[#616161]">
                    Apps
                  </p>
                  {APPS.map((app) => (
                    <MenuItem
                      key={app.id}
                      icon={
                        app.logo ? (
                          <Image
                            src={`/logos/${app.logo}.svg`}
                            alt=""
                            width={16}
                            height={16}
                          />
                        ) : (
                          <WiseMark className="size-4 border-0" />
                        )
                      }
                      onClick={() => {
                        close();
                        if (app.id === "wise") open("c-wise");
                        else notify(`${app.name} isn't part of this demo`);
                      }}
                    >
                      {app.name}
                    </MenuItem>
                  ))}
                </>
              )}
            </Popover>
          </nav>

          <div className="flex min-w-0 flex-1 overflow-hidden rounded-tl-lg bg-white shadow-sm">
            {section === "calendar" ? (
              <CalendarPane nameOf={nameOf} onJoin={setCall} />
            ) : (
              <>
                <aside
                  className={`w-full shrink-0 flex-col border-r border-[#e0e0e0] bg-[#f5f5f5] md:flex md:w-80 ${
                    listOpen ? "flex" : "hidden"
                  }`}
                >
                  {section === "activity" && (
                    <ActivityList
                      items={activity}
                      isRead={isRead}
                      nameOf={nameOf}
                      onOpen={(item) => {
                        setReadActivity((r) => [...r, item.id]);
                        open(item.conversationId);
                      }}
                    />
                  )}
                  {section === "chat" && (
                    <ChatList
                      items={filtered.filter((c) => !c.teamId)}
                      activeId={activeId}
                      nameOf={nameOf}
                      onOpen={open}
                      newChat={
                        <Popover
                          label="New chat"
                          trigger={<SquarePen className="size-4" />}
                        >
                          {(close) => (
                            <>
                              <p className="px-2.5 pt-1.5 pb-1 text-xs font-semibold text-[#616161]">
                                Start a chat with
                              </p>
                              {newChatCandidates.map((m) => (
                                <MenuItem
                                  key={m.id}
                                  icon={
                                    <TeamsAvatar
                                      id={m.id}
                                      name={m.name}
                                      size="sm"
                                    />
                                  }
                                  onClick={() => {
                                    startChat(m.id);
                                    close();
                                  }}
                                >
                                  {m.name}
                                </MenuItem>
                              ))}
                              {newChatCandidates.length === 0 && (
                                <p className="px-2.5 py-2 text-sm text-[#616161]">
                                  You already chat with everyone.
                                </p>
                              )}
                            </>
                          )}
                        </Popover>
                      }
                    />
                  )}
                  {section === "teams" && (
                    <TeamList
                      items={filtered}
                      activeId={activeId}
                      onOpen={open}
                    />
                  )}
                </aside>
                <section
                  className={`min-w-0 flex-1 flex-col ${listOpen ? "hidden md:flex" : "flex"}`}
                >
                  {active && (
                    <ConversationPane
                      key={active.id}
                      me={me}
                      conversation={active}
                      team={TEAMS.find((t) => t.id === active.teamId)}
                      nameOf={nameOf}
                      onBack={() => setListOpen(true)}
                      onCall={setCall}
                      onUpdate={(fn) => update(active.id, fn)}
                    />
                  )}
                </section>
              </>
            )}
          </div>
        </div>

        {call && <CallOverlay call={call} onEnd={() => setCall(null)} />}
      </div>
    </ShowSent>
  );
}

function RailButton({
  label,
  current,
  badge,
  onClick,
  children,
}: {
  label: string;
  current: boolean;
  badge: number;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={current ? "page" : undefined}
      className={`relative flex w-14 flex-col items-center gap-1 rounded-md py-1.5 text-[10px] transition-colors ${
        current
          ? "font-semibold text-[#5b5fc7]"
          : "text-[#616161] hover:bg-white/60 hover:text-[#5b5fc7]"
      }`}
    >
      {current && (
        <span className="absolute top-2 bottom-2 -left-1 w-[3px] rounded-full bg-[#5b5fc7]" />
      )}
      <span className="relative flex size-6 items-center justify-center">
        {children}
        {badge > 0 && (
          <span className="absolute -top-1.5 -right-2.5 min-w-4 rounded-full bg-[#c4314b] px-1 text-center text-[10px] leading-4 font-semibold text-white">
            {badge}
          </span>
        )}
      </span>
      {label}
    </button>
  );
}

function ListHeader({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex h-14 shrink-0 items-center justify-between px-4">
      <h2 className="text-lg font-bold">{title}</h2>
      <div className="flex items-center gap-0.5">{children}</div>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
}: {
  active: boolean;
  onClick: () => void;
}) {
  return (
    <IconButton
      label={active ? "Show all" : "Show unread only"}
      active={active}
      onClick={onClick}
    >
      <ListFilter className="size-4" />
    </IconButton>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="px-3 pt-3 pb-1 text-xs font-semibold text-[#616161] first:pt-0">
      {children}
    </p>
  );
}

function EmptyList({ children }: { children: ReactNode }) {
  return (
    <p className="px-3 py-10 text-center text-sm text-[#616161]">{children}</p>
  );
}

function preview(c: Conversation, nameOf: (id: string) => string) {
  if (c.request) {
    return c.request.status === "PENDING"
      ? `Asked you: ${c.request.question}`
      : `${requestStatus(c.request).label} · ${c.request.question}`;
  }
  if (c.sent) {
    const { status, question, answer } = c.sent;
    if (status === "ANSWERED") return answer ?? question;
    return status === "PENDING"
      ? `You asked: ${question}`
      : `Declined · ${question}`;
  }
  const last = c.messages.at(-1);
  if (!last) return "No messages yet";
  const author =
    last.authorId === "me"
      ? "You: "
      : c.kind === "group"
        ? `${nameOf(last.authorId).split(" ")[0]}: `
        : "";
  const body = last.file
    ? `📎 ${last.file.name}`
    : last.wise
      ? (last.wise.text ?? "Sent an answer card")
      : last.text;
  return `${author}${body}`;
}

function ChatList({
  items,
  activeId,
  nameOf,
  onOpen,
  newChat,
}: {
  items: Conversation[];
  activeId: string;
  nameOf: (id: string) => string;
  onOpen: (id: string) => void;
  newChat: ReactNode;
}) {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const shown = unreadOnly ? items.filter((c) => c.unread) : items;
  const pinned = shown.filter((c) => c.kind === "wise");
  const requests = shown.filter((c) => c.kind === "request");
  const asked = shown.filter((c) => c.kind === "sent");
  const recent = shown.filter(
    (c) => c.kind !== "wise" && c.kind !== "request" && c.kind !== "sent",
  );

  const row = (c: Conversation) => {
    const current = c.id === activeId;
    const firstId = c.memberIds[0] ?? WISE_ID;
    const time = c.messages.at(c.request ? 0 : -1)?.time;
    return (
      <button
        key={c.id}
        type="button"
        onClick={() => onOpen(c.id)}
        className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors ${
          current ? "bg-white shadow-sm" : "hover:bg-white/70"
        }`}
      >
        {c.kind === "group" ? (
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#e8ebfa] text-[#5b5fc7]">
            <Users className="size-4" />
          </span>
        ) : c.kind === "request" || c.kind === "sent" ? (
          <RequestAvatar id={firstId} name={c.title} />
        ) : (
          <TeamsAvatar
            id={firstId}
            name={c.title}
            presence={MEMBERS[firstId]?.presence}
          />
        )}
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <span
              className={`truncate text-sm ${c.unread ? "font-bold" : "font-medium"}`}
            >
              {c.title}
            </span>
            <span className="shrink-0 text-[11px] text-[#616161]">{time}</span>
          </span>
          <span className="flex items-center gap-2">
            <span
              className={`truncate text-xs ${c.unread ? "font-semibold text-[#242424]" : "text-[#616161]"}`}
            >
              {preview(c, nameOf)}
            </span>
            {!!c.unread && (
              <span className="ml-auto flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-[#5b5fc7] px-1 text-[10px] font-semibold text-white">
                {c.unread}
              </span>
            )}
          </span>
        </span>
      </button>
    );
  };

  return (
    <>
      <ListHeader title="Chat">
        <FilterButton
          active={unreadOnly}
          onClick={() => setUnreadOnly((v) => !v)}
        />
        {newChat}
      </ListHeader>
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {pinned.length > 0 && (
          <div>
            <SectionLabel>Pinned</SectionLabel>
            {pinned.map(row)}
          </div>
        )}
        {requests.length > 0 && (
          <div>
            <SectionLabel>Questions from SD Wise</SectionLabel>
            {requests.map(row)}
          </div>
        )}
        {asked.length > 0 && (
          <div>
            <SectionLabel>Your questions</SectionLabel>
            {asked.map(row)}
          </div>
        )}
        {recent.length > 0 && (
          <div>
            <SectionLabel>Recent</SectionLabel>
            {recent.map(row)}
          </div>
        )}
        {shown.length === 0 && (
          <EmptyList>
            {unreadOnly ? "You're all caught up." : "No chats match."}
          </EmptyList>
        )}
      </div>
    </>
  );
}

function TeamList({
  items,
  activeId,
  onOpen,
}: {
  items: Conversation[];
  activeId: string;
  onOpen: (id: string) => void;
}) {
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const visible = TEAMS.filter((team) =>
    items.some((c) => c.teamId === team.id),
  );

  return (
    <>
      <ListHeader title="Teams" />
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {visible.map((team) => {
          const expanded = !collapsed.includes(team.id);
          return (
            <div key={team.id} className="mb-2">
              <button
                type="button"
                onClick={() =>
                  setCollapsed((list) =>
                    expanded
                      ? [...list, team.id]
                      : list.filter((id) => id !== team.id),
                  )
                }
                aria-expanded={expanded}
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-white/70"
              >
                <ChevronRight
                  className={`size-3.5 text-[#616161] transition-transform ${expanded ? "rotate-90" : ""}`}
                />
                <span
                  className="flex size-8 items-center justify-center rounded-md text-xs font-bold text-white"
                  style={{ backgroundColor: team.color }}
                >
                  {team.name
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .slice(0, 2)}
                </span>
                <span className="text-sm font-semibold">{team.name}</span>
              </button>
              {expanded &&
                items
                  .filter((c) => c.teamId === team.id)
                  .map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onOpen(c.id)}
                      className={`flex w-full items-center gap-2 rounded-md py-1.5 pr-3 pl-[3.25rem] text-left text-sm transition-colors ${
                        c.id === activeId
                          ? "bg-white font-semibold shadow-sm"
                          : "text-[#424242] hover:bg-white/70"
                      }`}
                    >
                      <Hash className="size-3.5 text-[#616161]" />
                      {c.title}
                    </button>
                  ))}
            </div>
          );
        })}
        {visible.length === 0 && <EmptyList>No channels match.</EmptyList>}
      </div>
    </>
  );
}

function ActivityList({
  items,
  isRead,
  nameOf,
  onOpen,
}: {
  items: ActivityItem[];
  isRead: (item: ActivityItem) => boolean;
  nameOf: (id: string) => string;
  onOpen: (item: ActivityItem) => void;
}) {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const shown = unreadOnly ? items.filter((a) => !isRead(a)) : items;

  return (
    <>
      <ListHeader title="Activity">
        <FilterButton
          active={unreadOnly}
          onClick={() => setUnreadOnly((v) => !v)}
        />
      </ListHeader>
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {shown.map((item) => {
          const unread = !isRead(item);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onOpen(item)}
              className="flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left hover:bg-white/70"
            >
              {item.conversationId.startsWith("q-") ||
              item.conversationId.startsWith("s-") ? (
                <RequestAvatar
                  id={item.authorId}
                  name={nameOf(item.authorId)}
                />
              ) : (
                <TeamsAvatar
                  id={item.authorId}
                  name={nameOf(item.authorId)}
                  presence={MEMBERS[item.authorId]?.presence}
                />
              )}
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm">
                    <span className={unread ? "font-bold" : "font-semibold"}>
                      {nameOf(item.authorId)}
                    </span>{" "}
                    <span className="text-[#616161]">{item.action}</span>
                  </span>
                  <span className="shrink-0 text-[11px] text-[#616161]">
                    {item.time}
                  </span>
                </span>
                <span className="mt-0.5 flex items-center gap-2">
                  <span className="truncate text-xs text-[#424242]">
                    {item.text}
                  </span>
                  {unread && (
                    <span className="ml-auto size-2 shrink-0 rounded-full bg-[#5b5fc7]" />
                  )}
                </span>
              </span>
            </button>
          );
        })}
        {shown.length === 0 && (
          <EmptyList>You&apos;re all caught up.</EmptyList>
        )}
      </div>
    </>
  );
}
