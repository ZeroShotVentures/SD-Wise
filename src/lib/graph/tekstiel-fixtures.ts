import type { KnowledgeEdge, KnowledgeNode, NodeFixture } from "./types";

// Tekstiel NV, a new payroll customer going live on 1 January 2027: what the
// company knows about its onboarding, spread over the people who were in each
// conversation. Not part of `pnpm db:seed`; `pnpm db:seed:tekstiel` writes it
// for the demo, where Kobe asks "How is the onboarding of Tekstiel NV going?".
// Kobe sees the technical side (on track), while payroll operations and sales
// know the go-live is at risk.

const fixtures: NodeFixture[] = [
  {
    id: "n-tekstiel-customer",
    title: "Tekstiel NV signs a payroll contract",
    contentSummary:
      "Tekstiel NV, a textile maker in Kortrijk with 851 employees, signed a three-year payroll contract. Go-live is 1 January 2027.",
    content:
      "Bram: Signed! Tekstiel NV from Kortrijk, 851 employees across blue-collar (PC 120, textile) and white-collar (PC 214) staff, three-year payroll contract. They leave their current provider at year-end, so go-live is 1 January 2027. Handover to onboarding is on the calendar.",
    source: "MESSAGE",
    integrationId: "i-slack",
    sourceDescription: "#sales-wins",
    visibility: "PUBLIC",
    ownerIds: ["p-bram"],
    createdAt: "2026-09-08",
  },
  {
    id: "n-tekstiel-contract",
    title: "Tekstiel NV contract terms",
    contentSummary:
      "€9.40 per payslip, and a go-live guarantee: if payroll isn't live on 1 January 2027, the first three months of fees are waived.",
    content:
      "Lotte: final terms for Tekstiel NV are €9.40 per payslip plus a one-off implementation fee of €24k. Bram agreed a go-live guarantee to win the deal: if we're not live on 1 January 2027, the first three months of fees are waived, about €38k. Bram: they insisted, their current contract ends on 31 December.",
    source: "EMAIL",
    integrationId: "i-outlook",
    sourceDescription: "Email: Tekstiel NV contract",
    visibility: "PRIVATE",
    ownerIds: ["p-bram", "p-lotte"],
    createdAt: "2026-09-10",
  },
  {
    id: "n-tekstiel-kickoff",
    title: "Tekstiel NV kick-off meeting",
    contentSummary:
      "Onboarding plan: HR system feed by 1 October, data migration by 15 October, parallel runs in October and November, go-live 1 January 2027.",
    content:
      "Bram walked the team through the deal. Plan for the onboarding: Kobe connects their HR system by 1 October, Julien migrates the payroll history by 15 October, Filip runs parallel payrolls in October and November, Sofie and An configure the sector rules. Go-live 1 January 2027.",
    source: "MEETING",
    integrationId: "i-teams-meetings",
    sourceDescription: "Meeting: Tekstiel NV kick-off",
    visibility: "PRIVATE",
    ownerIds: ["p-bram", "p-filip", "p-kobe", "p-sofie", "p-julien"],
    createdAt: "2026-09-15",
  },
  {
    id: "n-tekstiel-integration",
    title: "Tekstiel NV onboarding: HR system connected",
    contentSummary:
      "The nightly employee feed from Tekstiel NV's HR system runs since 2 October; 842 of 851 employees load, 9 lack a bank account number. SSO works.",
    content:
      "Kobe: the SFTP feed from Tekstiel NV's HR system is live since 2 October and imports their employee master data every night. 842 of 851 employees load cleanly, 9 are rejected for a missing IBAN; their HR team is fixing those. Single sign-on through their Entra ID works for all 6 payroll admins. Victor: their payroll API access waits for the OAuth go-live in mid-December.",
    source: "MEETING",
    integrationId: "i-teams-meetings",
    sourceDescription: "Meeting: Tekstiel NV integration check-in",
    visibility: "PRIVATE",
    ownerIds: ["p-kobe", "p-victor"],
    createdAt: "2026-10-06",
  },
  {
    id: "n-tekstiel-sector-rules",
    title: "PC 120 sector rules for Tekstiel NV",
    contentSummary:
      "Tekstiel NV's textile workers need custom wage codes: the sector year-end premium, seniority holidays and 12% night shift allowances aren't in the standard template.",
    content:
      "An: the textile sector (PC 120) has rules our standard Belgian template doesn't cover. Tekstiel NV needs the sector year-end premium, extra seniority holidays and a 12% allowance for night shifts as custom wage codes. Sofie: about 40 hours of configuration, and we can only start once their shift codes are mapped.",
    source: "MESSAGE",
    integrationId: "i-teams",
    sourceDescription: "Teams chat: An & Sofie",
    visibility: "PRIVATE",
    ownerIds: ["p-an", "p-sofie"],
    createdAt: "2026-10-09",
  },
  {
    id: "n-tekstiel-training",
    title: "Support training for Tekstiel NV",
    contentSummary:
      "Support trains Tekstiel NV's six payroll admins on 2 and 3 December and sets up a dedicated helpdesk queue for January.",
    content:
      "Pieter: we train Tekstiel NV's six payroll admins on 2 and 3 December in Kortrijk. They get a dedicated helpdesk queue for their first payroll in January, with two agents who know the textile wage codes.",
    source: "MESSAGE",
    integrationId: "i-slack",
    sourceDescription: "#support-team",
    visibility: "PRIVATE",
    ownerIds: ["p-pieter"],
    createdAt: "2026-10-13",
  },
  {
    id: "n-tekstiel-migration",
    title: "Tekstiel NV onboarding: data migration done",
    contentSummary:
      "Payroll history from 2024 to 2026 is migrated; year-to-date totals reconcile for 848 of 851 employees. IT approved the cutover plan for 1 January.",
    content:
      "Julien: payroll history for 2024 to 2026 is migrated from their old provider. Year-to-date totals reconcile to the cent for 848 of 851 employees; the other 3 left mid-year and are being checked by hand. Kobe: IT approved the cutover plan, the last import runs on 31 December and go-live stays 1 January.",
    source: "MESSAGE",
    integrationId: "i-slack",
    sourceDescription: "#platform",
    visibility: "PRIVATE",
    ownerIds: ["p-julien", "p-kobe"],
    createdAt: "2026-10-14",
  },
  {
    id: "n-tekstiel-parallel-run",
    title: "Tekstiel NV onboarding: parallel run results",
    contentSummary:
      "The October parallel run shows 4% of payslips differ, mostly textile sector premiums and night shift allowances. Go-live on 1 January is at risk.",
    content:
      "Filip: the October parallel run for Tekstiel NV is in. 34 of 851 payslips differ from their current provider's, mostly the textile sector premiums and night shift allowances that aren't configured yet. An: those wage codes need about two more weeks. Filip: unless the sector rules are in by 15 November, 1 January is at risk and we should propose 1 February as a fallback.",
    source: "MEETING",
    integrationId: "i-teams-meetings",
    sourceDescription: "Meeting: Tekstiel NV parallel run review",
    visibility: "PRIVATE",
    ownerIds: ["p-filip", "p-an"],
    createdAt: "2026-10-16",
  },
  {
    id: "n-tekstiel-escalation",
    title: "Tekstiel NV onboarding: customer escalation",
    contentSummary:
      "Tekstiel NV's HR director escalated to Bram about two missed workshops and the parallel run errors; the go-live guarantee is now at stake.",
    content:
      "Bram: Tekstiel NV's HR director emailed me. We moved two configuration workshops and the parallel run errors worry their works council. She wants a recovery plan by Friday. Lotte: if we miss 1 January the go-live guarantee costs us about €38k in waived fees. Bram asked Filip for a plan.",
    source: "EMAIL",
    integrationId: "i-outlook",
    sourceDescription: "Email: Tekstiel NV escalation",
    visibility: "PRIVATE",
    ownerIds: ["p-bram", "p-lotte"],
    createdAt: "2026-10-17",
  },
];

