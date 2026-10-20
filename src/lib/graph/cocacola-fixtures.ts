import type { KnowledgeEdge, KnowledgeNode, NodeFixture } from "./types";

// Coca-Cola's Belgian plants, a new payroll customer going live on 1 January
// 2027: what the company knows about the onboarding, spread over the people
// who were in each conversation. `pnpm db:seed:cocacola` adds it to the graph
// for the demo, where Kobe asks "How is the onboarding of Coca Cola going?".
// Kobe sees the technical side (on track), while payroll operations and sales
// know the go-live is at risk.

const fixtures: NodeFixture[] = [
  {
    id: "n-cocacola-customer",
    title: "Coca-Cola signs a payroll contract",
    contentSummary:
      "Coca-Cola signed a three-year payroll contract for its Belgian plants in Ghent and Antwerp, 1,240 employees. Go-live is 1 January 2027.",
    content:
      "Bram: Signed! Coca-Cola, payroll for their Belgian bottling plants in Ghent and Antwerp: 1,240 employees across blue-collar (PC 118, food industry) and white-collar (PC 220) staff, three-year contract. They leave their current provider at year-end, so go-live is 1 January 2027. Handover to onboarding is on the calendar.",
    source: "MESSAGE",
    integrationId: "i-slack",
    sourceDescription: "#sales-wins",
    visibility: "PUBLIC",
    ownerIds: ["p-bram"],
    createdAt: "2026-09-08",
  },
  {
    id: "n-cocacola-contract",
    title: "Coca-Cola contract terms",
    contentSummary:
      "€8.90 per payslip, and a go-live guarantee: if payroll isn't live on 1 January 2027, the first three months of fees are waived.",
    content:
      "Lotte: final terms for Coca-Cola are €8.90 per payslip plus a one-off implementation fee of €35k. Bram agreed a go-live guarantee to win the deal: if we're not live on 1 January 2027, the first three months of fees are waived, about €52k. Bram: they insisted, their current contract ends on 31 December.",
    source: "EMAIL",
    integrationId: "i-outlook",
    sourceDescription: "Email: Coca-Cola contract",
    visibility: "PRIVATE",
    ownerIds: ["p-bram", "p-lotte"],
    createdAt: "2026-09-10",
  },
  {
    id: "n-cocacola-kickoff",
    title: "Coca-Cola kick-off meeting",
    contentSummary:
      "Onboarding plan: HR system feed by 1 October, data migration by 15 October, parallel runs in October and November, go-live 1 January 2027.",
    content:
      "Bram walked the team through the deal. Plan for the onboarding: Kobe connects their HR system by 1 October, Julien migrates the payroll history by 15 October, Filip runs parallel payrolls in October and November, Sofie and An configure the sector rules. Go-live 1 January 2027.",
    source: "MEETING",
    integrationId: "i-teams-meetings",
    sourceDescription: "Meeting: Coca-Cola kick-off",
    visibility: "PRIVATE",
    ownerIds: ["p-bram", "p-filip", "p-kobe", "p-sofie", "p-julien"],
    createdAt: "2026-09-15",
  },
  {
    id: "n-cocacola-integration",
    title: "Coca-Cola onboarding: HR system connected",
    contentSummary:
      "The nightly employee feed from Coca-Cola's HR system runs since 2 October; 1,228 of 1,240 employees load, 12 lack a bank account number. SSO works.",
    content:
      "Kobe: the SFTP feed from Coca-Cola's HR system is live since 2 October and imports their employee master data every night. 1,228 of 1,240 employees load cleanly, 12 are rejected for a missing IBAN; their HR team is fixing those. Single sign-on through their Entra ID works for all 8 payroll admins. Victor: their payroll API access waits for the OAuth go-live in mid-December.",
    source: "MEETING",
    integrationId: "i-teams-meetings",
    sourceDescription: "Meeting: Coca-Cola integration check-in",
    visibility: "PRIVATE",
    ownerIds: ["p-kobe", "p-victor"],
    createdAt: "2026-10-06",
  },
  {
    id: "n-cocacola-sector-rules",
    title: "PC 118 sector rules for Coca-Cola",
    contentSummary:
      "Coca-Cola's plant workers need custom wage codes: the food sector year-end premium, seniority holidays and 15% night shift allowances aren't in the standard template.",
    content:
      "An: the food industry (PC 118) has rules our standard Belgian template doesn't cover. Coca-Cola's plants need the sector year-end premium, extra seniority holidays and a 15% allowance for night shifts on the bottling lines as custom wage codes. Sofie: about 40 hours of configuration, and we can only start once their shift codes are mapped.",
    source: "MESSAGE",
    integrationId: "i-teams",
    sourceDescription: "Teams chat: An & Sofie",
    visibility: "PRIVATE",
    ownerIds: ["p-an", "p-sofie"],
    createdAt: "2026-10-09",
  },
  {
    id: "n-cocacola-training",
    title: "Support training for Coca-Cola",
    contentSummary:
      "Support trains Coca-Cola's eight payroll admins on 2 and 3 December and sets up a dedicated helpdesk queue for January.",
    content:
      "Pieter: we train Coca-Cola's eight payroll admins on 2 and 3 December at the Ghent plant. They get a dedicated helpdesk queue for their first payroll in January, with two agents who know the food industry wage codes.",
    source: "MESSAGE",
    integrationId: "i-slack",
    sourceDescription: "#support-team",
    visibility: "PRIVATE",
    ownerIds: ["p-pieter"],
    createdAt: "2026-10-13",
  },
  {
    id: "n-cocacola-migration",
    title: "Coca-Cola onboarding: data migration done",
    contentSummary:
      "Payroll history from 2024 to 2026 is migrated; year-to-date totals reconcile for 1,235 of 1,240 employees. IT approved the cutover plan for 1 January.",
    content:
      "Julien: payroll history for 2024 to 2026 is migrated from their old provider. Year-to-date totals reconcile to the cent for 1,235 of 1,240 employees; the other 5 left mid-year and are being checked by hand. Kobe: IT approved the cutover plan, the last import runs on 31 December and go-live stays 1 January.",
    source: "MESSAGE",
    integrationId: "i-slack",
    sourceDescription: "#platform",
    visibility: "PRIVATE",
    ownerIds: ["p-julien", "p-kobe"],
    createdAt: "2026-10-14",
  },
  {
    id: "n-cocacola-parallel-run",
    title: "Coca-Cola onboarding: parallel run results",
    contentSummary:
      "The October parallel run shows 4% of payslips differ, mostly food sector premiums and night shift allowances. Go-live on 1 January is at risk.",
    content:
      "Filip: the October parallel run for Coca-Cola is in. 51 of 1,240 payslips differ from their current provider's, mostly the food sector premiums and night shift allowances that aren't configured yet. An: those wage codes need about two more weeks. Filip: unless the sector rules are in by 15 November, 1 January is at risk and we should propose 1 February as a fallback.",
    source: "MEETING",
    integrationId: "i-teams-meetings",
    sourceDescription: "Meeting: Coca-Cola parallel run review",
    visibility: "PRIVATE",
    ownerIds: ["p-filip", "p-an"],
    createdAt: "2026-10-16",
  },
  {
    id: "n-cocacola-escalation",
    title: "Coca-Cola onboarding: customer escalation",
    contentSummary:
      "Coca-Cola's HR director escalated to Bram about two missed workshops and the parallel run errors; the go-live guarantee is now at stake.",
    content:
      "Bram: Coca-Cola's HR director emailed me. We moved two configuration workshops and the parallel run errors worry their works council. She wants a recovery plan by Friday. Lotte: if we miss 1 January the go-live guarantee costs us about €52k in waived fees. Bram asked Filip for a plan.",
    source: "EMAIL",
    integrationId: "i-outlook",
    sourceDescription: "Email: Coca-Cola escalation",
    visibility: "PRIVATE",
    ownerIds: ["p-bram", "p-lotte"],
    createdAt: "2026-10-17",
  },
];

