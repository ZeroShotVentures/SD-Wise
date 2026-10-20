import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import { PrismaClient } from "../src/generated/prisma/client";
import { seedGraph } from "../src/lib/graph/seed";
import { seedAccounts } from "./accounts";

// Everything a demo needs on a new database: an account for every person in
// the graph (`pnpm db:seed:accounts`, see docs/accounts.md), then the graph
// with the questions already in people's inboxes (`pnpm db:seed`). Safe to
// re-run; to only reset the graph, use `pnpm db:seed`.
//
//   pnpm db:seed:demo

config({ path: [".env.local", ".env", ".env.example"], quiet: true });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  await seedAccounts(prisma);
  const { deleted, written } = await prisma.$transaction(
    (tx) => seedGraph(tx),
    { maxWait: 10_000, timeout: 120_000 },
  );
  console.log(
    `Graph reset: deleted ${deleted.questions} questions, wrote ${written.facts} facts and ${written.questions} demo questions`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
