// Deterministic projection of the canonical guided-practice package
// curriculum/sequencia-dev-guiada/pg-d01-debug-reproduza/ into the OS
// read model src/data/generated/guidedPractice.ts (AID-3527).
//
// AID-3590 extends the same read model with the daily (cotidiano) practice
// pg-c01 by consuming, at build time only, the immutable projection artifact
// of the frozen adapter curriculum/praticas-guiadas-cotidiano/tools/
// pg-c01-source-adapter.mjs (PR #636 @ 0d38a07c over PR #635 @ 88ca305e).
// The artifact sha256 is pinned below; any byte change in the frozen inputs
// (source package, contract fixture or adapter) fails generation closed.
// Only learner-facing fields enter the read model: the worked example is the
// single file resolved from the allowlisted path, hash-checked against the
// artifact manifest (no wildcard, no network, no arbitrary path). Rubric
// perCheck/suficiente-quando columns, the gabarito and the calibration
// examples stay out of the bundle by construction.
//
// Contract (AID-3527, consuming AID-3510 r1 without copying content):
// - The curriculum package stays the single source of truth; this script only
//   projects learner-facing material into a build artifact (gitignored, like
//   literacyDojo's gen:content read model).
// - guia-de-correcao/** is NEVER read: the correction guide is grader-facing
//   and must not reach the learner surface (enunciado AC7 / SEQUENCIA.md §4).
// - Output is byte-deterministic: same tree in, same bytes out (no timestamps,
//   stable key order, LF endings). The projected contentVersion is the sha256
//   of the sorted source manifest, so the receipt of a finished practice pins
//   the exact content it was executed against.
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const ENGINE_ROOT = join(SCRIPT_DIR, '..')
const REPO_ROOT = join(ENGINE_ROOT, '..', '..')
const PACKAGE_RELATIVE_ROOT = 'curriculum/sequencia-dev-guiada/pg-d01-debug-reproduza'
const OUTPUT_PATH = join(ENGINE_ROOT, 'src', 'data', 'generated', 'guidedPractice.ts')

// Learner-facing allowlist. Anything else in the package (notably
// guia-de-correcao/) is intentionally outside the projection.
const SOURCE_FILES = [
  'enunciado.md',
  'exemplo-trabalhado.md',
  'insumos/bugreport.md',
  'insumos/REGRA.md',
  'insumos/fixture/notas.py',
  'insumos/fixture/testes.py',
  'rubrica-v1.md',
]

const FORBIDDEN_PATH_MARKERS = [
  'guia-de-correcao',
  'solucao.md',
  'teste_regressao_bug001.py',
  'exemplos/exemplo-falha.md',
  'exemplos/exemplo-sucesso.md',
]

// AID-3590: frozen daily-practice (pg-c01) inputs and the pinned projection
// artifact they must reproduce. Hash/size pins ratified by the Content
// Designer in AID-3583 (parecer b7995969, closure 8287e520).
const DAILY_FAMILY_ROOT = 'curriculum/praticas-guiadas-cotidiano'
const DAILY_PACKAGE_RELATIVE_ROOT = `${DAILY_FAMILY_ROOT}/pg-c01-dados-minimos-e-verificacao`
const DAILY_ADAPTER_PATH = `${DAILY_FAMILY_ROOT}/tools/pg-c01-source-adapter.mjs`
const DAILY_CONTRACT_PATH = `${DAILY_FAMILY_ROOT}/tools/fixtures/pg-c01-source-contract.json`
const DAILY_PROJECTION_SHA256 = 'ee57638361b6372d57f7061d7339f23b53c88bd238985fb2deddcbf7125d7e5d'
const DAILY_PROJECTION_BYTES = 12871
// Learner-visible files whose sha256 pins may enter the read model. Every
// other manifest entry (rubrica, gabarito, calibration examples, README) is
// referenced only inside the frozen curriculum tree and never here.
const DAILY_LEARNER_FILES = [
  'enunciado.md',
  'exemplo-trabalhado.md',
  'insumos/fonte-1-recado-tia-regina.md',
  'insumos/fonte-2-grupo-familia.md',
  'insumos/resposta-ia.md',
]

export class GuidedPracticeProjectionError extends Error {
  constructor(detail) {
    super(`invalid guided-practice package: ${detail}`)
    this.detail = detail
  }
}

