import type { InboxItem, KnowledgeSource } from "@/lib/graph/types";

// Mock Microsoft Teams workspace. Only the SD Wise chat is live; everything
// else is fixed demo content around the people in lib/graph/fixtures.

export const WISE_ID = "sd-wise";

export type Presence = "available" | "busy" | "away" | "offline";

export type Member = { id: string; name: string; role: string };

export const MEMBERS: Record<string, Member & { presence: Presence }> = {
  "p-filip": {
    id: "p-filip",
    name: "Filip Dierckx",
    role: "Payroll operations lead",
    presence: "busy",
  },
  "p-kobe": {
    id: "p-kobe",
    name: "Kobe Verdonck",
    role: "Platform lead",
    presence: "available",
  },
  "p-an": {
    id: "p-an",
    name: "An Maes",
    role: "Payroll legal expert",
    presence: "available",
  },
  "p-lotte": {
    id: "p-lotte",
    name: "Lotte Janssens",
    role: "Financial controller",
    presence: "away",
  },
  "p-sofie": {
    id: "p-sofie",
    name: "Sofie Peeters",
    role: "HR business partner",
    presence: "available",
  },
  "p-bram": {
    id: "p-bram",
    name: "Bram De Smet",
    role: "Account manager",
    presence: "offline",
  },
  "p-pieter": {
    id: "p-pieter",
    name: "Pieter Claes",
    role: "Support team lead",
    presence: "busy",
  },
  "p-dario": {
    id: "p-dario",
    name: "Dario",
    role: "Product lead",
    presence: "available",
  },
};

export type WiseReply = {
  text: string | null;
  facts: { id: string; title: string; source: KnowledgeSource }[];
  question: string;
  moreAvailable: boolean;
  askColleague: boolean;
};

export type Reaction = { emoji: string; count: number; mine?: boolean };

export type Message = {
  id: string;
  authorId: string;
  text: string;
  time: string;
  reactions?: Reaction[];
  wise?: WiseReply;
  request?: InboxItem;
  file?: { name: string; size: string };
  // Channel posts: replies before the demo started, plus the thread so far.
  replies?: number;
  thread?: Message[];
};

export type Conversation = {
  id: string;
  // "request": a question routed to you by SD Wise, one chat per question.
  kind: "wise" | "request" | "chat" | "group" | "channel";
  title: string;
  memberIds: string[];
  messages: Message[];
  unread?: number;
  teamId?: string;
  request?: InboxItem;
};

export type Team = {
  id: string;
  name: string;
  color: string;
  channelIds: string[];
};

export const WISE_SUGGESTIONS = [
  "When is the payroll cut-off in December?",
  "Is there a deploy freeze over the holidays?",
  "Who owns the Belgian payroll legal updates?",
];

