import type { Cell, Rect, Shelf, ShelfId, Zone, ZoneId } from "./types";

// Fictional "SiCart Market". One grid cell = 1 metre.
// x grows to the right (0..39), y grows towards the entrance (0..27).
//
//   y=1-2   perimeter: Produce | Bakery | Meat & Fish | Dairy & Eggs
//   y=3-5   top cross aisle
//   y=6-19  8 two-sided racks (x = 4, 8, ..., 32, each 2 wide), aisles 1-9 between them;
//           chilled drinks fridges on the right wall
//   y=20-23 bottom cross aisle
//   y=24-25 frozen freezers (left) and 3 checkout counters (right)
//   entrance bottom-left at (3, 26)

export const GRID = { width: 40, height: 28 } as const;

export const ENTRANCE: Cell = { x: 3, y: 26 };
export const CHECKOUT: Cell = { x: 29, y: 23 };

export const ZONES: Zone[] = [
  { id: "produce", label: "Fruit & Vegetables" },
  { id: "bakery", label: "Bakery" },
  { id: "meat", label: "Meat & Fish" },
  { id: "dairy", label: "Dairy & Eggs" },
  { id: "beverages", label: "Drinks" },
  { id: "frozen", label: "Frozen" },
  { id: "household", label: "Home & Care" },
  { id: "snacks", label: "Snacks & Sweets" },
  { id: "breakfast", label: "Breakfast, Coffee & Tea" },
  { id: "pantry", label: "Pantry" },
  { id: "pasta", label: "Pasta & Rice" },
  { id: "sauces", label: "Sauces & Oils" },
];

const RACK_Y = 6;
const RACK_H = 14;
const RACK_ACCESS_Y = 12;

/** Rack k (1..8) sits at x = 4k. Its left face is in aisle k, its right face in aisle k + 1. */
function rackFaces(
  k: number,
  left: [ShelfId, string, ZoneId],
  right: [ShelfId, string, ZoneId],
): Shelf[] {
  const x = 4 * k;
  const rect: Rect = { x, y: RACK_Y, w: 2, h: RACK_H };
  return [
    {
      id: left[0],
      label: left[1],
      zone: left[2],
      kind: "rack",
      rect,
      access: { x: x - 1, y: RACK_ACCESS_Y },
      facing: "E",
      levels: 4,
      aisle: k,
    },
    {
      id: right[0],
      label: right[1],
      zone: right[2],
      kind: "rack",
      rect,
      access: { x: x + 2, y: RACK_ACCESS_Y },
      facing: "W",
      levels: 4,
      aisle: k + 1,
    },
  ];
}

export const SHELVES: Shelf[] = [
  // perimeter, top wall
  { id: "produce", label: "Fruit & Vegetables", zone: "produce", kind: "wall", rect: { x: 2, y: 1, w: 10, h: 2 }, access: { x: 7, y: 3 }, facing: "N", levels: 3, aisle: null },
  { id: "bakery", label: "Bakery", zone: "bakery", kind: "wall", rect: { x: 12, y: 1, w: 8, h: 2 }, access: { x: 16, y: 3 }, facing: "N", levels: 3, aisle: null },
  { id: "meat", label: "Meat & Fish", zone: "meat", kind: "fridge", rect: { x: 20, y: 1, w: 8, h: 2 }, access: { x: 24, y: 3 }, facing: "N", levels: 3, aisle: null },
  { id: "dairy", label: "Dairy & Eggs", zone: "dairy", kind: "fridge", rect: { x: 28, y: 1, w: 10, h: 2 }, access: { x: 33, y: 3 }, facing: "N", levels: 4, aisle: null },
  // right wall fridges, reached from aisle 9
  { id: "chilled-drinks", label: "Chilled Drinks", zone: "beverages", kind: "fridge", rect: { x: 37, y: 6, w: 2, h: 14 }, access: { x: 36, y: 12 }, facing: "E", levels: 4, aisle: 9 },
  // bottom-left freezers
  { id: "frozen", label: "Frozen", zone: "frozen", kind: "freezer", rect: { x: 4, y: 24, w: 14, h: 2 }, access: { x: 10, y: 23 }, facing: "S", levels: 2, aisle: null },
  // racks
  ...rackFaces(1, ["household", "Household", "household"], ["personal-care", "Personal Care", "household"]),
  ...rackFaces(2, ["snacks", "Snacks & Nuts", "snacks"], ["sweets", "Sweets", "snacks"]),
  ...rackFaces(3, ["breakfast", "Cereal & Oats", "breakfast"], ["spreads", "Honey & Spreads", "breakfast"]),
  ...rackFaces(4, ["coffee-tea", "Coffee & Tea", "breakfast"], ["canned", "Canned & Jars", "pantry"]),
  ...rackFaces(5, ["pasta", "Pasta", "pasta"], ["rice-grains", "Rice & Grains", "pasta"]),
  ...rackFaces(6, ["sauces", "Pasta Sauces", "sauces"], ["oils", "Oils & Vinegar", "sauces"]),
  ...rackFaces(7, ["spices", "Spices & Salt", "pantry"], ["baking", "Baking", "pantry"]),
  ...rackFaces(8, ["soft-drinks", "Soft Drinks", "beverages"], ["water", "Water", "beverages"]),
];

/** Decorative blocks that are not shelves but still block walking. */
export const COUNTERS: Rect[] = [
  { x: 26, y: 24, w: 2, h: 2 },
  { x: 31, y: 24, w: 2, h: 2 },
  { x: 36, y: 24, w: 2, h: 2 },
];

const SHELF_BY_ID = new Map(SHELVES.map((s) => [s.id, s]));

export function getShelf(id: ShelfId): Shelf {
  const shelf = SHELF_BY_ID.get(id);
  if (!shelf) throw new Error(`Unknown shelf: ${id}`);
  return shelf;
}

function inRect(x: number, y: number, r: Rect): boolean {
  return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
}

/** Unique rack footprints (two faces share one rect). */
const BLOCKS: Rect[] = [
  ...Array.from(new Map(SHELVES.map((s) => [`${s.rect.x},${s.rect.y}`, s.rect])).values()),
  ...COUNTERS,
];

export function isWalkable(x: number, y: number): boolean {
  if (x <= 0 || y <= 0 || x >= GRID.width - 1 || y >= GRID.height - 1) return false; // outer wall
  return !BLOCKS.some((r) => inRect(x, y, r));
}

/** Grid of booleans, [y][x], true = walkable. Built once. */
export const WALKABLE: boolean[][] = Array.from({ length: GRID.height }, (_, y) =>
  Array.from({ length: GRID.width }, (_, x) => isWalkable(x, y)),
);
