import type {
  EdgeKind,
  KnowledgeEdge,
  KnowledgeNode,
  KnowledgeSource,
  Visibility,
} from "./types";

// Generates the bulk of the mock company brain: thousands of facts about
// SD Worx customers, payroll legislation, engineering, operations, support,
// HR, finance and marketing, grouped in clusters and laid out up front.
// Deterministic (seeded), so every server instance gets the same graph.
// Owners are always the demo people, so asking and access requests work on
// every node.

let seed = 20260930;
function rand() {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const int = (min: number, max: number) =>
  min + Math.floor(rand() * (max - min + 1));
const pick = <T>(list: readonly T[]): T =>
  list[Math.floor(rand() * list.length)] as T;
const chance = (p: number) => rand() < p;
const fmt = (n: number) => n.toLocaleString("en-US");
const eur = (n: number) => `€${n.toFixed(2)}`;

function sample<T>(list: readonly T[], count: number) {
  const copy = [...list];
  const out: T[] = [];
  while (out.length < count && copy.length) {
    out.push(copy.splice(Math.floor(rand() * copy.length), 1)[0] as T);
  }
  return out;
}

// Recent facts are more common than old ones.
function date() {
  const end = Date.UTC(2026, 8, 30);
  const days = Math.floor(rand() ** 1.6 * 540);
  return new Date(end - days * 86_400_000).toISOString().slice(0, 10);
}

const MONTHS = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");
const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];

// Owner pools per domain, from the demo cast.
const POOLS = {
  sales: ["p-bram", "p-lotte", "p-dario", "p-pieter"],
  legal: ["p-an", "p-sofie", "p-filip"],
  eng: ["p-victor", "p-kobe", "p-julien"],
  product: ["p-dario", "p-victor", "p-kobe", "p-julien", "p-timon"],
  ops: ["p-filip", "p-pieter", "p-an"],
  support: ["p-pieter", "p-victor", "p-filip"],
  hr: ["p-sofie", "p-lotte", "p-an"],
  finance: ["p-lotte", "p-kobe", "p-dario"],
  marketing: ["p-timon", "p-dario", "p-bram"],
  security: ["p-kobe", "p-sofie", "p-victor"],
} as const;
type Pool = keyof typeof POOLS;

const FIRST = {
  "p-dario": "Dario",
  "p-victor": "Victor",
  "p-julien": "Julien",
  "p-timon": "Timon",
  "p-sofie": "Sofie",
  "p-bram": "Bram",
  "p-lotte": "Lotte",
  "p-pieter": "Pieter",
  "p-an": "An",
  "p-kobe": "Kobe",
  "p-filip": "Filip",
} as Record<string, string>;

const CHANNELS: Record<Pool, string[]> = {
  sales: ["#sales-benelux", "#sales-dach", "#deal-desk", "#renewals"],
  legal: ["#payroll-legal", "#legislation-watch", "#social-law"],
  eng: ["#platform", "#payroll-engine", "#incidents", "#releases"],
  product: ["#product", "#roadmap", "#design-reviews"],
  ops: ["#payroll-ops", "#run-control", "#ops-benelux"],
  support: ["#support-escalations", "#support-l2", "#known-issues"],
  hr: ["#people", "#hiring", "#announcements"],
  finance: ["#finance", "#fp-and-a", "#procurement"],
  marketing: ["#marketing", "#events", "#content"],
  security: ["#security", "#compliance", "#gdpr"],
};

type Fact = {
  title: string;
  summary: string;
  quote: string;
  source?: KnowledgeSource;
  from?: string;
  pool: Pool;
  public?: number; // chance of being public
  edge?: [EdgeKind, string]; // link to the cluster hub
};

type Cluster = { key: string; family: string; ids: string[] };

const nodes: KnowledgeNode[] = [];
const edges: KnowledgeEdge[] = [];
const clusters: Cluster[] = [];
const hubs = new Map<string, string>();
let nodeCount = 0;
let budget = 0;

function addEdge(
  sourceId: string,
  targetId: string,
  kind: EdgeKind,
  description: string,
) {
  if (sourceId === targetId) return;
  edges.push({
    id: `g-e${edges.length + 1}`,
    sourceId,
    targetId,
    kind,
    description,
  });
}

function addFact(group: Cluster, fact: Fact) {
  if (nodeCount >= budget) return null;
  const pool = POOLS[fact.pool];
  const owners = sample(pool, chance(0.55) ? 1 : chance(0.7) ? 2 : 3);
  const source: KnowledgeSource =
    fact.source ?? pick(["MESSAGE", "MESSAGE", "MEETING", "EMAIL"] as const);
  const integrationId =
    source === "MEETING"
      ? "i-teams-meetings"
      : source === "EMAIL"
        ? "i-outlook"
        : pick(["i-slack", "i-slack", "i-teams"]);
  const from =
    fact.from ??
    (source === "MEETING"
      ? `Meeting: ${fact.title}`
      : source === "EMAIL"
        ? `Email: ${fact.title}`
        : pick(CHANNELS[fact.pool]));
  const visibility: Visibility = chance(fact.public ?? 0.4)
    ? "PUBLIC"
    : "PRIVATE";
  const speaker = FIRST[owners[0] as string];
  const id = `g-${++nodeCount}`;
  nodes.push({
    id,
    title: fact.title,
    content: `${speaker}: ${fact.quote}`,
    contentSummary: fact.summary,
    source,
    integrationId,
    sourceDescription: from,
    visibility,
    ownerIds: owners,
    accessIds: [...owners],
    createdAt: date(),
  });
  const hub = group.ids[0];
  group.ids.push(id);
  if (hub) {
    const [kind, description] = fact.edge ?? ["RELATES_TO", "Same topic"];
    addEdge(id, hub, kind, description);
    // A few links between siblings make clusters look like webs, not stars.
    const sibling = group.ids[int(1, group.ids.length - 1)];
    if (sibling && sibling !== id && chance(0.3)) {
      addEdge(id, sibling, "RELATES_TO", "Came up together");
    }
  }
  return id;
}

function cluster(family: string, key: string, facts: Fact[]) {
  if (nodeCount >= budget) return;
  const c: Cluster = { key, family, ids: [] };
  clusters.push(c);
  for (const fact of facts) addFact(c, fact);
  if (c.ids[0]) hubs.set(key, c.ids[0]);
}

function link(from: string, to: string, kind: EdgeKind, description: string) {
  const a = hubs.get(from);
  const b = hubs.get(to);
  if (a && b) addEdge(a, b, kind, description);
}

// ── Reference data ────────────────────────────────────────────────────────

const COUNTRIES = [
  { code: "BE", name: "Belgium", tax: "SPF Finances", ss: "RSZ/ONSS" },
  { code: "NL", name: "Netherlands", tax: "Belastingdienst", ss: "UWV" },
  { code: "LU", name: "Luxembourg", tax: "ACD", ss: "CCSS" },
  { code: "FR", name: "France", tax: "DGFiP", ss: "URSSAF" },
  { code: "DE", name: "Germany", tax: "Finanzamt", ss: "DRV" },
  { code: "UK", name: "United Kingdom", tax: "HMRC", ss: "HMRC NIC" },
  { code: "IE", name: "Ireland", tax: "Revenue", ss: "PRSI" },
  { code: "AT", name: "Austria", tax: "BMF", ss: "ÖGK" },
  { code: "CH", name: "Switzerland", tax: "ESTV", ss: "AHV" },
  { code: "ES", name: "Spain", tax: "AEAT", ss: "TGSS" },
  { code: "IT", name: "Italy", tax: "Agenzia Entrate", ss: "INPS" },
  { code: "PL", name: "Poland", tax: "KAS", ss: "ZUS" },
  { code: "PT", name: "Portugal", tax: "AT", ss: "Segurança Social" },
  { code: "SE", name: "Sweden", tax: "Skatteverket", ss: "Försäkringskassan" },
];

const SECTORS = [
  { word: "Logistics", pc: "140", label: "transport and logistics" },
  { word: "Retail", pc: "311", label: "retail" },
  { word: "Bouw", pc: "124", label: "construction" },
  { word: "Foods", pc: "118", label: "food industry" },
  { word: "Zorg", pc: "330", label: "healthcare" },
  { word: "Chemicals", pc: "116", label: "chemicals" },
  { word: "Metaal", pc: "111", label: "metalworking" },
  { word: "Hotels", pc: "302", label: "hospitality" },
  { word: "Bank", pc: "310", label: "banking" },
  { word: "Tech", pc: "200", label: "IT services" },
  { word: "Cleaning", pc: "121", label: "cleaning" },
  { word: "Interim", pc: "322", label: "temporary work" },
  { word: "Energy", pc: "326", label: "energy" },
  { word: "Pharma", pc: "207", label: "pharma" },
];

