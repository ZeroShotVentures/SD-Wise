import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";
import { config } from "dotenv";
import { type Prisma, PrismaClient } from "../src/generated/prisma/client";
import { people } from "../src/lib/graph/fixtures";

// Demo accounts and the people behind them. Deletes every other account, so
// Kobe and Filip are the only ones who can sign in. Safe to re-run: accounts
// get their password back, people are upserted, demo questions are only added
// once. Pass --reset to also delete every question, e.g. before a demo.
//
//   pnpm db:seed:demo [--reset]

config({ path: [".env.local", ".env", ".env.example"], quiet: true });

const PASSWORD = "password123";

const ACCOUNTS = [
  { email: "kobe@sdwise.be", personId: "p-kobe" },
  { email: "filip@sdwise.be", personId: "p-filip" },
];

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
    id: "q-demo-year-end-run",
    kind: "ACCESS",
    askerId: "p-julien",
    recipientId: "p-filip",
    question: "Can I see what you know about this?",
    nodeIds: ["n-year-end-run"],
    createdAt: at("2026-09-29T14:40:00Z"),
  },
  {
    id: "q-demo-renewal",
    kind: "QUESTION",
    askerId: "p-victor",
    recipientId: "p-dario",
    question: "Is the v3 launch video still due in February?",
    nodeIds: ["n-launch-video"],
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

async function seedAccount(
  email: string,
  personId: string,
  passwordHash: string,
) {
  const person = people.find((p) => p.id === personId);
  if (!person) throw new Error(`No fixture person ${personId}`);
  const now = new Date();

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      id: crypto.randomUUID(),
      email,
      name: person.name,
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
      personId,
    },
    update: {
      name: person.name,
      emailVerified: true,
      personId,
      updatedAt: now,
    },
  });

  const account = await prisma.account.findFirst({
    where: { userId: user.id, providerId: "credential" },
  });
  if (account) {
    await prisma.account.update({
      where: { id: account.id },
      data: { password: passwordHash, updatedAt: now },
    });
  } else {
    await prisma.account.create({
      data: {
        id: crypto.randomUUID(),
        accountId: user.id,
        providerId: "credential",
        userId: user.id,
        password: passwordHash,
        createdAt: now,
        updatedAt: now,
      },
    });
  }
  console.log(`  ${email} → ${person.name} (${person.role})`);
}

async function main() {
  const reset = process.argv.includes("--reset");

  await prisma.$transaction(
    people.map(({ id, role, department }) =>
      prisma.person.upsert({
        where: { id },
        create: { id, role, department },
        update: { role, department },
      }),
    ),
  );
  console.log(`${people.length} people`);

  // Sessions and credentials cascade with the user.
  const removed = await prisma.user.deleteMany({
    where: { email: { notIn: ACCOUNTS.map(({ email }) => email) } },
  });
  console.log(`Deleted ${removed.count} other accounts`);

  const passwordHash = await hashPassword(PASSWORD);
  console.log("Accounts (password: password123):");
  for (const { email, personId } of ACCOUNTS) {
    // oxlint-disable-next-line no-await-in-loop
    await seedAccount(email, personId, passwordHash);
  }

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
