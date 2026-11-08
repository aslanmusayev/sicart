import type { PersonaKey } from "../data/personas";
import type { Cell } from "../data/types";

export type SessionStatus = "idle" | "connected" | "shopping" | "checkout" | "paid";

export interface SessionProfile {
  id: string;
  key: PersonaKey | null;
  name: string;
  avatar: string | null;
  a11yMode: boolean;
  isGuest: boolean;
  /** productId -> times bought; feeds the recommendation scorer. */
  history: Record<string, number>;
}

export interface Offer {
  productId: string;
  discountPct: number;
  reason: string;
  /** true = made for this shopper, false = store-wide deal. */
  personal: boolean;
}

export interface CartLine {
  productId: string;
  qty: number;
  unitPrice: number;
  discountPct: number;
}

export type ListSource = "list" | "recipe" | "voice";

export interface ListItem {
  productId: string;
  qty: number;
  checked: boolean;
  source: ListSource;
}

export interface Recommendation {
  productId: string;
  fromProductId: string;
  why: string;
  discountPct: number;
}

/** What just happened, so screens can play the right animation (fly-in, removal, chime). */
export interface SessionEvent {
  type: "connected" | "added" | "removed" | "moved" | "list" | "focus" | "checkout" | "resumed" | "paid" | "reset";
  productId?: string;
  at: number;
}

export interface SessionState {
  cartId: number;
  sessionId: string | null;
  /** Incremented on every mutation; clients ignore snapshots older than the one they have. */
  version: number;
  status: SessionStatus;
  profile: SessionProfile | null;
  cart: CartLine[];
  list: ListItem[];
  offers: Offer[];
  position: Cell;
  recommendation: Recommendation | null;
  /** Product the shopper asked for ("where is the olive oil?"): its shelf pulses and the route goes there first. */
  focus: { productId: string; at: number } | null;
  receiptId: string | null;
  lastEvent: SessionEvent | null;
}

export type SessionAction =
  | { type: "connect"; sessionId: string; profile: SessionProfile; offers: Offer[]; list: ListItem[]; at: number }
  | { type: "add"; productId: string; qty?: number; at: number }
  | { type: "remove"; productId: string; qty?: number; at: number }
  | { type: "position"; position: Cell; at: number }
  | { type: "list_add"; items: { productId: string; qty: number; source: ListSource }[]; at: number }
  | { type: "list_remove"; productIds: string[]; at: number }
  | { type: "focus"; productId: string | null; at: number }
  | { type: "checkout"; at: number }
  /** Leave the payment screen and keep shopping. */
  | { type: "resume"; at: number }
  | { type: "pay"; receiptId: string; at: number }
  | { type: "reset"; at: number };

export class SessionError extends Error {
  constructor(
    message: string,
    readonly status = 409,
  ) {
    super(message);
    this.name = "SessionError";
  }
}
