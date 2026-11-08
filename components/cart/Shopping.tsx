"use client";
// Live session on the cart screen: shopper + list (left), store guide (centre), live cart + total (right).
import { AnimatePresence, motion } from "motion/react";
import { useMemo } from "react";
import { Accessibility, Check, MapPin, Navigation, ShoppingCart, Sparkles } from "lucide-react";
import { planRoute } from "@/lib/map/route";
import { IsoMap } from "../map/IsoMap";
import { getProduct } from "@/lib/data/catalog";
import { ENTRANCE, SHELVES } from "@/lib/data/storeMap";
import type { Cell } from "@/lib/data/types";
import { azn, initials } from "@/lib/format";
import { sendAction } from "@/lib/session/client";
import { lineTotal, totals } from "@/lib/session/totals";
import type { SessionState } from "@/lib/session/types";
import { spring } from "@/lib/ui/motion";
import { Odometer } from "../ui/Odometer";
import { ProductArt } from "../ui/ProductArt";

function placeOf(position: Cell): string {
  if (position.x === ENTRANCE.x && position.y === ENTRANCE.y) return "Entrance";
  const shelf = SHELVES.find((s) => s.access.x === position.x && s.access.y === position.y);
  if (!shelf) return "In the store";
  return shelf.aisle ? `${shelf.label} · Aisle ${shelf.aisle}` : shelf.label;
}

function shelfLabel(productId: string): string {
  const shelf = SHELVES.find((s) => s.id === getProduct(productId).shelfId)!;
  return shelf.aisle ? `${shelf.label} · Aisle ${shelf.aisle}` : shelf.label;
}