const PREFIXES = [
  "Aldera",
  "Brouwer",
  "Castel",
  "Dijle",
  "Everaert",
  "Flandria",
  "Geldof",
  "Havenpoort",
  "Ijzerman",
  "Jansens",
  "Kempen",
  "Leiedal",
  "Maasland",
  "Nerva",
  "Oosterweel",
  "Polder",
  "Quintel",
  "Rupel",
  "Schelde",
  "Tervuren",
  "Uyttenhove",
  "Vesalius",
  "Waasland",
  "Yserdal",
  "Zenne",
  "Arden",
  "Belfort",
  "Coppens",
  "Demer",
  "Eburon",
  "Mercator",
  "Noorderlicht",
  "Orion",
  "Peerdeman",
  "Rombouts",
  "Sint-Pieters",
  "Vandeputte",
  "Wouters",
  "Brabo",
  "Campina",
  "Duinhof",
  "Emmaus",
  "Gentse",
  "Hageland",
  "Lanaken",
  "Meerhout",
  "Nethe",
  "Ostara",
  "Pajot",
  "Roeland",
  "Scaldis",
  "Tienen",
  "Verhaeghe",
  "Westhoek",
  "Zilverberg",
  "Atrium",
  "Borluut",
  "Callebert",
  "Dewaele",
  "Elsinore",
  "Frisia",
  "Gaverland",
  "Heylen",
  "Kapelle",
] as const;

const PRODUCTS = [
  "Time & Attendance",
  "HR Analytics",
  "Workforce Planning",
  "Employee app",
  "Absence Manager",
  "Salary Simulator",
  "Benefits Portal",
  "Expense Claims",
  "Learning Hub",
  "Recruitment Suite",
];

const ERPS = ["SAP S/4HANA", "Exact Online", "Odoo", "Workday", "Dynamics 365"];
const CONTACTS = [
  "Katrien Wouters",
  "Jeroen Van Damme",
  "Els Verbeke",
  "Tom Hermans",
  "Nathalie Dubois",
  "Pieter-Jan Goossens",
  "Hanne Lemmens",
  "Marc Lambert",
  "Sarah El Amrani",
  "Koen Vermeulen",
  "Inge Willems",
  "Joris Desmet",
  "Evelien Martens",
  "Bart Claeys",
  "Laura Moreau",
  "Stijn Pauwels",
];
const ROLES = ["HR director", "payroll manager", "CFO", "HRIS lead", "COO"];

// ── Families ──────────────────────────────────────────────────────────────

function legislation() {
  for (const c of COUNTRIES) {
    const wage = int(1300, 2600);
    const rate = (int(80, 160) / 10).toFixed(1);
    cluster("legal", `country-${c.code}`, [
      {
        title: `Payroll in ${c.name}`,
        summary: `SD Worx runs payroll in ${c.name} for ${fmt(int(40, 900))} clients, reporting to ${c.tax} and ${c.ss}.`,
        quote: `${c.name} is ${int(3, 18)}% of our payslip volume. Filings go to ${c.tax} for tax and ${c.ss} for social security.`,
        pool: "legal",
        public: 0.9,
      },
      {
        title: `Minimum wage ${c.code} 2027`,
        summary: `The ${c.name} minimum wage goes to €${fmt(wage)} gross per month from January 2027.`,
        quote: `confirmed the new minimum of €${fmt(wage)} a month in ${c.name}, effective 1 January 2027. Engine tables need updating by mid-December.`,
        pool: "legal",
        edge: ["UPDATES", "New legal value"],
      },
      {
        title: `Employer contributions ${c.code}`,
        summary: `Employer social security in ${c.name} is ${int(12, 32)}.${int(0, 9)}% of gross pay for 2026.`,
        quote: `${c.ss} published the 2026 rates. Nothing changes for apprentices, the ceiling moves up ${rate}%.`,
        pool: "legal",
      },
      {
        title: `Tax brackets ${c.code} 2027`,
        summary: `${c.tax} indexes the ${c.name} withholding tax brackets by ${rate}% for 2027.`,
        quote: `bracket tables for ${c.name} are indexed by ${rate}%. Draft tables arrive in November, final ones usually just before Christmas.`,
        pool: "legal",
        source: "EMAIL",
      },
      {
        title: `Holiday allowance ${c.code}`,
        summary: `In ${c.name} the holiday allowance is paid in ${pick(MONTHS)} and equals ${int(4, 9)}% of annual gross pay.`,
        quote: `holiday allowance in ${c.name} is ${int(4, 9)}% of the yearly gross, most clients pay it in one go.`,
        pool: "legal",
      },
      {
        title: `Sick pay rules ${c.code}`,
        summary: `Employers in ${c.name} pay guaranteed salary for the first ${int(1, 6)} weeks of illness.`,
        quote: `guaranteed salary period in ${c.name} is ${int(1, 6)} weeks, after that ${c.ss} takes over.`,
        pool: "legal",
      },
      {
        title: `Telework allowance ${c.code}`,
        summary: `The tax-free telework allowance in ${c.name} is capped at €${int(30, 160)}.${int(10, 99)} a month.`,
        quote: `new cap for home-working allowance in ${c.name} applies from ${pick(MONTHS)}. Clients using the flat amount need no action.`,
        pool: "legal",
      },
      {
        title: `Filing calendar ${c.code}`,
        summary: `Monthly payroll declarations in ${c.name} are due on day ${int(5, 20)} of the following month.`,
        quote: `${c.tax} deadline is the ${int(5, 20)}th. Late filings cost clients €${int(50, 500)} per declaration.`,
        pool: "ops",
        edge: ["DEPENDS_ON", "Operations follow the legal deadline"],
      },
      {
        title: `Pension contributions ${c.code}`,
        summary: `Mandatory pension contributions in ${c.name} rise to ${int(2, 12)}% of gross salary.`,
        quote: `pension rate change in ${c.name} was voted last week, we'll ship it in the next legislation release.`,
        pool: "legal",
      },
      {
        title: `Parental leave ${c.code}`,
        summary: `${c.name} extends paid parental leave to ${int(10, 26)} weeks for births from 2027.`,
        quote: `parental leave in ${c.name} goes to ${int(10, 26)} weeks. Absence codes need a new type.`,
        pool: "legal",
      },
      {
        title: `E-payslip rules ${c.code}`,
        summary: `In ${c.name} electronic payslips are allowed ${pick(["by default", "with employee consent", "only with a works council agreement"])}.`,
        quote: `checked with our local partner: digital payslips in ${c.name} are fine ${pick(["by default", "with consent"])}.`,
        pool: "legal",
      },
      {
        title: `Year-end bonus ${c.code}`,
        summary: `${int(40, 95)}% of our ${c.name} clients pay a 13th month or year-end bonus in December.`,
        quote: `most ${c.name} clients pay the 13th month with the last run of the year.`,
        pool: "ops",
      },
    ]);
  }
  // Belgian joint committees.
  for (const s of SECTORS) {
    cluster("legal", `pc-${s.pc}`, [
      {
        title: `Joint committee ${s.pc}`,
        summary: `PC ${s.pc} covers ${s.label}; wages are indexed ${pick(["every January", "every July", "twice a year"])}.`,
        quote: `PC ${s.pc} (${s.label}) has its own wage scales and indexation moment, check the sector CAO before every run.`,
        pool: "legal",
        public: 0.9,
      },
      {
        title: `PC ${s.pc} wage scales 2027`,
        summary: `New wage scales for PC ${s.pc} add ${(int(10, 35) / 10).toFixed(1)}% from 2027.`,
        quote: `sector agreement for ${s.label} was signed, scales go up ${(int(10, 35) / 10).toFixed(1)}%.`,
        pool: "legal",
        edge: ["UPDATES", "New scales"],
      },
      {
        title: `PC ${s.pc} end-of-year premium`,
        summary: `The PC ${s.pc} end-of-year premium is paid via the sector fund in ${pick(["December", "January"])}.`,
        quote: `for PC ${s.pc} the sector fund pays the premium, we only report the days worked.`,
        pool: "ops",
      },
      {
        title: `PC ${s.pc} eco-vouchers`,
        summary: `Workers in PC ${s.pc} get €${int(100, 250)} in eco-vouchers, paid in June.`,
        quote: `eco-vouchers in ${s.label}: €${int(100, 250)}, pro rata for part-timers.`,
        pool: "legal",
      },
    ]);
  }
}

