import { writeFileSync } from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import { PrismaClient } from "../src/generated/prisma/client";
import { accountsDoc } from "../src/lib/graph/accounts";
import { seedAccounts } from "./accounts";

// An account for every person in the graph (see prisma/accounts.ts). Pass
// --docs to only rewrite docs/accounts.md, without touching the database.
//
//   pnpm db:seed:accounts [--docs]

config({ path: [".env.local", ".env", ".env.example"], quiet: true });

async function main() {
  if (process.argv.includes("--docs")) {
    writeFileSync("docs/accounts.md", accountsDoc());
    console.log("Wrote docs/accounts.md");
    return;
  }
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    await seedAccounts(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
