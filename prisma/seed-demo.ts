import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import { type Prisma, PrismaClient } from "../src/generated/prisma/client";
import { seedAccounts } from "./accounts";

// Everything a demo needs: an account for every person in the graph (as
// `pnpm db:seed:accounts` does, see docs/accounts.md) and the questions
// already in people's inboxes. Safe to re-run: demo questions are only added
// once. Pass --reset to also delete every question, e.g. before a demo.
//
//   pnpm db:seed:demo [--reset]

config({ path: [".env.local", ".env", ".env.example"], quiet: true });

const at = (iso: string) => new Date(iso);

// Questions already in people's inboxes when the demo starts.
const QUESTIONS: Prisma.QuestionCreateManyInput[] = [
  {
    id: "q-demo-oauth",
    kind: "QUESTION",
    askerId: "p-timon",
    recipientId: "p-victor",
    question: "When does the Payroll API switch to OAuth?",
    nodeIds: ["n-api-oauth"],
    createdAt: at("2026-09-29T09:12:00Z"),
  },
  {
    id: "q-demo-kras-pricing",
    kind: "ACCESS",
    askerId: "p-julien",
    recipientId: "p-bram",
    question: "Can I see what you know about this?",
    nodeIds: ["n-kras-pricing"],
    createdAt: at("2026-09-29T14:40:00Z"),
  },
  {
    id: "q-demo-renewal",
    kind: "QUESTION",
    askerId: "p-victor",
    recipientId: "p-dario",
    question: "Did we agree on a renewal discount for Kras?",
    nodeIds: ["n-kras-renewal"],
    createdAt: at("2026-09-30T10:30:00Z"),
  },
  {
    id: "q-demo-oauth-date",
    kind: "QUESTION",
    askerId: "p-victor",
    recipientId: "p-kobe",
    question: "Is the OAuth go-live still mid-December?",
    nodeIds: ["n-api-oauth"],
    createdAt: at("2026-09-30T08:05:00Z"),
  },
  {
    id: "q-demo-ai-budget",
    kind: "QUESTION",
    askerId: "p-julien",
    recipientId: "p-kobe",
    question: "Is the AI tooling budget approved?",
    nodeIds: ["n-ai-budget"],
    status: "ANSWERED",
    answer:
      "Yes, €40k is approved for Q4. We need to pick a vendor before November.",
    shareScope: "ASKER",
    createdAt: at("2026-09-26T15:20:00Z"),
    resolvedAt: at("2026-09-26T16:01:00Z"),
    seenAt: at("2026-09-26T16:30:00Z"),
  },
  {
    id: "q-demo-sla",
    kind: "QUESTION",
    askerId: "p-pieter",
    recipientId: "p-filip",
    question: "Does the two-day payroll SLA also hold in December?",
    nodeIds: ["n-payroll-sla"],
    createdAt: at("2026-09-30T07:45:00Z"),
  },
];

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const reset = process.argv.includes("--reset");

  await seedAccounts(prisma);

  if (reset) {
    const { count } = await prisma.question.deleteMany();
    console.log(`Deleted ${count} questions`);
  }
  const { count } = await prisma.question.createMany({
    data: QUESTIONS,
    skipDuplicates: true,
  });
  console.log(`${count} demo questions added`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
