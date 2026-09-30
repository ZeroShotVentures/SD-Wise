import { canSee } from "./access";
import type { KnowledgeEdge, KnowledgeNode, Person, Query } from "./types";

// Questions live in the database while the graph is still mocked, so answers
// are layered onto the fixture graph on every read instead of being stored as
// nodes.

export type ResolvedQuery = Query & { asker: Person; recipient: Person };

const ANSWER_PREFIX = "n-answer-";

export const answerNodeId = (questionId: string) =>
  `${ANSWER_PREFIX}${questionId}`;

export const questionIdOf = (nodeId: string) =>
  nodeId.startsWith(ANSWER_PREFIX) ? nodeId.slice(ANSWER_PREFIX.length) : null;

// An answered question becomes a node linked to the facts it was based on,
// visible to the asker (or everyone). An approved access request adds the
// asker to the node's access list. Pass questions oldest first.
export function applyAnswers(
  nodes: KnowledgeNode[],
  edges: KnowledgeEdge[],
  questions: ResolvedQuery[],
) {
  const byId = new Map(
    nodes.map((n) => [n.id, { ...n, accessIds: [...n.accessIds] }]),
  );
  const added: KnowledgeEdge[] = [];

  for (const q of questions) {
    if (q.status !== "ANSWERED") continue;
    const { asker, recipient } = q;

    if (q.kind === "ACCESS") {
      for (const id of q.nodeIds) {
        const node = byId.get(id);
        if (node && !node.accessIds.includes(asker.id)) {
          node.accessIds.push(asker.id);
        }
      }
      continue;
    }

    const id = answerNodeId(q.id);
    const answer = q.answer ?? "";
    for (const targetId of q.nodeIds) {
      const target = byId.get(targetId);
      if (!target || !canSee(target, recipient.id)) continue;
      added.push({
        id: `e-${id}-${targetId}`,
        sourceId: id,
        targetId,
        kind: "ANSWERS",
        description: `${recipient.name} answered ${asker.name} based on this`,
      });
    }
    byId.set(id, {
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
    });
  }

  return { nodes: [...byId.values()], edges: [...edges, ...added] };
}

// Nodes that became visible to someone through an answer they haven't looked
// at yet.
export function unseenFor(personId: string, questions: ResolvedQuery[]) {
  const ids = new Set<string>();
  for (const q of questions) {
    if (q.asker.id !== personId || q.status !== "ANSWERED" || q.seenAt) {
      continue;
    }
    if (q.kind === "ACCESS") for (const id of q.nodeIds) ids.add(id);
    else ids.add(answerNodeId(q.id));
  }
  return ids;
}
