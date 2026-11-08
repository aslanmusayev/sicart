// Deterministic recommendation scorer (< 1 ms, no LLM at runtime).
// score = pairing weight + bonus if it pairs with the item just added + purchase-history boost + offer boost.
// Products already in the cart or on the shopping list are never recommended.
import { findProduct } from "../data/catalog";
import { PAIRINGS } from "../data/pairings";
import { whyLine } from "../data/whyLines";
import { bestOffer } from "../session/totals";
import type { CartLine, ListItem, Offer, Recommendation } from "../session/types";

export interface RecoInput {
  cart: CartLine[];
  list: ListItem[];
  offers: Offer[];
  history: Record<string, number>;
  lastAddedProductId: string | null;
}

const LAST_ADDED_BONUS = 0.25;
const MAX_HISTORY_BOOST = 0.3;
const HISTORY_FULL_AT = 20; // times bought for the full boost

export function recommend(input: RecoInput): Recommendation | null {
  const exclude = new Set([...input.cart.map((l) => l.productId), ...input.list.map((l) => l.productId)]);
  let best: { reco: Recommendation; score: number } | null = null;

  for (const line of input.cart) {
    for (const pairing of PAIRINGS[line.productId] ?? []) {
      if (exclude.has(pairing.to) || !findProduct(pairing.to)) continue;
      const offer = bestOffer(input.offers, pairing.to);
      const historyBoost = Math.min((input.history[pairing.to] ?? 0) / HISTORY_FULL_AT, 1) * MAX_HISTORY_BOOST;
      const score =
        pairing.weight +
        (line.productId === input.lastAddedProductId ? LAST_ADDED_BONUS : 0) +
        historyBoost +
        (offer ? offer.discountPct / 100 : 0);
      if (!best || score > best.score) {
        best = {
          score,
          reco: {
            productId: pairing.to,
            fromProductId: line.productId,
            why: whyLine(line.productId, pairing.to) ?? "Goes well with your cart",
            discountPct: offer?.discountPct ?? 0,
          },
        };
      }
    }
  }
  return best?.reco ?? null;
}
