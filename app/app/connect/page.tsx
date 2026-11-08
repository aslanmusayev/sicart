import type { Metadata } from "next";
import { Suspense } from "react";
import { ConnectPicker } from "@/components/phone/ConnectPicker";
import { PhoneShell } from "@/components/phone/PhoneShell";

export const metadata: Metadata = { title: "Connect to cart" };

// ?cart= is request-time data: the picker reads it inside a Suspense boundary (Cache Components).
export default function ConnectPage() {
  return (
    <PhoneShell>
      <Suspense fallback={<p className="m-auto text-ink-subtle">Loading…</p>}>
        <ConnectPicker />
      </Suspense>
    </PhoneShell>
  );
}