export function Shopping({ state }: { state: SessionState }) {
  const profile = state.profile!;
  const t = totals(state.cart);
  const personalOffers = state.offers.filter((o) => o.personal).slice(0, 3);
  const done = state.list.filter((l) => l.checked).length;
  const openItems = state.list.filter((l) => !l.checked).map((l) => l.productId);
  const openKey = openItems.join(",");
  const { x: px, y: py } = state.position;
  // Re-plan only when the position or the open list changes (A* results are cached as well).
  const route = useMemo(() => planRoute({ x: px, y: py }, openKey ? openKey.split(",") : []), [px, py, openKey]);
  const nextProductId = route.stops[0]?.productIds[0] ?? null;
  const lastAdded = state.lastEvent?.type === "added" ? state.lastEvent.productId : null;
  const reco = state.recommendation;

  return (
    <div className="grid h-full grid-cols-[270px_minmax(0,1fr)_330px] gap-4 p-4 2xl:grid-cols-[340px_minmax(0,1fr)_440px] 2xl:gap-6 2xl:p-8">
      {/* LEFT: shopper, offers, list */}
      <aside className="glass flex min-h-0 flex-col rounded-panel p-5 shadow-soft 2xl:p-6">
        <div className="flex items-center gap-4">
          <motion.div
            layoutId="hero-card"
            transition={spring.soft}
            className="grid size-16 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-2xl font-semibold text-white shadow-glow"
          >
            {initials(profile.name)}
          </motion.div>
          <div className="min-w-0">
            <p className="text-ink-muted">{profile.isGuest ? "Hi there," : "Welcome back,"}</p>
            <p className="truncate text-title font-semibold">{profile.name}</p>
          </div>
        </div>
        {profile.a11yMode && (
          <p className="mt-3 inline-flex items-center gap-2 self-start rounded-full bg-ink px-3 py-1 text-sm font-medium text-white">
            <Accessibility size={16} /> Accessibility mode
          </p>
        )}

        {personalOffers.length > 0 && (
          <section className="mt-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-subtle">For you today</h2>
            <ul className="mt-3 space-y-2">
              {personalOffers.map((offer, i) => {
                const p = getProduct(offer.productId);
                return (
                  <motion.li
                    key={offer.productId}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ ...spring.soft, delay: 0.25 + i * 0.08 }}
                    className="flex items-center gap-3 rounded-tile bg-surface p-2 pr-3 shadow-soft"
                  >
                    <ProductArt product={p} size={40} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{p.name}</p>
                      <p className="truncate text-xs text-ink-muted">{offer.reason}</p>
                    </div>
                    <span className="rounded-full bg-brand-50 px-2 py-0.5 text-sm font-semibold text-brand-700">
                      −{offer.discountPct}%
                    </span>
                  </motion.li>
                );
              })}
            </ul>
          </section>
        )}

        <section className="mt-6 flex min-h-0 flex-1 flex-col">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-subtle">Your list</h2>
            {state.list.length > 0 && (
              <span className="text-sm font-medium text-ink-muted tabular-nums">
                {done} of {state.list.length}
              </span>
            )}
          </div>
          {state.list.length > 0 && (
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
              <motion.div
                className="h-full rounded-full bg-brand-500"
                animate={{ width: `${(done / state.list.length) * 100}%` }}
                transition={spring.soft}
              />
            </div>
          )}
          <ul className="mt-3 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
            <AnimatePresence initial={false}>
              {state.list.map((item) => {
                const p = getProduct(item.productId);
                return (
                  <motion.li
                    key={item.productId}
                    layout
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={spring.soft}
                    className="flex items-center gap-3 rounded-tile px-2 py-1.5"
                  >
                    <span
                      className={`grid size-6 shrink-0 place-items-center rounded-full border-2 transition-colors duration-300 ${
                        item.checked ? "border-brand-500 bg-brand-500 text-white" : "border-line bg-surface"
                      }`}
                    >
                      <AnimatePresence>
                        {item.checked && (
                          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={spring.snappy}>
                            <Check size={14} strokeWidth={3} />
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </span>
                    <span className={`min-w-0 flex-1 truncate transition-colors ${item.checked ? "text-ink-subtle line-through" : ""}`}>
                      {p.name}
                    </span>
                    {item.source === "recipe" && (
                      <span className="rounded-full bg-brand-50 px-2 text-xs font-medium text-brand-700">recipe</span>
                    )}
                    {item.qty > 1 && <span className="text-sm text-ink-muted tabular-nums">×{item.qty}</span>}
                  </motion.li>
                );
              })}
            </AnimatePresence>
            {state.list.length === 0 && <li className="px-2 text-ink-subtle">No list yet. Try “I&apos;m cooking carbonara”.</li>}
          </ul>
        </section>
      </aside>

      {/* CENTRE: isometric store map with the live shortest route */}
      <section className="glass relative flex min-h-0 flex-col overflow-hidden rounded-panel p-5 shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider text-ink-subtle">
              <MapPin size={14} /> You are here
            </p>
            <AnimatePresence mode="wait">
              <motion.p
                key={`${state.position.x},${state.position.y}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={spring.soft}
                className="truncate text-title font-semibold"
              >
                {placeOf(state.position)}
              </motion.p>
            </AnimatePresence>
          </div>
          {route.stops.length > 0 && (
            <motion.span
              key={`${route.etaMin}-${route.stops.length}`}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={spring.snappy}
              className="shrink-0 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white tabular-nums"
            >
              ~{route.etaMin} min · {route.stops.length} {route.stops.length === 1 ? "stop" : "stops"}
            </motion.span>
          )}
        </div>
        <div className="relative -mx-2 min-h-0 flex-1">
          <IsoMap position={state.position} route={route} targetShelfId={route.stops[0]?.shelfId ?? null} />
        </div>
        <AnimatePresence mode="wait">
          {nextProductId ? (
            <motion.div
              key={nextProductId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={spring.soft}
              className="flex items-center gap-3 rounded-card bg-surface p-3 shadow-soft"
            >
              <Navigation size={22} className="shrink-0 text-brand-600" />
              <ProductArt product={getProduct(nextProductId)} size={44} />
              <div className="min-w-0">
                <p className="text-sm text-ink-muted">Next stop</p>
                <p className="truncate font-semibold">
                  {getProduct(nextProductId).name} <span className="font-normal text-ink-muted">· {shelfLabel(nextProductId)}</span>
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.p key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-card bg-brand-50 p-3 text-center font-semibold text-brand-700">
              List complete: head to checkout
            </motion.p>
          )}
        </AnimatePresence>
      </section>

      {/* RIGHT: live cart */}
      <aside className="flex min-h-0 flex-col rounded-panel bg-surface p-5 shadow-lift 2xl:p-6">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-title font-semibold">
            <ShoppingCart size={26} /> Your cart
          </h2>
          <span className="rounded-full bg-canvas px-3 py-1 text-sm font-medium text-ink-muted tabular-nums">
            {t.items} {t.items === 1 ? "item" : "items"}
          </span>
        </div>

        <ul className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          <AnimatePresence initial={false}>
            {[...state.cart].reverse().map((line) => {
              const p = getProduct(line.productId);
              const isNew = line.productId === lastAdded;
              return (
                <motion.li
                  key={line.productId}
                  layout
                  initial={{ opacity: 0, y: -36, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 48, transition: { duration: 0.2 } }}
                  transition={spring.drop}
                  className={`flex items-center gap-3 rounded-card p-2 pr-3 transition-colors duration-700 ${isNew ? "bg-brand-50" : "bg-canvas"}`}
                >
                  <ProductArt product={p} size={56} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{p.name}</p>
                    <p className="truncate text-sm text-ink-muted">
                      {p.brand} · {p.unit}
                    </p>
                  </div>
                  {line.qty > 1 && (
                    <motion.span
                      key={line.qty}
                      initial={{ scale: 1.5 }}
                      animate={{ scale: 1 }}
                      transition={spring.snappy}
                      className="rounded-full bg-ink px-2 py-0.5 text-sm font-semibold text-white tabular-nums"
                    >
                      ×{line.qty}
                    </motion.span>
                  )}
                  <div className="text-right tabular-nums">
                    <p className="font-semibold">{azn(lineTotal(line))}</p>
                    {line.discountPct > 0 && (
                      <p className="text-xs text-ink-subtle line-through">{azn(line.qty * line.unitPrice)}</p>
                    )}
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
          {state.cart.length === 0 && (
            <li className="grid h-full place-items-center text-center text-ink-subtle">
              <span>
                Your cart is empty.
                <br />
                Items appear here as you pick them up.
              </span>
            </li>
          )}
        </ul>

        <AnimatePresence mode="popLayout">
          {reco && (
            <motion.div
              key={reco.productId}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={spring.soft}
              className="relative mt-4 rounded-card border border-brand-200 bg-brand-50 p-3"
            >
              {reco.discountPct > 0 && (
                <span className="absolute right-3 top-3 rounded-full bg-brand-500 px-2.5 py-0.5 text-sm font-semibold text-white">
                  −{reco.discountPct}%
                </span>
              )}
              <p className="flex items-center gap-1.5 pr-16 text-sm font-medium text-brand-700">
                <Sparkles size={14} className="shrink-0" /> {reco.why}
              </p>
              <div className="mt-2 flex items-center gap-3">
                <ProductArt product={getProduct(reco.productId)} size={48} />
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {getProduct(reco.productId).brand} {getProduct(reco.productId).name}
                  </p>
                  <p className="truncate text-sm text-ink-muted">
                    {shelfLabel(reco.productId)}
                    {reco.discountPct > 0 && " · just for you"}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-4 border-t border-line pt-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-ink-muted">Total</p>
              <AnimatePresence>
                {t.savings > 0 && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm font-medium text-brand-600">
                    You save {azn(t.savings)}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
            <Odometer value={t.total} className="text-headline font-semibold" />
          </div>
          <button
            onClick={() => void sendAction(state.cartId, "checkout").catch(() => {})}
            disabled={state.cart.length === 0}
            className="mt-4 w-full rounded-card bg-ink py-4 text-xl font-semibold text-white transition active:scale-[0.99] disabled:bg-line disabled:text-ink-subtle"
          >
            Checkout · pay right here
          </button>
        </div>
      </aside>
    </div>
  );
}
