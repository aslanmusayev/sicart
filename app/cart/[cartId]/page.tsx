import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CartScreen } from "@/components/cart/CartScreen";
import { DEMO_CARTS } from "@/lib/data/ids";

export const metadata: Metadata = { title: "Cart Screen" };

// Cache Components: prerender the demo cart(s) at build time; any other cart number is served the app shell
// and completed in the background (Next 16 docs, "Incremental Static Regeneration").
export function generateStaticParams() {
  return DEMO_CARTS.map((id) => ({ cartId: String(id) }));
}

export default async function CartPage({ params }: PageProps<"/cart/[cartId]">) {
  const { cartId } = await params;
  const id = Number(cartId);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return <CartScreen cartId={id} appUrl={process.env.NEXT_PUBLIC_APP_URL ?? ""} />;
}
