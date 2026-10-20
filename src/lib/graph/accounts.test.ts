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

  it("locks exactly the private facts Kobe and Filip weren't given", () => {
    for (const id of ["p-kobe", "p-filip"]) {
      const locked = nodes.filter((n) => !canSee(n, id));
      expect(locked.length).toBeGreaterThan(0);
      for (const n of locked) {
        expect(n.visibility).toBe("PRIVATE");
        expect(n.ownerIds).not.toContain(id);
        expect(n.accessIds).not.toContain(id);
      }
      const owned = nodes.filter((n) => n.ownerIds.includes(id));
      expect(owned.every((n) => canSee(n, id))).toBe(true);
    }
  });

  it("is listed in docs/accounts.md", () => {
    expect(readFileSync("docs/accounts.md", "utf8")).toBe(accountsDoc());
  });
});
