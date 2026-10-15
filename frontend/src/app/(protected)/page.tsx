"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Spinner } from "@/components/spinner";
import { homePathFor, useAuth } from "@/context/auth-context";

/** "/" just forwards each role to its own home page. */
export default function HomePage() {
  const { state } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (state.status === "authenticated") router.replace(homePathFor(state.user));
  }, [state, router]);

  return (
    <div className="flex justify-center py-12">
      <Spinner />
    </div>
  );
}
