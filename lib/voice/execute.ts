// Server-side tool executor for the voice assistant (and the typed-command fallback).
// Every tool validates its arguments, mutates the session through the normal reducer (so all screens update via
// the snapshot) and returns a COMPACT JSON result for the model to talk about.
import { CATALOG, getProduct } from "../data/catalog";
import { getShelf } from "../data/storeMap";
import type { Product } from "../data/types";
import { findPath } from "../map/astar";
import { planRoute } from "../map/route";
import { matchIngredient, planRecipe } from "../match/ingredient";
import { dispatch, getSnapshot } from "../session/store";
import { bestOffer, round2, totals } from "../session/totals";
import { SessionError, type SessionState } from "../session/types";
import type { ToolName } from "./tools";

type Args = Record<string, unknown>;
export type ToolResult = Record<string, unknown>;

const SHELF_LEVEL = { 1: "bottom shelf", 2: "second shelf", 3: "third shelf", 4: "top shelf" } as const;

function text(v: unknown, field: string): string {
  if (typeof v !== "string" || !v.trim()) throw new SessionError(`${field} is required`, 400);
  return v.trim().slice(0, 120);
}

function where(p: Product) {
  const shelf = getShelf(p.shelfId);
  return { place: shelf.aisle ? `${shelf.label}, aisle ${shelf.aisle}` : shelf.label, shelf: SHELF_LEVEL[p.level] };
}

function describe(p: Product, state?: SessionState) {
  const offer = state ? bestOffer(state.offers, p.id) : undefined;
  return {
    name: p.name,
    brand: p.brand,
    unit: p.unit,
    price: p.price,
    ...(offer ? { discount_pct: offer.discountPct, price_after_discount: round2(p.price * (1 - offer.discountPct / 100)) } : {}),
  };
}

function routeSummary(state: SessionState) {
  const open = state.list.filter((l) => !l.checked).map((l) => l.productId);
  const route = planRoute(state.position, open, { first: state.focus?.productId });
  return { stops: route.stops.length, minutes: route.etaMin };
}

/** Products interchangeable with p (same group, same kind), cheapest first. */
function sameKind(p: Product): Product[] {
  if (!p.altGroup) return [p];
  return CATALOG.filter((q) => q.altGroup === p.altGroup && q.tags[0] === p.tags[0]).sort((a, b) => a.price - b.price);
}

