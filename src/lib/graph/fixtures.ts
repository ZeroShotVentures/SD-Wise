import type {
  EdgeKind,
  Integration,
  KnowledgeEdge,
  KnowledgeNode,
  KnowledgeSource,
  Person,
  Visibility,
} from "./types";

// Mock company brain for SD Worx. The people are also seeded as Person rows
// (pnpm db:seed:demo) so questions between them can be stored for real.

export const people: Person[] = [
  { id: "p-dario", name: "Dario", role: "Product lead", department: "IT" },
  {
    id: "p-victor",
    name: "Victor",
    role: "Backend engineer",
    department: "IT",
  },
  { id: "p-julien", name: "Julien", role: "Data engineer", department: "IT" },
  {
    id: "p-timon",
    name: "Timon",
    role: "Marketing lead",
    department: "MARKETING",
  },
  {
    id: "p-sofie",
    name: "Sofie Peeters",
    role: "HR business partner",
    department: "HR",
  },
  {
    id: "p-bram",
    name: "Bram De Smet",
    role: "Account manager",
    department: "SALES",
  },
  {
    id: "p-lotte",
    name: "Lotte Janssens",
    role: "Financial controller",
    department: "FINANCE",
  },
  {
    id: "p-pieter",
    name: "Pieter Claes",
    role: "Support team lead",
    department: "CUSTOMER_SERVICE",
  },
  {
    id: "p-an",
    name: "An Maes",
    role: "Payroll legal expert",
    department: "HR",
  },
  {
    id: "p-kobe",
    name: "Kobe Verdonck",
    role: "Platform lead",
    department: "IT",
  },
  {
    id: "p-filip",
    name: "Filip Dierckx",
    role: "Payroll operations lead",
    department: "PRODUCTION",
  },
];

export const integrations: Integration[] = [
  { id: "i-slack", type: "slack", connected: true, connectedAt: "2026-09-02" },
  { id: "i-teams", type: "teams", connected: true, connectedAt: "2026-09-02" },
  {
    id: "i-outlook",
    type: "outlook",
    connected: true,
    connectedAt: "2026-09-03",
  },
  {
    id: "i-teams-meetings",
    type: "teams_meetings",
    connected: true,
    connectedAt: "2026-09-03",
  },
  { id: "i-meet", type: "google_meet", connected: false, connectedAt: null },
  { id: "i-gmail", type: "gmail", connected: false, connectedAt: null },
  { id: "i-zoom", type: "zoom", connected: false, connectedAt: null },
];

type NodeSeed = {
  id: string;
  title: string;
  summary: string;
  content: string;
  source: KnowledgeSource;
  integrationId: string;
  from: string;
  visibility: Visibility;
  owners: string[];
  at: string;
};

