import { canSee } from "./access";
import type {
  AskResult,
  KnowledgeEdge,
  KnowledgeNode,
  KnowledgeSource,
  Person,
  SuggestedPerson,
} from "./types";

// Stand-in for the AI search. Keyword overlap instead of embeddings, one hop
// instead of a real traversal. Same inputs and outputs as the real thing.

const STOPWORDS = new Set(
  "a an and are be by can did do does for from how i in is it me my of on or our the to was we what when where which who why will with you your".split(
    " ",
  ),
);

export function tokenize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t))
    .map((t) => (t.length > 3 && t.endsWith("s") ? t.slice(0, -1) : t));
}

function score(query: string[], node: KnowledgeNode) {
  const title = new Set(tokenize(node.title));
  const body = new Set(
    tokenize(
      `${node.contentSummary} ${node.content} ${node.sourceDescription}`,
    ),
  );
  let total = 0;
  for (const t of query) {
    if (title.has(t)) total += 3;
    else if (body.has(t)) total += 1;
  }
  return total;
}

export function searchGraph(
  question: string,
  nodes: KnowledgeNode[],
  edges: KnowledgeEdge[],
  limit = 4,
) {
  const query = tokenize(question);
  const scored = nodes
    .map((node) => ({ node, score: score(query, node) }))
    .filter((s) => s.score > 0)
    .toSorted((a, b) => b.score - a.score);
  const top = scored[0]?.score ?? 0;
  const hits = scored
    .filter((s) => s.score >= Math.max(2, top * 0.5))
    .slice(0, limit)
    .map((s) => s.node.id);

  // Visit order: entry nodes first, then their neighbours.
  const visited = [...hits];
  for (const id of hits) {
    for (const e of edges) {
      const next =
        e.sourceId === id ? e.targetId : e.targetId === id ? e.sourceId : null;
      if (next && !visited.includes(next)) visited.push(next);
    }
  }
  return { hits, visited };
}

const SOURCE_LABEL: Record<KnowledgeSource, string> = {
  MESSAGE: "a chat",
  EMAIL: "an email",
  MEETING: "a meeting",
  DOCUMENT: "a document",
  OTHER: "an answer",
};

export function answerFor(
  question: string,
  viewerId: string,
  hits: string[],
  visited: string[],
  nodes: KnowledgeNode[],
  people: Person[],
): AskResult {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const hitNodes = hits.flatMap((id) => byId.get(id) ?? []);
  const known = hitNodes.filter((n) => canSee(n, viewerId));
  const unknown = hitNodes.filter((n) => !canSee(n, viewerId));

  const answer = known.length
    ? {
        text: known.map((n) => n.contentSummary).join(" "),
        nodeIds: known.map((n) => n.id),
      }
    : null;

  const suggestions = new Map<
    string,
    { nodeIds: string[]; sources: Set<string> }
  >();
  for (const node of unknown) {
    for (const ownerId of node.ownerIds) {
      if (ownerId === viewerId) continue;
      const entry = suggestions.get(ownerId) ?? {
        nodeIds: [],
        sources: new Set<string>(),
      };
      entry.nodeIds.push(node.id);
      entry.sources.add(SOURCE_LABEL[node.source]);
      suggestions.set(ownerId, entry);
    }
  }

  const suggested: SuggestedPerson[] = [...suggestions.entries()]
    .toSorted((a, b) => b[1].nodeIds.length - a[1].nodeIds.length)
    .slice(0, 3)
    .flatMap(([id, { nodeIds, sources }]) => {
      const person = people.find((p) => p.id === id);
      if (!person) return [];
      const count =
        nodeIds.length === 1 ? "something" : `${nodeIds.length} things`;
      return [
        {
          person,
          nodeIds,
          reason: `Knows ${count} related from ${[...sources].join(" and ")}`,
        },
      ];
    });

  return { question, visited, hits, answer, people: suggested };
}

// Drafts a reply from what the recipient can see. The real version is an LLM
// call over the same nodes.
export function draftAnswer(
  question: string,
  asker: Person,
  recipientId: string,
  nodeIds: string[],
  nodes: KnowledgeNode[],
  edges: KnowledgeEdge[],
) {
  const own = nodes.filter((n) => canSee(n, recipientId));
  const { hits } = searchGraph(question, own, edges, 2);
  const ids = [...new Set([...nodeIds, ...hits])];
  const used = ids.flatMap((id) => own.find((n) => n.id === id) ?? []);
  if (!used.length) return null;
  const firstName = asker.name.split(" ")[0];
  const facts = used.map((n) => n.contentSummary).join(" ");
  return { text: `Hi ${firstName}! ${facts}`, nodeIds: used.map((n) => n.id) };
}
