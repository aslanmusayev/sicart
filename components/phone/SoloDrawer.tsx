"use client";
// Solo-presenter fallback (PLAN.md Surfaces): long-press "Cart N" on the customer phone to open a hidden
// "drop into cart" drawer, so one person can run the demo without a second phone. Uses the Demo Control PIN.
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { useMemo, useState } from "react";
import { CATALOG, getProduct } from "@/lib/data/catalog";
import { azn } from "@/lib/format";
import { ActionError, sendAction } from "@/lib/session/client";
import { spring } from "@/lib/ui/motion";
import { ProductArt } from "../ui/ProductArt";

const PIN_KEY = "sicart.control.pin"; // shared with Demo Control

function storedPin(): string {
  try {
    return localStorage.getItem(PIN_KEY) ?? "";
  } catch {
    return "";
  }
}

interface Props {
  cartId: number;
  open: boolean;
  onClose: () => void;
  /** Unchecked list items, shown first. */
  suggested: string[];
}

export function SoloDrawer({ cartId, open, onClose, suggested }: Props) {
  const [pin, setPin] = useState(storedPin);
  const [query, setQuery] = useState("");
  const [note, setNote] = useState<string | null>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return suggested.map(getProduct);
    return CATALOG.filter((p) => p.name.toLowerCase().includes(q) || p.tags.some((t) => t.includes(q))).slice(0, 12);
  }, [query, suggested]);

  async function drop(productId: string) {
    try {
      await sendAction(cartId, "add", { productId }, pin);
      setNote(`Added ${getProduct(productId).name}`);
      navigator.vibrate?.(30);
    } catch (e) {
      if (e instanceof ActionError && e.status === 401) {
        setPin("");
        setNote("Wrong PIN");
      } else setNote(e instanceof Error ? e.message : "Failed");
    }
    setTimeout(() => setNote(null), 1600);
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="scrim"
            className="fixed inset-0 z-40 bg-ink/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.section
            key="sheet"
            className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[75dvh] w-full max-w-md overflow-y-auto rounded-t-panel bg-surface p-5 shadow-lift"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={spring.soft}
            aria-label="Drop a product into the cart"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Drop into cart</h2>
              <button onClick={onClose} className="grid size-9 place-items-center rounded-full bg-canvas" aria-label="Close">
                <X size={18} />
              </button>
            </div>
            {!pin ? (
              <form
                className="mt-4 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const value = new FormData(e.currentTarget).get("pin")?.toString().trim() ?? "";
                  if (!value) return;
                  try {
                    localStorage.setItem(PIN_KEY, value);
                  } catch {
                    /* memory only */
                  }
                  setPin(value);
                }}
              >
                <input name="pin" inputMode="numeric" placeholder="Demo PIN" className="min-w-0 flex-1 rounded-tile border border-line px-3 py-2.5 text-base" />
                <button className="rounded-tile bg-ink px-4 font-semibold text-white">Unlock</button>
              </form>
            ) : (
              <>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search any product"
                  className="mt-4 w-full rounded-tile border border-line px-3 py-2.5 text-base outline-none focus:border-brand-500"
                />
                {!query && suggested.length > 0 && <p className="mt-3 text-sm text-ink-subtle">From the list</p>}
                <ul className="mt-2 grid grid-cols-2 gap-2">
                  {results.map((p) => (
                    <li key={p.id}>
                      <button
                        onClick={() => drop(p.id)}
                        className="flex w-full items-center gap-2 rounded-card bg-canvas p-2 text-left active:scale-[0.98]"
                      >
                        <ProductArt product={p} size={40} />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{p.name}</span>
                          <span className="block text-xs text-ink-muted">{azn(p.price)}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {note && <p className="mt-3 text-center text-sm font-medium text-brand-700">{note}</p>}
          </motion.section>
        </>
      )}
    </AnimatePresence>
  );
}
