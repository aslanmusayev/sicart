// Fixed database ids for seeded rows, shared by scripts/gen-seed.ts and the app,
// so the server can look personas up by key without a query.
import type { PersonaKey } from "./personas";

export const PERSONA_IDS: Record<PersonaKey, string> = {
  aysel: "00000000-0000-4000-8000-0000000000a1",
  murad: "00000000-0000-4000-8000-0000000000a2",
};

export const LIST_IDS: Record<PersonaKey, string> = {
  aysel: "00000000-0000-4000-8000-0000000001a1",
  murad: "00000000-0000-4000-8000-0000000001a2",
};

/** The demo cart number printed on the cart ("Cart 12"). */
export const DEMO_CART_ID = 12;
export const DEMO_CARTS = [DEMO_CART_ID];
