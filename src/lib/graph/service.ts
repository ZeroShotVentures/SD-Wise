import "server-only";
import { canSee, toEdgeView, toNodeView } from "./access";
import { answerFor, draftAnswer, searchGraph } from "./ai";
import * as fixtures from "./fixtures";
import type {
  AskResult,
  GraphView,
  InboxItem,
  Integration,
  KnowledgeEdge,
  KnowledgeNode,
  Person,
  Query,
  ShareScope,
} from "./types";

// In-memory mock of the graph backend. Every function here maps onto a
// Prisma query later; callers only pass the acting person's id.

type Store = {
  people: Person[];
  integrations: Integration[];
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  queries: Query[];
  // Nodes that became visible to someone since they last looked.
  unseen: Map<string, Set<string>>;
};

const globalForStore = globalThis as unknown as { sdWiseStore?: Store };

function store(): Store {
  globalForStore.sdWiseStore ??= {
    people: structuredClone(fixtures.people),
    integrations: structuredClone(fixtures.integrations),
    nodes: structuredClone(fixtures.nodes),
    edges: structuredClone(fixtures.edges),
    queries: structuredClone(fixtures.queries),
    unseen: new Map(),
  };
  return globalForStore.sdWiseStore;
}

export function resetStore() {
  globalForStore.sdWiseStore = undefined;
}

const firstName = (name: string) => name.split(/[\s.@_-]/)[0]?.toLowerCase();

// Until Users are linked to Persons, match on first name, then fall back to
// the first person so every account can use the demo.
export function personFor(user: { name: string; email: string }): Person {
  const { people } = store();
  const names = new Set([firstName(user.name), firstName(user.email)]);
  return (
    people.find((p) => names.has(firstName(p.name))) ?? (people[0] as Person)
  );
}

function liveNodes() {
  const { nodes, integrations } = store();
  const off = new Set(
    integrations.filter((i) => !i.connected).map((i) => i.id),
  );
  return nodes.filter((n) => !n.integrationId || !off.has(n.integrationId));
}

function liveEdges(nodes: KnowledgeNode[]) {
  const ids = new Set(nodes.map((n) => n.id));
  return store().edges.filter(
    (e) => ids.has(e.sourceId) && ids.has(e.targetId),
  );
}

function markUnseen(personId: string, nodeId: string) {
  const { unseen } = store();
  const set = unseen.get(personId) ?? new Set();
  set.add(nodeId);
  unseen.set(personId, set);
}

export function markSeen(me: Person, nodeId: string) {
  store().unseen.get(me.id)?.delete(nodeId);
}

export function getGraph(me: Person): GraphView {
  const s = store();
  const nodes = liveNodes();
  const visible = new Set(
    nodes.filter((n) => canSee(n, me.id)).map((n) => n.id),
  );
  const unseen = s.unseen.get(me.id) ?? new Set();
  return {
    me,
    people: s.people,
    integrations: s.integrations,
    nodes: nodes.map((n) => toNodeView(n, me.id, unseen)),
    edges: liveEdges(nodes).map((e) => toEdgeView(e, visible)),
  };
}

export function ask(me: Person, question: string): AskResult {
  const nodes = liveNodes();
  const { hits, visited } = searchGraph(question, nodes, liveEdges(nodes));
  return answerFor(question, me.id, hits, visited, nodes, store().people);
}

function findPerson(id: string) {
  const person = store().people.find((p) => p.id === id);
  if (!person) throw new Error("Unknown person");
  return person;
}

function findNode(id: string) {
  const node = store().nodes.find((n) => n.id === id);
  if (!node) throw new Error("Unknown node");
  return node;
}

export function askPerson(
  me: Person,
  recipientId: string,
  question: string,
  nodeIds: string[],
) {
  findPerson(recipientId);
  return addQuery({
    kind: "QUESTION",
    askerId: me.id,
    recipientId,
    question,
    nodeIds,
  });
}

export function requestAccess(me: Person, nodeId: string, ownerId: string) {
  const node = findNode(nodeId);
  if (!node.ownerIds.includes(ownerId)) throw new Error("Not an owner");
  if (canSee(node, me.id)) throw new Error("Already has access");
  const existing = store().queries.find(
    (q) =>
      q.kind === "ACCESS" &&
      q.status === "PENDING" &&
      q.askerId === me.id &&
      q.nodeIds.includes(nodeId),
  );
  if (existing) return existing;
  return addQuery({
    kind: "ACCESS",
    askerId: me.id,
    recipientId: ownerId,
    question: "Can I see what you know about this?",
    nodeIds: [nodeId],
  });
}

function addQuery(
  q: Pick<Query, "kind" | "askerId" | "recipientId" | "question" | "nodeIds">,
) {
  const query: Query = {
    ...q,
    id: `q-${crypto.randomUUID()}`,
    status: "PENDING",
    answer: null,
    shareScope: null,
    answerNodeId: null,
    createdAt: new Date().toISOString(),
    resolvedAt: null,
  };
  store().queries.push(query);
  return query;
}

