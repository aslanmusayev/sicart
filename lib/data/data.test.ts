import { describe, expect, it } from "vitest";
import { CATALOG, alternativesOf, findProduct, getProduct } from "./catalog";
import { PAIRINGS } from "./pairings";
import { PERSONAS, TODAYS_DEALS } from "./personas";
import { RECIPES, INGREDIENT_SYNONYMS } from "./recipes";
import { CHECKOUT, ENTRANCE, SHELVES, WALKABLE, isWalkable } from "./storeMap";
import { WHY_LINES } from "./whyLines";

const exists = (id: string) => findProduct(id) !== undefined;

describe("catalog", () => {
  it("has about 80 products with unique ids", () => {
    expect(CATALOG.length).toBeGreaterThanOrEqual(75);
    expect(CATALOG.length).toBeLessThanOrEqual(95);
    expect(new Set(CATALOG.map((p) => p.id)).size).toBe(CATALOG.length);
  });

  it("has positive prices and a valid shelf level", () => {
    for (const p of CATALOG) {
      expect(p.price, p.id).toBeGreaterThan(0);
      const shelf = SHELVES.find((s) => s.id === p.shelfId);
      expect(shelf, p.id).toBeDefined();
      expect(p.level, p.id).toBeLessThanOrEqual(shelf!.levels);
    }
  });

  it("offers a cheaper pecorino that saves 2.10 AZN (stage line)", () => {
    const premium = getProduct("pecorino-dop");
    const [cheapest] = alternativesOf(premium);
    expect(cheapest.id).toBe("pecorino");
    expect(Math.round((premium.price - cheapest.price) * 100) / 100).toBe(2.1);
  });
});

describe("store map", () => {
  it("has walkable entrance, checkout and shelf access cells", () => {
    expect(isWalkable(ENTRANCE.x, ENTRANCE.y)).toBe(true);
    expect(isWalkable(CHECKOUT.x, CHECKOUT.y)).toBe(true);
    for (const s of SHELVES) expect(isWalkable(s.access.x, s.access.y), s.id).toBe(true);
  });

  it("places every access cell next to its shelf", () => {
    for (const s of SHELVES) {
      const { x, y } = s.access;
      const r = s.rect;
      const touches =
        (x >= r.x - 1 && x <= r.x + r.w && y >= r.y && y < r.y + r.h) ||
        (y >= r.y - 1 && y <= r.y + r.h && x >= r.x && x < r.x + r.w);
      expect(touches, s.id).toBe(true);
    }
  });

  it("has a walkable grid of the right size", () => {
    expect(WALKABLE.length).toBe(28);
    expect(WALKABLE[0].length).toBe(40);
  });
});

describe("references", () => {
  it("personas and deals point at real products", () => {
    for (const persona of PERSONAS) {
      for (const h of persona.history) expect(exists(h.productId), h.productId).toBe(true);
      for (const l of persona.weeklyList) expect(exists(l.productId), l.productId).toBe(true);
      for (const o of persona.offers) expect(exists(o.productId), o.productId).toBe(true);
    }
    for (const d of TODAYS_DEALS) expect(exists(d.productId), d.productId).toBe(true);
  });

  it("pairings point at real products and every pairing has a why line", () => {
    for (const [from, targets] of Object.entries(PAIRINGS)) {
      expect(exists(from), from).toBe(true);
      for (const t of targets) {
        expect(exists(t.to), `${from}->${t.to}`).toBe(true);
        expect(WHY_LINES[`${from}->${t.to}`], `${from}->${t.to}`).toBeTruthy();
      }
    }
  });

  it("every why line belongs to a pairing", () => {
    for (const key of Object.keys(WHY_LINES)) {
      const [from, to] = key.split("->");
      expect(PAIRINGS[from]?.some((t) => t.to === to), key).toBe(true);
    }
  });

  it("every recipe ingredient and synonym target matches at least one product tag", () => {
    const tags = new Set(CATALOG.flatMap((p) => p.tags));
    for (const r of RECIPES) for (const i of r.ingredients) expect(tags.has(i.query), `${r.id}: ${i.query}`).toBe(true);
    for (const target of Object.values(INGREDIENT_SYNONYMS)) expect(tags.has(target), target).toBe(true);
  });

  it("carbonara has 5 ingredients", () => {
    expect(RECIPES.find((r) => r.id === "carbonara")!.ingredients).toHaveLength(5);
  });
});
