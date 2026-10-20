import "server-only";
import { env } from "@/env";
import { appHtml } from "./app-html";

export const INBOX_APP_URI = "ui://sd-wise/inbox.html";

const STYLE = `
  .head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
  .title { font-weight: 600; }
  .muted { color: var(--muted); font-size: 12px; }
  .tabs { display: flex; gap: 4px; border-radius: 10px; background: var(--soft); padding: 3px; }
  .tab { flex: 1; margin: 0; background: transparent; color: var(--muted); padding: 6px 10px; }
  .tab[aria-selected="true"] { background: var(--card); color: var(--fg); box-shadow: 0 1px 2px rgb(0 0 0 / .08); }
  .count { margin-left: 6px; border-radius: 999px; background: #fef3c7; color: #92400e; padding: 0 7px; font-size: 11px; }
  .list { display: grid; gap: 8px; }
  .item { border: 1px solid var(--line); border-radius: 10px; padding: 12px; display: grid; gap: 6px; }
  .meta { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
  .meta .muted { margin-left: auto; }
  .badge { border-radius: 999px; padding: 1px 8px; font-size: 11px; font-weight: 500; background: var(--soft); color: var(--muted); }
  .PENDING { background: #fef3c7; color: #92400e; }
  .ANSWERED { background: #d1fae5; color: #065f46; }
  .q { font-weight: 500; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip { border: 1px solid var(--line); border-radius: 999px; padding: 1px 9px; font-size: 12px; color: var(--muted); }
  .reply { border-radius: 8px; background: var(--soft); padding: 8px 10px; }
  .reply h3 { margin-bottom: 2px; }
  .empty { border-radius: 10px; background: var(--soft); padding: 14px; color: var(--muted); text-align: center; }
  .foot { display: flex; justify-content: flex-end; }
`;

const script = (inboxUrl: string) => `
const INBOX_URL = ${JSON.stringify(inboxUrl).replaceAll("<", "\\u003c")};
let state = { data: null, tab: "received" };

const date = (iso) =>
  new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
const name = (label) => label.replace(/\\s*\\(.*\\)$/, "");
const statusLabel = (q) =>
  q.status === "PENDING" ? "Waiting"
    : q.status === "DECLINED" ? "Declined" : "Answered";

function reply(title, text) {
  const box = el("div", "reply");
  box.append(el("h3", null, title), el("p", null, text));
  return box;
}

function item(q, side) {
  const node = el("div", "item");
  const meta = el("div", "meta");
  meta.append(
    el("span", "badge " + q.status, statusLabel(q)),
    el("span", "muted", date(q.createdAt)),
  );
  node.append(
    meta,
    el("p", "muted", side === "received" ? "From " + q.from : "To " + q.to),
    el("p", "q", q.question),
  );
  if (q.about.length) {
    const chips = el("div", "chips");
    for (const t of q.about) chips.append(el("span", "chip", t));
    node.append(chips);
  }
  if (side === "received") {
    if (q.status === "PENDING" && q.suggestedAnswer) node.append(reply("Drafted reply", q.suggestedAnswer));
    if (q.status === "ANSWERED" && q.answer) node.append(reply("Your answer", q.answer));
  } else if (q.status === "ANSWERED" && q.answer) {
    node.append(reply(name(q.to) + " answered", q.answer));
  }
  return node;
}

function section(title, items, side) {
  const wrap = el("div");
  wrap.append(el("h3", null, title));
  const list = el("div", "list");
  for (const q of items) list.append(item(q, side));
  wrap.append(list);
  return wrap;
}

function render() {
  const { data, tab } = state;
  root.replaceChildren();
  const card = el("div", "card");
  const waitingForMe = data.received.filter((q) => q.status === "PENDING");
  const waitingOnOthers = data.sent.filter((q) => q.status === "PENDING");

  const head = el("div", "head");
  head.append(
    el("span", "title", "SD Wise inbox"),
    el("span", "muted",
      waitingForMe.length
        ? waitingForMe.length + " waiting for you"
        : "Nothing waiting for you"),
  );

  const tabs = el("div", "tabs");
  for (const [id, label, count] of [
    ["received", "For you", waitingForMe.length],
    ["sent", "Sent", waitingOnOthers.length],
  ]) {
    const button = el("button", "tab", label);
    button.setAttribute("aria-selected", String(tab === id));
    if (count) button.append(el("span", "count", String(count)));
    button.onclick = () => { state.tab = id; render(); };
    tabs.append(button);
  }
  card.append(head, tabs);

  if (tab === "received") {
    const handled = data.received.filter((q) => q.status !== "PENDING");
    if (waitingForMe.length) card.append(section("Needs your reply", waitingForMe, "received"));
    if (handled.length) card.append(section("Handled", handled, "received"));
    if (!data.received.length) card.append(el("p", "empty", "Nobody has asked you anything yet."));
  } else {
    if (data.sent.length) card.append(section("Your questions and requests", data.sent, "sent"));
    else card.append(el("p", "empty", "You haven't asked anyone anything yet."));
  }

  const foot = el("div", "foot");
  const open = el("button", null,
    tab === "received" && waitingForMe.length ? "Reply in SD Wise" : "Open in SD Wise");
  open.onclick = async () => {
    const url = INBOX_URL + (tab === "sent" ? "?tab=sent" : "");
    const res = await app.openLink({ url }).catch(() => ({ isError: true }));
    if (res.isError) open.replaceWith(el("p", "muted", url));
  };
  foot.append(open);
  card.append(foot);
  root.append(card);
}

app.ontoolresult = (result) => {
  const data = result.structuredContent ?? JSON.parse(result.content?.[0]?.text ?? "{}");
  if (data && Array.isArray(data.received) && Array.isArray(data.sent)) {
    state.data = data;
    state.tab = data.received.length || !data.sent.length ? "received" : "sent";
    render();
  }
};
`;

export function inboxAppHtml() {
  return appHtml(STYLE, script(`${env.BETTER_AUTH_URL}/inbox`));
}
