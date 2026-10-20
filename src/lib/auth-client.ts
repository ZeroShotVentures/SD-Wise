"use client";

import { oauthProviderClient } from "@better-auth/oauth-provider/client";
import { adminClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  // oauthProviderClient sends the signed OAuth query along with sign-in and
  // consent, so an MCP client's authorization resumes afterwards.
  plugins: [adminClient(), oauthProviderClient()],
});

export const {
  signIn,
  signOut,
  useSession,
  updateUser,
  changePassword,
  deleteUser,
  admin,
  oauth2,
} = authClient;
