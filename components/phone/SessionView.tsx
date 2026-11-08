"use client";
// Phone companion during a session: live total, list check-offs, cart, recommendation, checkout and "tap to pay".
import { AnimatePresence, motion } from "motion/react";
import { Check, Nfc, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getProduct } from "@/lib/data/catalog";
import { azn } from "@/lib/format";
import { setIdentity, useIdentity } from "@/lib/phone/identity";
import { useCartSnapshot } from "@/lib/realtime/useCartSnapshot";
import { sendAction } from "@/lib/session/client";
import { lineTotal, totals } from "@/lib/session/totals";
import { spring } from "@/lib/ui/motion";
import { Odometer } from "../ui/Odometer";
import { ProductArt } from "../ui/ProductArt";
import { VoiceDock } from "../voice/VoiceDock";
import { A11ySession } from "./A11ySession";
import { SoloDrawer } from "./SoloDrawer";

export function SessionView() {
  const router = useRouter();
  const params = useSearchParams();
  const identity = useIdentity();
  const cartId = Number(params.get("cart")) || identity?.cartId || 0;
  const { state, accept } = useCartSnapshot(cartId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [solo, setSolo] = useState(false);
  const soloTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const mine = !!state && !!identity && state.sessionId === identity.sessionId;

  // Paid: show the receipt.
  useEffect(() => {
    if (mine && state?.status === "paid" && state.receiptId) router.replace(`/app/receipt/${state.receiptId}`);
  }, [mine, state?.status, state?.receiptId, router]);

  async function act(action: "checkout" | "pay" | "resume") {
    setBusy(true);
    setError(null);
    try {
      if (action === "pay") navigator.vibrate?.([30, 50, 80]);
      accept(await sendAction(cartId, action));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  if (identity === undefined || !state) return <p className="m-auto text-ink-subtle">Connecting…</p>;

  if (!identity || !mine) {
    const ended = state.status === "idle";
    return (
      <div className="m-auto text-center">
        <p className="text-title font-semibold">{ended ? "Session ended" : "Cart in use"}</p>
        <p className="mt-2 text-ink-muted">
          {ended ? "Scan a cart to start again." : `Someone else is now shopping with Cart ${cartId}.`}
        </p>
        <Link href="/app" onClick={() => setIdentity(null)} className="mt-6 inline-block rounded-card bg-ink px-6 py-3 font-semibold text-white">
          Back to home
        </Link>
      </div>
    );
  }

  // Accessibility persona: voice-first phone with directions and spoken announcements.
  if (state.profile?.a11yMode) {
    return (
      <div data-a11y="true" className="-mx-5 -my-5 flex flex-1 flex-col bg-canvas px-5 py-5">
        <A11ySession state={state} cartId={cartId} busy={busy} onCheckout={() => act("checkout")} onPay={() => act("pay")} />
      </div>
    );
  }

  const t = totals(state.cart);
  const done = state.list.filter((l) => l.checked).length;
  const reco = state.recommendation;

  return (
    <>
      <header className="flex items-center justify-between">
        {/* long-press (hidden) opens the solo-presenter "drop into cart" drawer */}
        <div
          className="select-none"
          onPointerDown={() => {
            soloTimer.current = setTimeout(() => setSolo(true), 600);
          }}
          onPointerUp={() => clearTimeout(soloTimer.current)}
          onPointerLeave={() => clearTimeout(soloTimer.current)}
          onContextMenu={(e) => e.preventDefault()}
        >
          <p className="text-sm text-ink-muted">Cart {cartId}</p>
          <p className="text-lg font-semibold">{state.profile?.name}</p>
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700">
          <span className="size-2 rounded-full bg-brand-500" /> Connected
        </span>
      </header>

      <section className="mt-5 rounded-panel bg-ink p-5 text-white shadow-lift">
        <p className="text-white/70">Total · {t.items} {t.items === 1 ? "item" : "items"}</p>
        <Odometer value={t.total} className="mt-1 text-headline font-semibold" />
        {t.savings > 0 && <p className="mt-1 text-brand-300">You save {azn(t.savings)}</p>}
      </section>

      <AnimatePresence>
        {reco && (
          <motion.section
            key={reco.productId}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={spring.soft}
            className="mt-4 flex items-center gap-3 rounded-card border border-brand-200 bg-brand-50 p-3"
          >
            <ProductArt product={getProduct(reco.productId)} size={48} />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 text-xs font-medium text-brand-700">
                <Sparkles size={12} /> {reco.why}
              </p>
              <p className="truncate font-semibold">{getProduct(reco.productId).name}</p>
            </div>
            {reco.discountPct > 0 && <span className="rounded-full bg-brand-500 px-2 py-0.5 text-sm font-semibold text-white">−{reco.discountPct}%</span>}
          </motion.section>
        )}
      </AnimatePresence>

      {state.list.length > 0 && (
        <section className="mt-6">
          <div className="flex items-baseline justify-between">
            <h2 className="font-semibold">Your list</h2>
            <span className="text-sm text-ink-muted tabular-nums">
              {done} of {state.list.length}
            </span>
          </div>
          <ul className="mt-2 divide-y divide-line rounded-card bg-surface shadow-soft">
            {state.list.map((item) => (
              <li key={item.productId} className="flex items-center gap-3 px-4 py-3">
                <span className={`grid size-6 place-items-center rounded-full border-2 ${item.checked ? "border-brand-500 bg-brand-500 text-white" : "border-line"}`}>
                  {item.checked && <Check size={14} strokeWidth={3} />}
                </span>
                <span className={`flex-1 ${item.checked ? "text-ink-subtle line-through" : ""}`}>{getProduct(item.productId).name}</span>
                {item.qty > 1 && <span className="text-sm text-ink-muted">×{item.qty}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6 flex-1">
        <h2 className="font-semibold">In your cart</h2>
        {state.cart.length === 0 ? (
          <p className="mt-2 text-ink-subtle">Pick something up and it appears here.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            <AnimatePresence initial={false}>
              {[...state.cart].reverse().map((line) => {
                const p = getProduct(line.productId);
                return (
                  <motion.li
                    key={line.productId}
                    layout
                    initial={{ opacity: 0, y: -16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 40 }}
                    transition={spring.drop}
                    className="flex items-center gap-3 rounded-card bg-surface p-2 pr-3 shadow-soft"
                  >
                    <ProductArt product={p} size={44} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{p.name}</span>
                      <span className="block text-xs text-ink-muted">
                        {line.qty} × {azn(line.unitPrice)}
                        {line.discountPct > 0 && ` · −${line.discountPct}%`}
                      </span>
                    </span>
                    <span className="font-semibold tabular-nums">{azn(lineTotal(line))}</span>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </section>

      <div className="sticky bottom-0 -mx-5 mt-6 bg-gradient-to-t from-canvas via-canvas to-transparent px-5 pt-6">
        {state.status !== "checkout" && <VoiceDock cartId={cartId} variant="phone" warm={mine} className="mb-4" />}
        {error && <p className="mb-2 text-center text-sm text-danger">{error}</p>}
        {state.status === "checkout" ? (
          <>
            <motion.button
              onClick={() => act("pay")}
              disabled={busy}
              initial={{ scale: 0.96 }}
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 1.6, repeat: Infinity }}
              className="flex w-full items-center justify-center gap-3 rounded-panel bg-brand-500 py-6 text-xl font-semibold text-white shadow-glow disabled:opacity-70"
            >
              <Nfc size={28} /> Hold near the cart to pay
            </motion.button>
            <button onClick={() => act("resume")} disabled={busy} className="mt-3 w-full py-2 text-center font-medium text-ink-muted">
              Back to shopping
            </button>
          </>
        ) : (
          <button
            onClick={() => act("checkout")}
            disabled={busy || state.cart.length === 0}
            className="w-full rounded-panel bg-ink py-5 text-lg font-semibold text-white disabled:bg-line disabled:text-ink-subtle"
          >
            Checkout · {azn(t.total)}
          </button>
        )}
      </div>

      <SoloDrawer
        cartId={cartId}
        open={solo}
        onClose={() => setSolo(false)}
        suggested={state.list.filter((l) => !l.checked).map((l) => l.productId)}
      />
    </>
  );
}
