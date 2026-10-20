import { requireMcpAuth } from "@better-auth/mcp";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { auth, mcpResource } from "@/lib/auth";
import { personFor } from "@/lib/graph/service";
import { createMcpServer } from "@/lib/mcp/server";

// Stateless MCP over streamable HTTP. requireMcpAuth verifies the OAuth access
// token Better Auth issued (signature, issuer, audience, expiry) and answers
// unauthenticated requests with the challenge MCP clients use to sign in.
export const POST = requireMcpAuth(
  auth,
  async (request, claims) => {
    const me = claims.sub ? await personFor(claims.sub) : null;
    if (!me) {
      return Response.json(
        { error: "This account has no place in the graph" },
        { status: 403 },
      );
    }
    // Clients still on the 2025 protocol are served statelessly too.
    return createMcpHandler(() => createMcpServer(me), {
      legacy: "stateless",
    }).fetch(request);
  },
  { resource: mcpResource },
);
