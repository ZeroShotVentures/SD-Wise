import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { canSee } from "./access";
import { accounts, accountsDoc } from "./accounts";
import { nodes, people } from "./fixtures";

const emailOf = (id: string) => accounts.find((a) => a.person.id === id)?.email;

describe("accounts", () => {
  it("gives every person exactly one account", () => {
    expect(accounts.map((a) => a.person.id)).toEqual(people.map((p) => p.id));
    expect(new Set(accounts.map((a) => a.email)).size).toBe(people.length);
  });

  it("gives every owner and everyone with access an account", () => {
    const ids = new Set(accounts.map((a) => a.person.id));
    const named = new Set(
      nodes.flatMap((n) => [...n.ownerIds, ...n.accessIds]),
    );
    expect([...named].filter((id) => !ids.has(id))).toEqual([]);
  });

  it("keeps the demo cast's emails and makes valid ones for the rest", () => {
    expect(emailOf("p-kobe")).toBe("kobe@sdwise.be");
    expect(emailOf("p-filip")).toBe("filip@sdwise.be");
    expect(emailOf("p-bram")).toBe("bram@sdwise.be");
    for (const { email } of accounts) {
      expect(email).toMatch(/^[a-z]+(?:[.-][a-z]+)*@sdwise\.be$/);
    }
  });

  it("lets everyone see exactly the public facts and their own", () => {
    for (const n of nodes) expect(n.accessIds).toEqual(n.ownerIds);
    for (const { person } of accounts) {
      const seen = nodes.filter((n) => canSee(n, person.id));
      const expected = nodes.filter(
        (n) => n.visibility === "PUBLIC" || n.ownerIds.includes(person.id),
      );
      expect(seen).toEqual(expected);
    }
  });

  it("only has people who own at least one fact", () => {
    const owners = new Set(nodes.flatMap((n) => n.ownerIds));
    expect(people.filter((p) => !owners.has(p.id))).toEqual([]);
  });

  it("makes Kobe and Filip take part in their own team's conversations", () => {
    for (const [id, department] of [
      ["p-kobe", "IT"],
      ["p-filip", "PRODUCTION"],
    ] as const) {
      const owned = nodes.filter((n) => n.ownerIds.includes(id));
      expect(owned.length).toBeGreaterThan(15);
      expect(owned.length).toBeLessThan(60);
      // Generated facts they joined are their own team's: the first owner is
      // the one the conversation was picked for.
      for (const fact of owned.filter((n) => n.id.startsWith("n-bulk-"))) {
        const first = people.find((p) => p.id === fact.ownerIds[0]);
        expect(first?.department).toBe(department);
      }
    }
  });

  it("is listed in docs/accounts.md", () => {
    expect(readFileSync("docs/accounts.md", "utf8")).toBe(accountsDoc());
  });
});
