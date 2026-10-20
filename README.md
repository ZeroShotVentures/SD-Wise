# SD Wise

**The company brain is bigger than its parts.**

## The idea

Company knowledge doesn't really live in documents, the file system or people's heads. Each of them holds a piece. SD Wise holds all of it.

SD Wise is the company's brain: one agent that can reach every bit of information the company has, public or private. Because it sees everything, it can connect things no single document, folder or employee could, and answer questions nobody could answer before.

Seeing everything doesn't mean showing everything. SD Wise knows who is allowed to read what, and every answer respects that.

## How a question is answered

You ask SD Wise a question. It then does three things.

1. **Find.** It searches all company knowledge, including the private parts, and connects every fact that helps answer the question.
2. **Check.** It sorts those facts into what you're allowed to see and what you aren't.
3. **Answer.** It answers with what you can see. For the rest, it tells you who knows more.

That gives one of three results:

- **You can see everything.** You get the full answer.
- **Someone else holds part of it.** You get what SD Wise can already tell you, plus a suggestion like *"Filip knows something related from an email"*. One click sends Filip your question, and SD Wise has already drafted a reply from what Filip can see. Filip checks it and sends it, or declines.
- **It's not for you.** You don't see it. In your graph it shows up as a locked fact: you know it exists, but not what it says or who knows it. You can request access, and an owner approves or declines.

When someone answers you, the answer becomes new knowledge: a new node in your graph, linked to the facts it came from.

### Facts, not guesses

Every fact, and who is allowed to see it, is stored in the database. SD Wise only answers with those stored facts and only follows those stored rights, so it can't make up an answer or hand out access that doesn't exist.

## How to test

### Run it locally

```sh
pnpm install
pnpm db:up            # Postgres with pgvector, in Docker
pnpm db:deploy        # migrations
pnpm db:seed:demo     # an account for every person, then the graph
pnpm dev
```

Before a demo, `pnpm db:seed` puts the graph back to how a demo starts: it deletes every question, answer and shared access from testing, reconnects the sources, and writes the graph from `src/lib/graph/fixtures.ts` with the six demo questions. Accounts, passwords and sessions stay.

### Accounts

Every person in the graph has an account, all with the password `password123`. Create them with `pnpm db:seed:demo` (accounts plus the graph) or `pnpm db:seed:accounts` (accounts only). The walkthrough uses these two; [docs/accounts.md](docs/accounts.md) lists everyone.

| User | Email | Password | Role |
| --- | --- | --- | --- |
| Kobe | `kobe@sdwise.be` | `password123` | Platform lead |
| Filip | `filip@sdwise.be` | `password123` | Payroll operations lead |

### Walkthrough

1. Sign in as **Kobe**. Ask *"When is the payroll cut-off in December?"*. Filip knows, but Kobe wasn't there, so the answer says colleagues know more. Click **Ask a colleague**.
2. Sign in as **Filip**. Kobe's request is in the inbox with his question; click **Share with Kobe**.
3. Sign in as **Kobe**. The cut-off fact is unlocked in his graph, marked *New for you*.
4. The other way round: as **Filip**, ask *"Is there a deploy freeze over the holidays?"* and request access; as **Kobe**, share it.
5. As **Kobe**, ask *"How is the onboarding of Coca Cola going?"*. The search finds about a dozen facts about the new customer: Kobe sees half of them (the HR system feed and data migration are on track), the rest are locked (payroll operations and sales know the go-live is at risk). The answer comes from what Kobe knows; **Ask a colleague** sends his question to Filip and Bram. The facts are in `src/lib/graph/cocacola-fixtures.ts`.

A private fact is visible only to the people who were in the conversation it came from. Everyone else sees a lock, without who knows it, and can request access from the graph too.

## Use SD Wise from your AI (MCP)

SD Wise is an MCP server at `/api/mcp`, protected by Better Auth's [MCP plugin](https://better-auth.com/docs/plugins/mcp). Add the URL to your client; it signs you in to SD Wise in the browser and asks you to allow it. It acts as you, so answers follow the same visibility rules as the app.

**Integrations → MCP** in the app has the setup steps for Claude, ChatGPT, Copilot Studio, Claude Code, Cursor (one-click), VS Code (one-click) and Windsurf, lists the clients you allowed, and lets you disconnect them. Disconnecting deletes the consent and revokes the client's refresh tokens; an access token already issued keeps working until it expires (at most an hour).

- **Cursor** (`.cursor/mcp.json`): `{ "mcpServers": { "sdwise": { "url": "http://localhost:3000/api/mcp" } } }`
- **Claude Code**: `claude mcp add --transport http sdwise http://localhost:3000/api/mcp`

Tools: `ask` (with an MCP App answer card), `request_more` (called by the card only; other clients get an Ask a colleague link), `list_inbox`. They're defined once in `src/lib/mcp/tools.ts`, which both the server and the Integrations page read.

The URL is `BETTER_AUTH_URL` + `/api/mcp`. Outside localhost it must be HTTPS, so use the deployed URL or a tunnel. Claude, ChatGPT and Copilot Studio connect from the cloud and need a public URL too.

## Sources

**Integrations → Sources** connects Microsoft 365 (Teams, Teams meetings, Outlook, SharePoint, OneDrive, OneNote) with one sign-in, plus Slack, Google Workspace, Zoom, Notion and Confluence. Sources are still mocked: connecting flips a flag in the database, for everyone, and the facts are the seeded graph. Logos in `public/logos` come from the [Iconify](https://iconify.design) `logos`, `vscode-icons` and `simple-icons` sets.
