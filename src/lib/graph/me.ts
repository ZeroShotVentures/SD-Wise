import "server-only";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { personFor } from "./service";

// The Person linked to the signed-in (or impersonated) user. Accounts are
// created by `pnpm db:seed:demo` with a Person; any other account has no
// place in the graph.
export async function requirePerson() {
  const { user } = await requireSession();
  const person = await personFor(user.id);
  if (!person) notFound();
  return person;
}
