// 24 kHz PCM16 playback with a ring buffer (PLAN.md section 7).
// - The API sends audio in bursts: hold ~400 ms before starting a turn (jitter buffer) instead of playing on arrival.
// - Ramp every start and stop over ~4 ms so there are no clicks.
// - "clear" (barge-in) ramps out and drops the queue.
// Messages in:  { type: "push", pcm: ArrayBuffer(Int16) }, { type: "clear" }, { type: "end" } (no more audio this turn)
// Messages out: { type: "level", rms }, { type: "drained" }
const CAPACITY = 24000 * 60; // 60 s
const START_AFTER = Math.round(24000 * 0.4);
const RAMP = Math.round(24000 * 0.004);

class PcmPlayer extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buf = new Float32Array(CAPACITY);
    this.read = 0;
    this.write = 0;
    this.size = 0;
    this.playing = false;
    this.ended = false; // the server said this turn has no more audio
    this.gain = 0;
    this.target = 0;
    this.levelSum = 0;
    this.levelN = 0;
    this.port.onmessage = (e) => {
      const m = e.data;
      if (m.type === "push") {
        const pcm = new Int16Array(m.pcm);
        for (let i = 0; i < pcm.length && this.size < CAPACITY; i++) {
          this.buf[this.write] = pcm[i] / 0x8000;
          this.write = (this.write + 1) % CAPACITY;
          this.size++;
        }
        this.ended = false;
      } else if (m.type === "end") {
        this.ended = true;
      } else if (m.type === "clear") {
        this.target = 0;
        this.clearing = true;
      }
    };
  }

  process(_inputs, outputs) {
    const out = outputs[0][0];
    if (!this.playing && (this.size >= START_AFTER || (this.ended && this.size > 0))) {
      this.playing = true;
      this.target = 1;
    }
    for (let i = 0; i < out.length; i++) {
      if (this.gain !== this.target) {
        const step = 1 / RAMP;
        this.gain = this.target > this.gain ? Math.min(this.target, this.gain + step) : Math.max(this.target, this.gain - step);
      }
      if (this.clearing && this.gain === 0) {
        this.size = 0;
        this.read = this.write;
        this.playing = false;
        this.clearing = false;
      }
      let s = 0;
      if (this.playing && this.size > 0) {
        s = this.buf[this.read];
        this.read = (this.read + 1) % CAPACITY;
        this.size--;
        // ramp out before running dry
        if (this.size === RAMP && this.ended) this.target = 0;
      } else if (this.playing && this.size === 0) {
        this.playing = false;
        this.target = 0;
        this.port.postMessage({ type: "drained" });
      }
      const v = s * this.gain;
      out[i] = v;
      this.levelSum += v * v;
      this.levelN++;
    }
    if (this.levelN >= 1024) {
      this.port.postMessage({ type: "level", rms: Math.sqrt(this.levelSum / this.levelN) });
      this.levelSum = 0;
      this.levelN = 0;
    }
    return true;
  }
}

registerProcessor("pcm-player", PcmPlayer);
