"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Navbar } from "@/components/navbar";
import { FullPageSpinner } from "@/components/spinner";
import { useAuth } from "@/context/auth-context";

/** Every page in this route group requires a logged-in user. */
export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const { state, reload } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (state.status === "unauthenticated") router.replace("/login");
  }, [state.status, router]);

  if (state.status === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-4 text-center">
        <p className="text-red-700">Could not load your session: {state.message}</p>
        <button
          onClick={() => void reload()}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
        >
          Try again
        </button>
      </div>
    );
  }

  if (state.status !== "authenticated") return <FullPageSpinner />;

  return (
    <>
      <Navbar user={state.user} />
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </>
  );
}
