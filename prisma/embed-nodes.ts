import { PrismaPg } from "@prisma/adapter-pg";
import { embedMany } from "ai";
import { config } from "dotenv";
import { Prisma, PrismaClient } from "../src/generated/prisma/client";

config({ path: [".env.local", ".env", ".env.example"], quiet: true });

/** Dimensions must match KnowledgeNode.contentEmbedding vector(1536). */
const EMBEDDING_MODEL = "openai/text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;
const BATCH_SIZE = 64;

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

type NodeRow = {
  id: string;
  content: string;
};

type PendingCounts = {
  pending: bigint | number;
  empty: bigint | number;
};

function asCount(value: bigint | number | undefined): number {
  return Number(value ?? 0);
}

function toVector(embedding: number[], nodeId: string): string {
  if (embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Node ${nodeId} embedding has ${embedding.length} dimensions; expected ${EMBEDDING_DIMENSIONS}.`,
    );
  }
  if (embedding.some((value) => !Number.isFinite(value))) {
    throw new Error(`Node ${nodeId} embedding contains a non-finite value.`);
  }
  return `[${embedding.join(",")}]`;
}

async function pendingCounts(): Promise<{ pending: number; empty: number }> {
  const [row] = await prisma.$queryRaw<PendingCounts[]>`
    SELECT
      COUNT(*) FILTER (WHERE length(btrim(content)) > 0) AS pending,
      COUNT(*) FILTER (WHERE length(btrim(content)) = 0) AS empty
    FROM "KnowledgeNode"
    WHERE "contentEmbedding" IS NULL
  `;
  return { pending: asCount(row?.pending), empty: asCount(row?.empty) };
}

async function nextBatch(): Promise<NodeRow[]> {
  return prisma.$queryRaw<NodeRow[]>`
    SELECT id, content
    FROM "KnowledgeNode"
    WHERE "contentEmbedding" IS NULL
      AND length(btrim(content)) > 0
    ORDER BY "createdAt" ASC
    LIMIT ${BATCH_SIZE}
  `;
}

async function storeEmbeddings(
  nodes: NodeRow[],
  embeddings: number[][],
): Promise<number> {
  if (embeddings.length !== nodes.length) {
    throw new Error(
      `Expected ${nodes.length} embeddings, got ${embeddings.length}.`,
    );
  }

  const rows = nodes.map((node, index) => {
    const embedding = embeddings[index];
    if (!embedding) {
      throw new Error(`Missing embedding for node ${node.id}.`);
    }
    return Prisma.sql`(${node.id}, CAST(${toVector(embedding, node.id)} AS vector))`;
  });

  return prisma.$executeRaw`
    UPDATE "KnowledgeNode" AS node
    SET "contentEmbedding" = batch.embedding
    FROM (VALUES ${Prisma.join(rows)}) AS batch(id, embedding)
    WHERE node.id = batch.id
      AND node."contentEmbedding" IS NULL
  `;
}

async function embedBatch(nodes: NodeRow[]): Promise<number> {
  const { embeddings } = await embedMany({
    model: EMBEDDING_MODEL,
    values: nodes.map((node) => node.content),
    maxParallelCalls: 2,
  });
  return storeEmbeddings(nodes, embeddings);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("Set DATABASE_URL to run the embedding backfill.");
  }
  if (!process.env.AI_GATEWAY_API_KEY) {
    throw new Error(
      "Set AI_GATEWAY_API_KEY in .env.local to run the embedding backfill.",
    );
  }

  const { pending, empty } = await pendingCounts();
  if (empty > 0) {
    console.warn(
      `Skipping ${empty} knowledge node${empty === 1 ? "" : "s"} with empty content.`,
    );
  }
  if (pending === 0) {
    console.log("No knowledge nodes are missing embeddings.");
    return;
  }

  console.log(
    `Embedding ${pending} knowledge node${pending === 1 ? "" : "s"} with ${EMBEDDING_MODEL}...`,
  );

  let embedded = 0;
  let nodes = await nextBatch();
  while (nodes.length > 0) {
    // Each batch is stored before the next is read, so a failure can resume.
    // oxlint-disable-next-line no-await-in-loop
    const updated = await embedBatch(nodes);
    embedded += updated;
    console.log(`  embedded ${embedded}/${pending}`);
    // oxlint-disable-next-line no-await-in-loop
    nodes = await nextBatch();
  }

  console.log(`Done: ${embedded} knowledge nodes embedded.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
