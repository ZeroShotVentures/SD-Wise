import { growBrain } from "./mock-brain";
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
];

const coreNodes: KnowledgeNode[] = nodeSeeds.map((n) => ({
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
];

const coreEdges: KnowledgeEdge[] = edgeSeeds.map(
  ([sourceId, targetId, kind, description], i) => ({
    id: `e-${i + 1}`,
    sourceId,
    targetId,
    kind,
    description,
  }),
);

// The hand-written facts above plus ~10k generated ones, so the graph looks
// like a real company brain. UI mock only, nothing here touches the database.
const brain = growBrain(coreNodes, coreEdges, 10_000);
export const nodes: KnowledgeNode[] = brain.nodes;
export const edges: KnowledgeEdge[] = brain.edges;
