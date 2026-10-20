import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import { PrismaClient } from "../src/generated/prisma/client";
import { seedGraph } from "../src/lib/graph/seed";

// Puts the graph back to how a demo starts: deletes every question, answer
// and access given in SD Wise, and every fact and edge, then writes the
// company graph from src/lib/graph/fixtures.ts with the demo questions (see
// seedGraph). People and accounts stay. One transaction, so a failure changes
// nothing.
//
//   pnpm db:seed

config({ path: [".env.local", ".env", ".env.example"], quiet: true });

const url = process.env.DATABASE_URL;
if (!url) throw new Error("Set DATABASE_URL");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url }),
});

async function main() {
  const { host, pathname } = new URL(url as string);
  console.log(`Resetting the graph in ${host}${pathname}`);

  const { deleted, people, written } = await prisma.$transaction(
    (tx) => seedGraph(tx),
    { maxWait: 10_000, timeout: 120_000 },
  );

  console.log(
    `Deleted ${deleted.questions} questions and ${deleted.facts} facts, with their edges and access`,
  );
  console.log(
    `Wrote ${written.facts} facts, ${written.edges} edges, ${written.questions} demo questions (${written.answers} answered) and ${written.links} links that join facts cut off from the graph`,
  );
  console.log(`People: ${people.added} added, ${people.updated} updated`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
