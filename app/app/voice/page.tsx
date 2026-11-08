import type { Metadata } from "next";
import { PhoneShell } from "@/components/phone/PhoneShell";
import { VoiceConnect } from "@/components/phone/VoiceConnect";

export const metadata: Metadata = { title: "Voice mode" };

export default function VoicePage() {
  return (
    <div data-a11y="true" className="bg-canvas">
      <PhoneShell>
        <VoiceConnect />
      </PhoneShell>
    </div>
  );
}
