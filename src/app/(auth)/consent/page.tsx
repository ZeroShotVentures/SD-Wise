import { verifyOAuthQueryParams } from "@better-auth/oauth-provider";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ConsentForm } from "@/components/consent-form";
import { auth } from "@/lib/auth";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Allow access" };

// Better Auth sends an MCP client (Cursor, Claude) here during sign-in, with
// a signed query naming the client and the scopes it wants.
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { user } = await requireSession();
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    for (const v of [value ?? []].flat()) query.append(key, v);
  }
  const { secret } = await auth.$context;
  const clientId = query.get("client_id");
  if (!clientId || !(await verifyOAuthQueryParams(query.toString(), secret))) {
    notFound();
  }

  const client = await auth.api
    .getOAuthClientPublic({
      query: { client_id: clientId },
      headers: await headers(),
    })
    .catch(() => null);

  return (
    <ConsentForm
      clientName={client?.client_name ?? "An application"}
      email={user.email}
      scopes={(query.get("scope") ?? "").split(" ").filter(Boolean)}
    />
  );
}
