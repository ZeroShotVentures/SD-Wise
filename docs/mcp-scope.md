# SD Wise MCP v1 scope

**Goal:** a remote MCP server at `/api/mcp` that people add to Cursor or Claude with just a URL. Every call runs as the signed-in user, so existing visibility rules apply.

## In scope

1. **Auth: Better Auth's MCP plugin** (`@better-auth/mcp`), so SD Wise is the OAuth server for MCP clients.
   - `jwt()` signs access tokens; `mcp()` is the OAuth 2.1 provider, with tokens bound to `BETTER_AUTH_URL/api/mcp`; `cimd()` lets MCP 2026-07-28 clients identify with Client ID Metadata Documents.
   - Dynamic client registration is enabled as a fallback, since Cursor and older Claude Code still use it.
   - The sign-in page continues the OAuth flow; a new `/consent` page asks the user to allow the client.
   - `/.well-known/*` forwards to Better Auth for discovery (protected resource and authorization server metadata).
   - Migration `20261020120000_mcp_oauth` adds the OAuth Provider tables and `jwks`.
2. **Endpoint:** `src/app/api/mcp/route.ts`, `@modelcontextprotocol/server` v2 (stateless), wrapped in `requireMcpAuth`. The token's `sub` resolves to a `Person` via `personFor`; accounts without one get a 403. 2025-protocol clients are served statelessly as well.
3. **Tools:** `ask` (with an MCP App answer card), `request_more` (called by the card, or by the model after the user agrees), `list_inbox` (with a read-only inbox card that links to SD Wise for replying). None take a person id.
4. **Shared validation:** zod schemas in `src/lib/graph/schemas.ts`, used by the Server Actions and the tools.
5. **Tests:** 401 challenge without or with a forged token, 403 for users without a person, tool listing, `ask` runs as the token's user and never returns locked content.

## Out of scope for v1

- Answering inbox questions over MCP; graph-write tools.
- Custom scopes per tool. (A "connected apps" list with revoke has since been built, on Integrations → MCP.)
- Replacing the graph fixtures with real data.
