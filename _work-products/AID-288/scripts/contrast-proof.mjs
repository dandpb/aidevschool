// AID-288 C4: WCAG AA contrast computed from the :root hex tokens in each pilot
// game's index.html at afd6789 (same method as AID-268 contrast-results.json).
import { readFileSync, writeFileSync } from "node:fs"

const GAMES = [
  { id: "warehouse", f: "/paperclip/tmp/aid288/wt/engines/voxelDojo/game-02-warehouse/index.html" },
  { id: "wormhole", f: "/paperclip/tmp/aid288/wt/engines/voxelDojo/game-03-wormhole/index.html" },
  { id: "relay", f: "/paperclip/tmp/aid288/wt/engines/voxelDojo/game-05-relay-station/index.html" },
]

const hex = (h) => {
  h = h.replace("#", "")
  if (h.length === 3) h = [...h].map((c) => c + c).join("")
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16))
}
const lum = (rgb) => {
  const f = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
  return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2])
}
const ratio = (a, b) => {
  const l1 = lum(hex(a)), l2 = lum(hex(b))
  return +(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)).toFixed(2))
}

// text-on-background usages in #hud (bg over body = --vd-bg) and .accessible-projection (--vd-surface)
const PAIRS = [
  ["--vd-text", "--vd-bg"], ["--vd-text", "--vd-surface"], ["--vd-text", "--vd-surface-control"],
  ["--vd-muted", "--vd-bg"], ["--vd-muted", "--vd-surface"],
  ["--vd-faint", "--vd-bg"], ["--vd-focus", "--vd-bg"], ["--vd-action", "--vd-bg"],
  ["--vd-success", "--vd-bg"], ["--vd-error", "--vd-bg"],
]

const out = {}
let fail = false
for (const g of GAMES) {
  const html = readFileSync(g.f, "utf8")
  const root = html.slice(html.indexOf(":root"), html.indexOf("}", html.indexOf(":root")))
  const tokens = {}
  for (const m of root.matchAll(/(--vd-[a-z-]+)\s*:\s*(#[0-9a-fA-F]{3,8})/g)) tokens[m[1]] = m[2]
  out[g.id] = []
  for (const [fg, bg] of PAIRS) {
    if (!tokens[fg] || !tokens[bg]) { out[g.id].push([fg, bg, "MISSING", "FAIL"]); fail = true; continue }
    const r = ratio(tokens[fg], tokens[bg])
    const st = r >= 4.5 ? "PASS" : "FAIL"
    if (st === "FAIL") fail = true
    out[g.id].push([fg, bg, r, 4.5, st])
  }
}
writeFileSync("/paperclip/tmp/aid288/qa/contrast-results.json", JSON.stringify(out, null, 2))
for (const [g, rows] of Object.entries(out)) {
  console.log(g, rows.map((r) => `${r[0]}/${r[1]}=${r[2]}:${r.at(-1)}`).join("  "))
}
console.log(fail ? "CONTRAST FAIL" : "CONTRAST PASS (AA)")
process.exit(fail ? 1 : 0)
