"use client";
// Spoken announcements with the browser's built-in text-to-speech (free, works offline).
// iOS only lets a page speak after a user gesture: call primeSpeech() from the first tap.

let primed = false;

export function primeSpeech() {
  if (primed || typeof window === "undefined" || !("speechSynthesis" in window)) return;
  primed = true;
  const u = new SpeechSynthesisUtterance(" ");
  u.volume = 0;
  window.speechSynthesis.speak(u);
}

export function speak(text: string, { interrupt = true }: { interrupt?: boolean } = {}) {
  if (typeof window === "undefined" || !("speechSynthesis" in window) || !text.trim()) return;
  const synth = window.speechSynthesis;
  if (interrupt) synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = 1;
  const voice = synth.getVoices().find((v) => v.lang.startsWith("en") && /female|samantha|google us/i.test(v.name));
  if (voice) u.voice = voice;
  synth.speak(u);
}

export function vibrate(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(pattern);
}
