#!/usr/bin/env node
// AID-3049 — deterministic XSS guard for voxelDojo HUD innerHTML sinks.
//
// Rule: inside any statement that assigns to `.innerHTML`, every `${...}`
// interpolation must be one of:
//   1. fully wrapped in `escapeHtml(...)` (shared/escapeHtml.ts),
//   2. literal-only (no identifiers, no nested template literals),
//   3. explicitly annotated `${/* static-html */ ...}` — audited by hand,
//      reserved for literal-only markup that is conditionally included.
//
// Known blind spot (kept deliberately): markup assembled into local arrays and
// `.join()`-ed into innerHTML (game-06 renderGauges style) is outside the
// statement span and not tracked here; new code of that shape must be swept by
// hand or refactored to a direct assignment.
//
// Usage: node scripts/check-hud-innerhtml.mjs  (exit 0 = clean, 1 = violations)

import { readFileSync, readdirSync, statSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const engineRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const LITERAL_ONLY = /^[^A-Za-z_$`\\]*$/
const STATIC_HTML_MARKER = "/* static-html */"

function listTsFiles(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "dist" || entry.startsWith(".")) continue
    const full = path.join(dir, entry)
    if (statSync(full).isDirectory()) listTsFiles(full, acc)
    else if (entry.endsWith(".ts") && !entry.endsWith(".test.ts")) acc.push(full)
  }
  return acc
}

// Positions `i` at a `${` (src[i] === "$", src[i+1] === "{"). Returns the index
// just after the matching "}". Understands nested braces, strings and nested
// template literals inside the expression.
function skipExpression(src, i) {
  let j = i + 2
  let braces = 1
  while (j < src.length && braces > 0) {
    const ch = src[j]
    if (ch === "\\") {
      j += 2
      continue
    }
    if (ch === "'" || ch === '"') {
      const q = ch
      j++
      while (j < src.length && src[j] !== q) {
        if (src[j] === "\\") j++
        j++
      }
      j++
      continue
    }
    if (ch === "`") {
      j = skipTemplate(src, j)
      continue
    }
    if (ch === "{") braces++
    else if (ch === "}") braces--
    j++
  }
  return j
}

// Positions `i` on an opening backtick. Returns the index just after the
// closing backtick. Nested `${...}` expressions (which may nest further
// templates) are skipped whole.
function skipTemplate(src, i) {
  let j = i + 1
  while (j < src.length) {
    const ch = src[j]
    if (ch === "\\") {
      j += 2
      continue
    }
    if (ch === "`") return j + 1
    if (ch === "$" && src[j + 1] === "{") {
      j = skipExpression(src, j)
      continue
    }
    j++
  }
  return j
}

// From `pos` (just after the `=` of an `.innerHTML =` assignment), returns the
// exclusive end of the statement: a `;` at depth 0, or an ASI newline at depth
// 0 followed by a new statement keyword or `}`.
function statementEnd(src, pos) {
  let paren = 0
  let bracket = 0
  let codeBrace = 0
  let quote = null
  let i = pos
  while (i < src.length) {
    const ch = src[i]
    if (quote) {
      if (ch === "\\") i++
      else if (ch === quote) quote = null
      i++
      continue
    }
    if (ch === "'" || ch === '"') {
      quote = ch
      i++
      continue
    }
    if (ch === "`") {
      i = skipTemplate(src, i)
      continue
    }
    if (ch === "/" && src[i + 1] === "/") {
      while (i < src.length && src[i] !== "\n") i++
      continue
    }
    if (ch === "(") paren++
    else if (ch === ")") paren--
    else if (ch === "[") bracket++
    else if (ch === "]") bracket--
    else if (ch === "{") codeBrace++
    else if (ch === "}") codeBrace--
    else if (ch === ";" && paren === 0 && bracket === 0 && codeBrace === 0) return i
    else if (ch === "\n" && paren === 0 && bracket === 0 && codeBrace === 0) {
      let lookbehind = i - 1
      while (lookbehind >= pos && /\s/.test(src[lookbehind])) lookbehind--
      const prev = src[lookbehind]
      const prevContinues = prev === undefined || "=+(?.:&|,".includes(prev) || prev === ">"
      if (!prevContinues) {
        let j = i + 1
        while (j < src.length) {
          if (/\s/.test(src[j])) {
            j++
            continue
          }
          if (src[j] === "/" && src[j + 1] === "/") {
            while (j < src.length && src[j] !== "\n") j++
            continue
          }
          if (src[j] === "/" && src[j + 1] === "*") {
            j += 2
            while (j < src.length && !(src[j] === "*" && src[j + 1] === "/")) j++
            j += 2
            continue
          }
          break
        }
        // ASI ends the statement unless the next token can only continue it.
        const next = src[j]
        if (!".+-%*/?([:,=<>:&|^`".includes(next)) return i
      }
    }
    i++
  }
  return src.length
}

