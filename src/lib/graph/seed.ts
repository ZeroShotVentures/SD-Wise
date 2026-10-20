import * as fixtures from "./fixtures";
import { accessRows, type Db, nodeRow, recountEdges } from "./store";

// Writes the company graph in fixtures.ts to the database: integrations,
// people, facts, who can see them and the edges between them. Safe to re-run:
// missing rows are added, and facts and people that changed in the fixtures
// are updated. Nothing is deleted, integrations keep whether they're
// connected, and access given in SD Wise stays.

const NODE_COLUMNS = [
  "title",
  "content",
  "contentSummary",
  "source",
  "integrationId",
  "sourceDescription",
  "visibility",
] as const;

// One Person row per person in the fixtures: missing ones are added and
// changed ones updated, one query per changed row. The graph seed and the
// account seed (prisma/accounts.ts) both start here.
export async function seedPeople(db: Db) {
  const existing = new Map(
    (await db.person.findMany()).map((row) => [row.id, row]),
  );
  const { count } = await db.person.createMany({
    data: fixtures.people.filter((p) => !existing.has(p.id)),
  });
  const changed = fixtures.people.filter((p) => {
    const row = existing.get(p.id);
    return (
      row &&
      (row.name !== p.name ||
        row.role !== p.role ||
        row.department !== p.department)
    );
  });
  await Promise.all(
    changed.map(({ id, ...data }) => db.person.update({ where: { id }, data })),
  );
  return { added: count, updated: changed.length };
}

export async function seedGraph(db: Db) {
  const integrations = await db.integrations.createMany({
    data: fixtures.integrations.map(({ connectedAt, ...integration }) => ({
      ...integration,
      connectedAt: connectedAt ? new Date(connectedAt) : null,
    })),
    skipDuplicates: true,
  });

  const people = await seedPeople(db);

  const rows = fixtures.nodes.map(nodeRow);
  const nodesById = new Map(
    (
      await db.knowledgeNode.findMany({
        where: { id: { in: rows.map((n) => n.id) } },
        select: { id: true, createdAt: true, ...selectAll(NODE_COLUMNS) },
      })
    ).map((row) => [row.id, row]),
  );
  const nodes = await db.knowledgeNode.createMany({
    data: rows.filter((n) => !nodesById.has(n.id)),
  });
  const changedNodes = rows.filter((n) => {
    const row = nodesById.get(n.id);
    return (
      row &&
      (NODE_COLUMNS.some((column) => row[column] !== n[column]) ||
        row.createdAt.getTime() !== n.createdAt.getTime())
    );
  });
  await Promise.all(
    changedNodes.map(({ id, ...data }) =>
      db.knowledgeNode.update({ where: { id }, data }),
    ),
  );

  const access = await db.nodeAccess.createMany({
    data: fixtures.nodes.flatMap(accessRows),
    skipDuplicates: true,
  });
  const edges = await db.knowledgeEdge.createMany({
    data: fixtures.edges,
    skipDuplicates: true,
  });
  await recountEdges(db);

  return {
    added: {
      integrations: integrations.count,
      people: people.added,
      nodes: nodes.count,
      access: access.count,
      edges: edges.count,
    },
    updated: { people: people.updated, nodes: changedNodes.length },
  };
}

function selectAll<const K extends string>(columns: readonly K[]) {
  return Object.fromEntries(columns.map((c) => [c, true])) as Record<K, true>;
}