function pendingFor(me: Person, queryId: string) {
  const query = store().queries.find((q) => q.id === queryId);
  if (!query || query.recipientId !== me.id || query.status !== "PENDING") {
    throw new Error("Nothing to answer");
  }
  return query;
}

// Answering writes the answer back into the graph as a new node, linked to
// the facts it was based on, visible to the asker (or everyone).
export function answerQuery(
  me: Person,
  queryId: string,
  answer: string,
  scope: ShareScope,
) {
  const s = store();
  const query = pendingFor(me, queryId);
  if (query.kind !== "QUESTION") throw new Error("Not a question");
  const asker = findPerson(query.askerId);
  const based = query.nodeIds.filter((id) => canSee(findNode(id), me.id));

  const node: KnowledgeNode = {
    id: `n-${crypto.randomUUID()}`,
    title: query.question,
    content: `${asker.name} asked: ${query.question}\n${me.name} answered: ${answer}`,
    contentSummary: answer,
    source: "OTHER",
    integrationId: null,
    sourceDescription: `Answer from ${me.name} to ${asker.name}`,
    visibility: scope === "PUBLIC" ? "PUBLIC" : "PRIVATE",
    ownerIds: [me.id],
    accessIds: [me.id, asker.id],
    createdAt: new Date().toISOString(),
  };
  s.nodes.push(node);
  for (const targetId of based) {
    s.edges.push({
      id: `e-${crypto.randomUUID()}`,
      sourceId: node.id,
      targetId,
      kind: "ANSWERS",
      description: `${me.name} answered ${asker.name} based on this`,
    });
  }
  markUnseen(asker.id, node.id);

  Object.assign(query, {
    status: "ANSWERED",
    answer,
    shareScope: scope,
    answerNodeId: node.id,
    resolvedAt: new Date().toISOString(),
  });
  return query;
}

export function approveAccess(me: Person, queryId: string) {
  const query = pendingFor(me, queryId);
  if (query.kind !== "ACCESS") throw new Error("Not an access request");
  for (const id of query.nodeIds) {
    const node = findNode(id);
    if (!node.ownerIds.includes(me.id)) throw new Error("Not an owner");
    if (!node.accessIds.includes(query.askerId)) {
      node.accessIds.push(query.askerId);
    }
    markUnseen(query.askerId, id);
  }
  Object.assign(query, {
    status: "ANSWERED",
    shareScope: "ASKER",
    answerNodeId: query.nodeIds[0] ?? null,
    resolvedAt: new Date().toISOString(),
  });
  return query;
}

export function declineQuery(me: Person, queryId: string) {
  const query = pendingFor(me, queryId);
  Object.assign(query, {
    status: "DECLINED",
    resolvedAt: new Date().toISOString(),
  });
  return query;
}

function toItem(q: Query, viewer: Person): InboxItem {
  const nodes = liveNodes();
  const asker = findPerson(q.askerId);
  const isRecipient = q.recipientId === viewer.id;
  const suggested =
    isRecipient && q.kind === "QUESTION" && q.status === "PENDING"
      ? draftAnswer(
          q.question,
          asker,
          viewer.id,
          q.nodeIds,
          nodes,
          liveEdges(nodes),
        )
      : null;
  return {
    ...q,
    asker,
    recipient: findPerson(q.recipientId),
    suggestedAnswer: suggested?.text ?? null,
    nodeTitles: q.nodeIds.flatMap((id) => {
      const node = store().nodes.find((n) => n.id === id);
      return node && canSee(node, viewer.id) ? [node.title] : [];
    }),
  };
}

const newestFirst = (a: Query, b: Query) =>
  b.createdAt.localeCompare(a.createdAt);

export function getInbox(me: Person) {
  const { queries } = store();
  return {
    received: queries
      .filter((q) => q.recipientId === me.id)
      .toSorted(newestFirst)
      .map((q) => toItem(q, me)),
    sent: queries
      .filter((q) => q.askerId === me.id)
      .toSorted(newestFirst)
      .map((q) => toItem(q, me)),
  };
}

export function pendingCount(me: Person) {
  return store().queries.filter(
    (q) => q.recipientId === me.id && q.status === "PENDING",
  ).length;
}

export function getIntegrations() {
  const s = store();
  return s.integrations.map((integration) => {
    const nodes = s.nodes.filter((n) => n.integrationId === integration.id);
    return {
      id: integration.id,
      type: integration.type,
      connected: integration.connected,
      connectedAt: integration.connectedAt,
      facts: nodes.length,
      people: new Set(nodes.flatMap((n) => n.ownerIds)).size,
    };
  });
}

export function setConnected(id: string, connected: boolean) {
  const integration = store().integrations.find((i) => i.id === id);
  if (!integration) throw new Error("Unknown integration");
  integration.connected = connected;
  integration.connectedAt = connected ? new Date().toISOString() : null;
  return integration;
}
