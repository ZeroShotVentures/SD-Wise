import "server-only";
import {
  RESOURCE_MIME_TYPE,
  registerAppResource,
  registerAppTool,
} from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { question, requestMoreInput } from "@/lib/graph/schemas";
import * as graph from "@/lib/graph/service";
import type { Person } from "@/lib/graph/types";
import { ASK_APP_URI, askAppHtml } from "./ask-app";
import { formatAsk, formatInbox } from "./format";
import { INBOX_APP_URI, inboxAppHtml } from "./inbox-app";

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

  registerAppTool(
    server,
    "ask",
    {
      _meta: { ui: { resourceUri: ASK_APP_URI } },
      description:
        "Ask the SD Wise company brain a question. Answers only with what you are allowed to see. If `moreAvailable` is true, other people hold relevant information you can't see; SD Wise won't say what or whose. Tell the user that, and if there are facts, that the answer may be incomplete. The answer card has a Request access button for the rest.",
      inputSchema: z.object({ question }),
    },
    async (input) => {
      const [result, view] = await Promise.all([
        graph.ask(me, question.parse(input.question)),
        graph.getGraph(me),
      ]);
      const out = formatAsk(result, view.nodes);
      return { ...json(out), structuredContent: out };
    },
  );

  // Only the answer card's button calls this, so a request always comes from
  // the user clicking, never from the model on its own.
  registerAppTool(
    server,
    "request_more",
    {
      _meta: { ui: { resourceUri: ASK_APP_URI, visibility: ["app"] } },
      description:
        "Forward a question to whoever holds the locked information behind `moreAvailable`. They decide whether to share it.",
      inputSchema: requestMoreInput,
    },
    async (input) => {
      const data = requestMoreInput.parse(input);
      await graph.requestMore(me, data.question);
      return json({ requested: true });
    },
  );

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

  registerAppResource(
    server,
    "SD Wise inbox",
    INBOX_APP_URI,
    { description: "Shows the questions and access requests in SD Wise." },
    async () => ({
      contents: [
        {
          uri: INBOX_APP_URI,
          mimeType: RESOURCE_MIME_TYPE,
          text: await inboxAppHtml(),
        },
      ],
    }),
  );

  registerAppTool(
    server,
    "list_inbox",
    {
      _meta: { ui: { resourceUri: INBOX_APP_URI } },
      description:
        "List the questions and access requests sent to you, and the ones you sent, with their status and answers. Hosts that support MCP Apps show them in an inbox card. Replying happens in SD Wise itself; the card links there.",
    },
    async () => {
      const out = formatInbox(await graph.getInbox(me));
      return { ...json(out), structuredContent: out };
    },
  );

  return server;
}
