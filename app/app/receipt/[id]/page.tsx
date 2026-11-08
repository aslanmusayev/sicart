import type { Metadata } from "next";
import { Suspense } from "react";
import { PhoneShell } from "@/components/phone/PhoneShell";
import { ReceiptView } from "@/components/phone/ReceiptView";

export const metadata: Metadata = { title: "Receipt" };

export default function ReceiptPage() {
  return (
    <PhoneShell>
      <Suspense fallback={<p className="m-auto text-ink-subtle">Loading receipt…</p>}>
        <ReceiptView />
      </Suspense>
    </PhoneShell>
  );
}
