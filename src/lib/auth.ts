import { cimd } from "@better-auth/cimd";
import { fetchClientMetadataResource } from "@better-auth/cimd/node";
import { mcp } from "@better-auth/mcp";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { admin, jwt } from "better-auth/plugins";
import { env } from "@/env";
import { roleFor } from "./admin-role";
import { prisma } from "./prisma";

// The MCP server (src/app/api/mcp/route.ts). Access tokens are bound to it.
export const mcpResource = `${env.BETTER_AUTH_URL}/api/mcp`;
const mcpScopes = ["openid", "profile", "email", "offline_access"];

// The person a user being deleted was, keyed by the user object better-auth
// passes to both delete hooks. Hook users only carry better-auth's own fields.
const deletingPerson = new WeakMap<object, string>();

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  // The JWT plugin's session-to-JWT endpoint isn't used; the OAuth provider
  // issues the tokens.
  disabledPaths: ["/token"],
  rateLimit: {
    storage: "database",
  },
  // Accounts are created by `pnpm db:seed:demo` (or by an admin), not by
  // signing up.
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
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
      // The user row only cascades to sessions and tokens. Deleting the person
      // also removes their questions, answers and access to facts.
      delete: {
        before: async (user) => {
          const row = await prisma.user.findUnique({
            where: { id: user.id },
            select: { personId: true },
          });
          if (row) deletingPerson.set(user, row.personId);
        },
        after: async (user) => {
          const personId = deletingPerson.get(user);
          if (!personId) return;
          await prisma.person.deleteMany({
            where: { id: { equals: personId } },
          });
        },
      },
    },
  },
  // nextCookies must stay last so it sees cookies set by the other plugins.
  plugins: [
    admin({ impersonationSessionDuration: 60 * 60 }),
    // Signs the MCP access tokens and serves /jwks to verify them.
    jwt(),
    // OAuth provider for MCP clients (Cursor, Claude): they discover it from
    // /.well-known/oauth-protected-resource, sign the user in and get a token
    // bound to mcpResource.
    mcp({
      loginPage: "/sign-in",
      consentPage: "/consent",
      resource: mcpResource,
      scopes: mcpScopes,
      // Prisma can't store a resource without allowedScopes.
      resources: [{ identifier: mcpResource, allowedScopes: mcpScopes }],
      // Cursor and older Claude Code still register through DCR instead of
      // Client ID Metadata Documents, and omit application_type.
      allowDynamicClientRegistration: true,
      allowUnauthenticatedClientRegistration: true,
      clientRegistrationDefaultApplicationType: "infer",
    }),
    cimd({ fetchClientMetadataResource, metadataProfile: "mcp-2026-07-28" }),
    nextCookies(),
  ],
});
