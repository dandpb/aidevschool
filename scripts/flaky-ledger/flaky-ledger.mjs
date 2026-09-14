#!/usr/bin/env node
// Flaky ledger — aggregates Playwright "flaky" entries from GitHub Actions
// check-run logs into a tracked, machine-readable ledger (AID-1857/t2).
//
// Closes the AID-1722 gap #2: the AID-1658 retry policy surfaces retried
// tests as named "flaky" entries in CI job logs, but those logs are ephemeral
// (default retention) — the quarantine escalation ("recurrence on the same
// test escalates to quarantine + issue") had no durable, machine-readable
// aggregate. This tool scans the same source the harness map used (the
// Actions jobs/check-runs API), extracts every flaky entry, and appends the
// deduplicated events to a tracked NDJSON ledger plus a regenerated human
// summary (docs/qa/flaky-ledger/).
//
// Usage:
//   node scripts/flaky-ledger/flaky-ledger.mjs --self-test          offline
//       Parser fixtures must extract exactly the expected entries
//       (synthetic logs with/without flaky sections).
//   node scripts/flaky-ledger/flaky-ledger.mjs [--runs N] [--since-iso ISO]
//       Scan the N most recent runs of the CI workflow (default 60),
//       optionally only those created at/after --since-iso. Appends new
//       (deduplicated) flaky events to the NDJSON ledger and regenerates
//       the summary. GITHUB_TOKEN is used when present (public repo works
//       anonymously; a token lifts the rate limit). --repo owner/name
//       overrides the default dandpb/aidevschool.
//   node scripts/flaky-ledger/flaky-ledger.mjs --runs N --dry-run
//       Scan and print the summary/entries without writing anything.
//
// Output contract (deterministic):
//   docs/qa/flaky-ledger/flaky-ledger.ndjson — append-only, one JSON object
//     per flaky occurrence: {ts, run_id, run_number, run_attempt, head_sha,
//     event, job, surface, project, test_file, test_id, title}. Dedup key:
//     run_id#attempt#job#test_id — re-scanning a window never duplicates.
//   docs/qa/flaky-ledger/README.md — regenerated summary: window scanned,
//     per-test occurrence counts, last seen, AID-1658 quarantine trigger.
//
// Exit: 0 ok (including "0 flaky entries in window"); 1 self-test
// regression or scan/write failure; 2 usage error.
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const HERE = dirname(fileURLToPath(import.meta.url))
const LEDGER_DIR = resolve(HERE, "../../docs/qa/flaky-ledger")
const LEDGER_PATH = join(LEDGER_DIR, "flaky-ledger.ndjson")
const SUMMARY_PATH = join(LEDGER_DIR, "README.md")

// Playwright browser surfaces of the CI matrix (AID-1658 policy jobs). The
// voxelDojo per-game matrix legs are matched by prefix so new games are
// covered without edits.
const PLAYWRIGHT_JOB_PATTERNS = [
  /^literacyDojo \(TS \+ content\)$/,
  /^codexdojo-os \(TS\)$/,
  /^miniTown \(TS\)$/,
  /^dojoToday \(TS \+ substrate\)$/,
  /^pixelDojo \(TS\)$/,
  /^voxelDojo \(TS\)$/,
  /^voxelDojo games\/.+ \(TS\)$/,
]

function surfaceForJob(jobName) {
  if (jobName.startsWith("voxelDojo games/")) {
    return "voxelDojo games"
  }
  return jobName.replace(/ \(TS.*\)$/, "")
}

// GitHub Actions log lines carry a leading timestamp; strip it before
// matching the Playwright list-reporter output.
function stripTimestamp(line) {
  return line.replace(/^\d{4}-\d{2}-\d{2}T[\d:.]+Z\s?/, "")
}

const FLAKY_HEADING = /^\s+(\d+)\s+flaky\s*$/
const TEST_LINE = /^\s+(\[[^\]]+\])\s+›\s+(.+)$/

// Extract flaky entries from one job log (Playwright list reporter: a
// "N flaky" summary line followed by one indented test line per flaky test).
export function parseFlakyEntries(logText) {
  const entries = []
  const lines = logText.split(/\r?\n/)
  let inFlakySection = false
  for (const rawLine of lines) {
    const line = stripTimestamp(rawLine)
    const heading = FLAKY_HEADING.exec(line)
    if (heading) {
      inFlakySection = Number(heading[1]) > 0
      continue
    }
    if (!inFlakySection) {
      continue
    }
    const testLine = TEST_LINE.exec(line)
    if (!testLine) {
      inFlakySection = false
      continue
    }
    const project = testLine[1]
    const rest = testLine[2]
    // "<file>:<line>:<column> › <title chain>"
    const match = /^(.+?):(\d+):(\d+)\s+›\s+(.+)$/.exec(rest)
    if (!match) {
      continue
    }
    entries.push({
      project,
      test_file: match[1],
      test_id: `${project} › ${rest}`,
      title: match[4],
    })
  }
  return entries
}

