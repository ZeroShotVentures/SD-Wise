import "server-only";
import { generateText } from "ai";
import type { KnowledgeNode, Person } from "./types";

// Claude writes answers and drafted replies from facts the search found. It
// only ever sees facts the reader is allowed to see; the caller filters them.
// Runs through the Vercel AI Gateway: AI_GATEWAY_API_KEY, or the OIDC token
// on Vercel.
const MODEL = "anthropic/claude-sonnet-5.5";

// Short answers from a handful of facts: low effort keeps them fast.
const providerOptions = { anthropic: { effort: "low" } };

// Every call is bounded, so no question can hold a request open or run up
// the bill: the answers are a few sentences, and the prompt a few facts.
const MAX_OUTPUT_TOKENS = 600;
const TIMEOUT_MS = 30_000;
const MAX_RETRIES = 1;
const MAX_FACTS = 12;
const MAX_FACT_CHARS = 4_000;

const clip = (text: string) =>
  text.length > MAX_FACT_CHARS ? `${text.slice(0, MAX_FACT_CHARS)}…` : text;

// Claude's reply when the facts don't answer the question.
const NO_ANSWER = "NO_ANSWER";

const RULES = `- Use only the facts below. Don't guess or add outside knowledge.
- When facts disagree, go with the most recent one and say what changed.
- Plain text, no markdown, no fact titles or ids.`;

const ANSWER_SYSTEM = `You are SD Wise, the company brain of SD Worx. An employee asks a question, and you answer it from facts they are allowed to see: chats, emails, meetings and colleagues' answers. The facts are listed under your answer, so don't point to them.

- Lead with the answer, in 1 to 3 sentences.
${RULES}
- If the facts don't answer the question, reply with exactly ${NO_ANSWER}.`;

// A draft is only a starting point the employee edits, and an empty one is
// stored for good, so Claude drafts from whatever the facts do say.
const DRAFT_SYSTEM = `You are SD Wise, the company brain of SD Worx. A colleague sent an employee a question, and you draft the employee's reply from facts they know: their chats, emails, meetings and answers. The employee reviews the draft before sending it, so write it as they would: first person, friendly, to the point.

- Open with the greeting you're given, then answer in 1 to 4 sentences. No sign-off.
- The colleague may not be allowed to see these facts, so share only what answers the question.
${RULES}
- If the facts only partly answer the question, draft from what they do say; the employee fills in the rest.
- Reply with exactly ${NO_ANSWER} only when none of the facts is about the question.`;

// Starts Claude's reply when it can't help, so the card offers a colleague.
const CANT_HELP = "CANT_HELP";

// When it can't help and doesn't reply properly.
const CANT_HELP_TEXT =
  "I can't help you with that. You can ask a colleague with the button below.";

// For questions no fact answers. Claude answers the ones that need no company
// knowledge, like the time or what SD Wise can do, and says it can't help with
// the rest, so it can't make up company facts.
const GENERAL_SYSTEM = `You are SD Wise, the company brain of SD Worx. An employee asks a question, and none of the company knowledge they can see answers it.

- Answer only if the question needs no knowledge of SD Worx, its people, customers, plans or policies: the date or time, a greeting, simple maths, or what you can do (answer questions from the company's chats, emails and meetings, and point to colleagues who know more).
- Lead with the answer, in 1 or 2 sentences. Plain text, no markdown.
- Otherwise, reply with ${CANT_HELP} followed by one friendly sentence, in the question's language, saying you can't help with that and they can ask a colleague with the button below.`;

// SD Worx is in Belgium, so the time is Brussels time.
function now() {
  const time = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Europe/Brussels",
  }).format(new Date());
  return `${time} (Brussels time)`;
}

function promptFor(question: string, facts: KnowledgeNode[], extra = "") {
  const list = facts
    .slice(0, MAX_FACTS)
    .map(
      (n) =>
        `<fact>\n${n.title} (${n.sourceDescription}, ${n.createdAt.slice(0, 10)})\n${clip(n.contentSummary)}\n${clip(n.content)}\n</fact>`,
    )
    .join("\n");
  const today = new Date().toISOString().slice(0, 10);
  return `<facts>\n${list}\n</facts>\n\nToday is ${today}.${extra}\n\nQuestion: ${question}`;
}

// Logs why Claude wrote nothing, so a missing answer shows up in the Vercel
// logs. Facts and questions stay out of them: they may be private.
async function write(kind: string, system: string, prompt: string) {
  let result: Awaited<ReturnType<typeof generateText>>;
  try {
    result = await generateText({
      model: MODEL,
      providerOptions,
      system,
      prompt,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      maxRetries: MAX_RETRIES,
      timeout: { totalMs: TIMEOUT_MS },
    });
  } catch (error) {
    console.error(`Claude failed to write ${kind}`, error);
    throw error;
  }
  const answer = result.text.trim();
  if (!answer || answer.includes(NO_ANSWER)) {
    console.warn(
      `Claude wrote no ${kind}: ${answer ? NO_ANSWER : "empty reply"}`,
      { finishReason: result.finishReason, usage: result.usage },
    );
    return null;
  }
  return answer;
}

// null when the facts don't answer the question.
export function writeAnswer(question: string, facts: KnowledgeNode[]) {
  return write("answer", ANSWER_SYSTEM, promptFor(question, facts));
}

// Always has text. `answered` is false when Claude couldn't help, and the
// text then points to a colleague.
export async function writeGeneral(question: string) {
  const text = await write(
    "general answer",
    GENERAL_SYSTEM,
    `It is ${now()}.\n\nQuestion: ${question}`,
  );
  if (!text) return { text: CANT_HELP_TEXT, answered: false };
  if (!text.includes(CANT_HELP)) return { text, answered: true };
  const rest = text
    .replace(CANT_HELP, "")
    .replace(/^[\s:.-]+/, "")
    .trim();
  return { text: rest || CANT_HELP_TEXT, answered: false };
}

// The recipient's reply to `asker`, from facts the recipient can see. null
// when those facts don't answer the question.
export function writeDraft(
  question: string,
  asker: Person,
  facts: KnowledgeNode[],
) {
  const greeting = `Hi ${asker.name.split(" ")[0]}!`;
  return write(
    "draft",
    DRAFT_SYSTEM,
    promptFor(
      question,
      facts,
      ` The question is from ${asker.name} (${asker.role}). Greeting: "${greeting}"`,
    ),
  );
}
