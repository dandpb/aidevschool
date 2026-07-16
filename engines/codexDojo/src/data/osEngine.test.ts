import { describe, expect, it } from "vitest"
import { resolveCodexDojoOsUrl } from "./osEngine"

describe("resolveCodexDojoOsUrl", () => {
  it("accepts configured HTTPS and root-relative engine URLs", () => {
    expect(resolveCodexDojoOsUrl("https://dojo.example/os")).toBe("https://dojo.example/os")
    expect(resolveCodexDojoOsUrl(" /codexdojo-os/ ")).toBe("/codexdojo-os/")
  })

  it("rejects unsafe or malformed protocols", () => {
    expect(resolveCodexDojoOsUrl("javascript:alert(1)")).toBeUndefined()
    expect(resolveCodexDojoOsUrl("ftp://dojo.example/os")).toBeUndefined()
    expect(resolveCodexDojoOsUrl("//evil.example/os")).toBeUndefined()
  })

  it("treats an empty configuration as unavailable", () => {
    expect(resolveCodexDojoOsUrl(undefined)).toBeUndefined()
    expect(resolveCodexDojoOsUrl("  ")).toBeUndefined()
  })
})
