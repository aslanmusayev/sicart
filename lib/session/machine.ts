// PURE session reducer: (state, action) -> state. No I/O, no clock, no randomness: everything comes in the action.
// The server (store.ts) persists the result, bumps nothing else and broadcasts the full snapshot.
import { findProduct, getProduct } from "../data/catalog";
import { ENTRANCE, getShelf } from "../data/storeMap";
import { recommend } from "../reco/score";
import { bestOffer } from "./totals";
import { SessionError, type CartLine, type ListItem, type SessionAction, type SessionState } from "./types";

export function idleState(cartId: number, version = 0): SessionState {
  return {
    cartId,
    sessionId: null,
    version,
    status: "idle",
    profile: null,
    cart: [],
    list: [],
    offers: [],
    position: { ...ENTRANCE },
    recommendation: null,
    focus: null,
    receiptId: null,
    lastEvent: null,
  };
}

const SHOPPING: SessionState["status"][] = ["connected", "shopping"];

function requireShopping(state: SessionState, what: string) {
  if (!SHOPPING.includes(state.status)) {
    throw new SessionError(`Cannot ${what} while the cart is ${state.status}`);
  }
}

function requireProduct(productId: string) {
  if (!findProduct(productId)) throw new SessionError(`Unknown product: ${productId}`, 400);
}

/** A list item is checked off once the cart holds at least the listed quantity. */
function syncChecks(list: ListItem[], cart: CartLine[]): ListItem[] {
  return list.map((item) => {
    const inCart = cart.find((l) => l.productId === item.productId)?.qty ?? 0;
    const checked = inCart >= item.qty;
    return checked === item.checked ? item : { ...item, checked };
  });
}

function withReco(state: SessionState, lastAddedProductId: string | null): SessionState {
  return {
    ...state,
    recommendation: recommend({
      cart: state.cart,
      list: state.list,
      offers: state.offers,
      history: state.profile?.history ?? {},
      lastAddedProductId,
    }),
  };
}

export function reduce(state: SessionState, action: SessionAction): SessionState {
  const next = apply(state, action);
  return { ...next, version: state.version + 1 };
}

function apply(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case "connect": {
      // Allowed from any status: a second phone scanning a busy cart takes it over (plan assumption A3).
      return {
        ...idleState(state.cartId),
        sessionId: action.sessionId,
        status: "connected",
        profile: action.profile,
        offers: action.offers,
        list: syncChecks(action.list, []),
        lastEvent: { type: "connected", at: action.at },
      };
    }

    case "add": {
      requireShopping(state, "add items");
      requireProduct(action.productId);
      const qty = action.qty ?? 1;
      if (qty < 1) throw new SessionError("Quantity must be at least 1", 400);
      const product = getProduct(action.productId);
      const existing = state.cart.find((l) => l.productId === product.id);
      const cart = existing
        ? state.cart.map((l) => (l.productId === product.id ? { ...l, qty: l.qty + qty } : l))
        : [
            ...state.cart,
            {
              productId: product.id,
              qty,
              unitPrice: product.price,
              discountPct: bestOffer(state.offers, product.id)?.discountPct ?? 0,
            },
          ];
      return withReco(
        {
          ...state,
          status: "shopping",
          cart,
          list: syncChecks(state.list, cart),
          // picking up the product you asked for answers the question
          focus: state.focus?.productId === product.id ? null : state.focus,
          position: { ...getShelf(product.shelfId).access },
          lastEvent: { type: "added", productId: product.id, at: action.at },
        },
        product.id,
      );
    }

    case "remove": {
      requireShopping(state, "remove items");
      const existing = state.cart.find((l) => l.productId === action.productId);
      if (!existing) throw new SessionError(`${action.productId} is not in the cart`, 404);
      const qty = action.qty ?? 1;
      const cart =
        existing.qty > qty
          ? state.cart.map((l) => (l.productId === action.productId ? { ...l, qty: l.qty - qty } : l))
          : state.cart.filter((l) => l.productId !== action.productId);
      const last = cart.at(-1)?.productId ?? null;
      return withReco(
        {
          ...state,
          status: cart.length ? "shopping" : "connected",
          cart,
          list: syncChecks(state.list, cart),
          lastEvent: { type: "removed", productId: action.productId, at: action.at },
        },
        last,
      );
    }

    case "position": {
      if (state.status === "idle") throw new SessionError("No shopper is connected");
      return { ...state, position: { ...action.position }, lastEvent: { type: "moved", at: action.at } };
    }

    case "list_add": {
      requireShopping(state, "change the list");
      let list = [...state.list];
      for (const item of action.items) {
        requireProduct(item.productId);
        const existing = list.find((l) => l.productId === item.productId);
        list = existing
          ? list.map((l) => (l.productId === item.productId ? { ...l, qty: Math.max(l.qty, item.qty) } : l))
          : [...list, { productId: item.productId, qty: item.qty, checked: false, source: item.source }];
      }
      return withReco(
        { ...state, list: syncChecks(list, state.cart), lastEvent: { type: "list", at: action.at } },
        state.cart.at(-1)?.productId ?? null,
      );
    }

    case "list_remove": {
      requireShopping(state, "change the list");
      const drop = new Set(action.productIds);
      return withReco(
        {
          ...state,
          list: state.list.filter((l) => !drop.has(l.productId)),
          lastEvent: { type: "list", at: action.at },
        },
        state.cart.at(-1)?.productId ?? null,
      );
    }

    case "focus": {
      requireShopping(state, "find products");
      if (action.productId) requireProduct(action.productId);
      return {
        ...state,
        focus: action.productId ? { productId: action.productId, at: action.at } : null,
        lastEvent: { type: "focus", productId: action.productId ?? undefined, at: action.at },
      };
    }

    case "checkout": {
      requireShopping(state, "check out");
      if (!state.cart.length) throw new SessionError("The cart is empty");
      return { ...state, status: "checkout", recommendation: null, focus: null, lastEvent: { type: "checkout", at: action.at } };
    }

    case "pay": {
      if (state.status !== "checkout") throw new SessionError(`Cannot pay while the cart is ${state.status}`);
      return { ...state, status: "paid", receiptId: action.receiptId, lastEvent: { type: "paid", at: action.at } };
    }

    case "reset": {
      return { ...idleState(state.cartId), lastEvent: { type: "reset", at: action.at } };
    }
  }
}
