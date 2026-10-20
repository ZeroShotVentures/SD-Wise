import "server-only";
import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import {
  askPersonInput,
  question,
  requestAccessInput,
} from "@/lib/graph/schemas";
import * as graph from "@/lib/graph/service";
import type { Person } from "@/lib/graph/types";
import { formatAsk, formatInbox } from "./format";

const json = (value: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
});

// Every tool acts as `me`, the user the access token was issued to. Nothing
// in a tool's input can name another identity, and all visibility rules stay
// in the graph service.
export function createMcpServer(me: Person) {
  const server = new McpServer({ name: "sd-wise", version: "0.1.0" });

  server.registerTool(
    "ask",
    {
      description:
        "Ask the SD Wise company brain a question. Answers only with what you are allowed to see. Facts you can't see come back as locked facts with their owners, plus people who know more.",
      inputSchema: z.object({ question }),
    },
    async (input) => {
      const [result, view] = await Promise.all([
        graph.ask(me, question.parse(input.question)),
        graph.getGraph(me),
      ]);
      return json(formatAsk(result, view.nodes, view.people));
    },
  );

  server.registerTool(
    "ask_person",
    {
      description:
        "Send a question to a colleague. They get it in their inbox with a drafted reply. Use ids from `ask` (peopleWhoKnowMore and nodeIds).",
      inputSchema: askPersonInput,
    },
    async (input) => {
      const data = askPersonInput.parse(input);
      await graph.askPerson(me, data.recipientId, data.question, data.nodeIds);
      return json({ sent: true, to: data.recipientId });
    },
  );

  server.registerTool(
    "request_access",
    {
      description:
        "Ask the owner of a locked fact for access. Use a locked fact id and one of its owner ids from `ask`.",
      inputSchema: requestAccessInput,
    },
    async (input) => {
      const data = requestAccessInput.parse(input);
      await graph.requestAccess(me, data.nodeId, data.ownerId);
      return json({ requested: true, nodeId: data.nodeId });
    },
  );

  server.registerTool(
    "list_inbox",
    {
      description:
        "List the questions and access requests sent to you, and the ones you sent, with their status and answers.",
    },
    async () => json(formatInbox(await graph.getInbox(me))),
  );

  return server;
}
