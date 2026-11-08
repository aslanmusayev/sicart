// GET /api/receipt/:id -> one receipt (shown on the phone after paying).
import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_req: Request, ctx: RouteContext<"/api/receipt/[id]">) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Bad receipt id" }, { status: 400 });
  const { data, error } = await adminClient()
    .from("receipts")
    .select("id, items, total, savings, created_at, profiles(name)")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
