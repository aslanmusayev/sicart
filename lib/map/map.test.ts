import { describe, expect, it } from "vitest";
import { getPersona } from "../data/personas";
import { CHECKOUT, ENTRANCE, SHELVES, isWalkable } from "../data/storeMap";
import type { Cell } from "../data/types";
import { findPath } from "./astar";
import { cellCenter, unproject } from "./iso";
import { planRoute } from "./route";

const adjacent = (a: Cell, b: Cell) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) === 1;

describe("A*", () => {
  it("connects the entrance to every shelf and to checkout", () => {
    for (const s of SHELVES) expect(findPath(ENTRANCE, s.access), s.id).not.toBeNull();
    expect(findPath(ENTRANCE, CHECKOUT)).not.toBeNull();
  });

  it("returns a continuous walkable path without corner cutting", () => {
    const path = findPath(ENTRANCE, { x: 33, y: 3 })!;
    expect(path.cells[0]).toEqual(ENTRANCE);
    expect(path.cells.at(-1)).toEqual({ x: 33, y: 3 });
    for (let i = 1; i < path.cells.length; i++) {
      const [a, b] = [path.cells[i - 1], path.cells[i]];
      expect(isWalkable(b.x, b.y)).toBe(true);
      expect(adjacent(a, b)).toBe(true);
      if (a.x !== b.x && a.y !== b.y) {
        expect(isWalkable(b.x, a.y) && isWalkable(a.x, b.y)).toBe(true);
      }
    }
  });

  it("finds the straight-line length on an open floor", () => {
    expect(findPath({ x: 2, y: 3 }, { x: 12, y: 3 })!.length).toBe(10);
    expect(findPath({ x: 2, y: 21 }, { x: 5, y: 23 })!.length).toBeCloseTo(1 + 2 * Math.SQRT2, 5);
  });

  it("refuses blocked cells", () => {
    expect(findPath(ENTRANCE, { x: 4, y: 10 })).toBeNull(); // inside rack 1
  });
});

describe("route", () => {
  const aysel = getPersona("aysel").weeklyList.map((l) => l.productId);

  it("visits every list shelf once and ends at checkout", () => {
    const route = planRoute(ENTRANCE, aysel);
    const shelves = new Set(aysel.map((id) => route.stops.find((s) => s.productIds.includes(id))?.shelfId));
    expect(shelves.has(undefined)).toBe(false);
    expect(new Set(route.stops.map((s) => s.shelfId)).size).toBe(route.stops.length);
    expect(route.path[0]).toEqual(ENTRANCE);
    expect(route.path.at(-1)).toEqual(CHECKOUT);
    expect(route.etaMin).toBeGreaterThanOrEqual(1);
  });

  it("is no longer than visiting the stops in list order", () => {
    const route = planRoute(ENTRANCE, aysel);
    let naive = 0;
    let prev = ENTRANCE;
    const seen = new Set<string>();
    for (const id of aysel) {
      const stop = route.stops.find((s) => s.productIds.includes(id))!;
      const key = `${stop.cell.x},${stop.cell.y}`;
      if (seen.has(key)) continue;
      seen.add(key);
      naive += findPath(prev, stop.cell)!.length;
      prev = stop.cell;
    }
    naive += findPath(prev, CHECKOUT)!.length;
    expect(route.length).toBeLessThanOrEqual(naive + 1e-9);
  });

  it("visits a focused product's shelf first", () => {
    const route = planRoute(ENTRANCE, aysel, { first: "olive-oil" });
    expect(route.stops[0].shelfId).toBe("oils");
    expect(route.stops.filter((s) => s.shelfId === "oils")).toHaveLength(1);
    expect(route.path.at(-1)).toEqual(CHECKOUT);
  });

  it("goes straight to checkout when nothing is left", () => {
    const route = planRoute({ x: 19, y: 12 }, []);
    expect(route.stops).toEqual([]);
    expect(route.path.at(-1)).toEqual(CHECKOUT);
  });
});

describe("iso projection", () => {
  it("round-trips cell centres", () => {
    for (const c of [ENTRANCE, CHECKOUT, { x: 0, y: 0 }, { x: 39, y: 27 }, { x: 17, y: 9 }]) {
      const p = cellCenter(c.x, c.y);
      expect(unproject(p.sx, p.sy)).toEqual(c);
    }
  });
});
