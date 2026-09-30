"use client";

import { adminClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  plugins: [adminClient()],
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  requestPasswordReset,
  resetPassword,
  sendVerificationEmail,
  updateUser,
  changeEmail,
  changePassword,
  deleteUser,
  admin,
} = authClient;
