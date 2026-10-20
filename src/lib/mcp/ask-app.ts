import "server-only";
import { appHtml } from "./app-html";

export const ASK_APP_URI = "ui://sd-wise/ask.html";

const STYLE = `
  .facts { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
  .fact { border: 1px solid var(--line); border-radius: 999px; padding: 2px 10px; font-size: 12px; color: var(--muted); }
  .more { border-radius: 10px; background: var(--soft); padding: 12px; }
  .more button { margin-top: 10px; }
  .ok { margin-top: 10px; color: #059669; font-weight: 500; }
  .err { margin-top: 8px; color: #dc2626; font-size: 12px; }
`;

const SCRIPT = `
function render(data) {
  root.replaceChildren();
  const card = el("div", "card");
  if (data.answer) {
    const known = el("div");
    if (data.facts.length) known.append(el("h3", null, "From what you can see"));
    known.append(el("p", null, data.answer));
    const facts = el("div", "facts");
    for (const f of data.facts) facts.append(el("span", "fact", f.title));
    known.append(facts);
    card.append(known);
  }
  if (data.moreAvailable) {
    const more = el("div", "more");
    more.append(
      el("h3", null, data.answer ? "Colleagues know more" : "Colleagues know about this"),
      el("p", null,
        "Some of what they know about this isn't shared with you. SD Wise can pass your question on, and they decide whether to share it."),
    );
    const button = el("button", null, "Request access");
    const status = el("p", "err");
    button.onclick = async () => {
      button.disabled = true;
      button.textContent = "Requesting…";
      status.textContent = "";
      try {
        const res = await app.callServerTool({ name: "request_more", arguments: { question: data.question } });
        if (res.isError) throw new Error();
        button.replaceWith(el("p", "ok", "Requested. You'll see it in your SD Wise inbox if it's shared."));
        await app.updateModelContext({
          content: [{ type: "text", text: "The user already requested access to the rest through SD Wise. Don't offer it again." }],
        }).catch(() => {});
      } catch {
        button.disabled = false;
        button.textContent = "Request access";
        if (data.requestUrl) {
          await app.openLink({ url: data.requestUrl }).catch(() => {});
          status.textContent = "Opened SD Wise to finish the request.";
        } else {
          status.textContent = "Couldn't send. Try again.";
        }
      }
    };
    more.append(button, status);
    card.append(more);
  }
  if (data.askUrl) {
    const ask = el("div", "more");
    const button = el("button", null, "Ask a colleague");
    button.onclick = () => app.openLink({ url: data.askUrl }).catch(() => {});
    ask.append(button);
    card.append(ask);
  }
  root.append(card);
}

app.ontoolresult = (result) => {
  const data = result.structuredContent ?? JSON.parse(result.content?.[0]?.text ?? "{}");
  if (data && "question" in data) render(data);
};
`;

export function askAppHtml() {
  return appHtml(STYLE, SCRIPT);
}
