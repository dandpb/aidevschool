import { describe, expect, it } from "vitest"
import { escapeHtml } from "./escapeHtml"

describe("escapeHtml (AID-3049 HUD XSS hardening)", () => {
  it("neutralizes markup payloads before they reach innerHTML", () => {
    expect(escapeHtml('<img src=x onerror="alert(1)">')).toBe(
      "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;",
    )
    expect(escapeHtml("'><svg onload=alert(1)>//")).toBe(
      "&#39;&gt;&lt;svg onload=alert(1)&gt;//",
    )
    expect(escapeHtml("<script>alert(1)</script>")).toBe("&lt;script&gt;alert(1)&lt;/script&gt;")
  })

  it("escapes every HTML-special character", () => {
    expect(escapeHtml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&#39;")
  })

  it("leaves benign pack content byte-identical", () => {
    const benign = "lane-2 · owner consumer-B ✓ b0 · 0.53–0.62 · prateleira 3"
    expect(escapeHtml(benign)).toBe(benign)
  })

  it("stringifies non-strings and maps nullish to empty", () => {
    expect(escapeHtml(7)).toBe("7")
    expect(escapeHtml(0)).toBe("0")
    expect(escapeHtml(null)).toBe("")
    expect(escapeHtml(undefined)).toBe("")
  })

  it("never emits a raw HTML-special character", () => {
    const hostile = `"><script>alert("&<>'")</script>`
    const out = escapeHtml(hostile)
    expect(out).not.toMatch(/[<>"']/)
    expect(out).not.toMatch(/&(?!amp;|lt;|gt;|quot;|#39;)/)
  })
})