const nodeSeeds: NodeSeed[] = [
  // Sales: Kras
  {
    id: "n-kras-customer",
    title: "Kras is a payroll customer",
    summary:
      "Kras has been an SD Worx payroll customer since 2024, about 1,200 employees across Belgium.",
    content:
      "Bram: Kras signed in spring 2024, ~1,200 FTE, all Belgian entities. Main contact is their HR director.",
    source: "MESSAGE",
    integrationId: "i-slack",
    from: "#sales-benelux",
    visibility: "PUBLIC",
    owners: ["p-bram"],
    at: "2026-03-11",
  },
  {
    id: "n-kras-pricing",
    title: "Kras pricing",
    summary: "Kras pays €4.20 per payslip per month, billed quarterly.",
    content:
      "Lotte, confirming the Kras contract: €4.20 per payslip per month, quarterly invoicing, 3-year term. — Bram",
    source: "EMAIL",
    integrationId: "i-outlook",
    from: "Email: Kras contract terms",
    visibility: "PRIVATE",
    owners: ["p-bram", "p-lotte"],
    at: "2026-04-02",
  },
  {
    id: "n-kras-renewal",
    title: "Kras renewal discount",
    summary:
      "For the 2027 renewal Kras gets an 8% discount if they move to Payroll Cloud v3.",
    content:
      "Dario: we can go to 8% if they migrate to v3. Lotte: fine, as long as it's tied to v3. Bram: I'll propose it Friday.",
    source: "MEETING",
    integrationId: "i-teams-meetings",
    from: "Meeting: Kras renewal prep",
    visibility: "PRIVATE",
    owners: ["p-bram", "p-lotte", "p-dario"],
    at: "2026-09-10",
  },
  {
    id: "n-kras-api",
    title: "Kras wants API access",
    summary: "Kras wants access to the Payroll API by Q1 2027 for their ERP.",
    content:
      "Bram: Kras asked again about the Payroll API, they want to sync with their ERP by Q1. Victor: doable once OAuth is live.",
    source: "MESSAGE",
    integrationId: "i-teams",
    from: "Teams chat: Bram & Victor",
    visibility: "PRIVATE",
    owners: ["p-bram", "p-victor"],
    at: "2026-09-15",
  },
  // Product and engineering
  {
    id: "n-v3-launch",
    title: "Payroll Cloud v3 launch",
    summary: "Payroll Cloud v3 is planned to launch in March 2027.",
    content:
      "Decision: v3 GA in March 2027. Beta with 5 customers from January. Owners: Dario (product), Kobe (platform).",
    source: "MEETING",
    integrationId: "i-teams-meetings",
    from: "Meeting: Product roadmap Q4",
    visibility: "PUBLIC",
    owners: ["p-dario", "p-victor", "p-julien", "p-kobe"],
    at: "2026-09-05",
  },
  {
    id: "n-v3-indexation",
    title: "v3 blocked on indexation rules",
    summary:
      "v3 payroll engine is blocked until the 2027 Belgian indexation rules are implemented.",
    content:
      "Victor: we can't close the v3 engine until the 2027 indexation rules are in. Julien: waiting on legal for the numbers.",
    source: "MESSAGE",
    integrationId: "i-slack",
    from: "#payroll-engine",
    visibility: "PRIVATE",
    owners: ["p-victor", "p-julien", "p-kobe"],
    at: "2026-09-18",
  },
  {
    id: "n-indexation-2027",
    title: "Indexation 2027",
    summary: "Indexation for joint committee 200 is 2.1% from January 2027.",
    content:
      "An: the indexation for PC 200 will be 2.1% from 1 January 2027. Final figure confirmed by the sector federation.",
    source: "EMAIL",
    integrationId: "i-outlook",
    from: "Email: Indexation update",
    visibility: "PRIVATE",
    owners: ["p-an", "p-sofie"],
    at: "2026-09-22",
  },
  {
    id: "n-api-rate-limit",
    title: "Payroll API rate limit",
    summary: "The public Payroll API is limited to 100 requests per minute.",
    content:
      "Kobe: rate limit on the public Payroll API stays at 100 req/min per client for now.",
    source: "MESSAGE",
    integrationId: "i-slack",
    from: "#platform",
    visibility: "PUBLIC",
    owners: ["p-victor", "p-kobe"],
    at: "2026-06-12",
  },
  {
    id: "n-api-oauth",
    title: "API auth moves to OAuth 2.1",
    summary:
      "Payroll API authentication moves from API keys to OAuth 2.1 in December 2026.",
    content:
      "Decision: API keys are deprecated. OAuth 2.1 client credentials go live mid-December, keys keep working until March.",
    source: "MEETING",
    integrationId: "i-teams-meetings",
    from: "Meeting: Platform sync",
    visibility: "PRIVATE",
    owners: ["p-victor", "p-kobe", "p-julien"],
    at: "2026-09-24",
  },
  // SD Wise itself
  {
    id: "n-wise-facts",
    title: "Store facts, not documents",
    summary:
      "SD Wise stores facts from conversations, linked in a graph and owned by the people who were there.",
    content:
      "Dario: we don't store documents, we store pieces of information linked by relations. Each one is owned by whoever was in the conversation.",
    source: "MEETING",
    integrationId: "i-teams-meetings",
    from: "Meeting: Dok Noord kickoff",
    visibility: "PRIVATE",
    owners: ["p-dario", "p-victor", "p-julien", "p-timon"],
    at: "2026-09-30",
  },
  {
    id: "n-wise-search",
    title: "Graph search approach",
    summary:
      "Search embeds the question, picks an entry node by vector search, then walks edges to related nodes.",
    content:
      "Julien: question gets embedded, vector search gives the entry node, then we traverse edges. Victor: keep it simple, top-k plus one hop.",
    source: "MESSAGE",
    integrationId: "i-slack",
    from: "Slack DM: Julien & Victor",
    visibility: "PRIVATE",
    owners: ["p-julien", "p-victor"],
    at: "2026-09-30",
  },
  {
    id: "n-wise-demo",
    title: "Demo uses our own chats",
    summary: "The SD Wise demo is seeded with the team's own conversations.",
    content:
      "Agreed: seed with our own four-person conversations. No real integrations, just rows that say they're Slack messages.",
    source: "MEETING",
    integrationId: "i-teams-meetings",
    from: "Meeting: Dok Noord kickoff",
    visibility: "PUBLIC",
    owners: ["p-dario", "p-victor", "p-julien", "p-timon"],
    at: "2026-09-30",
  },
  // HR
  {
    id: "n-salary-victor",
    title: "Salary review: Victor",
    summary:
      "Victor's salary review is scheduled for November with a 4% raise.",
    content:
      "Sofie: Victor's review is in November, budget approved for a 4% raise. Lotte: confirmed in the HR budget.",
    source: "EMAIL",
    integrationId: "i-outlook",
    from: "Email: Salary reviews Q4",
    visibility: "PRIVATE",
    owners: ["p-sofie", "p-lotte"],
    at: "2026-09-12",
  },
  {
    id: "n-remote-policy",
    title: "Hybrid work policy",
    summary: "Everyone works from the office at least two days a week.",
    content:
      "Sofie: reminder, the hybrid policy is two office days per week, team days are Tuesday and Thursday.",
    source: "MESSAGE",
    integrationId: "i-teams",
    from: "Teams: #announcements",
    visibility: "PUBLIC",
    owners: ["p-sofie"],
    at: "2026-01-15",
  },
  {
    id: "n-car-policy",
    title: "Company car policy 2027",
    summary: "From 2027 only fully electric company cars can be ordered.",
    content:
      "Sofie: from January 2027 new company car orders are EV only. Lotte: charging cards are covered by the mobility budget.",
    source: "MESSAGE",
    integrationId: "i-teams",
    from: "Teams chat: Sofie & Lotte",
    visibility: "PRIVATE",
    owners: ["p-sofie", "p-lotte"],
    at: "2026-08-28",
  },
  {
    id: "n-buddy",
    title: "Onboarding buddy programme",
    summary: "Every new joiner gets a buddy for their first three months.",
    content:
      "Pieter: support is piloting the buddy programme, every newcomer gets a buddy for 3 months. Sofie: rolling out company-wide.",
    source: "MESSAGE",
    integrationId: "i-slack",
    from: "#people",
    visibility: "PUBLIC",
    owners: ["p-sofie", "p-pieter"],
    at: "2026-05-20",
  },
  // Customer service
  {
    id: "n-payslip-bug",
    title: "Payslip PDF bug",
    summary:
      "Payslip PDFs fail to render in Firefox; workaround is downloading instead of previewing.",
    content:
      "Pieter: customers report blank payslips in Firefox. Victor: known issue in the PDF viewer, tell them to download. Fix ships in 3.4.",
    source: "MESSAGE",
    integrationId: "i-slack",
    from: "#support-escalations",
    visibility: "PUBLIC",
    owners: ["p-pieter", "p-victor"],
    at: "2026-09-08",
  },
  {
    id: "n-holiday-tickets",
    title: "Top ticket driver: holiday pay",
    summary:
      "Holiday pay calculations are the top reason customers open tickets.",
    content:
      "Pieter: 31% of tickets this quarter are about holiday pay. An: mostly the double holiday pay for white-collar workers.",
    source: "MEETING",
    integrationId: "i-teams-meetings",
    from: "Meeting: Support review Q3",
    visibility: "PRIVATE",
    owners: ["p-pieter", "p-an"],
    at: "2026-09-19",
  },
  {
    id: "n-holiday-rule",
    title: "Double holiday pay rule",
    summary:
      "Double holiday pay for white-collar workers is 92% of the monthly salary.",
    content:
      "An: double holiday pay is 92% of gross monthly salary, paid in May or June. Pro rata for part-timers.",
    source: "EMAIL",
    integrationId: "i-outlook",
    from: "Email: Holiday pay FAQ",
    visibility: "PRIVATE",
    owners: ["p-an"],
    at: "2026-04-30",
  },
  // Marketing
  {
    id: "n-hrtech-booth",
    title: "HR Tech Day booth",
    summary: "SD Worx has a booth at HR Tech Day on 14 November in Brussels.",
    content:
      "Timon: we have booth 12 at HR Tech Day, 14 November, Brussels. Need two people from product.",
    source: "MESSAGE",
    integrationId: "i-teams",
    from: "Teams: #marketing",
    visibility: "PUBLIC",
    owners: ["p-timon"],
    at: "2026-09-01",
  },
  {
    id: "n-launch-video",
    title: "v3 launch video",
    summary: "A 90-second launch video for v3 is due in February 2027.",
    content:
      "Timon: storyboard for the v3 launch video is ready, 90 seconds, due February. Dario: keep the product shots for last.",
    source: "MESSAGE",
    integrationId: "i-slack",
    from: "Slack DM: Timon & Dario",
    visibility: "PRIVATE",
    owners: ["p-timon", "p-dario"],
    at: "2026-09-26",
  },
  {
    id: "n-pitch-metric",
    title: "Pitch metric: time to answer",
    summary:
      "The SD Wise pitch focuses on time-to-answer: how fast you're no longer in the dark.",
    content:
      "Timon: the pitch metric is time-to-answer. You either get the answer or the right person, never a list of documents.",
    source: "MEETING",
    integrationId: "i-teams-meetings",
    from: "Meeting: Pitch prep",
    visibility: "PRIVATE",
    owners: ["p-timon", "p-dario"],
    at: "2026-09-30",
  },
  // Payroll operations
  {
    id: "n-cutoff-december",
    title: "December payroll cut-off",
    summary:
      "The December 2026 payroll cut-off is 14 December, a week earlier than usual because of the holiday closure.",
    content:
      "Filip: the December cut-off moves to 14 December because of the holiday closure. Changes after that go into the January run, together with the new indexation.",
    source: "EMAIL",
    integrationId: "i-outlook",
    from: "Email: December payroll planning",
    visibility: "PRIVATE",
    owners: ["p-filip"],
    at: "2026-09-23",
  },
  {
    id: "n-year-end-run",
    title: "Year-end payroll run",
    summary:
      "The year-end payroll run on 28 December pays the end-of-year bonus for all Belgian clients.",
    content:
      "Filip: year-end run is 28 December, right after the December cut-off, and includes the end-of-year bonus. Lotte: cash for the bonus run is reserved.",
    source: "MEETING",
    integrationId: "i-teams-meetings",
    from: "Meeting: Year-end payroll planning",
    visibility: "PRIVATE",
    owners: ["p-filip", "p-lotte"],
    at: "2026-09-17",
  },
  {
    id: "n-payroll-sla",
    title: "Payroll processing SLA",
    summary:
      "Payslips are processed within two working days after each cut-off.",
    content:
      "Filip: our SLA stays at two working days from cut-off to payslip. Pieter: support quotes this to every customer who asks.",
    source: "MESSAGE",
    integrationId: "i-slack",
    from: "#payroll-ops",
    visibility: "PUBLIC",
    owners: ["p-filip", "p-pieter"],
    at: "2026-07-08",
  },
  // Finance and platform
  {
    id: "n-ai-budget",
    title: "AI tooling budget",
    summary: "The Q4 budget includes €40k for AI tooling.",
    content:
      "Lotte: €40k approved for AI tooling in Q4, owned by Kobe. Needs a vendor decision before November.",
    source: "EMAIL",
    integrationId: "i-outlook",
    from: "Email: Q4 budget",
    visibility: "PRIVATE",
    owners: ["p-lotte", "p-kobe"],
    at: "2026-09-09",
  },
  {
    id: "n-llm-vendors",
    title: "LLM vendor shortlist",
    summary:
      "Two LLM vendors are shortlisted; the decision is due end of October.",
    content:
      "Kobe: shortlist is down to two vendors, running an eval on payroll questions. Julien owns the eval set.",
    source: "MESSAGE",
    integrationId: "i-slack",
    from: "#platform-ai",
    visibility: "PRIVATE",
    owners: ["p-kobe", "p-julien"],
    at: "2026-09-21",
  },
  {
    id: "n-gdpr-retention",
    title: "Transcript retention",
    summary:
      "Meeting transcripts are kept for 90 days, then only extracted facts remain.",
    content:
      "Kobe: legal agreed transcripts are deleted after 90 days. The extracted facts stay, with their owners.",
    source: "EMAIL",
    integrationId: "i-outlook",
    from: "Email: GDPR review",
    visibility: "PUBLIC",
    owners: ["p-kobe", "p-sofie"],
    at: "2026-09-25",
  },
  // Platform and payroll operations: what Kobe and Filip know about each
  // other's work, so each has a reason to ask the other.
  {
    id: "n-deploy-freeze",
    title: "Deploy freeze over the holidays",
    summary:
      "No platform deploys from 14 December to 4 January, so the payroll engine stays stable for the year-end run.",
    content:
      "Kobe: we freeze all platform deploys from 14 December to 4 January. The OAuth go-live ships the week before, hotfixes only after that and they need my sign-off.",
    source: "MESSAGE",
    integrationId: "i-slack",
    from: "#platform",
    visibility: "PRIVATE",
    owners: ["p-kobe"],
    at: "2026-09-26",
  },
  {
    id: "n-engine-capacity",
    title: "Year-end engine capacity",
    summary:
      "The payroll engine runs with double the workers from 14 to 30 December to handle the year-end volume.",
    content:
      "Filip: December volume is about 30% higher than a normal month, bonuses included. Kobe: we double the payroll engine workers from 14 to 30 December and I'm on call for the year-end run.",
    source: "MEETING",
    integrationId: "i-teams-meetings",
    from: "Meeting: Kobe & Filip, year-end readiness",
    visibility: "PRIVATE",
    owners: ["p-kobe", "p-filip"],
    at: "2026-09-29",
  },
];

