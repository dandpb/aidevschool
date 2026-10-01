#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TOOL = 'pg-c01-source-adapter';
const TOOL_VERSION = '1.0.0';
const ARTIFACT_SCHEMA = 'aidevschool/praticas-guiadas-cotidiano/projection@1';
const CONTRACT_SCHEMA = 'aidevschool/praticas-guiadas-cotidiano/source-contract@1';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_SOURCE_DIR = path.join(HERE, '..', 'pg-c01-dados-minimos-e-verificacao');
const DEFAULT_CONTRACT_PATH = path.join(HERE, 'fixtures', 'pg-c01-source-contract.json');
const GABARITO_FACT_MARKERS = [
  '12/19',
  '35/45',
  '4 das 5',
  'contrariada (privacidade)',
  'confirmar até 14'
];
const LEARNER_VISIBLE_FILES = [
  'enunciado.md',
  'insumos/fonte-1-recado-tia-regina.md',
  'insumos/fonte-2-grupo-familia.md',
  'insumos/resposta-ia.md',
  'exemplo-trabalhado.md'
];

export class AdapterError extends Error {
  constructor(code, message, details) {
    super(message);
    this.name = 'AdapterError';
    this.code = code;
    this.details = details ?? null;
  }
}

export function sha256Hex(data) {
  return createHash('sha256').update(data).digest('hex');
}

export function reflow(text) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .join(' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function toText(buffer) {
  return buffer.toString('utf8');
}

function linesOf(text) {
  return text.split('\n');
}

function sectionRange(lines, heading) {
  const wanted = `## ${heading}`;
  const start = lines.findIndex((line) => line.trim() === wanted);
  if (start === -1) {
    throw new AdapterError('E_STRUCTURE_INVALID', `section not found: ${wanted}`);
  }
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^#{1,6} /.test(lines[i])) {
      end = i;
      break;
    }
  }
  return { start, end };
}

export function sectionBody(text, heading) {
  const { start, end } = sectionRange(linesOf(text), heading);
  const body = linesOf(text).slice(start + 1, end);
  while (body.length > 0 && body[0].trim() === '') body.shift();
  while (body.length > 0 && body[body.length - 1].trim() === '') body.pop();
  return body.join('\n');
}

