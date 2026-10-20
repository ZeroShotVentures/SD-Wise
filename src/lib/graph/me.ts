import "server-only";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { personFor } from "./service";

// The Person behind the signed-in (or impersonated) user. Every account is
// one person (`pnpm db:seed:accounts`), so this only fails when the user is
// gone.
export async function requirePerson() {
  const { user } = await requireSession();
  const person = await personFor(user.id);
  if (!person) notFound();
  return person;
}
