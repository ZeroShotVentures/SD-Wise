import { canSee } from "./access";
import type { KnowledgeEdge, KnowledgeNode, Person, Query } from "./types";

// An answered question becomes a node in the graph, visible to the asker or
// to everyone. store.ts writes it when the question is answered.

export type ResolvedQuery = Query & { asker: Person; recipient: Person };

const ANSWER_PREFIX = "n-answer-";

export const answerNodeId = (questionId: string) =>
  `${ANSWER_PREFIX}${questionId}`;

export const questionIdOf = (nodeId: string) =>
  nodeId.startsWith(ANSWER_PREFIX) ? nodeId.slice(ANSWER_PREFIX.length) : null;

// An answer can only go to everyone when nothing it draws on is someone
// else's private fact: being allowed to read a fact isn't being allowed to
// publish it.
export const publishable = (facts: KnowledgeNode[], personId: string) =>
  facts.every(
    (n) => n.visibility === "PUBLIC" || n.ownerIds.includes(personId),
  );

// The node an answered question becomes, linked to the facts it was based on
// that the recipient can see, and visible to the asker (or everyone). `facts`
// holds the nodes the question was about.
export function answerGraph(q: ResolvedQuery, facts: KnowledgeNode[]) {
  const { asker, recipient } = q;
  const id = answerNodeId(q.id);
  const edges: KnowledgeEdge[] = [];
  const linked: KnowledgeNode[] = [];
  for (const targetId of q.nodeIds) {
    const target = facts.find((n) => n.id === targetId);
    if (!target || !canSee(target, recipient.id)) continue;
    linked.push(target);
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
    visibility:
      q.shareScope === "PUBLIC" && publishable(linked, recipient.id)
        ? "PUBLIC"
        : "PRIVATE",
    ownerIds: [recipient.id],
    accessIds: [recipient.id, asker.id],
    createdAt: q.resolvedAt ?? q.createdAt,
  };
  return { node, edges };
}

// Answers someone got and hasn't looked at yet.
export function unseenFor(
  personId: string,
  questions: Pick<Query, "id" | "askerId" | "status" | "seenAt">[],
) {
  const ids = new Set<string>();
  for (const q of questions) {
    if (q.askerId === personId && q.status === "ANSWERED" && !q.seenAt) {
      ids.add(answerNodeId(q.id));
    }
  }
  return ids;
}