function sha256(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex')
}

function requireMatch(text, pattern, label) {
  const match = text.match(pattern)
  if (match === null) throw new GuidedPracticeProjectionError(`${label} not found`)
  return match
}

function parseHeading(text, level) {
  return text
    .split('\n')
    .filter((line) => line.startsWith(`${'#'.repeat(level)} `))
    .map((line) => line.slice(level + 1).trim())
}

function sectionUnder(text, heading) {
  const lines = text.split('\n')
  const start = lines.findIndex((line) => line.trim() === `## ${heading}`)
  if (start === -1) throw new GuidedPracticeProjectionError(`section "## ${heading}" not found`)
  const body = []
  for (let index = start + 1; index < lines.length; index += 1) {
    if (lines[index].startsWith('## ')) break
    body.push(lines[index])
  }
  return body.join('\n').trim()
}

function parseAttemptSteps(enunciado) {
  const body = sectionUnder(enunciado, 'O ciclo guiado (exemplo → tentativa → feedback → retry → takeaway)')
  const lines = body.split('\n')
  const start = lines.findIndex((line) => line.trim() === '### 2. Tentativa (≈ 20 min)')
  if (start === -1) throw new GuidedPracticeProjectionError('tentativa section not found')
  const steps = []
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index]
    if (line.startsWith('### ')) break
    const match = line.match(/^(\d+)\.\s+(.*)$/)
    if (match !== null) {
      const order = Number.parseInt(match[1], 10)
      if (order !== steps.length + 1) {
        throw new GuidedPracticeProjectionError(`tentativa step ${order} is out of order`)
      }
      steps.push(match[2].trim())
      continue
    }
    // Wrapped continuation of the current step (indented line inside the list).
    if (steps.length > 0 && /^\s+\S/.test(line)) {
      steps[steps.length - 1] = `${steps[steps.length - 1]} ${line.trim()}`
    }
  }
  if (steps.length === 0) throw new GuidedPracticeProjectionError('tentativa steps not found')
  return steps.map((step) => step.replace(/\*\*/g, '').replace(/`/g, '').replace(/\s+/g, ' ').trim())
}

function parseRubricCriteria(rubrica) {
  const criteria = []
  for (const line of rubrica.split('\n')) {
    if (!line.startsWith('| c-')) continue
    const cells = line.split('|').map((cell) => cell.trim())
    if (cells.length < 4) throw new GuidedPracticeProjectionError('rubric row is malformed')
    const [id, criterion, perCheck] = [cells[1], cells[2], cells[3]]
    if (id.length === 0 || criterion.length === 0 || perCheck.length === 0) {
      throw new GuidedPracticeProjectionError(`rubric row ${id || '?'} has empty cells`)
    }
    criteria.push({ id, criterion: criterion.replace(/\*\*/g, ''), perCheck })
  }
  if (criteria.length === 0) throw new GuidedPracticeProjectionError('no rubric criteria parsed')
  return criteria
}

function parseMinutes(enunciado) {
  const match = requireMatch(enunciado, /(\d+)\s*[–-]\s*(\d+)\s*min/, 'target duration')
  const min = Number.parseInt(match[1], 10)
  const max = Number.parseInt(match[2], 10)
  if (!(min >= 5 && max >= min && max <= 120)) {
    throw new GuidedPracticeProjectionError(`implausible duration ${min}-${max}`)
  }
  return { min, max }
}

function tsString(value) {
  return JSON.stringify(value)
}

export async function projectGuidedPractice({ repoRoot = REPO_ROOT, outputPath = OUTPUT_PATH } = {}) {
  const packageRoot = join(repoRoot, PACKAGE_RELATIVE_ROOT)
  const sources = new Map()
  for (const relativePath of SOURCE_FILES) {
    let raw
    try {
      raw = await readFile(join(packageRoot, relativePath), 'utf8')
    } catch (error) {
      throw new GuidedPracticeProjectionError(`cannot read ${relativePath}: ${error.message}`)
    }
    sources.set(relativePath, raw)
  }

  const enunciado = sources.get('enunciado.md')
  const exemplar = sources.get('exemplo-trabalhado.md')
  const rubrica = sources.get('rubrica-v1.md')

  const title = requireMatch(enunciado, /^# pg-d01 — (.+)$/m, 'package title').at(1).trim()
  const anchorLessonId = requireMatch(enunciado, /\*\*Lição-âncora:\*\*\s*`(l\d+)`/, 'anchor lesson').at(1)
  const track = requireMatch(enunciado, /\*\*Trilha:\*\*\s*(\S+)/, 'track').at(1)
  const objective = sectionUnder(enunciado, 'Objetivo observável')
  const attemptSteps = parseAttemptSteps(enunciado)
  const criteria = parseRubricCriteria(rubrica)
  const minutes = parseMinutes(enunciado)

  const manifest = SOURCE_FILES.map((relativePath) => ({
    path: `${PACKAGE_RELATIVE_ROOT}/${relativePath}`,
    sha256: sha256(sources.get(relativePath)),
  }))
  const contentVersion = `pg-d01@${sha256(manifest.map((entry) => `${entry.path}:${entry.sha256}`).join('\n')).slice(0, 12)}`

  const projection = {
    practiceId: 'pg-d01',
    contentVersion,
    track,
    anchorLessonId,
    title,
    objective,
    estimatedMinutes: minutes,
    exemplar: {
      markdown: exemplar,
      sourcePath: `${PACKAGE_RELATIVE_ROOT}/exemplo-trabalhado.md`,
    },
    inputs: [
      { role: 'bugreport', path: 'insumos/bugreport.md', contents: sources.get('insumos/bugreport.md') },
      { role: 'rule', path: 'insumos/REGRA.md', contents: sources.get('insumos/REGRA.md') },
      { role: 'fixture', path: 'insumos/fixture/notas.py', contents: sources.get('insumos/fixture/notas.py') },
      {
        role: 'fixture-suite',
        path: 'insumos/fixture/testes.py',
        contents: sources.get('insumos/fixture/testes.py'),
      },
    ],
    attemptSteps,
    rubric: criteria,
    takeawayPrompts: {
      a: 'Por que a suíte verde não provava ausência de bug aqui?',
      b: 'Qual parte do seu pedido de diagnóstico reduziu o risco de o assistente corrigir o problema errado?',
    },
    manifest,
  }

  const lines = [
    '// AUTO-GENERATED by scripts/gen-guided-practice.mjs — DO NOT EDIT BY HAND.',
    '// Sources of truth (canonical, never duplicated here in git):',
    `//   ${PACKAGE_RELATIVE_ROOT}/`,
    `//   ${DAILY_PACKAGE_RELATIVE_ROOT}/ via ${DAILY_ADAPTER_PATH}`,
    '// Regenerate with `npm run gen:guided-practice`.',
    "import type { DailyGuidedPracticeProjection, GuidedPracticeProjection } from '../../practice/guidedPracticeTypes'",
    '',
    'export const guidedPracticeProjection: GuidedPracticeProjection = ' + serializeStable(projection),
    '',
  ]
  const fileBody = lines.join('\n')
  for (const marker of FORBIDDEN_PATH_MARKERS) {
    if (fileBody.includes(marker)) {
      throw new GuidedPracticeProjectionError(`projection leaked grader-only marker "${marker}"`)
    }
  }
  return { fileBody, outputPath, projection }
}