// Returns [start, endAfterClosingBrace] spans for every top-level `${...}`
// expression of the template literal that opens at `open` (a backtick index).
function interpolations(src, open) {
  const exprs = []
  let j = open + 1
  while (j < src.length) {
    const ch = src[j]
    if (ch === "\\") {
      j += 2
      continue
    }
    if (ch === "`") return exprs
    if (ch === "$" && src[j + 1] === "{") {
      const start = j + 2
      const after = skipExpression(src, j)
      exprs.push([start, after - 1])
      j = after
      continue
    }
    j++
  }
  return exprs
}

function lineAt(src, index) {
  return src.slice(0, index).split("\n").length
}

const violations = []
const statements = []
for (const gameDir of readdirSync(engineRoot).filter((d) => d.startsWith("game-")).sort()) {
  const srcDir = path.join(engineRoot, gameDir, "src")
  let files
  try {
    files = listTsFiles(srcDir)
  } catch {
    continue
  }
  for (const file of files) {
    const src = readFileSync(file, "utf8")
    const assignRe = /\.innerHTML\s*=/g
    let match
    while ((match = assignRe.exec(src)) !== null) {
      if (src[match.index + match[0].length] === "=") continue // `==`
      const start = match.index + match[0].length
      const end = statementEnd(src, start)
      statements.push([src, start, end, file, gameDir])
    }
  }
}

let templates = 0
for (const [src, start, end, file, gameDir] of statements) {
  let i = start
  while (i < end) {
    const ch = src[i]
    if (ch === "'" || ch === '"') {
      const q = ch
      i++
      while (i < end && src[i] !== q) {
        if (src[i] === "\\") i++
        i++
      }
      i++
      continue
    }
    if (ch !== "`") {
      i++
      continue
    }
    templates++
    for (const [exprStart, exprEnd] of interpolations(src, i)) {
      const expr = src.slice(exprStart, exprEnd).trim()
      const safe =
        expr.startsWith("escapeHtml(") || expr.includes(STATIC_HTML_MARKER) || LITERAL_ONLY.test(expr)
      if (!safe) {
        violations.push(
          `${path.relative(engineRoot, file)}:${lineAt(src, exprStart)} unescaped interpolation: \`${expr}\``,
        )
      }
    }
    i = skipTemplate(src, i)
  }
}

if (violations.length > 0) {
  console.error(`check-hud-innerhtml: ${violations.length} violation(s)`)
  for (const v of violations) console.error(`  ${v}`)
  console.error("Wrap dynamic values in escapeHtml(...) from shared/escapeHtml.ts (AID-3049).")
  process.exit(1)
}
console.log(
  `check-hud-innerhtml: OK — ${statements.length} innerHTML statements, ${templates} markup templates, ${new Set(statements.map((s) => s[4])).size} games scanned, 0 unescaped interpolations (AID-3049).`,
)
