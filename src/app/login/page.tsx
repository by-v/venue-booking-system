"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, Input } from "@/components/ui";
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
      setServerError(
        error.status === 429
          ? "Terlalu banyak percobaan login. Silakan coba lagi nanti."
          : "Email atau password salah",
      );
      return;
    }

    router.push(resolveSafeRedirect(redirectParam));
  };

  return (
    <div className="flex flex-1 items-center justify-center bg-ivory px-6 py-16">
      <Card className="w-full max-w-sm">
        <h1 className="font-heading text-2xl font-semibold text-ink">
          Masuk Admin
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          H.A. Djunaid Convention Center
        </p>

        <form
          role="form"
          onSubmit={handleSubmit}
          className="mt-6 flex flex-col gap-4"
        >
          <Input
            label="Email"
            type="email"
            name="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
          />
          <Input
            label="Password"
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
          />
          {serverError ? (
            <span role="alert" className="text-xs text-red-600">
              {serverError}
            </span>
          ) : null}
          <Button type="submit">Login</Button>
        </form>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
