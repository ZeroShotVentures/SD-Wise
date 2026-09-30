import type { EdgeView, KnowledgeEdge, KnowledgeNode, NodeView } from "./types";

export function canSee(node: KnowledgeNode, personId: string) {
  return node.visibility === "PUBLIC" || node.accessIds.includes(personId);
}

// Redaction happens on the server so locked content never reaches the client.
export function toNodeView(
  node: KnowledgeNode,
  personId: string,
  newIds: ReadonlySet<string> = new Set(),
): NodeView {
  if (!canSee(node, personId)) {
    return {
      id: node.id,
      locked: true,
      source: node.source,
      integrationId: node.integrationId,
      ownerIds: node.ownerIds,
      createdAt: node.createdAt,
      pos: node.pos,
      isNew: false,
    };
  }
  const { accessIds: _, ...rest } = node;
  return { ...rest, locked: false, isNew: newIds.has(node.id) };
}

// An edge's meaning is only visible when both ends are.
export function toEdgeView(
  edge: KnowledgeEdge,
  visible: ReadonlySet<string>,
): EdgeView {
  if (visible.has(edge.sourceId) && visible.has(edge.targetId)) {
    return { ...edge, locked: false };
  }
  return {
    id: edge.id,
    sourceId: edge.sourceId,
    targetId: edge.targetId,
    locked: true,
  };
}
