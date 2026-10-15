"use client";

import { createAuthClient } from "better-auth/react";

/**
 * Klien Better Auth untuk peramban (V10: `createAuthClient` dari
 * `better-auth/react`). Base URL default mengikuti origin halaman, sehingga
 * tidak ada rahasia server yang perlu diteruskan ke sisi klien.
 */
export const authClient = createAuthClient();