export const nodes: KnowledgeNode[] = nodeSeeds.map((n) => ({
  id: n.id,
  title: n.title,
  content: n.content,
  contentSummary: n.summary,
  source: n.source,
  integrationId: n.integrationId,
  sourceDescription: n.from,
  visibility: n.visibility,
  ownerIds: n.owners,
  accessIds: [...n.owners],
  createdAt: n.at,
}));

const edgeSeeds: [string, string, EdgeKind, string][] = [
  [
    "n-kras-pricing",
    "n-kras-customer",
    "RELATES_TO",
    "Contract terms for Kras",
  ],
  ["n-kras-renewal", "n-kras-pricing", "UPDATES", "Renewal changes the price"],
  ["n-kras-renewal", "n-v3-launch", "DEPENDS_ON", "Discount is tied to v3"],
  ["n-kras-api", "n-kras-customer", "RELATES_TO", "Request from Kras"],
  ["n-kras-api", "n-api-oauth", "DEPENDS_ON", "Needs OAuth to be live"],
  ["n-v3-indexation", "n-v3-launch", "DEPENDS_ON", "Blocks the v3 launch"],
  ["n-indexation-2027", "n-v3-indexation", "RELATES_TO", "The missing numbers"],
  ["n-api-oauth", "n-api-rate-limit", "UPDATES", "New auth for the same API"],
  ["n-api-oauth", "n-v3-launch", "RELATES_TO", "Ships before v3"],
  [
    "n-wise-search",
    "n-wise-facts",
    "RELATES_TO",
    "How the fact graph is searched",
  ],
  ["n-wise-demo", "n-wise-facts", "RELATES_TO", "Demo of the concept"],
  ["n-pitch-metric", "n-wise-facts", "RELATES_TO", "How we pitch it"],
  ["n-gdpr-retention", "n-wise-facts", "RELATES_TO", "Only facts are kept"],
  [
    "n-salary-victor",
    "n-car-policy",
    "RELATES_TO",
    "Both part of the 2027 package",
  ],
  ["n-car-policy", "n-remote-policy", "RELATES_TO", "HR policies"],
  ["n-buddy", "n-remote-policy", "RELATES_TO", "HR policies"],
  [
    "n-payslip-bug",
    "n-holiday-tickets",
    "RELATES_TO",
    "Support ticket drivers",
  ],
  [
    "n-holiday-rule",
    "n-holiday-tickets",
    "RELATES_TO",
    "Rule behind the tickets",
  ],
  [
    "n-holiday-rule",
    "n-indexation-2027",
    "RELATES_TO",
    "Both payroll legal rules",
  ],
  ["n-launch-video", "n-v3-launch", "DEPENDS_ON", "Video launches with v3"],
  [
    "n-hrtech-booth",
    "n-launch-video",
    "RELATES_TO",
    "Teaser shown at the booth",
  ],
  ["n-pitch-metric", "n-launch-video", "RELATES_TO", "Same storyline"],
  ["n-llm-vendors", "n-ai-budget", "DEPENDS_ON", "Paid from the AI budget"],
  ["n-llm-vendors", "n-wise-search", "RELATES_TO", "Model used for search"],
  ["n-ai-budget", "n-kras-pricing", "RELATES_TO", "Finance owns both"],
  ["n-payslip-bug", "n-v3-launch", "RELATES_TO", "Fixed before v3"],
  [
    "n-year-end-run",
    "n-cutoff-december",
    "DEPENDS_ON",
    "Runs after the cut-off",
  ],
  [
    "n-cutoff-december",
    "n-indexation-2027",
    "RELATES_TO",
    "Late changes land with the new indexation",
  ],
  [
    "n-cutoff-december",
    "n-payroll-sla",
    "RELATES_TO",
    "SLA counts from cut-off",
  ],
  [
    "n-payroll-sla",
    "n-payslip-bug",
    "RELATES_TO",
    "Both about payslip delivery",
  ],
  [
    "n-deploy-freeze",
    "n-year-end-run",
    "RELATES_TO",
    "Keeps the platform stable for the run",
  ],
  ["n-deploy-freeze", "n-api-oauth", "DEPENDS_ON", "OAuth ships before it"],
  ["n-engine-capacity", "n-year-end-run", "RELATES_TO", "Capacity for the run"],
  ["n-engine-capacity", "n-deploy-freeze", "RELATES_TO", "Same holiday window"],
];

export const edges: KnowledgeEdge[] = edgeSeeds.map(
  ([sourceId, targetId, kind, description], i) => ({
    id: `e-${i + 1}`,
    sourceId,
    targetId,
    kind,
    description,
  }),
);
