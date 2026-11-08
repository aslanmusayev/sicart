// A cart nobody touches for a while goes back to its QR screen, so an abandoned session (no payment, no reset)
// never greets the next shopper with someone else's cart.
import type { SessionState } from "./types";

export const SESSION_IDLE_MS = 5 * 60_000;

export function isStale(state: SessionState, now = Date.now()): boolean {
  if (state.status === "idle" || !state.lastEvent) return false;
  return now - state.lastEvent.at > SESSION_IDLE_MS;
}
