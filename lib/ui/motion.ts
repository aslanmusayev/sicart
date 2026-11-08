// Spring presets for the `motion` library, so every screen moves the same way.
import type { Transition } from "motion/react";

export const spring = {
  /** Buttons, chips, small UI feedback. */
  snappy: { type: "spring", stiffness: 520, damping: 34, mass: 0.8 },
  /** Cards and panels entering or leaving. */
  soft: { type: "spring", stiffness: 260, damping: 30 },
  /** Product packshots dropping into the cart: a little overshoot. */
  drop: { type: "spring", stiffness: 380, damping: 18, mass: 0.9 },
  /** The cart avatar gliding along the map route. */
  glide: { type: "spring", stiffness: 90, damping: 20 },
} satisfies Record<string, Transition>;

/** Delay between items when several appear together (recipe items staggering into the list). */
export const STAGGER_S = 0.08;
