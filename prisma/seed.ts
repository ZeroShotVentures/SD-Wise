import { PrismaPg } from "@prisma/adapter-pg";
import { generateText, Output } from "ai";
import { config } from "dotenv";
import { z } from "zod";
import {
  Department,
  IntegrationType,
  KnowledgeSource,
  PrismaClient,
} from "../src/generated/prisma/client";

config({ path: [".env.local", ".env", ".env.example"], quiet: true });

const MODEL = "alibaba/qwen3.8-flash";
const MAX_DATA_POINTS = 1000;
const PEOPLE = 150;
const EDGES_PER_NODE = 1.5;
const ITEMS_PER_BATCH = 8;
const EDGE_CHUNK = 40;
const COMPANY =
  "SD Worx, a European provider of payroll, HR and workforce management services headquartered in Antwerp, Belgium";

const DEPARTMENT_HEADCOUNT: Record<
  Exclude<Department, typeof Department.OTHER>,
  number
> = {
  CUSTOMER_SERVICE: 1600,
  PRODUCTION: 1480,
  IT: 1400,
  SALES: 600,
  FINANCE: 350,
  ACCOUNTING: 300,
  HR: 300,
  MARKETING: 250,
  AUDIT: 150,
  SECURITY: 120,
  SECRETARIAL: 120,
  LOGISTICS: 100,
  CLEANING: 90,
  MAINTENANCE: 80,
  RECEPTION: 60,
};

const SOURCE_INTEGRATION = {
  MESSAGE: IntegrationType.slack,
  EMAIL: IntegrationType.email,
  MEETING: IntegrationType.google_meet,
} as const;

const rolesSchema = z.object({
  roles: z
    .array(
      z.object({
        role: z.string(),
        headcountWeight: z.number().int().min(1).max(10),
      }),
    )
    .min(3)
    .max(10),
});

type Role = z.infer<typeof rolesSchema>["roles"][number];

const knowledgeSchema = z.object({
  knowledge: z
    .array(
      z.object({
        authorIndex: z.number().int().min(0),
        source: z.enum(["MESSAGE", "EMAIL", "MEETING"]),
        sourceDescription: z.string(),
        content: z.string(),
        contentSummary: z.string(),
      }),
    )
    .min(1),
});

type KnowledgeItem = z.infer<typeof knowledgeSchema>["knowledge"][number];

const edgesSchema = z.object({
  edges: z.array(z.object({ from: z.number().int(), to: z.number().int() })),
});

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

function sample<T>(items: T[], count: number): T[] {
  const picked = new Set<T>();
  while (picked.size < Math.min(count, items.length)) {
    picked.add(items[Math.floor(Math.random() * items.length)] as T);
  }
  return [...picked];
}

function distributeHeadcount(roles: Role[], total: number): string[] {
  const totalWeight = roles.reduce((sum, r) => sum + r.headcountWeight, 0);
  const counts = roles.map((r) =>
    Math.floor((r.headcountWeight / totalWeight) * total),
  );
  counts[0] = (counts[0] ?? 0) + total - counts.reduce((a, b) => a + b, 0);
  return roles.flatMap((r, index) => Array(counts[index]).fill(r.role));
}

function scaleHeadcounts(
  departments: [Department, number][],
  max: number,
): Map<Department, number> {
  const total = departments.reduce((sum, [, headcount]) => sum + headcount, 0);
  const ratio = Math.min(1, max / total);
  const scaled = new Map(
    departments.map(([department, headcount]) => [
      department,
      Math.max(1, Math.floor(headcount * ratio)),
    ]),
  );
  const [largest] = departments.reduce((a, b) => (b[1] > a[1] ? b : a));
  const remainder =
    Math.min(max, total) - [...scaled.values()].reduce((a, b) => a + b, 0);
  scaled.set(largest, (scaled.get(largest) ?? 0) + remainder);
  return scaled;
}

function departmentIntro(department: Department, headcount: number) {
  return `You are generating realistic internal company data for ${COMPANY}.

For the ${department} department, which has ${headcount} employees (for this company PRODUCTION means payroll processing operations):`;
}

