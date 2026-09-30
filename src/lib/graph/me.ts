import "server-only";
import { requireSession } from "@/lib/session";
import { personFor } from "./service";

// The Person behind the signed-in (or impersonated) user.
export async function requirePerson() {
  const { user } = await requireSession();
  return personFor(user);
}
