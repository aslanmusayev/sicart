"use client";
// Demo mode for presentations where nobody can physically pick products up:
// the cart screen itself simulates its sensors. "Auto-shop" walks the route and drops every list item in,
// one shelf at a time, so the whole experience plays out hands-free on stage.
import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getShelf } from "@/lib/data/storeMap";
import { planRoute } from "@/lib/map/route";
import { sendAction } from "@/lib/session/client";
import type { SessionState } from "@/lib/session/types";

const STEP_MS = 1600;

/** What the cart's weight/vision sensors would report. */
export function pick(cartId: number, productId: string, qty = 1) {
  return sendAction(cartId, "add", { productId, qty }).catch(() => undefined);
}
export function drop(cartId: number, productId: string) {
  return sendAction(cartId, "remove", { productId }).catch(() => undefined);
}

export function DemoPilot({ state }: { state: SessionState }) {
  const [running, setRunning] = useState(false);
  const latest = useRef(state);
  useEffect(() => {
    latest.current = state;
  });

  useEffect(() => {
    if (!running) return;
    let cancelled = false;
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
    (async () => {
      while (!cancelled) {
        const s = latest.current;
        if (s.status !== "connected" && s.status !== "shopping") break;
        const open = s.list.filter((l) => !l.checked);
        if (!open.length) break;
        const stop = planRoute(s.position, open.map((l) => l.productId)).stops[0];
        if (!stop) break;
        // walk to the shelf (the avatar glides), then pick everything needed there
        const access = getShelf(stop.shelfId).access;
        if (s.position.x !== access.x || s.position.y !== access.y) {
          await sendAction(s.cartId, "position", { x: access.x, y: access.y }).catch(() => undefined);
          await wait(STEP_MS);
        }
        for (const id of stop.productIds) {
          if (cancelled) break;
          const item = latest.current.list.find((l) => l.productId === id);
          const inCart = latest.current.cart.find((l) => l.productId === id)?.qty ?? 0;
          await pick(s.cartId, id, Math.max(1, (item?.qty ?? 1) - inCart));
          await wait(STEP_MS * 0.6);
        }
      }
      if (!cancelled) setRunning(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [running]);

  const hasOpen = state.list.some((l) => !l.checked);
  if (!hasOpen && !running) return null;

  return (
    <button
      type="button"
      onClick={() => setRunning((r) => !r)}
      className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold shadow-soft transition active:scale-95 ${
        running ? "bg-brand-500 text-white" : "bg-surface text-ink"
      }`}
      title="Demo: the cart walks the route and picks up the list by itself"
    >
      {running ? <Pause size={15} /> : <Play size={15} />}
      {running ? "Stop" : "Auto-shop"}
    </button>
  );
}
