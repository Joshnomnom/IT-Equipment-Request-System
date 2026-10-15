"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Spinner } from "@/components/spinner";
import { useAuth } from "@/context/auth-context";

/**
 * Hides admin pages from employees. This is only UX — the real protection is
 * the backend's RolesGuard, which rejects non-admins on every /admin/* call.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  const { state } = useAuth();
  const router = useRouter();
  const isAdmin = state.status === "authenticated" && state.user.role === "ADMIN";

  useEffect(() => {
    if (state.status === "authenticated" && !isAdmin) router.replace("/equipment");
  }, [state.status, isAdmin, router]);

  if (!isAdmin) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }
  return <>{children}</>;
}
