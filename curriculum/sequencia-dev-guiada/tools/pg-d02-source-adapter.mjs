#!/usr/bin/env node
// pg-d02-source-adapter — projeção determinística do caminho do aprendiz para a
// prática guiada pg-d02-pedido-estruturado (sequencia-dev-guiada, U03/D3).
// Abordagem reutilizada do adapter pg-c01 aprovado (AID-3583), adaptada ao
// formato próprio do pg-d02: rúbrica ternária (met/partial/not_met), 6 passos,
// casos de borda B1/B2, template de 5 campos, tabela com pipes dentro de
// backticks e IDs de critério anotados — sem transportar a política binária
// do pg-c01. Nada aqui implementa `--types`: a prática avalia o pedido.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TOOL = 'pg-d02-source-adapter';
const TOOL_VERSION = '1.1.0';
const ARTIFACT_SCHEMA = 'aidevschool/sequencia-dev-guiada/projection@1';
const CONTRACT_SCHEMA = 'aidevschool/sequencia-dev-guiada/source-contract@1';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_SOURCE_DIR = path.join(HERE, '..', 'pg-d02-pedido-estruturado');
const DEFAULT_CONTRACT_PATH = path.join(HERE, 'fixtures', 'pg-d02-source-contract.json');
const PACKAGE_RELATIVE_ROOT = 'curriculum/sequencia-dev-guiada/pg-d02-pedido-estruturado';

