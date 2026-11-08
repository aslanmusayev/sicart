// Isometric (2:1 dimetric) projection of the store grid into SVG coordinates.
import { GRID } from "../data/storeMap";

/** Screen size of one grid cell. */
export const TILE_W = 24;
/** Slightly steeper than true 2:1 isometric so the map fills the tall centre panel better. */
export const TILE_H = 15;

/** Offset so the whole floor sits at positive coordinates (left corner of the floor is x = 0). */
const OFFSET_X = GRID.height * (TILE_W / 2);
const OFFSET_Y = 40; // headroom for the tallest shelves

export interface Point {
  sx: number;
  sy: number;
}

/** Grid point (cell corners are integers, cell centres are +0.5) -> SVG point on the floor, lifted by z px. */
export function iso(x: number, y: number, z = 0): Point {
  return {
    sx: OFFSET_X + (x - y) * (TILE_W / 2),
    sy: OFFSET_Y + (x + y) * (TILE_H / 2) - z,
  };
}

/** Centre of a cell on the floor. */
export function cellCenter(x: number, y: number): Point {
  return iso(x + 0.5, y + 0.5);
}

/** SVG point on the floor -> grid cell. */
export function unproject(sx: number, sy: number): { x: number; y: number } {
  const a = (sx - OFFSET_X) / (TILE_W / 2); // x - y
  const b = (sy - OFFSET_Y) / (TILE_H / 2); // x + y
  return { x: Math.floor((a + b) / 2), y: Math.floor((b - a) / 2) };
}

/** Tight viewBox around the floor (outer wall cells excluded) plus headroom for shelves and labels. */
const LEFT = OFFSET_X + (1 - (GRID.height - 1)) * (TILE_W / 2);
const RIGHT = OFFSET_X + (GRID.width - 1 - 1) * (TILE_W / 2);
const BOTTOM = OFFSET_Y + (GRID.width - 1 + GRID.height - 1) * (TILE_H / 2);
export const VIEW = {
  x: LEFT - 6,
  y: 4,
  width: RIGHT - LEFT + 12,
  height: BOTTOM + 6 - 4,
};
