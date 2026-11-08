"use client";
// "/app/list": plan the shopping list at home. It is saved to the shopper's profile and moves to the cart
// automatically when they scan the cart's QR code in the store.
import { Check, Minus, Plus, QrCode, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { CATALOG, getProduct } from "@/lib/data/catalog";
import { PERSONAS, type PersonaKey } from "@/lib/data/personas";
import { azn } from "@/lib/format";
import { ProductArt } from "../ui/ProductArt";

type Item = { productId: string; qty: number };

export function ListEditor() {
  const [persona, setPersona] = useState<PersonaKey>("aysel");
  const [items, setItems] = useState<Item[] | null>(null);
  const [query, setQuery] = useState("");
  const [saved, setSaved] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const dirty = useRef(false);

  useEffect(() => {
    let cancelled = false;
    dirty.current = false;
    fetch(`/api/lists/${persona}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => !cancelled && setItems(j.items ?? []))
      .catch(() => !cancelled && setItems([]));
    return () => {
      cancelled = true;
    };
  }, [persona]);

  // autosave shortly after each change
  useEffect(() => {
    if (!items || !dirty.current) return;
    const timer = setTimeout(() => {
      setSaved("saving");
      fetch(`/api/lists/${persona}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ items }),
      })
        .then((r) => setSaved(r.ok ? "saved" : "error"))
        .catch(() => setSaved("error"));
    }, 600);
    return () => clearTimeout(timer);
  }, [items, persona]);

  function change(next: Item[]) {
    dirty.current = true;
    setItems(next);
  }
  const setQty = (id: string, qty: number) =>
    change(qty < 1 ? items!.filter((i) => i.productId !== id) : items!.map((i) => (i.productId === id ? { ...i, qty } : i)));
  const add = (id: string) => {
    const existing = items!.find((i) => i.productId === id);
    change(existing ? items!.map((i) => (i.productId === id ? { ...i, qty: i.qty + 1 } : i)) : [...items!, { productId: id, qty: 1 }]);
    setQuery("");
  };

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return CATALOG.filter((p) => p.name.toLowerCase().includes(q) || p.tags.some((t) => t.includes(q))).slice(0, 8);
  }, [query]);

  const total = (items ?? []).reduce((s, i) => s + getProduct(i.productId).price * i.qty, 0);

  return (
    <>
      <header>
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">Plan at home</p>
        <h1 className="mt-1 text-title font-semibold">My shopping list</h1>
        <p className="mt-1 text-ink-muted">It moves to the cart by itself when you scan the cart&apos;s QR in the store.</p>
      </header>

      <div className="mt-5 flex gap-2" role="tablist">
        {PERSONAS.map((p) => (
          <button
            key={p.key}
            role="tab"
            aria-selected={persona === p.key}
            onClick={() => {
              setItems(null);
              setPersona(p.key);
            }}
            className={`rounded-full px-4 py-2 font-semibold ${persona === p.key ? "bg-ink text-white" : "bg-surface shadow-soft"}`}
          >
            {p.name}
          </button>
        ))}
        <span className="ml-auto self-center text-sm text-ink-muted" aria-live="polite">
          {saved === "saving" ? "Saving…" : saved === "saved" ? (
            <span className="inline-flex items-center gap-1 text-brand-700">
              <Check size={14} /> Saved
            </span>
          ) : saved === "error" ? "Not saved" : ""}
        </span>
      </div>

      <div className="relative mt-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Add a product: milk, pasta, honey…"
          className="w-full rounded-tile border border-line bg-surface px-4 py-3 text-base outline-none focus:border-brand-500"
        />
        {results.length > 0 && (
          <ul className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-card bg-surface shadow-lift">
            {results.map((p) => (
              <li key={p.id}>
                <button onClick={() => add(p.id)} className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-canvas">
                  <ProductArt product={p} size={36} />
                  <span className="min-w-0 flex-1 truncate">{p.name}</span>
                  <span className="text-sm text-ink-muted">{azn(p.price)}</span>
                  <Plus size={18} className="text-brand-600" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ul className="mt-4 flex-1 space-y-2">
        {items === null && <li className="text-ink-subtle">Loading…</li>}
        {items?.length === 0 && <li className="text-ink-subtle">Your list is empty. Search above to add products.</li>}
        {items?.map((i) => {
          const p = getProduct(i.productId);
          return (
            <li key={i.productId} className="flex items-center gap-3 rounded-card bg-surface p-2 pr-3 shadow-soft">
              <ProductArt product={p} size={44} />
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 block font-medium leading-snug">{p.name}</span>
                <span className="block text-xs text-ink-muted">
                  {p.brand} · {azn(p.price)}
                </span>
              </span>
              <button onClick={() => setQty(i.productId, i.qty - 1)} className="grid size-8 place-items-center rounded-full bg-canvas" aria-label={`One less ${p.name}`}>
                <Minus size={16} />
              </button>
              <span className="w-5 text-center font-semibold tabular-nums">{i.qty}</span>
              <button onClick={() => setQty(i.productId, i.qty + 1)} className="grid size-8 place-items-center rounded-full bg-canvas" aria-label={`One more ${p.name}`}>
                <Plus size={16} />
              </button>
              <button onClick={() => setQty(i.productId, 0)} className="grid size-8 place-items-center rounded-full text-ink-subtle" aria-label={`Remove ${p.name}`}>
                <X size={16} />
              </button>
            </li>
          );
        })}
      </ul>

      {items && items.length > 0 && <p className="mt-4 text-center text-ink-muted">About {azn(total)} · {items.length} products</p>}

      <Link href="/app" className="mt-4 flex items-center justify-center gap-2 rounded-card bg-brand-500 py-4 font-semibold text-white shadow-glow">
        <QrCode size={20} /> At the store? Scan the cart QR
      </Link>
    </>
  );
}