// Parity contract (AID-3534; correção técnica PO edc8299a em AID-3617): a
// allowlist learner-facing, sua ordem canônica e a fórmula do contentVersion
// são as mesmas do contrato de prática guiada aceito em PR628
// (`learner/substrate/mission_catalog_guided_practice.py` @
// e376d04f6ea7eb7a7be664eb9e6e15305ea675e9 — GUIDED_PRACTICE_LEARNER_FILES +
// compute_content_version), em paridade com
// `engines/codexdojo-os-prototype/scripts/gen-guided-practice.mjs`
// (SOURCE_FILES + contentVersion, PR #625): entradas `path:sha256` (sha256 do
// conteúdo UTF-8) na ordem canônica da allowlist (não lexicográfica), unidas
// por newline, sha256 do conjunto; contentVersion = practiceId + '@' +
// primeiros 12 hex. Hashes do guia-de-correcao NÃO entram nas entradas
// learner. O date.ordinal do catalog.yaml global é outro contrato e não é
// importado aqui (pg-d01 permanece byte a byte intocado).
const LEARNER_VISIBLE_FILES = [
  'enunciado.md',
  'exemplo-trabalhado.md',
  'insumos/pedido-original.md',
  'insumos/meus_commits.json',
  'insumos/verifica_pedido.py',
  'rubrica-v1.md'
];
const GABARITO_FILES = ['guia-de-correcao/pedido-5-campos.md', 'guia-de-correcao/solucao.md'];
// Fatos que só existem no guia-de-correcao (verificados contra os arquivos
// learner-visible normalizados — nunca presentes no caminho do aprendiz):
// vereditos de referência B1/B2, saídas esperadas do pedido-modelo, aritmética
// do filtro e erros plausíveis do corretor.
const GABARITO_FACT_MARKERS = [
  'sinal de segurança, não tipo filtrável',
  '22 atuais',
  '⚠️ Breaking, ✨ Novidades, 🐛 Correções',
  'unrecognized arguments: --types',
  'Cair na armadilha do Rafa',
  'NÃO-META espantalho',
  'dentro: a seção ⚠️ Breaking',
  'fora das seções de mudanças, mas não silencioso'
];
const TEMPLATE_FIELD_NAMES = ['CONTEXTO', 'OBJETIVO', 'RESTRIÇÕES', 'ACEITE', 'NÃO-META'];

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
  const start = lines.findIndex((line) => {
    const match = line.trim().match(/^(#{2,6})\s+(.*)$/);
    return match !== null && match[2].trim() === heading;
  });
  if (start === -1) {
    throw new AdapterError('E_STRUCTURE_INVALID', `section not found: ${heading}`);
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

export function bulletByPrefix(text, heading, prefix) {
  const bullet = bulletsInSection(text, heading).find((b) => b.startsWith(prefix));
  if (!bullet) {
    throw new AdapterError('E_STRUCTURE_INVALID', `bullet not found in ${heading}: ${prefix}`);
  }
  return bullet;
}

export function labeledLinesInSection(text, heading, prefixes) {
  const body = sectionBody(text, heading).split('\n');
  return prefixes.map((prefix) => {
    const found = body.find((line) => line.trim().startsWith(prefix));
    if (!found) {
      throw new AdapterError('E_STRUCTURE_INVALID', `labeled line not found in ${heading}: ${prefix}`);
    }
    return found.trim();
  });
}

// Prompts (a)/(b) escritos dentro de um mesmo parágrafo (padrão do pg-d02:
// "Responda em duas frases: (a) …; (b) …."). Retorna cada prompt com seu
// rótulo, como subcadeia fiel do parágrafo reflowed.
export function labeledSubPrompts(text, heading, { lead, labels }) {
  const paragraph = reflow(paragraphInSection(text, heading, { index: 0 }));
  if (!paragraph.startsWith(lead)) {
    throw new AdapterError('E_STRUCTURE_INVALID', `takeaway paragraph does not start with: ${lead}`);
  }
  const esc = (label) => label.replace(/[()]/g, '\\$&');
  const pattern = new RegExp(`${esc(labels[0])}\\s*(.+?);\\s*${esc(labels[1])}\\s*(.+?)\\.\\s`);
  const match = paragraph.match(pattern);
  if (!match || match[1].length < 10 || match[2].length < 10) {
    throw new AdapterError('E_STRUCTURE_INVALID', `sub-prompts ${labels.join('/')} not found in ${heading}`);
  }
  return [`${labels[0]} ${match[1]}`, `${labels[1]} ${match[2]}`];
}

export function leadParagraph(text) {
  const paragraphs = paragraphsOf(text);
  const first = paragraphs.find((p) => p.startsWith('# '));
  const idx = paragraphs.indexOf(first);
  if (first === undefined || idx + 1 >= paragraphs.length) {
    throw new AdapterError('E_STRUCTURE_INVALID', 'lead paragraph after title not found');
  }
  return paragraphs[idx + 1];
}

// Bloco de código cercado (``` …```) imediatamente após a linha-âncora.
// Preserva as linhas exatamente (trim por linha), sem reflow nem truncamento —
// o template de 5 campos precisa chegar inteiro ao consumidor.
export function codeBlockAfterLine(text, anchorPrefix) {
  const lines = linesOf(text);
  const anchorIdx = lines.findIndex((line) => line.startsWith(anchorPrefix));
  if (anchorIdx === -1) {
    throw new AdapterError('E_STRUCTURE_INVALID', `anchor line not found: ${anchorPrefix}`);
  }
  const openIdx = lines.findIndex((line, i) => i > anchorIdx && /^\s*```/.test(line));
  if (openIdx === -1) {
    throw new AdapterError('E_STRUCTURE_INVALID', `code fence not found after: ${anchorPrefix}`);
  }
  const block = [];
  for (let i = openIdx + 1; i < lines.length; i += 1) {
    if (/^\s*```/.test(lines[i])) return block.map((l) => l.trim());
    block.push(lines[i]);
  }
  throw new AdapterError('E_STRUCTURE_INVALID', `unterminated code fence after: ${anchorPrefix}`);
}

// Itens numerados de uma seção, com as continuações de linha unidas — mas
// descartando regiões cercadas por ``` (o template do passo 4 é projetado
// como `templateFields`, não como texto do passo).
export function numberedSteps(text, { section, first, last }) {
  const raw = sectionBody(text, section).split('\n');
  const items = new Map();
  let current = null;
  let inFence = false;
  for (const line of raw) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const match = line.match(/^(\d+)\.\s+(.*)$/);
    if (match) {
      current = Number(match[1]);
      items.set(current, [match[2]]);
    } else if (/^\s+\S/.test(line) && current !== null) {
      items.set(current, [...items.get(current), line.trim()]);
    }
  }
  const expected = [];
  for (let n = first; n <= last; n += 1) expected.push(n);
  const missing = expected.filter((n) => !items.has(n));
  if (missing.length > 0) {
    throw new AdapterError('E_STRUCTURE_INVALID', `numbered steps missing in ${section}: ${missing.join(', ')}`);
  }
  return expected.map((n) => ({ id: String(n), text: items.get(n).join(' ') }));
}

// Divide uma linha de tabela markdown respeitando code spans: pipes dentro de
// backticks NÃO separam células (a rúbrica do pg-d02 traz `grep -n
// "stdlib\|silenciosamente\|determin"`, cujos pipes precisam chegar inteiros).
export function splitTableRow(line) {
  const cells = [];
  let currentCell = '';
  let inCodeSpan = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '`') inCodeSpan = !inCodeSpan;
    if (ch === '|' && !inCodeSpan) {
      cells.push(currentCell.trim());
      currentCell = '';
    } else {
      currentCell += ch;
    }
  }
  cells.push(currentCell.trim());
  return cells;
}

