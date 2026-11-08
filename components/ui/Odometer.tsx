"use client";
// Digit-roll number (PLAN.md wow checklist: "digit-roll total"). Each digit is a column of 0-9 that springs
// to its value, so ₼12.40 -> ₼14.80 rolls instead of jumping.
import { motion } from "motion/react";
import { spring } from "@/lib/ui/motion";

const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

export function Odometer({ value, prefix = "₼", className = "" }: { value: number; prefix?: string; className?: string }) {
  const text = value.toFixed(2);
  return (
    <span className={`inline-flex items-start tabular-nums ${className}`}>
      <span className="sr-only">
        {prefix}
        {text}
      </span>
      {/* every glyph sits in the same 1em box, so the currency sign and the rolling digits share one baseline */}
      <span aria-hidden className="inline-block h-[1em] leading-none">
        {prefix}
      </span>
      {/* key by position from the right so the cents column stays the same element as the number grows */}
      {text.split("").map((ch, i) => {
        const key = text.length - i;
        if (ch === ".")
          return (
            <span key={`dot-${key}`} aria-hidden className="inline-block h-[1em] leading-none">
              .
            </span>
          );
        return (
          <span key={key} aria-hidden className="relative inline-block h-[1em] overflow-hidden leading-none" style={{ width: "0.62em" }}>
            <motion.span
              className="absolute inset-x-0 top-0 flex flex-col items-center"
              animate={{ y: `${-Number(ch)}em` }}
              initial={false}
              transition={spring.soft}
            >
              {DIGITS.map((d) => (
                <span key={d} className="block h-[1em] leading-none">
                  {d}
                </span>
              ))}
            </motion.span>
          </span>
        );
      })}
    </span>
  );
}
