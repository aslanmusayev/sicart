// GET /api/lists/:persona -> the shopper's saved list;  PUT { items: [{ productId, qty }] } -> replace it.
// Plan at home in the app, then scan the cart QR: connect loads this list into the cart.
import { NextResponse } from "next/server";
import { findProduct } from "@/lib/data/catalog";
import { LIST_IDS } from "@/lib/data/ids";
import type { PersonaKey } from "@/lib/data/personas";
import { adminClient } from "@/lib/supabase/server";

function listId(persona: string): string | null {
  return persona in LIST_IDS ? LIST_IDS[persona as PersonaKey] : null;
}

export async function GET(_req: Request, ctx: RouteContext<"/api/lists/[persona]">) {
  const id = listId((await ctx.params).persona);
  if (!id) return NextResponse.json({ error: "Unknown shopper" }, { status: 404 });
  const { data, error } = await adminClient().from("list_items").select("product_id, qty").eq("list_id", id);
  if (error) return NextResponse.json({ error: "Could not load the list" }, { status: 500 });
  return NextResponse.json(
    { items: (data ?? []).filter((r) => findProduct(r.product_id)).map((r) => ({ productId: r.product_id, qty: r.qty })) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function PUT(req: Request, ctx: RouteContext<"/api/lists/[persona]">) {
  const id = listId((await ctx.params).persona);
  if (!id) return NextResponse.json({ error: "Unknown shopper" }, { status: 404 });
  const body = (await req.json().catch(() => null)) as { items?: { productId?: unknown; qty?: unknown }[] } | null;
  const merged = new Map<string, number>();
  for (const item of Array.isArray(body?.items) ? body.items.slice(0, 60) : []) {
    const productId = typeof item.productId === "string" ? item.productId : "";
    if (!findProduct(productId)) continue;
    merged.set(productId, Math.min(Math.max(Math.round(Number(item.qty) || 1), 1), 20));
  }
  const db = adminClient();
  const { error: delError } = await db.from("list_items").delete().eq("list_id", id);
  if (delError) return NextResponse.json({ error: "Could not save the list" }, { status: 500 });
  if (merged.size) {
    const rows = [...merged].map(([product_id, qty]) => ({ list_id: id, product_id, qty }));
    const { error } = await db.from("list_items").insert(rows);
    if (error) return NextResponse.json({ error: "Could not save the list" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, count: merged.size });
}
