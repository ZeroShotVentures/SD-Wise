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

// Claude's reply when the facts don't answer the question.
const NO_ANSWER = "NO_ANSWER";

const RULES = `- Use only the facts below. Don't guess or add outside knowledge.
- When facts disagree, go with the most recent one and say what changed.
- Plain text, no markdown, no fact titles or ids.
- If the facts don't answer the question, reply with exactly ${NO_ANSWER}.`;

const ANSWER_SYSTEM = `You are SD Wise, the company brain of SD Worx. An employee asks a question, and you answer it from facts they are allowed to see: chats, emails, meetings and colleagues' answers. The facts are listed under your answer, so don't point to them.

- Lead with the answer, in 1 to 3 sentences.
${RULES}`;

const DRAFT_SYSTEM = `You are SD Wise, the company brain of SD Worx. A colleague sent an employee a question, and you draft the employee's reply from facts they know: their chats, emails, meetings and answers. The employee reviews the draft before sending it, so write it as they would: first person, friendly, to the point.

- Open with the greeting you're given, then answer in 1 to 4 sentences. No sign-off.
- The colleague may not be allowed to see these facts, so share only what answers the question.
${RULES}`;

// For questions no fact answers that need no company knowledge either, like
// the time or what SD Wise can do. Anything about the company stays NO_ANSWER,
// so Claude can't make up company facts.
const GENERAL_SYSTEM = `You are SD Wise, the company brain of SD Worx. An employee asks a question, and none of the company knowledge they can see answers it.

- Answer only if the question needs no knowledge of SD Worx, its people, customers, plans or policies: the date or time, a greeting, simple maths, or what you can do (answer questions from the company's chats, emails and meetings, and point to colleagues who know more).
- Lead with the answer, in 1 or 2 sentences. Plain text, no markdown.
- Otherwise, reply with exactly ${NO_ANSWER}.`;

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
    .map(
      (n) =>
        `<fact>\n${n.title} (${n.sourceDescription}, ${n.createdAt.slice(0, 10)})\n${n.content}\n</fact>`,
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

// null when the question needs company knowledge.
export function writeGeneral(question: string) {
  return write(
    "general answer",
    GENERAL_SYSTEM,
    `It is ${now()}.\n\nQuestion: ${question}`,
  );
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
