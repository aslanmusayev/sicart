"use client";
// Full-screen QR scanner: native BarcodeDetector when the browser has it, @zxing/browser otherwise.
// Camera access needs HTTPS (or localhost).
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Detected {
  rawValue: string;
}
interface BarcodeDetectorLike {
  detect(source: HTMLVideoElement): Promise<Detected[]>;
}
type BarcodeDetectorCtor = new (options: { formats: string[] }) => BarcodeDetectorLike;

export function Scanner({ onResult, onClose }: { onResult: (text: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stopped = false;
    let stream: MediaStream | null = null;
    let controls: { stop(): void } | null = null;
    let frame = 0;
    const done = (text: string) => {
      if (stopped) return;
      stopped = true;
      onResult(text);
    };

    (async () => {
      try {
        const video = videoRef.current!;
        const Native = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
        if (Native) {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
          video.srcObject = stream;
          await video.play();
          const detector = new Native({ formats: ["qr_code"] });
          const tick = async () => {
            if (stopped) return;
            try {
              const [code] = await detector.detect(video);
              if (code?.rawValue) return done(code.rawValue);
            } catch {
              /* frame not ready yet */
            }
            frame = requestAnimationFrame(tick);
          };
          void tick();
        } else {
          const { BrowserQRCodeReader } = await import("@zxing/browser");
          controls = await new BrowserQRCodeReader().decodeFromVideoDevice(undefined, video, (result) => {
            if (result) done(result.getText());
          });
        }
      } catch {
        setError("The camera is not available here. Type the cart number instead.");
      }
    })();

    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      controls?.stop();
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onResult]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white">
      <video ref={videoRef} className="absolute inset-0 size-full object-cover" playsInline muted />
      <div className="relative flex items-center justify-between p-5">
        <p className="text-lg font-semibold">Scan the QR on the cart</p>
        <button onClick={onClose} className="grid size-11 place-items-center rounded-full bg-white/15 backdrop-blur" aria-label="Close scanner">
          <X />
        </button>
      </div>
      <div className="relative flex flex-1 items-center justify-center">
        <div className="size-64 rounded-[2rem] border-4 border-white/90 shadow-[0_0_0_9999px_rgb(0_0_0/0.45)]" />
      </div>
      {error && <p className="relative m-5 rounded-2xl bg-white/15 p-4 text-center backdrop-blur">{error}</p>}
    </div>
  );
}