// AID-3590: build the runtime projection for the daily practice pg-c01 from
// the immutable adapter artifact. Fails closed when the frozen inputs drift
// from the ratified pins or when the artifact shape is not exactly the
// reviewed contract (3 steps, binary verdict policy, 6 criteria).
export async function projectDailyGuidedPractice({ repoRoot = REPO_ROOT } = {}) {
  const adapterUrl = new URL(`file://${join(repoRoot, DAILY_ADAPTER_PATH)}`)
  let adapter
  try {
    adapter = await import(adapterUrl.href)
  } catch (error) {
    throw new GuidedPracticeProjectionError(`cannot import daily adapter: ${error.message}`)
  }
  let projected
  try {
    projected = adapter.project({
      sourceDir: join(repoRoot, DAILY_PACKAGE_RELATIVE_ROOT),
      contractPath: join(repoRoot, DAILY_CONTRACT_PATH),
    })
  } catch (error) {
    throw new GuidedPracticeProjectionError(`daily adapter failed: ${error.message}`)
  }
  if (projected.sha256 !== DAILY_PROJECTION_SHA256 || projected.bytes !== DAILY_PROJECTION_BYTES) {
    throw new GuidedPracticeProjectionError(
      `daily projection diverged from ratified pin: expected sha256 ${DAILY_PROJECTION_SHA256}/${DAILY_PROJECTION_BYTES} bytes, got ${projected.sha256}/${projected.bytes}`,
    )
  }
  const artifact = projected.artifact
  if (artifact.package.family !== 'praticas-guiadas-cotidiano') {
    throw new GuidedPracticeProjectionError(`unexpected daily family: ${artifact.package.family}`)
  }
  if (artifact.learnerPath.steps.length !== 3) {
    throw new GuidedPracticeProjectionError(`expected 3 daily steps, got ${artifact.learnerPath.steps.length}`)
  }
  if (artifact.rubricSkeleton.criteria.length !== 6) {
    throw new GuidedPracticeProjectionError(`expected 6 daily criteria, got ${artifact.rubricSkeleton.criteria.length}`)
  }
  if (
    artifact.rubricSkeleton.verdict.binary !== true ||
    artifact.rubricSkeleton.verdict.allCriteriaRequired !== true ||
    artifact.rubricSkeleton.verdict.aggregateScore !== 'none' ||
    artifact.rubricSkeleton.verdict.allowed.join(',') !== 'sufficient,insufficient'
  ) {
    throw new GuidedPracticeProjectionError('daily verdict policy is not the ratified binary contract')
  }

  // The worked example is a path/hash reference in the artifact; resolve in
  // BUILD only the exact learner-facing file approved by the CD, checked
  // against the artifact manifest (path allowlist, no wildcard/network).
  const reference = artifact.learnerPath.referenceMaterial
  if (reference.length !== 1 || reference[0].role !== 'worked-example') {
    throw new GuidedPracticeProjectionError('daily referenceMaterial must be exactly the worked example')
  }
  const workedExampleFile = reference[0].file
  if (workedExampleFile !== 'exemplo-trabalhado.md' || !DAILY_LEARNER_FILES.includes(workedExampleFile)) {
    throw new GuidedPracticeProjectionError(`worked-example path outside allowlist: ${workedExampleFile}`)
  }
  const workedExampleEntry = artifact.source.manifest.find((entry) => entry.path === workedExampleFile)
  if (workedExampleEntry === undefined) {
    throw new GuidedPracticeProjectionError(`worked example not pinned in artifact manifest: ${workedExampleFile}`)
  }
  const workedExampleBuffer = await readFile(join(repoRoot, DAILY_PACKAGE_RELATIVE_ROOT, workedExampleFile))
  const workedExampleSha = createHash('sha256').update(workedExampleBuffer).digest('hex')
  if (workedExampleSha !== workedExampleEntry.sha256 || workedExampleBuffer.length !== workedExampleEntry.bytes) {
    throw new GuidedPracticeProjectionError('worked example diverged from artifact manifest pin')
  }

  const manifestByPath = new Map(artifact.source.manifest.map((entry) => [entry.path, entry]))
  const learnerManifest = DAILY_LEARNER_FILES.map((relativePath) => {
    const entry = manifestByPath.get(relativePath)
    if (entry === undefined) {
      throw new GuidedPracticeProjectionError(`learner file missing from artifact manifest: ${relativePath}`)
    }
    return { path: `${DAILY_PACKAGE_RELATIVE_ROOT}/${relativePath}`, sha256: entry.sha256 }
  })

  const projection = {
    practiceId: 'pg-c01',
    contentVersion: `pg-c01@${artifact.package.version}`,
    package: {
      id: artifact.package.id,
      version: artifact.package.version,
      family: artifact.package.family,
      audience: artifact.package.audience,
      journey: artifact.package.journey,
      competencies: artifact.package.competencies,
      simulated: artifact.package.simulated,
      gradesOrCertifies: artifact.package.gradesOrCertifies,
    },
    projectionPin: {
      artifactSha256: projected.sha256,
      artifactBytes: projected.bytes,
      adapterTool: artifact.generator.tool,
      adapterToolVersion: artifact.generator.toolVersion,
      sourcePullRequest: artifact.source.pin.pullRequest,
      sourceHead: artifact.source.pin.head,
      canonicalAttachmentSha256: artifact.source.pin.canonicalAttachmentSha256,
    },
    objective: artifact.learnerPath.objective,
    steps: artifact.learnerPath.steps.map((step) => ({ id: step.id, instruction: step.instruction })),
    rules: artifact.learnerPath.rules,
    inputs: {
      fonte1: {
        file: artifact.learnerPath.inputs['fonte-1'].file,
        anchorKind: artifact.learnerPath.inputs['fonte-1'].anchorKind,
        lines: artifact.learnerPath.inputs['fonte-1'].lines,
      },
      fonte2: {
        file: artifact.learnerPath.inputs['fonte-2'].file,
        anchorKind: artifact.learnerPath.inputs['fonte-2'].anchorKind,
        lines: artifact.learnerPath.inputs['fonte-2'].lines,
      },
      respostaIa: {
        file: artifact.learnerPath.inputs['resposta-ia'].file,
        statements: artifact.learnerPath.inputs['resposta-ia'].statements,
      },
    },
    workedExample: {
      markdown: workedExampleBuffer.toString('utf8'),
      sourcePath: `${DAILY_PACKAGE_RELATIVE_ROOT}/${workedExampleFile}`,
    },
    retry: {
      instruction: artifact.learnerPath.retry.instruction,
      insistedStatement: {
        id: artifact.learnerPath.retry.insistedStatement.id,
        text: artifact.learnerPath.retry.insistedStatement.text,
      },
    },
    takeaway: {
      instruction: artifact.learnerPath.takeaway.instruction,
      prompts: artifact.learnerPath.takeaway.prompts,
    },
    criteria: artifact.rubricSkeleton.criteria.map((criterion) => criterion.id),
    verdictPolicy: {
      allowed: artifact.rubricSkeleton.verdict.allowed,
      binary: artifact.rubricSkeleton.verdict.binary,
      allCriteriaRequired: artifact.rubricSkeleton.verdict.allCriteriaRequired,
      aggregateScore: artifact.rubricSkeleton.verdict.aggregateScore,
    },
    completion: artifact.rubricSkeleton.completion,
    feedbackByCriterion: artifact.rubricSkeleton.feedbackByCriterion,
    manifest: learnerManifest,
  }
  return { projection, serializedArtifact: projected.serialized, sha256: projected.sha256, bytes: projected.bytes }
}

