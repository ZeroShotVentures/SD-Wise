import type { AskResult, InboxItem, NodeView, Person } from "@/lib/graph/types";

const label = (p: Person) => `${p.name} (${p.role})`;

// What an MCP client sees for a question. Locked facts never appear, not even
// their owners: `moreAvailable` is the only hint. `requestUrl` opens a page
// with a Request access button, for hosts that can't show the answer card.
export function formatAsk(
  result: AskResult,
  nodes: NodeView[],
  baseUrl: string,
) {
  const requestUrl = new URL("/inbox/request", baseUrl);
  requestUrl.searchParams.set("question", result.question);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const hits = result.hits.flatMap((id) => byId.get(id) ?? []);
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
    moreAvailable: result.moreAvailable,
    requestUrl: result.moreAvailable ? requestUrl.href : null,
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
