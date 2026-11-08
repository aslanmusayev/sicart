// GET /api/session/:cartId -> current snapshot (clients call this on load and after a Realtime reconnect).
import { NextResponse } from "next/server";
import { getSnapshot } from "@/lib/session/store";
import { SessionError } from "@/lib/session/types";

export async function GET(_req: Request, ctx: RouteContext<"/api/session/[cartId]">) {
  const { cartId } = await ctx.params;
  const id = Number(cartId);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Bad cart id" }, { status: 400 });
  try {
    return NextResponse.json(await getSnapshot(id), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    if (e instanceof SessionError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
