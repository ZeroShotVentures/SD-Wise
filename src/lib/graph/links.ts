import { tokenize } from "./ai";
import type { KnowledgeEdge } from "./types";

// Keeps the graph in one piece. A fact without edges has nothing to say which
// topic it belongs to, and a small group cut off from the rest floats on its
// own, so each such group gets one edge into the main graph: to the fact that
// shares the most telling words with one of its facts. Rare words count most,
// and words in both titles three times, as in the search.
//
// This holds for every source on its own too, so disconnecting one source
// never cuts the facts of another loose. Answers written in SD Wise have no
// source and only count for the whole graph. Deterministic for a given input
// order.

type Fact = {
  id: string;
  title: string;
  contentSummary: string;
  integrationId: string | null;
};
type Link = { sourceId: string; targetId: string };
type Words = { title: Set<string>; all: Set<string> };
// What a word shared by two facts says about them.
type Weight = (t: string, a: Words, b: Words) => number;

export function looseLinks(facts: Fact[], edges: Link[]): KnowledgeEdge[] {
  const vocab = new Map(facts.map((f) => [f.id, wordsOf(f)]));
  const df = new Map<string, number>();
  for (const { all } of vocab.values()) {
    for (const t of all) df.set(t, (df.get(t) ?? 0) + 1);
  }
  const weight: Weight = (t, a, b) =>
    Math.log(facts.length / (df.get(t) ?? 1)) *
    (a.title.has(t) && b.title.has(t) ? 3 : 1);

  const added: KnowledgeEdge[] = [];
  const sources = [...new Set(facts.map((f) => f.integrationId))];
  for (const source of sources) {
    if (source === null) continue;
    const own = facts.filter((f) => f.integrationId === source);
    added.push(...connect(own, [...edges, ...added], vocab, weight));
  }
  added.push(...connect(facts, [...edges, ...added], vocab, weight));
  return added;
}

const clean = (text: string) => tokenize(text).filter((t) => !/^\d+$/.test(t));

function wordsOf(fact: Fact): Words {
  const title = new Set(clean(fact.title));
  return { title, all: new Set([...title, ...clean(fact.contentSummary)]) };
}

// Joins the pieces `facts` fall into with as few edges as possible, strongest
// word matches first (a maximum spanning tree over the pieces). Each fact
// outside the largest piece proposes its best few matches in other pieces. A
// piece still cut off after that joins its best match anywhere outside
// itself, or, sharing no word with anything, the best-connected fact of the
// largest piece.
const MATCHES = 5;

function connect(
  facts: Fact[],
  edges: Link[],
  vocab: Map<string, Words>,
  weight: Weight,
): KnowledgeEdge[] {
  const index = new Map(facts.map((f, i) => [f.id, i]));
  const parent = facts.map((_, i) => i);
  const root = (i: number): number => {
    while (parent[i] !== i) {
      const up = parent[parent[i] as number] as number;
      parent[i] = up;
      i = up;
    }
    return i;
  };
  const degree = Array.from({ length: facts.length }, () => 0);
  for (const e of edges) {
    const a = index.get(e.sourceId);
    const b = index.get(e.targetId);
    if (a === undefined || b === undefined) continue;
    degree[a] = (degree[a] as number) + 1;
    degree[b] = (degree[b] as number) + 1;
    parent[root(a)] = root(b);
  }

  const piece = facts.map((_, i) => root(i));
  const sizes = new Map<number, number>();
  for (const r of piece) sizes.set(r, (sizes.get(r) ?? 0) + 1);
  if (sizes.size <= 1) return [];
  const main = [...sizes].reduce((a, b) => (b[1] > a[1] ? b : a))[0];

  const wordsAt = (i: number) =>
    vocab.get((facts[i] as Fact).id) ?? { title: new Set(), all: new Set() };
  const postings = new Map<string, number[]>();
  for (const i of facts.keys()) {
    for (const t of wordsAt(i).all) {
      postings.set(t, [...(postings.get(t) ?? []), i]);
    }
  }

  // Facts outside `own` that share words with `from`, best first.
  const matches = (from: number, own: (i: number) => boolean) => {
    const scores = new Map<number, number>();
    for (const t of wordsAt(from).all) {
      for (const to of postings.get(t) ?? []) {
        if (own(to)) continue;
        const w = weight(t, wordsAt(from), wordsAt(to));
        scores.set(to, (scores.get(to) ?? 0) + w);
      }
    }
    return [...scores]
      .map(([to, score]) => ({ from, to, score }))
      .toSorted(
        (a, b) =>
          b.score - a.score ||
          (degree[b.to] as number) - (degree[a.to] as number) ||
          a.to - b.to,
      );
  };

  const candidates = facts.flatMap((_, from) =>
    piece[from] === main
      ? []
      : matches(from, (i) => piece[i] === piece[from]).slice(0, MATCHES),
  );
  candidates.sort(
    (a, b) => b.score - a.score || a.from - b.from || a.to - b.to,
  );

  const links: KnowledgeEdge[] = [];
  const join = (from: number, to: number) => {
    parent[root(from)] = root(to);
    const source = facts[from] as Fact;
    const target = facts[to] as Fact;
    links.push({
      id: `e-link-${source.id}-${target.id}`,
      sourceId: source.id,
      targetId: target.id,
      kind: "RELATES_TO",
      description: describe(source, wordsAt(from), wordsAt(to), weight),
    });
  };
  for (const { from, to } of candidates) {
    if (root(from) !== root(to)) join(from, to);
  }

  let hub = -1;
  for (const i of facts.keys()) {
    if (piece[i] !== main) continue;
    if (hub < 0 || (degree[i] as number) > (degree[hub] as number)) hub = i;
  }
  for (const i of facts.keys()) {
    const own = root(i);
    if (own === root(hub)) continue;
    const best = [...facts.keys()]
      .flatMap((from) =>
        root(from) === own
          ? (matches(from, (j) => root(j) === own)[0] ?? [])
          : [],
      )
      .toSorted((a, b) => b.score - a.score || a.from - b.from)[0];
    if (best) join(best.from, best.to);
    else join(i, hub);
  }
  return links;
}

// "Both mention <the most telling word they share>", as the source fact writes
// it.
function describe(source: Fact, from: Words, to: Words, weight: Weight) {
  const token = [...from.all]
    .filter((t) => to.all.has(t))
    .toSorted(
      (a, b) => weight(b, from, to) - weight(a, from, to) || a.localeCompare(b),
    )[0];
  if (!token) return "Related work";
  const surface = `${source.title} ${source.contentSummary}`
    .split(/[^\p{L}\p{N}'-]+/u)
    .find((w) => tokenize(w)[0] === token);
  return `Both mention ${surface ?? token}`;
}
