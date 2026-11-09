import { describe, expect, it } from "vitest";
import { getPersona, TODAYS_DEALS } from "../data/personas";
import { ENTRANCE, getShelf } from "../data/storeMap";
import { idleState, MAX_QTY, reduce } from "./machine";
import { totals } from "./totals";
import { SessionError, type SessionAction, type SessionState } from "./types";

const aysel = getPersona("aysel");

function connectAysel(state = idleState(12)): SessionState {
  return reduce(state, {
    type: "connect",
    sessionId: "s1",
    at: 1,
    profile: {
      id: "p-aysel",
      key: "aysel",
      name: "Aysel",
      avatar: null,
      a11yMode: false,
      isGuest: false,
      history: Object.fromEntries(aysel.history.map((h) => [h.productId, h.count])),
    },
    offers: [
      ...aysel.offers.map((o) => ({ ...o, personal: true })),
      ...TODAYS_DEALS.map((o) => ({ ...o, personal: false })),
    ],
    list: aysel.weeklyList.map((l) => ({ ...l, checked: false, source: "list" as const })),
  });
}

const run = (state: SessionState, ...actions: SessionAction[]) => actions.reduce(reduce, state);
const add = (productId: string, qty?: number): SessionAction => ({ type: "add", productId, qty, at: 2 });
const remove = (productId: string, qty?: number): SessionAction => ({ type: "remove", productId, qty, at: 3 });

