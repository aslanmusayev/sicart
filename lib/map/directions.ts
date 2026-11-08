// Turn-by-turn directions from the A* path (PLAN.md flow 5): "Walk 6 meters, then turn left into Aisle 4.
// Pasta is on your right, second shelf." One grid cell = 1 metre. Grid y grows towards the entrance, so a
// positive change in heading angle is a turn to the RIGHT.
import { getProduct } from "../data/catalog";
import { GRID, getShelf, isWalkable } from "../data/storeMap";
import type { Cell, Facing } from "../data/types";
import { Heap } from "./astar";

// The map draws the smooth 8-direction A* path, but people need few, clean, right-angle turns.
// So directions use their own search: 4 directions, each turn costs TURN_COST extra metres.
const TURN_COST = 4;
const DIRS: [number, number][] = [
  [1, 0], // E
  [0, 1], // S
  [-1, 0], // W
  [0, -1], // N
];

function fewTurnsPath(from: Cell, to: Cell): Cell[] | null {
  if (!isWalkable(from.x, from.y) || !isWalkable(to.x, to.y)) return null;
  const W = GRID.width;
  const states = W * GRID.height * 4;
  const cost = new Float64Array(states).fill(Infinity);
  const parent = new Int32Array(states).fill(-1);
  const open = new Heap();
  for (let d = 0; d < 4; d++) {
    const s = (from.y * W + from.x) * 4 + d;
    cost[s] = 0;
    open.push(s, 0);
  }
  let goal = -1;
  while (open.size) {
    const s = open.pop();
    const d = s % 4;
    const cell = (s - d) / 4;
    const x = cell % W;
    const y = (cell - x) / W;
    if (x === to.x && y === to.y) {
      goal = s;
      break;
    }
    for (let nd = 0; nd < 4; nd++) {
      const nx = x + DIRS[nd][0];
      const ny = y + DIRS[nd][1];
      if (!isWalkable(nx, ny)) continue;
      const ns = (ny * W + nx) * 4 + nd;
      const c = cost[s] + 1 + (nd === d ? 0 : TURN_COST);
      if (c < cost[ns]) {
        cost[ns] = c;
        parent[ns] = s;
        open.push(ns, c);
      }
    }
  }
  if (goal < 0) return null;
  const cells: Cell[] = [];
  for (let s = goal; s !== -1; s = parent[s]) {
    const cell = Math.floor(s / 4);
    const c = { x: cell % W, y: Math.floor(cell / W) };
    if (!cells.length || cells[0].x !== c.x || cells[0].y !== c.y) cells.unshift(c);
  }
  return cells;
}

const SHELF_LEVEL = { 1: "bottom shelf", 2: "second shelf", 3: "third shelf", 4: "top shelf" } as const;
const FACING_ANGLE: Record<Facing, number> = { E: 0, S: 90, W: 180, N: -90 };

interface Segment {
  dx: number;
  dy: number;
  length: number;
  end: Cell;
}

const angle = (dx: number, dy: number) => (Math.atan2(dy, dx) * 180) / Math.PI;
function turnBetween(from: number, to: number): number {
  let d = to - from;
  while (d > 180) d -= 360;
  while (d <= -180) d += 360;
  return d;
}

/** Aisle number of a walkway cell between racks (y 6-19), else null. */
function aisleAt(c: Cell): number | null {
  if (c.y < 6 || c.y > 19) return null;
  if (c.x >= 34 && c.x <= 36) return 9;
  for (let k = 1; k <= 8; k++) if (c.x === 4 * k - 2 || c.x === 4 * k - 1) return k;
  return null;
}

/** Straight runs of the path; tiny diagonal jogs around corners are folded into the next run. */
function segments(path: Cell[]): Segment[] {
  const runs: Segment[] = [];
  for (let i = 1; i < path.length; i++) {
    const dx = path[i].x - path[i - 1].x;
    const dy = path[i].y - path[i - 1].y;
    const step = dx && dy ? Math.SQRT2 : 1;
    const last = runs.at(-1);
    if (last && last.dx === dx && last.dy === dy) {
      last.length += step;
      last.end = path[i];
    } else {
      runs.push({ dx, dy, length: step, end: path[i] });
    }
  }
  const merged: Segment[] = [];
  let carry = 0;
  for (const r of runs) {
    if (r.length < 1.5 && r !== runs.at(-1)) {
      carry += r.length;
      continue;
    }
    merged.push({ ...r, length: r.length + carry });
    carry = 0;
  }
  return merged;
}

const metres = (n: number) => {
  const m = Math.max(1, Math.round(n));
  return `${m} ${m === 1 ? "meter" : "meters"}`;
};

/** Spoken directions from `from` to the shelf of `productId`, one sentence per turn. */
export function directionsTo(from: Cell, productId: string): string[] {
  const product = getProduct(productId);
  const shelf = getShelf(product.shelfId);
  const where = `${product.name} is`;
  const cells = fewTurnsPath(from, shelf.access);
  if (!cells) return [`${product.name} is in ${shelf.label}.`];

  const sideOf = (heading: number) => {
    const t = turnBetween(heading, FACING_ANGLE[shelf.facing]);
    return Math.abs(t) < 45 ? "straight ahead" : Math.abs(t) > 135 ? "behind you" : t > 0 ? "on your right" : "on your left";
  };
  const arrive = (heading: number | null) =>
    `${where} ${heading === null ? "right here" : sideOf(heading)}, ${SHELF_LEVEL[product.level]}.`;

  const segs = segments(cells);
  if (!segs.length) return [arrive(null)];

  const steps: string[] = [];
  let heading = angle(segs[0].dx, segs[0].dy);
  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i];
    const next = segs[i + 1];
    if (!next) {
      steps.push(`Walk ${metres(seg.length)}. ${arrive(angle(seg.dx, seg.dy))}`);
      break;
    }
    const nextHeading = angle(next.dx, next.dy);
    const t = turnBetween(heading, nextHeading);
    const aisle = aisleAt(next.end);
    const into = aisle && aisleAt(seg.end) !== aisle ? ` into Aisle ${aisle}` : "";
    const turn = Math.abs(t) < 30 ? "keep going" : Math.abs(t) > 150 ? "turn around" : t > 0 ? "turn right" : "turn left";
    steps.push(`Walk ${metres(seg.length)}, then ${turn}${into}.`);
    heading = nextHeading;
  }
  return steps;
}
