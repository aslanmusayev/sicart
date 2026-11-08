"use client";
// "/app/connect?cart=12": pick a persona (or a 10-second guest profile) and connect to the cart.
import { motion } from "motion/react";
import { Accessibility, ChevronRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { DEMO_CART_ID } from "@/lib/data/ids";
import { PERSONAS, type PersonaKey } from "@/lib/data/personas";
import { initials } from "@/lib/format";
import { setIdentity } from "@/lib/phone/identity";
import { sendAction } from "@/lib/session/client";
import { spring } from "@/lib/ui/motion";

export function ConnectPicker() {
  const router = useRouter();
  const params = useSearchParams();
  const cartId = Number(params.get("cart")) || DEMO_CART_ID;
  const [busy, setBusy] = useState<string | null>(null);
  const [guestName, setGuestName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function connect(key: string, body: Record<string, unknown>, persona: PersonaKey | null) {
    setBusy(key);
    setError(null);
    try {
      const state = await sendAction(cartId, "connect", body);
      setIdentity({ cartId, sessionId: state.sessionId!, name: state.profile!.name, persona });
      navigator.vibrate?.(20);
      router.replace(`/app/session?cart=${cartId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not connect");
      setBusy(null);
    }
  }

  return (
    <>
      <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">Cart {cartId}</p>
      <h1 className="mt-1 text-title font-semibold">Who&apos;s shopping?</h1>
      <p className="mt-1 text-ink-muted">Your list and personal offers move to the cart.</p>

      <ul className="mt-6 space-y-3">
        {PERSONAS.map((p, i) => (
          <motion.li key={p.key} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring.soft, delay: i * 0.06 }}>
            <button
              onClick={() => connect(p.key, { persona: p.key }, p.key)}
              disabled={busy !== null}
              className="flex w-full items-center gap-4 rounded-card bg-surface p-4 text-left shadow-soft active:scale-[0.99] disabled:opacity-60"
            >
              <span className="grid size-14 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-xl font-semibold text-white">
                {initials(p.name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-lg font-semibold">
                  {p.name} {p.a11yMode && <Accessibility size={18} className="text-ink-muted" aria-label="Accessibility mode" />}
                </span>
                <span className="block text-sm text-ink-muted">{p.tagline}</span>
              </span>
              {busy === p.key ? <span className="size-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" /> : <ChevronRight className="text-ink-subtle" />}
            </button>
          </motion.li>
        ))}
      </ul>

      <form
        className="mt-8 rounded-card bg-surface p-4 shadow-soft"
        onSubmit={(e) => {
          e.preventDefault();
          void connect("guest", { guestName: guestName.trim() || "Guest" }, null);
        }}
      >
        <p className="font-semibold">New here?</p>
        <p className="text-sm text-ink-muted">Shop as a guest, just your first name.</p>
        <div className="mt-3 flex gap-2">
          <input
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            maxLength={24}
            placeholder="Your name"
            className="min-w-0 flex-1 rounded-tile border border-line px-4 py-3 text-base outline-none focus:border-brand-500"
          />
          <button disabled={busy !== null} className="rounded-tile bg-ink px-5 font-semibold text-white disabled:opacity-60">
            {busy === "guest" ? "…" : "Start"}
          </button>
        </div>
      </form>
      {error && <p className="mt-4 text-center text-danger">{error}</p>}
    </>
  );
}
