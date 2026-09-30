# SD Wise

**The company brain is bigger than its parts.**

## The idea

Company knowledge doesn't really live in documents, the file system or people's heads. Each of them holds a piece. SD Wise holds all of it.

SD Wise is the company's brain: one agent that can reach every bit of information the company has, public or private. Because it sees everything, it can connect things no single document, folder or employee could, and answer questions nobody could answer before.

Seeing everything doesn't mean showing everything. SD Wise knows who is allowed to read what, and every answer respects that.

## How a question is answered

You ask SD Wise a question. It then does three things.

1. **Find.** It searches all company knowledge, including the private parts, and connects every fact that helps answer the question.
2. **Check.** It sorts those facts into what you're allowed to see and what you aren't.
3. **Answer.** It answers with what you can see. For the rest, it tells you who knows more.

That gives one of three results:

- **You can see everything.** You get the full answer.
- **Someone else holds part of it.** You get what SD Wise can already tell you, plus a suggestion like *"Filip knows something related from an email"*. One click sends Filip your question, and SD Wise has already drafted a reply from what Filip can see. Filip checks it and sends it, or declines.
- **It's not for you.** You don't see it. In your graph it shows up as a locked fact: you know it exists and who owns it, but not what it says. You can request access, and the owner approves or declines.

When someone answers you, the answer becomes new knowledge: a new node in your graph, linked to the facts it came from.

### Facts, not guesses

Every fact, and who is allowed to see it, is stored in the database. SD Wise only answers with those stored facts and only follows those stored rights, so it can't make up an answer or hand out access that doesn't exist.

## How to test

### Accounts

Sign in with one of these two accounts:

| User | Email | Password | Role |
| --- | --- | --- | --- |
| Kobe | `kobe@sdwise.be` | `password123` | Platform lead |
| Filip | `filip@sdwise.be` | `password123` | Payroll operations lead |

### Walkthrough

1. Sign in as **Kobe**. Ask *"When is the payroll cut-off in December?"*, click **Ask Filip** and send.
2. Sign in as **Filip**. The question is in the inbox with a drafted answer; send it.
3. Still as **Filip**, ask *"Is there a deploy freeze over the holidays?"*, click **Ask Kobe** and send.
4. Sign in as **Kobe**. Answer from the inbox, and Filip sees the answer as a new node in his graph.