const SERVICES = [
  "payslip-renderer",
  "tax-engine-be",
  "tax-engine-nl",
  "tax-engine-fr",
  "tax-engine-de",
  "dimona-gateway",
  "dmfa-reporter",
  "sepa-payments",
  "time-sync",
  "absence-service",
  "identity",
  "notification-hub",
  "document-vault",
  "reporting-warehouse",
  "benefits-engine",
  "pension-connector",
  "erp-connector",
  "employee-app-bff",
  "search-index",
  "audit-log",
  "billing",
  "contract-service",
  "org-chart",
  "gross-to-net",
  "retro-calculator",
  "bank-file-exporter",
  "salary-simulator",
  "hr-analytics",
  "workforce-planner",
  "expense-service",
  "learning-hub",
  "recruiting-api",
  "feature-flags",
  "event-bus",
  "public-api-gateway",
  "sso-bridge",
  "legislation-tables",
  "run-scheduler",
  "data-migrator",
  "ai-assistant",
];

function engineering() {
  for (const svc of SERVICES) {
    const p95 = int(80, 900);
    const cost = int(2, 40);
    const facts: Fact[] = [
      {
        title: `Service ${svc}`,
        summary: `${svc} is owned by the ${pick(["Core Payroll", "Platform", "Data", "Employee Experience", "Integrations"])} team and runs on ${pick(["Kubernetes", "Azure App Service", "AWS ECS"])}.`,
        quote: `${svc} handles ${fmt(int(20, 900))}k requests a day. Runbook is in the wiki, on-call via PagerDuty.`,
        pool: "eng",
        public: 0.8,
      },
      {
        title: `${svc} latency SLO`,
        summary: `${svc} targets p95 latency under ${p95} ms; it is at ${int(60, 99)}% of its error budget.`,
        quote: `p95 is at ${Math.round(p95 * 0.8)} ms after the cache change, well within the ${p95} ms objective.`,
        pool: "eng",
      },
      {
        title: `${svc} incident ${pick(MONTHS)}`,
        summary: `${svc} had a ${int(8, 140)}-minute ${pick(["outage", "degradation", "partial outage"])} caused by ${pick(["a bad config push", "database connection exhaustion", "an expired certificate", "a memory leak", "a noisy neighbour on the cluster", "a failed migration"])}.`,
        quote: `postmortem for ${svc} is written. Root cause fixed, two follow-up actions assigned.`,
        pool: "eng",
        source: "MEETING",
        from: `Meeting: Postmortem ${svc}`,
        edge: ["RELATES_TO", "Incident on this service"],
      },
      {
        title: `${svc} release ${int(2, 9)}.${int(0, 30)}`,
        summary: `The latest ${svc} release ships ${pick(["faster batch processing", "new legislation tables", "a rewritten retry queue", "better audit logging", "multi-country support", "streaming exports"])}.`,
        quote: `${svc} release is out, canary looked clean for 24 hours.`,
        pool: "eng",
        public: 0.7,
      },
      {
        title: `${svc} cloud cost`,
        summary: `${svc} costs about €${cost}k a month in cloud spend; ${int(10, 40)}% savings identified.`,
        quote: `rightsizing ${svc} should save ~€${Math.round(cost * 0.25)}k a month. Needs a load test first.`,
        pool: "finance",
      },
      {
        title: `${svc} tech debt`,
        summary: `${svc} still depends on ${pick(["Java 11", "Node 18", ".NET 6", "an unsupported ORM", "the legacy SOAP bridge", "a shared database"])}; the upgrade is planned for ${pick(QUARTERS)} 2027.`,
        quote: `we keep patching ${svc} around the old dependency. Upgrade is on the ${pick(QUARTERS)} plan.`,
        pool: "eng",
      },
      {
        title: `${svc} load test`,
        summary: `Load tests show ${svc} handles ${int(2, 12)}× year-end peak volume.`,
        quote: `load test for the year-end peak passed at ${int(2, 12)}× normal volume.`,
        pool: "eng",
      },
      {
        title: `${svc} security finding`,
        summary: `The pentest flagged a ${pick(["medium", "low", "high"])} finding in ${svc}; fix due in ${int(2, 8)} weeks.`,
        quote: `pentest report is in. ${svc} has one finding, ticket is open.`,
        pool: "security",
        public: 0.1,
      },
    ];
    cluster("eng", `svc-${svc}`, sample(facts, int(6, facts.length)));
  }
  for (let i = 0; i < SERVICES.length; i++) {
    const a = SERVICES[i] as string;
    link(
      `svc-${a}`,
      `svc-${pick(SERVICES)}`,
      "DEPENDS_ON",
      "Calls this service",
    );
    if (chance(0.5)) {
      link(
        `svc-${a}`,
        `svc-${pick(SERVICES)}`,
        "DEPENDS_ON",
        "Calls this service",
      );
    }
  }
  for (const c of COUNTRIES) {
    const engine = `svc-tax-engine-${c.code.toLowerCase()}`;
    link(
      `country-${c.code}`,
      hubs.has(engine) ? engine : "svc-gross-to-net",
      "RELATES_TO",
      "Implemented in the engine",
    );
  }
}

function initiatives() {
  for (const product of PRODUCTS) {
    const beta = int(3, 15);
    cluster("product", `product-${product}`, [
      {
        title: product,
        summary: `${product} is used by ${fmt(int(150, 2400))} clients and ${fmt(int(20, 900))}k employees.`,
        quote: `${product} grew ${int(5, 60)}% this year. Biggest adoption is in ${pick(COUNTRIES).name}.`,
        pool: "product",
        public: 0.9,
      },
      {
        title: `${product} roadmap 2027`,
        summary: `The 2027 roadmap for ${product} focuses on ${pick(["AI-assisted insights", "mobile-first flows", "multi-country rollout", "self-service onboarding", "real-time data", "accessibility"])}.`,
        quote: `we agreed the ${product} themes for 2027. Top three are locked, the rest is up for discussion.`,
        pool: "product",
        source: "MEETING",
      },
      {
        title: `${product} beta`,
        summary: `${beta} clients are in the ${product} beta; feedback is ${pick(["very positive", "mixed", "positive on speed, negative on setup"])}.`,
        quote: `beta group for ${product} is at ${beta} clients. Weekly feedback call on Thursdays.`,
        pool: "product",
      },
      {
        title: `${product} pricing`,
        summary: `${product} list price is €${(int(40, 300) / 100).toFixed(2)} per employee per month.`,
        quote: `new ${product} price book goes live in ${pick(MONTHS)}. Existing contracts keep their price until renewal.`,
        pool: "sales",
        source: "EMAIL",
        public: 0.2,
      },
      {
        title: `${product} user research`,
        summary: `Research with ${int(8, 40)} HR admins shows ${pick(["setup takes too long", "reports are hard to find", "mobile use is growing fast", "exports matter more than dashboards"])}.`,
        quote: `interviews are done, synthesis is on the Miro board.`,
        pool: "product",
        source: "MEETING",
      },
      {
        title: `${product} adoption target`,
        summary: `The target is ${int(20, 70)}% of payroll clients using ${product} by end of 2027.`,
        quote: `adoption target for ${product} is set, marketing gets the numbers monthly.`,
        pool: "product",
      },
      {
        title: `${product} design review`,
        summary: `The ${product} design review approved ${pick(["the new navigation", "dark mode", "the onboarding wizard", "bulk actions", "the approval flow"])}.`,
        quote: `design review went well, two small changes before handoff.`,
        pool: "product",
        source: "MEETING",
      },
    ]);
  }
  const projects = [
    "Multi-country payroll",
    "Legacy platform sunset",
    "Data residency EU",
    "Payslip redesign",
    "AI payroll assistant",
    "Real-time gross-to-net",
    "Client onboarding in 30 days",
    "Unified employee ID",
    "Zero-touch filing",
    "Payroll anomaly detection",
    "Accessibility WCAG 2.2",
    "Mobile payslips",
    "Partner marketplace",
    "Carbon reporting",
    "Self-service corrections",
    "Retro calculation rewrite",
    "Open banking payouts",
    "Nordic expansion",
  ];
  for (const project of projects) {
    const facts: Fact[] = [
      {
        title: `Project: ${project}`,
        summary: `${project} is a ${pick(["2026", "2027", "2026–2027"])} programme with ${int(4, 40)} people and a budget of €${int(200, 4000)}k.`,
        quote: `${project} kicked off. Steering committee meets every other Monday.`,
        pool: "product",
        public: 0.7,
      },
      {
        title: `${project} milestone`,
        summary: `${project} reached ${pick(["design sign-off", "the first pilot client", "feature complete", "security approval", "the go/no-go gate"])} on schedule.`,
        quote: `milestone made, next gate is in ${int(4, 12)} weeks.`,
        pool: "product",
        edge: ["UPDATES", "Progress update"],
      },
      {
        title: `${project} risk`,
        summary: `Main risk for ${project}: ${pick(["staffing in the data team", "dependency on the legislation tables", "vendor contract delays", "client data quality", "scope creep"])}.`,
        quote: `this risk is now red on the dashboard, mitigation plan by Friday.`,
        pool: "product",
        source: "MEETING",
        public: 0.2,
      },
      {
        title: `${project} decision`,
        summary: `Steering decided to ${pick(["build in-house", "buy a vendor component", "phase the rollout by country", "start with Belgium only", "delay by one quarter"])} for ${project}.`,
        quote: `decision is taken, I'll send the minutes today.`,
        pool: "product",
        source: "MEETING",
        edge: ["UPDATES", "Steering decision"],
      },
      {
        title: `${project} staffing`,
        summary: `${project} needs ${int(1, 6)} more engineers in ${pick(QUARTERS)}.`,
        quote: `we can't hit the date without extra people, requesting budget.`,
        pool: "finance",
        public: 0.2,
      },
    ];
    cluster("product", `project-${project}`, facts);
    link(
      `project-${project}`,
      `svc-${pick(SERVICES)}`,
      "DEPENDS_ON",
      "Built on this service",
    );
    link(
      `project-${project}`,
      `product-${pick(PRODUCTS)}`,
      "RELATES_TO",
      "Part of this product",
    );
  }
}

