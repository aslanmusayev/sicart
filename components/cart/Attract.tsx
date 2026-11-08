"use client";
// Idle cart: a breathing QR card ("scan to start") and a parallax carousel of today's deals.
import { AnimatePresence, motion } from "motion/react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import { ScanLine } from "lucide-react";
import { getProduct } from "@/lib/data/catalog";
import { TODAYS_DEALS } from "@/lib/data/personas";
import { azn } from "@/lib/format";
import { spring } from "@/lib/ui/motion";
import { Logo } from "../ui/Logo";
import { ProductArt } from "../ui/ProductArt";

const DEAL_MS = 4200;

export function Attract({ cartId, connectUrl }: { cartId: number; connectUrl: string | null }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setIndex((i) => (i + 1) % TODAYS_DEALS.length), DEAL_MS);
    return () => clearInterval(timer);
  }, []);

  const deal = TODAYS_DEALS[index];
  const product = getProduct(deal.productId);
  const dealPrice = product.price * (1 - deal.discountPct / 100);

  return (
    <div className="grid h-full grid-cols-[1.1fr_1fr] gap-10 p-10 xl:p-14">
      <section className="flex flex-col">
        <Logo size={40} />


        <div className="flex flex-1 flex-col justify-center gap-8">
          <div>
            <p className="flex items-center gap-2 text-lg font-semibold text-brand-600">
              <ScanLine size={22} /> Scan to start
            </p>
            <h1 className="mt-3 text-headline font-semibold 2xl:text-display">
              Shop. Skip the queue.
            </h1>
          </div>
          <div className="flex items-center gap-8">
            <motion.div
              layoutId="hero-card"
              className="glass shrink-0 rounded-panel p-5 shadow-lift"
              animate={{ scale: [1, 1.018, 1] }}
              transition={{ scale: { duration: 3.2, repeat: Infinity, ease: "easeInOut" }, layout: spring.soft }}
            >
              <div className="rounded-card bg-white p-3 [&_svg]:size-[200px] xl:[&_svg]:size-[260px]">
                {connectUrl ? (
                  <QRCodeSVG value={connectUrl} size={260} level="M" fgColor="#0b1215" marginSize={0} />
                ) : (
                  <div className="size-[200px] xl:size-[260px]" />
                )}
              </div>
            </motion.div>
            <p className="max-w-xs text-xl leading-relaxed text-ink-muted">
              Point your phone camera here. Your list and personal offers load instantly, and you pay right at the
              cart: no checkout line.
            </p>
          </div>
        </div>
      </section>

      <section className="flex flex-col justify-center">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-lg font-semibold text-ink-muted">Today&apos;s deals</p>
          <span className="rounded-full bg-surface px-4 py-1.5 text-lg font-medium text-ink-muted shadow-soft">Cart {cartId}</span>
        </div>
        <div className="relative h-[440px] xl:h-[500px]">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={deal.productId}
              className="absolute inset-0 flex flex-col rounded-panel bg-surface p-8 shadow-lift"
              initial={{ opacity: 0, x: 80, rotate: 1.5 }}
              animate={{ opacity: 1, x: 0, rotate: 0 }}
              exit={{ opacity: 0, x: -60, rotate: -1 }}
              transition={spring.soft}
            >
              <div className="flex items-start justify-between">
                <motion.div initial={{ x: 40 }} animate={{ x: 0 }} transition={{ ...spring.soft, delay: 0.05 }}>
                  <ProductArt product={product} size={200} />
                </motion.div>
                <span className="rounded-full bg-brand-500 px-4 py-2 text-2xl font-semibold text-white shadow-glow">
                  −{deal.discountPct}%
                </span>
              </div>
              <div className="mt-auto">
                <p className="text-lg text-ink-muted">{product.brand}</p>
                <p className="text-headline font-semibold">{product.name}</p>
                <div className="mt-3 flex items-baseline gap-3">
                  <span className="text-title font-semibold text-brand-600">{azn(dealPrice)}</span>
                  <span className="text-xl text-ink-subtle line-through">{azn(product.price)}</span>
                  <span className="ml-auto text-lg text-ink-muted">{deal.reason}</span>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="mt-6 flex justify-center gap-2" aria-hidden>
          {TODAYS_DEALS.map((d, i) => (
            <span
              key={d.productId}
              className={`h-2 rounded-full transition-all duration-500 ease-spring ${i === index ? "w-8 bg-brand-500" : "w-2 bg-line"}`}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
