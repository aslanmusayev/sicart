// POST /api/tools  { cartId, name, args } -> { result }
// Single entry for voice tool calls: validates the tool name, runs it against the cart session.
// Expected problems (no shopper, unknown product...) come back as { ok: false } so the model can say so.
import { NextResponse } from "next/server";
import { SessionError } from "@/lib/session/types";
import { executeTool } from "@/lib/voice/execute";
import { TOOL_NAMES, type ToolName } from "@/lib/voice/tools";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { cartId?: unknown; name?: unknown; args?: unknown } | null;
  const cartId = Number(body?.cartId);
  const name = body?.name;
  if (!Number.isInteger(cartId) || cartId <= 0) return NextResponse.json({ error: "Bad cart id" }, { status: 400 });
  if (typeof name !== "string" || !TOOL_NAMES.includes(name as ToolName)) {
    return NextResponse.json({ result: { ok: false, error: `Unknown tool: ${String(name)}` } });
  }
  const args = body?.args && typeof body.args === "object" ? (body.args as Record<string, unknown>) : {};
  try {
    return NextResponse.json({ result: await executeTool(cartId, name as ToolName, args) });
  } catch (e) {
    if (e instanceof SessionError) return NextResponse.json({ result: { ok: false, error: e.message } });
    console.error("tool failed", name, e);
    return NextResponse.json({ result: { ok: false, error: "The store system had a problem, please try again." } }, { status: 500 });
  }
}