async function generateRoles(department: Department, headcount: number) {
  const { output } = await generateText({
    model: MODEL,
    output: Output.object({ schema: rolesSchema }),
    prompt: `${departmentIntro(department, headcount)}
- List 3 to 10 distinct job roles in that department (e.g. "Senior Payroll Consultant", "IT Support Technician"), from junior staff to managers.
- headcountWeight (1 to 10) is how common the role is relative to the others: frontline roles high, managers low.`,
  });
  return output.roles;
}

async function generateKnowledge(
  department: Department,
  headcount: number,
  roles: Role[],
  count: number,
  previous: KnowledgeItem[],
) {
  const { output } = await generateText({
    model: MODEL,
    output: Output.object({ schema: knowledgeSchema }),
    prompt: `${departmentIntro(department, headcount)}

Roles (0-based index):
${roles.map((r, index) => `${index}. ${r.role}`).join("\n")}
${
  previous.length > 0
    ? `
Already written (do not repeat these topics, but follow-ups on them are welcome):
${previous.map((item) => `- ${item.contentSummary}`).join("\n")}
`
    : ""
}
- Write exactly ${count} pieces of internal knowledge produced by people in those roles: Slack messages (MESSAGE), emails (EMAIL), or meeting notes (MEETING). Mix the sources.
- authorIndex is the 0-based index of the author's role in the roles list above.
- content is the full text (2 to 6 sentences), concrete and specific: names of systems, clients, numbers, dates, decisions.
- contentSummary is one sentence.
- sourceDescription says where it came from, e.g. "#finance-team Slack channel", "Email to the logistics lead", "Weekly IT sync meeting".
- Some items should reference work of other departments so knowledge connects across the company.`,
  });
  return output.knowledge;
}

async function generateDepartment(
  department: Department,
  headcount: number,
  itemCount: number,
) {
  const roles = await generateRoles(department, headcount);
  const knowledge: KnowledgeItem[] = [];
  while (knowledge.length < itemCount) {
    // oxlint-disable-next-line no-await-in-loop
    const batch = await generateKnowledge(
      department,
      headcount,
      roles,
      Math.min(ITEMS_PER_BATCH, itemCount - knowledge.length),
      knowledge,
    );
    knowledge.push(...batch);
  }
  return { roles, knowledge: knowledge.slice(0, itemCount) };
}

async function generateEdges(
  nodes: { summary: string }[],
  start: number,
  end: number,
  target: number,
) {
  const { output } = await generateText({
    model: MODEL,
    output: Output.object({ schema: edgesSchema }),
    prompt: `Below is a numbered list of knowledge items from one company. Return pairs of items that are meaningfully related (same project, decision, client, system, incident, or follow-up). "from" is the item that references or builds on "to". Only return edges whose "from" is between ${start} and ${end - 1}; "to" can be any item. Aim for about ${target} edges and include cross-department links.

${nodes.map((node, index) => `${index}. ${node.summary}`).join("\n")}`,
  });
  return output.edges;
}

