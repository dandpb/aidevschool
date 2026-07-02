import { describe, expect, it } from "vitest"
import { escapeHtml } from "./escape"

describe("escapeHtml", () => {
  it("escapes HTML-significant characters", () => {
    expect(escapeHtml('<script>alert("x")&\'</script>')).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&amp;&#39;&lt;/script&gt;",
    )
  })

  it("stringifies nullish to empty", () => {
    expect(escapeHtml(null)).toBe("")
    expect(escapeHtml(undefined)).toBe("")
  })

  it("leaves safe text unchanged", () => {
    expect(escapeHtml("Token Bucket")).toBe("Token Bucket")
  })
})
