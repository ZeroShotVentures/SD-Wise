# SD Wise

**The company brain is bigger than its parts.**

## The idea

Company knowledge doesn't really live in documents, the file system or people's heads. Each of them holds a piece. SD Wise holds all of it.

SD Wise is the company's brain: one agent that can reach every bit of information the company has, public or private. Because it sees everything, it can connect things no single document, folder or employee could, and answer questions nobody could answer before.

Seeing everything doesn't mean showing everything. SD Wise knows who is allowed to read what, and every answer respects that.

## How a question is answered

A user asks SD Wise a question. Five subsystems handle it in turn.

1. **Connect.** Subsystem 1 searches all company knowledge, private included, and connects every relevant and useful point of knowledge to the question.
2. **Split by rights.** Subsystem 2 checks the asker's rights on each of those points and splits them into *accessible* and *not accessible*.
3. **Decide.** Subsystem 3 decides how to answer. There are three outcomes:

   | Case | Situation | What SD Wise does |
   | --- | --- | --- |
   | **A** | Everything needed is accessible | **Subsystem 4** answers directly with the knowledge it has. |
   | **B** | Some knowledge requires access | **Subsystem 5** sends a request to the person who holds it (person X), with the question and a proposed answer that would apply once access is given. If a first answer without that knowledge is already useful, the asker gets it right away. |
   | **C** | Not accessible and clearly not authorized | **Subsystem 3** says no. |

```
question
   │
   ▼
[1] connect all relevant knowledge  (sees everything, private included)
   │
   ▼
[2] split by rights ──► accessible / not accessible
   │
   ▼
[3] decide
   ├── A: all accessible      ──► [4] answer
   ├── B: access required      ──► [5] ask person X, with a drafted answer
   │                                   (+ a first answer from what is accessible)
   └── C: clearly not allowed  ──► no
```

### Facts, not guesses

The database holds every data point and its access rights as facts. Answers are built from those stored facts, and access decisions come from stored rights, so SD Wise can't hallucinate an answer or a permission. When a person answers a request, their answer is stored as a new fact and appears as a new node in the asker's knowledge graph.

The search behind subsystems 1 and 2 is described in [`docs/node-finding.md`](docs/node-finding.md).

## How to test

### Accounts

Sign-up is disabled. There are two accounts:

| User | Email | Password | Role |
| --- | --- | --- | --- |
| Kobe | `kobe@sdwise.be` | `password123` | Platform lead |
| Filip | `filip@sdwise.be` | `password123` | Payroll operations lead |

### Walkthrough

1. Sign in as **Kobe**. Ask *"When is the payroll cut-off in December?"*, click **Ask Filip** and send.
2. Sign in as **Filip**. The question is in the inbox with a drafted answer; send it.
3. Still as **Filip**, ask *"Is there a deploy freeze over the holidays?"*, click **Ask Kobe** and send.
4. Sign in as **Kobe**. Answer from the inbox, and Filip sees the answer as a new node in his graph.

To start again from an empty inbox, run `pnpm db:seed:demo --reset`.

## Running it locally

Requires Node.js 24 (see `.nvmrc`), pnpm and Docker.

```bash
pnpm install
pnpm db:up             # start Postgres in Docker
pnpm db:migrate        # apply migrations
pnpm db:seed:demo      # create Kobe and Filip, their people and demo questions
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Local development works without any `.env`: `.env.example` supplies the defaults. All environment variables are declared and validated in `src/env.ts`.

> [!WARNING]
> `pnpm db:seed:demo` deletes every account other than Kobe and Filip.

### What is real and what is mocked

- **Real (Postgres):** accounts, the person behind each account, and questions, answers and access requests between people.
- **Mocked:** the knowledge graph and integrations (`src/lib/graph/fixtures.ts`). Answers stored in the database are layered onto this graph on every read.

## Stack

Next.js 16 (App Router), React 19, Tailwind CSS 4, Better Auth, Prisma 7 on PostgreSQL, Vitest, oxlint and Biome.

## Scripts

| Script | Description |
| --- | --- |
| `pnpm dev` | Start the dev server |
| `pnpm build` / `pnpm start` | Production build / serve |
| `pnpm lint` / `pnpm fix` | Lint and format check / auto-fix |
| `pnpm typecheck` | Generate the Prisma client and run `tsc` |
| `pnpm test` | Run unit tests |
| `pnpm db:up` / `pnpm db:down` | Start / stop Postgres |
| `pnpm db:migrate` | Create and apply a migration (dev) |
| `pnpm db:deploy` | Apply pending migrations (production) |
| `pnpm db:seed:demo` | Create the demo accounts and questions. `--reset` clears questions first |
| `pnpm db:studio` | Open Prisma Studio |

## Project structure

```
prisma/              database schema, migrations and seed scripts
src/
  app/(auth)/        sign-in
  app/(app)/         graph, inbox, integrations, settings, admin
  lib/graph/         knowledge graph, access rules and questions
  lib/               auth, sessions, Prisma client
docs/                design notes
marketing/           promo and explainer videos
```
