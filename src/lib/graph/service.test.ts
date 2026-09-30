import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const graph = await import("./service");
const { people } = await import("./fixtures");

const person = (id: string) => {
  const p = people.find((x) => x.id === id);
  if (!p) throw new Error(id);
  return p;
};

const julien = person("p-julien");
const bram = person("p-bram");
const timon = person("p-timon");
const victor = person("p-victor");

beforeEach(() => graph.resetStore());

describe("getGraph", () => {
  it("never sends locked content to the viewer", () => {
    const view = graph.getGraph(julien);
    const pricing = view.nodes.find((n) => n.id === "n-kras-pricing");
    expect(pricing).toEqual(expect.objectContaining({ locked: true }));
    expect(JSON.stringify(view)).not.toContain("€4.20");
  });

  it("hides the meaning of edges touching a locked node", () => {
    const view = graph.getGraph(julien);
    const edge = view.edges.find(
      (e) =>
        e.sourceId === "n-kras-pricing" && e.targetId === "n-kras-customer",
    );
    expect(edge).toEqual(expect.objectContaining({ locked: true }));
    expect(edge).not.toHaveProperty("description");
  });

  it("drops facts from disconnected integrations", () => {
    graph.setConnected("i-outlook", false);
    const ids = graph.getGraph(bram).nodes.map((n) => n.id);
    expect(ids).not.toContain("n-kras-pricing");
  });
});

describe("ask", () => {
  it("answers from what you own", () => {
    const result = graph.ask(bram, "What do we charge Kras per payslip?");
    expect(result.answer?.text).toContain("€4.20");
    expect(result.people).toEqual([]);
  });

  it("points to people when you can't see the answer", () => {
    const result = graph.ask(julien, "What do we charge Kras per payslip?");
    expect(result.answer?.text ?? "").not.toContain("€4.20");
    expect(result.people.map((s) => s.person.id)).toContain("p-bram");
  });
});

describe("questions", () => {
  it("drafts an answer for the recipient and writes the reply back", () => {
    const q = graph.askPerson(
      timon,
      victor.id,
      "When does the API move to OAuth?",
      ["n-api-oauth"],
    );
    const item = graph.getInbox(victor).received.find((i) => i.id === q.id);
    expect(item?.suggestedAnswer).toContain("OAuth 2.1");

    graph.answerQuery(victor, q.id, "Mid-December.", "ASKER");
    const view = graph.getGraph(timon);
    const answer = view.nodes.find((n) => n.id === q.answerNodeId);
    expect(answer).toEqual(
      expect.objectContaining({
        locked: false,
        isNew: true,
        visibility: "PRIVATE",
      }),
    );
    expect(
      graph.getGraph(julien).nodes.find((n) => n.id === q.answerNodeId),
    ).toEqual(expect.objectContaining({ locked: true }));
  });

  it("only lets the recipient answer", () => {
    const q = graph.askPerson(timon, victor.id, "Anything?", []);
    expect(() => graph.answerQuery(julien, q.id, "Hi", "PUBLIC")).toThrow(
      "Nothing to answer",
    );
  });
});

describe("access requests", () => {
  it("grants access to the asker only", () => {
    const q = graph.requestAccess(julien, "n-kras-pricing", bram.id);
    graph.approveAccess(bram, q.id);
    const node = (p: typeof julien) =>
      graph.getGraph(p).nodes.find((n) => n.id === "n-kras-pricing");
    expect(node(julien)).toEqual(expect.objectContaining({ locked: false }));
    expect(node(timon)).toEqual(expect.objectContaining({ locked: true }));
  });

  it("can only be sent to an owner", () => {
    expect(() =>
      graph.requestAccess(julien, "n-kras-pricing", timon.id),
    ).toThrow("Not an owner");
  });
});

describe("personFor", () => {
  it("matches accounts to people by first name", () => {
    expect(graph.personFor({ name: "Victor B", email: "v@x.be" }).id).toBe(
      "p-victor",
    );
    expect(graph.personFor({ name: "", email: "julien@sdworx.com" }).id).toBe(
      "p-julien",
    );
  });
});
