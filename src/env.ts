import { createEnv } from "@t3-oss/env-nextjs";
import { config } from "dotenv";
import { z } from "zod";

// Committed defaults. Never overrides variables that are already set (.env, .env.local, host env).
config({ path: ".env.example", quiet: true });

const authSecret = z.string().min(32);

export const env = createEnv({
  server: {
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    DATABASE_URL: z.url(),
    BETTER_AUTH_SECRET:
      process.env.NODE_ENV === "production"
        ? authSecret
        : authSecret.default("dev-only-secret-never-use-in-production"),
    BETTER_AUTH_URL: z.url(),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    ADMIN_EMAILS: z
      .string()
      .optional()
      .transform((value) =>
        (value ?? "")
          .split(",")
          .map((email) => email.trim().toLowerCase())
          .filter(Boolean),
      )
      .pipe(z.array(z.email())),
  },
  client: {},
  experimental__runtimeEnv: {},
  emptyStringAsUndefined: true,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  createFinalSchema: (shape) =>
    z.object(shape).superRefine((values, ctx) => {
      if (!values.GOOGLE_CLIENT_ID !== !values.GOOGLE_CLIENT_SECRET) {
        const missing = values.GOOGLE_CLIENT_ID
          ? "GOOGLE_CLIENT_SECRET"
          : "GOOGLE_CLIENT_ID";
        ctx.addIssue({
          code: "custom",
          path: [missing],
          message: "Set both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET",
        });
      }
    }),
});