function operations() {
  const countries = COUNTRIES.slice(0, 10);
  for (const c of countries) {
    const facts: Fact[] = MONTHS.slice(0, 9).map((m, i) => ({
      title: `${c.code} run ${m} 2026`,
      summary: `The ${m} run in ${c.name} produced ${fmt(int(20, 900) * 1000)} payslips with ${int(0, 40)} late corrections.`,
      quote: `${m} run for ${c.code} closed ${pick(["on time", "on time", "half a day late", "a day early"])}. ${int(0, 12)} clients sent changes after the deadline.`,
      pool: "ops",
      source: i % 3 === 0 ? "MEETING" : "MESSAGE",
      edge: ["UPDATES", "Monthly run"],
    }));
    cluster("ops", `ops-${c.code}`, [
      {
        title: `Payroll operations ${c.name}`,
        summary: `${int(8, 80)} payroll consultants run ${c.name} out of ${pick(["Antwerp", "Leuven", "Utrecht", "Paris", "Munich", "Dublin", "Lisbon", "Kraków"])}.`,
        quote: `${c.name} ops team is fully staffed for the year-end peak.`,
        pool: "ops",
        public: 0.9,
      },
      ...facts,
      {
        title: `${c.code} year-end staffing`,
        summary: `${c.name} ops adds ${int(2, 15)} temporary consultants for the year-end peak.`,
        quote: `temps start in November, training is booked.`,
        pool: "ops",
      },
      {
        title: `${c.code} quality score`,
        summary: `First-time-right in ${c.name} is ${(int(960, 998) / 10).toFixed(1)}% this quarter.`,
        quote: `quality score is up again, most errors were late absence data.`,
        pool: "ops",
      },
    ]);
    link(
      `ops-${c.code}`,
      `country-${c.code}`,
      "DEPENDS_ON",
      "Runs under local law",
    );
    link(
      `ops-${c.code}`,
      "svc-run-scheduler",
      "DEPENDS_ON",
      "Scheduled by the run scheduler",
    );
  }
}

const TICKET_THEMES = [
  "password resets",
  "payslip corrections",
  "absence registration",
  "tax certificate downloads",
  "bank file rejections",
  "employee app login",
  "overtime calculation",
  "meal voucher orders",
  "company car benefit",
  "salary advance requests",
  "retroactive pay",
  "sick leave certificates",
  "report exports",
  "new hire onboarding",
  "leaver final pay",
  "part-time recalculation",
  "commuting allowance",
  "year-end certificates",
  "SSO configuration",
  "API errors",
  "invoice questions",
  "contract amendments",
  "time credit",
  "student workers",
];

function support() {
  for (const theme of TICKET_THEMES) {
    const share = int(1, 12);
    cluster("support", `ticket-${theme}`, [
      {
        title: `Tickets: ${theme}`,
        summary: `${theme[0]?.toUpperCase()}${theme.slice(1)} make up ${share}% of support tickets, ${fmt(int(80, 1800))} this quarter.`,
        quote: `${theme} is ${share}% of volume. Median time to resolve is ${int(2, 48)} hours.`,
        pool: "support",
        public: 0.8,
      },
      {
        title: `Macro for ${theme}`,
        summary: `A new support macro for ${theme} cuts handling time by ${int(10, 50)}%.`,
        quote: `macro is live in Zendesk, please use it for every ${theme} ticket.`,
        pool: "support",
        public: 0.8,
      },
      {
        title: `KB article: ${theme}`,
        summary: `The help-centre article on ${theme} was viewed ${fmt(int(500, 30000))} times last month.`,
        quote: `the article deflects about ${int(10, 40)}% of tickets on this topic.`,
        pool: "support",
        public: 0.9,
      },
      {
        title: `CSAT on ${theme}`,
        summary: `Customer satisfaction on ${theme} tickets is ${(int(35, 49) / 10).toFixed(1)}/5.`,
        quote: `CSAT on this category dropped a bit, mostly because of wait times.`,
        pool: "support",
      },
      {
        title: `Known issue: ${theme}`,
        summary: `A known issue affects ${theme} for some clients; fix planned in the next release.`,
        quote: `engineering confirmed the bug, workaround is in the macro.`,
        pool: "support",
        edge: ["RELATES_TO", "Known issue behind tickets"],
      },
    ]);
    link(
      `ticket-${theme}`,
      `svc-${pick(SERVICES)}`,
      "RELATES_TO",
      "Tickets about this service",
    );
  }
}

const OFFICES = [
  "Antwerp HQ",
  "Brussels",
  "Ghent",
  "Leuven",
  "Hasselt",
  "Kortrijk",
  "Utrecht",
  "Rotterdam",
  "Paris",
  "Lyon",
  "Munich",
  "Dublin",
  "London",
  "Luxembourg",
  "Lisbon",
  "Kraków",
];
const TEAMS = [
  "Core Payroll",
  "Platform",
  "Data",
  "Employee Experience",
  "Integrations",
  "Support Benelux",
  "Payroll Ops BE",
  "Sales Benelux",
  "Legal Desk",
  "Finance",
  "Marketing",
  "People",
  "Security",
];