// Access starts as the owners, as in fixtures.ts.
export const cocacolaNodes: KnowledgeNode[] = fixtures.map((node) =>
  Object.assign(node, { accessIds: [...node.ownerIds] }),
);

const edgeSeeds: [string, string, KnowledgeEdge["kind"], string][] = [
  [
    "n-cocacola-contract",
    "n-cocacola-customer",
    "RELATES_TO",
    "Contract terms for Coca-Cola",
  ],
  [
    "n-cocacola-kickoff",
    "n-cocacola-customer",
    "RELATES_TO",
    "Onboarding starts after the signing",
  ],
  [
    "n-cocacola-integration",
    "n-cocacola-kickoff",
    "RELATES_TO",
    "First milestone of the plan",
  ],
  [
    "n-cocacola-integration",
    "n-api-oauth",
    "DEPENDS_ON",
    "API access waits for OAuth",
  ],
  [
    "n-cocacola-migration",
    "n-cocacola-integration",
    "DEPENDS_ON",
    "Builds on the employee feed",
  ],
  [
    "n-cocacola-migration",
    "n-deploy-freeze",
    "RELATES_TO",
    "Cutover falls in the freeze window",
  ],
  [
    "n-cocacola-parallel-run",
    "n-cocacola-migration",
    "DEPENDS_ON",
    "Runs on the migrated data",
  ],
  [
    "n-cocacola-parallel-run",
    "n-cocacola-sector-rules",
    "DEPENDS_ON",
    "Differences come from the sector rules",
  ],
  [
    "n-cocacola-parallel-run",
    "n-year-end-run",
    "RELATES_TO",
    "Go-live right after the year-end run",
  ],
  [
    "n-cocacola-training",
    "n-cocacola-parallel-run",
    "RELATES_TO",
    "Training before the go-live",
  ],
  [
    "n-cocacola-escalation",
    "n-cocacola-parallel-run",
    "UPDATES",
    "Escalation after the parallel run",
  ],
  [
    "n-cocacola-escalation",
    "n-cocacola-contract",
    "RELATES_TO",
    "Go-live guarantee at stake",
  ],
  [
    "n-cocacola-escalation",
    "n-cocacola-customer",
    "RELATES_TO",
    "Escalation from the customer",
  ],
];

export const cocacolaEdges: KnowledgeEdge[] = edgeSeeds.map(
  ([sourceId, targetId, kind, description], i) => ({
    id: `e-cocacola-${i + 1}`,
    sourceId,
    targetId,
    kind,
    description,
  }),
);
