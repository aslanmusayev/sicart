import { describe, expect, it } from "vitest";
import { SESSION_IDLE_MS, isStale } from "./expiry";
import { idleState } from "./machine";
import type { SessionState } from "./types";

const at = 1_000_000;
const active = (status: SessionState["status"]): SessionState => ({ ...idleState(12), status, lastEvent: { type: "added", at } });

describe("isStale", () => {
  it("never expires an idle cart", () => {
    expect(isStale(idleState(12), at + SESSION_IDLE_MS * 10)).toBe(false);
  });
  it("keeps a session that was touched recently", () => {
    expect(isStale(active("shopping"), at + SESSION_IDLE_MS - 1)).toBe(false);
  });
  it("expires connected, shopping, checkout and paid sessions left alone", () => {
    for (const s of ["connected", "shopping", "checkout", "paid"] as const) expect(isStale(active(s), at + SESSION_IDLE_MS + 1)).toBe(true);
  });
});
