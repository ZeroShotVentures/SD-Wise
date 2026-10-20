# SD Wise feature status

What works, what is mocked, and what isn't built yet. Checked against `main` at `d36c84c` on 20 Oct 2026, then updated for [PR #18](https://github.com/ZeroShotVentures/SD-Wise/pull/18) (hiding locked facts and their owners from `ask`), [PR #21](https://github.com/ZeroShotVentures/SD-Wise/pull/21) (MCP inbox card), [PR #22](https://github.com/ZeroShotVentures/SD-Wise/pull/22) (semantic zoom for the graph), [PR #20](https://github.com/ZeroShotVentures/SD-Wise/pull/20) (integrations page revamp, Microsoft 365, MCP tab) and [PR #24](https://github.com/ZeroShotVentures/SD-Wise/pull/24) (an account for every person in the graph, access that starts with the owners only): lint, typecheck, `next build` and all 78 tests pass. Statuses come from reading the code and the tests; the Integrations page from PR #20 and the access flow from PR #24 were also clicked through in a browser, the rest of this list wasn't.

## In short

- **Real:** everything between people. Questions, answers, access requests, the inbox, and answers turning into new facts are stored in Postgres and work across accounts. Every person who owns a fact has an account, so you can sign in as anyone and see the graph as they do. Sign-in, settings, admin and the MCP server are real too, including the MCP tab on the Integrations page and revoking AI clients there.
- **Mocked:** the company brain itself. All facts, edges and permissions are fixtures in code. The search uses keywords instead of embeddings, and integrations (now with real logos, Microsoft 365 as one suite, and a Documents category) are an in-memory on/off switch. Claude does write the answer and the drafted reply, from whatever that search finds.
- **Not built:** real integrations and fact extraction, the embedding search in [node-finding.md](node-finding.md), notifications, and facts from documents (the document sources can be "connected" but bring nothing).

## Legend

| Column | Values |
| --- | --- |
| Real or mocked | **Real**: runs on real data or services. **Mocked**: fake data or simulated behaviour. **Real logic, mock data**: the code is the real thing, but it runs on fixtures. **Unused**: code exists, the app never calls it. **Not built**: promised in the README or docs, no code. |
| Works as intended | ✅ yes · 🟡 partly or only for the demo · ❌ no · 🐛 has a bug |

## Knowledge graph

