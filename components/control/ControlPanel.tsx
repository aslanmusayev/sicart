"use client";
// Demo Control: the hidden "sensor simulator" a friend operates on a second phone (PLAN.md Surfaces).
// Bare on purpose (Day 1); the polish pass comes later.
import { useMemo, useState, useSyncExternalStore } from "react";
import { CATALOG, getProduct } from "@/lib/data/catalog";
import { ZONES, isWalkable } from "@/lib/data/storeMap";
import { IsoMap } from "../map/IsoMap";
import type { ZoneId } from "@/lib/data/types";
import { azn, initials } from "@/lib/format";
import { useCartSnapshot } from "@/lib/realtime/useCartSnapshot";
import { ActionError, sendAction } from "@/lib/session/client";
import { totals } from "@/lib/session/totals";

const PIN_KEY = "sicart.control.pin";

// The PIN lives in localStorage (in memory when storage is blocked). Read through useSyncExternalStore so the
// server render (null = not loaded yet) and the first client render agree.
let memoryPin = "";
const pinListeners = new Set<() => void>();
const pinStore = {
  subscribe(listener: () => void) {
    pinListeners.add(listener);
    return () => void pinListeners.delete(listener);
  },
  get(): string {
    try {
      return localStorage.getItem(PIN_KEY) ?? memoryPin;
    } catch {
      return memoryPin;
    }
  },
  getServer(): string | null {
    return null;
  },
  set(pin: string) {
    memoryPin = pin;
    try {
      if (pin) localStorage.setItem(PIN_KEY, pin);
      else localStorage.removeItem(PIN_KEY);
    } catch {
      /* private mode: memory only */
    }
    pinListeners.forEach((l) => l());
  },
};