function people() {
  for (const office of OFFICES) {
    cluster("hr", `office-${office}`, [
      {
        title: `Office ${office}`,
        summary: `The ${office} office has ${int(30, 900)} people and ${int(40, 95)}% average occupancy on team days.`,
        quote: `${office} is busiest on Tuesday and Thursday.`,
        pool: "hr",
        public: 0.95,
      },
      {
        title: `${office} parking`,
        summary: `${office} has ${int(20, 300)} parking spots, ${int(10, 80)} with EV chargers.`,
        quote: `more chargers arrive in ${pick(MONTHS)}.`,
        pool: "hr",
        public: 0.9,
      },
      {
        title: `${office} team event`,
        summary: `The ${office} team event is on ${int(1, 28)} ${pick(MONTHS)}, budget €${int(40, 120)} per person.`,
        quote: `venue is booked, invites go out next week.`,
        pool: "hr",
        public: 0.9,
      },
    ]);
  }
  for (const team of TEAMS) {
    const open = int(1, 9);
    cluster("hr", `team-${team}`, [
      {
        title: `Team ${team}`,
        summary: `${team} has ${int(6, 60)} people and ${open} open positions.`,
        quote: `${team} is growing, ${open} vacancies approved for this year.`,
        pool: "hr",
        public: 0.9,
      },
      {
        title: `${team} hiring`,
        summary: `${team} is hiring ${open} people; average time to hire is ${int(25, 70)} days.`,
        quote: `pipeline for ${team} is healthy, two offers out.`,
        pool: "hr",
        public: 0.6,
      },
      {
        title: `${team} engagement`,
        summary: `${team} scored ${int(62, 91)} in the engagement survey.`,
        quote: `engagement results are in, workload is the main theme.`,
        pool: "hr",
        public: 0.1,
      },
      {
        title: `${team} training budget`,
        summary: `${team} has €${fmt(int(8, 90) * 1000)} for training in 2027.`,
        quote: `training budget is approved, conferences need sign-off.`,
        pool: "finance",
        public: 0.3,
      },
      {
        title: `${team} offsite`,
        summary: `${team} offsite in ${pick(["Ghent", "Durbuy", "Maastricht", "Lille", "Bruges"])} on ${int(1, 28)} ${pick(MONTHS)}.`,
        quote: `offsite agenda is on the drive, add your topics.`,
        pool: "hr",
        public: 0.7,
      },
    ]);
    if (team.startsWith("Support"))
      link(
        `team-${team}`,
        `ticket-${pick(TICKET_THEMES)}`,
        "RELATES_TO",
        "Team handles these",
      );
  }
}

function finance() {
  const depts = [
    "IT",
    "Sales",
    "Marketing",
    "HR",
    "Operations",
    "Support",
    "Legal",
    "Finance",
  ];
  for (const dept of depts) {
    const facts: Fact[] = [];
    for (const year of [2026, 2027]) {
      for (const q of QUARTERS) {
        const plan = int(200, 4000);
        facts.push({
          title: `${dept} spend ${q} ${year}`,
          summary: `${dept} is ${pick(["on budget", `${int(2, 9)}% over budget`, `${int(2, 12)}% under budget`])} in ${q} ${year}, €${fmt(plan)}k planned.`,
          quote: `${q} ${year} numbers for ${dept} are closed. Variance explained in the pack.`,
          pool: "finance",
          public: 0.15,
          edge: ["UPDATES", "Quarterly actuals"],
        });
      }
    }
    cluster("finance", `budget-${dept}`, [
      {
        title: `${dept} budget 2027`,
        summary: `The 2027 ${dept} budget is €${(int(12, 90) / 10).toFixed(1)}M, ${pick(["flat", `+${int(2, 12)}%`, `-${int(2, 8)}%`])} on 2026.`,
        quote: `${dept} budget is submitted, board approval in December.`,
        pool: "finance",
        public: 0.2,
      },
      ...facts,
    ]);
  }
  const vendors = [
    "Zendesk",
    "Atlassian",
    "Salesforce",
    "Microsoft 365",
    "Datadog",
    "Snowflake",
    "PagerDuty",
    "Miro",
    "Figma",
    "Workday",
    "Azure",
    "AWS",
    "Okta",
    "DocuSign",
    "HubSpot",
    "Slack",
    "GitHub",
    "Sentry",
    "Twilio",
    "Coupa",
  ];
  for (const v of vendors) {
    cluster("finance", `vendor-${v}`, [
      {
        title: `${v} contract`,
        summary: `The ${v} contract is €${fmt(int(20, 900))}k a year and renews in ${pick(MONTHS)} ${pick([2026, 2027])}.`,
        quote: `${v} renewal is coming up, procurement wants three quotes.`,
        pool: "finance",
        source: "EMAIL",
        public: 0.2,
      },
      {
        title: `${v} usage`,
        summary: `${int(40, 99)}% of ${v} licences are in use.`,
        quote: `we can drop about ${int(5, 60)} unused seats at renewal.`,
        pool: "finance",
      },
      {
        title: `${v} negotiation`,
        summary: `${v} offered ${int(3, 20)}% off for a ${pick([2, 3])}-year term.`,
        quote: `counter-offer sent, waiting for their answer.`,
        pool: "finance",
        public: 0.1,
      },
    ]);
  }
}

function marketing() {
  const campaigns = [
    "Payroll made human",
    "HR Trends 2027",
    "Future of Work report",
    "Pay transparency directive",
    "Year-end checklist",
    "Employer branding",
    "SME growth",
    "Payroll for scale-ups",
    "Hybrid work index",
    "Wellbeing@Work",
    "Belgian indexation explained",
    "AI in HR",
    "Switch in 30 days",
    "Customer stories",
    "Partner programme",
    "Payslip of the future",
  ];
  for (const c of campaigns) {
    const leads = int(80, 3000);
    cluster("marketing", `campaign-${c}`, [
      {
        title: `Campaign: ${c}`,
        summary: `"${c}" generated ${fmt(leads)} leads and ${int(10, 180)} opportunities.`,
        quote: `"${c}" is our best-performing campaign this quarter.`,
        pool: "marketing",
        public: 0.8,
      },
      {
        title: `${c} webinar`,
        summary: `The "${c}" webinar had ${int(80, 1400)} registrations and ${int(30, 70)}% attendance.`,
        quote: `recording is on the site, follow-up mail goes Tuesday.`,
        pool: "marketing",
        public: 0.8,
      },
      {
        title: `${c} ad spend`,
        summary: `€${fmt(int(5, 120) * 1000)} spent on "${c}" ads, cost per lead €${int(12, 140)}.`,
        quote: `LinkedIn works best for this one, we're pausing display.`,
        pool: "marketing",
        public: 0.2,
      },
      {
        title: `${c} content plan`,
        summary: `"${c}" gets ${int(3, 12)} blog posts and ${int(1, 4)} whitepapers.`,
        quote: `drafts are in review with legal.`,
        pool: "marketing",
      },
    ]);
  }
  const events = [
    "HR Tech Day",
    "Payroll Congress",
    "HR Summit Amsterdam",
    "Unleash Paris",
    "SD Worx Connect",
    "CFO Forum",
    "Future of HR Munich",
    "Web Summit",
  ];
  for (const e of events) {
    cluster("marketing", `event-${e}`, [
      {
        title: `Event: ${e}`,
        summary: `SD Worx attends ${e} with a ${pick(["booth", "keynote", "panel", "booth and keynote"])}; ${int(200, 5000)} visitors expected.`,
        quote: `${e} is confirmed, we need people from sales and product.`,
        pool: "marketing",
        public: 0.9,
      },
      {
        title: `${e} leads`,
        summary: `${int(40, 500)} leads were scanned at ${e}.`,
        quote: `leads are in the CRM, sales follows up within a week.`,
        pool: "marketing",
      },
      {
        title: `${e} budget`,
        summary: `${e} costs €${int(8, 120)}k all-in.`,
        quote: `booth and travel are booked.`,
        pool: "marketing",
        public: 0.2,
      },
    ]);
  }
}

function security() {
  const areas = [
    "ISO 27001",
    "SOC 2 Type II",
    "GDPR DPIA",
    "Pentest 2026",
    "Access reviews",
    "Phishing simulation",
    "Backup restore test",
    "Vendor risk",
    "Data retention",
    "Encryption at rest",
    "Incident response drill",
    "Privileged access",
  ];
  for (const a of areas) {
    cluster("security", `sec-${a}`, [
      {
        title: a,
        summary: `${a}: ${pick(["passed without findings", `${int(1, 6)} minor findings`, "in progress", "scheduled for Q4"])}.`,
        quote: `status update on ${a}, details in the GRC tool.`,
        pool: "security",
        public: 0.6,
      },
      {
        title: `${a} actions`,
        summary: `${int(1, 12)} open actions remain from ${a}, due by ${pick(MONTHS)}.`,
        quote: `owners are assigned, we review weekly.`,
        pool: "security",
        public: 0.1,
      },
      {
        title: `${a} auditor`,
        summary: `${a} is audited by ${pick(["an external auditor", "internal audit", "our certification body"])} in ${pick(MONTHS)}.`,
        quote: `audit dates are fixed, evidence collection starts now.`,
        pool: "security",
      },
    ]);
  }
}

const COMPETITORS = [
  "ADP",
  "Visma",
  "Ceridian",
  "Securex",
  "Acerta",
  "Partena",
  "Workday",
  "Personio",
  "Payfit",
  "Cegid",
  "Lucca",
  "DATEV",
  "Sage",
  "Paycor",
];

