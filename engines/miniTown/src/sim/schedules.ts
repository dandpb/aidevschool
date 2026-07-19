/**
 * Deterministic per-resident schedule. Given a simTime in 0..24 (hours), the
 * module decides *where* a resident should be right now and what they're
 * doing. The Resident class uses this to pick a new destination when it
 * finishes a trip; the Vehicle class uses it the same way.
 *
 * The schedule is intentionally coarse — eight bands in a 24h day — so the
 * town reads as a clear story (wake → commute → work → lunch → work →
 * commute → home → sleep) without sub-hour jitter. The exact boundaries
 * mirror the spec at `docs/concepts/CONCEPTS.md > People & cars` and the
 * prompt's `## Residentes` block.
 *
 * Pure: no THREE, no DOM, no Town references. The Resident module translates
 * the symbolic activity + location into a concrete path request.
 */

export type ResidentActivity = "home" | "walking" | "working" | "shopping"

/**
 * What the resident is doing *right now* in symbolic terms. The actual
 * destination (home/work/shop) is decided by the resident's `home` / `work`
 * fields and a nearest-shop lookup; this enum just labels the band.
 */
export type ScheduleActivity =
  | "sleeping" // 0..6
  | "commuting-to-work" // 6..8
  | "working" // 8..12, 13..17
  | "lunch" // 12..13
  | "commuting-home" // 17..19
  | "loitering" // 19..22
  | "at-home" // 22..24

/**
 * Where the resident should be at this hour. The Resident compares the
 * desired location against its `currentCell` to decide whether to plan a
 * path.
 */
export type ScheduleLocation = "home" | "work" | "shop" | "walking"

/**
 * A single sample from the schedule. Activity is the *label*; location is
 * the *intent*. Residents and the verifier both read the location, not the
 * activity, to decide whether the resident is in the right cell.
 */
export interface ScheduleSlot {
  readonly activity: ScheduleActivity
  readonly location: ScheduleLocation
}

function normaliseHour(hour: number): number {
  return ((hour % 24) + 24) % 24
}

/**
 * Map an hour of day to the activity + location the schedule prescribes.
 * Boundaries are inclusive of start hour, exclusive of end hour (mirrors
 * `phaseFor` in `dayNight.ts`).
 */
export function scheduleFor(hour: number): ScheduleSlot {
  const h = normaliseHour(hour)
  if (h >= 0 && h < 6) return { activity: "sleeping", location: "home" }
  if (h >= 6 && h < 8) return { activity: "commuting-to-work", location: "walking" }
  if (h >= 8 && h < 12) return { activity: "working", location: "work" }
  if (h >= 12 && h < 13) return { activity: "lunch", location: "shop" }
  if (h >= 13 && h < 17) return { activity: "working", location: "work" }
  if (h >= 17 && h < 19) return { activity: "commuting-home", location: "walking" }
  if (h >= 19 && h < 22) return { activity: "loitering", location: "home" }
  return { activity: "at-home", location: "home" }
}

/**
 * Compress the rich `ScheduleActivity` to the four labels the Resident's
 * `currentActivity` field is allowed to take. This is the projection the
 * spec asked for: `home` | `walking` | `working` | `shopping`.
 */
export function compressActivity(slot: ScheduleSlot): ResidentActivity {
  switch (slot.location) {
    case "home":
      return "home"
    case "work":
      return "working"
    case "shop":
      return "shopping"
    case "walking":
      return "walking"
  }
}
