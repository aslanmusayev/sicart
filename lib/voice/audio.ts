"use client";
// Thin wrappers around the two audio worklets (public/worklets/*.js).

export function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

export function fromBase64(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

/** Microphone -> 16 kHz PCM16 chunks. Must be opened from a user gesture (permission prompt). */
export class Mic {
  private constructor(
    private ctx: AudioContext,
    private node: AudioWorkletNode,
    private stream: MediaStream,
  ) {}

  static async open(onChunk: (pcm: ArrayBuffer) => void, onLevel: (rms: number) => void): Promise<Mic> {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
    });
    const ctx = new AudioContext();
    await ctx.audioWorklet.addModule("/worklets/pcm-recorder.js");
    const node = new AudioWorkletNode(ctx, "pcm-recorder");
    node.port.onmessage = (e) => {
      if (e.data.type === "chunk") onChunk(e.data.pcm);
      else if (e.data.type === "level") onLevel(e.data.rms);
    };
    ctx.createMediaStreamSource(stream).connect(node);
    return new Mic(ctx, node, stream);
  }

  async resume() {
    if (this.ctx.state !== "running") await this.ctx.resume();
  }

  enable(on: boolean) {
    this.node.port.postMessage({ enabled: on });
  }

  /** Posts the last partial chunk; resolves once it has been delivered (send it BEFORE activityEnd). */
  flush(): Promise<void> {
    return new Promise((resolve) => {
      const prev = this.node.port.onmessage;
      const timer = setTimeout(done, 300);
      const port = this.node.port;
      function done() {
        clearTimeout(timer);
        port.onmessage = prev;
        resolve();
      }
      port.onmessage = (e) => {
        prev?.call(port, e);
        if (e.data.type === "flushed") done();
      };
      port.postMessage("flush");
    });
  }

  close() {
    this.stream.getTracks().forEach((t) => t.stop());
    void this.ctx.close();
  }
}

/** 24 kHz PCM16 playback with jitter buffer, ramps and barge-in clear. */
export class Player {
  private constructor(
    private ctx: AudioContext,
    private node: AudioWorkletNode,
  ) {}

  static async open(onLevel: (rms: number) => void, onDrained: () => void): Promise<Player> {
    const ctx = new AudioContext({ sampleRate: 24000 });
    await ctx.audioWorklet.addModule("/worklets/pcm-player.js");
    const node = new AudioWorkletNode(ctx, "pcm-player", { outputChannelCount: [1] });
    node.port.onmessage = (e) => {
      if (e.data.type === "level") onLevel(e.data.rms);
      else if (e.data.type === "drained") onDrained();
    };
    node.connect(ctx.destination);
    return new Player(ctx, node);
  }

  async resume() {
    if (this.ctx.state !== "running") await this.ctx.resume();
  }

  push(pcm: ArrayBuffer) {
    this.node.port.postMessage({ type: "push", pcm }, [pcm]);
  }

  /** No more audio in this turn: play out what is buffered even if it is shorter than the jitter buffer. */
  end() {
    this.node.port.postMessage({ type: "end" });
  }

  clear() {
    this.node.port.postMessage({ type: "clear" });
  }

  close() {
    void this.ctx.close();
  }
}
