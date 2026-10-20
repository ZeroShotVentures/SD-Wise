import { canSee } from "./access";
import type { KnowledgeEdge, KnowledgeNode, Person, Query } from "./types";

// An answered question becomes a node in the graph, and an approved access
// request adds the asker to the node's access list. store.ts writes both when
// the question is resolved.

export type ResolvedQuery = Query & { asker: Person; recipient: Person };

const ANSWER_PREFIX = "n-answer-";

export const answerNodeId = (questionId: string) =>
  `${ANSWER_PREFIX}${questionId}`;

export const questionIdOf = (nodeId: string) =>
  nodeId.startsWith(ANSWER_PREFIX) ? nodeId.slice(ANSWER_PREFIX.length) : null;

// The node an answered question becomes, linked to the facts it was based on
// that the recipient can see, and visible to the asker (or everyone). `facts`
// holds the nodes the question was about.
export function answerGraph(q: ResolvedQuery, facts: KnowledgeNode[]) {
  const { asker, recipient } = q;
  const id = answerNodeId(q.id);
  const edges: KnowledgeEdge[] = [];
  for (const targetId of q.nodeIds) {
    const target = facts.find((n) => n.id === targetId);
    if (!target || !canSee(target, recipient.id)) continue;
    edges.push({
      id: `e-${id}-${targetId}`,
      sourceId: id,
      targetId,
      kind: "ANSWERS",
      description: `${recipient.name} answered ${asker.name} based on this`,
    });
  }
  const answer = q.answer ?? "";
  const node: KnowledgeNode = {
    id,
    title: q.question,
    content: `${asker.name} asked: ${q.question}\n${recipient.name} answered: ${answer}`,
    contentSummary: answer,
    source: "OTHER",
    integrationId: null,
    sourceDescription: `Answer from ${recipient.name} to ${asker.name}`,
    visibility: q.shareScope === "PUBLIC" ? "PUBLIC" : "PRIVATE",
    ownerIds: [recipient.id],
    accessIds: [recipient.id, asker.id],
    createdAt: q.resolvedAt ?? q.createdAt,
  };
  return { node, edges };
}

// Nodes that became visible to someone through an answer they haven't looked
// at yet.
export function unseenFor(
  personId: string,
  questions: Pick<
    Query,
    "id" | "kind" | "askerId" | "status" | "nodeIds" | "seenAt"
  >[],
) {
  const ids = new Set<string>();
  for (const q of questions) {
    if (q.askerId !== personId || q.status !== "ANSWERED" || q.seenAt) {
      continue;
    }
    if (q.kind === "ACCESS") for (const id of q.nodeIds) ids.add(id);
    else ids.add(answerNodeId(q.id));
  }
  return ids;
}
