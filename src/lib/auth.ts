import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";
import { env } from "@/env";
import { roleFor } from "./admin-role";
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
  },
  user: {
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
      // Every user write (including the admin plugin's role endpoints) goes
      // through here, so the role can't drift from ADMIN_EMAILS. Writes through Prisma skip the hook and don't recurse.
      update: {
        after: async (user) => {
          const role = roleFor(user);
          if ((user as { role?: string | null }).role === role) return;
          await prisma.user.update({ where: { id: user.id }, data: { role } });
        },
      },
    },
  },
  // nextCookies must stay last so it sees cookies set by the other plugins.
  plugins: [admin({ impersonationSessionDuration: 60 * 60 }), nextCookies()],
});
