// POST /api/session/:cartId/:action -> runs one session action and returns the new snapshot.
// Actions: connect | add | remove | position | list | checkout | pay | reset | scenario
// Scenario and list actions need the x-demo-pin header (DEMO_CONTROL_PIN).
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import type { PersonaKey } from "@/lib/data/personas";
import { loadShopper, type ConnectInput } from "@/lib/session/profile";
import { dispatch } from "@/lib/session/store";
import { SessionError, type ListSource, type SessionState } from "@/lib/session/types";

// add / remove / position are what the cart's sensors do, so the cart screen may send them too (demo mode).
const CONTROL_ONLY = new Set(["list", "scenario"]);
const PERSONAS: PersonaKey[] = ["aysel", "murad"];
const SOURCES: ListSource[] = ["list", "recipe", "voice"];

type Body = Record<string, unknown>;

function str(v: unknown, field: string): string {
  if (typeof v !== "string" || !v.trim()) throw new SessionError(`${field} is required`, 400);
  return v.trim();
}
function int(v: unknown, field: string, fallback?: number): number {
  if (v === undefined && fallback !== undefined) return fallback;
  const n = Number(v);
  if (!Number.isInteger(n)) throw new SessionError(`${field} must be a whole number`, 400);
  return n;
}

function parseConnect(body: Body): ConnectInput {
  if (typeof body.persona === "string") {
    if (!PERSONAS.includes(body.persona as PersonaKey)) throw new SessionError("Unknown persona", 400);
    return { persona: body.persona as PersonaKey };
  }
  return { guestName: typeof body.guestName === "string" ? body.guestName : "Guest" };
}

async function connect(cartId: number, input: ConnectInput): Promise<SessionState> {
  const shopper = await loadShopper(input);
  return dispatch(cartId, { type: "connect", sessionId: randomUUID(), at: Date.now(), ...shopper });
}

/** Ready-made states for rehearsals and the booth. */
async function scenario(cartId: number, name: string): Promise<SessionState> {
  switch (name) {
    case "aysel":
      return connect(cartId, { persona: "aysel" });
    case "murad":
      return connect(cartId, { persona: "murad" });
    case "aysel-midshop": {
      await connect(cartId, { persona: "aysel" });
      let state: SessionState | undefined;
      for (const [productId, qty] of [["milk", 2], ["tomatoes", 1], ["spaghetti", 1]] as const) {
        state = await dispatch(cartId, { type: "add", productId, qty, at: Date.now() });
      }
      return state!;
    }
    default:
      throw new SessionError(`Unknown scenario: ${name}`, 400);
  }
}

async function run(cartId: number, action: string, body: Body): Promise<SessionState> {
  const at = Date.now();
  switch (action) {
    case "connect":
      return connect(cartId, parseConnect(body));
    case "add":
      return dispatch(cartId, { type: "add", productId: str(body.productId, "productId"), qty: int(body.qty, "qty", 1), at });
    case "remove":
      return dispatch(cartId, { type: "remove", productId: str(body.productId, "productId"), qty: int(body.qty, "qty", 1), at });
    case "position":
      return dispatch(cartId, { type: "position", position: { x: int(body.x, "x"), y: int(body.y, "y") }, at });
    case "list": {
      const remove = Array.isArray(body.remove) ? body.remove.map((id) => str(id, "remove")) : [];
      if (remove.length) return dispatch(cartId, { type: "list_remove", productIds: remove, at });
      const items = Array.isArray(body.add) ? body.add : [];
      return dispatch(cartId, {
        type: "list_add",
        at,
        items: items.map((i: Body) => ({
          productId: str(i.productId, "productId"),
          qty: int(i.qty, "qty", 1),
          source: SOURCES.includes(i.source as ListSource) ? (i.source as ListSource) : "list",
        })),
      });
    }
    case "checkout":
      return dispatch(cartId, { type: "checkout", at });
    case "resume":
      return dispatch(cartId, { type: "resume", at });
    case "pay":
      return dispatch(cartId, { type: "pay", receiptId: randomUUID(), at });
    case "reset":
      return dispatch(cartId, { type: "reset", at });
    case "scenario":
      return scenario(cartId, str(body.name, "name"));
    default:
      throw new SessionError(`Unknown action: ${action}`, 404);
  }
}

export async function POST(req: Request, ctx: RouteContext<"/api/session/[cartId]/[action]">) {
  const { cartId, action } = await ctx.params;
  const id = Number(cartId);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Bad cart id" }, { status: 400 });
  if (CONTROL_ONLY.has(action) && req.headers.get("x-demo-pin") !== process.env.DEMO_CONTROL_PIN) {
    return NextResponse.json({ error: "Wrong PIN" }, { status: 401 });
  }
  const body = ((await req.json().catch(() => ({}))) ?? {}) as Body;
  try {
    return NextResponse.json(await run(id, action, body));
  } catch (e) {
    if (e instanceof SessionError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
