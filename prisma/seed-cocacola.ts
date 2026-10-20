import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  cocacolaEdges,
  cocacolaNodes,
} from "../src/lib/graph/cocacola-fixtures";
import {
  accessRows,
  linkLooseFacts,
  nodeRow,
  recountEdges,
} from "../src/lib/graph/store";

// Adds what the company knows about onboarding Coca-Cola to the graph, for
// the demo question "How is the onboarding of Coca Cola going?" (see
// src/lib/graph/cocacola-fixtures.ts), then links facts cut off from the rest
// as `pnpm db:seed` does. Safe to re-run: missing rows are added and changed
// facts updated, nothing is deleted. `pnpm db:seed` resets the graph without
// them, so run this after it, e.g. before every demo.
//
//   pnpm db:seed && pnpm db:seed:cocacola

config({ path: [".env.local", ".env", ".env.example"], quiet: true });

const url = process.env.DATABASE_URL;
if (!url) throw new Error("Set DATABASE_URL");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url }),
});

async function main() {
  const { host, pathname } = new URL(url as string);
  console.log(`Adding Coca-Cola to the graph in ${host}${pathname}`);

  const ids = cocacolaNodes.map((n) => n.id);
  const linked = cocacolaEdges
    .flatMap((e) => [e.sourceId, e.targetId])
    .filter((id) => !ids.includes(id));
  const found = await prisma.knowledgeNode.count({
    where: { id: { in: linked } },
  });
  if (found !== new Set(linked).size) {
    throw new Error("The graph is incomplete: run `pnpm db:seed` first.");
  }

  const added = await prisma.$transaction(async (tx) => {
    const rows = cocacolaNodes.map(nodeRow);
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
      data: cocacolaNodes.flatMap(accessRows),
      skipDuplicates: true,
    });
    const edges = await tx.knowledgeEdge.createMany({
      data: cocacolaEdges,
      skipDuplicates: true,
    });
    await recountEdges(tx, [...ids, ...linked]);
    const links = await linkLooseFacts(tx);
    return { nodes, access, edges, links };
  });
  console.log(
    `Added ${added.nodes.count} facts, ${added.access.count} access rows, ${added.edges.count} edges and ${added.links} links that join facts cut off from the graph`,
  );

  // Facts from a disconnected source drop out of the graph and the search.
  const disconnected = await prisma.integrations.findMany({
    where: {
      id: { in: cocacolaNodes.flatMap((n) => n.integrationId ?? []) },
      connected: false,
    },
    select: { type: true },
  });
  if (disconnected.length) {
    console.warn(
      `Connect ${disconnected.map((i) => i.type).join(", ")} on the Integrations page, or its Coca-Cola facts stay hidden`,
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