function paragraphsOf(body) {
  return body
    .split(/\n[ \t]*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

export function paragraphInSection(text, heading, { prefix = null, index = null } = {}) {
  const paragraphs = paragraphsOf(sectionBody(text, heading));
  if (prefix !== null) {
    const found = paragraphs.find((p) => p.startsWith(prefix));
    if (!found) {
      throw new AdapterError('E_STRUCTURE_INVALID', `paragraph not found in ${heading}: ${prefix}`);
    }
    return found;
  }
  const i = index ?? 0;
  if (i >= paragraphs.length) {
    throw new AdapterError('E_STRUCTURE_INVALID', `paragraph index ${i} out of range in ${heading}`);
  }
  return paragraphs[i];
}

export function firstLineOfSection(text, heading) {
  const body = sectionBody(text, heading).split('\n');
  if (body.length === 0 || body[0].trim() === '') {
    throw new AdapterError('E_STRUCTURE_INVALID', `empty section: ${heading}`);
  }
  return body[0].trim();
}

export function bulletsInSection(text, heading) {
  const raw = sectionBody(text, heading).split('\n');
  const bullets = [];
  for (const line of raw) {
    if (/^- /.test(line)) {
      bullets.push(line.slice(2).trim());
    } else if (/^\s{2,}\S/.test(line) && bullets.length > 0) {
      bullets[bullets.length - 1] = `${bullets[bullets.length - 1]} ${line.trim()}`;
    }
  }
  if (bullets.length === 0) {
    throw new AdapterError('E_STRUCTURE_INVALID', `no bullets in section: ${heading}`);
  }
  return bullets;
}

export function bulletQuoteInSection(text, heading, bulletPrefix) {
  const bullets = bulletsInSection(text, heading);
  const bullet = bullets.find((b) => b.startsWith(bulletPrefix));
  if (!bullet) {
    throw new AdapterError('E_STRUCTURE_INVALID', `bullet not found in ${heading}: ${bulletPrefix}`);
  }
  const firstQuote = bullet.indexOf('"');
  const lastQuote = bullet.lastIndexOf('"');
  if (firstQuote === -1 || lastQuote <= firstQuote) {
    throw new AdapterError('E_STRUCTURE_INVALID', `bullet has no quoted text: ${bulletPrefix}`);
  }
  return bullet.slice(firstQuote + 1, lastQuote);
}

export function quotedBoldAfterLine(text, anchorPrefix) {
  const lines = linesOf(text);
  const startIdx = lines.findIndex((line) => line.startsWith(anchorPrefix));
  if (startIdx === -1) {
    throw new AdapterError('E_STRUCTURE_INVALID', `anchor line not found: ${anchorPrefix}`);
  }
  const joined = lines.slice(startIdx).join(' ');
  const open = joined.indexOf('"**');
  const close = open === -1 ? -1 : joined.indexOf('**"', open + 3);
  if (open === -1 || close === -1) {
    throw new AdapterError('E_STRUCTURE_INVALID', `bold quote not found after: ${anchorPrefix}`);
  }
  return joined.slice(open + 3, close);
}

export function tableRows(text, anchorRegexSource) {
  const re = new RegExp(anchorRegexSource);
  const rows = [];
  for (const line of linesOf(text)) {
    const match = line.match(re);
    if (!match) continue;
    const cells = line.split('|');
    if (cells.length < 4) {
      throw new AdapterError('E_STRUCTURE_INVALID', `malformed table row: ${line.slice(0, 60)}`);
    }
    rows.push({ id: match[1], text: cells[2].trim() });
  }
  return rows;
}

export function numberedListItems(text, { first, last }) {
  const lines = linesOf(text);
  const items = new Map();
  for (const line of lines) {
    const match = line.match(/^(\d+)\.\s+(.*)$/);
    if (match) {
      items.set(Number(match[1]), [match[2]]);
    } else if (/^\s+\S/.test(line) && items.size > 0) {
      const keys = [...items.keys()];
      const current = keys[keys.length - 1];
      items.set(current, [...items.get(current), line.trim()]);
    }
  }
  const expected = [];
  for (let n = first; n <= last; n += 1) expected.push(n);
  const missing = expected.filter((n) => !items.has(n));
  if (missing.length > 0) {
    throw new AdapterError('E_STRUCTURE_INVALID', `numbered list items missing: ${missing.join(', ')}`);
  }
  return expected.map((n) => ({ id: String(n), text: items.get(n).join(' ') }));
}

export function criteriaTableIds(text) {
  const lines = linesOf(text);
  const cut = lines.findIndex((line, i) => i > 0 && /^## /.test(line));
  const region = cut === -1 ? lines.slice(1) : lines.slice(1, cut);
  const ids = [];
  for (const line of region) {
    const match = line.match(/^\| (c\d-[^\s|]+) \|/);
    if (match) ids.push(match[1]);
  }
  if (ids.length === 0) {
    throw new AdapterError('E_STRUCTURE_INVALID', 'no criteria rows found in rubrica header table');
  }
  return ids;
}

export function labeledLineInSection(text, heading, prefix) {
  const body = sectionBody(text, heading).split('\n');
  const found = body.find((line) => line.trim().startsWith(prefix));
  if (!found) {
    throw new AdapterError('E_STRUCTURE_INVALID', `labeled line not found in ${heading}: ${prefix}`);
  }
  return found.trim();
}

function applyReflow(value, enabled) {
  return enabled ? reflow(value) : value;
}

function runSelector(fileText, selector, reflowEnabled) {
  switch (selector.kind) {
    case 'section':
      return applyReflow(sectionBody(fileText, selector.heading), reflowEnabled);
    case 'paragraph':
      return applyReflow(paragraphInSection(fileText, selector.section, selector), reflowEnabled);
    case 'firstLine':
      return applyReflow(firstLineOfSection(fileText, selector.section), reflowEnabled);
    case 'bulletQuote':
      return applyReflow(bulletQuoteInSection(fileText, selector.section, selector.prefix), reflowEnabled);
    case 'bullets':
      return bulletsInSection(fileText, selector.section).map((b) => reflow(b));
    case 'quotedBold':
      return applyReflow(quotedBoldAfterLine(fileText, selector.anchorPrefix), reflowEnabled);
    case 'tableRows':
      return tableRows(fileText, selector.regex);
    case 'numberedList':
      return numberedListItems(fileText, selector).map((item) => ({ id: item.id, text: reflow(item.text) }));
    case 'criteriaTable':
      return criteriaTableIds(fileText);
    case 'labeledLine':
      return applyReflow(labeledLineInSection(fileText, selector.section, selector.prefix), reflowEnabled);
    case 'labeledLines':
      return selector.prefixes.map((prefix) => reflow(labeledLineInSection(fileText, selector.section, prefix)));
    default:
      throw new AdapterError('E_STRUCTURE_INVALID', `unknown selector kind: ${selector.kind}`);
  }
}

export function loadContract(contractPath) {
  let contract;
  try {
    contract = JSON.parse(readFileSync(contractPath, 'utf8'));
  } catch (err) {
    throw new AdapterError('E_CONTRACT_INVALID', `cannot load contract ${contractPath}: ${err.message}`);
  }
  if (contract.schema !== CONTRACT_SCHEMA) {
    throw new AdapterError('E_CONTRACT_INVALID', `unexpected contract schema: ${contract.schema}`);
  }
  return contract;
}

export function readSourceFiles(sourceDir, contract) {
  const files = new Map();
  const manifest = [];
  for (const pinned of contract.files) {
    const abs = path.join(sourceDir, pinned.path);
    let buffer;
    try {
      buffer = readFileSync(abs);
    } catch (err) {
      throw new AdapterError('E_CONTRACT_MISSING_FILE', `pinned file unreadable: ${pinned.path}: ${err.message}`);
    }
    const digest = sha256Hex(buffer);
    if (digest !== pinned.sha256) {
      throw new AdapterError('E_SOURCE_HASH_MISMATCH', `source byte change detected in ${pinned.path}`, {
        path: pinned.path,
        expected: pinned.sha256,
        actual: digest
      });
    }
    if (buffer.length !== pinned.bytes) {
      throw new AdapterError('E_SOURCE_HASH_MISMATCH', `source size change detected in ${pinned.path}`, {
        path: pinned.path,
        expected: pinned.bytes,
        actual: buffer.length
      });
    }
    files.set(pinned.path, buffer);
    manifest.push({ path: pinned.path, sha256: digest, bytes: buffer.length });
  }
  return { files, manifest };
}

export function runExtractions(files, contract) {
  const values = new Map();
  for (const entry of contract.extractions) {
    const buffer = files.get(entry.file);
    if (!buffer) {
      throw new AdapterError('E_CONTRACT_MISSING_FILE', `extraction references unpinned file: ${entry.file}`);
    }
    const value = runSelector(toText(buffer), entry.selector, entry.reflow === true);
    values.set(entry.role, value);
  }
  return values;
}

export function verifyExtractions(values, contract) {
  for (const entry of contract.extractions) {
    const value = values.get(entry.role);
    const canonical = JSON.stringify(value);
    const digest = sha256Hex(canonical);
    if (digest !== entry.sha256) {
      throw new AdapterError('E_EXTRACTION_HASH_MISMATCH', `allowlisted extraction diverged from reviewed text: ${entry.role}`, {
        role: entry.role,
        expected: entry.sha256,
        actual: digest
      });
    }
  }
}

function diffIds(actual, expected) {
  return {
    missing: expected.filter((id) => !actual.includes(id)),
    unknown: actual.filter((id) => !expected.includes(id))
  };
}

export function validateStructure(values, contract) {
  const structure = contract.structure;
  const problems = [];

  for (const step of structure.steps) {
    if (!values.has(`step:${step.id}`)) problems.push(`missing step:${step.id}`);
  }
  if (structure.steps.length !== 3) problems.push(`expected 3 steps, contract declares ${structure.steps.length}`);

  for (const [file, spec] of Object.entries(structure.anchors)) {
    const rows = values.get(`anchors:${file}`);
    if (!rows) {
      problems.push(`missing anchors:${file}`);
      continue;
    }
    const { missing, unknown } = diffIds(rows.map((r) => r.id), spec.ids);
    if (missing.length > 0) problems.push(`anchors missing in ${file}: ${missing.join(', ')}`);
    if (unknown.length > 0) problems.push(`anchors unknown in ${file}: ${unknown.join(', ')}`);
  }

  const statements = values.get('statements');
  if (!statements) {
    problems.push('missing statements');
  } else {
    const expectedIds = [];
    for (let n = structure.statements.first; n <= structure.statements.last; n += 1) expectedIds.push(String(n));
    const { missing, unknown } = diffIds(statements.map((s) => s.id), expectedIds);
    if (missing.length > 0) problems.push(`statements missing: ${missing.join(', ')}`);
    if (unknown.length > 0) problems.push(`statements unknown: ${unknown.join(', ')}`);
  }

  const actualCriteria = values.get('criteriaIds') ?? [];
  const expectedCriteria = structure.criteriaIds;
  const missingCriteria = expectedCriteria.filter((id) => !actualCriteria.includes(id));
  const unknownCriteria = actualCriteria.filter((id) => !expectedCriteria.includes(id));
  if (missingCriteria.length > 0) {
    throw new AdapterError('E_CRITERION_MISSING', `rubrica is missing required criteria: ${missingCriteria.join(', ')}`, {
      missing: missingCriteria
    });
  }
  if (unknownCriteria.length > 0) {
    throw new AdapterError('E_CRITERION_UNKNOWN', `rubrica declares unknown criteria: ${unknownCriteria.join(', ')}`, {
      unknown: unknownCriteria
    });
  }

  const prompts = values.get('takeawayPrompts');
  if (!Array.isArray(prompts) || prompts.length !== structure.takeawayPrompts) {
    problems.push(`takeaway prompts expected ${structure.takeawayPrompts}, got ${prompts ? prompts.length : 'none'}`);
  }

  const rules = values.get('rules');
  if (!Array.isArray(rules) || rules.length < structure.rulesMinCount) {
    problems.push(`rules expected >= ${structure.rulesMinCount}, got ${rules ? rules.length : 'none'}`);
  }

  if (problems.length > 0) {
    throw new AdapterError('E_STRUCTURE_INVALID', 'source structure does not match contract', { problems });
  }
}

export function assertNoGabaritoLeak(serializedArtifact, files, allowlistedValues) {
  const haystack = serializedArtifact.replace(/\s+/g, ' ');
  const hits = [];
  for (const marker of GABARITO_FACT_MARKERS) {
    if (haystack.includes(marker)) hits.push(`fact marker: ${marker}`);
  }
  const allowNormalized = allowlistedValues.map((v) => String(v).replace(/\s+/g, ' '));
  const rubricaText = toText(files.get('rubrica-v1.md'));
  const solucaoText = toText(files.get('guia-de-correcao/solucao.md'));
  const gabaritoLines = [
    ...linesOf(rubricaText).filter((line) => line.startsWith('|')),
    ...linesOf(solucaoText)
  ];
  for (const line of gabaritoLines) {
    const normalized = line.replace(/\s+/g, ' ').trim();
    if (normalized.length < 14) continue;
    if (allowNormalized.some((a) => a.includes(normalized))) continue;
    if (haystack.includes(normalized)) hits.push(`gabarito line: ${normalized.slice(0, 80)}`);
  }
  if (hits.length > 0) {
    throw new AdapterError('E_GABARITO_LEAK', 'answer-key material leaked into the learner-visible projection', { hits });
  }
}

export function assertTraceableTexts(texts, files, allowlistedValues) {
  const rawBlob = LEARNER_VISIBLE_FILES.map((f) => toText(files.get(f))).join('\n');
  const flatBlob = rawBlob.replace(/\s+/g, ' ');
  const allowSet = new Set(allowlistedValues.map((v) => String(v)));
  const offenders = [];
  for (const text of texts) {
    const value = String(text);
    if (value.length === 0) continue;
    if (rawBlob.includes(value)) continue;
    if (flatBlob.includes(reflow(value))) continue;
    if (allowSet.has(value)) continue;
    offenders.push(value.slice(0, 80));
  }
  if (offenders.length > 0) {
    throw new AdapterError('E_UNTRACED_CONTENT', 'projection carries text outside learner-visible sources or reviewed allowlist', {
      offenders
    });
  }
}

export function buildArtifact(values, contract, manifest) {
  const structure = contract.structure;
  const steps = structure.steps.map((step) => ({
    id: step.id,
    instruction: values.get(`step:${step.id}`)
  }));
  const anchorEntries = Object.entries(structure.anchors).map(([file, spec]) => ({
    key: spec.key,
    file,
    lines: values.get(`anchors:${file}`)
  }));
  const feedbackByCriterion = {};
  for (const criterionId of structure.criteriaIds) {
    feedbackByCriterion[criterionId] = values.get(`feedback:${criterionId}`);
  }
  const texts = [];
  const collect = (value) => {
    texts.push(value);
    return value;
  };

  const artifact = {
    schema: ARTIFACT_SCHEMA,
    kind: 'guided-practice-projection',
    package: {
      id: contract.package.id,
      version: contract.package.version,
      family: 'praticas-guiadas-cotidiano',
      audience: contract.package.audience,
      journey: contract.package.journey,
      competencies: contract.package.competencies,
      simulated: true,
      gradesOrCertifies: false
    },
    source: {
      pin: { ...contract.pin },
      manifest
    },
    learnerPath: {
      objective: collect(values.get('objective')),
      steps: steps.map((s) => ({ id: s.id, instruction: collect(s.instruction) })),
      rules: values.get('rules').map((r) => collect(r)),
      inputs: {
        'fonte-1': { file: 'insumos/fonte-1-recado-tia-regina.md', anchorKind: 'L', lines: anchorEntries[0].lines.map((l) => ({ id: l.id, text: collect(l.text) })) },
        'fonte-2': { file: 'insumos/fonte-2-grupo-familia.md', anchorKind: 'G', lines: anchorEntries[1].lines.map((l) => ({ id: l.id, text: collect(l.text) })) },
        'resposta-ia': { file: 'insumos/resposta-ia.md', statements: values.get('statements').map((s) => ({ id: s.id, text: collect(s.text) })) }
      },
      referenceMaterial: [{ role: 'worked-example', file: 'exemplo-trabalhado.md' }],
      retry: {
        instruction: collect(values.get('retryInstruction')),
        insistedStatement: {
          id: 'retry-1',
          text: collect(values.get('retryStatement')),
          provenance: {
            file: 'guia-de-correcao/solucao.md',
            section: '5.5',
            extraction: 'allowlisted, hash-pinned in fixtures/pg-c01-source-contract.json, ratified by Content Designer'
          }
        }
      },
      takeaway: {
        instruction: collect(values.get('takeawayInstruction')),
        prompts: values.get('takeawayPrompts').map((p) => collect(p))
      }
    },
    rubricSkeleton: {
      file: 'rubrica-v1.md',
      criteria: structure.criteriaIds.map((id) => ({ id })),
      verdict: {
        allowed: ['sufficient', 'insufficient'],
        binary: true,
        allCriteriaRequired: true,
        aggregateScore: 'none'
      },
      completion: 'practice concluded when all 6 criteria are sufficient, on the 1st or 2nd attempt',
      feedbackByCriterion,
      withheldFromLearnerPath: [
        'rubrica-v1.md (suficiente-quando and perCheck columns, erros plausiveis, controles negativos)',
        'guia-de-correcao/solucao.md (gabarito)',
        'exemplos/exemplo-falha.md',
        'exemplos/exemplo-sucesso.md'
      ]
    },
    pedagogicalSeparation: {
      statement:
        'A projeção separa o material do corretor (rubrica detalhada, gabarito e exemplos de calibração) do caminho visível ao aprendiz, para não pré-carregar os fatos do gabarito (datas, valores, vereditos esperados) antes da tentativa. É separação pedagógica — não garantia de segurança nem mecanismo anti-cópia: o material completo permanece no repositório.',
      allowlistReviewedBy: 'Content Designer (ratificação independente da allowlist de prompts, retry e feedback)',
      allowlistRoles: contract.extractions.filter((e) => e.reviewRequired === true).map((e) => e.role)
    },
    generator: { tool: TOOL, toolVersion: TOOL_VERSION, deterministic: true }
  };
  const allowlistedValues = [...values.values()].flat();
  return { artifact, texts, allowlistedValues };
}

export function project({ sourceDir = DEFAULT_SOURCE_DIR, contractPath = DEFAULT_CONTRACT_PATH } = {}) {
  const contract = loadContract(contractPath);
  const { files, manifest } = readSourceFiles(sourceDir, contract);
  const values = runExtractions(files, contract);
  verifyExtractions(values, contract);
  validateStructure(values, contract);
  const { artifact, texts, allowlistedValues } = buildArtifact(values, contract, manifest);
  const serialized = `${JSON.stringify(artifact, null, 2)}\n`;
  assertTraceableTexts(texts, files, allowlistedValues);
  assertNoGabaritoLeak(serialized, files, allowlistedValues);
  return { artifact, serialized, sha256: sha256Hex(serialized), bytes: Buffer.byteLength(serialized) };
}

function usage() {
  return [
    `usage: node curriculum/praticas-guiadas-cotidiano/tools/${TOOL}.mjs [options]`,
    '',
    'options:',
    '  --source DIR     package source dir (default: ../pg-c01-dados-minimos-e-verificacao)',
    '  --contract FILE  source contract fixture (default: fixtures/pg-c01-source-contract.json)',
    '  --out FILE       write projection artifact to FILE (default: stdout)',
    '  --check          verify only, no artifact emission',
    '  --quiet          suppress summary on stderr',
    '  --help           this message'
  ].join('\n');
}

function parseArgs(argv) {
  const opts = { source: null, contract: null, out: null, check: false, quiet: false, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help') opts.help = true;
    else if (arg === '--check') opts.check = true;
    else if (arg === '--quiet') opts.quiet = true;
    else if (arg === '--source') opts.source = argv[++i];
    else if (arg === '--contract') opts.contract = argv[++i];
    else if (arg === '--out') opts.out = argv[++i];
    else throw new AdapterError('E_ARGS', `unknown argument: ${arg}`);
  }
  return opts;
}

export function main(argv = process.argv.slice(2)) {
  const opts = parseArgs(argv);
  if (opts.help) {
    process.stdout.write(`${usage()}\n`);
    return 0;
  }
  const result = project({
    sourceDir: opts.source ?? DEFAULT_SOURCE_DIR,
    contractPath: opts.contract ?? DEFAULT_CONTRACT_PATH
  });
  if (opts.check) {
    if (!opts.quiet) process.stderr.write(`${TOOL}: check ok sha256=${result.sha256}\n`);
    return 0;
  }
  if (opts.out) writeFileSync(opts.out, result.serialized);
  else process.stdout.write(result.serialized);
  if (!opts.quiet) {
    process.stderr.write(`${TOOL}: projected ${result.artifact.package.id} sha256=${result.sha256} bytes=${result.bytes}\n`);
  }
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  try {
    process.exit(main());
  } catch (err) {
    if (err instanceof AdapterError) {
      process.stderr.write(`error ${err.code}: ${err.message}\n${err.details ? JSON.stringify(err.details) : ''}\n`);
      process.exit(1);
    }
    throw err;
  }
}
