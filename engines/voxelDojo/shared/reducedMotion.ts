/**
 * Reduced-motion preference for voxelDojo browser surfaces.
 *
 * Decorative, non-essential animation (orbiting set dressing, gliding bots,
 * feedback flashes) must freeze when the learner asks for less motion.
 * State-essential projection (colors, positions synced from sim truth) stays.
 */

/** True when the user agent prefers reduced motion. Headless-safe. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}
