import { z } from "zod";
import {
  askPersonInput,
  question,
  requestAccessInput,
} from "@/lib/graph/schemas";

// The MCP tools: their names, descriptions, inputs and hints. The server
// registers exactly these and the Integrations page lists them, so the two
// can't drift apart.
export const tools = {
  ask: {
    title: "Ask the company brain",
    description:
      "Ask the SD Wise company brain a question. Answers only with what you are allowed to see. Facts you can't see come back as locked facts with their owners, plus people who know more.",
    inputSchema: z.object({
      question: question.describe("The question, in plain language"),
    }),
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  ask_person: {
    title: "Ask a colleague",
    description:
      "Send a question to a colleague. They get it in their inbox with a drafted reply. Use ids from `ask` (peopleWhoKnowMore and nodeIds).",
    inputSchema: askPersonInput,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
  },
  request_access: {
    title: "Request access to a locked fact",
    description:
      "Ask the owner of a locked fact for access. Use a locked fact id and one of its owner ids from `ask`.",
    inputSchema: requestAccessInput,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  list_inbox: {
    title: "List your inbox",
    description:
      "List the questions and access requests sent to you, and the ones you sent, with their status and answers.",
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
} as const;

export type ToolSummary = {
  name: string;
  title: string;
  description: string;
  readOnly: boolean;
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
    return {
      name,
      title: tool.title,
      description: tool.description,
      readOnly: tool.annotations.readOnlyHint,
      params: Object.entries(properties).map(([param, value]) => ({
        name: param,
        type: typeOf(value),
        required: required.has(param),
      })),
    };
  });
}
