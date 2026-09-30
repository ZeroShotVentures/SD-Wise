import type {
  Department,
  KnowledgeSource,
  QuestionKind,
  QuestionStatus,
  ShareScope,
} from "@/generated/prisma/enums";

export type { Department, KnowledgeSource, QuestionStatus, ShareScope };

// Shapes mirror prisma/schema.prisma so the mock service can be swapped for a
// Prisma-backed one. Fields marked "proposal" don't exist in the schema yet.

// proposal: the schema enum only has slack, email and google_meet.
export type IntegrationKind =
  | "slack"
  | "teams"
  | "outlook"
  | "gmail"
  | "google_meet"
  | "teams_meetings"
  | "zoom";

export type Integration = {
  id: string;
  type: IntegrationKind;
  connected: boolean; // proposal
  connectedAt: string | null; // proposal
};

export type Person = {
  id: string;
  name: string; // proposal: Person has no name without a User
  role: string;
  department: Department;
};

// proposal: Visibility and owners. Owners were part of the conversation the
// node came from; access = owners + anyone they shared it with.
export type Visibility = "PRIVATE" | "PUBLIC";

export type KnowledgeNode = {
  id: string;
  title: string; // proposal: short label for the graph
  content: string;
  contentSummary: string;
  source: KnowledgeSource;
  integrationId: string | null; // null for answers written in SD Wise
  sourceDescription: string;
  visibility: Visibility;
  ownerIds: string[];
  accessIds: string[];
  createdAt: string;
};

// proposal: edges carry meaning ("updates", "relates to", ...).
export type EdgeKind = "RELATES_TO" | "UPDATES" | "DEPENDS_ON" | "ANSWERS";

export type KnowledgeEdge = {
  id: string;
  sourceId: string;
  targetId: string;
  kind: EdgeKind;
  description: string;
};

// Questions and access requests routed between people. Stored in the
// Question table; dates are ISO strings so they can cross to the client.
export type QueryStatus = QuestionStatus;

export type Query = {
  id: string;
  kind: QuestionKind;
  askerId: string;
  recipientId: string;
  question: string;
  // QUESTION: nodes the search matched. ACCESS: the node being requested.
  nodeIds: string[];
  status: QueryStatus;
  answer: string | null;
  shareScope: ShareScope | null;
  answerNodeId: string | null;
  createdAt: string;
  resolvedAt: string | null;
  seenAt: string | null;
};

// What a viewer receives. Locked nodes never carry content to the client.
export type NodeView =
  | (Omit<KnowledgeNode, "accessIds"> & { locked: false; isNew: boolean })
  | {
      id: string;
      locked: true;
      source: KnowledgeSource;
      integrationId: string | null;
      ownerIds: string[];
      createdAt: string;
      isNew: false;
    };

export type EdgeView =
  | (KnowledgeEdge & { locked: false })
  | { id: string; sourceId: string; targetId: string; locked: true };

export type GraphView = {
  me: Person;
  people: Person[];
  integrations: Integration[];
  nodes: NodeView[];
  edges: EdgeView[];
};

export type SuggestedPerson = {
  person: Person;
  nodeIds: string[];
  reason: string;
};

export type AskResult = {
  question: string;
  // Order the search touched nodes, for the animation.
  visited: string[];
  hits: string[];
  answer: { text: string; nodeIds: string[] } | null;
  people: SuggestedPerson[];
};

export type InboxItem = Query & {
  asker: Person;
  recipient: Person;
  suggestedAnswer: string | null;
  // For access requests: what the node is, visible to the recipient only.
  nodeTitles: string[];
};
