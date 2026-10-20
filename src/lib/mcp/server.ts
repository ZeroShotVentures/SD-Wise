import "server-only";
import {
  RESOURCE_MIME_TYPE,
  registerAppResource,
  registerAppTool,
} from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { env } from "@/env";
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
        "Ask the SD Wise company brain a question. Answers only with what you are allowed to see. If `moreAvailable` is true, other people hold relevant information you can't see; SD Wise won't say what or whose. Tell the user that, and if there are facts, that the answer may be incomplete. Hosts that support MCP Apps show the result in an answer card automatically, with a Request access button. When the card is shown, don't repeat the answer word for word or draw your own visual of it; just add what the card doesn't say. Without the card, give them a way to request the rest: show `requestUrl` as a link labelled \"Request access\", and offer to send the request with `request_more` if they say yes.",
      inputSchema: z.object({ question }),
    },
    async (input) => {
      const [result, view] = await Promise.all([
        graph.ask(me, question.parse(input.question)),
        graph.getGraph(me),
      ]);
      const out = formatAsk(result, view.nodes, env.BETTER_AUTH_URL);
      return { ...json(out), structuredContent: out };
    },
  );

  // Called by the answer card's button, or by the model once the user said
  // yes in hosts that don't show the card.
  registerAppTool(
    server,
    "request_more",
    {
      _meta: { ui: { resourceUri: ASK_APP_URI, visibility: ["model", "app"] } },
      description:
        "Forward a question to whoever holds the locked information behind `moreAvailable`. They decide whether to share it; the user never learns who they are. Only call this after the user explicitly agreed to request access.",
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
        "List the questions and access requests sent to you, and the ones you sent, with their status and answers. Hosts that support MCP Apps show the result in an inbox card automatically. When the card is shown, don't repeat the inbox as a table or draw your own visual of it; just point out in a sentence or two what needs attention. Replying happens in SD Wise itself; the card links there.",
    },
    async () => {
      const out = formatInbox(await graph.getInbox(me));
      return { ...json(out), structuredContent: out };
    },
  );

  return server;
}
