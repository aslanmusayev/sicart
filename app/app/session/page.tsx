import type { Metadata } from "next";
import { Suspense } from "react";
import { PhoneShell } from "@/components/phone/PhoneShell";
import { SessionView } from "@/components/phone/SessionView";

export const metadata: Metadata = { title: "Shopping" };

export default function SessionPage() {
  return (
    <PhoneShell>
      <Suspense fallback={<p className="m-auto text-ink-subtle">Connecting…</p>}>
        <SessionView />
      </Suspense>
    </PhoneShell>
  );
}
