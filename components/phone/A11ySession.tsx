"use client";
// Voice-first phone for visually impaired shoppers (PLAN.md flow 5): one huge push-to-talk surface,
// every change announced aloud with a vibration, turn-by-turn directions to the next item.
import { Accessibility, Nfc, Volume2 } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { getProduct } from "@/lib/data/catalog";
import { azn, spokenAzn } from "@/lib/format";
import { directionsTo } from "@/lib/map/directions";
import { planRoute } from "@/lib/map/route";
import { primeSpeech, speak, vibrate } from "@/lib/phone/speech";
import { totals } from "@/lib/session/totals";
import type { SessionState } from "@/lib/session/types";
import { VoiceDock } from "../voice/VoiceDock";

interface Props {
  state: SessionState;
  cartId: number;
  busy: boolean;
  onCheckout: () => void;
  onPay: () => void;
}

export function A11ySession({ state, cartId, busy, onCheckout, onPay }: Props) {
  const t = totals(state.cart);
  const open = state.list.filter((l) => !l.checked);
  const openKey = open.map((l) => l.productId).join(",");
  const { x, y } = state.position;
  const focusId = state.focus?.productId ?? null;

  const nextId = useMemo(() => {
    if (focusId) return focusId;
    const route = planRoute({ x, y }, openKey ? openKey.split(",") : []);
    return route.stops[0]?.productIds[0] ?? null;
  }, [x, y, openKey, focusId]);
  const steps = useMemo(() => (nextId ? directionsTo({ x, y }, nextId) : []), [x, y, nextId]);
  const nextName = nextId ? getProduct(nextId).name : null;
  const instruction = nextName
    ? `Next: ${nextName}. ${steps.join(" ")}`
    : "Your list is complete. Say checkout, or press the checkout button, when you are ready.";

  // Announce every change once (keyed by event time), with a vibration pattern per kind.
  const spoken = useRef<string | null>(null);
  const latest = useRef({ instruction, t, cartId, listSize: state.list.length, left: open.length });
  useEffect(() => {
    latest.current = { instruction, t, cartId, listSize: state.list.length, left: open.length };
  });
  const ev = state.lastEvent;
  useEffect(() => {
    if (!ev) return;
    const key = `${ev.type}-${ev.at}`;
    if (spoken.current === key) return;
    spoken.current = key;
    const now = latest.current;
    const name = ev.productId ? getProduct(ev.productId).name : "";
    switch (ev.type) {
      case "connected":
        vibrate(80);
        speak(`Connected to cart ${now.cartId}. You have ${now.listSize} items on your list. ${now.instruction}`);
        break;
      case "added":
        vibrate(60);
        speak(`Added ${name}. Total ${spokenAzn(now.t.total)}. ${now.left ? `${now.left} left on your list. ${now.instruction}` : "Your list is complete."}`);
        break;
      case "removed":
        vibrate([30, 60, 30]);
        speak(`Removed ${name}. Total ${spokenAzn(now.t.total)}.`);
        break;
      case "checkout":
        vibrate([40, 40, 40]);
        speak(`Your total is ${spokenAzn(now.t.total)}. Press the big button at the bottom to pay.`);
        break;
    }
  }, [ev]);

  return (
    <div className="flex flex-1 flex-col gap-4" onPointerDown={primeSpeech}>
      <header className="flex items-center justify-between">
        <div>
          <p className="text-lg text-ink-muted">Cart {cartId}</p>
          <p className="text-3xl font-bold">{state.profile?.name}</p>
        </div>
        <span className="flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-lg font-semibold text-white">
          <Accessibility size={22} aria-hidden /> Voice mode
        </span>
      </header>

      <section aria-live="polite" className="rounded-panel bg-ink p-6 text-white">
        {nextName ? (
          <>
            <p className="text-lg text-white/70">Next item</p>
            <p className="text-3xl font-bold leading-tight">{nextName}</p>
            <p className="mt-3 text-2xl leading-snug">{steps.join(" ")}</p>
          </>
        ) : (
          <p className="text-2xl font-bold">Your list is complete.</p>
        )}
        <button
          onClick={() => speak(instruction)}
          className="mt-5 flex w-full items-center justify-center gap-3 rounded-card bg-white py-4 text-xl font-bold text-ink"
        >
          <Volume2 size={26} aria-hidden /> Repeat directions
        </button>
      </section>

      {state.status === "checkout" ? (
        <button
          onClick={onPay}
          disabled={busy}
          className="flex min-h-[30vh] w-full flex-col items-center justify-center gap-3 rounded-panel bg-brand-600 text-white disabled:opacity-70"
        >
          <Nfc size={64} aria-hidden />
          <span className="text-4xl font-bold">Pay {azn(t.total)}</span>
          <span className="text-xl">Hold your phone near the cart</span>
        </button>
      ) : (
        <VoiceDock
          cartId={cartId}
          variant="giant"
          warm
          hint="Ask: where is the milk? · what's left on my list? · cheaper bread?"
        />
      )}

      <p className="text-center text-2xl font-semibold" aria-live="polite">
        {state.list.length - open.length} of {state.list.length} picked · {azn(t.total)}
      </p>

      {state.status !== "checkout" && (
        <button
          onClick={onCheckout}
          disabled={busy || state.cart.length === 0}
          className="w-full rounded-panel border-4 border-ink bg-surface py-6 text-2xl font-bold disabled:opacity-50"
        >
          Checkout · {azn(t.total)}
        </button>
      )}
    </div>
  );
}
