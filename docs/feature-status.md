# SD Wise feature status

What works, what is mocked, and what isn't built yet. Checked against `main` at `d36c84c` on 20 Oct 2026, then updated for [PR #18](https://github.com/ZeroShotVentures/SD-Wise/pull/18) (hiding locked facts and their owners from `ask`): lint, typecheck, `next build` and all 57 tests pass. Statuses come from reading the code and the tests; nobody clicked through every flow in a browser for this list.

## In short

- **Real:** everything between people. Questions, answers, access requests, the inbox, and answers turning into new facts are stored in Postgres and work across accounts. Sign-in, settings, admin and the MCP server are real too.
- **Mocked:** the company brain itself. All facts, edges and permissions are fixtures in code. The search uses keywords instead of embeddings, and integrations are an in-memory on/off switch. Claude does write the answer and the drafted reply, from whatever that search finds.
- **Not built:** real integrations and fact extraction, the embedding search in [node-finding.md](node-finding.md), notifications, and document sources.

## Legend

| Column | Values |
| --- | --- |
| Real or mocked | **Real**: runs on real data or services. **Mocked**: fake data or simulated behaviour. **Real logic, mock data**: the code is the real thing, but it runs on fixtures. **Unused**: code exists, the app never calls it. **Not built**: promised in the README or docs, no code. |
| Works as intended | ✅ yes · 🟡 partly or only for the demo · ❌ no · 🐛 has a bug |

## Knowledge graph

| Feature | Real or mocked | Works as intended | Notes |
| --- | --- | --- | --- |
| Facts, edges and people | Mocked | 🟡 | 4,300 facts, 6,216 edges and 313 people, all in code: 30 hand-written demo facts ([fixtures.ts](../src/lib/graph/fixtures.ts)), 3,940 generated from a fixed seed ([bulk-fixtures.ts](../src/lib/graph/bulk-fixtures.ts)), and 330 AI-generated ones moved out of the database ([db-fixtures.ts](../src/lib/graph/db-fixtures.ts)). The `KnowledgeNode` and `KnowledgeEdge` tables exist but are empty and never read. |
| Who can see each fact | Mocked | 🟡 | Owners and access lists are assigned in the fixtures, not taken from the source (channel members, mail recipients, meeting attendees). |
| Redaction of locked facts | Real logic, mock data | ✅ | Done on the server, so locked content never reaches the browser. Edges touching a locked fact lose their meaning too. Tested. |
| Graph view (force layout, zoom slider, fit to screen, legend) | Real | ✅ | Renders every fact; locked ones show as a lock. The legend has no entry for documents, but no fact is a document yet. |
| Fact and connection inspector | Real | 🟡 | Shows content, source, owners and connections for visible facts; owners and a "Request access" button for locked ones. Showing owners of locked facts undoes part of the privacy work in `ask`: clicking a lock tells you who knows what. |
| Facts stored in Postgres with pgvector | Unused | ❌ | Schema, migration and `contentEmbedding vector(1536)` exist, but since `785f062` the app reads only the fixtures. |

## Asking SD Wise

| Feature | Real or mocked | Works as intended | Notes |
| --- | --- | --- | --- |
| Search | Mocked | 🟡 | [ai.ts](../src/lib/graph/ai.ts) is a stand-in: keyword overlap (title words count 3, body words 1), then one hop to neighbours. Works for the scripted demo questions, misses paraphrases and synonyms. |
| Search per [node-finding.md](node-finding.md) | Not built | ❌ | No embedding lookup, in-degree scoring, beam walk, or "nearest visible fact" substitute. |
| Answer text | Real logic, mock data | 🟡 | Claude Sonnet 5.5, through the Vercel AI Gateway, writes it from the full text of the matching facts you can see; it never gets locked ones. If they don't answer the question, there is no answer, and "Request access" still shows when locked facts matched. Needs `AI_GATEWAY_API_KEY`. Not yet tried against the live model. |
| Only visible facts in the answer | Real logic, mock data | ✅ | `ask` returns only facts you can see. Locked matches never leave the server: no ids, titles, owners, source or count, in the app or over MCP. Tested, including answers that are partly visible. |
| "There may be more" hint | Real logic, mock data | ✅ | When locked facts also matched, `ask` sets `moreAvailable` and the answer card offers "Request access". It doesn't say who knows. Replaces the old "Others know more" list of owners. Tested for the Kobe ↔ Filip walkthrough. |
| Search animation | Mocked | — | Random nodes flash for at least 1.4 s as the "embedding lookup", then the visit order is replayed, skipping locked facts. Cosmetic. |
| Embedding script (`pnpm db:embed`) | Unused | ❌ | Embeds database rows with `openai/text-embedding-3-small`, but the database has no facts and the search doesn't read embeddings. |
| AI data generation (`pnpm db:seed`) | Unused | ❌ | Writes facts and new people to tables the app no longer reads; its last output was frozen into `db-fixtures.ts`. Running it again changes nothing in the app. |

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
| Request access to a locked fact | Real | ✅ | From the inspector. Stored as an `ACCESS` question; a second request for the same fact reuses the pending one. |
| Request the rest of an answer | Real | ✅ | The "Request access" button on the answer card. The server reruns the search and sends one request per owner of the locked matches, with the asker's question attached, so the asker never learns which facts or whose. It responds the same whether or not anything matched. Goes to the first owner of each fact only. |
| Owner stays hidden until they share | Real | ✅ | In the asker's Sent tab a pending or declined request shows as sent to "The owner". Owners still see who asked. |
| Approve or decline | Real | ✅ | Owners see the asker's question on the request. `approveAccess` checks owners in the full graph, so access to someone's private answer can be approved too. |

