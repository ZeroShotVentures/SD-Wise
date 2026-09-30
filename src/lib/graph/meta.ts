import type { EdgeKind, IntegrationKind, KnowledgeSource } from "./types";

export const INTEGRATIONS: Record<
  IntegrationKind,
  { label: string; category: string; description: string; mark: string }
> = {
  slack: {
    label: "Slack",
    category: "Chat",
    description: "Channels and direct messages you're part of.",
    mark: "#4a154b",
  },
  teams: {
    label: "Microsoft Teams",
    category: "Chat",
    description: "Team channels and one-on-one chats.",
    mark: "#5059c9",
  },
  outlook: {
    label: "Outlook",
    category: "Email",
    description: "Email threads, read with the same rights as your mailbox.",
    mark: "#0a64d6",
  },
  gmail: {
    label: "Gmail",
    category: "Email",
    description: "Email threads from Google Workspace.",
    mark: "#ea4335",
  },
  teams_meetings: {
    label: "Teams meetings",
    category: "Meetings",
    description: "Transcripts of recorded Teams meetings.",
    mark: "#464eb8",
  },
  google_meet: {
    label: "Google Meet",
    category: "Meetings",
    description: "Transcripts of Google Meet calls.",
    mark: "#00897b",
  },
  zoom: {
    label: "Zoom",
    category: "Meetings",
    description: "Cloud recording transcripts from Zoom.",
    mark: "#2d8cff",
  },
};

export const SOURCES: Record<
  KnowledgeSource,
  { label: string; color: string }
> = {
  MESSAGE: { label: "Chat", color: "#006dd8" },
  MEETING: { label: "Meeting", color: "#ffbe00" },
  EMAIL: { label: "Email", color: "#f1002f" },
  DOCUMENT: { label: "Document", color: "#8fa3b3" },
  OTHER: { label: "Answer", color: "#2fd6a3" },
};

export const EDGE_KINDS: Record<EdgeKind, string> = {
  RELATES_TO: "Relates to",
  UPDATES: "Updates",
  DEPENDS_ON: "Depends on",
  ANSWERS: "Answers",
};

export const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export const timeAgo = (iso: string, now = Date.now()) => {
  const minutes = Math.round((now - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return dateFormat.format(new Date(iso));
};
