// Multi-stop shopping route: from where the cart is now, through the shelves of every unchecked list item,
// ending at checkout. Order = nearest neighbour, then improved with 2-opt (the end stays fixed at checkout).
import { getProduct } from "../data/catalog";
import { CHECKOUT, getShelf } from "../data/storeMap";
import type { Cell, ShelfId } from "../data/types";
import { findPath } from "./astar";

export interface RouteStop {
  shelfId: ShelfId;
  cell: Cell;
  productIds: string[];
}

export interface Route {
  stops: RouteStop[];
  /** Every cell walked, from the current position to checkout. */
  path: Cell[];
  /** Metres. */
  length: number;
  /** Rough minutes: walking at 1 m/s plus 20 s per stop to pick. */
  etaMin: number;
}

const WALK_M_PER_S = 1;
const PICK_S = 20;

const same = (a: Cell, b: Cell) => a.x === b.x && a.y === b.y;

function distance(a: Cell, b: Cell): number {
  return findPath(a, b)?.length ?? Infinity;
}

/** Total length of start -> order... -> end. */
function tourLength(start: Cell, order: Cell[], end: Cell): number {
  let total = 0;
  let prev = start;
  for (const c of [...order, end]) {
    total += distance(prev, c);
    prev = c;
  }
  return total;
}

function nearestNeighbour(start: Cell, cells: Cell[]): Cell[] {
  const left = [...cells];
  const order: Cell[] = [];
  let current = start;
  while (left.length) {
    let best = 0;
    for (let i = 1; i < left.length; i++) if (distance(current, left[i]) < distance(current, left[best])) best = i;
    current = left.splice(best, 1)[0];
    order.push(current);
  }
  return order;
}

/** 2-opt on an open path with fixed start and end: reverse segments while it gets shorter. */
function twoOpt(start: Cell, order: Cell[], end: Cell): Cell[] {
  let best = order;
  let bestLen = tourLength(start, best, end);
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 0; i < best.length - 1; i++) {
      for (let k = i + 1; k < best.length; k++) {
        const candidate = [...best.slice(0, i), ...best.slice(i, k + 1).reverse(), ...best.slice(k + 1)];
        const len = tourLength(start, candidate, end);
        if (len < bestLen - 1e-9) {
          best = candidate;
          bestLen = len;
          improved = true;
        }
      }
    }
  }
  return best;
}

export interface RouteOptions {
  /** Visit this product's shelf first (find_product), then optimise the rest from there. */
  first?: string | null;
}

export function planRoute(position: Cell, productIds: string[], options: RouteOptions = {}): Route {
  const ids = options.first && !productIds.includes(options.first) ? [options.first, ...productIds] : productIds;
  // group products by shelf: one stop per shelf
  const byShelf = new Map<ShelfId, string[]>();
  for (const id of ids) {
    const shelfId = getProduct(id).shelfId;
    byShelf.set(shelfId, [...(byShelf.get(shelfId) ?? []), id]);
  }
  const stopsByCell = new Map<string, RouteStop>();
  for (const [shelfId, ids] of byShelf) {
    const cell = getShelf(shelfId).access;
    stopsByCell.set(`${cell.x},${cell.y}`, { shelfId, cell, productIds: ids });
  }

  const firstCell = options.first ? getShelf(getProduct(options.first).shelfId).access : null;
  const forced = firstCell && !same(firstCell, position) ? firstCell : null;
  const cells = [...stopsByCell.values()]
    .map((s) => s.cell)
    .filter((c) => !same(c, position) && !(forced && same(c, forced)));
  const from = forced ?? position;
  const rest = cells.length > 2 ? twoOpt(from, nearestNeighbour(from, cells), CHECKOUT) : nearestNeighbour(from, cells);
  const order = forced ? [forced, ...rest] : rest;

  const path: Cell[] = [];
  let length = 0;
  let prev = position;
  for (const c of [...order, CHECKOUT]) {
    const leg = findPath(prev, c);
    if (leg) {
      path.push(...(path.length ? leg.cells.slice(1) : leg.cells));
      length += leg.length;
    }
    prev = c;
  }

  const stops = order.map((c) => stopsByCell.get(`${c.x},${c.y}`)!);
  const seconds = length / WALK_M_PER_S + stops.length * PICK_S;
  return { stops, path, length, etaMin: Math.max(1, Math.round(seconds / 60)) };
}
