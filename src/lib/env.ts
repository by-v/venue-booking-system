import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, "BETTER_AUTH_SECRET minimal 32 karakter")
    .refine((value) => !value.toLowerCase().includes("change_me"), {
      message:
        "BETTER_AUTH_SECRET belum diganti: masih memuat placeholder CHANGE_ME dari .env.example",
    }),
  BETTER_AUTH_URL: z.string().url(),
  AUTH_SESSION_MAX_AGE: z.coerce.number().int().positive().default(604800),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export function parseEnv(source: Record<string, string | undefined>) {
  return envSchema.parse(source);
}

export const env = parseEnv(process.env);
