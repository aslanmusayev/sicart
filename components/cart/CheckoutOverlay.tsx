"use client";
// Simulated NFC POS zone (PLAN.md flow 4): "Tap phone or card" -> ripple -> checkmark -> thank you + savings.
import { AnimatePresence, motion } from "motion/react";
import { Leaf, Nfc, ReceiptText, ShoppingBag, Timer } from "lucide-react";
import { useState } from "react";
import { azn } from "@/lib/format";
import { sendAction } from "@/lib/session/client";
import { totals } from "@/lib/session/totals";
import type { SessionState } from "@/lib/session/types";
import { spring } from "@/lib/ui/motion";
import { Odometer } from "../ui/Odometer";

/** Average checkout-queue wait we claim to remove (plan: "~9 min queue skipped"). */
export const QUEUE_MINUTES_SKIPPED = 9;

export function CheckoutOverlay({ state }: { state: SessionState }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function act(action: "pay" | "resume") {
    setBusy(true);
    setError(null);
    try {
      await sendAction(state.cartId, action); // the snapshot comes back over Realtime
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }
  const t = totals(state.cart);
  const paid = state.status === "paid";
  const name = state.profile?.name ?? "";

  return (
    <motion.div
      className="absolute inset-0 z-20 grid place-items-center bg-ink/25 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="glass w-[680px] max-w-[90vw] rounded-panel p-12 text-center shadow-lift"
        initial={{ scale: 0.92, y: 24 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0 }}
        transition={spring.soft}
      >
        <AnimatePresence mode="wait">
          {!paid ? (
            <motion.div key="pos" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
              <div className="relative mx-auto grid size-56 place-items-center">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="absolute inset-6 rounded-full border-2 border-brand-400"
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: [0.6, 1.5], opacity: [0.7, 0] }}
                    transition={{ duration: 2.1, repeat: Infinity, delay: i * 0.7, ease: "easeOut" }}
                  />
                ))}
                {/* the POS zone itself: tapping it on the cart's touchscreen = paying by card */}
                <button
                  type="button"
                  onClick={() => act("pay")}
                  disabled={busy}
                  aria-label="Pay by card"
                  className="relative grid size-28 place-items-center rounded-full bg-brand-500 text-white shadow-glow transition active:scale-95 disabled:opacity-70"
                >
                  <Nfc size={56} strokeWidth={1.8} />
                </button>
              </div>
              <h2 className="mt-6 text-headline font-semibold">Tap your phone or card</h2>
              <p className="mt-2 text-xl text-ink-muted">
                {t.items} {t.items === 1 ? "item" : "items"} · hold your phone near the cart
              </p>
              <Odometer value={t.total} className="mt-6 text-display font-semibold" />
              <p className="mt-4 text-ink-muted">Tap the green circle to pay by card</p>
              <button
                type="button"
                onClick={() => act("resume")}
                disabled={busy}
                className="mt-5 rounded-full border border-line bg-surface px-6 py-3 text-lg font-semibold text-ink shadow-soft active:scale-[0.98] disabled:opacity-60"
              >
                Back to shopping
              </button>
              {error && <p className="mt-3 text-danger">{error}</p>}
            </motion.div>
          ) : (
            <motion.div key="paid" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={spring.soft}>
              <svg viewBox="0 0 120 120" className="mx-auto size-36" aria-hidden>
                <motion.circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke="#12b76a"
                  strokeWidth="6"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
                <motion.path
                  d="M36 62 L53 78 L86 44"
                  fill="none"
                  stroke="#12b76a"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.45, delay: 0.5, ease: "easeOut" }}
                />
              </svg>
              <h2 className="mt-6 text-headline font-semibold">Thank you{name ? `, ${name}` : ""}!</h2>
              <p className="mt-2 text-xl text-ink-muted">Paid {azn(t.total)}. Your receipt is on your phone.</p>
              <div className="mt-8 grid grid-cols-3 gap-3">
                {t.savings > 0 ? (
                  <Stat icon={<Leaf size={22} />} value={azn(t.savings)} label="saved today" delay={0.8} />
                ) : (
                  <Stat icon={<ShoppingBag size={22} />} value={String(t.items)} label="items, no scanning" delay={0.8} />
                )}
                <Stat icon={<ReceiptText size={22} />} value="0" label="paper receipts" delay={0.9} />
                <Stat icon={<Timer size={22} />} value={`~${QUEUE_MINUTES_SKIPPED} min`} label="queue skipped" delay={1.0} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

function Stat({ icon, value, label, delay }: { icon: React.ReactNode; value: string; label: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring.soft, delay }}
      className="rounded-card bg-surface p-4 shadow-soft"
    >
      <span className="mx-auto grid size-10 place-items-center rounded-full bg-brand-50 text-brand-600">{icon}</span>
      <p className="mt-2 text-title font-semibold tabular-nums">{value}</p>
      <p className="text-sm text-ink-muted">{label}</p>
    </motion.div>
  );
}
