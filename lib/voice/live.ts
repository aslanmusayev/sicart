"use client";
// Gemini Live client (browser connects directly with an ephemeral token; tools run on our server).
// Push-to-talk per PLAN.md section 7: automatic activity detection off, activityStart on press, stream audio,
// flush the last partial chunk, then activityEnd on release. Never send audioStreamEnd in PTT.
import { Mic, Player, fromBase64, toBase64 } from "./audio";

export type VoiceStatus = "off" | "connecting" | "ready" | "listening" | "thinking" | "speaking" | "error";

export interface VoiceEvents {
  status(status: VoiceStatus): void;
  caption(caption: { user: string; model: string }): void;
  level(rms: number): void;
  error(message: string): void;
}

const ENDPOINT =
  "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained";

interface FunctionCall {
  id: string;
  name: string;
  args?: Record<string, unknown>;
}

export class LiveVoice {
  private ws: WebSocket | null = null;
  private connecting: Promise<void> | null = null;
  private mic: Mic | null = null;
  private player: Player | null = null;
  private status: VoiceStatus = "off";
  private pressed = false;
  private user = "";
  private model = "";
  private closed = false;
  private retries = 0;

  constructor(
    private cartId: number,
    private events: VoiceEvents,
    /** Re-open the session in the background when it drops, so the next press is instant. */
    private keepWarm = true,
  ) {}

  private set(status: VoiceStatus) {
    this.status = status;
    this.events.status(status);
  }

  private send(msg: unknown) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }

  /** Opens the Live session (token -> websocket -> setup -> setupComplete). Safe to call repeatedly. */
  connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) return Promise.resolve();
    if (this.connecting) return this.connecting;
    this.closed = false;
    if (this.status === "off" || this.status === "error") this.set("connecting");
    this.connecting = (async () => {
      const res = await fetch("/api/voice/token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cartId: this.cartId }),
      });
      const { token, setup, error } = await res.json();
      if (!token) throw new Error(error ?? "Voice is unavailable");
      await new Promise<void>((resolve, reject) => {
        const ws = new WebSocket(`${ENDPOINT}?access_token=${encodeURIComponent(token)}`);
        this.ws = ws;
        const timer = setTimeout(() => reject(new Error("Voice took too long to connect")), 45_000);
        ws.onopen = () => ws.send(JSON.stringify({ setup }));
        ws.onmessage = async (ev) => {
          // frames can arrive as Blob: read them or messages are silently lost
          const msg = JSON.parse(typeof ev.data === "string" ? ev.data : await (ev.data as Blob).text());
          if (msg.setupComplete) {
            clearTimeout(timer);
            resolve();
            return;
          }
          void this.handle(msg);
        };
        ws.onerror = () => reject(new Error("Voice connection failed"));
        ws.onclose = () => {
          clearTimeout(timer);
          reject(new Error("Voice connection closed"));
          this.onClosed();
        };
      });
      this.retries = 0;
      if (!this.pressed && this.status !== "speaking" && this.status !== "thinking") this.set("ready");
    })().finally(() => {
      this.connecting = null;
    });
    return this.connecting.catch((e) => {
      this.ws = null;
      this.set("error");
      this.events.error(e instanceof Error ? e.message : "Voice failed");
      throw e;
    });
  }

  private onClosed() {
    this.ws = null;
    if (this.closed) return;
    if (this.status !== "error") this.set(this.pressed ? "connecting" : "off");
    if (this.keepWarm && this.retries < 5) {
      const delay = 800 * 2 ** this.retries++;
      setTimeout(() => !this.closed && !this.ws && void this.connect().catch(() => {}), delay);
    }
  }

  /** Audio needs a user gesture: open mic + speaker on the first press. */
  private async ensureAudio() {
    this.player ??= await Player.open(
      (rms) => this.status === "speaking" && this.events.level(rms),
      () => {
        if (this.status === "speaking") this.set("ready");
      },
    );
    this.mic ??= await Mic.open(
      (pcm) => this.send({ realtimeInput: { audio: { data: toBase64(pcm), mimeType: "audio/pcm;rate=16000" } } }),
      (rms) => this.status === "listening" && this.events.level(rms),
    );
    await Promise.all([this.player.resume(), this.mic.resume()]);
  }

  async pressStart() {
    if (this.pressed) return;
    this.pressed = true;
    try {
      await this.ensureAudio();
      this.player?.clear(); // barge-in: stop talking when the shopper presses
      if (this.ws?.readyState !== WebSocket.OPEN) {
        this.set("connecting");
        await this.connect();
      }
      if (!this.pressed) return; // released while we were connecting
      this.user = "";
      this.model = "";
      this.events.caption({ user: "", model: "" });
      this.send({ realtimeInput: { activityStart: {} } });
      this.mic?.enable(true);
      this.set("listening");
    } catch (e) {
      this.pressed = false;
      this.set("error");
      this.events.error(e instanceof Error && e.name === "NotAllowedError" ? "Microphone access is blocked" : e instanceof Error ? e.message : "Voice failed");
    }
  }

  async pressEnd() {
    if (!this.pressed) return;
    this.pressed = false;
    if (this.status !== "listening") return;
    await this.mic?.flush(); // last partial chunk BEFORE activityEnd, or the final syllable is lost
    this.mic?.enable(false);
    this.send({ realtimeInput: { activityEnd: {} } });
    this.set("thinking");
    this.events.level(0);
  }

  private async handle(msg: Record<string, unknown>) {
    const sc = msg.serverContent as
      | {
          inputTranscription?: { text?: string };
          outputTranscription?: { text?: string };
          modelTurn?: { parts?: { inlineData?: { data: string } }[] };
          interrupted?: boolean;
          turnComplete?: boolean;
        }
      | undefined;
    if (sc) {
      if (sc.inputTranscription?.text) {
        this.user += sc.inputTranscription.text;
        this.events.caption({ user: this.user, model: this.model });
      }
      if (sc.outputTranscription?.text) {
        this.model += sc.outputTranscription.text;
        this.events.caption({ user: this.user, model: this.model });
      }
      for (const part of sc.modelTurn?.parts ?? []) {
        if (part.inlineData?.data) {
          this.player?.push(fromBase64(part.inlineData.data));
          if (this.status !== "speaking" && !this.pressed) this.set("speaking");
        }
      }
      if (sc.interrupted) this.player?.clear();
      if (sc.turnComplete) {
        this.player?.end();
        if (this.status === "thinking") this.set("ready");
      }
    }

    const toolCall = msg.toolCall as { functionCalls?: FunctionCall[] } | undefined;
    if (toolCall?.functionCalls?.length) {
      this.set("thinking");
      const functionResponses = await Promise.all(
        toolCall.functionCalls.map(async (fc) => {
          try {
            const res = await fetch("/api/tools", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ cartId: this.cartId, name: fc.name, args: fc.args ?? {} }),
            });
            const { result } = await res.json();
            return { id: fc.id, name: fc.name, response: result ?? { ok: false } };
          } catch {
            return { id: fc.id, name: fc.name, response: { ok: false, error: "network problem" } };
          }
        }),
      );
      this.send({ toolResponse: { functionResponses } });
    }
    // toolCallCancellation: the server dropped that turn (barge-in); nothing to undo, the next turn starts fresh.
    if (msg.goAway) this.ws?.close();
  }

  close() {
    this.closed = true;
    this.ws?.close();
    this.ws = null;
    this.mic?.close();
    this.player?.close();
    this.mic = null;
    this.player = null;
  }
}
