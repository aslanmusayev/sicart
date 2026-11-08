import Image from "next/image";
import logo from "@/public/brand/sicart-logo.png";

/** The SiCart wordmark (cart with the "S" + "ICart"). `size` is roughly the cap height in px. */
export function Logo({ size = 28, className = "" }: { size?: number; className?: string }) {
  const height = Math.round(size * 1.7);
  const width = Math.round((height * logo.width) / logo.height);
  // Fixed box inside a wrapper, so a flex parent can never stretch the logo out of proportion.
  return (
    <span className={`inline-flex shrink-0 self-start ${className}`}>
      <Image src={logo} alt="SiCart" priority className="max-w-none select-none" style={{ width, height }} sizes={`${width}px`} />
    </span>
  );
}
