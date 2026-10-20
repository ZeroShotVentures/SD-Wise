import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import { PrismaClient } from "../src/generated/prisma/client";
import { seedGraph } from "../src/lib/graph/seed";
import { recountEdges, syncAnswers } from "../src/lib/graph/store";

// Writes the company graph in src/lib/graph/fixtures.ts to the database, then
// turns questions that were already answered into nodes. Safe to re-run:
// rows are added or updated, never deleted. One transaction, so a failure
// changes nothing.
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
  console.log(`Seeding the graph into ${host}${pathname}`);

  const { added, updated, answers } = await prisma.$transaction(
    async (tx) => {
      const graph = await seedGraph(tx);
      const written = await syncAnswers(tx);
      await recountEdges(tx);
      return { ...graph, answers: written };
    },
    { maxWait: 10_000, timeout: 120_000 },
  );

  console.log(
    `Added ${added.integrations} integrations, ${added.people} people, ${added.nodes} facts, ${added.access} access rows and ${added.edges} edges`,
  );
  console.log(`Updated ${updated.people} people and ${updated.nodes} facts`);
  console.log(`Wrote ${answers} answers to earlier questions`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