describe("session machine", () => {
  it("starts idle at the entrance", () => {
    const s = idleState(12);
    expect(s.status).toBe("idle");
    expect(s.position).toEqual(ENTRANCE);
  });

  it("refuses to add items when nobody is connected", () => {
    expect(() => reduce(idleState(12), add("spaghetti"))).toThrow(SessionError);
  });

  it("connects a persona with her list and offers", () => {
    const s = connectAysel();
    expect(s.status).toBe("connected");
    expect(s.profile?.name).toBe("Aysel");
    expect(s.list).toHaveLength(aysel.weeklyList.length);
    expect(s.list.every((l) => !l.checked)).toBe(true);
    expect(s.version).toBe(1);
  });

  it("adds a product, moves to its shelf and recommends the sauce with her 20% offer", () => {
    const s = run(connectAysel(), add("spaghetti"));
    expect(s.status).toBe("shopping");
    expect(s.cart).toEqual([{ productId: "spaghetti", qty: 1, unitPrice: 2.4, discountPct: 0 }]);
    expect(s.position).toEqual(getShelf("pasta").access);
    expect(s.recommendation).toMatchObject({ productId: "tomato-basil-sauce", fromProductId: "spaghetti", discountPct: 20 });
    expect(s.recommendation?.why).toBeTruthy();
    expect(s.lastEvent).toMatchObject({ type: "added", productId: "spaghetti" });
  });

  it("applies the best offer to the line and to the totals", () => {
    const s = run(connectAysel(), add("tomato-basil-sauce", 2));
    expect(s.cart[0].discountPct).toBe(20);
    expect(totals(s.cart)).toEqual({ subtotal: 6.6, total: 5.28, savings: 1.32, items: 2 });
  });

  it("checks a list item off only when the listed quantity is in the cart", () => {
    let s = run(connectAysel(), add("milk"));
    expect(s.list.find((l) => l.productId === "milk")?.checked).toBe(false); // list wants 2
    s = reduce(s, add("milk"));
    expect(s.list.find((l) => l.productId === "milk")?.checked).toBe(true);
    s = reduce(s, remove("milk"));
    expect(s.list.find((l) => l.productId === "milk")?.checked).toBe(false);
  });

  it("goes back to connected when the last item is removed", () => {
    const s = run(connectAysel(), add("spaghetti"), remove("spaghetti"));
    expect(s.cart).toEqual([]);
    expect(s.status).toBe("connected");
    expect(s.recommendation).toBeNull();
  });

  it("never recommends something already in the cart or on the list", () => {
    const s = run(connectAysel(), add("spaghetti"), add("tomato-basil-sauce"));
    expect(s.recommendation?.productId).not.toBe("tomato-basil-sauce");
    expect(s.recommendation?.productId).not.toBe("spaghetti");
  });

  it("merges list additions from a recipe", () => {
    const s = run(connectAysel(), {
      type: "list_add",
      at: 4,
      items: [
        { productId: "pecorino", qty: 1, source: "recipe" },
        { productId: "milk", qty: 1, source: "recipe" }, // already listed with qty 2: keeps 2
      ],
    });
    expect(s.list.find((l) => l.productId === "pecorino")).toMatchObject({ qty: 1, source: "recipe", checked: false });
    expect(s.list.find((l) => l.productId === "milk")?.qty).toBe(2);
    const t = reduce(s, { type: "list_remove", productIds: ["pecorino"], at: 5 });
    expect(t.list.some((l) => l.productId === "pecorino")).toBe(false);
  });

  it("runs checkout -> pay -> reset and guards every step", () => {
    const shopping = run(connectAysel(), add("spaghetti"));
    expect(() => reduce(connectAysel(), { type: "checkout", at: 5 })).toThrow("empty");
    expect(() => reduce(shopping, { type: "pay", receiptId: "r1", at: 5 })).toThrow(SessionError);

    const checkout = reduce(shopping, { type: "checkout", at: 5 });
    expect(checkout.status).toBe("checkout");
    expect(() => reduce(checkout, add("milk"))).toThrow(SessionError);

    const paid = reduce(checkout, { type: "pay", receiptId: "r1", at: 6 });
    expect(paid).toMatchObject({ status: "paid", receiptId: "r1" });
    expect(() => reduce(paid, { type: "pay", receiptId: "r2", at: 7 })).toThrow(SessionError);

    const reset = reduce(paid, { type: "reset", at: 8 });
    expect(reset).toMatchObject({ status: "idle", cart: [], profile: null, sessionId: null });
    expect(reset.version).toBe(paid.version + 1);
  });

  it("goes back to shopping from the payment screen", () => {
    const checkout = run(connectAysel(), add("spaghetti"), { type: "checkout", at: 5 });
    const back = reduce(checkout, { type: "resume", at: 6 });
    expect(back.status).toBe("shopping");
    expect(back.cart).toHaveLength(1);
    expect(back.recommendation).not.toBeNull();
    expect(back.lastEvent).toMatchObject({ type: "resumed" });
    expect(reduce(back, add("milk")).cart).toHaveLength(2); // shopping works again
    expect(() => reduce(back, { type: "resume", at: 7 })).toThrow(SessionError);
  });

  it("lets a second phone take over a busy cart", () => {
    const busy = run(connectAysel(), add("spaghetti"));
    const taken = connectAysel(busy);
    expect(taken.cart).toEqual([]);
    expect(taken.version).toBe(busy.version + 1);
  });

  it("focuses a product the shopper asked for and clears it once picked up", () => {
    const s = reduce(connectAysel(), { type: "focus", productId: "olive-oil", at: 4 });
    expect(s.focus).toEqual({ productId: "olive-oil", at: 4 });
    expect(reduce(s, add("spaghetti")).focus?.productId).toBe("olive-oil");
    expect(reduce(s, add("olive-oil")).focus).toBeNull();
    expect(reduce(s, { type: "focus", productId: null, at: 5 }).focus).toBeNull();
    const listed = reduce(s, { type: "list_add", at: 6, items: [{ productId: "olive-oil", qty: 1, source: "voice" }] });
    expect(reduce(listed, { type: "list_remove", productIds: ["olive-oil"], at: 7 }).focus).toBeNull();
    expect(() => reduce(idleState(12), { type: "focus", productId: "milk", at: 1 })).toThrow(SessionError);
  });

  it("increments the version on every action and rejects unknown products", () => {
    const s = run(connectAysel(), add("spaghetti"), add("milk"), { type: "position", position: { x: 5, y: 5 }, at: 9 });
    expect(s.version).toBe(4);
    expect(s.position).toEqual({ x: 5, y: 5 });
    expect(() => reduce(s, add("caviar"))).toThrow("Unknown product");
  });

  describe("quantity and position limits", () => {
    const bad = (state: SessionState, action: SessionAction) => expect(() => reduce(state, action)).toThrow(SessionError);

    it("rejects zero, negative, fractional and huge quantities", () => {
      const s = run(connectAysel(), add("milk", 1));
      for (const qty of [0, -5, 1.5, 1000]) {
        bad(s, add("milk", qty));
        bad(s, remove("milk", qty));
      }
    });

    it("a negative remove can never add products", () => {
      const s = run(connectAysel(), add("milk", 1));
      expect(() => reduce(s, remove("milk", -5))).toThrow(SessionError);
      expect(s.cart[0].qty).toBe(1);
    });

    it("caps one product at MAX_QTY in the cart", () => {
      const s = run(connectAysel(), add("tomatoes", MAX_QTY));
      expect(s.cart[0].qty).toBe(MAX_QTY);
      bad(s, add("tomatoes", 1));
    });

    it("keeps the cart inside the store map", () => {
      const s = connectAysel();
      for (const position of [{ x: -1, y: 5 }, { x: 5, y: -1 }, { x: 999, y: 5 }, { x: 5, y: 99999 }, { x: 1.5, y: 2 }]) {
        bad(s, { type: "position", position, at: 4 });
      }
      expect(reduce(s, { type: "position", position: { x: 3, y: 4 }, at: 4 }).position).toEqual({ x: 3, y: 4 });
    });

    it("clamps list quantities from recipes and voice into 1..MAX_QTY", () => {
      const s = reduce(connectAysel(), {
        type: "list_add",
        at: 5,
        items: [
          { productId: "spaghetti", qty: 500, source: "recipe" },
          { productId: "pecorino", qty: -3, source: "voice" },
        ],
      });
      expect(s.list.find((l) => l.productId === "spaghetti")?.qty).toBe(MAX_QTY);
      expect(s.list.find((l) => l.productId === "pecorino")?.qty).toBe(1);
    });
  });
});