// Stable serializer: JSON with sorted object keys and fixed separators, so the
// emitted TypeScript literal is byte-identical across runs and machines.
function serializeStable(value, indent = '  ') {
  if (typeof value === 'string') return tsString(value)
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (Number.isFinite(value)) return String(value)
  if (Array.isArray(value)) {
    const items = value.map((item) => serializeStable(item, `${indent}  `))
    return `[\n${items.map((item) => `${indent}${item},`).join('\n')}\n${indent.slice(2)}]`
  }
  if (value !== null && typeof value === 'object') {
    const entries = Object.keys(value)
      .sort()
      .map((key) => `${indent}  ${tsString(key)}: ${serializeStable(value[key], `${indent}  `)},`)
    return `{\n${entries.join('\n')}\n${indent.slice(2)}}`
  }
  throw new GuidedPracticeProjectionError(`cannot serialize ${typeof value}`)
}

export async function writeGuidedPracticeProjection(options) {
  const { fileBody, outputPath } = await projectGuidedPractice(options)
  const daily = await projectDailyGuidedPractice(options)
  const fullBody = `${fileBody}export const guidedPracticeDailyProjection: DailyGuidedPracticeProjection = ${serializeStable(daily.projection)}\n`
  for (const marker of FORBIDDEN_PATH_MARKERS) {
    if (fullBody.includes(marker)) {
      throw new GuidedPracticeProjectionError(`read model leaked grader-only marker "${marker}"`)
    }
  }
  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, fullBody, 'utf8')
  return outputPath
}

if (process.argv[1] !== undefined && import.meta.url === `file://${process.argv[1]}`) {
  writeGuidedPracticeProjection()
    .then((written) => console.log(`generated ${written}`))
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error)
      process.exitCode = 1
    })
}