function market() {
  for (const rival of COMPETITORS) {
    cluster("market", `rival-${rival}`, [
      {
        title: `Competitor: ${rival}`,
        summary: `${rival} competes with us in ${int(2, 9)} countries and wins about ${int(5, 35)}% of shared deals.`,
        quote: `${rival} keeps showing up in tenders, mostly on price.`,
        pool: "sales",
        public: 0.6,
      },
      {
        title: `${rival} pricing intel`,
        summary: `${rival} quotes ${eur(int(250, 620) / 100)} per payslip for mid-size clients, ${int(5, 25)}% below our list price.`,
        quote: `a prospect shared the ${rival} offer. They discount hard on multi-year deals.`,
        pool: "sales",
        source: "EMAIL",
        public: 0.05,
      },
      {
        title: `${rival} win/loss`,
        summary: `We won ${int(2, 14)} and lost ${int(2, 14)} deals against ${rival} this year; top reason: ${pick(["price", "integrations", "local expertise", "self-service UX", "implementation speed"])}.`,
        quote: `win/loss review on ${rival} is done, slides are on the drive.`,
        pool: "sales",
        source: "MEETING",
        public: 0.2,
      },
      {
        title: `${rival} product launch`,
        summary: `${rival} launched ${pick(["an AI payroll copilot", "instant pay", "a mobile-first employee app", "a free tier", "a marketplace"])} in ${pick(MONTHS)}.`,
        quote: `${rival} announced it at their conference. Product wants a response plan.`,
        pool: "product",
        public: 0.4,
      },
    ]);
  }
  const partners = [
    "Deloitte",
    "KPMG",
    "PwC",
    "EY",
    "Accenture",
    "Capgemini",
    "Sopra Steria",
    "NTT Data",
    "Cronos",
    "Ordina",
    "Nexi",
    "Worldline",
    "Belfius",
    "KBC",
    "ING",
    "BNP Paribas Fortis",
    "Edenred",
    "Sodexo",
    "Ethias",
    "AXA",
  ];
  for (const partner of partners) {
    cluster("market", `partner-${partner}`, [
      {
        title: `Partner: ${partner}`,
        summary: `${partner} refers about ${int(3, 60)} clients a year and resells ${pick(PRODUCTS)}.`,
        quote: `partnership with ${partner} is in year ${int(1, 8)}. QBR next month.`,
        pool: "sales",
        public: 0.7,
      },
      {
        title: `${partner} revenue share`,
        summary: `${partner} earns a ${int(5, 25)}% revenue share on referred contracts.`,
        quote: `commission terms for ${partner} are in the partner agreement.`,
        pool: "finance",
        source: "EMAIL",
        public: 0.05,
      },
      {
        title: `${partner} joint offering`,
        summary: `${partner} and SD Worx are building a joint ${pick(["outsourcing", "advisory", "compliance", "mobility"])} offering for ${pick(QUARTERS)} 2027.`,
        quote: `workshop with ${partner} went well, pilot client is identified.`,
        pool: "product",
        source: "MEETING",
        public: 0.3,
      },
    ]);
  }
}

function tenders() {
  const buyers = [
    "City of Antwerp",
    "Flemish Government",
    "NMBS",
    "De Lijn",
    "UZ Leuven",
    "Proximus",
    "Colruyt Group",
    "AB InBev",
    "Solvay",
    "UCB",
    "Umicore",
    "Bpost",
    "Brussels Airport",
    "Port of Antwerp",
    "KU Leuven",
    "VRT",
    "Randstad NL",
    "Rabobank",
    "Philips",
    "Heineken",
    "Airbus",
    "Michelin",
  ];
  for (const buyer of buyers) {
    const fte = int(800, 40000);
    cluster("tenders", `tender-${buyer}`, [
      {
        title: `Tender ${buyer}`,
        summary: `${buyer} issued an RFP for payroll covering ${fmt(fte)} employees; submission due ${int(1, 28)} ${pick(MONTHS)}.`,
        quote: `RFP from ${buyer} landed. Bid team is forming, go/no-go on Friday.`,
        pool: "sales",
        source: "EMAIL",
        public: 0.15,
      },
      {
        title: `${buyer} bid price`,
        summary: `Our bid for ${buyer} is ${eur(int(240, 520) / 100)} per payslip, ${pick(["aggressive", "at list", "with volume discount"])}.`,
        quote: `pricing for ${buyer} reviewed with finance, margin is ${int(12, 38)}%.`,
        pool: "finance",
        public: 0.03,
      },
      {
        title: `${buyer} requirements`,
        summary: `${buyer} requires ${pick(["ISO 27001", "data residency in Belgium", "SSO with their IdP", "a 99.95% SLA", "WCAG 2.2 accessibility", "an exit plan"])}; we cover ${int(82, 99)}% of the ${int(90, 260)} requirements.`,
        quote: `requirements matrix for ${buyer} is filled in. Gaps are with product.`,
        pool: "product",
        source: "MEETING",
        public: 0.1,
      },
      {
        title: `${buyer} decision`,
        summary: `${buyer} will decide in ${pick(MONTHS)}; we are ${pick(["shortlisted", "preferred bidder", "second place", "in the BAFO round"])}.`,
        quote: `news from ${buyer}: presentation is scheduled.`,
        pool: "sales",
        public: 0.1,
        edge: ["UPDATES", "Tender progress"],
      },
    ]);
    link(
      `tender-${buyer}`,
      `rival-${pick(COMPETITORS)}`,
      "RELATES_TO",
      "Competing on this tender",
    );
    link(
      `tender-${buyer}`,
      `country-${pick(COUNTRIES.slice(0, 3)).code}`,
      "RELATES_TO",
      "Payroll in this country",
    );
  }
}

function okrs() {
  for (const team of TEAMS) {
    for (const q of ["Q3 2026", "Q4 2026"]) {
      const objectives = [
        "Cut payroll errors",
        "Speed up onboarding",
        "Grow self-service usage",
        "Reduce cloud cost",
        "Improve NPS",
        "Raise automation rate",
        "Shorten ticket resolution",
        "Launch in a new country",
      ];
      const objective = pick(objectives);
      cluster("okr", `okr-${team}-${q}`, [
        {
          title: `${team} OKR ${q}`,
          summary: `${team} objective for ${q}: ${objective.toLowerCase()}.`,
          quote: `our ${q} objective is to ${objective.toLowerCase()}. Three key results, all measurable.`,
          pool: "product",
          public: 0.7,
        },
        {
          title: `${team} KR1 ${q}`,
          summary: `Key result: ${objective.toLowerCase()} by ${int(10, 60)}%; currently at ${int(5, 95)}%.`,
          quote: `progress on KR1 is ${pick(["on track", "at risk", "behind", "ahead"])}.`,
          pool: "product",
          public: 0.5,
          edge: ["UPDATES", "Progress"],
        },
        {
          title: `${team} KR2 ${q}`,
          summary: `Key result: reach ${int(60, 98)}% ${pick(["automation", "first-time-right", "on-time delivery", "adoption"])}; currently ${int(30, 95)}%.`,
          quote: `KR2 needs help from ${pick(TEAMS)}.`,
          pool: "product",
          public: 0.5,
          edge: ["UPDATES", "Progress"],
        },
        {
          title: `${team} retro ${q}`,
          summary: `Retro highlights: ${pick(["too many meetings", "great cross-team pairing", "unclear priorities", "slow approvals", "good release cadence"])}.`,
          quote: `retro notes are in Confluence.`,
          pool: "hr",
          source: "MEETING",
          public: 0.3,
        },
      ]);
    }
    link(
      `okr-${team}-Q4 2026`,
      `okr-${team}-Q3 2026`,
      "UPDATES",
      "Follows last quarter",
    );
    link(
      `okr-${team}-Q4 2026`,
      `team-${team}`,
      "RELATES_TO",
      "Team objectives",
    );
  }
}