export const CONVERSATIONS: Conversation[] = [
  {
    id: "c-wise",
    kind: "wise",
    title: "SD Wise",
    memberIds: [WISE_ID],
    messages: [
      {
        id: "m-wise-1",
        authorId: WISE_ID,
        time: "09:00",
        text: "Hi! I'm SD Wise, the company brain. Ask me anything about SD Worx. I answer with what you're allowed to see, and tell you who knows more.",
      },
    ],
  },
  {
    id: "c-filip",
    kind: "chat",
    title: "Filip Dierckx",
    memberIds: ["p-filip"],
    unread: 2,
    messages: [
      {
        id: "m-f-1",
        authorId: "p-filip",
        time: "11:42",
        text: "Hey, quick one: are we still on track for the December payroll run?",
      },
      {
        id: "m-f-2",
        authorId: "me",
        time: "11:44",
        text: "As far as I know, yes. When exactly is the cut-off again?",
      },
      {
        id: "m-f-3",
        authorId: "p-filip",
        time: "11:51",
        text: "I'll double-check with An, the legal changes might move it.",
      },
      {
        id: "m-f-4",
        authorId: "p-filip",
        time: "11:52",
        text: "Or just ask SD Wise 😄",
        reactions: [{ emoji: "😂", count: 1 }],
      },
    ],
  },
  {
    id: "c-payroll-q4",
    kind: "group",
    title: "Payroll Q4 launch",
    memberIds: ["p-filip", "p-an", "p-lotte"],
    unread: 5,
    messages: [
      {
        id: "m-g-1",
        authorId: "p-lotte",
        time: "Yesterday",
        text: "Finance needs the final headcount numbers by the 15th to close the books.",
      },
      {
        id: "m-g-2",
        authorId: "p-an",
        time: "Yesterday",
        text: "Heads-up: the new Belgian holiday pay rules apply from January. I'm writing a summary for the team.",
        reactions: [{ emoji: "👍", count: 3 }],
      },
      {
        id: "m-g-3",
        authorId: "p-filip",
        time: "10:05",
        text: "Thanks An! Can you put it in the Payroll channel so support sees it too?",
      },
    ],
  },
  {
    id: "c-kobe",
    kind: "chat",
    title: "Kobe Verdonck",
    memberIds: ["p-kobe"],
    messages: [
      {
        id: "m-k-1",
        authorId: "p-kobe",
        time: "Mon",
        text: "Reminder that platform changes need a sign-off from me in the last two weeks of December.",
      },
      {
        id: "m-k-2",
        authorId: "me",
        time: "Mon",
        text: "Noted, I'll plan the release before that.",
        reactions: [{ emoji: "❤️", count: 1 }],
      },
    ],
  },
  {
    id: "c-sofie",
    kind: "chat",
    title: "Sofie Peeters",
    memberIds: ["p-sofie"],
    messages: [
      {
        id: "m-s-1",
        authorId: "p-sofie",
        time: "Mon",
        text: "Welcome lunch for the new joiners is on Thursday at 12:30, you're invited!",
      },
    ],
  },
  {
    id: "c-bram",
    kind: "chat",
    title: "Bram De Smet",
    memberIds: ["p-bram"],
    messages: [
      {
        id: "m-b-1",
        authorId: "p-bram",
        time: "Fri",
        text: "The client renewal call went well. They asked about our payroll SLA during the holidays, who would know?",
      },
    ],
  },
  {
    id: "ch-payroll-general",
    kind: "channel",
    teamId: "t-payroll",
    title: "General",
    memberIds: ["p-filip", "p-an", "p-lotte", "p-pieter"],
    messages: [
      {
        id: "m-pg-1",
        authorId: "p-an",
        time: "Yesterday",
        text: "📌 Summary of the Belgian holiday pay changes for 2027 is now in the Files tab. Please read before answering client tickets.",
        reactions: [
          { emoji: "👍", count: 6 },
          { emoji: "🙏", count: 2 },
        ],
        replies: 4,
      },
      {
        id: "m-pg-2",
        authorId: "p-pieter",
        time: "09:12",
        text: "Support is getting a lot of questions about the December cut-off. Can we pin the date somewhere?",
        replies: 2,
      },
    ],
  },
  {
    id: "ch-payroll-releases",
    kind: "channel",
    teamId: "t-payroll",
    title: "Releases",
    memberIds: ["p-filip", "p-kobe"],
    messages: [
      {
        id: "m-pr-1",
        authorId: "p-kobe",
        time: "Mon",
        text: "Release 26.10 is live: faster payslip exports and the new holiday calendar.",
        reactions: [{ emoji: "🎉", count: 8 }],
        replies: 3,
      },
    ],
  },
  {
    id: "ch-wise-general",
    kind: "channel",
    teamId: "t-wise",
    title: "General",
    memberIds: ["p-dario", "p-kobe", "p-filip"],
    messages: [
      {
        id: "m-wg-1",
        authorId: "p-dario",
        time: "Tue",
        text: "SD Wise is now available as an app in Teams. Pin it from the left rail and ask it anything!",
        reactions: [
          { emoji: "🚀", count: 12 },
          { emoji: "👏", count: 5 },
        ],
        replies: 7,
      },
    ],
  },
  {
    id: "ch-wise-feedback",
    kind: "channel",
    teamId: "t-wise",
    title: "Feedback",
    memberIds: ["p-dario", "p-sofie"],
    messages: [
      {
        id: "m-wf-1",
        authorId: "p-sofie",
        time: "Wed",
        text: "Love that it tells me who to ask when it can't share something. Saved me three emails today.",
        reactions: [{ emoji: "❤️", count: 4 }],
        replies: 1,
      },
    ],
  },
];

