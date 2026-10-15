"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

export type QueryState<T> =
  | { status: "loading" }
  | { status: "error"; message: string }
  /** `refreshing`: a newer request is in flight; `data` is the previous result. */
  | { status: "success"; data: T; refreshing?: boolean };

/**
 * Fetches `path` on mount (and whenever it changes) and exposes an explicit
 * loading / error / success state so every page renders all three.
 * Pass `null` to skip the request (e.g. when the user's role doesn't need it).
 *
 * When the path changes after a successful load (new page, new filter), the
 * old data stays on screen marked `refreshing` instead of flashing a spinner.
 */
export function useApiQuery<T>(path: string | null) {
  const [state, setState] = useState<QueryState<T>>({ status: "loading" });
  // Responses can arrive out of order (fast typing in a search box);
  // only the most recent request is allowed to update the state.
  const latestRequest = useRef(0);

  const load = useCallback(async () => {
    if (path === null) return;
    const requestId = ++latestRequest.current;
    setState((prev) =>
      prev.status === "success" ? { ...prev, refreshing: true } : { status: "loading" },
    );
    try {
      const data = await api<T>(path);
      if (requestId === latestRequest.current) setState({ status: "success", data });
    } catch (error) {
      if (requestId !== latestRequest.current) return;
      const message = error instanceof Error ? error.message : "Unknown error";
      setState({ status: "error", message });
    }
  }, [path]);

  useEffect(() => {
    void load();
  }, [load]);

  return { state, reload: load };
}