function annotationOf(idCell) {
  const match = idCell.match(/\*\*\(objetivo \(([abc])\)\)\*\*/);
  return match ? match[1] : null;
}

// Linhas da tabela de critérios da rubrica-v1: | id (com anotação **(objetivo
// (x))** opcional) | critério | perCheck |. IDs anotados chegam inteiros — a
// anotação é separada, o id nunca truncado.
export function criteriaRows(text) {
  const rows = [];
  for (const line of linesOf(text)) {
    if (!/^\| c\d+-\S+/.test(line)) continue;
    const cells = splitTableRow(line);
    if (cells.length < 4) {
      throw new AdapterError('E_STRUCTURE_INVALID', `malformed criteria row: ${line.slice(0, 60)}`);
    }
    const idCell = cells[1];
    const id = idCell.split(/\s+/)[0];
    rows.push({ id, annotation: annotationOf(idCell), perCheck: cells[3] });
  }
  if (rows.length === 0) {
    throw new AdapterError('E_STRUCTURE_INVALID', 'no criteria rows found in rubrica-v1.md');
  }
  return rows;
}

export function rubricaCell(text, criterionId, column) {
  const row = criteriaRows(text).find((r) => r.id === criterionId);
  if (!row) {
    throw new AdapterError('E_STRUCTURE_INVALID', `criteria row not found: ${criterionId}`);
  }
  if (!(column in row)) {
    throw new AdapterError('E_STRUCTURE_INVALID', `unknown column: ${column}`);
  }
  return row[column];
}

// Bullets com rótulo em negrito (**B1** — texto) — os casos de borda.
export function labeledBullets(text, heading, labelRegex) {
  const re = new RegExp(labelRegex);
  const out = [];
  for (const bullet of bulletsInSection(text, heading)) {
    const match = bullet.match(re);
    if (match) out.push({ id: match[1], text: match[2].trim() });
  }
  if (out.length === 0) {
    throw new AdapterError('E_STRUCTURE_INVALID', `no labeled bullets in ${heading} for ${labelRegex}`);
  }
  return out;
}