export const TEAMS: Team[] = [
  {
    id: "t-payroll",
    name: "SD Worx Payroll",
    color: "#006dd8",
    channelIds: ["ch-payroll-general", "ch-payroll-releases"],
  },
  {
    id: "t-wise",
    name: "SD Wise pilot",
    color: "#5b5fc7",
    channelIds: ["ch-wise-general", "ch-wise-feedback"],
  },
];

export type ActivityItem = {
  id: string;
  authorId: string;
  action: string;
  text: string;
  time: string;
  conversationId: string;
};

export const ACTIVITY: ActivityItem[] = [
  {
    id: "a-1",
    authorId: "p-filip",
    action: "mentioned you in Payroll Q4 launch",
    text: "@you can you confirm the cut-off date for the client?",
    time: "11:55",
    conversationId: "c-payroll-q4",
  },
  {
    id: "a-2",
    authorId: "p-pieter",
    action: "replied in SD Worx Payroll › General",
    text: "Can we pin the date somewhere?",
    time: "09:12",
    conversationId: "ch-payroll-general",
  },
  {
    id: "a-3",
    authorId: "p-kobe",
    action: "reacted ❤️ to your message",
    text: "Noted, I'll plan the release before that.",
    time: "Mon",
    conversationId: "c-kobe",
  },
  {
    id: "a-4",
    authorId: "p-dario",
    action: "posted in SD Wise pilot › General",
    text: "SD Wise is now available as an app in Teams.",
    time: "Tue",
    conversationId: "ch-wise-general",
  },
];

export const MEETINGS = [
  {
    id: "e-1",
    title: "Payroll stand-up",
    start: "09:30",
    end: "09:45",
    organizerId: "p-filip",
  },
  {
    id: "e-2",
    title: "SD Wise demo",
    start: "11:00",
    end: "12:00",
    organizerId: "p-dario",
  },
  {
    id: "e-3",
    title: "Welcome lunch",
    start: "12:30",
    end: "13:30",
    organizerId: "p-sofie",
  },
  {
    id: "e-4",
    title: "December release planning",
    start: "15:00",
    end: "16:00",
    organizerId: "p-kobe",
  },
];

export const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "🙏"];

export const EMOJIS = [
  "😀",
  "😂",
  "😊",
  "😍",
  "🤔",
  "😅",
  "😎",
  "🙌",
  "👍",
  "👏",
  "🙏",
  "💪",
  "🎉",
  "🚀",
  "✅",
  "❤️",
  "🔥",
  "☕",
];

// `logo` names a file in public/logos.
export const FILES = [
  {
    name: "Holiday pay 2027 summary.docx",
    logo: "word",
    authorId: "p-an",
    time: "Yesterday",
  },
  {
    name: "December payroll calendar.xlsx",
    logo: "excel",
    authorId: "p-filip",
    time: "Mon",
  },
  {
    name: "Headcount Q4.xlsx",
    logo: "excel",
    authorId: "p-lotte",
    time: "Mon",
  },
  {
    name: "Release 26.10 notes.docx",
    logo: "word",
    authorId: "p-kobe",
    time: "Mon",
  },
  {
    name: "SD Wise pilot kick-off.pptx",
    logo: "powerpoint",
    authorId: "p-dario",
    time: "Tue",
  },
];

export const APPS = [
  { id: "wise", name: "SD Wise", description: "Your company brain" },
  { id: "planner", name: "Planner", logo: "microsoft" },
  { id: "onedrive", name: "OneDrive", logo: "onedrive" },
  { id: "onenote", name: "OneNote", logo: "onenote" },
  { id: "sharepoint", name: "SharePoint", logo: "sharepoint" },
];

export const CANNED_REPLIES = [
  "Good question, let me check and get back to you.",
  "Have you tried asking SD Wise? It usually knows 😉",
  "Thanks! I'll look at it after my next meeting.",
  "👍",
  "Makes sense. Let's sync tomorrow morning.",
];
