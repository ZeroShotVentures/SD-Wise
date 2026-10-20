import { canSee } from "./access";
import type { AskResult, KnowledgeEdge, KnowledgeNode } from "./types";

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
    .filter((s) => s.score >= Math.max(2, top * 0.75))
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

// Locked matches come back as `lockedHits`, ids only, so the graph can light
// them up next to the Ask a colleague offer. The asker already sees those
// nodes as locked; never their content or owners. The answer's text joins the summaries of the visible hits; `ask` in the
// service has Claude write the real one from the same facts.
export function answerFor(
  question: string,
  viewerId: string,
  hits: string[],
  visited: string[],
  nodes: KnowledgeNode[],
): AskResult {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const visible = (id: string) => {
    const node = byId.get(id);
    return node !== undefined && canSee(node, viewerId);
  };
  const known = hits.filter(visible);
  const locked = hits.filter((id) => !visible(id));

  const answer = known.length
    ? {
        text: known
          .flatMap((id) => byId.get(id)?.contentSummary ?? [])
          .join(" "),
        nodeIds: known,
      }
    : null;

  return {
    question,
    visited: visited.filter((id) => visible(id) || locked.includes(id)),
    hits: known,
    lockedHits: locked,
    answer,
    moreAvailable: locked.length > 0,
    askColleague: false,
  };
}

// The locked nodes behind `moreAvailable`, for routing a request to their
// owners on the server.
export function lockedHits(
  viewerId: string,
  hits: string[],
  nodes: KnowledgeNode[],
) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  return hits.flatMap((id) => {
    const node = byId.get(id);
    return node && !canSee(node, viewerId) ? [node] : [];
  });
}

// What the recipient can draft a reply from: the matched facts they can see,
// plus their own best matches for the question. Claude writes the draft.
export function draftFacts(
  question: string,
  recipientId: string,
  nodeIds: string[],
  nodes: KnowledgeNode[],
  edges: KnowledgeEdge[],
) {
  const own = nodes.filter((n) => canSee(n, recipientId));
  const { hits } = searchGraph(question, own, edges, 2);
  const ids = [...new Set([...nodeIds, ...hits])];
  return ids.flatMap((id) => own.find((n) => n.id === id) ?? []);
}
