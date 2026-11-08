// Server side of the session: load the active snapshot, run the pure reducer, persist with an optimistic
// version check, then broadcast the FULL snapshot on Realtime channel `cart:{id}`.
// carts.active_session always points at the cart's latest session row (it stays there after a reset, so the
// version keeps growing and clients never see an "older" idle snapshot).
import { after } from "next/server";
import { getProduct } from "../data/catalog";
import { adminClient, serviceKey, supabaseUrl } from "../supabase/server";
import { isStale } from "./expiry";
import { idleState, reduce } from "./machine";
import { lineTotal, totals } from "./totals";
import { SessionError, type SessionAction, type SessionState } from "./types";

interface Loaded {
  rowId: string | null;
  state: SessionState;
}

async function load(cartId: number): Promise<Loaded> {
  const db = adminClient();
  const { data: cart, error } = await db.from("carts").select("id, active_session").eq("id", cartId).maybeSingle();
  if (error) throw error;
  if (!cart) throw new SessionError(`Cart ${cartId} does not exist`, 404);
  if (!cart.active_session) return { rowId: null, state: idleState(cartId) };
  const { data: row, error: rowError } = await db
    .from("cart_sessions")
    .select("id, state")
    .eq("id", cart.active_session)
    .single();
  if (rowError) throw rowError;
  const loaded = { rowId: row.id as string, state: row.state as SessionState };
  known.set(cartId, loaded);
  return loaded;
}

/**
 * Last snapshot this server instance wrote or read, per cart. Saves two database round trips per tap.
 * Safe: if another instance changed the cart, the version check in persist() fails and we reload.
 */
const known = new Map<number, Loaded>();

/** Broadcast after the response is sent (versions keep the order right on the clients). */
function broadcastSoon(state: SessionState) {
  try {
    after(() => broadcast(state));
  } catch {
    void broadcast(state); // outside a request (scripts, tests)
  }
}

export async function getSnapshot(cartId: number): Promise<SessionState> {
  const { state } = await load(cartId);
  // Abandoned session: whoever opens the cart next sees the QR screen, not the last shopper.
  if (isStale(state)) return dispatch(cartId, { type: "reset", at: Date.now() });
  return state;
}

type ActionInput = SessionAction | ((state: SessionState) => SessionAction | Promise<SessionAction>);

// Requests for the same cart inside one server instance run one after another, so a burst of taps
// never fights over the version. Across instances (serverless) the optimistic version check still
// protects the data, with jittered retries.
const cartQueues = new Map<number, Promise<unknown>>();
function serialised<T>(cartId: number, work: () => Promise<T>): Promise<T> {
  const previous = cartQueues.get(cartId) ?? Promise.resolve();
  const run = previous.catch(() => {}).then(work);
  const tail = run.catch(() => {});
  cartQueues.set(cartId, tail);
  void tail.then(() => {
    if (cartQueues.get(cartId) === tail) cartQueues.delete(cartId);
  });
  return run;
}

const MAX_ATTEMPTS = 8;
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Applies one action. Retries when another request changed the cart in between. */
export function dispatch(cartId: number, input: ActionInput): Promise<SessionState> {
  return serialised(cartId, () => dispatchNow(cartId, input));
}

async function dispatchNow(cartId: number, input: ActionInput): Promise<SessionState> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt) await pause(15 + Math.random() * 50 * attempt);
    const cached = attempt === 0 ? known.get(cartId) : undefined;
    const { rowId, state } = cached ?? (await load(cartId));
    const action = typeof input === "function" ? await input(state) : input;
    // A cart that never had a session is already idle: resetting it must not invent a version nobody stored.
    if (!rowId && action.type === "reset") return state;
    const next = reduce(state, action);
    if (await persist(cartId, rowId, state, next, action)) {
      known.set(cartId, { rowId: action.type === "connect" ? action.sessionId : rowId, state: next });
      broadcastSoon(next);
      return next;
    }
    known.delete(cartId); // someone else changed the cart: reload on the next attempt
  }
  throw new SessionError("The cart is busy, please try again", 409);
}

async function persist(
  cartId: number,
  rowId: string | null,
  prev: SessionState,
  next: SessionState,
  action: SessionAction,
): Promise<boolean> {
  const db = adminClient();
  const columns = {
    status: next.status,
    position: next.position,
    version: next.version,
    state: next,
    profile_id: next.profile?.id ?? null,
    updated_at: new Date().toISOString(),
  };

  if (action.type === "connect") {
    const { error } = await db.from("cart_sessions").insert({ id: action.sessionId, cart_id: cartId, ...columns });
    if (error) throw error;
    const claim = db.from("carts").update({ active_session: action.sessionId }).eq("id", cartId);
    const { data, error: claimError } = await (rowId
      ? claim.eq("active_session", rowId)
      : claim.is("active_session", null)
    ).select("id");
    if (claimError) throw claimError;
    if (!data?.length) {
      await db.from("cart_sessions").delete().eq("id", action.sessionId);
      return false; // someone else connected first; retry on the new state
    }
    return true;
  }

  if (!rowId) return true; // idle cart that never had a session (e.g. reset): nothing to store

  const { data, error } = await db
    .from("cart_sessions")
    .update(columns)
    .eq("id", rowId)
    .eq("version", prev.version)
    .select("id");
  if (error) throw error;
  if (!data?.length) return false;
  if (action.type === "pay") await insertReceipt(next);
  return true;
}

async function insertReceipt(state: SessionState) {
  const t = totals(state.cart);
  const items = state.cart.map((line) => {
    const product = getProduct(line.productId);
    return {
      productId: line.productId,
      name: product.name,
      brand: product.brand,
      unit: product.unit,
      qty: line.qty,
      unitPrice: line.unitPrice,
      discountPct: line.discountPct,
      total: lineTotal(line),
    };
  });
  const { error } = await adminClient().from("receipts").insert({
    id: state.receiptId,
    session_id: state.sessionId,
    profile_id: state.profile?.id ?? null,
    items,
    total: t.total,
    savings: t.savings,
  });
  if (error) throw error;
}

/** Realtime REST broadcast: no websocket needed on the server. */
export async function broadcast(state: SessionState): Promise<void> {
  const key = serviceKey();
  const res = await fetch(`${supabaseUrl()}/realtime/v1/api/broadcast`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [{ topic: `cart:${state.cartId}`, event: "snapshot", payload: state, private: false }],
    }),
  });
  if (!res.ok) console.error("Realtime broadcast failed", res.status, await res.text());
}