function changes() {
  const topics = [
    "payslip layout",
    "SEPA file format",
    "Dimona flow",
    "DMFA structure",
    "tax certificate 281.10",
    "holiday accrual",
    "overtime caps",
    "student work quota",
    "flexi-job limits",
    "meal voucher caps",
    "mobility budget",
    "cafeteria plan",
    "pension reporting",
    "garnishment rules",
    "notice periods",
    "outplacement",
    "time credit",
    "career breaks",
    "sick leave notification",
    "EV company car tax",
    "telework flat rate",
    "pay transparency",
    "gender pay gap reporting",
    "minimum hours contract",
  ];
  for (const topic of topics) {
    const country = pick(COUNTRIES.slice(0, 6));
    const effective = `${int(1, 28)} ${pick(MONTHS)} ${pick([2026, 2027])}`;
    cluster("changes", `change-${topic}`, [
      {
        title: `Change: ${topic}`,
        summary: `New ${topic} rules in ${country.name} apply from ${effective}.`,
        quote: `${country.tax} published the ${topic} change. Legal is writing the impact note.`,
        pool: "legal",
        source: "EMAIL",
        public: 0.6,
      },
      {
        title: `${topic} impact analysis`,
        summary: `The ${topic} change affects ${int(5, 70)}% of clients and ${int(1, 8)} engine modules.`,
        quote: `impact analysis done: most work is in ${pick(SERVICES)}.`,
        pool: "legal",
        source: "MEETING",
        edge: ["DEPENDS_ON", "Analysis of the change"],
      },
      {
        title: `${topic} build ticket`,
        summary: `Engineering estimates ${int(3, 60)} days for the ${topic} change, planned for ${pick(QUARTERS)}.`,
        quote: `ticket is groomed and scheduled.`,
        pool: "eng",
        edge: ["DEPENDS_ON", "Implementation work"],
      },
      {
        title: `${topic} client comms`,
        summary: `Clients get a newsletter on ${topic} ${int(2, 8)} weeks before ${effective}.`,
        quote: `comms drafted, legal review pending.`,
        pool: "marketing",
        public: 0.6,
      },
      {
        title: `${topic} support FAQ`,
        summary: `Support prepared an FAQ on ${topic}; expect ${int(40, 600)} tickets in the first month.`,
        quote: `FAQ is in the help centre, agents briefed.`,
        pool: "support",
        public: 0.8,
      },
    ]);
    link(
      `change-${topic}`,
      `country-${country.code}`,
      "UPDATES",
      `${country.name} rule change`,
    );
    link(
      `change-${topic}`,
      `svc-${pick(SERVICES)}`,
      "DEPENDS_ON",
      "Changes this service",
    );
  }
}

function customers() {
  const used = new Set<string>();
  for (;;) {
    if (nodeCount >= budget) break;
    const sector = pick(SECTORS);
    const name = `${pick(PREFIXES)} ${sector.word}`;
    if (used.has(name)) {
      if (used.size >= PREFIXES.length * SECTORS.length) break;
      continue;
    }
    used.add(name);
    const country = chance(0.6) ? COUNTRIES[0] : pick(COUNTRIES.slice(0, 8));
    if (!country) break;
    const fte = int(40, 9000);
    const price = int(280, 690) / 100;
    const contact = pick(CONTACTS);
    const role = pick(ROLES);
    const erp = pick(ERPS);
    const product = pick(PRODUCTS);
    const since = int(2012, 2026);
    const theme = pick(TICKET_THEMES);
    const all: Fact[] = [
      {
        title: `Customer ${name}`,
        summary: `${name} (${sector.label}) runs payroll with SD Worx since ${since}: ${fmt(fte)} employees, mainly in ${country.name}.`,
        quote: `${name} has been with us since ${since}. Main contact is ${contact}, their ${role}.`,
        pool: "sales",
        public: 0.85,
      },
      {
        title: `${name} contract`,
        summary: `${name} pays ${eur(price)} per payslip, about €${fmt(Math.round((price * fte * 12) / 1000))}k a year.`,
        quote: `contract for ${name}: ${eur(price)} per payslip, ${pick(["monthly", "quarterly"])} invoicing, ${int(2, 5)}-year term.`,
        pool: "sales",
        source: "EMAIL",
        public: 0.05,
        edge: ["RELATES_TO", "Contract terms"],
      },
      {
        title: `${name} renewal`,
        summary: `${name} renews in ${pick(MONTHS)} ${pick([2026, 2027, 2028])}; ${pick(["low", "medium", "high"])} churn risk.`,
        quote: `renewal prep for ${name} starts next month. ${pick(["They're happy.", "They're comparing competitors.", "Price is the main topic.", "They want more self-service."])}`,
        pool: "sales",
        source: "MEETING",
        public: 0.1,
        edge: ["UPDATES", "Renewal changes the contract"],
      },
      {
        title: `${name} joint committee`,
        summary: `${name} employees fall under PC ${sector.pc} (${sector.label}).`,
        quote: `double-checked: ${name} is PC ${sector.pc}, with a few white-collar staff under PC 200.`,
        pool: "legal",
        public: 0.6,
      },
      {
        title: `${name} ERP integration`,
        summary: `${name} syncs payroll results to ${erp} ${pick(["nightly", "after every run", "in real time"])}.`,
        quote: `${erp} integration for ${name} is ${pick(["live", "in testing", "blocked on their IT team", "being rebuilt"])}.`,
        pool: "eng",
        edge: ["DEPENDS_ON", "Needs the integration"],
      },
      {
        title: `${name} escalation`,
        summary: `${name} escalated ${theme}; ${pick(["resolved within SLA", "still open", "fixed with a hotfix", "resolved with a credit note"])}.`,
        quote: `${contact} called about ${theme}. I looped in L2.`,
        pool: "support",
        public: 0.3,
      },
      {
        title: `${name} NPS`,
        summary: `${name} gave an NPS of ${int(-20, 80)} in the last business review.`,
        quote: `QBR with ${name} went ${pick(["well", "okay", "rough"])}, they want better reporting.`,
        pool: "sales",
        source: "MEETING",
        public: 0.2,
      },
      {
        title: `${name} wants ${product}`,
        summary: `${name} is interested in ${product}; potential upsell of €${int(10, 400)}k a year.`,
        quote: `${name} asked for a ${product} demo. I'll bring product.`,
        pool: "sales",
        public: 0.2,
      },
      {
        title: `${name} monthly volume`,
        summary: `${name} processes ${fmt(Math.round(fte * (0.9 + rand() * 0.2)))} payslips a month.`,
        quote: `volumes for ${name} are stable, peak is in ${pick(MONTHS)}.`,
        pool: "ops",
        public: 0.4,
      },
      {
        title: `${name} go-live`,
        summary: `${name} goes live on ${product} in ${pick(MONTHS)} ${pick([2026, 2027])}.`,
        quote: `go-live plan for ${name} is signed off, parallel run first.`,
        pool: "product",
        source: "MEETING",
      },
      {
        title: `${name} data migration`,
        summary: `${name} moves ${int(2, 15)} years of payroll history from ${pick(["their previous provider", "an in-house system", "spreadsheets"])}.`,
        quote: `migration dry-run for ${name} found ${int(0, 400)} records to fix.`,
        pool: "ops",
      },
      {
        title: `${name} invoice question`,
        summary: `${name} questioned a ${pick(MONTHS)} invoice of €${fmt(int(2, 90) * 1000)}; ${pick(["resolved", "credit note issued", "pending"])}.`,
        quote: `invoice query from ${name} is with finance.`,
        pool: "finance",
        source: "EMAIL",
        public: 0.05,
      },
      {
        title: `${name} security review`,
        summary: `${name} requested our ${pick(["ISO 27001 certificate", "SOC 2 report", "DPA", "pentest summary"])} for their vendor review.`,
        quote: `sent the documents to ${name}'s security team.`,
        pool: "security",
        source: "EMAIL",
      },
      {
        title: `${name} new contact`,
        summary: `${name} has a new ${role}: ${pick(CONTACTS)} replaces ${contact}.`,
        quote: `heads up, change of contact at ${name}. Intro meeting planned.`,
        pool: "sales",
        edge: ["UPDATES", "New contact"],
      },
      {
        title: `${name} training`,
        summary: `${int(2, 25)} admins from ${name} followed the ${product} training.`,
        quote: `training for ${name} is done, they want an advanced session.`,
        pool: "support",
        public: 0.5,
      },
      {
        title: `${name} expansion`,
        summary: `${name} opens a site in ${pick(COUNTRIES).name} with ${int(20, 400)} employees.`,
        quote: `${name} is expanding, they'll need payroll there from ${pick(MONTHS)}.`,
        pool: "sales",
      },
      {
        title: `${name} custom report`,
        summary: `${name} wants a custom ${pick(["cost-centre", "absence", "overtime", "gender pay gap", "turnover"])} report.`,
        quote: `scoping the report request for ${name}.`,
        pool: "product",
      },
    ];
    const key = `customer-${name}`;
    const [hub, ...rest] = all;
    if (!hub) break;
    cluster("customers", key, [hub, ...sample(rest, int(7, rest.length))]);
    link(
      key,
      `country-${country.code}`,
      "RELATES_TO",
      `Payroll in ${country.name}`,
    );
    if (chance(0.5))
      link(key, `pc-${sector.pc}`, "RELATES_TO", "Sector rules apply");
    if (chance(0.25))
      link(key, `ticket-${theme}`, "RELATES_TO", "Raised tickets about this");
    if (chance(0.2))
      link(
        key,
        `product-${product}`,
        "RELATES_TO",
        "Uses or wants this product",
      );
    if (chance(0.08))
      link(
        key,
        "svc-erp-connector",
        "DEPENDS_ON",
        "Syncs through the connector",
      );
  }
}

