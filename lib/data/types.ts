// Shared types for the static, typed store data (single source of truth, see PLAN.md section 2).

export type ZoneId =
  | "produce"
  | "bakery"
  | "meat"
  | "dairy"
  | "beverages"
  | "frozen"
  | "household"
  | "snacks"
  | "breakfast"
  | "pantry"
  | "pasta"
  | "sauces";

export type ShelfId =
  | "produce"
  | "bakery"
  | "meat"
  | "dairy"
  | "chilled-drinks"
  | "frozen"
  | "household"
  | "personal-care"
  | "snacks"
  | "sweets"
  | "breakfast"
  | "spreads"
  | "coffee-tea"
  | "canned"
  | "pasta"
  | "rice-grains"
  | "sauces"
  | "oils"
  | "spices"
  | "baking"
  | "soft-drinks"
  | "water";

export type Allergen = "gluten" | "eggs" | "milk" | "nuts" | "fish" | "sesame" | "soy";

/** Per 100 g (or 100 ml). */
export interface Nutrition {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: ZoneId;
  /** Price in AZN (manat). */
  price: number;
  /** Pack size shown to the shopper, e.g. "500 g". */
  unit: string;
  image: string;
  shelfId: ShelfId;
  /** 1 = bottom shelf, 4 = top shelf. Used by turn-by-turn directions ("second shelf"). */
  level: 1 | 2 | 3 | 4;
  /** Lower-case search words; the ingredient matcher and find_product use them. */
  tags: string[];
  allergens: Allergen[];
  nutrition?: Nutrition;
  /** Products in the same group are interchangeable; used by find_cheaper and the recipe matcher. */
  altGroup?: string;
}

export interface Cell {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Direction the shopper faces when standing on the access cell and looking at the shelf. */
export type Facing = "N" | "S" | "E" | "W";

export interface Shelf {
  id: ShelfId;
  label: string;
  zone: ZoneId;
  kind: "rack" | "wall" | "fridge" | "freezer";
  /** Footprint on the grid (blocked for walking). */
  rect: Rect;
  /** Walkable cell where the shopper stands to pick from this shelf. */
  access: Cell;
  facing: Facing;
  levels: number;
  /** Aisle number shown in directions, null for perimeter walls. */
  aisle: number | null;
}

export interface Zone {
  id: ZoneId;
  label: string;
}
