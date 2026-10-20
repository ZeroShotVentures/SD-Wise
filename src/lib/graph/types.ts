import type {
  Department,
  EdgeKind,
  IntegrationType,
  KnowledgeSource,
  QuestionKind,
  QuestionStatus,
  ShareScope,
  Visibility,
} from "@/generated/prisma/enums";

export type {
  Department,
  EdgeKind,
  KnowledgeSource,
  QuestionStatus,
  ShareScope,
  Visibility,
};

// The graph as the app works with it. store.ts maps the rows in
// prisma/schema.prisma to these shapes; dates are ISO strings so they can
// cross to the client.

export type IntegrationKind = IntegrationType;

export type Integration = {
  id: string;
  type: IntegrationKind;
  connected: boolean;
  connectedAt: string | null;
};

export type IntegrationStats = Integration & { facts: number; people: number };

export type Person = {
  id: string;
  name: string;
  role: string;
  department: Department;
};

// Owners were part of the conversation the node came from; access = owners +
// anyone they shared it with in SD Wise.
export type KnowledgeNode = {
  id: string;
  title: string;
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

// A node as written in the fixtures: access is never set by hand, it starts
// as the owners (see fixtures.ts).
export type NodeFixture = Omit<KnowledgeNode, "accessIds">;

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

// What a viewer receives. Locked nodes never carry content or owners to the
// client: who knows something is private too.
export type NodeView =
  | (Omit<KnowledgeNode, "accessIds"> & { locked: false; isNew: boolean })
  | {
      id: string;
      locked: true;
      source: KnowledgeSource;
      integrationId: string | null;
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

// Only nodes the viewer can see. `moreAvailable` says locked nodes matched
// too, without saying which, whose or how many.
export type AskResult = {
  question: string;
  // Order the search touched nodes, for the animation.
  visited: string[];
  hits: string[];
  answer: { text: string; nodeIds: string[] } | null;
  moreAvailable: boolean;
};

export type InboxItem = Query & {
  asker: Person;
  recipient: Person;
  suggestedAnswer: string | null;
  // For access requests: what the node is, visible to the recipient only.
  nodeTitles: string[];
};
