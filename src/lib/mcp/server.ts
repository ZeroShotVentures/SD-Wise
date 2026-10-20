import "server-only";
import { McpServer } from "@modelcontextprotocol/server";
import {
  askPersonInput,
  question,
  requestAccessInput,
} from "@/lib/graph/schemas";
import * as graph from "@/lib/graph/service";
import type { Person } from "@/lib/graph/types";
import { formatAsk, formatInbox } from "./format";
import { tools } from "./tools";

const json = (value: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
});

// Every tool acts as `me`, the user the access token was issued to. Nothing
// in a tool's input can name another identity, and all visibility rules stay
// in the graph service.
export function createMcpServer(me: Person) {
  const server = new McpServer({ name: "sd-wise", version: "0.1.0" });

  server.registerTool("ask", tools.ask, async (input) => {
    const [result, view] = await Promise.all([
      graph.ask(me, question.parse(input.question)),
      graph.getGraph(me),
    ]);
    return json(formatAsk(result, view.nodes, view.people));
  });

  server.registerTool("ask_person", tools.ask_person, async (input) => {
    const data = askPersonInput.parse(input);
    await graph.askPerson(me, data.recipientId, data.question, data.nodeIds);
    return json({ sent: true, to: data.recipientId });
  });

  server.registerTool("request_access", tools.request_access, async (input) => {
    const data = requestAccessInput.parse(input);
    await graph.requestAccess(me, data.nodeId, data.ownerId);
    return json({ requested: true, nodeId: data.nodeId });
  });

  server.registerTool("list_inbox", tools.list_inbox, async () =>
    json(formatInbox(await graph.getInbox(me))),
  );

  return server;
}