export function ControlPanel({ cartId }: { cartId: number }) {
  const pin = useSyncExternalStore(pinStore.subscribe, pinStore.get, pinStore.getServer);
  const [pinError, setPinError] = useState<string | null>(null);
  const { state, link, accept } = useCartSnapshot(cartId);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [zone, setZone] = useState<ZoneId | "all">("all");
  const [query, setQuery] = useState("");

  const products = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CATALOG.filter(
      (p) =>
        (zone === "all" || p.category === zone) &&
        (!q || p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q) || p.tags.some((t) => t.includes(q))),
    );
  }, [zone, query]);

  // Product taps fire immediately and may overlap: the server serialises them with its version check.
  // `busy` only locks the session-level buttons (connect, checkout, pay, reset).
  async function act(action: string, body: Record<string, unknown> = {}) {
    setBusy(true);
    try {
      accept(await sendAction(cartId, action, body, pin ?? ""));
    } catch (e) {
      if (e instanceof ActionError && e.status === 401) {
        pinStore.set("");
        setPinError("Wrong PIN");
      } else {
        setToast(e instanceof Error ? e.message : "Something went wrong");
        setTimeout(() => setToast(null), 2500);
      }
    } finally {
      setBusy(false);
    }
  }

  if (pin === null) return <main className="min-h-dvh bg-neutral-50" />;
  if (!pin) return <PinGate error={pinError} onSubmit={(p) => (pinStore.set(p), setPinError(null))} />;

  const t = state ? totals(state.cart) : null;
  const qtyOf = (id: string) => state?.cart.find((l) => l.productId === id)?.qty ?? 0;

  return (
    <main className="mx-auto min-h-dvh max-w-xl bg-neutral-50 pb-24 text-neutral-900">
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Demo Control · Cart {cartId}</p>
            <p className="text-lg font-semibold">
              {state?.profile ? state.profile.name : "No shopper"}{" "}
              <span className="text-sm font-normal text-neutral-500">{state?.status ?? "…"}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold tabular-nums">{t ? azn(t.total) : "—"}</p>
            <p className="flex items-center justify-end gap-1.5 text-xs text-neutral-500">
              <span className={`size-2 rounded-full ${link === "live" ? "bg-emerald-500" : link === "offline" ? "bg-red-500" : "bg-amber-400"}`} />
              {link} · v{state?.version ?? "–"}
            </p>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-3 gap-2 px-4 pt-4">
        <Btn onClick={() => act("connect", { persona: "aysel" })} disabled={busy}>Aysel</Btn>
        <Btn onClick={() => act("connect", { persona: "murad" })} disabled={busy}>Murad</Btn>
        <Btn onClick={() => act("connect", { guestName: "Guest" })} disabled={busy}>Guest</Btn>
        <Btn onClick={() => act("scenario", { name: "aysel-midshop" })} disabled={busy}>Mid-shop</Btn>
        <Btn onClick={() => act("checkout")} disabled={busy}>Checkout</Btn>
        <Btn onClick={() => act("pay")} disabled={busy} tone="accent">POS tap</Btn>
        <Btn onClick={() => act("reset")} disabled={busy} tone="danger" className="col-span-3">Reset cart</Btn>
      </section>

      {state && state.status !== "idle" && <CommandBox cartId={cartId} pin={pin} />}

      {state && state.status !== "idle" && (
        <section className="px-4 pt-5">
          <h2 className="mb-2 text-sm font-semibold text-neutral-500">Map · tap the floor to move the cart</h2>
          <div className="rounded-2xl bg-white p-1 shadow-sm">
            <IsoMap
              position={state.position}
              onCellClick={(cell) =>
                isWalkable(cell.x, cell.y)
                  ? void act("position", { x: cell.x, y: cell.y })
                  : (setToast("That spot is a shelf or a wall"), setTimeout(() => setToast(null), 1800))
              }
            />
          </div>
        </section>
      )}

      {state && state.cart.length > 0 && (
        <section className="px-4 pt-5">
          <h2 className="mb-2 text-sm font-semibold text-neutral-500">In the cart · {t?.items} items</h2>
          <ul className="divide-y divide-neutral-200 rounded-2xl bg-white shadow-sm">
            {state.cart.map((line) => {
              const p = getProduct(line.productId);
              return (
                <li key={line.productId} className="flex items-center gap-3 px-3 py-2">
                  <span className="w-6 text-right text-sm font-semibold tabular-nums">{line.qty}×</span>
                  <span className="flex-1 truncate text-sm">{p.name}</span>
                  {line.discountPct > 0 && <span className="text-xs font-semibold text-emerald-600">−{line.discountPct}%</span>}
                  <button
                    className="size-8 rounded-full bg-neutral-100 text-lg leading-none active:bg-neutral-200"
                    onClick={() => act("remove", { productId: line.productId })}
                    aria-label={`Remove one ${p.name}`}
                  >
                    −
                  </button>
                </li>
              );
            })}
          </ul>
          {state.recommendation && (
            <p className="mt-2 text-xs text-neutral-500">
              Recommending {getProduct(state.recommendation.productId).name}: “{state.recommendation.why}”
            </p>
          )}
        </section>
      )}

      <section className="px-4 pt-5">
        <input
          className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-base outline-none focus:border-emerald-500"
          placeholder="Search products"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {/* contain: inline-size stops the chip row's min-content width from widening the mobile layout viewport */}
        <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [contain:inline-size]">
          {[{ id: "all" as const, label: "All" }, ...ZONES].map((z) => (
            <button
              key={z.id}
              onClick={() => setZone(z.id)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${zone === z.id ? "bg-neutral-900 text-white" : "bg-white text-neutral-700 shadow-sm"}`}
            >
              {z.label}
            </button>
          ))}
        </div>
        <ul className="mt-3 grid grid-cols-2 gap-2">
          {products.map((p) => {
            const qty = qtyOf(p.id);
            return (
              <li key={p.id}>
                <button
                  onClick={() => act("add", { productId: p.id })}
                  className="relative flex w-full items-center gap-2 rounded-2xl bg-white p-2 text-left shadow-sm active:scale-[0.98]"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-sm font-semibold text-emerald-700">
                    {initials(p.name)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{p.name}</span>
                    <span className="block truncate text-xs text-neutral-500">
                      {p.brand} · {azn(p.price)}
                    </span>
                  </span>
                  {qty > 0 && (
                    <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-emerald-500 text-xs font-semibold text-white">
                      {qty}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {toast && (
        <div role="status" className="fixed inset-x-4 bottom-4 mx-auto max-w-md rounded-xl bg-neutral-900 px-4 py-3 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </main>
  );
}

function Btn({
  tone = "plain",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "plain" | "accent" | "danger" }) {
  const tones = {
    plain: "bg-white text-neutral-900 shadow-sm active:bg-neutral-100",
    accent: "bg-emerald-500 text-white active:bg-emerald-600",
    danger: "bg-red-50 text-red-700 active:bg-red-100",
  };
  return (
    <button
      {...props}
      className={`rounded-xl px-3 py-3 text-sm font-semibold disabled:opacity-60 ${tones[tone]} ${className}`}
    />
  );
}

/** Typed-command fallback (PLAN.md R2): same assistant and tools as voice, for a noisy hall. */
function CommandBox({ cartId, pin }: { cartId: number; pin: string }) {
  const [text, setText] = useState("");
  const [reply, setReply] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    setReply(null);
    try {
      const res = await fetch("/api/command", {
        method: "POST",
        headers: { "content-type": "application/json", "x-demo-pin": pin },
        body: JSON.stringify({ cartId, text }),
      });
      const json = await res.json();
      setReply(res.ok ? json.reply : `⚠ ${json.error ?? "Failed"}`);
      if (res.ok) setText("");
    } catch {
      setReply("⚠ Network problem");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="px-4 pt-5">
      <h2 className="mb-2 text-sm font-semibold text-neutral-500">Type a command (voice fallback)</h2>
      <form onSubmit={send} className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="I'm cooking carbonara for 4"
          className="min-w-0 flex-1 rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-base outline-none focus:border-emerald-500"
        />
        <button disabled={sending} className="rounded-xl bg-neutral-900 px-4 font-semibold text-white disabled:opacity-60">
          {sending ? "…" : "Send"}
        </button>
      </form>
      {reply && <p className="mt-2 rounded-xl bg-white p-3 text-sm shadow-sm">{reply}</p>}
    </section>
  );
}

function PinGate({ error, onSubmit }: { error: string | null; onSubmit: (pin: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <main className="grid min-h-dvh place-items-center bg-neutral-50 px-6">
      <form
        className="w-full max-w-xs space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim()) onSubmit(value.trim());
        }}
      >
        <h1 className="text-center text-lg font-semibold">Demo Control</h1>
        <input
          className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-3 text-center text-2xl tracking-[0.5em] outline-none focus:border-emerald-500"
          inputMode="numeric"
          autoComplete="off"
          placeholder="PIN"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
        />
        {error && <p className="text-center text-sm text-red-600">{error}</p>}
        <button className="w-full rounded-xl bg-neutral-900 py-3 font-semibold text-white">Open</button>
      </form>
    </main>
  );
}
