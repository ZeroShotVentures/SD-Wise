import type { AskResult, InboxItem, NodeView, Person } from "@/lib/graph/types";

const label = (p: Person) => `${p.name} (${p.role})`;

// What an MCP client sees for a question. Built from the viewer's NodeViews,
// so locked facts carry no content, only their source and who owns them.
export function formatAsk(
  result: AskResult,
  nodes: NodeView[],
  people: Person[],
) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const hits = result.hits.flatMap((id) => byId.get(id) ?? []);
  const owner = (id: string) => {
    const p = people.find((x) => x.id === id);
    return p ? { id: p.id, name: label(p) } : { id, name: id };
  };
  return {
    question: result.question,
    answer: result.answer?.text ?? null,
    facts: hits.flatMap((n) =>
      n.locked
        ? []
        : [
            {
              id: n.id,
              title: n.title,
              summary: n.contentSummary,
              source: n.source,
            },
          ],
    ),
    lockedFacts: hits.flatMap((n) =>
      n.locked
        ? [{ id: n.id, source: n.source, owners: n.ownerIds.map(owner) }]
        : [],
    ),
    peopleWhoKnowMore: result.people.map((s) => ({
      id: s.person.id,
      name: label(s.person),
      reason: s.reason,
      nodeIds: s.nodeIds,
    })),
  };
}

const inboxItem = (q: InboxItem) => ({
  id: q.id,
  kind: q.kind,
  status: q.status,
  question: q.question,
  from: label(q.asker),
  to: label(q.recipient),
  answer: q.answer,
  suggestedAnswer: q.suggestedAnswer,
  about: q.nodeTitles,
  createdAt: q.createdAt,
});

export function formatInbox(inbox: {
  received: InboxItem[];
  sent: InboxItem[];
}) {
  return {
    received: inbox.received.map(inboxItem),
    sent: inbox.sent.map(inboxItem),
  };
}
