import { generateText } from "ai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { writeDraft, writeGeneral } from "./llm";
import type { KnowledgeNode } from "./types";

vi.mock("server-only", () => ({}));
vi.mock("ai", () => ({ generateText: vi.fn<typeof generateText>() }));

const reply = (text: string) =>
  vi.mocked(generateText).mockResolvedValue({ text } as never);

describe("writeGeneral", () => {
  beforeEach(() => vi.spyOn(console, "warn").mockImplementation(() => {}));

  it("answers questions that need no company knowledge", async () => {
    reply("It's 13:38 in Brussels.");
    expect(await writeGeneral("What time is it?")).toEqual({
      text: "It's 13:38 in Brussels.",
      answered: true,
    });
  });

  it("points to a colleague when it can't help", async () => {
    reply("CANT_HELP: I can't help with that, but a colleague might.");
    expect(await writeGeneral("Who wins the World Cup?")).toEqual({
      text: "I can't help with that, but a colleague might.",
      answered: false,
    });
  });

  it("still has text when Claude replies with nothing", async () => {
    reply("");
    const result = await writeGeneral("Who wins the World Cup?");
    expect(result.answered).toBe(false);
    expect(result.text).toMatch(/ask a colleague/);
  });
});

describe("writeDraft", () => {
  const fact = {
    title: "API auth moves to OAuth 2.1",
    contentSummary: "Payroll API authentication moves to OAuth 2.1.",
    content: "Decision: OAuth 2.1 client credentials go live mid-December.",
    sourceDescription: "Meeting: Platform sync",
    createdAt: "2026-09-24",
  } as KnowledgeNode;
  const asker = { id: "p-timon", name: "Timon", role: "Marketing lead" };

  it("gives Claude each fact's summary, not only its content", async () => {
    reply("Hi Timon! Mid-December.");
    await writeDraft("When does the Payroll API switch?", asker as never, [
      fact,
    ]);
    const { prompt } = vi.mocked(generateText).mock.calls.at(-1)?.[0] ?? {};
    expect(prompt).toContain(fact.contentSummary);
    expect(prompt).toContain(fact.content);
  });

  it("writes no draft when Claude finds nothing to draft from", async () => {
    reply("NO_ANSWER");
    expect(await writeDraft("Who wins?", asker as never, [fact])).toBeNull();
  });
});
