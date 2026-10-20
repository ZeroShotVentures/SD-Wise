import { auth } from "@/lib/auth";

// OAuth discovery for MCP clients lives at the site root, outside the
// /api/auth catch-all, so forward it to Better Auth: the protected resource
// metadata (/.well-known/oauth-protected-resource[/api/mcp]) and the
// authorization server metadata (/.well-known/oauth-authorization-server/api/auth).
// Anything else is a 404 from the handler.
export const GET = (request: Request) => auth.handler(request);
