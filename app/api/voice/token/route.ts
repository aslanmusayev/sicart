// POST /api/voice/token { cartId } -> one-use ephemeral Gemini Live token + the session setup to send.
// The browser connects straight to Gemini with the token (no audio relay through our server).
// Field notes (PLAN.md section 7): Constrained endpoint only, always set the voice explicitly.
import { NextResponse } from "next/server";
import { getSnapshot } from "@/lib/session/store";
import { systemInstruction } from "@/lib/voice/prompt";
import { FUNCTION_DECLARATIONS } from "@/lib/voice/tools";

const LIVE_MODEL = "models/gemini-3.1-flash-live-preview";
const LIVE_VOICE = "Kore";

export async function POST(req: Request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ error: "Voice is not configured (GEMINI_API_KEY)" }, { status: 503 });
  const body = (await req.json().catch(() => ({}))) as { cartId?: unknown };
  const cartId = Number(body.cartId);
  const state = Number.isInteger(cartId) && cartId > 0 ? await getSnapshot(cartId).catch(() => null) : null;

  const now = Date.now();
  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/auth_tokens", {
    method: "POST",
    headers: { "x-goog-api-key": key, "content-type": "application/json" },
    body: JSON.stringify({
      uses: 1,
      expireTime: new Date(now + 30 * 60_000).toISOString(),
      newSessionExpireTime: new Date(now + 2 * 60_000).toISOString(),
    }),
  });
  const json = (await res.json().catch(() => ({}))) as { name?: string; error?: { message?: string } };
  if (!res.ok || !json.name) {
    console.error("token mint failed", res.status, json.error?.message);
    return NextResponse.json({ error: "Could not start voice right now" }, { status: 502 });
  }

  return NextResponse.json(
    {
      token: json.name,
      setup: {
        model: LIVE_MODEL,
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: LIVE_VOICE } } },
        },
        systemInstruction: { parts: [{ text: systemInstruction(state) }] },
        tools: [{ functionDeclarations: FUNCTION_DECLARATIONS }],
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        realtimeInputConfig: { automaticActivityDetection: { disabled: true } }, // push-to-talk
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
