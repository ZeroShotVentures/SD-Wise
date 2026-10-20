"use client";

import { useSignOut } from "@/components/shell/sidebar";
import { secondaryButtonClass } from "./styles";

export function SignOut() {
  const { signingOut, handleSignOut } = useSignOut();

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={signingOut}
      className={secondaryButtonClass}
    >
      {signingOut ? "Signing out..." : "Sign out"}
    </button>
  );
}
