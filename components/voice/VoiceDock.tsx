"use client";
// Push-to-talk button with an audio-reactive orb and live captions (PLAN.md wow checklist).
// Hold the button (or Space on the cart screen) to talk; release to send.
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { Mic } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { LiveVoice, type VoiceStatus } from "@/lib/voice/live";
import { spring } from "@/lib/ui/motion";

const LABEL: Record<VoiceStatus, string> = {
  off: "Hold to talk",
  connecting: "Connecting…",
  ready: "Hold to talk",
  listening: "Listening…",
  thinking: "Thinking…",
  speaking: "Speaking",
  error: "Hold to try again",
};

interface Props {
  cartId: number;
  variant: "cart" | "phone";
  /** Open the voice session ahead of the first press (no wait on stage). */
  warm: boolean;
  className?: string;
}

export function VoiceDock({ cartId, variant, warm, className = "" }: Props) {
  const [status, setStatus] = useState<VoiceStatus>("off");
  const [caption, setCaption] = useState({ user: "", model: "" });
  const [error, setError] = useState<string | null>(null);
  const level = useMotionValue(0);
  const smooth = useSpring(level, { stiffness: 300, damping: 30 });
  const orbScale = useTransform(smooth, [0, 0.25], [1, 1.6], { clamp: true });
  const voice = useRef<LiveVoice | null>(null);

  useEffect(() => {
    const v = new LiveVoice(cartId, {
      status: (s) => {
        setStatus(s);
        if (s !== "error") setError(null);
      },
      caption: setCaption,
      level: (rms) => level.set(rms),
      error: setError,
    });
    voice.current = v;
    return () => v.close();
  }, [cartId, level]);

  useEffect(() => {
    if (warm) void voice.current?.connect().catch(() => {});
  }, [warm]);

  // Space bar = push-to-talk on the cart screen (laptop demos)
  useEffect(() => {
    if (variant !== "cart") return;
    const typing = (e: KeyboardEvent) => e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
    const down = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat || typing(e)) return;
      e.preventDefault();
      void voice.current?.pressStart();
    };
    const up = (e: KeyboardEvent) => {
      if (e.code !== "Space" || typing(e)) return;
      e.preventDefault();
      void voice.current?.pressEnd();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [variant]);

  const active = status === "listening" || status === "speaking";
  const big = variant === "cart" ? 76 : 64;
  const showCaption = !!(caption.user || caption.model) && status !== "off";

  return (
    <div className={`pointer-events-none flex flex-col items-center gap-3 ${className}`}>
      <AnimatePresence>
        {(showCaption || error) && (
          <motion.div
            key="caption"
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6 }}
            transition={spring.soft}
            className="glass pointer-events-auto max-w-[min(34rem,90vw)] rounded-card px-5 py-3 shadow-lift"
            aria-live="polite"
          >
            {error ? (
              <p className="text-danger">{error}</p>
            ) : (
              <>
                {caption.user && <p className="text-sm text-ink-muted">“{caption.user.trim()}”</p>}
                {caption.model && <p className={`${variant === "cart" ? "text-lg" : "text-base"} font-medium`}>{caption.model.trim()}</p>}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="pointer-events-auto flex items-center gap-3">
        <button
          type="button"
          aria-label="Hold to talk to SiCart"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            void voice.current?.pressStart();
          }}
          onPointerUp={() => void voice.current?.pressEnd()}
          onPointerCancel={() => void voice.current?.pressEnd()}
          onContextMenu={(e) => e.preventDefault()}
          className="relative grid touch-none select-none place-items-center rounded-full"
          style={{ width: big, height: big }}
        >
          <motion.span
            className="absolute inset-0 rounded-full bg-brand-400/40"
            style={{ scale: active ? orbScale : 1 }}
            animate={status === "thinking" ? { opacity: [0.3, 0.8, 0.3] } : { opacity: active ? 1 : 0 }}
            transition={status === "thinking" ? { duration: 1.2, repeat: Infinity } : { duration: 0.2 }}
          />
          <motion.span
            className={`relative grid size-full place-items-center rounded-full text-white shadow-glow ${
              status === "listening" ? "bg-brand-600" : status === "error" ? "bg-ink" : "bg-brand-500"
            }`}
            animate={{ scale: status === "listening" ? 0.94 : 1 }}
            transition={spring.snappy}
          >
            <Mic size={big * 0.42} strokeWidth={2.2} />
          </motion.span>
        </button>
        {variant === "cart" && (
          <span className="rounded-full bg-surface/90 px-3 py-1.5 text-sm font-medium text-ink-muted shadow-soft">
            {LABEL[status]}
            {status === "ready" || status === "off" ? " · or hold Space" : ""}
          </span>
        )}
      </div>
    </div>
  );
}
