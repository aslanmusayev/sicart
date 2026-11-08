import type { CartLine, Offer } from "./types";

export const round2 = (n: number) => Math.round(n * 100) / 100;

export function lineTotal(line: CartLine): number {
  return round2(line.qty * line.unitPrice * (1 - line.discountPct / 100));
}

export function totals(cart: CartLine[]) {
  const subtotal = round2(cart.reduce((sum, l) => sum + l.qty * l.unitPrice, 0));
  const total = round2(cart.reduce((sum, l) => sum + lineTotal(l), 0));
  const items = cart.reduce((sum, l) => sum + l.qty, 0);
  return { subtotal, total, savings: round2(subtotal - total), items };
}

/** Best discount for a product: personal offers and store-wide deals both count, the highest wins. */
export function bestOffer(offers: Offer[], productId: string): Offer | undefined {
  return offers
    .filter((o) => o.productId === productId)
    .sort((a, b) => b.discountPct - a.discountPct)[0];
}
