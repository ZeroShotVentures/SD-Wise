import { describe, expect, it, vi } from "vitest";
import { toNodeView } from "@/lib/graph/access";
import { answerFor, searchGraph } from "@/lib/graph/ai";
import { edges, nodes, people } from "@/lib/graph/fixtures";
import { formatAsk } from "./format";

vi.mock("server-only", () => ({}));

const julien = people.find((p) => p.id === "p-julien");
if (!julien) throw new Error("fixture");

describe("formatAsk", () => {
  it("never puts locked content in the tool output", () => {
    const question = "What does Kras pay per payslip?";
    const { hits, visited } = searchGraph(question, nodes, edges);
    const result = answerFor(question, julien.id, hits, visited, nodes, people);
    const views = nodes.map((n) => toNodeView(n, julien.id));
    const pricing = nodes.find((n) => n.id === "n-kras-pricing");
    if (!pricing) throw new Error("fixture");
    expect(hits).toContain(pricing.id);

    const out = formatAsk(result, views, people);
    const text = JSON.stringify(out);
    expect(out.lockedFacts.map((f) => f.id)).toContain(pricing.id);
    expect(text).not.toContain(pricing.content);
    expect(text).not.toContain(pricing.contentSummary);
    expect(text).not.toContain(pricing.title);
  });
});
