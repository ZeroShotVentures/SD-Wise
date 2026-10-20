import { generateText } from "ai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { writeGeneral } from "./llm";

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
