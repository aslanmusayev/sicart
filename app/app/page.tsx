import type { Metadata } from "next";
import { PhoneHome } from "@/components/phone/PhoneHome";
import { PhoneShell } from "@/components/phone/PhoneShell";

export const metadata: Metadata = { title: "Customer App" };

export default function AppHome() {
  return (
    <PhoneShell>
      <PhoneHome />
    </PhoneShell>
  );
}
