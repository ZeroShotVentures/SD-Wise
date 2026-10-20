import { z } from "zod";
import { question, requestMoreInput } from "@/lib/graph/schemas";
import { ASK_APP_URI } from "./ask-app";
import { INBOX_APP_URI } from "./inbox-app";

// The MCP tools: their names, descriptions, inputs and hints. The server
// registers exactly these and the Integrations page lists them, so the two
// can't drift apart.
export const tools = {
  ask: {
    title: "Ask the company brain",
    description:
      "Ask the SD Wise company brain a question. Answers only with what you are allowed to see. If `moreAvailable` is true, other people hold relevant information you can't see; SD Wise won't say what or whose. Tell the user that, and if there are facts, that the answer may be incomplete. Hosts that support MCP Apps show the result in an answer card with an Ask a colleague button; there, don't repeat the answer word for word or draw your own visual of it, just add what the card doesn't say. If the card isn't shown, give the answer yourself and, when `moreAvailable` is true, show `requestUrl` as an \"Ask a colleague\" link or button (also in any visual you make). It opens SD Wise, where the user clicks to send the request. You can't send it yourself.",
    inputSchema: z.object({
      question: question.describe("The question, in plain language"),
    }),
    annotations: { readOnlyHint: true, openWorldHint: false },
    _meta: { ui: { resourceUri: ASK_APP_URI } },
  },
  // Only the answer card's button calls this, so a request always comes from
  // the user clicking, never from the model on its own. Hosts without the
  // card use `requestUrl`, which ends in a button too.
  request_more: {
    title: "Request the rest of an answer",
    description:
      "Forward a question to whoever holds the locked information behind `moreAvailable`. They decide whether to share it; the user never learns who they are.",
    inputSchema: requestMoreInput,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
    _meta: { ui: { resourceUri: ASK_APP_URI, visibility: ["app" as const] } },
  },
  list_inbox: {
    title: "List your inbox",
    description:
      "List the questions and access requests sent to you, and the ones you sent, with their status and answers. Hosts that support MCP Apps show the result in an inbox card; there, don't repeat the inbox as a table or draw your own visual of it, just point out in a sentence or two what needs attention. If the card isn't shown, summarize what needs attention yourself. Replying happens in SD Wise itself, in the Inbox.",
    annotations: { readOnlyHint: true, openWorldHint: false },
    _meta: { ui: { resourceUri: INBOX_APP_URI } },
  },
};

export type ToolSummary = {
  name: string;
  title: string;
  description: string;
  readOnly: boolean;
  // Hidden from the model; only the answer card can call it.
  appOnly: boolean;
  params: { name: string; type: string; required: boolean }[];
};

const typeOf = (schema: Record<string, unknown>): string =>
  schema.type === "array"
    ? `${typeOf((schema.items ?? {}) as Record<string, unknown>)}[]`
    : String(schema.type ?? "any");

// Plain data about each tool, for showing what an MCP client gets.
export function toolSummaries(): ToolSummary[] {
  return Object.entries(tools).map(([name, tool]) => {
    const schema =
      "inputSchema" in tool ? z.toJSONSchema(tool.inputSchema) : null;
    const properties = (schema?.properties ?? {}) as Record<
      string,
      Record<string, unknown>
    >;
    const required = new Set(schema?.required ?? []);
    const { _meta: meta } = tool as {
      _meta?: { ui: { visibility?: string[] } };
    };
    const ui = meta?.ui;
    return {
      name,
      title: tool.title,
      description: tool.description,
      readOnly: tool.annotations.readOnlyHint,
      appOnly: !!ui?.visibility && !ui.visibility.includes("model"),
      params: Object.entries(properties).map(([param, value]) => ({
        name: param,
        type: typeOf(value),
        required: required.has(param),
      })),
    };
  });
}
