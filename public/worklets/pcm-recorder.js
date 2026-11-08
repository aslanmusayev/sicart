// Mic -> 16 kHz mono PCM16 in ~100 ms chunks (PLAN.md section 7).
// Anti-aliasing: average the input samples that fall into each output sample (box low-pass) before decimating.
// Messages in:  "flush" (post the partial chunk now), { enabled: boolean }
// Messages out: { type: "chunk", pcm: ArrayBuffer(Int16) }, { type: "flushed" }, { type: "level", rms }
const OUT_RATE = 16000;
const CHUNK = 1600; // 100 ms at 16 kHz

class PcmRecorder extends AudioWorkletProcessor {
  constructor() {
    super();
    this.ratio = sampleRate / OUT_RATE;
    this.acc = 0; // input samples since the last output sample
    this.sum = 0;
    this.count = 0;
    this.out = new Int16Array(CHUNK);
    this.len = 0;
    this.enabled = false;
    this.levelSum = 0;
    this.levelN = 0;
    this.port.onmessage = (e) => {
      if (e.data === "flush") this.flush();
      else if (e.data && typeof e.data.enabled === "boolean") {
        this.enabled = e.data.enabled;
        if (!this.enabled) this.reset();
      }
    };
  }

  reset() {
    this.acc = 0;
    this.sum = 0;
    this.count = 0;
    this.len = 0;
  }

  flush() {
    if (this.len > 0) {
      const pcm = this.out.slice(0, this.len);
      this.port.postMessage({ type: "chunk", pcm: pcm.buffer }, [pcm.buffer]);
      this.len = 0;
    }
    this.port.postMessage({ type: "flushed" });
  }

  process(inputs) {
    const input = inputs[0] && inputs[0][0];
    if (!input) return true;
    for (let i = 0; i < input.length; i++) {
      const s = input[i];
      this.levelSum += s * s;
      this.levelN++;
      if (!this.enabled) continue;
      this.sum += s;
      this.count++;
      this.acc += 1;
      if (this.acc >= this.ratio) {
        this.acc -= this.ratio;
        const v = Math.max(-1, Math.min(1, this.sum / this.count));
        this.out[this.len++] = v < 0 ? v * 0x8000 : v * 0x7fff;
        this.sum = 0;
        this.count = 0;
        if (this.len === CHUNK) {
          const pcm = this.out.slice(0);
          this.port.postMessage({ type: "chunk", pcm: pcm.buffer }, [pcm.buffer]);
          this.len = 0;
        }
      }
    }
    if (this.levelN >= 2048) {
      this.port.postMessage({ type: "level", rms: Math.sqrt(this.levelSum / this.levelN) });
      this.levelSum = 0;
      this.levelN = 0;
    }
    return true;
  }
}

registerProcessor("pcm-recorder", PcmRecorder);
