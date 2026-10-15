import { z } from "zod";

/**
 * Skema login bersama untuk klien dan server.
 *
 * Modul ini tidak bergantung pada API peramban maupun Node sehingga dapat
 * diimpor dari komponen klien (`/login`) maupun kode server.
 */
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email diperlukan")
    .email("Format email tidak valid"),
  password: z
    .string()
    .min(1, "Password diperlukan")
    .min(12, "Password minimal 12 karakter"),
});

export type LoginInput = z.infer<typeof loginSchema>;
