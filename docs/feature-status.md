# SD Wise feature status

What works, what is mocked, and what isn't built yet. Checked against `main` at `d36c84c` on 20 Oct 2026, then updated for [PR #18](https://github.com/ZeroShotVentures/SD-Wise/pull/18) (hiding locked facts and their owners from `ask`), [PR #21](https://github.com/ZeroShotVentures/SD-Wise/pull/21) (MCP inbox card), [PR #22](https://github.com/ZeroShotVentures/SD-Wise/pull/22) (semantic zoom for the graph), [PR #20](https://github.com/ZeroShotVentures/SD-Wise/pull/20) (integrations page revamp, Microsoft 365, MCP tab) and [PR #24](https://github.com/ZeroShotVentures/SD-Wise/pull/24) (an account for every person in the graph, access that starts with the owners only): lint, typecheck, `next build` and all 78 tests pass. Then updated for the graph moving into Postgres, checked on a local database with the demo data: migration, seeds, every service path and the graph, inbox, request and integrations pages; 77 tests pass, plus 5 that run against Postgres in CI. Then updated for [PR #28](https://github.com/ZeroShotVentures/SD-Wise/pull/28) (the Teams demo at `/teams`). Statuses come from reading the code and the tests; the Integrations page from PR #20 and the access flow from PR #24 were also clicked through in a browser, the rest of this list wasn't.

## In short

- **Real:** the graph's storage and everything between people. Facts, edges, who can see what, which sources are connected, questions, answers and the inbox are all in Postgres; an answer becomes a fact row. Nobody can request access to a fact: people ask questions, and whoever knows answers them. Works across accounts and server instances. Every person who owns a fact has an account, so you can sign in as anyone and see the graph as they do. Sign-in, settings, admin and the MCP server are real too, including the MCP tab on the Integrations page and revoking AI clients there.
- **Mocked:** where the company brain comes from. The facts, edges and owners in the database are seeded from fixtures in code (`pnpm db:seed`), not extracted from sources. The search uses keywords instead of embeddings, and integrations (now with real logos, Microsoft 365 as one suite, and a Documents category) are an on/off switch shared by everyone. Claude does write the answer and the drafted reply, from whatever that search finds.
- **Not built:** real integrations and fact extraction, the embedding search in [node-finding.md](node-finding.md), notifications, and facts from documents (the document sources can be "connected" but bring nothing).

## Legend

| Column | Values |
| --- | --- |
| Real or mocked | **Real**: runs on real data or services. **Mocked**: fake data or simulated behaviour. **Real logic, mock data**: the code is the real thing, but it runs on fixtures. **Unused**: code exists, the app never calls it. **Not built**: promised in the README or docs, no code. |
| Works as intended | ✅ yes · 🟡 partly or only for the demo · ❌ no · 🐛 has a bug |

## Knowledge graph

