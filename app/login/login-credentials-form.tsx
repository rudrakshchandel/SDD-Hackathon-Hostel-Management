"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginCredentialsForm() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await signIn("credentials", {
        username,
        password,
        redirect: false,
        callbackUrl: "/dashboard"
      });

      if (response?.error) {
        setError("Invalid username or password.");
        return;
      }

      router.push(response?.url || "/dashboard");
      router.refresh();
    } catch {
      setError("Sign in failed unexpectedly. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-3" onSubmit={onSubmit}>
      <div className="space-y-1">
        <label className="text-xs uppercase tracking-[0.12em] text-slate-600">
          Username
        </label>
        <input
          type="text"
          autoComplete="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          className="min-h-11 w-full rounded-xl px-3 py-2 text-sm"
          placeholder="admin"
          required
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs uppercase tracking-[0.12em] text-slate-600">
          Password
        </label>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="min-h-11 w-full rounded-xl px-3 py-2 text-sm"
          placeholder="admin"
          required
        />
      </div>
      {error ? (
        <div className="rounded-xl border border-rose-300/70 bg-rose-100/70 p-3 text-sm text-rose-900">
          {error}
        </div>
      ) : null}
      <button
        type="submit"
        disabled={isSubmitting}
        className="glass-btn-primary inline-flex min-h-11 w-full items-center justify-center rounded-xl px-4 py-2 text-sm font-medium"
      >
        {isSubmitting ? "Signing in..." : "Sign In"}
      </button>
    </form>
  );
}
