"use client";
// /app/voice: a blind shopper connects to a cart by voice ("Connect to cart 12"), plan flow 5.
// The connect_cart tool runs here in the browser; Murad is the seeded accessibility persona.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { setIdentity } from "@/lib/phone/identity";
import { primeSpeech, speak, vibrate } from "@/lib/phone/speech";
import { sendAction } from "@/lib/session/client";
import { QrCode } from "lucide-react";
import { parseCartCode } from "@/lib/phone/cartCode";
import { VoiceDock } from "../voice/VoiceDock";
import { Scanner } from "./Scanner";

export function VoiceConnect() {
  const router = useRouter();
  const [number, setNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  async function connect(cart: number) {
    const state = await sendAction(cart, "connect", { persona: "murad" });
    setIdentity({ cartId: cart, sessionId: state.sessionId!, name: state.profile!.name, persona: "murad" });
    vibrate(80);
    // let the assistant finish its confirmation before switching screens
    setTimeout(() => router.replace(`/app/session?cart=${cart}`), 2500);
    return { ok: true, cart, shopper: state.profile!.name, items_on_list: state.list.length };
  }

  const clientTools = {
    connect_cart: async (args: Record<string, unknown>) => {
      const n = Number(args.number);
      if (!Number.isInteger(n) || n <= 0) return { ok: false, error: "No cart number heard" };
      try {
        return await connect(n);
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "Could not connect" };
      }
    },
  };

  return (
    <div className="flex flex-1 flex-col gap-5" onPointerDown={primeSpeech}>
      <header>
        <p className="text-lg text-ink-muted">SiCart · Voice mode</p>
        <h1 className="text-3xl font-bold">Connect to a cart</h1>
        <p className="mt-1 text-lg text-ink-muted">Works with your phone&apos;s screen reader and Bluetooth earphones.</p>
      </header>

      <VoiceDock cartId={0} variant="giant" warm options={{ mode: "connect", clientTools }} hint="Hold and say: “Connect to cart 12”" />

      <button
        type="button"
        onClick={() => setScanning(true)}
        className="flex w-full items-center justify-center gap-3 rounded-panel bg-ink py-6 text-2xl font-bold text-white"
      >
        <QrCode size={32} aria-hidden /> Scan the cart QR
      </button>
      {scanning && (
        <Scanner
          onClose={() => setScanning(false)}
          onResult={(text) => {
            setScanning(false);
            const n = parseCartCode(text);
            if (!n) return speak("That is not a SiCart code. Try again.");
            void connect(n).then(() => speak(`Connected to cart ${n}.`)).catch(() => speak("Could not connect."));
          }}
        />
      )}

      <form
        className="rounded-panel border-4 border-ink bg-surface p-5"
        onSubmit={async (e) => {
          e.preventDefault();
          const n = Number(number);
          if (!Number.isInteger(n) || n <= 0) return setError("Type the number printed on the cart");
          try {
            setError(null);
            await connect(n);
            speak(`Connected to cart ${n}.`);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not connect");
          }
        }}
      >
        <label htmlFor="cart-number" className="text-2xl font-bold">
          Or type the cart number
        </label>
        <div className="mt-3 flex gap-3">
          <input
            id="cart-number"
            inputMode="numeric"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            className="min-w-0 flex-1 rounded-card border-4 border-ink px-4 py-4 text-3xl font-bold"
          />
          <button className="rounded-card bg-ink px-6 text-2xl font-bold text-white">Connect</button>
        </div>
        {error && (
          <p role="alert" className="mt-3 text-xl font-semibold text-danger">
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
