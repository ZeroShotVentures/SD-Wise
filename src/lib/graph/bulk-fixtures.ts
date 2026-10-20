import type {
  Department,
  EdgeKind,
  KnowledgeEdge,
  KnowledgeSource,
  NodeFixture,
  Person,
} from "./types";

// Bulk mock data so the graph looks like a real company: people, facts and
// edges add up to TOTAL data points. Everything is generated from a fixed
// seed, so every run (and every test) sees the same graph. The facts are
// plausible SD Worx work: payroll runs, statutory filings, customer contracts,
// releases, support tickets, audits. None of it is real.

const TOTAL = 10_000;
const PEOPLE = 150;
const EDGES_PER_NODE = 1.5;
const NODES = Math.floor((TOTAL - PEOPLE) / (1 + EDGES_PER_NODE));

type Rng = () => number;

// mulberry32
function seeded(seed: number): Rng {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST_NAMES = [
  "Jan",
  "Pieter",
  "Thomas",
  "Tom",
  "Wim",
  "Koen",
  "Bart",
  "Dries",
  "Joris",
  "Lars",
  "Maarten",
  "Niels",
  "Sander",
  "Stijn",
  "Tim",
  "Yannick",
  "Matthias",
  "Jonas",
  "Arne",
  "Ruben",
  "Laurent",
  "Olivier",
  "Nicolas",
  "Hugo",
  "Mathieu",
  "Sven",
  "Pascal",
  "Daan",
  "Bram",
  "Jeroen",
  "Marie",
  "Sofie",
  "Lien",
  "Eline",
  "Charlotte",
  "Julie",
  "Femke",
  "Kaat",
  "Lotte",
  "Nele",
  "Sara",
  "Ine",
  "Hanne",
  "Katrien",
  "Annelies",
  "Veerle",
  "Isabelle",
  "Camille",
  "Emma",
  "Lena",
  "Fien",
  "Elise",
  "Pauline",
  "Inge",
  "Els",
  "Griet",
  "Mieke",
  "Sanne",
  "Amélie",
  "Nadia",
  "Fatima",
  "Ilse",
  "Silke",
  "Tess",
  "Lore",
  "Joke",
];

const LAST_NAMES = [
  "Peeters",
  "Janssens",
  "Maes",
  "Jacobs",
  "Mertens",
  "Willems",
  "Claes",
  "Goossens",
  "Wouters",
  "De Smet",
  "Dubois",
  "Lambert",
  "Martens",
  "Hermans",
  "Vermeulen",
  "Smets",
  "Aerts",
  "Michiels",
  "Van den Berg",
  "De Cock",
  "Segers",
  "Vandenberghe",
  "Verhaegen",
  "Desmet",
  "Bogaert",
  "Hendrickx",
  "Coppens",
  "Van Damme",
  "Lemmens",
  "Stevens",
  "De Backer",
  "Wuyts",
  "Cools",
  "Bosmans",
  "Heyvaert",
  "Verbruggen",
  "Pauwels",
  "Leclercq",
  "Dupont",
  "Renard",
  "De Vos",
  "Van Acker",
  "Timmermans",
  "Declercq",
  "Hoefkens",
  "Moens",
  "Callens",
  "Beckers",
  "Thys",
  "Gielen",
];

const ROLES: Partial<Record<Department, string[]>> = {
  IT: [
    "Backend engineer",
    "Frontend engineer",
    "DevOps engineer",
    "QA engineer",
    "Data engineer",
    "Engineering manager",
  ],
  PRODUCTION: [
    "Payroll consultant",
    "Senior payroll consultant",
    "Payroll team lead",
    "Payroll quality analyst",
  ],
  CUSTOMER_SERVICE: [
    "Support agent",
    "Support team lead",
    "Customer success manager",
  ],
  SALES: ["Account manager", "Sales executive", "Sales engineer"],
  FINANCE: ["Financial controller", "FP&A analyst"],
  ACCOUNTING: ["Accountant", "Billing specialist"],
  HR: ["HR business partner", "Recruiter", "Payroll legal expert"],
  MARKETING: ["Content marketer", "Product marketer", "Events manager"],
  AUDIT: ["Internal auditor", "Compliance officer"],
  SECURITY: ["Security engineer", "Security officer"],
  LOGISTICS: ["Print and mail coordinator", "Facilities coordinator"],
  MAINTENANCE: ["Facilities technician"],
  RECEPTION: ["Receptionist"],
  SECRETARIAL: ["Executive assistant"],
};

// Share of the people and of the facts per department.
const WEIGHTS: [Department, number][] = [
  ["PRODUCTION", 18],
  ["IT", 18],
  ["CUSTOMER_SERVICE", 14],
  ["SALES", 10],
  ["HR", 8],
  ["FINANCE", 6],
  ["ACCOUNTING", 6],
  ["MARKETING", 5],
  ["AUDIT", 4],
  ["SECURITY", 4],
  ["LOGISTICS", 3],
  ["SECRETARIAL", 2],
  ["MAINTENANCE", 1],
  ["RECEPTION", 1],
];

const CLIENTS = [
  "Delvaux Logistics",
  "Maes & Zonen",
  "Hoogland Retail Group",
  "Vermeulen Bouw",
  "Aerts Pharma",
  "Nordwind Metall GmbH",
  "Lumière Hôtels",
  "Brouwerij Van Aelst",
  "Haven Antwerp Services",
  "Stellar Textiles",
  "Cobalt Software",
  "Ardenne Foods",
  "Fietsfabriek Roels",
  "Bosland Zorg",
  "Mercator Transport",
  "Oranjewoud Energie",
  "Pelgrim Staffing",
  "Quinoa Kitchens",
  "Rivierenhof Clinics",
  "Scaldis Shipping",
  "Tessenderlo Packaging",
  "Uitkerke Dairy",
  "Vandenbroucke Auto",
  "Wallonia Steel",
  "Xylem Labs Benelux",
  "Yser Cement",
  "Zonnebloem Care",
  "Atlas Telecom",
  "Beaufort Insurance",
  "Campine Chemicals",
  "Dijle Engineering",
  "Eburon Media",
  "Flandria Bank",
  "Gaverbeek Farms",
  "Heuvelland Hotels",
  "Ijsselmeer Retail",
  "Jura Pharma",
  "Kempen Plastics",
  "Leieland Textiles",
  "Maasvallei Logistics",
  "Noordzee Offshore",
  "Ourthe Timber",
  "Polderman Agri",
  "Quercus Furniture",
  "Rupel Brickworks",
  "Sambre Metals",
  "Tongerlo Foods",
  "Univers Education Group",
  "Vesder Outdoor",
  "Waaslandia Ports",
  "Zenne Biotech",
  "Argos Security",
  "Blauwe Reiger Care",
  "Citadel Construction",
  "Duinkerke Marine",
  "Elzas Wine Imports",
  "Fenix Staffing",
  "Grensland Customs",
  "Hesbaye Poultry",
  "Imkerij De Gouden Bij",
];

const SYSTEMS = [
  "Payroll Cloud v3",
  "Payroll API",
  "Employee Portal",
  "Time and Attendance",
  "Expense Module",
  "Document Vault",
  "Onboarding Workflow",
  "Reporting Hub",
  "Single sign-on gateway",
  "Batch scheduler",
  "Payslip delivery service",
  "Absence Planner",
];

const COUNTRIES = [
  "Belgium",
  "Belgium",
  "Belgium",
  "the Netherlands",
  "the Netherlands",
  "France",
  "Germany",
  "Luxembourg",
  "Switzerland",
  "Austria",
  "Ireland",
  "the UK",
];

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const JOINT_COMMITTEES = [
  "joint committee 200 (clerks)",
  "joint committee 124 (construction)",
  "joint committee 302 (hospitality)",
  "joint committee 140 (road transport)",
  "joint committee 209 (white-collar metal)",
  "joint committee 330 (healthcare)",
  "joint committee 311 (large retail)",
];

const CITIES = [
  "Antwerp",
  "Ghent",
  "Brussels",
  "Leuven",
  "Hasselt",
  "Bruges",
  "Mechelen",
  "Liège",
  "Namur",
  "Rotterdam",
  "Utrecht",
  "Eindhoven",
  "Lille",
  "Cologne",
];

type Gen = {
  pick: <T>(items: readonly T[]) => T;
  int: (min: number, max: number) => number;
  a: string; // author
  b: string; // colleague
  client: string;
  system: string;
  country: string;
  month: string;
  nextMonth: string;
  city: string;
  committee: string;
};

type Draft = {
  title: string;
  summary: string;
  content: string;
  source: KnowledgeSource;
  from: string;
  tags: string[];
  kind?: EdgeKind;
};

type Template = (c: Gen) => Draft;

const msg = (
  c: Gen,
  channel: string,
  title: string,
  summary: string,
  text: string,
  tags: string[],
  kind?: EdgeKind,
): Draft => ({
  title,
  summary,
  content: `${c.a}: ${text}`,
  source: "MESSAGE",
  from: channel,
  tags,
  kind,
});

const mail = (
  c: Gen,
  subject: string,
  title: string,
  summary: string,
  text: string,
  tags: string[],
  kind?: EdgeKind,
): Draft => ({
  title,
  summary,
  content: `${text} — ${c.a}`,
  source: "EMAIL",
  from: `Email: ${subject}`,
  tags,
  kind,
});

const meet = (
  meeting: string,
  title: string,
  summary: string,
  text: string,
  tags: string[],
  kind?: EdgeKind,
): Draft => ({
  title,
  summary,
  content: text,
  source: "MEETING",
  from: `Meeting: ${meeting}`,
  tags,
  kind,
});

const eur = (n: number) => `€${n.toLocaleString("en-GB")}`;

// Templates per department. Each one reads like something a person in that
// role would plausibly write; the generator fills in clients, systems,
// countries, numbers and dates.
const TEMPLATES: Record<Department, Template[]> = {
  PRODUCTION: [
    (c) =>
      msg(
        c,
        "#payroll-ops",
        `${c.client} ${c.month} payroll run`,
        `The ${c.month} payroll run for ${c.client} was released on time with ${c.int(2, 14)} manual corrections.`,
        `${c.client} ${c.month} run is released. ${c.int(2, 14)} manual corrections, mostly late overtime from ${c.city}. Payslips are in the portal and the bank file went out before noon.`,
        [`client:${c.client}`, "topic:payroll-run"],
      ),
    (c) =>
      msg(
        c,
        "#payroll-ops",
        `Late changes ${c.client}`,
        `${c.client} sent ${c.int(5, 40)} late employee changes after the cut-off, so they land in next month's run.`,
        `${c.client} mailed ${c.int(5, 40)} changes after the cut-off (address changes and two new hires). We push them to the next run and I told their HR contact today. ${c.b}, can you flag it in the account notes?`,
        [`client:${c.client}`, "topic:cutoff"],
      ),
    (c) =>
      mail(
        c,
        `Dimona declaration ${c.client}`,
        `Dimona errors ${c.client}`,
        `${c.int(3, 12)} Dimona declarations for ${c.client} were rejected and have to be resubmitted before the employees start.`,
        `${c.int(3, 12)} Dimona declarations for ${c.client} bounced because the NISS numbers of new hires were incomplete. Dimona has to be filed before the employment starts, so I am asking their HR team for corrected data today.`,
        [`client:${c.client}`, "rule:dimona"],
      ),
    (c) =>
      msg(
        c,
        "#payroll-ops",
        "Quarterly DmfA filing",
        `The quarterly DmfA declaration for ${c.client} was submitted to the social security office ${c.int(1, 6)} days before the deadline.`,
        `DmfA for ${c.client} is submitted, ${c.int(1, 6)} days before the end-of-month deadline. The social security office accepted it without remarks.`,
        [`client:${c.client}`, "rule:dmfa"],
      ),
    (c) =>
      meet(
        "Payroll quality review",
        `Payroll quality ${c.month}`,
        `${c.month} quality review: error rate ${(c.int(4, 18) / 10).toFixed(1)}% across all runs, driven by ${c.pick(["late changes", "wrong bank accounts", "missing sick-leave certificates", "outdated tax cards"])}.`,
        `${c.a} presented the ${c.month} quality numbers: error rate ${(c.int(4, 18) / 10).toFixed(1)}% of payslips. Most errors come from ${c.pick(["late changes", "wrong bank accounts", "missing sick-leave certificates", "outdated tax cards"])}. ${c.b} will draft a checklist for the consultants.`,
        ["topic:quality", "topic:payroll-run"],
      ),
    (c) =>
      msg(
        c,
        "#payroll-benelux",
        `Wage indexation ${c.committee}`,
        `Wages under ${c.committee} rise by ${(c.int(10, 35) / 10).toFixed(1)}% on 1 January, so ${c.int(8, 60)} customers need new rates in the tool.`,
        `Heads up: wages under ${c.committee} go up ${(c.int(10, 35) / 10).toFixed(1)}% on 1 January. ${c.int(8, 60)} customers fall under it. I will load the new scales in the sandbox first so we can compare.`,
        [`committee:${c.committee}`, "rule:indexation"],
      ),
    (c) =>
      mail(
        c,
        `Payroll tax filing ${c.country}`,
        `Tax filing ${c.country}`,
        `The monthly payroll tax filing for ${c.country} was submitted for ${c.int(3, 25)} entities with no rejections.`,
        `Monthly payroll tax filing for ${c.country} is done for ${c.int(3, 25)} entities. No rejections. The ${c.nextMonth} deadline has been added to the team calendar.`,
        [`country:${c.country}`, "topic:tax-filing"],
      ),
    (c) =>
      msg(
        c,
        "#payroll-ops",
        `Sick leave ${c.client}`,
        `${c.client} has ${c.int(6, 45)} employees on long-term sick leave this month; guaranteed salary rules apply to ${c.int(1, 8)} of them.`,
        `${c.client}: ${c.int(6, 45)} on long-term sick leave, and the guaranteed salary period ends this month for ${c.int(1, 8)} of them. I am checking the mutuality declarations before the run.`,
        [`client:${c.client}`, "topic:absence"],
      ),
    (c) =>
      meet(
        "Onboarding kick-off",
        `${c.client} onboarding`,
        `${c.client} moves ${c.int(80, 2400)} employees to SD Worx on 1 ${c.nextMonth}, with a parallel run in ${c.month}.`,
        `Kick-off with ${c.client}: ${c.int(80, 2400)} employees move to SD Worx on 1 ${c.nextMonth}. We do a parallel run in ${c.month} against their old provider and sign off the differences with their finance team. ${c.a} owns data migration, ${c.b} owns the first live run.`,
        [`client:${c.client}`, "topic:onboarding"],
      ),
    (c) =>
      msg(
        c,
        "#payroll-ops",
        `Year-end ${c.client}`,
        `Year-end statements for ${c.client} (${c.int(40, 3000)} employees) are generated and waiting for approval.`,
        `Year-end tax statements for ${c.client} are generated, ${c.int(40, 3000)} employees. Waiting for their approval before we publish them in the portal.`,
        [`client:${c.client}`, "topic:year-end"],
      ),
  ],

  IT: [
    (c) =>
      msg(
        c,
        "#engineering",
        `${c.system} release`,
        `${c.system} release ${c.int(2, 9)}.${c.int(0, 24)} went to production with ${c.int(2, 12)} fixes and no downtime.`,
        `${c.system} ${c.int(2, 9)}.${c.int(0, 24)} is live. ${c.int(2, 12)} fixes, migrations ran in ${c.int(2, 40)} seconds, no downtime. Rollback plan stays ready for 24 hours.`,
        [`system:${c.system}`, "topic:release"],
      ),
    (c) =>
      msg(
        c,
        "#incident",
        `${c.system} incident ${c.month}`,
        `${c.system} was degraded for ${c.int(8, 95)} minutes because of ${c.pick(["an exhausted database connection pool", "a failed certificate renewal", "a slow downstream tax service", "a bad config push"])}.`,
        `Postmortem draft: ${c.system} was degraded for ${c.int(8, 95)} minutes. Cause: ${c.pick(["an exhausted database connection pool", "a failed certificate renewal", "a slow downstream tax service", "a bad config push"])}. Fix is deployed, alert thresholds tightened. ${c.b} reviews the draft on Thursday.`,
        [`system:${c.system}`, "topic:incident"],
      ),
    (c) =>
      meet(
        "Architecture review",
        `${c.system} architecture`,
        `${c.system} will move from a nightly batch to an event-driven flow to cut turnaround by ${c.int(20, 60)}%.`,
        `Architecture review for ${c.system}: the nightly batch is the bottleneck on busy days. Proposal from ${c.a}: switch to events, keep the batch as a fallback for ${c.int(1, 3)} sprints. ${c.b} worries about ordering guarantees and will prototype it.`,
        [`system:${c.system}`, "topic:architecture"],
        "DEPENDS_ON",
      ),
    (c) =>
      msg(
        c,
        "#engineering",
        `Dependency upgrade ${c.system}`,
        `${c.system} moves to the next framework major version; ${c.int(3, 30)} breaking changes are tracked in the migration epic.`,
        `Started the framework upgrade for ${c.system}. ${c.int(3, 30)} breaking changes so far, all tracked in the epic. Target: done before the next release train.`,
        [`system:${c.system}`, "topic:upgrade"],
      ),
    (c) =>
      msg(
        c,
        "#platform",
        `${c.system} performance`,
        `p95 latency of ${c.system} dropped from ${c.int(600, 1800)} ms to ${c.int(120, 450)} ms after adding a read replica.`,
        `${c.system} p95 latency is down from ${c.int(600, 1800)} ms to ${c.int(120, 450)} ms after the read replica and two missing indexes. Month-end load test passed at ${c.int(2, 6)}x normal traffic.`,
        [`system:${c.system}`, "topic:performance"],
      ),
    (c) =>
      mail(
        c,
        `API access ${c.client}`,
        `API request ${c.client}`,
        `${c.client} asked for Payroll API access with ${c.int(100, 2000)} requests per minute for their ${c.pick(["HR portal", "time registration tool", "ERP integration"])}.`,
        `${c.client} wants Payroll API access for their ${c.pick(["HR portal", "time registration tool", "ERP integration"])}, about ${c.int(100, 2000)} requests per minute. We need a sandbox key and a decision on rate limits.`,
        [`client:${c.client}`, "system:Payroll API"],
        "DEPENDS_ON",
      ),
    (c) =>
      meet(
        "Sprint planning",
        `Sprint ${c.int(40, 90)} plan`,
        `Sprint ${c.int(40, 90)} focuses on ${c.pick(["the statutory update for new tax tables", "payslip layout accessibility", "the Employee Portal login flow", "batch retries for the bank file"])}.`,
        `Sprint planning with ${c.a} and ${c.b}. Commitment: ${c.int(18, 34)} points. Focus: ${c.pick(["the statutory update for new tax tables", "payslip layout accessibility", "the Employee Portal login flow", "batch retries for the bank file"])}. Carry-over from last sprint: ${c.int(0, 4)} tickets.`,
        ["topic:sprint"],
      ),
    (c) =>
      msg(
        c,
        "#data",
        "Warehouse load",
        `The nightly warehouse load for ${c.system} now finishes in ${c.int(25, 70)} minutes, down from ${c.int(90, 160)}.`,
        `Nightly warehouse load for ${c.system} finishes in ${c.int(25, 70)} minutes now, down from ${c.int(90, 160)}. Incremental loads instead of full refresh.`,
        [`system:${c.system}`, "topic:data"],
      ),
  ],

  CUSTOMER_SERVICE: [
    (c) =>
      msg(
        c,
        "#support",
        `Ticket spike ${c.system}`,
        `Support saw ${c.int(40, 260)} tickets about ${c.system} in two days, mostly ${c.pick(["login problems", "missing payslips", "wrong holiday balances", "export errors"])}.`,
        `Ticket spike: ${c.int(40, 260)} tickets about ${c.system} in two days, mostly ${c.pick(["login problems", "missing payslips", "wrong holiday balances", "export errors"])}. I tagged them so engineering can pick up the pattern.`,
        [`system:${c.system}`, "topic:tickets"],
      ),
    (c) =>
      mail(
        c,
        `Escalation ${c.client}`,
        `Escalation ${c.client}`,
        `${c.client} escalated a payslip dispute affecting ${c.int(2, 30)} employees; first answer is promised within ${c.int(1, 3)} working days.`,
        `${c.client} escalated: ${c.int(2, 30)} employees saw a wrong net amount. I promised an answer within ${c.int(1, 3)} working days and am pulling the calculation with ${c.b} in payroll.`,
        [`client:${c.client}`, "topic:escalation"],
      ),
    (c) =>
      meet(
        "Customer success sync",
        `${c.client} health check`,
        `${c.client} health score is ${c.pick(["green", "amber", "red"])}, with ${c.pick(["strong portal adoption", "low adoption of self-service", "an open contract question", "a pending API request"])}.`,
        `Customer success sync on ${c.client}: health is ${c.pick(["green", "amber", "red"])}. Main points: ${c.pick(["strong portal adoption", "low adoption of self-service", "an open contract question", "a pending API request"])}. ${c.a} schedules a call with their HR director.`,
        [`client:${c.client}`, "topic:customer-success"],
      ),
    (c) => {
      const topic = c.pick([
        "holiday pay questions",
        "payslip access",
        "password resets",
        "tax card updates",
      ]);
      return msg(
        c,
        "#support",
        `Answer macro ${topic}`,
        `A new answer macro for ${topic} cut handling time by ${c.int(15, 40)}%.`,
        `Published a new macro for ${topic}. Handling time dropped by ${c.int(15, 40)}% in the first week.`,
        ["topic:tickets", "topic:macros"],
      );
    },
    (c) =>
      msg(
        c,
        "#support",
        `CSAT ${c.month}`,
        `Customer satisfaction for ${c.month} is ${(c.int(41, 48) / 10).toFixed(1)} out of 5 with a median first response of ${c.int(12, 55)} minutes.`,
        `${c.month} CSAT: ${(c.int(41, 48) / 10).toFixed(1)} out of 5, median first response ${c.int(12, 55)} minutes. Best queue: ${c.pick(["Dutch payroll", "French payroll", "Employee Portal"])}.`,
        ["topic:csat"],
      ),
    (c) =>
      mail(
        c,
        `Training ${c.client}`,
        `Portal training ${c.client}`,
        `${c.client} books two portal training sessions for ${c.int(8, 60)} HR users in ${c.nextMonth}.`,
        `${c.client} booked two training sessions on the Employee Portal for ${c.int(8, 60)} HR users in ${c.nextMonth}. I will send the agenda and a sandbox login.`,
        [`client:${c.client}`, "system:Employee Portal"],
      ),
  ],

  SALES: [
    (c) =>
      mail(
        c,
        `Proposal ${c.client}`,
        `Proposal ${c.client}`,
        `${c.client} receives a payroll proposal for ${c.int(150, 5000)} employees at ${eur(c.int(310, 460) / 100)} per payslip per month.`,
        `Proposal sent to ${c.client}: ${c.int(150, 5000)} employees, ${eur(c.int(310, 460) / 100)} per payslip per month, 3-year term, implementation fee waived if they sign this quarter.`,
        [`client:${c.client}`, "topic:proposal"],
      ),
    (c) =>
      msg(
        c,
        "#sales-benelux",
        `Pipeline ${c.month}`,
        `The Benelux pipeline for ${c.month} stands at ${eur(c.int(8, 40) * 100000)} with ${c.int(6, 25)} open deals.`,
        `Pipeline update: ${eur(c.int(8, 40) * 100000)} open across ${c.int(6, 25)} deals. Biggest one is ${c.client}, decision expected in ${c.nextMonth}.`,
        [`client:${c.client}`, "topic:pipeline"],
      ),
    (c) =>
      mail(
        c,
        `Renewal ${c.client}`,
        `Renewal ${c.client}`,
        `${c.client} renews for ${c.int(1, 3)} years; they asked for a ${c.int(3, 9)}% discount and we offered ${c.int(0, 5)}%.`,
        `Renewal talks with ${c.client}: they want a ${c.int(3, 9)}% discount, we countered with ${c.int(0, 5)}% plus a free Reporting Hub module. Decision with their CFO next week.`,
        [`client:${c.client}`, "topic:renewal"],
        "UPDATES",
      ),
    (c) =>
      meet(
        "Deal review",
        `Deal review ${c.client}`,
        `Deal review: ${c.client} is at risk because a competitor offered a lower per-payslip price.`,
        `Deal review for ${c.client}. Risk: a competitor quoted lower per payslip. Our edge is the compliance coverage in ${c.country}. ${c.a} will bring a reference customer to the next call.`,
        [`client:${c.client}`, "topic:pipeline"],
      ),
    (c) =>
      msg(
        c,
        "#sales-benelux",
        `Win ${c.client}`,
        `${c.client} signed a ${c.int(2, 5)}-year payroll contract for ${c.int(100, 3500)} employees.`,
        `Signed! ${c.client}, ${c.int(2, 5)}-year payroll contract, ${c.int(100, 3500)} employees. Handover to onboarding is on the calendar.`,
        [`client:${c.client}`, "topic:onboarding"],
      ),
  ],

  FINANCE: [
    (c) => {
      const team = c.pick([
        "IT",
        "Marketing",
        "Customer Service",
        "Payroll operations",
      ]);
      const driver = c.pick(["contractors", "licences", "travel", "overtime"]);
      return mail(
        c,
        `Budget ${c.month}`,
        `Budget ${team} ${c.month}`,
        `The ${team} budget is ${c.int(2, 11)}% over plan for ${c.month}.`,
        `Budget check for ${c.month}: ${team} is ${c.int(2, 11)}% over plan, mainly ${driver}. I need a mitigation plan before the quarter close.`,
        ["topic:budget"],
      );
    },
    (c) =>
      msg(
        c,
        "#finance-team",
        `Quarter close ${c.pick(["Q1", "Q2", "Q3", "Q4"])}`,
        `The quarter close is on track; ${c.int(3, 25)} open reconciliation items remain.`,
        `Quarter close update: ${c.int(3, 25)} open reconciliation items left, mostly intercompany between ${c.pick(["Belgium and the Netherlands", "Belgium and France", "Germany and Austria"])}. Target sign-off on working day ${c.int(5, 9)}.`,
        ["topic:close"],
      ),
    (c) =>
      mail(
        c,
        `Contract terms ${c.client}`,
        `Contract terms ${c.client}`,
        `${c.client} pays ${eur(c.int(310, 460) / 100)} per payslip per month with quarterly invoicing.`,
        `Confirming the ${c.client} contract: ${eur(c.int(310, 460) / 100)} per payslip per month, quarterly invoicing, ${c.int(1, 5)}-year term, indexation on the anniversary date.`,
        [`client:${c.client}`, "topic:contract"],
      ),
    (c) =>
      meet(
        "Forecast review",
        `Forecast ${c.month}`,
        `The full-year revenue forecast was ${c.pick(["raised", "lowered", "confirmed"])} by ${c.int(1, 4)}% after the ${c.month} numbers.`,
        `Forecast review: the revenue forecast was ${c.pick(["raised", "lowered", "confirmed"])} by ${c.int(1, 4)}% after the ${c.month} numbers. Main driver: ${c.pick(["new customer onboardings", "payslip volumes", "price indexation", "churn at two mid-size customers"])}.`,
        ["topic:forecast"],
      ),
  ],

  ACCOUNTING: [
    (c) =>
      msg(
        c,
        "#accounting",
        `Invoice run ${c.month}`,
        `The ${c.month} invoice run created ${c.int(300, 2600)} invoices; ${c.int(2, 40)} were held for review.`,
        `${c.month} invoice run is done: ${c.int(300, 2600)} invoices out, ${c.int(2, 40)} held for review because the payslip counts looked off.`,
        ["topic:invoicing"],
      ),
    (c) =>
      mail(
        c,
        `Payment reminder ${c.client}`,
        `Overdue ${c.client}`,
        `${c.client} has ${eur(c.int(2, 90) * 1000)} overdue for ${c.int(30, 90)} days; a reminder was sent.`,
        `${c.client} still owes ${eur(c.int(2, 90) * 1000)}, ${c.int(30, 90)} days overdue. Second reminder went out today and the account manager is informed.`,
        [`client:${c.client}`, "topic:invoicing"],
      ),
    (c) =>
      msg(
        c,
        "#accounting",
        `VAT return ${c.country}`,
        `The VAT return for ${c.country} was filed with a payable of ${eur(c.int(20, 400) * 1000)}.`,
        `VAT return for ${c.country} is filed. Payable: ${eur(c.int(20, 400) * 1000)}. Payment is scheduled for the due date.`,
        [`country:${c.country}`, "topic:tax-filing"],
      ),
    (c) =>
      meet(
        "Billing sync",
        `Billing corrections ${c.client}`,
        `Billing corrected for ${c.client}: ${c.int(10, 120)} payslips were counted twice in ${c.month}.`,
        `Billing sync: ${c.client} was charged for ${c.int(10, 120)} duplicate payslips in ${c.month}. A credit note is issued and ${c.a} adds a duplicate check to the invoice run.`,
        [`client:${c.client}`, "topic:invoicing"],
        "UPDATES",
      ),
  ],

  HR: [
    (c) => {
      const [role, area] = c.pick([
        ["backend engineers", "engineering"],
        ["payroll consultants", "payroll"],
        ["support agents", "support"],
        ["account managers", "sales"],
      ] as const);
      return msg(
        c,
        "#people",
        `Hiring ${role}`,
        `HR has ${c.int(2, 12)} open ${area} vacancies in ${c.city}, with ${c.int(15, 90)} candidates in the pipeline.`,
        `Hiring update: ${c.int(2, 12)} open ${area} vacancies in ${c.city}, ${c.int(15, 90)} candidates in the pipeline. Time to hire is ${c.int(28, 60)} days.`,
        ["topic:hiring"],
      );
    },
    (c) =>
      mail(
        c,
        `Policy update ${c.pick(["hybrid work", "company car", "training budget", "leave"])}`,
        `Policy ${c.pick(["hybrid work", "company car", "training budget", "leave"])}`,
        `The ${c.pick(["hybrid work", "company car", "training budget", "leave"])} policy changes on 1 ${c.nextMonth} for all Belgian employees.`,
        `Policy update: the ${c.pick(["hybrid work", "company car", "training budget", "leave"])} policy changes on 1 ${c.nextMonth}. The intranet page is updated and managers get a briefing this week.`,
        ["topic:policy"],
      ),
    (c) =>
      msg(
        c,
        "#legal-payroll",
        `Legal update ${c.country}`,
        `New payroll legislation in ${c.country} changes ${c.pick(["social security ceilings", "withholding tax tables", "the reporting format", "holiday pay accrual"])} from 1 ${c.nextMonth}.`,
        `Legal watch: ${c.country} changes ${c.pick(["social security ceilings", "withholding tax tables", "the reporting format", "holiday pay accrual"])} from 1 ${c.nextMonth}. I wrote the impact note and shared it with payroll and product.`,
        [`country:${c.country}`, "topic:legal"],
        "UPDATES",
      ),
    (c) =>
      meet(
        "Learning and development",
        `Training plan ${c.month}`,
        `The ${c.month} training plan covers ${c.int(40, 220)} employees with a focus on ${c.pick(["statutory updates", "data protection", "customer communication", "the new payroll engine"])}.`,
        `Training plan for ${c.month}: ${c.int(40, 220)} employees, focus on ${c.pick(["statutory updates", "data protection", "customer communication", "the new payroll engine"])}. ${c.a} books the rooms, ${c.b} prepares the e-learning.`,
        ["topic:training"],
      ),
    (c) =>
      msg(
        c,
        "#people",
        `Onboarding ${c.month} cohort`,
        `${c.int(4, 22)} new colleagues start in ${c.city} in ${c.month}; each gets a buddy for the first ${c.int(6, 12)} weeks.`,
        `${c.int(4, 22)} new colleagues start in ${c.city} this ${c.month}. Everyone gets a buddy for ${c.int(6, 12)} weeks and a laptop on day one.`,
        ["topic:onboarding-staff"],
      ),
  ],

  MARKETING: [
    (c) =>
      msg(
        c,
        "#marketing",
        `Webinar ${c.pick(["year-end payroll", "new legislation", "employee experience", "payroll automation"])}`,
        `The ${c.pick(["year-end payroll", "new legislation", "employee experience", "payroll automation"])} webinar drew ${c.int(120, 900)} registrations and ${c.int(40, 60)}% attended live.`,
        `Webinar results: ${c.int(120, 900)} registrations, ${c.int(40, 60)}% attended live, ${c.int(8, 40)} qualified leads handed to sales.`,
        ["topic:events", "topic:leads"],
      ),
    (c) =>
      meet(
        "Campaign planning",
        `Campaign ${c.month}`,
        `The ${c.month} campaign targets ${c.pick(["HR directors in mid-size companies", "CFOs", "payroll managers"])} in ${c.country} with a budget of ${eur(c.int(10, 60) * 1000)}.`,
        `Campaign planning for ${c.month}: audience is ${c.pick(["HR directors in mid-size companies", "CFOs", "payroll managers"])} in ${c.country}, budget ${eur(c.int(10, 60) * 1000)}. ${c.a} owns content, ${c.b} owns paid channels.`,
        [`country:${c.country}`, "topic:campaign"],
      ),
    (c) =>
      mail(
        c,
        `Case study ${c.client}`,
        `Case study ${c.client}`,
        `${c.client} agreed to a customer case study about moving ${c.int(80, 2400)} employees to ${c.system}.`,
        `${c.client} approved the case study on their move to ${c.system}, ${c.int(80, 2400)} employees. Legal review of the quotes is next.`,
        [`client:${c.client}`, "topic:case-study"],
      ),
    (c) =>
      msg(
        c,
        "#marketing",
        `Event ${c.city}`,
        `We will have a booth at the HR conference in ${c.city} in ${c.nextMonth}, with ${c.int(6, 20)} colleagues attending.`,
        `Booth confirmed for the HR conference in ${c.city} in ${c.nextMonth}. ${c.int(6, 20)} colleagues attend, demo station runs ${c.system}.`,
        ["topic:events"],
      ),
  ],

  AUDIT: [
    (c) =>
      meet(
        "Audit committee",
        `Internal audit ${c.system}`,
        `The internal audit of ${c.system} found ${c.int(1, 9)} findings, ${c.int(0, 2)} rated high.`,
        `Audit committee: the audit of ${c.system} closed with ${c.int(1, 9)} findings, ${c.int(0, 2)} rated high. ${c.a} tracks remediation with owners and due dates.`,
        [`system:${c.system}`, "topic:audit"],
      ),
    (c) =>
      mail(
        c,
        `ISAE 3402 evidence`,
        `ISAE 3402 evidence ${c.month}`,
        `The ISAE 3402 evidence package for ${c.month} is ${c.int(70, 100)}% complete, with ${c.int(1, 6)} controls awaiting owner sign-off.`,
        `ISAE 3402 evidence package is ${c.int(70, 100)}% complete for ${c.month}. ${c.int(1, 6)} controls still need owner sign-off, mostly access reviews.`,
        ["topic:audit", "topic:compliance"],
      ),
    (c) =>
      msg(
        c,
        "#compliance",
        `GDPR request ${c.month}`,
        `${c.int(3, 40)} data subject requests were closed in ${c.month}, all within the ${c.int(20, 30)}-day deadline.`,
        `GDPR requests ${c.month}: ${c.int(3, 40)} closed, all within the legal deadline. Most were access requests from former employees of customers.`,
        ["topic:gdpr", "topic:compliance"],
      ),
    (c) =>
      mail(
        c,
        `Customer audit ${c.client}`,
        `Customer audit ${c.client}`,
        `${c.client} audits our payroll processing controls in ${c.nextMonth}; we owe them evidence by ${c.int(1, 28)} ${c.month}.`,
        `${c.client} will audit our payroll processing controls in ${c.nextMonth}. We owe them the control matrix and last year's report by ${c.int(1, 28)} ${c.month}.`,
        [`client:${c.client}`, "topic:audit"],
      ),
  ],

  SECURITY: [
    (c) =>
      msg(
        c,
        "#security",
        `Vulnerability ${c.system}`,
        `A ${c.pick(["medium", "high", "critical"])} vulnerability in a ${c.system} dependency was patched within ${c.int(1, 6)} days.`,
        `Patched a ${c.pick(["medium", "high", "critical"])} vulnerability in a dependency of ${c.system} within ${c.int(1, 6)} days. No sign of exploitation in the logs.`,
        [`system:${c.system}`, "topic:vulnerability"],
      ),
    (c) =>
      meet(
        "Security review",
        `Security review ${c.system}`,
        `The security review of ${c.system} requires ${c.pick(["tighter session timeouts", "field-level encryption for bank accounts", "stricter role separation", "rate limiting on login"])} before go-live.`,
        `Security review of ${c.system}: before go-live we need ${c.pick(["tighter session timeouts", "field-level encryption for bank accounts", "stricter role separation", "rate limiting on login"])}. ${c.a} opens the tickets.`,
        [`system:${c.system}`, "topic:security-review"],
        "DEPENDS_ON",
      ),
    (c) =>
      msg(
        c,
        "#security",
        `Phishing test ${c.month}`,
        `The ${c.month} phishing simulation had a click rate of ${c.int(3, 12)}% across ${c.int(300, 1500)} employees.`,
        `Phishing simulation ${c.month}: ${c.int(3, 12)}% clicked, ${c.int(30, 60)}% reported it. Extra training is scheduled for the teams above average.`,
        ["topic:awareness"],
      ),
    (c) =>
      mail(
        c,
        `Access review ${c.month}`,
        `Access review ${c.month}`,
        `The quarterly access review removed ${c.int(8, 90)} stale accounts from payroll systems.`,
        `Access review done for ${c.month}: ${c.int(8, 90)} stale accounts removed from payroll systems, ${c.int(1, 5)} exceptions approved by the system owner.`,
        ["topic:access", "topic:compliance"],
      ),
  ],

  LOGISTICS: [
    (c) =>
      msg(
        c,
        "#print-and-mail",
        `Paper payslips ${c.month}`,
        `${c.int(900, 9000)} paper payslips were printed and posted in ${c.month} for customers without portal access.`,
        `${c.month} print run: ${c.int(900, 9000)} paper payslips printed and posted. ${c.int(4, 40)} came back undeliverable, addresses are being corrected.`,
        ["topic:print"],
      ),
    (c) =>
      mail(
        c,
        `Courier contract`,
        "Courier contract",
        `The courier contract for document delivery to ${c.city} is renewed for ${c.int(1, 3)} years.`,
        `Courier contract for ${c.city} renewed for ${c.int(1, 3)} years with a ${c.int(2, 6)}% price increase.`,
        ["topic:logistics"],
      ),
    (c) =>
      msg(
        c,
        "#facilities",
        `Office move ${c.city}`,
        `${c.int(30, 220)} desks move to the new ${c.city} office in ${c.nextMonth}.`,
        `Move planning for the ${c.city} office: ${c.int(30, 220)} desks in ${c.nextMonth}. Network cabling is checked, badges are printed.`,
        ["topic:facilities"],
      ),
  ],

  MAINTENANCE: [
    (c) =>
      msg(
        c,
        "#facilities",
        `Maintenance ${c.city}`,
        `The ${c.city} office has planned maintenance on the cooling system in ${c.nextMonth}.`,
        `Planned maintenance in ${c.city} on the cooling system, ${c.nextMonth}. Server room unaffected, one weekend closure of the third floor.`,
        ["topic:facilities"],
      ),
  ],

  RECEPTION: [
    (c) =>
      msg(
        c,
        "#reception",
        `Visitors ${c.city}`,
        `The ${c.city} reception registered ${c.int(60, 400)} visitors in ${c.month}; ${c.int(5, 25)} were customer training guests.`,
        `Visitors in ${c.month} at ${c.city}: ${c.int(60, 400)}. ${c.int(5, 25)} were customer training guests, so please book meeting rooms early.`,
        ["topic:facilities"],
      ),
  ],

  SECRETARIAL: [
    (c) =>
      mail(
        c,
        `Board meeting ${c.month}`,
        `Board meeting ${c.month}`,
        `The ${c.month} board meeting agenda includes the budget update, ${c.system} roadmap and the audit committee report.`,
        `Agenda for the ${c.month} board meeting: budget update, the ${c.system} roadmap and the audit committee report. Papers go out ${c.int(3, 7)} days before.`,
        ["topic:governance"],
      ),
    (c) =>
      msg(
        c,
        "#executive-office",
        `Leadership offsite ${c.city}`,
        `The leadership offsite takes place in ${c.city} in ${c.nextMonth} with ${c.int(18, 40)} attendees.`,
        `Leadership offsite booked in ${c.city} for ${c.nextMonth}, ${c.int(18, 40)} attendees. Travel and agenda drafts follow this week.`,
        ["topic:governance"],
      ),
  ],

  CLEANING: [],
  OTHER: [],
};

const weighted = <T>(r: Rng, items: [T, number][]): T => {
  const total = items.reduce((sum, [, w]) => sum + w, 0);
  let x = r() * total;
  for (const [item, w] of items) {
    x -= w;
    if (x < 0) return item;
  }
  return (items[items.length - 1] as [T, number])[0];
};

const label = (tag: string) => tag.slice(tag.indexOf(":") + 1);

const describe = (tag: string) => {
  const kind = tag.slice(0, tag.indexOf(":"));
  const name = label(tag);
  if (kind === "client") return `Same customer: ${name}`;
  if (kind === "system") return `Same system: ${name}`;
  if (kind === "rule") return `Same statutory rule: ${name}`;
  if (kind === "country") return `Same country: ${name}`;
  if (kind === "committee") return `Same joint committee: ${name}`;
  return `Same topic: ${name}`;
};

export function generateBulk() {
  const r = seeded(20260929);
  const pick = <T>(items: readonly T[]): T =>
    items[Math.floor(r() * items.length)] as T;
  const int = (min: number, max: number) =>
    min + Math.floor(r() * (max - min + 1));

  // People
  const people: Person[] = [];
  const usedNames = new Set<string>();
  const byDepartment = new Map<Department, Person[]>();
  const headcount = new Map<Department, number>();
  for (const [department, weight] of WEIGHTS) {
    headcount.set(department, Math.max(2, Math.round((weight / 100) * PEOPLE)));
  }
  for (const [department, count] of headcount) {
    const roles = ROLES[department] ?? ["Colleague"];
    for (let i = 0; i < count; i++) {
      let name = "";
      do {
        name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
      } while (usedNames.has(name));
      usedNames.add(name);
      const person: Person = {
        id: `p-bulk-${String(people.length + 1).padStart(3, "0")}`,
        name,
        role: roles[i % roles.length] as string,
        department,
      };
      people.push(person);
      byDepartment.set(department, [
        ...(byDepartment.get(department) ?? []),
        person,
      ]);
    }
  }

  // Nodes
  const nodes: NodeFixture[] = [];
  const tagsByNode: string[][] = [];
  const kindsByNode: (EdgeKind | undefined)[] = [];
  const members = new Map<string, number[]>();
  const start = Date.UTC(2025, 9, 1);
  const end = Date.UTC(2026, 8, 28);

  const integrationFor = (source: KnowledgeSource) =>
    source === "EMAIL"
      ? "i-outlook"
      : source === "MEETING"
        ? "i-teams-meetings"
        : pick(["i-slack", "i-slack", "i-teams"]);

  for (let i = 0; i < NODES; i++) {
    const department = weighted(r, WEIGHTS);
    const templates = TEMPLATES[department];
    const pool = byDepartment.get(department) ?? people;
    const a = pick(pool);
    const colleagues = [a];
    const extra = int(0, 2);
    for (let k = 0; k < extra; k++) {
      // Sometimes the conversation was with someone from another team.
      const other = r() < 0.4 ? pick(people) : pick(pool);
      if (!colleagues.includes(other)) colleagues.push(other);
    }
    const b = colleagues[1] ?? pick(pool);
    const month = int(0, 11);
    // The same pick or range inside one fact gives the same value, so a
    // summary and its full text always agree.
    const memo = new Map<string, unknown>();
    const same = <T>(key: string, make: () => T): T => {
      if (!memo.has(key)) memo.set(key, make());
      return memo.get(key) as T;
    };
    const gen: Gen = {
      pick: (items) => same(`p:${items.join("|")}`, () => pick(items)),
      int: (min, max) => same(`i:${min}:${max}`, () => int(min, max)),
      a: a.name,
      b: b.name,
      client: pick(CLIENTS),
      system: pick(SYSTEMS),
      country: pick(COUNTRIES),
      month: MONTHS[month] as string,
      nextMonth: MONTHS[(month + 1) % 12] as string,
      city: pick(CITIES),
      committee: pick(JOINT_COMMITTEES),
    };
    const template = pick(templates);
    const draft = template(gen);
    const isPublic = r() < 0.3;
    const day = new Date(start + r() * (end - start));
    const ownerIds = colleagues.map((p) => p.id);
    // Kobe and Filip also take part in some of their own team's
    // conversations. Both draws always happen, so the rest of the graph
    // doesn't depend on who joins.
    const withKobe = r() < 0.03;
    const withFilip = r() < 0.03;
    if (withKobe && department === "IT") ownerIds.push("p-kobe");
    if (withFilip && department === "PRODUCTION") ownerIds.push("p-filip");

    nodes.push({
      id: `n-bulk-${i + 1}`,
      title: draft.title,
      content: draft.content,
      contentSummary: draft.summary,
      source: draft.source,
      integrationId: integrationFor(draft.source),
      sourceDescription: draft.from,
      visibility: isPublic ? "PUBLIC" : "PRIVATE",
      ownerIds,
      createdAt: day.toISOString().slice(0, 10),
    });
    tagsByNode.push(draft.tags);
    kindsByNode.push(draft.kind);
    for (const tag of draft.tags) {
      members.set(tag, [...(members.get(tag) ?? []), i]);
    }
  }

  // Edges: facts that share a customer, system, rule or topic point at an
  // earlier fact. Picking early members more often grows hubs, as in a real
  // graph where many facts bear on the same contract or release.
  const edges: KnowledgeEdge[] = [];
  const seen = new Set<string>();
  const addEdge = (
    from: number,
    to: string,
    kind: EdgeKind,
    description: string,
  ) => {
    const sourceId = `n-bulk-${from + 1}`;
    const key = `${sourceId}:${to}`;
    if (sourceId === to || seen.has(key)) return false;
    seen.add(key);
    edges.push({
      id: `e-bulk-${edges.length + 1}`,
      sourceId,
      targetId: to,
      kind,
      description,
    });
    return true;
  };

  // Links into the hand-written graph.
  const anchors: Record<string, [string, string]> = {
    "client:Delvaux Logistics": [
      "n-kras-customer",
      "Same account team as Kras",
    ],
    "system:Payroll Cloud v3": ["n-v3-launch", "Part of the v3 work"],
    "system:Payroll API": ["n-api-oauth", "Uses the same API"],
    "rule:indexation": ["n-indexation-2027", "Indexation rules"],
    "topic:year-end": ["n-year-end-run", "Year-end processing"],
    "topic:cutoff": ["n-payroll-sla", "Cut-off feeds the SLA"],
  };

  const target = Math.round(NODES * EDGES_PER_NODE);
  let guard = 0;
  while (edges.length < target && guard < target * 20) {
    guard++;
    const from = Math.floor(r() * NODES);
    const tags = tagsByNode[from] ?? [];
    const roll = r();
    if (roll < 0.08 && tags.length > 0) {
      const tag = pick(tags);
      const anchor = anchors[tag];
      if (anchor) {
        addEdge(from, anchor[0], "RELATES_TO", anchor[1]);
        continue;
      }
    }
    if (roll < 0.85 && tags.length > 0) {
      const tag = pick(tags);
      const group = (members.get(tag) ?? []).filter((m) => m < from);
      if (group.length === 0) continue;
      const to = group[Math.floor(r() * r() * group.length)] as number;
      addEdge(
        from,
        `n-bulk-${to + 1}`,
        tag.startsWith("client:") || tag.startsWith("country:")
          ? "RELATES_TO"
          : (kindsByNode[from] ?? "RELATES_TO"),
        describe(tag),
      );
    } else if (from > 0) {
      // Cross-team links: a fact that builds on something unrelated by tag.
      const to = Math.floor(r() * from);
      addEdge(from, `n-bulk-${to + 1}`, "RELATES_TO", "Related work");
    }
  }

  return { people, nodes, edges };
}
