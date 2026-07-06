import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { expect, test } from "@playwright/test"

// Drive the switch-fabric hub wave to a clean PASS and assert a console line
// matching /^EVIDENCE / is emitted. The wave is deterministic (rooms alternate
// cyan/magenta), so we read the HUD's `focus` and `inbound wants` chips to
// align focus before each Z press.

const here = dirname(fileURLToPath(import.meta.url))
const shotPath = join(here, "..", "shots", "05_websocket_chat.png")
const evidenceLogPath = join(here, "..", ".logs", "evidence.json")
mkdirSync(dirname(shotPath), { recursive: true })
mkdirSync(dirname(evidenceLogPath), { recursive: true })

test("plays the L2 switch-fabric wave and emits a PASS evidence record", async ({ page }) => {
  const runtimeErrors: string[] = []
  let evidenceLine = ""
  page.on("pageerror", (err) => runtimeErrors.push(err.message))
  page.on("console", (msg) => {
    const text = msg.text()
    if (text.startsWith("EVIDENCE ")) {
      evidenceLine = text
    }
    if (msg.type() === "error") {
      runtimeErrors.push(text)
    }
  })

  await page.goto("/")
  await expect(page.locator("canvas")).toBeVisible()
  await expect(page.locator(".hud-objective")).toContainText("focus:")
  await expect(page.locator(".hud-controls")).toContainText("broadcast")

  // Drive the wave: align focus to the inbound particle's target room, then Z.
  // Loop until the evidence line appears or we time out. The wave is 8 messages
  // spaced ~1.2s apart, so the whole drive takes ~12s; budget 60s for safety.
  const deadline = Date.now() + 60_000
  while (Date.now() < deadline) {
    if (evidenceLine !== "") break
    const wants = (await page.locator(".chip-target b").first().textContent())?.trim() ?? ""
    if (wants === "" || wants === "—") {
      await page.waitForTimeout(120)
      continue
    }
    const focus = (await page.locator(".chip-room b").first().textContent())?.trim() ?? ""
    if (focus !== wants) {
      await page.keyboard.press("ArrowRight")
      await page.waitForTimeout(80)
      continue
    }
    await page.keyboard.press("z")
    await page.waitForTimeout(120)
  }

  // Assert the EVIDENCE line landed and parse it.
  expect(evidenceLine, "EVIDENCE console line should be emitted").toMatch(/^EVIDENCE /)
  const payload = JSON.parse(evidenceLine.slice("EVIDENCE ".length)) as {
    schema: string
    unit_id: string
    pass: boolean
    gates: string[]
    metrics: {
      kind: string
      level: number
      rooms_managed: number
      live_clients: number
      messages_inbound: number
      messages_broadcast: number
      correct_deliveries: number
      wrong_room_leaks: number
      missed_disconnects: number
      slow_consumer_drops: number
      deadline_misses: number
    }
  }
  expect(payload.schema).toBe("05_websocket_chat-v1")
  expect(payload.unit_id).toBe("05_websocket_chat")
  expect(payload.pass).toBe(true)
  expect(payload.metrics.kind).toBe("threejs-websocket-chat")
  expect(payload.metrics.level).toBe(2)
  expect(payload.metrics.rooms_managed).toBe(2)
  expect(payload.metrics.live_clients).toBe(12)
  expect(payload.metrics.messages_inbound).toBe(8)
  expect(payload.metrics.messages_broadcast).toBe(8)
  expect(payload.metrics.correct_deliveries).toBe(48) // 6 per room * 4 per room * 2 rooms
  expect(payload.metrics.wrong_room_leaks).toBe(0)
  expect(payload.metrics.missed_disconnects).toBe(0)
  expect(payload.metrics.deadline_misses).toBe(0)
  expect(payload.metrics.slow_consumer_drops).toBe(0)
  expect(payload.gates.length).toBeGreaterThan(0)

  // Cross-check the in-page channel exposes the same record.
  const channel = await page.evaluate(() => window.__gameEvidence)
  expect(channel?.schema).toBe("05_websocket_chat-v1")
  expect(channel?.pass).toBe(true)

  // Verify the canvas actually rendered something (not a blank stub).
  const dataUrlLength = await page.evaluate(() => {
    const canvas = document.querySelector("canvas") as HTMLCanvasElement | null
    return canvas === null ? 0 : canvas.toDataURL("image/png").length
  })
  expect(dataUrlLength).toBeGreaterThan(1000)

  await page.screenshot({ path: shotPath, fullPage: true })
  writeFileSync(evidenceLogPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8")
  expect(runtimeErrors, "no page runtime errors").toEqual([])
})
