// A* over the store's walkable grid. 8 directions, diagonal cost √2, no corner cutting
// (a diagonal step is only allowed when both orthogonal neighbours are free), octile heuristic.
import { GRID, WALKABLE } from "../data/storeMap";
import type { Cell } from "../data/types";

export interface PathResult {
  /** Cells from start to goal, both included. */
  cells: Cell[];
  /** Length in metres (one cell = 1 m). */
  length: number;
}

const SQRT2 = Math.SQRT2;
const W = GRID.width;
const H = GRID.height;
const idx = (x: number, y: number) => y * W + x;
const free = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && WALKABLE[y][x];

const STEPS: [number, number, number][] = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, SQRT2],
  [1, -1, SQRT2],
  [-1, 1, SQRT2],
  [-1, -1, SQRT2],
];

function octile(ax: number, ay: number, bx: number, by: number): number {
  const dx = Math.abs(ax - bx);
  const dy = Math.abs(ay - by);
  return dx + dy + (SQRT2 - 2) * Math.min(dx, dy);
}

/** Minimal binary heap keyed by f-score (also used by the directions search). */
export class Heap {
  private items: { node: number; f: number }[] = [];
  get size() {
    return this.items.length;
  }
  push(node: number, f: number) {
    const a = this.items;
    a.push({ node, f });
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p].f <= a[i].f) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop(): number {
    const a = this.items;
    const top = a[0].node;
    const last = a.pop()!;
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && a[l].f < a[m].f) m = l;
        if (r < a.length && a[r].f < a[m].f) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top;
  }
}

const cache = new Map<string, PathResult | null>();

export function findPath(from: Cell, to: Cell): PathResult | null {
  const key = `${from.x},${from.y}>${to.x},${to.y}`;
  if (cache.has(key)) return cache.get(key)!;
  const result = search(from, to);
  cache.set(key, result);
  return result;
}

function search(from: Cell, to: Cell): PathResult | null {
  if (!free(from.x, from.y) || !free(to.x, to.y)) return null;
  if (from.x === to.x && from.y === to.y) return { cells: [{ ...from }], length: 0 };

  const g = new Float64Array(W * H).fill(Infinity);
  const parent = new Int32Array(W * H).fill(-1);
  const closed = new Uint8Array(W * H);
  const start = idx(from.x, from.y);
  const goal = idx(to.x, to.y);
  const open = new Heap();
  g[start] = 0;
  open.push(start, octile(from.x, from.y, to.x, to.y));

  while (open.size) {
    const current = open.pop();
    if (current === goal) break;
    if (closed[current]) continue;
    closed[current] = 1;
    const cx = current % W;
    const cy = (current - cx) / W;
    for (const [dx, dy, cost] of STEPS) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (!free(nx, ny)) continue;
      if (dx && dy && (!free(cx + dx, cy) || !free(cx, cy + dy))) continue; // no corner cutting
      const n = idx(nx, ny);
      const tentative = g[current] + cost;
      if (tentative < g[n]) {
        g[n] = tentative;
        parent[n] = current;
        open.push(n, tentative + octile(nx, ny, to.x, to.y));
      }
    }
  }

  if (!Number.isFinite(g[goal])) return null;
  const cells: Cell[] = [];
  for (let n = goal; n !== -1; n = parent[n]) cells.push({ x: n % W, y: Math.floor(n / W) });
  cells.reverse();
  return { cells, length: g[goal] };
}
