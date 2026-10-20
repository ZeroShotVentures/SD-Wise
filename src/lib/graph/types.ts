import type {
  Department,
  EdgeKind,
  IntegrationType,
  KnowledgeSource,
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
// the people they answered with it in SD Wise (see answers.ts).
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

// Questions between people. Stored in the Question table; dates are ISO
// strings so they can cross to the client.
export type QueryStatus = QuestionStatus;

export type Query = {
  id: string;
  askerId: string;
  recipientId: string;
  question: string;
  // Nodes the search matched.
  nodeIds: string[];
  // Sent by SD Wise to the owner of matching private facts, rather than to a
  // colleague the asker picked.
  routed: boolean;
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

// `hits` and `answer` only hold nodes the viewer can see. `lockedHits` are
// the locked nodes that matched, for lighting them up: ids the graph already
// shows as locked, never their content or owners.
export type AskResult = {
  question: string;
  // Order the search touched nodes, for the animation.
  visited: string[];
  hits: string[];
  lockedHits: string[];
  answer: { text: string; nodeIds: string[] } | null;
  // Private facts match: offer to send the question to whoever knows them.
  moreAvailable: boolean;
  // Nothing answers it and nobody's locked facts match: offer to send the
  // question to a colleague the asker picks.
  askColleague: boolean;
};

export type InboxItem = Query & {
  asker: Person;
  recipient: Person;
  suggestedAnswer: string | null;
  // The matched facts the viewer can see, by title.
  nodeTitles: string[];
  // Whether the recipient may answer it for everyone (see `publishable`).
  canShareAll: boolean;
};
