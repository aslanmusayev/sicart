"use client";
// Customer app home: connect to a cart (scan or type the number), see today's deals, jump back into a session.
import { Accessibility, ChevronRight, ListChecks, QrCode, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { getProduct } from "@/lib/data/catalog";
import { TODAYS_DEALS } from "@/lib/data/personas";
import { azn } from "@/lib/format";
import { parseCartCode } from "@/lib/phone/cartCode";
import { useIdentity } from "@/lib/phone/identity";
import { Logo } from "../ui/Logo";
import { ProductArt } from "../ui/ProductArt";
import { Scanner } from "./Scanner";

export function PhoneHome() {
  const router = useRouter();
  const identity = useIdentity();
  const [scanning, setScanning] = useState(false);
  const [number, setNumber] = useState("");
  const [error, setError] = useState<string | null>(null);

  const go = useCallback(
    (cart: number | null) => {
      if (!cart) return setError("That is not a SiCart code");
      router.push(`/app/connect?cart=${cart}`);
    },
    [router],
  );
  const onScan = useCallback((text: string) => {
    setScanning(false);
    go(parseCartCode(text));
  }, [go]);

  return (
    <>
      <header className="flex items-center justify-between">
        <Logo size={24} />
        {identity?.name && <span className="text-sm text-ink-muted">Hi, {identity.name}</span>}
      </header>

      {identity && (
        <Link
          href={`/app/session?cart=${identity.cartId}`}
          className="mt-6 flex items-center gap-3 rounded-card bg-ink p-4 text-white shadow-lift"
        >
          <ShoppingCart />
          <span className="flex-1">
            <span className="block font-semibold">Back to Cart {identity.cartId}</span>
            <span className="block text-sm text-white/70">Your shopping session</span>
          </span>
          <ChevronRight />
        </Link>
      )}

      <section className="mt-8">
        <h1 className="text-title font-semibold">Start shopping</h1>
        <p className="mt-1 text-ink-muted">Scan the QR code on any SiCart to load your list and offers.</p>
        <button
          onClick={() => setScanning(true)}
          className="mt-5 flex w-full items-center justify-center gap-3 rounded-card bg-brand-500 py-5 text-lg font-semibold text-white shadow-glow active:scale-[0.99]"
        >
          <QrCode size={26} /> Scan cart QR
        </button>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            go(parseCartCode(number));
          }}
        >
          <input
            value={number}
            onChange={(e) => {
              setNumber(e.target.value);
              setError(null);
            }}
            inputMode="numeric"
            placeholder="or type the cart number"
            className="min-w-0 flex-1 rounded-tile border border-line bg-surface px-4 py-3 text-base outline-none focus:border-brand-500"
          />
          <button className="rounded-tile bg-surface px-5 font-semibold shadow-soft">Go</button>
        </form>
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        <Link href="/app/list" className="mt-4 flex items-center gap-3 rounded-card bg-surface p-4 font-semibold shadow-soft">
          <ListChecks aria-hidden className="text-brand-600" />
          <span className="flex-1">
            My shopping list
            <span className="block text-sm font-normal text-ink-muted">Plan at home: it moves to the cart when you scan</span>
          </span>
          <ChevronRight aria-hidden />
        </Link>
        <Link
          href="/app/voice"
          className="mt-4 flex items-center gap-3 rounded-card border-2 border-ink bg-surface p-4 font-semibold"
        >
          <Accessibility aria-hidden />
          <span className="flex-1">
            Voice-first mode
            <span className="block text-sm font-normal text-ink-muted">For blind and low-vision shoppers: connect by voice</span>
          </span>
          <ChevronRight aria-hidden />
        </Link>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-subtle">Today&apos;s deals</h2>
        <ul className="-mx-5 mt-3 flex gap-3 overflow-x-auto px-5 pb-2 [contain:inline-size]">
          {TODAYS_DEALS.map((deal) => {
            const p = getProduct(deal.productId);
            return (
              <li key={deal.productId} className="w-40 shrink-0 rounded-card bg-surface p-3 shadow-soft">
                <ProductArt product={p} size={136} />
                <p className="mt-2 truncate text-sm font-semibold">{p.name}</p>
                <p className="text-sm">
                  <span className="font-semibold text-brand-600">{azn(p.price * (1 - deal.discountPct / 100))}</span>{" "}
                  <span className="text-ink-subtle line-through">{azn(p.price)}</span>
                </p>
              </li>
            );
          })}
        </ul>
      </section>

      {scanning && <Scanner onResult={onScan} onClose={() => setScanning(false)} />}
    </>
  );
}
