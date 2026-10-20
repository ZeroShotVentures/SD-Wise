import "server-only";
import {
  RESOURCE_MIME_TYPE,
  registerAppResource,
  registerAppTool,
} from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/server";
import { question, requestMoreInput } from "@/lib/graph/schemas";
import * as graph from "@/lib/graph/service";
import type { Person } from "@/lib/graph/types";
import { ASK_APP_URI, askAppHtml } from "./ask-app";
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

  registerAppResource(
    server,
    "SD Wise answer",
    ASK_APP_URI,
    { description: "Shows an SD Wise answer, with a button to request more." },
    async () => ({
      contents: [
        {
          uri: ASK_APP_URI,
          mimeType: RESOURCE_MIME_TYPE,
          text: await askAppHtml(),
        },
      ],
    }),
  );

  registerAppTool(server, "ask", tools.ask, async (input) => {
    const [result, view] = await Promise.all([
      graph.ask(me, question.parse(input.question)),
      graph.getGraph(me),
    ]);
    const out = formatAsk(result, view.nodes);
    return { ...json(out), structuredContent: out };
  });

  registerAppTool(server, "request_more", tools.request_more, async (input) => {
    const data = requestMoreInput.parse(input);
    await graph.requestMore(me, data.question);
    return json({ requested: true });
  });

  // Replaced by the answer card's Request access button.
  // server.registerTool(
  //   "ask_person",
  //   {
  //     description:
  //       "Send a question to a specific colleague by their person id. They get it in their inbox with a drafted reply.",
  //     inputSchema: askPersonInput,
  //   },
  //   async (input) => {
  //     const data = askPersonInput.parse(input);
  //     await graph.askPerson(me, data.recipientId, data.question, data.nodeIds);
  //     return json({ sent: true, to: data.recipientId });
  //   },
  // );

  server.registerTool("list_inbox", tools.list_inbox, async () =>
    json(formatInbox(await graph.getInbox(me))),
  );

  return server;
}
