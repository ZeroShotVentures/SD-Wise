import "server-only";
import { personFor } from "@/lib/graph/service";
import { bearerToken, resolveToken } from "./tokens";

// The Person a request acts as, from its bearer token. Identity only ever
// comes from here, never from tool input.
export async function authenticate(request: Request) {
  const token = bearerToken(request);
  if (!token) return null;
  const userId = await resolveToken(token);
  return userId ? personFor(userId) : null;
}
