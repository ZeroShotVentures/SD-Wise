# SD Wise MCP v1 scope

**Goal:** a remote MCP server at `/api/mcp` that can be added to Cursor or Claude with a URL and a token. Every call runs as the token's owner, so existing visibility rules apply.

## In scope

1. **Endpoint:** `src/app/api/mcp/route.ts`, streamable HTTP, built on `mcp-handler` and `@modelcontextprotocol/sdk`.
2. **Auth:** one personal access token per user, sent as `Authorization: Bearer <token>`.
   - New `McpToken` table: hashed token, `userId`, label, `lastUsedAt`.
   - Minted from a "Connect your AI" card on `/settings`; shown once, revocable.
   - Token resolves to a `userId`, then to a `Person` via `personFor`. No tool takes a person id.
3. **Tools:**
   - `ask(question)` -> `graph.ask`: visible facts, locked facts with owner, "who knows more".
   - `ask_person(recipientId, question, nodeIds?)` -> `graph.askPerson`.
   - `request_access(nodeId, ownerId)` -> `graph.requestAccess`.
   - `list_inbox()` -> read-only incoming questions and answers.
4. **Shared validation:** move the zod schemas out of `src/app/(app)/graph/actions.ts` so actions and MCP tools share them.
5. **Tests (vitest):** 401 without or with an invalid/revoked token; locked node content never appears in tool output; the caller is always the token's owner.
6. **Docs:** README section with client config.
   - Cursor: `{"mcpServers":{"sdwise":{"url":"https://<host>/api/mcp","headers":{"Authorization":"Bearer sdw_..."}}}}`
   - Claude Code: `claude mcp add --transport http sdwise https://<host>/api/mcp --header "Authorization: Bearer sdw_..."`

## Out of scope for v1

- OAuth (needed for claude.ai connector UI); later via better-auth's OAuth/MCP plugin.
- Answering inbox questions over MCP; graph-write tools.
- Per-tool scopes and extra rate limiting.
- Replacing the graph fixtures with real data.

## Order of work

1. `McpToken` model and token helpers.
2. Route and `ask`.
3. Remaining tools.
4. Settings card.
5. Tests and docs.

## Open choices

- Needs a public HTTPS URL; locally use `pnpm dev` plus a tunnel.
- Own `McpToken` table rather than better-auth's `apiKey` plugin, to avoid another plugin.
