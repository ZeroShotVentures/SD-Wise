import type { EdgeKind, IntegrationKind, KnowledgeSource } from "./types";

export type IntegrationCategory = "Chat" | "Email" | "Meetings" | "Documents";

export const CATEGORIES: IntegrationCategory[] = [
  "Chat",
  "Email",
  "Meetings",
  "Documents",
];

export type Suite = "microsoft" | "google";

// One sign-in covers every app in a suite: Microsoft Entra ID consents to
// Microsoft Graph permissions, Google to Workspace scopes.
export const SUITES: Record<
  Suite,
  { label: string; logo: string; provider: string; api: string }
> = {
  microsoft: {
    label: "Microsoft 365",
    logo: "microsoft",
    provider: "Microsoft",
    api: "Microsoft Graph",
  },
  google: {
    label: "Google Workspace",
    logo: "google",
    provider: "Google",
    api: "Google Workspace",
  },
};

// `logo` names a file in public/logos. `scopes` are the read-only
// permissions the provider asks the user to grant.
export const INTEGRATIONS: Record<
  IntegrationKind,
  {
    label: string;
    category: IntegrationCategory;
    description: string;
    logo: string;
    suite?: Suite;
    provider: string;
    scopes: string[];
    // Logos of the file types an integration reads, e.g. Word in SharePoint.
    includes?: string[];
  }
> = {
  teams: {
    label: "Microsoft Teams",
    category: "Chat",
    description: "Team channels and one-on-one chats.",
    logo: "teams",
    suite: "microsoft",
    provider: "Microsoft",
    scopes: ["Chat.Read", "ChannelMessage.Read.All", "Team.ReadBasic.All"],
  },
  slack: {
    label: "Slack",
    category: "Chat",
    description: "Channels and direct messages you're part of.",
    logo: "slack",
    provider: "Slack",
    scopes: ["channels:history", "groups:history", "im:history", "users:read"],
  },
  outlook: {
    label: "Outlook",
    category: "Email",
    description: "Email threads, read with the same rights as your mailbox.",
    logo: "outlook",
    suite: "microsoft",
    provider: "Microsoft",
    scopes: ["Mail.Read", "User.ReadBasic.All"],
  },
  gmail: {
    label: "Gmail",
    category: "Email",
    description: "Email threads from Google Workspace.",
    logo: "gmail",
    suite: "google",
    provider: "Google",
    scopes: ["gmail.readonly"],
  },
  teams_meetings: {
    label: "Teams meetings",
    category: "Meetings",
    description: "Transcripts of recorded Teams meetings.",
    logo: "teams",
    suite: "microsoft",
    provider: "Microsoft",
    scopes: ["OnlineMeetings.Read", "OnlineMeetingTranscript.Read.All"],
  },
  google_meet: {
    label: "Google Meet",
    category: "Meetings",
    description: "Transcripts of Google Meet calls.",
    logo: "google-meet",
    suite: "google",
    provider: "Google",
    scopes: ["meetings.space.readonly"],
  },
  zoom: {
    label: "Zoom",
    category: "Meetings",
    description: "Cloud recording transcripts from Zoom.",
    logo: "zoom",
    provider: "Zoom",
    scopes: ["cloud_recording:read"],
  },
  sharepoint: {
    label: "SharePoint",
    category: "Documents",
    description: "Team sites, pages and the files stored in them.",
    logo: "sharepoint",
    suite: "microsoft",
    provider: "Microsoft",
    scopes: ["Sites.Read.All"],
    includes: ["word", "excel", "powerpoint"],
  },
  onedrive: {
    label: "OneDrive",
    category: "Documents",
    description: "Files you own and files shared with you.",
    logo: "onedrive",
    suite: "microsoft",
    provider: "Microsoft",
    scopes: ["Files.Read.All"],
    includes: ["word", "excel", "powerpoint"],
  },
  onenote: {
    label: "OneNote",
    category: "Documents",
    description: "Notebooks you and your team keep.",
    logo: "onenote",
    suite: "microsoft",
    provider: "Microsoft",
    scopes: ["Notes.Read.All"],
  },
  google_drive: {
    label: "Google Drive",
    category: "Documents",
    description: "Docs, Sheets and Slides shared with you.",
    logo: "google-drive",
    suite: "google",
    provider: "Google",
    scopes: ["drive.readonly"],
  },
  notion: {
    label: "Notion",
    category: "Documents",
    description: "Pages and databases in your workspace.",
    logo: "notion",
    provider: "Notion",
    scopes: ["read_content"],
  },
  confluence: {
    label: "Confluence",
    category: "Documents",
    description: "Spaces and pages your team writes.",
    logo: "confluence",
    provider: "Atlassian",
    scopes: ["read:confluence-content.all"],
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

export const ZOOM = { min: 0.05, max: 4, step: 1.5 } as const;

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
