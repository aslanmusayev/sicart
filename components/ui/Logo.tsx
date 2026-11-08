import { ShoppingCart } from "lucide-react";

export function Logo({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-semibold tracking-tight ${className}`} style={{ fontSize: size }}>
      <span
        className="grid place-items-center rounded-[30%] bg-brand-500 text-white shadow-glow"
        style={{ width: size * 1.25, height: size * 1.25 }}
      >
        <ShoppingCart size={size * 0.7} strokeWidth={2.2} />
      </span>
      <span>
        Si<span className="text-brand-500">Cart</span>
      </span>
    </span>
  );
}