| Feature | Real or mocked | Works as intended | Notes |
| --- | --- | --- | --- |
| Facts, edges and people | Real logic, mock data | 🟡 | Read from Postgres (`KnowledgeNode`, `KnowledgeEdge`, `NodeAccess`, `Person`) through [store.ts](../src/lib/graph/store.ts). `pnpm db:seed` writes 4,309 facts, 6,229 edges, plus 1,792 links that join facts which were cut off (see Topic islands) and 312 people from code: 30 hand-written demo facts ([fixtures.ts](../src/lib/graph/fixtures.ts)), 3,940 generated from a fixed seed ([bulk-fixtures.ts](../src/lib/graph/bulk-fixtures.ts)), 330 AI-generated ones ([db-fixtures.ts](../src/lib/graph/db-fixtures.ts)), and 9 about onboarding Coca-Cola for the demo question "How is the onboarding of Coca Cola going?" ([cocacola-fixtures.ts](../src/lib/graph/cocacola-fixtures.ts)). Safe to re-run; it never deletes. Every request reads the whole graph (about 2.5 MB, 40–130 ms on a local database). |
| Who can see each fact | Real logic, mock data | 🟡 | One rule for everyone: a private fact is visible to its owners, the people who were in the conversation. The fixtures only set owners; access starts as exactly the owners ([fixtures.ts](../src/lib/graph/fixtures.ts)) and only grows in SD Wise, when an owner shares a fact or answers a question. Every owner is an account ([Accounts](#accounts)), so the locks in the graph are the signed-in person's own. Kobe and Filip take part in some of their own team's conversations (IT and Production), like everyone else, so they own 30 and 26 facts. Stored as `visibility` and `NodeAccess` rows: the owners in order, plus whoever they shared with. Tested for every account, and against Postgres. Still 🟡 because owners come from the fixtures, not from the source (channel members, mail recipients, meeting attendees). |
| Redaction of locked facts | Real logic, mock data | ✅ | Done on the server, so locked content never reaches the browser. Edges touching a locked fact lose their meaning too. Tested. |
| Graph view (semantic zoom, zoom slider, fit to screen, legend) | Real | ✅ | Renders every fact; locked ones show as a lock. Detail depends on zoom: zoomed out you see topic islands with names, fact counts and bundled links between topics; zooming in fades in the edges and moves island names to the island's edge as captions; zoomed in shows fact names wherever they fit without overlapping. Click an island to zoom into it; hover a fact to highlight its neighbours. Screenshots in [graph-semantic-zoom](graph-semantic-zoom/README.md). The legend has no entry for documents, but no fact is a document yet. |
| Topic islands and their names | Real logic, mock data | ✅ | Computed in the browser from the graph's edges (Louvain, [clusters.ts](../src/lib/graph/clusters.ts)): 30 topics on the demo graph. Louvain depends on node order, so the graph is read oldest first. Names are the phrases most typical of each topic, taken only from titles the viewer can see, so they never leak a locked fact; a topic with nothing visible is "Private knowledge". Every fact is on a topic: the seed links facts that were cut off from the graph ([links.ts](../src/lib/graph/links.ts)), 637 of them on the demo graph, so the "Not connected yet" island is gone. It only comes back for facts whose links all lead into a disconnected source, such as an answer based on Outlook facts while Outlook is off. Tested. Some names are generic ("Cohort", "Budget") because the mock titles are. |
| Fact and connection inspector | Real | ✅ | Shows content, source, owners and connections for visible facts. A locked fact shows only its source and date, and points to asking a question about it: its owners never reach the browser, so clicking a lock doesn't tell you who knows what. There's no way to request access to a fact. Tested, and clicked through in a browser. |
| Embeddings in Postgres with pgvector | Unused | ❌ | `contentEmbedding vector(1536)` and its index exist, and facts are now in the table, but nothing writes or reads embeddings unless `pnpm db:embed` is run. |

## Asking SD Wise

| Feature | Real or mocked | Works as intended | Notes |
| --- | --- | --- | --- |
| Search | Mocked | 🟡 | [ai.ts](../src/lib/graph/ai.ts) is a stand-in: keyword overlap (title words count 3, body words 1), then one hop to neighbours. Works for the scripted demo questions, misses paraphrases and synonyms. |
| Search per [node-finding.md](node-finding.md) | Not built | ❌ | No embedding lookup, in-degree scoring, beam walk, or "nearest visible fact" substitute. |
| Answer text | Real logic, mock data | 🟡 | Claude Sonnet 5.5, through the Vercel AI Gateway, writes it from the full text of the matching facts you can see; it never gets locked ones. If they don't answer the question, there is no answer, and "Ask a colleague" still shows when locked facts matched. Needs `AI_GATEWAY_API_KEY`. Not yet tried against the live model. |
| Only visible facts in the answer | Real logic, mock data | ✅ | `ask` returns only facts you can see. Locked matches never leave the server with their titles, content or owners. In the app, `lockedHits` carries their ids (already on the graph as locked nodes) so the search lights them up in red; over MCP and in the chat they stay out entirely. Tested, including answers that are partly visible. |
| "Colleagues know more" hint | Real logic, mock data | ✅ | When locked facts also matched, `ask` sets `moreAvailable` and the answer card offers "Ask a colleague", pointing at the locked matches lit up in red on the graph. It doesn't say who knows. Replaces the old "Others know more" list of owners. Tested for the Kobe ↔ Filip walkthrough. |
| Search animation | Mocked | — | Random nodes flash for at least 1.4 s as the "embedding lookup", then the visit order is replayed, skipping locked facts. Cosmetic. |
| Embedding script (`pnpm db:embed`) | Unused | ❌ | Embeds database rows with `openai/text-embedding-3-small`. Would now embed all 4,309 facts, but the search doesn't read embeddings. |
| Graph seed (`pnpm db:seed`) | Real | ✅ | Puts the graph back to how a demo starts: deletes every question, with the answers it added, every fact and edge, and which sources are connected; then writes the fixture graph and the demo questions, and links facts cut off from the graph. Accounts, passwords and sessions stay. One transaction, tested in CI. People come from the same code as `pnpm db:seed:accounts`, which then gives each an account. Replaces the AI data generator, whose output lives on in `db-fixtures.ts`. |

## Asking people

| Feature | Real or mocked | Works as intended | Notes |
| --- | --- | --- | --- |
| Ask a colleague | Real | 🟡 | Stored in the `Question` table. The colleague must exist as a `Person` row; `pnpm db:seed` creates one for every fixture person. Since PR #18 nothing in the app or over MCP starts one: the "Ask {name}" button lived in the "Others know more" list, which is gone, and `ask_person` is commented out. The backend and inbox still work. |
| Drafted reply for the colleague | Real logic, mock data | 🟡 | Claude Sonnet 5.5 writes it once, right after the question is sent, from the facts the colleague can see, and it's stored on the question. Questions without one (demo questions, failed calls) get it on the next inbox load. Every question gets one, including those SD Wise routes to whoever knows. Not yet tried against the live model. |
| Inbox: received and sent, answer, decline | Real | ✅ | A question can only be resolved once. Received questions can also be answered from the [Teams demo](#teams-demo-teams). |
| Ask whoever knows more | Real | ✅ | The "Ask a colleague" button under "Colleagues know more" on the answer card. The server reruns the search and sends the question to the first owner of the locked matches, one question per owner with their matched facts attached and a drafted reply, so the asker never learns which facts or whose. It responds the same whether or not anything matched; a second ask while one is pending reuses it. Stored as a question with `routed` set. The facts stay private: only the answer reaches the asker. |
| Owner stays hidden until they answer | Real | ✅ | In the asker's Sent tab a routed question that's pending or declined shows as sent to "A colleague who knows". Owners still see who asked. |
| Share an answer with the asker or everyone | Real | ✅ | "Everyone" makes the new fact public. Tested. |
| Answers become new facts in the asker's graph | Real | ✅ | Saved as a fact, in the same transaction as the answer, with `ANSWERS` edges to the facts it was based on that the person answering could see. Deleting the question deletes the fact. Tested against Postgres. |
| "New for you" highlight | Real | ✅ | Cleared when the asker opens the new fact. |
| Pending count in the sidebar | Real | ✅ | |
| Notifications (email, Slack, push) | Not built | ❌ | The app sends no email. People only see a question when they open SD Wise, or when `/teams` is already open (it polls). |

## Integrations

The **Sources** tab of the Integrations page. Everything here is mocked; the **MCP** tab is real and listed under MCP below.

| Feature | Real or mocked | Works as intended | Notes |
| --- | --- | --- | --- |
| Integrations page: 13 sources in Chat, Email, Meetings and Documents | Mocked | 🟡 | Slack, Microsoft Teams, Outlook, Gmail, Teams meetings, Google Meet, Zoom, SharePoint, OneDrive, OneNote, Google Drive, Notion and Confluence, from a fixture list with fact and people counts per source. Real brand logos in `public/logos` (Iconify `logos`, `vscode-icons` and `simple-icons` sets). Search (`/` to focus), filter chips with counts, empty state. |
| Microsoft 365 suite | Mocked | 🟡 | One card for Teams, Teams meetings, Outlook, SharePoint, OneDrive and OneNote with a progress ring. "Connect N more" picks apps and runs one "Sign in with Microsoft", listing the read-only Microsoft Graph permissions it would ask for (`Mail.Read`, `Sites.Read.All`, …). No real Entra ID app, no OAuth. |
| Connect | Mocked | ❌ | The dialog shows sign-in, mapping and extraction steps on 650 ms timers (one step per app for a suite), then flips the flags. No OAuth, nothing is read. |
| Disconnect | Mocked | 🟡 | Immediate, with an Undo toast. Facts from that source really do drop out of the graph and search. The switch is stored in the database, so it survives restarts and is the same on every instance, but it's shared by every user. Undo resets the "since" date to today. |
| Gmail, Google Meet, Zoom and every Documents source | Mocked | ❌ | They have no facts, so connecting them changes nothing; their cards say "Indexing" forever. |
| Real ingestion and fact extraction | Not built | ❌ | The database knows all 13 kinds of source, but nothing reads from them. |
| Documents and file systems | Not built | ❌ | SharePoint, OneDrive, OneNote, Google Drive, Notion and Confluence exist as sources on the page only. There are no document facts. |
| Phone layout | Not built | 🟡 | The page works from about 1024 px wide. Below that the app shell's fixed sidebar squeezes every page. |

## MCP (Claude, ChatGPT, Copilot, Cursor, VS Code)

| Feature | Real or mocked | Works as intended | Notes |
| --- | --- | --- | --- |
| MCP server at `/api/mcp` with `ask`, `ask_owners`, `list_inbox` | Real | ✅ | Every call runs as the signed-in user, with the same visibility rules. Tested: 401 challenge, forged token, 403 without a person, tool list, no leaked locked content or owners. `ask` uses the same mocked search. `ask_person` is commented out; `ask_owners` replaced `request_more`, which forwarded access requests. |
| MCP App answer card for `ask` | Real | 🟡 | In hosts that support [MCP Apps](https://modelcontextprotocol.io/extensions/apps/overview) (Claude, Claude Desktop), `ask` shows a card with the answer, the "Colleagues know more" hint and an "Ask a colleague" button. Built on `@modelcontextprotocol/ext-apps`; the build includes its bundle. Tested over HTTP, not yet clicked through in Claude. |
| MCP App inbox card for `list_inbox` | Real | 🟡 | A read-only card with "For you" and "Sent" tabs. Items waiting for you come first, with the drafted reply; each item shows its status, who it's from or to, the facts it's about, and the answer. Pending routed questions in Sent show "A colleague who knows". Replying happens in the web app: the "Reply in SD Wise" button opens the inbox there. Shares its shell with the answer card ([app-html.ts](../src/lib/mcp/app-html.ts)). Tested over HTTP, not yet clicked through in Claude. |
| Ask whoever knows from any MCP client | Real | 🟡 | Asking always takes a click: `ask_owners` is card-only. Hosts without the card (Claude Cowork, Claude Code, Cursor) get `requestUrl` plus a ready-made `[Ask a colleague](…)` link in the result, and the description tells Claude to show it when no card is shown. It opens `/inbox/request`, where one click sends the question; opening the link sends nothing. The card opens the same link if its own button fails. Depends on Claude showing the link; tested over HTTP, not yet clicked through in Cowork or Cursor. |
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
| One account per person | Real | ✅ | Every person in the graph has exactly one account and every account is one person: `user.personId` is required and unique, and deleting a person deletes their account. `pnpm db:seed:accounts` creates the 312 accounts, removes accounts and people that aren't in the graph, and resets every password. Safe to re-run; existing accounts keep their sessions. Everyone in the graph owns at least one fact. Tested, and checked by signing in as Kobe, Filip and three others: the graph's "you can see" count matches [accounts.md](accounts.md). |
| Demo questions | Real | ✅ | `pnpm db:seed` (and `pnpm db:seed:demo`, which seeds the accounts first) puts six questions in inboxes, after deleting every other question. |
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

## Teams demo (`/teams`)

A Microsoft Teams look-alike with SD Wise installed as an app ([PR #28](https://github.com/ZeroShotVentures/SD-Wise/pull/28)). Standalone: reachable by URL only, not from the sidebar, and it needs a signed-in person. Only the SD Wise parts are real; the rest of Teams is mock data in [data.ts](../src/components/teams/data.ts).

| Feature | Real or mocked | Works as intended | Notes |
| --- | --- | --- | --- |
| SD Wise chat | Real logic, mock data | 🟡 | Pinned chat that calls the same `ask` as the graph page, with suggested questions. The reply is a card with the answer, the facts it cites (titles through `factsFor`, only ones you can see) and the existing "Ask a colleague" button when colleagues know more. Same mocked search. Checked as Kobe for the deploy-freeze and payroll cut-off questions. |
| Questions from SD Wise as chats | Real | 🟡 | Every question in your inbox opens its own chat, newest pending first. The bot posts the question as a card; the message bar is prefilled with the drafted reply, which you can edit or replace ("Use draft" restores it), pick "Only them" or "Everyone", then Send or Decline. Uses the inbox's server actions, so both pages stay in sync. Rendered as Kobe and Filip; the send and decline buttons weren't clicked through. |
| New questions while the page is open | Real | 🟡 | The page refreshes every 15 s and on window focus; a new pending question shows a toast with "Open". Only while `/teams` is open, so not a notification. |
| Teams shell: chats, channels, activity, calendar, calls | Mocked | ✅ | Colleague chats with canned replies, channels with reactions and thread replies, an activity feed, a day calendar with Join and Meet now, a call screen, emoji, @mention and attach, presence, unread filters, new chat, back and forward, "Mark all as read" and "Reset demo". Nothing is stored; a reload resets it. |

## Other

| Feature | Real or mocked | Works as intended | Notes |
| --- | --- | --- | --- |
| Demo video page (`/demo-video`) | Real | ✅ | Two static films from `public/demo`. |
| Marketing films and their sources (`marketing/`) | Real | ✅ | Not part of the app. |

## Biggest gaps

1. **Search:** build the walk from [node-finding.md](node-finding.md) on embeddings. Claude writes the answer and the drafted reply, but only from what the keyword search finds.
2. **Graph from sources:** the graph is in Postgres, but seeded from fixtures. Facts and access should come from ingestion (see 3).
3. **Integrations:** real OAuth and ingestion for at least one source, with access taken from who was in the conversation. Microsoft 365 through Microsoft Graph is the natural first one: the suite flow and its permission list are already on the page.
4. **Privacy:** hide who asked from owners until they share, let owners mark facts as never hinted, and rate-limit questions that only produce a hint.
5. **Small fixes:** a way to ask a colleague again, per-user integration state, and notifications for new questions.