function parseArgs(argv) {
  const args = {
    runs: 60,
    sinceIso: "",
    repo: "dandpb/aidevschool",
    dryRun: false,
    selfTest: false,
  }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === "--self-test") args.selfTest = true
    else if (arg === "--dry-run") args.dryRun = true
    else if (arg === "--runs") args.runs = Number(argv[(i += 1)])
    else if (arg === "--since-iso") args.sinceIso = argv[(i += 1)] ?? ""
    else if (arg === "--repo") args.repo = argv[(i += 1)] ?? args.repo
    else {
      console.error(`unknown argument: ${arg}`)
      process.exit(2)
    }
  }
  if (!Number.isInteger(args.runs) || args.runs <= 0) {
    console.error("--runs must be a positive integer")
    process.exit(2)
  }
  return args
}

async function githubFetchJson(path, token) {
  const headers = { Accept: "application/vnd.github+json" }
  if (token) headers.Authorization = `Bearer ${token}`
  const response = await fetch(`https://api.github.com${path}`, { headers })
  if (!response.ok) {
    throw new Error(`GET ${path} -> ${response.status} ${response.statusText}`)
  }
  return response.json()
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// The logs endpoint sits behind GitHub's secondary rate limits — a burst of
// downloads answers 403 (with Retry-After) before the primary quota moves.
// Retry a bounded number of times, honoring Retry-After when present.
async function fetchWithLogRetry(url, headers, jobId, attempts = 3) {
  let lastError = new Error(`GET logs ${jobId} -> unknown`)
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const response = await fetch(url, { headers, redirect: "manual" })
    if (response.ok || response.status === 302 || response.status === 301) {
      return response
    }
    lastError = new Error(`GET logs ${jobId} -> ${response.status} ${response.statusText}`)
    if (response.status !== 403 && response.status !== 429) {
      throw lastError
    }
    const retryAfter = Number(response.headers.get("retry-after"))
    await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter, 30) * 1000 : 5000)
  }
  throw lastError
}

async function fetchJobLog(repo, jobId, token) {
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  // The logs endpoint 302-redirects to a short-lived signed blob URL. Fetch
  // must NOT forward the GitHub Authorization header to that cross-origin
  // target (Azure rejects it with 403) — follow the redirect manually.
  const response = await fetchWithLogRetry(
    `https://api.github.com/repos/${repo}/actions/jobs/${jobId}/logs`,
    headers,
    jobId,
  )
  if (response.status === 302 || response.status === 301) {
    const signedUrl = response.headers.get("location")
    if (!signedUrl) {
      throw new Error(`GET logs ${jobId} -> ${response.status} without location`)
    }
    // Blob-side throttling ("Egress is over the account limit", 503/403) is
    // transient — retry with a bounded backoff before giving up on this job.
    let blob = await fetch(signedUrl)
    for (let attempt = 0; attempt < 3 && !blob.ok; attempt += 1) {
      if (blob.status !== 403 && blob.status !== 429 && blob.status !== 503) {
        throw new Error(`GET logs ${jobId} blob -> ${blob.status} ${blob.statusText}`)
      }
      await sleep(15_000 * (attempt + 1))
      blob = await fetch(signedUrl)
    }
    if (!blob.ok) {
      throw new Error(`GET logs ${jobId} blob -> ${blob.status} ${blob.statusText}`)
    }
    return blob.text()
  }
  return response.text()
}

// Bounded-concurrency map so a 60-run window stays fast under rate limits.
async function mapLimited(items, limit, worker) {
  const results = new Array(items.length)
  let cursor = 0
  async function runOne() {
    while (cursor < items.length) {
      const index = cursor
      cursor += 1
      results[index] = await worker(items[index])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => runOne()))
  return results
}

export async function scan({ runs: runCount, sinceIso, repo, token }) {
  const perPage = Math.min(runCount, 100)
  const runs = []
  for (let page = 1; runs.length < runCount; page += 1) {
    const batch = await githubFetchJson(
      `/repos/${repo}/actions/workflows/ci.yml/runs?per_page=${perPage}&page=${page}`,
      token,
    )
    const workflowRuns = batch.workflow_runs ?? []
    runs.push(...workflowRuns)
    if (workflowRuns.length < perPage) break
  }
  const limited = runs.slice(0, runCount)
  const since = sinceIso || ""
  const selected = since ? limited.filter((run) => run.created_at >= since) : limited

  const events = []
  const scanned = []
  let jobsSkipped = 0
  for (const run of selected) {
    const jobsPayload = await githubFetchJson(
      `/repos/${repo}/actions/runs/${run.id}/jobs?per_page=100`,
      token,
    )
    const jobs = (jobsPayload.jobs ?? []).filter(
      (job) =>
        job.status === "completed" &&
        PLAYWRIGHT_JOB_PATTERNS.some((pattern) => pattern.test(job.name)),
    )
    const jobEvents = await mapLimited(jobs, 2, async (job) => {
      let log
      try {
        log = await fetchJobLog(repo, job.id, token)
      } catch (error) {
        // A single unavailable log must not abort the window: record the
        // skip in the scan stats (surfaced in the summary) and continue.
        jobsSkipped += 1
        console.warn(`warn: ${error instanceof Error ? error.message : error} (skipped)`)
        return []
      }
      return parseFlakyEntries(log).map((entry) => ({
        ts: run.created_at,
        run_id: run.id,
        run_number: run.run_number,
        run_attempt: job.run_attempt,
        head_sha: run.head_sha,
        event: run.event,
        job: job.name,
        surface: surfaceForJob(job.name),
        ...entry,
      }))
    })
    for (const list of jobEvents) events.push(...list)
    scanned.push({ run_id: run.id, jobs: jobs.length })
  }
  events.sort(
    (a, b) => a.ts.localeCompare(b.ts) || a.job.localeCompare(b.job) || a.test_id.localeCompare(b.test_id),
  )
  return { events, scanned, runsScanned: selected.length, jobsSkipped }
}

