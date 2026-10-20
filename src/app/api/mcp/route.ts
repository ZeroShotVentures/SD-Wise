import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { authenticate } from "@/lib/mcp/auth";
import { createMcpServer } from "@/lib/mcp/server";

// Stateless MCP over streamable HTTP: a fresh server per request, acting as
// the token's owner. Create a token in Settings.
export async function POST(request: Request) {
  const me = await authenticate(request);
  if (!me) {
    return Response.json(
      { error: "Missing or invalid token" },
      { status: 401, headers: { "WWW-Authenticate": "Bearer" } },
    );
  }

  const server = createMcpServer(me);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  return transport.handleRequest(request);
}

const notAllowed = () =>
  Response.json(
    { error: "Method not allowed" },
    { status: 405, headers: { Allow: "POST" } },
  );

export const GET = notAllowed;
export const DELETE = notAllowed;
