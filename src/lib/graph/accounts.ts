import { canSee } from "./access";
import { nodes, people } from "./fixtures";
import type { Person } from "./types";

// One account per person in the graph, so everyone who owns a fact can sign
// in and see the graph as they would. Seeded by `pnpm db:seed:accounts`;
// docs/accounts.md lists them all.

export const PASSWORD = "password123";

export type Account = { email: string; person: Person };

const slug = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z-]/g, "");

// The demo cast signs in with their first name (kobe@sdwise.be), everyone
// else with first.last (bram.timmermans@sdwise.be).
export function emailFor(person: Person) {
  const [first = "", ...last] = person.name.split(" ");
  const local =
    person.id.startsWith("p-") && !person.id.startsWith("p-bulk-")
      ? person.id.slice(2)
      : `${slug(first)}.${slug(last.join(""))}`;
  return `${local}@sdwise.be`;
}

export const accounts: Account[] = people.map((person) => ({
  email: emailFor(person),
  person,
}));

// Renders docs/accounts.md, so it can't drift from the fixtures.
export function accountsDoc() {
  const rows = accounts.map(({ email, person }) => {
    const owns = nodes.filter((n) => n.ownerIds.includes(person.id)).length;
    const sees = nodes.filter((n) => canSee(n, person.id)).length;
    return `| ${person.name} | \`${email}\` | ${person.role} | ${person.department} | ${owns} | ${sees} |`;
  });
  return `${[
    "# Accounts",
    "",
    `Every person in the graph has an account, and every account is one person: the owners of a fact are the accounts that can sign in and see it. All ${accounts.length} share the password \`${PASSWORD}\`. Seeded by \`pnpm db:seed:accounts\` (or \`pnpm db:seed:demo\`, which also adds the demo questions).`,
    "",
    `"Owns" counts the facts that person was part of; "Can see" counts the facts that aren't locked in their graph (owned, shared with them, or public) out of ${nodes.length}. Answers to questions add a few on top.`,
    "",
    "Generated from the fixtures by `pnpm db:seed:accounts --docs`; don't edit by hand.",
    "",
    "| Name | Email | Role | Department | Owns | Can see |",
    "| --- | --- | --- | --- | --: | --: |",
    ...rows,
  ].join("\n")}\n`;
}
