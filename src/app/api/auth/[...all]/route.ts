import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";
import { verifiedSession } from "@/lib/session";

const handler = toNextJsHandler(auth);

export async function GET(request: Request) {
  await verifiedSession(request.headers);
  return handler.GET(request);
}

export async function POST(request: Request) {
  await verifiedSession(request.headers);
  return handler.POST(request);
}
