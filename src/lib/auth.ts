import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

export function createAuth({ allowSignUp }: { allowSignUp: boolean }) {
  return betterAuth({
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,

    database: drizzleAdapter(db, {
      provider: "pg",
    }),

    session: {
      expiresIn: env.AUTH_SESSION_MAX_AGE,
      disableSessionRefresh: true,
    },

    emailAndPassword: {
      enabled: true,
      disableSignUp: !allowSignUp,
      minPasswordLength: 12,
      maxPasswordLength: 128,
    },

    disabledPaths: allowSignUp ? [] : ["/sign-up/email"],

    rateLimit: {
      enabled: true,
      storage: "database",
      modelName: "rateLimit",
      // V7: kunci `customRules` adalah path request; `window` dalam detik.
      customRules: {
        "/sign-in/email": {
          max: 5,
          window: 900,
        },
      },
    },

    advanced: {
      // V8 (PROVISIONAL): `ipAddress.ipAddressHeaders` belum terverifikasi
      // sebelum deploy; header IP Vercel akan ditentukan saat verifikasi deploy.
    },
  });
}

// Instance aplikasi: registrasi publik dinonaktifkan.
export const auth = createAuth({ allowSignUp: false });
