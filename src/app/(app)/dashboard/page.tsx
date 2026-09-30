import type { Metadata } from "next";
import { Dashboard } from "@/components/dashboard";
import { emailEnabled } from "@/lib/features";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Dashboard" };

export default async function Page() {
  const { user } = await requireSession();

  return (
    <Dashboard
      user={{
        email: user.email,
        emailVerified: user.emailVerified,
      }}
      emailEnabled={emailEnabled}
    />
  );
}
