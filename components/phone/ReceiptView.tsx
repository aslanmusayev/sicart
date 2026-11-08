"use client";
// Digital receipt on the phone: items, savings, 0 paper, queue time skipped.
import { motion } from "motion/react";
import { Leaf, ReceiptText, ShoppingBag, Timer } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { findProduct } from "@/lib/data/catalog";
import { azn } from "@/lib/format";
import { setIdentity } from "@/lib/phone/identity";
import { spring } from "@/lib/ui/motion";
import { QUEUE_MINUTES_SKIPPED } from "../cart/CheckoutOverlay";
import { ProductArt } from "../ui/ProductArt";

interface ReceiptItem {
  productId: string;
  name: string;
  brand: string;
  unit: string;
  qty: number;
  unitPrice: number;
  discountPct: number;
  total: number;
}
interface ReceiptData {
  id: string;
  items: ReceiptItem[];
  total: number;
  savings: number;
  created_at: string;
  profiles: { name: string } | null;
}

export function ReceiptView() {
  const { id } = useParams<{ id: string }>();
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // The session is over once we have a receipt: forget the cart on this phone.
    setIdentity(null);
    fetch(`/api/receipt/${id}`, { cache: "no-store" })
      .then(async (r) => (r.ok ? setReceipt(await r.json()) : setError((await r.json()).error ?? "Not found")))
      .catch(() => setError("Could not load the receipt"));
  }, [id]);

  if (error) return <p className="m-auto text-ink-muted">{error}</p>;
  if (!receipt) return <p className="m-auto text-ink-subtle">Loading receipt…</p>;

  const when = new Date(receipt.created_at);

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={spring.soft} className="text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-brand-500 text-white shadow-glow">
          <ReceiptText size={30} />
        </span>
        <h1 className="mt-4 text-title font-semibold">Thank you{receipt.profiles?.name ? `, ${receipt.profiles.name}` : ""}!</h1>
        <p className="text-ink-muted">
          SiCart Market · {when.toLocaleDateString()} {when.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </motion.div>

      <div className="mt-6 grid grid-cols-3 gap-2">
        {[
          Number(receipt.savings) > 0
            ? { icon: <Leaf size={18} />, value: azn(Number(receipt.savings)), label: "saved" }
            : { icon: <ShoppingBag size={18} />, value: String(receipt.items.reduce((n, i) => n + i.qty, 0)), label: "items" },
          { icon: <ReceiptText size={18} />, value: "0", label: "paper" },
          { icon: <Timer size={18} />, value: `~${QUEUE_MINUTES_SKIPPED} min`, label: "queue skipped" },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring.soft, delay: 0.15 + i * 0.08 }}
            className="rounded-card bg-surface p-3 text-center shadow-soft"
          >
            <span className="mx-auto grid size-8 place-items-center rounded-full bg-brand-50 text-brand-600">{s.icon}</span>
            <p className="mt-1 font-semibold tabular-nums">{s.value}</p>
            <p className="text-xs text-ink-muted">{s.label}</p>
          </motion.div>
        ))}
      </div>

      <ul className="mt-6 divide-y divide-line rounded-card bg-surface shadow-soft">
        {receipt.items.map((item) => {
          const product = findProduct(item.productId);
          return (
            <li key={item.productId} className="flex items-center gap-3 p-3">
              {product && <ProductArt product={product} size={40} />}
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{item.name}</span>
                <span className="block text-xs text-ink-muted">
                  {item.qty} × {azn(item.unitPrice)}
                  {item.discountPct > 0 && ` · −${item.discountPct}%`}
                </span>
              </span>
              <span className="font-semibold tabular-nums">{azn(item.total)}</span>
            </li>
          );
        })}
        <li className="flex items-center justify-between p-4 text-lg font-semibold">
          <span>Total</span>
          <span className="tabular-nums">{azn(Number(receipt.total))}</span>
        </li>
      </ul>

      <Link href="/app" className="mt-8 block rounded-card bg-ink py-4 text-center font-semibold text-white">
        Done
      </Link>
    </>
  );
}
