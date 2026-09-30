import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";
import { env } from "@/env";
import { roleFor } from "./admin-role";
import { sendEmail } from "./email";
import { emailEnabled } from "./features";
import { prisma } from "./prisma";

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  rateLimit: {
    storage: "database",
  },
  emailAndPassword: {
    enabled: true,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: emailEnabled
      ? async ({ user, url }) => {
          await sendEmail({
            to: user.email,
            subject: "Reset your password",
            text: `Click the link below to reset your password. It expires in 1 hour.\n\n${url}\n\nIf you didn't request this, you can ignore this email.`,
          });
        }
      : undefined,
  },
  emailVerification: emailEnabled
    ? {
        sendOnSignUp: true,
        autoSignInAfterVerification: true,
        sendVerificationEmail: async ({ user, url }) => {
          await sendEmail({
            to: user.email,
            subject: "Verify your email address",
            text: `Click the link below to verify your email address.\n\n${url}`,
          });
        },
      }
    : undefined,
  user: {
    changeEmail: {
      enabled: emailEnabled,
      sendChangeEmailConfirmation: async ({ user, newEmail, url }) => {
        await sendEmail({
          to: user.email,
          subject: "Confirm your email change",
          text: `Someone asked to change your email address to ${newEmail}. Click the link below to approve the change.\n\n${url}\n\nIf this wasn't you, ignore this email and change your password.`,
        });
      },
    },
    deleteUser: {
      enabled: true,
    },
  },
  // Database hooks (unlike user.deleteUser hooks) also run when an admin
  // removes a user.
  databaseHooks: {
    user: {
      create: {
        before: async (user) => ({ data: { role: roleFor(user) } }),
      },
      // Every user write (email verification, email change, the admin plugin's
      // role endpoints) goes through here, so the role can't drift from
      // ADMIN_EMAILS. Writes through Prisma skip the hook and don't recurse.
      update: {
        after: async (user) => {
          const role = roleFor(user);
          if ((user as { role?: string | null }).role === role) return;
          await prisma.user.update({ where: { id: user.id }, data: { role } });
        },
      },
    },
  },
  socialProviders:
    env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
          },
        }
      : undefined,
  // nextCookies must stay last so it sees cookies set by the other plugins.
  plugins: [admin({ impersonationSessionDuration: 60 * 60 }), nextCookies()],
});
