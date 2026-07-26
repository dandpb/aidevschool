import { describe, expect, it } from "vitest"
import { colorForUrl } from "./wormholePortalVisual"

describe("colorForUrl", () => {
  it("maps the same destination URL to the same portal color", () => {
    // Given: a destination shown by the static portal visual.
    const destinationUrl = "https://destination.example/lesson?attempt=3"

    // When: the projection derives its visual destination color more than once.
    const firstColor = colorForUrl(destinationUrl)
    const secondColor = colorForUrl(destinationUrl)

    // Then: deterministic simulation snapshots receive an unchanged visual projection.
    expect(secondColor).toBe(firstColor)
  })

  it("uses a stable palette color when the signed URL hash has a negative remainder", () => {
    // Given: a destination URL whose FNV-style signed hash is negative.
    const destinationUrl = "https://palette-regression.example/10"

    // When: the portal derives its destination color.
    const color = colorForUrl(destinationUrl)

    // Then: the projection keeps a deterministic real palette color instead of throwing.
    expect(color).toBe("#f06292")
  })
})