// Access starts as the owners, as in fixtures.ts.
export const tekstielNodes: KnowledgeNode[] = fixtures.map((node) =>
  Object.assign(node, { accessIds: [...node.ownerIds] }),
);

const edgeSeeds: [string, string, KnowledgeEdge["kind"], string][] = [
  [
    "n-tekstiel-contract",
    "n-tekstiel-customer",
    "RELATES_TO",
    "Contract terms for Tekstiel NV",
  ],
  [
    "n-tekstiel-kickoff",
    "n-tekstiel-customer",
    "RELATES_TO",
    "Onboarding starts after the signing",
  ],
  [
    "n-tekstiel-integration",
    "n-tekstiel-kickoff",
    "RELATES_TO",
    "First milestone of the plan",
  ],
  [
    "n-tekstiel-integration",
    "n-api-oauth",
    "DEPENDS_ON",
    "API access waits for OAuth",
  ],
  [
    "n-tekstiel-migration",
    "n-tekstiel-integration",
    "DEPENDS_ON",
    "Builds on the employee feed",
  ],
  [
    "n-tekstiel-migration",
    "n-deploy-freeze",
    "RELATES_TO",
    "Cutover falls in the freeze window",
  ],
  [
    "n-tekstiel-parallel-run",
    "n-tekstiel-migration",
    "DEPENDS_ON",
    "Runs on the migrated data",
  ],
  [
    "n-tekstiel-parallel-run",
    "n-tekstiel-sector-rules",
    "DEPENDS_ON",
    "Differences come from the sector rules",
  ],
  [
    "n-tekstiel-parallel-run",
    "n-year-end-run",
    "RELATES_TO",
    "Go-live right after the year-end run",
  ],
  [
    "n-tekstiel-training",
    "n-tekstiel-parallel-run",
    "RELATES_TO",
    "Training before the go-live",
  ],
  [
    "n-tekstiel-escalation",
    "n-tekstiel-parallel-run",
    "UPDATES",
    "Escalation after the parallel run",
  ],
  [
    "n-tekstiel-escalation",
    "n-tekstiel-contract",
    "RELATES_TO",
    "Go-live guarantee at stake",
  ],
  [
    "n-tekstiel-escalation",
    "n-tekstiel-customer",
    "RELATES_TO",
    "Escalation from the customer",
  ],
];

export const tekstielEdges: KnowledgeEdge[] = edgeSeeds.map(
  ([sourceId, targetId, kind, description], i) => ({
    id: `e-tekstiel-${i + 1}`,
    sourceId,
    targetId,
    kind,
    description,
  }),
);
