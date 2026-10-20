import { describe, expect, it } from "vitest";
import { toolSummaries } from "./tools";

describe("toolSummaries", () => {
  it("lists every tool with its inputs from the schemas", () => {
    const byName = Object.fromEntries(toolSummaries().map((t) => [t.name, t]));

    expect(Object.keys(byName)).toEqual([
      "ask",
      "ask_person",
      "request_access",
      "list_inbox",
    ]);
    expect(byName.ask?.params).toEqual([
      { name: "question", type: "string", required: true },
    ]);
    expect(byName.ask_person?.params).toContainEqual({
      name: "nodeIds",
      type: "string[]",
      required: true,
    });
    expect(byName.list_inbox?.params).toEqual([]);
  });

  it("marks only the tools that send something as writes", () => {
    const writes = toolSummaries()
      .filter((t) => !t.readOnly)
      .map((t) => t.name);
    expect(writes).toEqual(["ask_person", "request_access"]);
  });
});