| Feature | Real or mocked | Works as intended | Notes |
| --- | --- | --- | --- |
| Facts, edges and people | Mocked | 🟡 | 4,300 facts, 6,216 edges and 312 people, all in code: 30 hand-written demo facts ([fixtures.ts](../src/lib/graph/fixtures.ts)), 3,940 generated from a fixed seed ([bulk-fixtures.ts](../src/lib/graph/bulk-fixtures.ts)), and 330 AI-generated ones moved out of the database ([db-fixtures.ts](../src/lib/graph/db-fixtures.ts)). The `KnowledgeNode` and `KnowledgeEdge` tables exist but are empty and never read. |
| Who can see each fact | Real logic, mock data | 🟡 | One rule for everyone: a private fact is visible to its owners, the people who were in the conversation. The fixtures only set owners; access starts as exactly the owners ([fixtures.ts](../src/lib/graph/fixtures.ts)) and only grows in SD Wise, when an owner shares a fact or answers a question. Every owner is an account ([Accounts](#accounts)), so the locks in the graph are the signed-in person's own. Kobe and Filip take part in some of their own team's conversations (IT and Production), like everyone else, so they own 27 and 24 facts. Tested for every account. Still 🟡 because owners come from the fixtures, not from the source (channel members, mail recipients, meeting attendees). |
| Redaction of locked facts | Real logic, mock data | ✅ | Done on the server, so locked content never reaches the browser. Edges touching a locked fact lose their meaning too. Tested. |
| Graph view (semantic zoom, zoom slider, fit to screen, legend) | Real | ✅ | Renders every fact; locked ones show as a lock. Detail depends on zoom: zoomed out you see topic islands with names, fact counts and bundled links between topics; zooming in fades in the edges and moves island names to the island's edge as captions; zoomed in shows fact names wherever they fit without overlapping. Click an island to zoom into it; hover a fact to highlight its neighbours. Screenshots in [graph-semantic-zoom](graph-semantic-zoom/README.md). The legend has no entry for documents, but no fact is a document yet. |
| Topic islands and their names | Real logic, mock data | ✅ | Computed in the browser from the graph's edges (Louvain, [clusters.ts](../src/lib/graph/clusters.ts)): 41 topics on the demo graph. Names are the phrases most typical of each topic, taken only from titles the viewer can see, so they never leak a locked fact; a topic with nothing visible is "Private knowledge". Facts without edges share a "Not connected yet" island. Tested. Some names are generic ("Cohort", "Budget") because the mock titles are. |
| Fact and connection inspector | Real | ✅ | Shows content, source, owners and connections for visible facts. A locked fact shows only its source and date, and a "Request access" button: its owners never reach the browser, so clicking a lock doesn't tell you who knows what. Tested, and clicked through in a browser. |
| Facts stored in Postgres with pgvector | Unused | ❌ | Schema, migration and `contentEmbedding vector(1536)` exist, but since `785f062` the app reads only the fixtures. |

## Asking SD Wise

| Feature | Real or mocked | Works as intended | Notes |
| --- | --- | --- | --- |
| Search | Mocked | 🟡 | [ai.ts](../src/lib/graph/ai.ts) is a stand-in: keyword overlap (title words count 3, body words 1), then one hop to neighbours. Works for the scripted demo questions, misses paraphrases and synonyms. |
| Search per [node-finding.md](node-finding.md) | Not built | ❌ | No embedding lookup, in-degree scoring, beam walk, or "nearest visible fact" substitute. |
| Answer text | Real logic, mock data | 🟡 | Claude Sonnet 5.5, through the Vercel AI Gateway, writes it from the full text of the matching facts you can see; it never gets locked ones. If they don't answer the question, there is no answer, and "Request access" still shows when locked facts matched. Needs `AI_GATEWAY_API_KEY`. Not yet tried against the live model. |
| Only visible facts in the answer | Real logic, mock data | ✅ | `ask` returns only facts you can see. Locked matches never leave the server: no ids, titles, owners, source or count, in the app or over MCP. Tested, including answers that are partly visible. |
| "Colleagues know more" hint | Real logic, mock data | ✅ | When locked facts also matched, `ask` sets `moreAvailable` and the answer card offers "Request access". It doesn't say who knows. Replaces the old "Others know more" list of owners. Tested for the Kobe ↔ Filip walkthrough. |
| Search animation | Mocked | — | Random nodes flash for at least 1.4 s as the "embedding lookup", then the visit order is replayed, skipping locked facts. Cosmetic. |
| Embedding script (`pnpm db:embed`) | Unused | ❌ | Embeds database rows with `openai/text-embedding-3-small`, but the database has no facts and the search doesn't read embeddings. |
| AI data generation (`pnpm db:seed`) | Unused | ❌ | Writes facts and new people to tables the app no longer reads; its last output was frozen into `db-fixtures.ts`. Running it again changes nothing in the app, and the next `pnpm db:seed:accounts` removes the people it added, since they have no account. |

## Asking people

| Feature | Real or mocked | Works as intended | Notes |
| --- | --- | --- | --- |
| Ask a colleague | Real | 🟡 | Stored in the `Question` table. The colleague must exist as a `Person` row; `pnpm db:seed:demo` creates one for every fixture person. Since PR #18 nothing in the app or over MCP starts one: the "Ask {name}" button lived in the "Others know more" list, which is gone, and `ask_person` is commented out. The backend and inbox still work. |
| Drafted reply for the colleague | Real logic, mock data | 🟡 | Claude Sonnet 5.5 writes it once, right after the question is sent, from the facts the colleague can see, and it's stored on the question. Questions without one (demo questions, failed calls) get it on the next inbox load. Only questions get a draft, not access requests, so for now only the demo questions have one. Not yet tried against the live model. |
| Inbox: received and sent, answer, decline | Real | ✅ | A question can only be resolved once. |
| Share an answer with the asker or everyone | Real | ✅ | "Everyone" makes the new fact public. Tested. |
| Answers become new facts in the asker's graph | Real logic, mock data | ✅ | Rebuilt on every read from answered questions and linked to the facts they were based on; not saved as graph rows. Tested. |
| "New for you" highlight | Real | ✅ | Cleared when the asker opens the new fact. |
| Pending count in the sidebar | Real | ✅ | |
| Notifications (email, Slack, push) | Not built | ❌ | The app sends no email. People only see a question when they open SD Wise. |

## Access requests

| Feature | Real or mocked | Works as intended | Notes |
| --- | --- | --- | --- |
| Request access to a locked fact | Real | ✅ | From the inspector. Goes to the fact's first owner, picked on the server, so the asker doesn't learn who it went to until they share. Stored as an `ACCESS` question; a second request for the same fact reuses the pending one. |
| Request the rest of an answer | Real | ✅ | The "Request access" button on the answer card. The server reruns the search and sends one request per owner of the locked matches, with the asker's question attached, so the asker never learns which facts or whose. It responds the same whether or not anything matched. Goes to the first owner of each fact only. |
| Owner stays hidden until they share | Real | ✅ | In the asker's Sent tab a pending or declined request shows as sent to "The owner". Owners still see who asked. |
| Approve or decline | Real | ✅ | Owners see the asker's question on the request. `approveAccess` checks owners in the full graph, so access to someone's private answer can be approved too. |

## Integrations

The **Sources** tab of the Integrations page. Everything here is mocked; the **MCP** tab is real and listed under MCP below.

| Feature | Real or mocked | Works as intended | Notes |
| --- | --- | --- | --- |
| Integrations page: 13 sources in Chat, Email, Meetings and Documents | Mocked | 🟡 | Slack, Microsoft Teams, Outlook, Gmail, Teams meetings, Google Meet, Zoom, SharePoint, OneDrive, OneNote, Google Drive, Notion and Confluence, from a fixture list with fact and people counts per source. Real brand logos in `public/logos` (Iconify `logos`, `vscode-icons` and `simple-icons` sets). Search (`/` to focus), filter chips with counts, empty state. |
| Microsoft 365 suite | Mocked | 🟡 | One card for Teams, Teams meetings, Outlook, SharePoint, OneDrive and OneNote with a progress ring. "Connect N more" picks apps and runs one "Sign in with Microsoft", listing the read-only Microsoft Graph permissions it would ask for (`Mail.Read`, `Sites.Read.All`, …). No real Entra ID app, no OAuth. |
| Connect | Mocked | ❌ | The dialog shows sign-in, mapping and extraction steps on 650 ms timers (one step per app for a suite), then flips the flags. No OAuth, nothing is read. |
| Disconnect | Mocked | 🟡 | Immediate, with an Undo toast. Facts from that source really do drop out of the graph and search. But the switch is shared by every user, lives in server memory, resets on restart, and isn't shared between server instances. Undo resets the "since" date to today. |
| Gmail, Google Meet, Zoom and every Documents source | Mocked | ❌ | They have no facts, so connecting them changes nothing; their cards say "Indexing" forever. |
| Real ingestion and fact extraction | Not built | ❌ | The database enum only knows `slack`, `email` and `google_meet`; every other kind is a proposal in [types.ts](../src/lib/graph/types.ts). |
| Documents and file systems | Not built | ❌ | SharePoint, OneDrive, OneNote, Google Drive, Notion and Confluence exist as sources on the page only. There are no document facts. |
| Phone layout | Not built | 🟡 | The page works from about 1024 px wide. Below that the app shell's fixed sidebar squeezes every page. |

## MCP (Claude, ChatGPT, Copilot, Cursor, VS Code)

| Feature | Real or mocked | Works as intended | Notes |
| --- | --- | --- | --- |
| MCP server at `/api/mcp` with `ask`, `request_more`, `list_inbox` | Real | ✅ | Every call runs as the signed-in user, with the same visibility rules. Tested: 401 challenge, forged token, 403 without a person, tool list, no leaked locked content or owners. `ask` uses the same mocked search. `ask_person` is commented out, and `request_access` became `request_more`. |
| MCP App answer card for `ask` | Real | 🟡 | In hosts that support [MCP Apps](https://modelcontextprotocol.io/extensions/apps/overview) (Claude, Claude Desktop), `ask` shows a card with the answer, the "Colleagues know more" hint and a "Request access" button. Built on `@modelcontextprotocol/ext-apps`; the build includes its bundle. Tested over HTTP, not yet clicked through in Claude. |
| MCP App inbox card for `list_inbox` | Real | 🟡 | A read-only card with "For you" and "Sent" tabs. Items waiting for you come first, with the drafted reply; each item shows whether it's a question or an access request, its status, who it's from or to, the facts it's about, and the answer. Pending access requests in Sent still show "The owner". Replying happens in the web app: the "Reply in SD Wise" button opens the inbox there. Shares its shell with the answer card ([app-html.ts](../src/lib/mcp/app-html.ts)). Tested over HTTP, not yet clicked through in Claude. |
| Request access from any MCP client | Real | 🟡 | A request always takes a click: `request_more` is card-only. Hosts without the card (Claude Cowork, Claude Code, Cursor) get `requestUrl` plus a ready-made `[Request access](…)` link in the result, and the description tells Claude to show it when no card is shown. It opens `/inbox/request`, where one click sends the request; opening the link sends nothing. The card opens the same link if its own button fails. Depends on Claude showing the link; tested over HTTP, not yet clicked through in Cowork or Cursor. |
| Sign-in for MCP clients (OAuth, consent page, discovery, dynamic registration, CIMD) | Real | ✅ | Better Auth MCP plugin. Outside localhost it needs HTTPS. |
| Integrations → MCP tab: server URL and status | Real | ✅ | The URL with a copy button, and a live check of `/.well-known/oauth-protected-resource/api/mcp`. |
| Integrations → MCP tab: your AI clients | Real | ✅ | Clients you allowed, from Better Auth's OAuth consents, with their logo, when you allowed them, when they last got a token, and what they can see in plain words. Clicked through with two clients registered over real OAuth. |
| Disconnect an AI client | Real | 🟡 | Deletes the consent and revokes the client's refresh tokens; a refresh afterwards fails with `invalid_grant`. Access tokens are JWTs, so one already issued keeps working until it expires, at most an hour. The confirm says so. |
| Setup guides for Claude, ChatGPT, Copilot Studio, Claude Code, Cursor, VS Code, Windsurf | Real | 🟡 | Steps, copyable config and one-click install links for Cursor and VS Code. Claude, ChatGPT and Copilot Studio get a warning on localhost, since they connect from the cloud. The ChatGPT and Copilot Studio menu paths are written from their docs and may drift. Only the Claude Code and Cursor flows were exercised (over OAuth, not in the apps themselves). |
| Tool list on the MCP tab | Real | ✅ | Read from [tools.ts](../src/lib/mcp/tools.ts), the same definitions the server registers, with inputs, a read-only or "only from the answer card" badge. Tools also carry titles and read-only hints for clients. |
| Answer inbox questions, write to the graph, per-tool scopes | Not built | ❌ | Out of scope for v1 ([mcp-scope.md](mcp-scope.md)). |

## Accounts, settings and admin

| Feature | Real or mocked | Works as intended | Notes |
| --- | --- | --- | --- |
| Sign in with email and password | Real | ✅ | Tested. Rate limiting is stored in the database. |
| Sign up | Not built (on purpose) | — | Accounts only come from `pnpm db:seed:accounts` (or `pnpm db:seed:demo`). |
| One account per person | Real | ✅ | Every person in the graph has exactly one account and every account is one person: `user.personId` is required and unique, and deleting a person deletes their account. `pnpm db:seed:accounts` creates the 312 accounts, removes accounts and people that aren't in the graph, and resets every password. Safe to re-run; existing accounts keep their sessions. It only writes the rows that changed, so it also finishes against a remote database. Everyone in the graph owns at least one fact. Tested, and checked by signing in as Kobe, Filip and three others: the graph's "you can see" count matches [accounts.md](accounts.md). |
| Demo questions | Real | ✅ | `pnpm db:seed:demo` seeds the accounts, then adds six questions to inboxes. `--reset` clears all questions first. |
| Settings: name, password, sessions, delete account | Real | ✅ | A deleted account comes back with the next `pnpm db:seed:accounts`. Until then that person can't sign in. |
| Settings: "Connect your AI" | Real | ✅ | Links to Integrations → MCP, which has the setup for every client. |
| Admin: users, search, impersonate, ban, sessions, set password, delete | Real | 🟡 | Works, but nobody is an admin unless `ADMIN_EMAILS` lists them, and it's empty in `.env.example`. Add `kobe@sdwise.be` to use it in the demo. There's no "create user": an account needs a person, so the seed makes them. |
| Plans and entitlements | Unused | — | `getEntitlements` always returns "unlimited" and nothing calls it. Left over from the template. |

## Accounts

Every person in the graph can sign in. All accounts share the password **`password123`**. Run `pnpm db:seed:accounts` (or `pnpm db:seed:demo`) to create them.

The demo cast below signs in with their first name. Everyone else uses `first.last@sdwise.be`, without accents and with multi-word last names joined: Amélie Goossens is `amelie.goossens@sdwise.be`, Sanne Van den Berg is `sanne.vandenberg@sdwise.be`. [accounts.md](accounts.md) lists all 312 with their role and how many facts each owns and can see.

| Name | Email | Password | Role |
| --- | --- | --- | --- |
| Kobe Verdonck | `kobe@sdwise.be` | `password123` | Platform lead |
| Filip Dierckx | `filip@sdwise.be` | `password123` | Payroll operations lead |
| Dario | `dario@sdwise.be` | `password123` | Product lead |
| Victor | `victor@sdwise.be` | `password123` | Backend engineer |
| Julien | `julien@sdwise.be` | `password123` | Data engineer |
| Timon | `timon@sdwise.be` | `password123` | Marketing lead |
| Sofie Peeters | `sofie@sdwise.be` | `password123` | HR business partner |
| Bram De Smet | `bram@sdwise.be` | `password123` | Account manager |
| Lotte Janssens | `lotte@sdwise.be` | `password123` | Financial controller |
| Pieter Claes | `pieter@sdwise.be` | `password123` | Support team lead |
| An Maes | `an@sdwise.be` | `password123` | Payroll legal expert |

## Other

| Feature | Real or mocked | Works as intended | Notes |
| --- | --- | --- | --- |
| Demo video page (`/demo-video`) | Real | ✅ | Two static films from `public/demo`. |
| Marketing films and their sources (`marketing/`) | Real | ✅ | Not part of the app. |

## Biggest gaps

1. **Search:** build the walk from [node-finding.md](node-finding.md) on embeddings. Claude writes the answer and the drafted reply, but only from what the keyword search finds.
2. **Graph in the database:** read facts and edges from Postgres instead of fixtures, and save answers as real facts.
3. **Integrations:** real OAuth and ingestion for at least one source, with access taken from who was in the conversation. Microsoft 365 through Microsoft Graph is the natural first one: the suite flow and its permission list are already on the page.
4. **Privacy:** hide who asked from owners until they share, let owners mark facts as never hinted, and rate-limit questions that only produce a hint.
5. **Small fixes:** a way to ask a colleague again, per-user (or persisted) integration state, and notifications for new questions.
