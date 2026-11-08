import type { Metadata } from "next";
import { ControlPanel } from "@/components/control/ControlPanel";
import { DEMO_CART_ID } from "@/lib/data/ids";

export const metadata: Metadata = {
  title: "Demo Control",
  robots: { index: false, follow: false },
};

export default function ControlPage() {
  return <ControlPanel cartId={DEMO_CART_ID} />;
}
