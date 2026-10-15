"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { loginSchema } from "@/modules/auth/login-schema";
import { resolveSafeRedirect } from "@/modules/auth/resolve-safe-redirect";

type FieldErrors = { email?: string; password?: string };

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (field === "email") fieldErrors.email ??= issue.message;
        if (field === "password") fieldErrors.password ??= issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});

    const { error } = await authClient.signIn.email({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (error) {
      setServerError("Email atau password salah");
      return;
    }

    router.push(resolveSafeRedirect(redirectParam));
  };

  return (
    <form role="form" onSubmit={handleSubmit}>
      <input
        type="email"
        name="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        aria-label="Email"
      />
      {errors.email && <span role="alert">{errors.email}</span>}
      <input
        type="password"
        name="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        aria-label="Password"
      />
      {errors.password && <span role="alert">{errors.password}</span>}
      {serverError && <span role="alert">{serverError}</span>}
      <button type="submit">Login</button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
