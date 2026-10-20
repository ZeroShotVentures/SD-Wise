import { describe, expect, it, vi } from "vitest";
import { toolSummaries } from "./tools";

vi.mock("server-only", () => ({}));

describe("toolSummaries", () => {
  it("lists every tool with its inputs from the schemas", () => {
    const byName = Object.fromEntries(toolSummaries().map((t) => [t.name, t]));

    expect(Object.keys(byName)).toEqual(["ask", "request_more", "list_inbox"]);
    expect(byName.ask?.params).toEqual([
      { name: "question", type: "string", required: true },
    ]);
    expect(byName.list_inbox?.params).toEqual([]);
  });

  it("marks what writes and what only the answer card can call", () => {
    const summaries = toolSummaries();
    expect(summaries.filter((t) => !t.readOnly).map((t) => t.name)).toEqual([
      "request_more",
    ]);
    expect(summaries.filter((t) => t.appOnly).map((t) => t.name)).toEqual([
      "request_more",
    ]);
  });
});
