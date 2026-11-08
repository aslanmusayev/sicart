import type { Metadata } from "next";
import { ListEditor } from "@/components/phone/ListEditor";
import { PhoneShell } from "@/components/phone/PhoneShell";

export const metadata: Metadata = { title: "My shopping list" };

export default function ListPage() {
  return (
    <PhoneShell>
      <ListEditor />
    </PhoneShell>
  );
}
