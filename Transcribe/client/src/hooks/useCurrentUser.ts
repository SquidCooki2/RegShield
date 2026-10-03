import { useCallback, useEffect, useState } from "react";
import type { UserProfile } from "@/types";

export type UserState =
  | { status: "loading" }
  | { status: "ready"; user: UserProfile }
  | { status: "unauthenticated" }
  | { status: "error"; message: string };

/** Loads the signed-in user from GET /api/me (cookie session). */
export function useCurrentUser() {
  const [state, setState] = useState<UserState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });

    (async () => {
      try {
        const res = await fetch("/api/me", {
          credentials: "include",
          signal: controller.signal,
        });
        if (res.status === 401) {
          setState({ status: "unauthenticated" });
          return;
        }
        if (!res.ok) throw new Error(`Profile request failed (${res.status})`);

        const user = (await res.json()) as UserProfile;
        if (!user?.id || !Array.isArray(user.roles) || user.roles.length === 0) {
          throw new Error("The profile is missing an id or roles.");
        }
        setState({ status: "ready", user });
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setState({ status: "error", message: (err as Error).message });
      }
    })();

    return () => controller.abort();
  }, [attempt]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  return { state, retry };
}