async function main() {
  if (!process.env.AI_GATEWAY_API_KEY) {
    throw new Error("Set AI_GATEWAY_API_KEY in .env.local to run the seed.");
  }

  console.log(`Seeding with ${MODEL}...`);

  await prisma.knowledgeEdge.deleteMany();
  await prisma.knowledgeNode.deleteMany();
  await prisma.integrations.deleteMany();
  await prisma.person.deleteMany();

  const integrations = Object.fromEntries(
    await Promise.all(
      Object.values(IntegrationType).map(async (type) => [
        type,
        (await prisma.integrations.create({ data: { type } })).id,
      ]),
    ),
  ) as Record<IntegrationType, string>;

  const departments = Object.entries(DEPARTMENT_HEADCOUNT) as [
    Department,
    number,
  ][];
  const itemsPerDepartment = Math.floor(
    (MAX_DATA_POINTS - PEOPLE) / (1 + EDGES_PER_NODE) / departments.length,
  );

  const generated = await Promise.all(
    departments.map(async ([department, headcount]) => {
      try {
        const data = await generateDepartment(
          department,
          headcount,
          itemsPerDepartment,
        );
        console.log(
          `  ${department}: ${data.roles.length} roles, ${data.knowledge.length} items`,
        );
        return { department, headcount, data };
      } catch (error) {
        console.warn(`  ${department}: skipped (${(error as Error).message})`);
        return null;
      }
    }),
  );

  const succeeded = generated.filter((entry) => entry !== null);
  const nodeCount = succeeded.reduce(
    (sum, { data }) => sum + data.knowledge.length,
    0,
  );
  const edgeBudget = MAX_DATA_POINTS - PEOPLE - nodeCount;
  const seededHeadcount = scaleHeadcounts(
    succeeded.map(({ department, headcount }) => [department, headcount]),
    PEOPLE,
  );

  const seeded = await Promise.all(
    succeeded.map(async ({ department, data }) => {
      const people = await prisma.person.createManyAndReturn({
        data: distributeHeadcount(
          data.roles,
          seededHeadcount.get(department) ?? 1,
        ).map((role) => ({
          role,
          department,
        })),
      });
      const nodes = await Promise.all(
        data.knowledge.map(async (item) => {
          const authorRole =
            data.roles[item.authorIndex]?.role ?? data.roles[0]?.role;
          const author =
            sample(
              people.filter((person) => person.role === authorRole),
              1,
            )[0] ?? sample(people, 1)[0]!;
          const colleagues = sample(
            people.filter((person) => person.id !== author.id),
            4,
          );
          const node = await prisma.knowledgeNode.create({
            data: {
              content: item.content,
              contentSummary: item.contentSummary,
              source: KnowledgeSource[item.source],
              sourceDescription: item.sourceDescription,
              integrationId: integrations[SOURCE_INTEGRATION[item.source]],
              access: {
                connect: [author, ...colleagues].map(({ id }) => ({ id })),
              },
            },
          });
          return {
            id: node.id,
            summary: `[${department}] ${item.contentSummary}`,
          };
        }),
      );
      return { people, nodes };
    }),
  );

  const allPeople = seeded.flatMap((entry) => entry.people);
  const nodes = seeded.flatMap((entry) => entry.nodes);

  await Promise.all(
    sample(nodes, Math.ceil(nodes.length / 4)).map((node) =>
      prisma.knowledgeNode.update({
        where: { id: node.id },
        data: {
          access: {
            connect: sample(allPeople, 2).map(({ id }) => ({ id })),
          },
        },
      }),
    ),
  );

  const chunkStarts = Array.from(
    { length: Math.ceil(nodes.length / EDGE_CHUNK) },
    (_, index) => index * EDGE_CHUNK,
  );
  const proposedEdges = await Promise.all(
    chunkStarts.map(async (start) => {
      const end = Math.min(start + EDGE_CHUNK, nodes.length);
      try {
        return await generateEdges(
          nodes,
          start,
          end,
          Math.ceil((edgeBudget * (end - start)) / nodes.length),
        );
      } catch (error) {
        console.warn(
          `  edges ${start}-${end - 1}: skipped (${(error as Error).message})`,
        );
        return [];
      }
    }),
  );

  const edgesByKey = new Map<string, { sourceId: string; targetId: string }>();
  for (const { from, to } of proposedEdges.flat()) {
    const source = nodes[from];
    const target = nodes[to];
    if (!source || !target || source === target) continue;
    edgesByKey.set(`${source.id}:${target.id}`, {
      sourceId: source.id,
      targetId: target.id,
    });
  }
  const edges = [...edgesByKey.values()].slice(0, edgeBudget);
  await prisma.knowledgeEdge.createMany({ data: edges, skipDuplicates: true });

  const edgeCounts = new Map<string, number>();
  for (const { sourceId, targetId } of edges) {
    edgeCounts.set(sourceId, (edgeCounts.get(sourceId) ?? 0) + 1);
    edgeCounts.set(targetId, (edgeCounts.get(targetId) ?? 0) + 1);
  }
  await Promise.all(
    [...edgeCounts].map(([id, edgeCount]) =>
      prisma.knowledgeNode.update({ where: { id }, data: { edgeCount } }),
    ),
  );

  console.log(
    `Done: ${allPeople.length} people, ${nodes.length} knowledge nodes, ${edges.length} edges.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
