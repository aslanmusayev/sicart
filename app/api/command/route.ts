// POST /api/command { cartId, text } -> { reply, tools }   (Demo Control only: x-demo-pin)
import { NextResponse } from "next/server";
import { runCommand } from "@/lib/voice/command";

export async function POST(req: Request) {
  if (req.headers.get("x-demo-pin") !== process.env.DEMO_CONTROL_PIN) {
    return NextResponse.json({ error: "Wrong PIN" }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as { cartId?: unknown; text?: unknown } | null;
  const cartId = Number(body?.cartId);
  const text = typeof body?.text === "string" ? body.text.trim().slice(0, 300) : "";
  if (!Number.isInteger(cartId) || cartId <= 0 || !text) {
    return NextResponse.json({ error: "cartId and text are required" }, { status: 400 });
  }
  try {
    return NextResponse.json(await runCommand(cartId, text));
  } catch (e) {
    console.error("command failed", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Command failed" }, { status: 502 });
  }
}
