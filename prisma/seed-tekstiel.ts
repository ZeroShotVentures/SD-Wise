import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import { PrismaClient } from "../src/generated/prisma/client";
import { accessRows, nodeRow, recountEdges } from "../src/lib/graph/store";
import {
  tekstielEdges,
  tekstielNodes,
} from "../src/lib/graph/tekstiel-fixtures";

// Adds what the company knows about onboarding Tekstiel NV to the graph, for
// the demo question "How is the onboarding of Tekstiel NV going?" (see
// src/lib/graph/tekstiel-fixtures.ts). Safe to re-run: missing rows are added
// and changed facts updated, nothing is deleted. Access given in rehearsals
// goes with `pnpm db:seed:demo --reset`. Needs the graph from `pnpm db:seed`.
//
//   pnpm db:seed:tekstiel

config({ path: [".env.local", ".env", ".env.example"], quiet: true });

const url = process.env.DATABASE_URL;
if (!url) throw new Error("Set DATABASE_URL");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url }),
});

async function main() {
  const { host, pathname } = new URL(url as string);
  console.log(`Adding Tekstiel NV to the graph in ${host}${pathname}`);

  const ids = tekstielNodes.map((n) => n.id);
  const linked = tekstielEdges
    .flatMap((e) => [e.sourceId, e.targetId])
    .filter((id) => !ids.includes(id));
  const found = await prisma.knowledgeNode.count({
    where: { id: { in: linked } },
  });
  if (found !== new Set(linked).size) {
    throw new Error("The graph is incomplete: run `pnpm db:seed` first.");
  }

  const added = await prisma.$transaction(async (tx) => {
    const rows = tekstielNodes.map(nodeRow);
    const nodes = await tx.knowledgeNode.createMany({
      data: rows,
      skipDuplicates: true,
    });
    await Promise.all(
      rows.map(({ id, ...data }) =>
        tx.knowledgeNode.update({ where: { id }, data }),
      ),
    );
    const access = await tx.nodeAccess.createMany({
      data: tekstielNodes.flatMap(accessRows),
      skipDuplicates: true,
    });
    const edges = await tx.knowledgeEdge.createMany({
      data: tekstielEdges,
      skipDuplicates: true,
    });
    await recountEdges(tx, [...ids, ...linked]);
    return { nodes, access, edges };
  });
  console.log(
    `Added ${added.nodes.count} facts, ${added.access.count} access rows and ${added.edges.count} edges`,
  );

  // Facts from a disconnected source drop out of the graph and the search.
  const disconnected = await prisma.integrations.findMany({
    where: {
      id: { in: tekstielNodes.flatMap((n) => n.integrationId ?? []) },
      connected: false,
    },
    select: { type: true },
  });
  if (disconnected.length) {
    console.warn(
      `Connect ${disconnected.map((i) => i.type).join(", ")} on the Integrations page, or its Tekstiel NV facts stay hidden`,
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
