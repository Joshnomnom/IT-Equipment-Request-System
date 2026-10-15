"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { buttonStyles } from "@/components/page-layout";
import { Spinner } from "@/components/spinner";
import { homePathFor, useAuth } from "@/context/auth-context";
import { ApiError } from "@/lib/api";

const TEST_ACCOUNTS = [
  { label: "Administrator", email: "admin@example.com" },
  { label: "Employee", email: "employee@example.com" },
];

const INPUT_CLASS =
  "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100";

export default function LoginPage() {
  const { state, login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Already logged in (e.g. opened /login in a new tab) → go home.
  useEffect(() => {
    if (state.status === "authenticated") router.replace(homePathFor(state.user));
  }, [state, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await login({ email, password });
      router.replace(homePathFor(user));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed");
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen">
      {/* Brand panel */}
      <div className="hidden w-[45%] flex-col justify-between bg-brand-900 p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-md border border-white/20 bg-brand-700 font-bold tracking-wider">
            IT
          </div>
          <div>
            <p className="font-semibold leading-tight">IT Equipment</p>
            <p className="text-sm leading-tight text-slate-400">Requisition System</p>
          </div>
        </div>
        <div>
          <h1 className="text-3xl font-semibold leading-snug">
            IT Equipment Requisition
            <br />
            and Approval System
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-400">
            Submit requests for monitors, keyboards and other IT equipment, and track
            their approval status in one place.
          </p>
        </div>
        <p className="text-xs text-slate-500">For internal use by authorised personnel only.</p>
      </div>

      {/* Sign-in form */}
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-semibold text-slate-900">Sign in</h2>
          <p className="mt-1 text-sm text-slate-500">Use your organisation account.</p>

          <form
            onSubmit={handleSubmit}
            className="mt-8 space-y-5 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
          >
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Email address</span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={INPUT_CLASS}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Password</span>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={INPUT_CLASS}
              />
            </label>

            {error && (
              <p
                role="alert"
                className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                {error}
              </p>
            )}

            <button type="submit" disabled={submitting} className={`${buttonStyles.primary} w-full`}>
              {submitting && <Spinner className="h-4 w-4 border-white/40 border-t-white" />}
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className="mt-6 rounded-lg border border-dashed border-slate-300 p-4 text-xs text-slate-500">
            <p className="font-medium text-slate-600">Test accounts (password: password123)</p>
            <div className="mt-2 flex gap-2">
              {TEST_ACCOUNTS.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => {
                    setEmail(account.email);
                    setPassword("password123");
                  }}
                  className="rounded border border-slate-300 bg-white px-2 py-1 hover:bg-slate-50"
                >
                  {account.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
