"use client";
// Sound design without audio files: tiny synthesized cues (PLAN.md wow checklist: soft "plink", NFC ripple).
// Browsers only allow audio after a user gesture, so call unlockSound() from the first tap or key press.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

export function unlockSound() {
  if (typeof window === "undefined") return;
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state !== "running") void ctx.resume();
}

/** One enveloped tone. `at` is seconds from now. */
function tone(freq: number, at: number, dur: number, opts: { type?: OscillatorType; gain?: number; glideTo?: number } = {}) {
  if (!ctx || !master || ctx.state !== "running") return;
  const t0 = ctx.currentTime + at;
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = opts.type ?? "sine";
  osc.frequency.setValueAtTime(freq, t0);
  if (opts.glideTo) osc.frequency.exponentialRampToValueAtTime(opts.glideTo, t0 + dur);
  const peak = opts.gain ?? 0.22;
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(peak, t0 + 0.008); // fast attack, no click
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(env).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export const sound = {
  /** Product dropped into the cart: a soft two-note plink. */
  add() {
    tone(1046.5, 0, 0.16, { gain: 0.18 }); // C6
    tone(1568, 0.06, 0.22, { gain: 0.14 }); // G6
  },
  /** Product taken out: a short falling blip. */
  remove() {
    tone(660, 0, 0.18, { gain: 0.14, glideTo: 392 });
  },
  /** Shopper connected: a gentle rising pair. */
  connect() {
    tone(523.25, 0, 0.2, { gain: 0.14 }); // C5
    tone(783.99, 0.12, 0.32, { gain: 0.14 }); // G5
  },
  /** POS zone opened: a soft "ready" ping. */
  checkout() {
    tone(1318.5, 0, 0.12, { gain: 0.12, type: "triangle" });
  },
  /** Paid: NFC beep, then a bright major chord. */
  paid() {
    tone(2093, 0, 0.09, { gain: 0.12, type: "square" });
    tone(1046.5, 0.14, 0.5, { gain: 0.12 });
    tone(1318.5, 0.2, 0.5, { gain: 0.1 });
    tone(1568, 0.26, 0.6, { gain: 0.1 });
  },
};
