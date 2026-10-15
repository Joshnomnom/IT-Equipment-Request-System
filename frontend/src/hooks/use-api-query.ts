"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

export type QueryState<T> =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; data: T };

/**
 * Fetches `path` on mount (and whenever it changes) and exposes an explicit
 * loading / error / success state so every page renders all three.
 */
export function useApiQuery<T>(path: string) {
  const [state, setState] = useState<QueryState<T>>({ status: "loading" });

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      setState({ status: "success", data: await api<T>(path) });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setState({ status: "error", message });
    }
  }, [path]);

  useEffect(() => {
    void load();
  }, [load]);

  return { state, reload: load };
}