## Integrations

| Feature | Real or mocked | Works as intended | Notes |
| --- | --- | --- | --- |
| Integrations page (Slack, Teams, Outlook, Gmail, Teams meetings, Google Meet, Zoom) | Mocked | 🟡 | A fixture list with fact and people counts per source. |
| Connect | Mocked | ❌ | The dialog shows "Signing in", "Mapping who is in which conversation" and "Extracting facts" on 900 ms timers, then flips a flag. No OAuth, nothing is read. |
| Disconnect | Mocked | 🟡 | Facts from that source really do drop out of the graph and search. But the switch is shared by every user, lives in server memory, resets on restart, and isn't shared between server instances. |
| Gmail, Google Meet, Zoom | Mocked | ❌ | They have no facts, so connecting them changes nothing. |
| Real ingestion and fact extraction | Not built | ❌ | The database enum only knows `slack`, `email` and `google_meet`; Teams, Outlook, Gmail, Teams meetings and Zoom are proposals in [types.ts](../src/lib/graph/types.ts). |
| Documents and file systems | Not built | ❌ | The README names them as knowledge sources, but there is no integration and no document facts. |

## MCP (Cursor, Claude)

| Feature | Real or mocked | Works as intended | Notes |
| --- | --- | --- | --- |
| MCP server at `/api/mcp` with `ask`, `request_more`, `list_inbox` | Real | ✅ | Every call runs as the signed-in user, with the same visibility rules. Tested: 401 challenge, forged token, 403 without a person, tool list, no leaked locked content or owners. `ask` uses the same mocked search. `ask_person` is commented out, and `request_access` became `request_more`. |
| MCP App answer card for `ask` | Real | 🟡 | In hosts that support [MCP Apps](https://modelcontextprotocol.io/extensions/apps/overview) (Claude, Claude Desktop), `ask` shows a card with the answer, the "There may be more" hint and a "Request access" button. Built on `@modelcontextprotocol/ext-apps`; the build includes its bundle. Tested over HTTP, not yet clicked through in Claude. |
| `request_more` only from the card | Real | 🟡 | The tool is marked app-only, so a request needs a click and the model can't send one by itself. Clients without MCP Apps (Cursor, Claude Code in a terminal) can't request access at all. |
| Sign-in for MCP clients (OAuth, consent page, discovery, dynamic registration, CIMD) | Real | ✅ | Better Auth MCP plugin. Outside localhost it needs HTTPS. |
| Answer inbox questions, write to the graph, per-tool scopes, revoke connected apps | Not built | ❌ | Out of scope for v1 ([mcp-scope.md](mcp-scope.md)). |

## Accounts, settings and admin

| Feature | Real or mocked | Works as intended | Notes |
| --- | --- | --- | --- |
| Sign in with email and password | Real | ✅ | Tested. Rate limiting is stored in the database. |
| Sign up | Not built (on purpose) | — | Accounts only come from `pnpm db:seed:demo`, which also deletes every account except Kobe and Filip. Accounts without a person get a 404 on the graph, inbox and integrations pages. |
| Demo accounts and demo questions | Real | ✅ | Kobe and Filip, `password123`. `--reset` clears all questions first. |
| Settings: name, password, sessions, delete account | Real | ✅ | Deleting Kobe or Filip breaks the demo until the next `pnpm db:seed:demo`. |
| Settings: "Connect your AI" | Real | ✅ | Shows the Cursor and Claude Code config for this deployment's URL. |
| Admin: users, search, impersonate, ban, sessions, set password, delete | Real | 🟡 | Works, but nobody is an admin unless `ADMIN_EMAILS` lists them, and it's empty in `.env.example`. Add `kobe@sdwise.be` to use it in the demo. There's no "create user". |
| Plans and entitlements | Unused | — | `getEntitlements` always returns "unlimited" and nothing calls it. Left over from the template. |

## Other

| Feature | Real or mocked | Works as intended | Notes |
| --- | --- | --- | --- |
| Demo video page (`/demo-video`) | Real | ✅ | Two static films from `public/demo`. |
| Marketing films and their sources (`marketing/`) | Real | ✅ | Not part of the app. |

## Biggest gaps

1. **Search:** build the walk from [node-finding.md](node-finding.md) on embeddings. Claude writes the answer and the drafted reply, but only from what the keyword search finds.
2. **Graph in the database:** read facts and edges from Postgres instead of fixtures, and save answers as real facts.
3. **Integrations:** real OAuth and ingestion for at least one source, with access taken from who was in the conversation.
4. **Privacy:** stop the inspector from showing owners of locked facts, hide who asked from owners until they share, let owners mark facts as never hinted, and rate-limit questions that only produce a hint.
5. **Small fixes:** a way to ask a colleague again, per-user (or persisted) integration state, and notifications for new questions.
