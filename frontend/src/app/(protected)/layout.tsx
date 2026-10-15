"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { MenuIcon } from "@/components/icons";
import { buttonStyles } from "@/components/page-layout";
import { Sidebar } from "@/components/sidebar";
import { FullPageSpinner } from "@/components/spinner";
import { useAuth } from "@/context/auth-context";

/** Every page in this route group requires a logged-in user. */
export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const { state, reload } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (state.status === "unauthenticated") router.replace("/login");
  }, [state.status, router]);

  if (state.status === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-4 text-center">
        <p className="text-red-700">Could not load your session: {state.message}</p>
        <button onClick={() => void reload()} className={buttonStyles.secondary}>
          Try again
        </button>
      </div>
    );
  }

  if (state.status !== "authenticated") return <FullPageSpinner />;

  return (
    <div className="min-h-screen">
      <Sidebar user={state.user} open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="lg:pl-64">
        {/* Mobile top bar (sidebar is hidden below lg) */}
        <div className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4 lg:hidden">
          <button
            onClick={() => setMenuOpen(true)}
            className="rounded p-1 text-slate-600 hover:bg-slate-100"
            aria-label="Open menu"
          >
            <MenuIcon />
          </button>
          <span className="text-sm font-semibold text-brand-900">IT Equipment Requisition</span>
        </div>

        <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
