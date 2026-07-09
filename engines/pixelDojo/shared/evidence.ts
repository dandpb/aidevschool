/**
 * Dual-channel evidence emit for pixel games.
 * Console line scraped by Playwright; window channel is in-page.
 * Never writes learner state.
 *
 * ponytail: local dualEmit so game packages don't need vite fs.allow outside root.
 */
export function dualEmit<T extends object>(
  record: T,
  channel: "game" | "pixelquest" = "game",
): T {
  if (typeof window !== "undefined") {
    const w = window as unknown as Record<string, unknown>
    if (channel === "game") {
      w["__gameEvidence"] = record
    } else {
      const prev = w["__pixelQuestEvidence"]
      const list = Array.isArray(prev) ? prev : []
      w["__pixelQuestEvidence"] = [...list, record]
    }
  }
  console.log(`EVIDENCE ${JSON.stringify(record)}`)
  return record
}