export async function executeTool(cartId: number, name: ToolName, args: Args): Promise<ToolResult> {
  const now = Date.now();
  switch (name) {
    case "plan_recipe": {
      const dish = text(args.dish, "dish");
      const ingredients = Array.isArray(args.ingredients) ? args.ingredients.filter((x): x is string => typeof x === "string") : [];
      const plan = planRecipe(dish, Number(args.servings) || 4, ingredients);
      if (!plan.items.length) {
        return plan.recipe
          ? { ok: false, message: "None of the ingredients are sold here." }
          : { ok: false, message: "Unknown dish: call plan_recipe again with the ingredient names.", unavailable: plan.unmatched };
      }
      const state = await dispatch(cartId, {
        type: "list_add",
        at: now,
        items: plan.items.map((i) => ({ productId: i.product.id, qty: i.qty, source: "recipe" as const })),
      });
      const picks = plan.items
        .filter((i) => i.premium && i.saved > 0)
        .sort((a, b) => b.saved - a.saved)
        .map((i) => ({ picked: `${i.product.brand} ${i.product.name}`, instead_of: `${i.premium!.brand} ${i.premium!.name}`, saved: round2(i.saved * i.qty) }));
      return {
        ok: true,
        dish: plan.recipe?.name ?? dish,
        servings: plan.servings,
        added: plan.items.map((i) => ({ name: i.product.name, qty: i.qty })),
        not_sold_here: plan.unmatched,
        estimated_cost_azn: round2(plan.items.reduce((s, i) => s + i.product.price * i.qty, 0)),
        best_saving: picks[0] ?? null,
        total_saved_azn: round2(picks.reduce((s, p) => s + p.saved, 0)),
        route: routeSummary(state),
      };
    }

    case "find_product": {
      const query = text(args.query, "query");
      const match = matchIngredient(query);
      if (!match) return { ok: false, message: `SiCart Market does not sell "${query}".` };
      const state = await dispatch(cartId, { type: "focus", productId: match.product.id, at: now });
      const path = findPath(state.position, getShelf(match.product.shelfId).access);
      const metres = Math.round(path?.length ?? 0);
      return { ok: true, product: describe(match.product, state), ...where(match.product), distance_m: metres, highlighted_on_map: true };
    }

    case "add_to_list": {
      const raw = Array.isArray(args.items) ? args.items : [];
      const added: { productId: string; qty: number }[] = [];
      const notFound: string[] = [];
      for (const item of raw) {
        const name = typeof item === "string" ? item : typeof item?.name === "string" ? item.name : "";
        const qty = Math.min(Math.max(Math.round(Number((item as Args)?.qty) || 1), 1), 20);
        const match = name ? matchIngredient(name) : null;
        if (match) added.push({ productId: match.product.id, qty });
        else if (name) notFound.push(name);
      }
      if (!added.length) return { ok: false, not_sold_here: notFound };
      const state = await dispatch(cartId, { type: "list_add", at: now, items: added.map((a) => ({ ...a, source: "voice" as const })) });
      return { ok: true, added: added.map((a) => ({ name: getProduct(a.productId).name, qty: a.qty })), not_sold_here: notFound, route: routeSummary(state) };
    }

    case "remove_from_list": {
      const names = Array.isArray(args.items) ? args.items.filter((x): x is string => typeof x === "string") : [];
      const current = await getSnapshot(cartId);
      const remove = new Set<string>();
      const notOnList: string[] = [];
      for (const n of names) {
        const match = matchIngredient(n);
        const kin = match ? new Set(sameKind(match.product).map((p) => p.id).concat(match.product.id)) : new Set<string>();
        const hits = current.list.filter((l) => kin.has(l.productId));
        if (hits.length) hits.forEach((h) => remove.add(h.productId));
        else notOnList.push(n);
      }
      if (!remove.size) return { ok: false, not_on_list: notOnList };
      await dispatch(cartId, { type: "list_remove", productIds: [...remove], at: now });
      return { ok: true, removed: [...remove].map((id) => getProduct(id).name), not_on_list: notOnList };
    }

    case "get_list": {
      const state = await getSnapshot(cartId);
      const t = totals(state.cart);
      return {
        ok: true,
        list: state.list.map((l) => ({ name: getProduct(l.productId).name, qty: l.qty, in_cart: l.checked })),
        left_to_pick: state.list.filter((l) => !l.checked).length,
        cart: { items: t.items, total_azn: t.total, saved_azn: t.savings },
        route: routeSummary(state),
      };
    }

    case "find_cheaper": {
      const query = text(args.query, "query");
      const match = matchIngredient(query);
      if (!match) return { ok: false, message: `SiCart Market does not sell "${query}".` };
      const kind = sameKind(match.product);
      const cheapest = kind[0];
      const state0 = await getSnapshot(cartId);
      const ids = new Set(kind.map((p) => p.id));
      const listed = state0.list.find((l) => ids.has(l.productId));
      const inCart = state0.cart.find((l) => ids.has(l.productId));
      const current = getProduct(listed?.productId ?? inCart?.productId ?? kind[kind.length - 1].id);
      if (current.id === cheapest.id) return { ok: true, already_cheapest: true, product: describe(cheapest, state0), ...where(cheapest) };
      let swapped = false;
      if (listed && !listed.checked) {
        await dispatch(cartId, { type: "list_remove", productIds: [listed.productId], at: now });
        await dispatch(cartId, { type: "list_add", at: now + 1, items: [{ productId: cheapest.id, qty: listed.qty, source: "voice" }] });
        swapped = true;
      }
      const state = await dispatch(cartId, { type: "focus", productId: cheapest.id, at: now + 2 });
      return {
        ok: true,
        instead_of: describe(current, state),
        cheaper: describe(cheapest, state),
        saved_per_pack_azn: round2(current.price - cheapest.price),
        swapped_on_list: swapped,
        ...where(cheapest),
      };
    }

    case "plan_budget": {
      const budget = Number(args.budget);
      if (!Number.isFinite(budget) || budget <= 0) throw new SessionError("budget must be a positive number", 400);
      const state = await getSnapshot(cartId);
      const lines = typeof args.dish === "string" && args.dish.trim()
        ? planRecipe(args.dish, Number(args.servings) || 4).items.map((i) => ({ product: i.product, qty: i.qty }))
        : state.list.filter((l) => !l.checked).map((l) => ({ product: getProduct(l.productId), qty: l.qty }));
      const cost = round2(lines.reduce((s, l) => s + l.product.price * l.qty, 0) + (args.dish ? 0 : totals(state.cart).total));
      const swaps = lines
        .map((l) => ({ l, cheapest: sameKind(l.product)[0] }))
        .filter(({ l, cheapest }) => cheapest.id !== l.product.id)
        .map(({ l, cheapest }) => ({ swap: l.product.name, for: `${cheapest.brand} ${cheapest.name}`, saves_azn: round2((l.product.price - cheapest.price) * l.qty) }));
      return { ok: true, budget_azn: budget, estimated_total_azn: cost, fits: cost <= budget, difference_azn: round2(budget - cost), cheaper_swaps: swaps };
    }

    case "product_info": {
      const query = text(args.query, "query");
      const match = matchIngredient(query);
      if (!match) return { ok: false, message: `SiCart Market does not sell "${query}".` };
      const state = await getSnapshot(cartId);
      const p = match.product;
      return {
        ok: true,
        product: describe(p, state),
        ...where(p),
        allergens: p.allergens.length ? p.allergens : ["none listed"],
        per_100g: p.nutrition ?? null,
      };
    }

    case "start_checkout": {
      const state = await dispatch(cartId, { type: "checkout", at: now });
      const t = totals(state.cart);
      return { ok: true, total_azn: t.total, items: t.items, saved_azn: t.savings, next: "Hold your phone or card near the cart to pay." };
    }
  }
}