// Parágrafos do pedido original (insumo que o aprendiz reescreve),
// ignorando o título H1 e a nota em blockquote.
export function proseParagraphs(text, { skipBlockquote = true } = {}) {
  const paragraphs = paragraphsOf(text);
  const out = [];
  for (const p of paragraphs) {
    if (p.startsWith('# ')) continue;
    const lines = p.split('\n').filter((l) => l.trim().length > 0);
    const kept = skipBlockquote ? lines.filter((l) => !l.trim().startsWith('>')) : lines;
    if (kept.length > 0) out.push(kept.join(' ').replace(/\s{2,}/g, ' ').trim());
  }
  if (out.length === 0) {
    throw new AdapterError('E_STRUCTURE_INVALID', 'no prose paragraphs found');
  }
  return out;
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
    case 'bullets':
      return bulletsInSection(fileText, selector.section).map((b) => reflow(b));
    case 'bulletByPrefix':
      return applyReflow(bulletByPrefix(fileText, selector.section, selector.prefix), reflowEnabled);
    case 'labeledLines':
      return labeledLinesInSection(fileText, selector.section, selector.prefixes).map((l) => reflow(l));
    case 'labeledSubPrompts':
      return labeledSubPrompts(fileText, selector.section, selector).map((p) => reflow(p));
    case 'leadParagraph':
      return applyReflow(leadParagraph(fileText), reflowEnabled);
    case 'codeBlock':
      return codeBlockAfterLine(fileText, selector.anchorPrefix);
    case 'numberedSteps':
      return numberedSteps(fileText, selector).map((s) => ({ id: s.id, text: reflow(s.text) }));
    case 'labeledBullets':
      return labeledBullets(fileText, selector.section, selector.labelRegex).map((b) => ({
        id: b.id,
        text: reflow(b.text)
      }));
    case 'criteriaRows':
      return criteriaRows(fileText);
    case 'rubricaCell':
      return rubricaCell(fileText, selector.criterionId, selector.column);
    case 'proseParagraphs':
      return proseParagraphs(fileText, selector).map((p) => reflow(p));
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

// Paridade com `_HEADING` do PR628: `^# (\S+) — (.+)$` — o practiceId é lido
// do enunciado, nunca presumido.
export function parsePracticeId(enunciadoText) {
  const match = enunciadoText.match(/^# (\S+) — .+$/m);
  if (!match) {
    throw new AdapterError('E_STRUCTURE_INVALID', 'enunciado has no identity heading "# <practiceId> — <title>"');
  }
  return match[1];
}

// Paridade com compute_content_version (PR628) e com o contentVersion do
// gen-guided-practice.mjs (PR #625): entradas `path:sha256` na ordem canônica
// da allowlist, unidas por newline, sha256 do conjunto, primeiros 12 hex.
export function computeContentVersion(
  files,
  practiceId,
  { packageRoot = PACKAGE_RELATIVE_ROOT, allowlist = LEARNER_VISIBLE_FILES } = {}
) {
  const entries = allowlist.map((rel) => `${packageRoot}/${rel}:${sha256Hex(files.get(rel))}`);
  const digest = sha256Hex(entries.join('\n'));
  return `${practiceId}@${digest.slice(0, 12)}`;
}

export function assertContentVersionInterface(contract, files) {
  const pkg = contract.package ?? {};
  const declared = pkg.contentVersion;
  if (typeof declared !== 'string' || declared.length === 0) {
    throw new AdapterError('E_CONTENT_VERSION_INVALID', 'contract.package.contentVersion is required (no invented default)');
  }
  const practiceId = parsePracticeId(toText(files.get('enunciado.md')));
  if (pkg.practiceId !== practiceId) {
    throw new AdapterError('E_CONTENT_VERSION_INVALID', `contract.package.practiceId must match the enunciado identity heading (${practiceId})`);
  }
  if (!new RegExp(`^${practiceId}@[0-9a-f]{12}$`).test(declared)) {
    throw new AdapterError('E_CONTENT_VERSION_INVALID', `contentVersion must follow the parity contract <practiceId>@<sha256-12> (PR628/PR625), got: ${declared}`);
  }
  const computed = computeContentVersion(files, practiceId);
  if (declared !== computed) {
    throw new AdapterError('E_CONTENT_VERSION_MISMATCH', 'contract.package.contentVersion does not match the parity formula over the pinned learner files', {
      expected: computed,
      declared
    });
  }
  const basis = pkg.contentVersionBasis;
  if (!basis || typeof basis !== 'object') {
    throw new AdapterError('E_CONTENT_VERSION_INVALID', 'contract.package.contentVersionBasis is required (parity provenance, no invented default)');
  }
  if (basis.formula !== '<practiceId>@<sha256-12>') {
    throw new AdapterError('E_CONTENT_VERSION_INVALID', `contentVersionBasis.formula must be "<practiceId>@<sha256-12>", got: ${basis.formula}`);
  }
  if (JSON.stringify(basis.allowlist) !== JSON.stringify(LEARNER_VISIBLE_FILES)) {
    throw new AdapterError('E_CONTENT_VERSION_INVALID', 'contentVersionBasis.allowlist must equal the canonical learner allowlist (content and order)');
  }
  if (JSON.stringify(basis.excludes) !== JSON.stringify(GABARITO_FILES)) {
    throw new AdapterError('E_CONTENT_VERSION_INVALID', 'contentVersionBasis.excludes must equal the guia-de-correcao files (their hashes never enter learner entries)');
  }
  const paritySources = (basis.parity ?? []).map((p) => p.source);
  if (
    !paritySources.includes('learner/substrate/mission_catalog_guided_practice.py') ||
    !paritySources.includes('engines/codexdojo-os-prototype/scripts/gen-guided-practice.mjs')
  ) {
    throw new AdapterError('E_CONTENT_VERSION_INVALID', 'contentVersionBasis.parity must cite both parity sources (PR628 py + PR #625 mjs)');
  }
}

export function assertSourceInterface(contract) {
  const si = contract.sourceInterface;
  if (!si || typeof si !== 'object') {
    throw new AdapterError('E_SOURCE_INTERFACE_INVALID', 'contract.sourceInterface freeze is required (learnerVisibleFiles + provenanceOnlyFiles)');
  }
  if (JSON.stringify(si.learnerVisibleFiles) !== JSON.stringify(LEARNER_VISIBLE_FILES)) {
    throw new AdapterError('E_SOURCE_INTERFACE_INVALID', 'sourceInterface.learnerVisibleFiles must equal the canonical allowlist (exact content and order)', {
      expected: LEARNER_VISIBLE_FILES,
      declared: si.learnerVisibleFiles
    });
  }
  if (JSON.stringify(si.provenanceOnlyFiles) !== JSON.stringify(GABARITO_FILES)) {
    throw new AdapterError('E_SOURCE_INTERFACE_INVALID', 'sourceInterface.provenanceOnlyFiles must equal the guia-de-correcao allowlist', {
      expected: GABARITO_FILES,
      declared: si.provenanceOnlyFiles
    });
  }
  const pinnedPaths = contract.files.map((f) => f.path);
  const declared = [...si.learnerVisibleFiles, ...si.provenanceOnlyFiles];
  const overlap = si.learnerVisibleFiles.filter((p) => si.provenanceOnlyFiles.includes(p));
  if (overlap.length > 0) {
    throw new AdapterError('E_SOURCE_INTERFACE_INVALID', `learner/provenance-only lists must be disjoint: ${overlap.join(', ')}`);
  }
  const missing = declared.filter((p) => !pinnedPaths.includes(p));
  if (missing.length > 0) {
    throw new AdapterError('E_SOURCE_INTERFACE_INVALID', `source interface entries must be pinned in contract.files: ${missing.join(', ')}`);
  }
  const unpinned = pinnedPaths.filter((p) => !declared.includes(p));
  if (unpinned.length > 0) {
    throw new AdapterError('E_SOURCE_INTERFACE_INVALID', `contract.files contains paths outside the frozen interface: ${unpinned.join(', ')}`);
  }
}

export function anchorTexts(anchors) {
  const out = [];
  const walk = (node) => {
    if (typeof node === 'string') out.push(node);
    else if (typeof node === 'number') out.push(String(node));
    else if (Array.isArray(node)) node.forEach(walk);
    else if (node && typeof node === 'object') {
      for (const value of Object.values(node)) walk(value);
    }
  };
  walk(anchors);
  return out;
}

export function assertAnchorsTraced(anchors, anchorsMeta) {
  if (!anchors || typeof anchors !== 'object') {
    throw new AdapterError('E_STRUCTURE_INVALID', 'contract.package.anchors is required (structured anchors, F2)');
  }
  if (typeof anchorsMeta !== 'string' || anchorsMeta.length === 0) {
    throw new AdapterError('E_STRUCTURE_INVALID', 'anchorsMeta extraction is required to trace package.anchors');
  }
  const flat = reflow(anchorsMeta);
  const offenders = anchorTexts(anchors).filter(
    (t) => t.length > 0 && !anchorsMeta.includes(t) && !flat.includes(reflow(t))
  );
  if (offenders.length > 0) {
    throw new AdapterError('E_ANCHOR_UNTRACED', 'anchor value not traced to the pinned anchorsMeta extraction (zero invention)', {
      offenders
    });
  }
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

export function parseTemplateFields(blockLines) {
  const fields = [];
  for (const line of blockLines) {
    const match = line.match(/^([A-ZÀ-Ü-]+):\s+(.*)$/);
    if (match) fields.push({ name: match[1], hint: match[2].trim() });
  }
  return fields;
}

export function parseIdentity(metaBlock) {
  const unit = metaBlock.match(/Unidade:\*\*\s*(U\d+)/);
  const primary = metaBlock.match(/Competência primária:\*\*\s*(D\d+)/);
  const support = metaBlock.match(/Apoio:\*\*\s*(D\d+)/);
  if (!unit || !primary || !support) {
    throw new AdapterError('E_STRUCTURE_INVALID', 'identity (Unidade/Competência primária/Apoio) not found in enunciado meta');
  }
  return { unit: unit[1], competencyPrimary: primary[1], competencySupport: [support[1]] };
}

export function parseVerdictPolicy(verdictHeader) {
  const allowed = ['met', 'partial', 'not_met'];
  for (const v of allowed) {
    if (!verdictHeader.includes(`\`${v}\``)) {
      throw new AdapterError('E_STRUCTURE_INVALID', `verdict \`${v}\` missing from rubrica header`);
    }
  }
  if (verdictHeader.includes('sufficient') || verdictHeader.includes('insufficient')) {
    throw new AdapterError('E_STRUCTURE_INVALID', 'binary pg-c01 verdict policy must not be transported into pg-d02');
  }
  return allowed;
}

export function validateStructure(values, contract) {
  const structure = contract.structure;
  const problems = [];

  const steps = values.get('steps');
  if (!Array.isArray(steps)) {
    problems.push('missing steps');
  } else {
    const expected = [];
    for (let n = structure.steps.first; n <= structure.steps.last; n += 1) expected.push(String(n));
    const { missing, unknown } = diffIds(steps.map((s) => s.id), expected);
    if (missing.length > 0) problems.push(`steps missing: ${missing.join(', ')}`);
    if (unknown.length > 0) problems.push(`steps unknown: ${unknown.join(', ')}`);
    if (steps.length !== structure.steps.count) problems.push(`expected ${structure.steps.count} steps, got ${steps.length}`);
  }

  const edgeCases = values.get('edgeCases');
  if (!Array.isArray(edgeCases)) {
    problems.push('missing edgeCases');
  } else {
    const { missing, unknown } = diffIds(edgeCases.map((e) => e.id), structure.edgeCaseIds);
    if (missing.length > 0) problems.push(`edge cases missing: ${missing.join(', ')}`);
    if (unknown.length > 0) problems.push(`edge cases unknown: ${unknown.join(', ')}`);
  }

  const template = parseTemplateFields(values.get('templateFields') ?? []);
  const templateNames = template.map((f) => f.name);
  const { missing: fieldsMissing, unknown: fieldsUnknown } = diffIds(templateNames, TEMPLATE_FIELD_NAMES);
  if (fieldsMissing.length > 0) problems.push(`template fields missing: ${fieldsMissing.join(', ')}`);
  if (fieldsUnknown.length > 0) problems.push(`template fields unknown: ${fieldsUnknown.join(', ')}`);
  if (template.length !== TEMPLATE_FIELD_NAMES.length) {
    problems.push(`template expected ${TEMPLATE_FIELD_NAMES.length} fields, got ${template.length}`);
  }

  const rows = values.get('criteriaRows') ?? [];
  const actualIds = rows.map((r) => r.id);
  const missingCriteria = structure.criteriaIds.filter((id) => !actualIds.includes(id));
  const unknownCriteria = actualIds.filter((id) => !structure.criteriaIds.includes(id));
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
  for (const [id, tag] of Object.entries(structure.objectiveTags)) {
    const row = rows.find((r) => r.id === id);
    if (!row || row.annotation !== tag) {
      problems.push(`criterion ${id} must carry annotation (objetivo (${tag}))`);
    }
  }
  for (const id of structure.criteriaIds) {
    if (!values.get(`perCheck:${id}`)) problems.push(`missing perCheck:${id}`);
  }

  const prompts = values.get('takeawayPrompts');
  if (!Array.isArray(prompts) || prompts.length !== structure.takeawayPrompts) {
    problems.push(`takeaway prompts expected ${structure.takeawayPrompts}, got ${prompts ? prompts.length : 'none'}`);
  }

  parseVerdictPolicy(values.get('verdictHeader') ?? '');

  if (problems.length > 0) {
    throw new AdapterError('E_STRUCTURE_INVALID', 'source structure does not match contract', { problems });
  }
}

export function assertNoGabaritoLeak(serializedArtifact, files, allowlistedValues) {
  const haystack = serializedArtifact.replace(/\s+/g, ' ');
  const learnerBlob = LEARNER_VISIBLE_FILES.map((f) => toText(files.get(f) ?? Buffer.alloc(0)))
    .join('\n')
    .replace(/\s+/g, ' ');
  const hits = [];
  for (const marker of GABARITO_FACT_MARKERS) {
    if (learnerBlob.includes(marker.replace(/\s+/g, ' '))) continue; // também visível ao aprendiz: não é fato do gabarito
    if (haystack.includes(marker)) hits.push(`fact marker: ${marker}`);
  }
  const allowNormalized = allowlistedValues.map((v) => String(v).replace(/\s+/g, ' '));
  for (const gabaritoFile of GABARITO_FILES) {
    for (const line of linesOf(toText(files.get(gabaritoFile) ?? Buffer.alloc(0)))) {
      const normalized = line.replace(/\s+/g, ' ').trim();
      if (normalized.length < 14) continue;
      if (learnerBlob.includes(normalized)) continue; // já é learner-visible: não configura vazamento
      if (allowNormalized.some((a) => a.includes(normalized))) continue;
      if (haystack.includes(normalized)) hits.push(`gabarito line: ${normalized.slice(0, 80)}`);
    }
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
  const criteriaRows = values.get('criteriaRows');
  const perCheckByCriterion = {};
  for (const id of structure.criteriaIds) perCheckByCriterion[id] = values.get(`perCheck:${id}`);
  const texts = [];
  const collect = (value) => {
    texts.push(value);
    return value;
  };
  const template = parseTemplateFields(values.get('templateFields')).map((f) => ({
    name: f.name,
    hint: collect(f.hint)
  }));
  const identity = parseIdentity(values.get('metaBlock'));
  const anchorStrings = anchorTexts(contract.package.anchors);
  anchorStrings.forEach((text) => texts.push(text));
  const provenanceOnlyFiles = manifest
    .filter((entry) => GABARITO_FILES.includes(entry.path))
    .map((entry) => ({ path: entry.path, sha256: entry.sha256, bytes: entry.bytes, contentInLearnerPayload: false }));

  const artifact = {
    schema: ARTIFACT_SCHEMA,
    kind: 'guided-practice-projection',
    package: {
      id: contract.package.id,
      practiceId: contract.package.practiceId,
      version: contract.package.version,
      contentVersion: contract.package.contentVersion,
      contentVersionBasis: { ...contract.package.contentVersionBasis },
      anchors: { ...contract.package.anchors },
      family: 'sequencia-dev-guiada',
      unit: identity.unit,
      competencies: { primary: identity.competencyPrimary, support: identity.competencySupport },
      meta: collect(values.get('metaBlock'))
    },
    source: {
      pin: { ...contract.pin },
      manifest,
      learnerVisibleFiles: [...contract.sourceInterface.learnerVisibleFiles],
      provenanceOnlyFiles
    },
    learnerPath: {
      objective: collect(values.get('objective')),
      edgeCases: values.get('edgeCases').map((e) => ({ id: e.id, text: collect(e.text) })),
      edgeCasePolicy: collect(values.get('edgeCasePolicy')),
      template: {
        provenance: 'M3 §3.1, enunciado passo 4',
        fields: template.map((f) => ({ name: f.name, hint: f.hint }))
      },
      steps: values.get('steps').map((s) => ({ id: s.id, instruction: collect(s.text) })),
      receiptInstruction: collect(values.get('receiptInstruction')),
      feedback: {
        instruction: collect(values.get('feedbackInstruction')),
        rubricFile: 'rubrica-v1.md',
        criteriaCount: structure.criteriaIds.length,
        perCheckByCriterion
      },
      retry: {
        instruction: collect(values.get('retryInstruction')),
        failedCriteriaOnly: true
      },
      takeaway: {
        instruction: collect(values.get('takeawayInstruction')),
        prompts: values.get('takeawayPrompts').map((p) => collect(p))
      },
      inputs: {
        'pedido-original': {
          file: 'insumos/pedido-original.md',
          paragraphs: values.get('pedidoOriginal').map((p) => collect(p))
        },
        'amostra-fixa': { file: 'insumos/meus_commits.json', deterministic: true },
        'verificador-mecanico': { file: 'insumos/verifica_pedido.py' }
      },
      referenceMaterial: [{ role: 'worked-example', file: 'exemplo-trabalhado.md' }],
      guards: {
        afterAttempt: collect(values.get('guiaGuard')),
        scopeNote: collect(values.get('scopeNote'))
      }
    },
    rubricSkeleton: {
      file: 'rubrica-v1.md',
      criteria: criteriaRows.map((r) => (r.annotation ? { id: r.id, objectiveTag: r.annotation } : { id: r.id })),
      verdict: {
        allowed: parseVerdictPolicy(values.get('verdictHeader')),
        binary: false,
        partialRequiresJustification: true,
        aggregateScore: 'none',
        header: collect(values.get('verdictHeader')),
        rules: collect(values.get('verdictRules'))
      },
      perCheckByCriterion,
      withheldFromLearnerPath: [
        'guia-de-correcao/pedido-5-campos.md (pedido-modelo nos 5 campos)',
        'guia-de-correcao/solucao.md (saídas reais, vereditos de referência B1/B2, erros plausíveis)'
      ]
    },
    pedagogicalSeparation: {
      statement:
        'A projeção separa o material do corretor (guia-de-correcao: pedido-modelo, saídas reais e vereditos de referência B1/B2) do caminho visível ao aprendiz, preservando a guarda "consulte após a tentativa". É separação pedagógica — não garantia de segurança nem mecanismo anti-cópia: o material completo permanece no repositório.',
      allowlistReviewedBy:
        'Content Designer — ratificação da allowlist (prompts, feedback, perChecks e separação do guia-de-correcao) exigida na revisão nativa deste PR antes de liberar o consumidor',
      allowlistRoles: contract.extractions.filter((e) => e.reviewRequired === true).map((e) => e.role)
    },
    limitations: [
      'Projeção de fonte congelada (PR631 head 4cabf984): revisões futuras do pacote exigem contrato novo com hashes repinchados',
      'perChecks são as perguntas de verificação ratificadas na rubrica v1; não incluem os vereditos de referência B1/B2 (gabarito)',
      'Sem runtime, engine, player, catálogo ou binding: o consumo é responsabilidade do LEE sobre este artefato'
    ],
    generator: { tool: TOOL, toolVersion: TOOL_VERSION, deterministic: true }
  };
  const allowlistedValues = [...values.values()].flat();
  return { artifact, texts, allowlistedValues };
}

export function project({ sourceDir = DEFAULT_SOURCE_DIR, contractPath = DEFAULT_CONTRACT_PATH } = {}) {
  const contract = loadContract(contractPath);
  assertSourceInterface(contract);
  const { files, manifest } = readSourceFiles(sourceDir, contract);
  assertContentVersionInterface(contract, files);
  const values = runExtractions(files, contract);
  verifyExtractions(values, contract);
  assertAnchorsTraced(contract.package.anchors, values.get('anchorsMeta'));
  validateStructure(values, contract);
  const { artifact, texts, allowlistedValues } = buildArtifact(values, contract, manifest);
  const serialized = `${JSON.stringify(artifact, null, 2)}\n`;
  assertTraceableTexts(texts, files, allowlistedValues);
  assertNoGabaritoLeak(serialized, files, allowlistedValues);
  return { artifact, serialized, sha256: sha256Hex(serialized), bytes: Buffer.byteLength(serialized) };
}

function usage() {
  return [
    `usage: node curriculum/sequencia-dev-guiada/tools/${TOOL}.mjs [options]`,
    '',
    'options:',
    '  --source DIR     package source dir (default: ../pg-d02-pedido-estruturado)',
    '  --contract FILE  source contract fixture (default: fixtures/pg-d02-source-contract.json)',
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
