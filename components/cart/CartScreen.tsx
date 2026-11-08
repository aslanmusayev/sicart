"use client";
// The screen mounted on the cart (tablet / laptop / projector, landscape).
// It only renders the latest server snapshot; the only things it sends are "checkout" and the auto "reset".
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { Volume2 } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { sound, unlockSound } from "@/lib/ui/sound";
import { useCartSnapshot } from "@/lib/realtime/useCartSnapshot";
import { sendAction } from "@/lib/session/client";
import { spring } from "@/lib/ui/motion";
import { Attract } from "./Attract";
import { CheckoutOverlay } from "./CheckoutOverlay";
import { Shopping } from "./Shopping";

const RESET_AFTER_PAID_MS = 10_000;
const noopSubscribe = () => () => {};

/** Where the QR code sends the phone. NEXT_PUBLIC_APP_URL wins unless it is a localhost URL the phone can't reach. */
function useConnectBase(appUrl: string): string | null {
  const origin = useSyncExternalStore(
    noopSubscribe,
    () => window.location.origin,
    () => null,
  );
  if (appUrl && !/localhost|127\.0\.0\.1/.test(appUrl)) return appUrl.replace(/\/$/, "");
  return origin;
}

export function CartScreen({ cartId, appUrl }: { cartId: number; appUrl: string }) {
  const { state, link } = useCartSnapshot(cartId);
  const base = useConnectBase(appUrl);
  const status = state?.status;
  const receiptId = state?.receiptId;

  // After payment, return to the attract screen by itself (PLAN.md flow 4).
  useEffect(() => {
    if (status !== "paid") return;
    const timer = setTimeout(() => void sendAction(cartId, "reset").catch(() => {}), RESET_AFTER_PAID_MS);
    return () => clearTimeout(timer);
  }, [status, receiptId, cartId]);

  // Sound needs one user gesture on the cart screen (tap, click or the Space bar).
  const [soundOn, setSoundOn] = useState(false);
  useEffect(() => {
    const on = () => {
      unlockSound();
      setSoundOn(true);
    };
    window.addEventListener("pointerdown", on, { once: true });
    window.addEventListener("keydown", on, { once: true });
    return () => {
      window.removeEventListener("pointerdown", on);
      window.removeEventListener("keydown", on);
    };
  }, []);

  // One cue per event; nothing for the snapshot the screen loaded with.
  const evType = state?.lastEvent?.type;
  const evKey = state?.lastEvent ? `${evType}-${state.lastEvent.at}` : null;
  const played = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (played.current === undefined) {
      if (state) played.current = evKey;
      return;
    }
    if (!evKey || played.current === evKey) return;
    played.current = evKey;
    if (evType === "added") sound.add();
    else if (evType === "removed") sound.remove();
    else if (evType === "connected") sound.connect();
    else if (evType === "checkout") sound.checkout();
    else if (evType === "paid") sound.paid();
  }, [evKey, evType, state]);

  const inSession = state && status !== "idle";

  return (
    <main
      className="relative h-dvh w-full overflow-hidden bg-canvas text-ink select-none"
      data-a11y={state?.profile?.a11yMode && status !== "idle" ? "true" : undefined}
    >
      {/* soft brand light in the background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 60% at 15% 10%, rgb(18 183 106 / 0.10), transparent 70%), radial-gradient(50% 50% at 90% 90%, rgb(18 183 106 / 0.08), transparent 70%)",
        }}
      />
      <LayoutGroup>
        <AnimatePresence mode="popLayout">
          {!state ? (
            <motion.div key="loading" className="grid h-full place-items-center text-ink-subtle" exit={{ opacity: 0 }}>
              Connecting to Cart {cartId}…
            </motion.div>
          ) : inSession ? (
            <motion.div
              key="session"
              className="relative h-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={spring.soft}
            >
              <Shopping state={state} />
            </motion.div>
          ) : (
            <motion.div
              key="attract"
              className="relative h-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={spring.soft}
            >
              <Attract cartId={cartId} connectUrl={base ? `${base}/app/connect?cart=${cartId}` : null} />
            </motion.div>
          )}
        </AnimatePresence>
      </LayoutGroup>

      <AnimatePresence>
        {state && (status === "checkout" || status === "paid") && <CheckoutOverlay key="checkout" state={state} />}
      </AnimatePresence>

      {!soundOn && state && (
        <span className="absolute bottom-4 right-4 flex items-center gap-2 rounded-full bg-surface/90 px-3 py-1.5 text-sm text-ink-subtle shadow-soft">
          <Volume2 size={14} /> Tap anywhere for sound
        </span>
      )}

      {link !== "live" && (
        <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full bg-surface/90 px-3 py-1.5 text-sm text-ink-muted shadow-soft">
          <span className={`size-2 rounded-full ${link === "offline" ? "bg-danger" : "bg-warning"}`} />
          {link === "offline" ? "Reconnecting…" : "Connecting…"}
        </div>
      )}
    </main>
  );
}