// ── Layout ────────────────────────────────────────────────────────────────

const GOLDEN = Math.PI * (3 - Math.sqrt(5));
const SPACING = 17;

// Core facts: a small spring layout in the middle.
function layoutCore(core: KnowledgeNode[], coreEdges: KnowledgeEdge[]) {
  const pos = core.map((_, i) => {
    const r = 40 * Math.sqrt(i + 1);
    return [Math.cos(i * GOLDEN) * r, Math.sin(i * GOLDEN) * r];
  }) as [number, number][];
  const index = new Map(core.map((n, i) => [n.id, i]));
  const links = coreEdges.flatMap((e) => {
    const a = index.get(e.sourceId);
    const b = index.get(e.targetId);
    return a === undefined || b === undefined ? [] : [[a, b] as const];
  });
  for (let step = 0; step < 400; step++) {
    const fxs = new Float64Array(pos.length);
    const fys = new Float64Array(pos.length);
    for (let i = 0; i < pos.length; i++) {
      for (let j = i + 1; j < pos.length; j++) {
        const [ax, ay] = pos[i] as [number, number];
        const [bx, by] = pos[j] as [number, number];
        const dx = ax - bx;
        const dy = ay - by;
        const d2 = Math.max(dx * dx + dy * dy, 1);
        const f = 3000 / d2;
        fxs[i]! += dx * f;
        fys[i]! += dy * f;
        fxs[j]! -= dx * f;
        fys[j]! -= dy * f;
      }
    }
    for (const [a, b] of links) {
      const pa = pos[a] as [number, number];
      const pb = pos[b] as [number, number];
      const dx = pb[0] - pa[0];
      const dy = pb[1] - pa[1];
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const f = (d - 60) * 0.05;
      fxs[a]! += (dx / d) * f * d * 0.02;
      fys[a]! += (dy / d) * f * d * 0.02;
      fxs[b]! -= (dx / d) * f * d * 0.02;
      fys[b]! -= (dy / d) * f * d * 0.02;
    }
    const cool = 1 - step / 400;
    pos.forEach((p, i) => {
      const fx = fxs[i] ?? 0;
      const fy = fys[i] ?? 0;
      // Pull towards the centre so the core stays compact.
      p[0] += Math.max(-8, Math.min(8, fx - p[0] * 0.01)) * cool;
      p[1] += Math.max(-8, Math.min(8, fy - p[1] * 0.01)) * cool;
    });
  }
  const extent = Math.max(...pos.map(([x, y]) => Math.hypot(x, y)), 1);
  return { pos, extent };
}

// Families get a slice of a ring around the core; clusters are clouds of
// nodes inside their family's slice.
function layoutClusters(inner: number) {
  const families = [...new Set(clusters.map((c) => c.family))];
  const counts = families.map((f) =>
    clusters
      .filter((c) => c.family === f)
      .reduce((n, c) => n + c.ids.length, 0),
  );
  const total = counts.reduce((a, b) => a + b, 0);
  const outer = Math.sqrt(inner ** 2 + (total * SPACING ** 2 * 2.2) / Math.PI);
  const positions = new Map<string, [number, number]>();
  const gap = 0.05;
  let angle = rand() * Math.PI * 2;
  families.forEach((family, f) => {
    const width =
      ((counts[f] as number) / total) * (Math.PI * 2 - gap * families.length);
    const members = clusters.filter((c) => c.family === family);
    members.forEach((c, j) => {
      const t = (j + 0.5) / members.length;
      const r = Math.sqrt(inner ** 2 + t * (outer ** 2 - inner ** 2));
      const a = angle + ((j * 0.618034) % 1) * width;
      const cx = Math.cos(a) * r + (rand() - 0.5) * 30;
      const cy = Math.sin(a) * r + (rand() - 0.5) * 30;
      const turn = rand() * Math.PI * 2;
      c.ids.forEach((id, k) => {
        const d =
          k === 0 ? 0 : SPACING * Math.sqrt(k + 0.3) * (0.85 + rand() * 0.3);
        const ang = turn + k * GOLDEN;
        positions.set(id, [
          Math.round(cx + Math.cos(ang) * d),
          Math.round(cy + Math.sin(ang) * d),
        ]);
      });
    });
    angle += width + gap;
  });
  return positions;
}

// ── Entry point ───────────────────────────────────────────────────────────

// Grows the hand-written core into a full company brain of `count` extra
// facts, and gives every node a position.
export function growBrain(
  core: KnowledgeNode[],
  coreEdges: KnowledgeEdge[],
  count: number,
) {
  budget = count;
  legislation();
  engineering();
  initiatives();
  operations();
  support();
  people();
  finance();
  marketing();
  security();
  market();
  tenders();
  okrs();
  changes();
  customers();

  // Bridges from the core into the rest of the brain.
  const bridges: [string, string, EdgeKind, string][] = [
    ["n-indexation-2027", "country-BE", "RELATES_TO", "Belgian payroll rule"],
    ["n-indexation-2027", "pc-200", "RELATES_TO", "Applies to PC 200"],
    ["n-holiday-rule", "country-BE", "RELATES_TO", "Belgian payroll rule"],
    [
      "n-holiday-tickets",
      "ticket-payslip corrections",
      "RELATES_TO",
      "Related ticket driver",
    ],
    [
      "n-payslip-bug",
      "svc-payslip-renderer",
      "RELATES_TO",
      "Bug in this service",
    ],
    [
      "n-api-rate-limit",
      "svc-public-api-gateway",
      "RELATES_TO",
      "Enforced at the gateway",
    ],
    [
      "n-api-oauth",
      "svc-identity",
      "DEPENDS_ON",
      "Issued by the identity service",
    ],
    [
      "n-v3-launch",
      "project-Legacy platform sunset",
      "RELATES_TO",
      "v3 replaces the legacy platform",
    ],
    [
      "n-v3-indexation",
      "svc-legislation-tables",
      "DEPENDS_ON",
      "Needs the new tables",
    ],
    ["n-cutoff-december", "ops-BE", "RELATES_TO", "Belgian operations"],
    ["n-year-end-run", "ops-BE", "RELATES_TO", "Belgian operations"],
    ["n-payroll-sla", "ops-NL", "RELATES_TO", "Same SLA in the Netherlands"],
    ["n-remote-policy", "office-Antwerp HQ", "RELATES_TO", "Office days"],
    ["n-buddy", "team-Support Benelux", "RELATES_TO", "Piloted here"],
    ["n-car-policy", "office-Antwerp HQ", "RELATES_TO", "EV chargers"],
    ["n-hrtech-booth", "event-HR Tech Day", "RELATES_TO", "Same event"],
    ["n-ai-budget", "budget-IT", "RELATES_TO", "Part of the IT budget"],
    [
      "n-llm-vendors",
      "svc-ai-assistant",
      "RELATES_TO",
      "Model for the assistant",
    ],
    [
      "n-gdpr-retention",
      "sec-Data retention",
      "RELATES_TO",
      "Retention policy",
    ],
    [
      "n-wise-search",
      "svc-search-index",
      "RELATES_TO",
      "Search infrastructure",
    ],
  ];
  for (const [from, to, kind, description] of bridges) {
    const target = hubs.get(to);
    if (target && core.some((n) => n.id === from)) {
      addEdge(from, target, kind, description);
    }
  }

  const { pos, extent } = layoutCore(core, coreEdges);
  const positions = layoutClusters(extent + 120);
  for (const [i, n] of core.entries()) {
    const [x = 0, y = 0] = pos[i] ?? [];
    n.pos = [Math.round(x), Math.round(y)];
  }
  for (const n of nodes) n.pos = positions.get(n.id);
  return {
    nodes: [...core, ...nodes],
    edges: [...coreEdges, ...edges],
  };
}
