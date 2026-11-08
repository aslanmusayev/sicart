"use client";
// Subscribes to Realtime channel `cart:{id}` and keeps the newest snapshot.
// Rules (PLAN.md R6): ignore snapshots older than the one we have, refetch the full snapshot on (re)subscribe,
// when the tab becomes visible again and when the network comes back.
import { useCallback, useEffect, useRef, useState } from "react";
import { browserClient } from "../supabase/browser";
import type { SessionState } from "../session/types";

export type LinkStatus = "connecting" | "live" | "offline";

export function useCartSnapshot(cartId: number) {
  const [state, setState] = useState<SessionState | null>(null);
  const [link, setLink] = useState<LinkStatus>("connecting");
  const version = useRef(-1);

  const accept = useCallback((next: SessionState) => {
    if (next.version < version.current) return;
    version.current = next.version;
    setState(next);
  }, []);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch(`/api/session/${cartId}`, { cache: "no-store" });
      if (res.ok) accept(await res.json());
    } catch {
      setLink("offline");
    }
  }, [accept, cartId]);

  useEffect(() => {
    const channel = browserClient()
      .channel(`cart:${cartId}`)
      .on("broadcast", { event: "snapshot" }, ({ payload }) => accept(payload as SessionState))
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setLink("live");
          void refetch();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setLink("offline");
        }
      });

    const onVisible = () => document.visibilityState === "visible" && void refetch();
    const onOnline = () => void refetch();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
      void browserClient().removeChannel(channel);
    };
  }, [accept, cartId, refetch]);

  /** `accept` lets a screen apply the snapshot returned by its own POST right away. */
  return { state, link, refetch, accept };
}