function readLedgerEvents() {
  try {
    return readFileSync(LEDGER_PATH, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line))
  } catch {
    return []
  }
}

function eventKey(event) {
  return `${event.run_id}#${event.run_attempt}#${event.job}#${event.test_id}`
}

export function mergeLedger(events, dryRun) {
  const existing = readLedgerEvents()
  const seen = new Set(existing.map(eventKey))
  const fresh = events.filter((event) => !seen.has(eventKey(event)))
  if (!dryRun && fresh.length > 0) {
    mkdirSync(LEDGER_DIR, { recursive: true })
    appendFileSync(LEDGER_PATH, `${fresh.map((event) => JSON.stringify(event)).join("\n")}\n`, "utf8")
  }
  return { fresh: fresh.length, total: existing.length + fresh.length }
}

export function renderSummary({ runsScanned, scanned, fresh, total, jobsSkipped = 0 }) {
  const perTest = new Map()
  for (const event of readLedgerEvents()) {
    const key = `${event.surface} | ${event.test_id}`
    const current = perTest.get(key) ?? {
      surface: event.surface,
      test_id: event.test_id,
      count: 0,
      last: event.ts,
    }
    current.count += 1
    if (event.ts > current.last) current.last = event.ts
    perTest.set(key, current)
  }
  const rows = [...perTest.values()].sort(
    (a, b) => b.count - a.count || a.surface.localeCompare(b.surface) || a.test_id.localeCompare(b.test_id),
  )
  const withJobs = scanned.filter((entry) => entry.jobs > 0).length
  const table = rows
    .map((row) => `| ${row.surface} | \`${row.test_id}\` | ${row.count} | ${row.last} |`)
    .join("\n")
  return `# Flaky ledger — check-runs do CI (AID-1857/t2)

Ledger append-only e machine-readable das entradas "flaky" da política de
retry determinístico AID-1658 (\`--retries=1 --trace on-first-retry\` nas
superfícies Playwright do workflow CI). Fonte: GitHub Actions jobs/check-runs
API — a mesma usada no mapa de harness do onboarding AID-1722.

## Como rodar

\`\`\`bash
node scripts/flaky-ledger/flaky-ledger.mjs --self-test          # parser offline
GITHUB_TOKEN=… node scripts/flaky-ledger/flaky-ledger.mjs --runs 60
\`\`\`

- \`flaky-ledger.ndjson\`: uma linha por ocorrência flaky (chave de dedupe
  \`run_id#attempt#job#test_id\` — re-escanear uma janela nunca duplica).
- Gatilho de quarentena AID-1658: recorrência no mesmo teste → quarentena +
  issue (nunca subir retries). Este ledger é o agregado consultável desse
  gatilho.

## Estado atual (regenerado na última varredura)

- Última varredura: ${runsScanned} run(s) do workflow CI (${withJobs} com jobs Playwright examinados${jobsSkipped > 0 ? `; ${jobsSkipped} log(s) indisponível(is) no momento e ignorado(s) — re-rodar a varredura cobre o que faltou` : ""}).
- Entradas novas na última varredura: ${fresh}; total acumulado no ledger: ${total}.

| Superfície | Teste | Ocorrências | Última |
| --- | --- | --- | --- |
${table || "| — | — | 0 | — |"}

(Zero linhas = zero entradas flaky registradas nas varreduras — estado
legítimo, não falha da ferramenta.)
`
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.selfTest) {
    const { runSelfTest } = await import("./self-test.mjs")
    const ok = await runSelfTest({ parseFlakyEntries })
    process.exit(ok ? 0 : 1)
  }
  const token = process.env.GITHUB_TOKEN ?? ""
  const result = await scan(args)
  const { fresh, total } = mergeLedger(result.events, args.dryRun)
  const summary = renderSummary({ ...result, fresh, total })
  if (args.dryRun) {
    console.log(summary)
    console.log(`dry-run: ${fresh} new event(s), ${result.events.length} in window`)
    return
  }
  mkdirSync(LEDGER_DIR, { recursive: true })
  writeFileSync(SUMMARY_PATH, summary, "utf8")
  console.log(
    `flaky-ledger: runs=${result.runsScanned} events=${result.events.length} new=${fresh} total=${total}`,
  )
}

const isDirectRun = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isDirectRun) {
  main().catch((error) => {
    console.error(`flaky-ledger: ${error instanceof Error ? error.message : error}`)
    process.exit(1)
  })
}
