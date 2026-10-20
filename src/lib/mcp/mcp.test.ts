import { describe, expect, it, vi } from "vitest";
import { toNodeView } from "@/lib/graph/access";
import { answerFor, searchGraph } from "@/lib/graph/ai";
import { edges, nodes, people } from "@/lib/graph/fixtures";
import { formatAsk } from "./format";

vi.mock("server-only", () => ({}));

const julien = people.find((p) => p.id === "p-julien");
if (!julien) throw new Error("fixture");

describe("formatAsk", () => {
  it("only hints at locked facts, never what, whose or where from", () => {
    const question = "What does Norvik pay per payslip?";
    const { hits, visited } = searchGraph(question, nodes, edges);
    const result = answerFor(question, julien.id, hits, visited, nodes);
    const views = nodes.map((n) => toNodeView(n, julien.id));
    const pricing = nodes.find((n) => n.id === "n-norvik-pricing");
    if (!pricing) throw new Error("fixture");
    expect(hits).toContain(pricing.id);

    const out = formatAsk(result, views, "https://sdwise.be");
    const text = JSON.stringify(out);
    expect(out.moreAvailable).toBe(true);
    expect(out.requestUrl).toBe(
      "https://sdwise.be/inbox/request?question=What+does+Norvik+pay+per+payslip%3F",
    );
    expect(text).not.toContain(pricing.id);
    expect(text).not.toContain(pricing.content);
    expect(text).not.toContain(pricing.contentSummary);
    expect(text).not.toContain(pricing.title);
    for (const ownerId of pricing.ownerIds) expect(text).not.toContain(ownerId);
  });

  it("has no request link when there's nothing more", () => {
    const question = "What does Norvik pay per payslip?";
    const bram = people.find((p) => p.id === "p-bram");
    if (!bram) throw new Error("fixture");
    const { hits, visited } = searchGraph(question, nodes, edges);
    const result = answerFor(question, bram.id, hits, visited, nodes);
    const views = nodes.map((n) => toNodeView(n, bram.id));
    expect(formatAsk(result, views, "https://sdwise.be").requestUrl).toBeNull();
  });

  it("links to asking a colleague when SD Wise can't help", () => {
    const result = {
      question: "Who wins the World Cup?",
      visited: [],
      hits: [],
      answer: { text: "I can't help you with that.", nodeIds: [] },
      moreAvailable: false,
      askColleague: true,
    };
    const out = formatAsk(result, [], "https://sdwise.be");
    expect(out.requestUrl).toBeNull();
    expect(out.askUrl).toBe(
      "https://sdwise.be/inbox/ask?question=Who+wins+the+World+Cup%3F",
    );
  });
});
