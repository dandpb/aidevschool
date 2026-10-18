#!/usr/bin/env node
// pg-d04-source-adapter — projeção determinística do caminho do aprendiz para a
// prática guiada pg-d04-contexto-e-spec (sequencia-dev-guiada, U09/D2+D3).
// Abordagem reutilizada dos adapters pg-c01 (AID-3583) e pg-d02 (AID-3593/
// AID-3617), adaptada ao formato próprio do pg-d04: três casos de borda
// B1/B2/B3 (decididos pelo SPEC do aprendiz), sem template de campos, e um
// pré-requisito declarado em PRÁTICA (pg-d02, U03) cuja lição-âncora é
// resolvida por cadeia do contrato-fonte pinado do pg-d02 (zero invenção: o
// arquivo irmão tools/fixtures/pg-d02-source-contract.json é hash-pinado
// dentro deste contrato e usado como blob de rastreio extra). A rúbrica
// ternária (met/partial/not_met), 6 passos e anotações **(objetivo (a/b/c))**
// seguem o padrão pg-d02.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TOOL = 'pg-d04-source-adapter';
const TOOL_VERSION = '1.0.0';
const ARTIFACT_SCHEMA = 'aidevschool/sequencia-dev-guiada/projection@1';
const CONTRACT_SCHEMA = 'aidevschool/sequencia-dev-guiada/source-contract@1';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_SOURCE_DIR = path.join(HERE, '..', 'pg-d04-contexto-e-spec');
const DEFAULT_CONTRACT_PATH = path.join(HERE, 'fixtures', 'pg-d04-source-contract.json');
const PACKAGE_RELATIVE_ROOT = 'curriculum/sequencia-dev-guiada/pg-d04-contexto-e-spec';
const PG_D02_CONTRACT_PATH = path.join(HERE, 'fixtures', 'pg-d02-source-contract.json');

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
// primeiros 12 hex. Hashes do guia-de-correcao e do MANIFEST.md (provenance
// only) NÃO entram nas entradas learner. A ordem canônica abaixo segue a
// ordem de uso no ciclo guiado do enunciado (pedido → inventário →
// verificador).
const LEARNER_VISIBLE_FILES = [
  'enunciado.md',
  'exemplo-trabalhado.md',
  'insumos/PEDIDO.md',
  'insumos/inventario-repo.txt',
  'insumos/verifica_contexto_spec.py',
  'rubrica-v1.md'
];
const GABARITO_FILES = [
  'MANIFEST.md',
  'guia-de-correcao/solucao.md',
  'guia-de-correcao/teste_verificador.py',
  'guia-de-correcao/solucao/CONTEXTO.md',
  'guia-de-correcao/solucao/PRD.md',
  'guia-de-correcao/solucao/SPEC.md',
  'guia-de-correcao/contraexemplos/01-contexto-ruidoso/CONTEXTO.md',
  'guia-de-correcao/contraexemplos/01-contexto-ruidoso/PRD.md',
  'guia-de-correcao/contraexemplos/01-contexto-ruidoso/SPEC.md',
  'guia-de-correcao/contraexemplos/02-prd-sem-limite/CONTEXTO.md',
  'guia-de-correcao/contraexemplos/02-prd-sem-limite/PRD.md',
  'guia-de-correcao/contraexemplos/02-prd-sem-limite/SPEC.md',
  'guia-de-correcao/contraexemplos/03-aceite-vago/CONTEXTO.md',
  'guia-de-correcao/contraexemplos/03-aceite-vago/PRD.md',
  'guia-de-correcao/contraexemplos/03-aceite-vago/SPEC.md',
  'guia-de-correcao/contraexemplos/04-spec-aberta/CONTEXTO.md',
  'guia-de-correcao/contraexemplos/04-spec-aberta/PRD.md',
  'guia-de-correcao/contraexemplos/04-spec-aberta/SPEC.md'
];
// Fatos que só existem no guia-de-correcao (verificados contra os arquivos
// learner-visible normalizados — nunca presentes no caminho do aprendiz):
// saídas reais dos quatro contraexemplos rejeitados pelo verificador.
const GABARITO_FACT_MARKERS = [
  'Fora de escopo com 1 item(ns)',
  'aceite vago (<4 palavras)',
  'categoria de exclusão do checklist M4 §4.2 citada como incluída'
];
const EDGE_CASE_IDS = ['B1', 'B2', 'B3'];

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

export function leadParagraph(text) {
  const paragraphs = paragraphsOf(text);
  const first = paragraphs.find((p) => p.startsWith('# '));
  const idx = paragraphs.indexOf(first);
  if (first === undefined || idx + 1 >= paragraphs.length) {
    throw new AdapterError('E_STRUCTURE_INVALID', 'lead paragraph after title not found');
  }
  return paragraphs[idx + 1];
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

// Prompts (a)/(b) escritos dentro de um mesmo parágrafo (padrão do pg-d04:
// "Responda em duas frases: (a) …; (b) …?"). O prompt (b) pode terminar em
// `.`, `?` ou `!` antes da frase de arquivo — o terminal é [.!?], não só
// ponto. Retorna cada prompt com seu rótulo, como subcadeia fiel do
// parágrafo reflowed.
export function labeledSubPrompts(text, heading, { lead, labels }) {
  const paragraph = reflow(paragraphInSection(text, heading, { index: 0 }));
  if (!paragraph.startsWith(lead)) {
    throw new AdapterError('E_STRUCTURE_INVALID', `takeaway paragraph does not start with: ${lead}`);
  }
  const esc = (label) => label.replace(/[()]/g, '\\$&');
  const pattern = new RegExp(`${esc(labels[0])}\\s*(.+?);\\s*${esc(labels[1])}\\s*(.+?)[.!?]\\s`);
  const match = paragraph.match(pattern);
  if (!match || match[1].length < 10 || match[2].length < 10) {
    throw new AdapterError('E_STRUCTURE_INVALID', `sub-prompts ${labels.join('/')} not found in ${heading}`);
  }
  return [`${labels[0]} ${match[1]}`, `${labels[1]} ${match[2]}`];
}

// Itens numerados de uma seção, com as continuações de linha unidas — mas
// descartando regiões cercadas por ``` (nenhum passo do pg-d04 traz fence,
// mas a guarda permanece por paridade com o adapter pg-d02).
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
// backticks NÃO separam células.
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

// Parágrafos do pedido (insumo que o aprendiz disseca), ignorando o título
// H1 e notas em blockquote.
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
    case 'bulletByPrefix':
      return applyReflow(bulletByPrefix(fileText, selector.section, selector.prefix), reflowEnabled);
    case 'leadParagraph':
      return applyReflow(leadParagraph(fileText), reflowEnabled);
    case 'numberedSteps':
      return numberedSteps(fileText, selector).map((s) => ({ id: s.id, text: reflow(s.text) }));
    case 'labeledSubPrompts':
      return labeledSubPrompts(fileText, selector.section, selector).map((p) => reflow(p));
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
    throw new AdapterError('E_CONTENT_VERSION_INVALID', 'contentVersionBasis.excludes must equal the provenance-only files (their hashes never enter learner entries)');
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
    throw new AdapterError('E_SOURCE_INTERFACE_INVALID', 'sourceInterface.provenanceOnlyFiles must equal the provenance-only allowlist (MANIFEST.md + guia-de-correcao)', {
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

// Cadeia de resolução da lição-âncora: o pg-d04 declara como pré-requisito a
// PRÁTICA pg-d02 (U03); o catálogo (mission_catalog_guided_practice.
// _contract_anchor_lesson_id) exige prerequisiteLesson com id de lição. A
// lição l16 é a lição-âncora de pré-req ratificada no contrato-fonte do
// pg-d02 — este adapter verifica que o arquivo irmão pinado por sha256
// dentro deste contrato continua carregando exatamente essa âncora. Valor
// resolvido por cadeia de contratos, não inventado aqui.
export function loadPrerequisiteChain(contract) {
  const resolved = contract.package?.anchors?.prerequisiteLesson?.resolvedThrough;
  if (!resolved || typeof resolved !== 'object') {
    throw new AdapterError('E_ANCHOR_UNTRACED', 'contract.package.anchors.prerequisiteLesson.resolvedThrough is required (the declared prerequisite is a practice, not a lesson)');
  }
  let chainText;
  try {
    // resolved.source é relativo à raiz da família (curriculum/sequencia-dev-guiada/)
    chainText = readFileSync(path.join(HERE, '..', ...resolved.source.split('/')), 'utf8');
  } catch (err) {
    throw new AdapterError('E_ANCHOR_UNTRACED', `prerequisite chain source unreadable: ${resolved.source}: ${err.message}`);
  }
  if (sha256Hex(chainText) !== resolved.sourceSha256) {
    throw new AdapterError('E_ANCHOR_UNTRACED', 'prerequisite chain source sha256 diverged from the pinned bytes (PR-pg-d02 contract moved)', {
      source: resolved.source,
      expected: resolved.sourceSha256,
      actual: sha256Hex(chainText)
    });
  }
  const chain = JSON.parse(chainText);
  if (chain.package?.id !== resolved.sourcePackageId) {
    throw new AdapterError('E_ANCHOR_UNTRACED', `prerequisite chain cites package ${resolved.sourcePackageId} but the pinned contract declares ${chain.package?.id}`);
  }
  const chainLesson = chain.package?.anchors?.prerequisiteLesson;
  const declared = resolved.sourcePrerequisiteLesson;
  if (
    !chainLesson ||
    chainLesson.id !== declared.id ||
    chainLesson.unit !== declared.unit ||
    chainLesson.label !== declared.label
  ) {
    throw new AdapterError('E_ANCHOR_UNTRACED', 'pinned pg-d02 contract no longer carries the prerequisiteLesson this contract resolves through', {
      expected: declared,
      actual: chainLesson ?? null
    });
  }
  if (contract.package.anchors.prerequisiteLesson.id !== declared.id) {
    throw new AdapterError('E_ANCHOR_UNTRACED', 'contract.package.anchors.prerequisiteLesson.id must equal the chain-resolved lesson id', {
      declared: contract.package.anchors.prerequisiteLesson.id,
      resolved: declared.id
    });
  }
  return { chainText, chainLesson };
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

// Valores de CONTEÚDO das âncoras: tudo exceto o bloco `resolvedThrough` —
// este é maquinaria da cadeia de resolução, verificada byte a byte por
// loadPrerequisiteChain (sha256 do contrato-fonte do pg-d02 + âncora
// declarada), e não conteúdo de âncora sujeito a rastreio textual.
export function contentAnchorTexts(anchors) {
  const shallow = structuredClone(anchors);
  if (shallow.prerequisiteLesson) delete shallow.prerequisiteLesson.resolvedThrough;
  return anchorTexts(shallow);
}

export function assertAnchorsTraced(anchors, anchorsMeta, extraTraceBlobs = []) {
  if (!anchors || typeof anchors !== 'object') {
    throw new AdapterError('E_STRUCTURE_INVALID', 'contract.package.anchors is required (structured anchors, F2)');
  }
  if (typeof anchorsMeta !== 'string' || anchorsMeta.length === 0) {
    throw new AdapterError('E_STRUCTURE_INVALID', 'anchorsMeta extraction is required to trace package.anchors');
  }
  const blobs = [anchorsMeta, ...extraTraceBlobs];
  const offenders = contentAnchorTexts(anchors).filter((t) => {
    if (t.length === 0) return false;
    return !blobs.some((blob) => blob.includes(t) || reflow(blob).includes(reflow(t)));
  });
  if (offenders.length > 0) {
    throw new AdapterError('E_ANCHOR_UNTRACED', 'anchor value not traced to the pinned anchorsMeta extraction or the pinned prerequisite chain (zero invention)', {
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
    throw new AdapterError('E_STRUCTURE_INVALID', 'binary pg-c01 verdict policy must not be transported into pg-d04');
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
    const { missing, unknown } = diffIds(edgeCases.map((e) => e.id), EDGE_CASE_IDS);
    if (missing.length > 0) problems.push(`edge cases missing: ${missing.join(', ')}`);
    if (unknown.length > 0) problems.push(`edge cases unknown: ${unknown.join(', ')}`);
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

export function assertTraceableTexts(texts, files, allowlistedValues, extraTraceBlobs = []) {
  const rawBlob = LEARNER_VISIBLE_FILES.map((f) => toText(files.get(f))).join('\n');
  const flatBlob = rawBlob.replace(/\s+/g, ' ');
  const allowSet = new Set(allowlistedValues.map((v) => String(v)));
  const extraBlobs = extraTraceBlobs.map((b) => ({ raw: b, flat: b.replace(/\s+/g, ' ') }));
  const offenders = [];
  for (const text of texts) {
    const value = String(text);
    if (value.length === 0) continue;
    if (rawBlob.includes(value)) continue;
    if (flatBlob.includes(reflow(value))) continue;
    if (allowSet.has(value)) continue;
    if (extraBlobs.some((b) => b.raw.includes(value) || b.flat.includes(reflow(value)))) continue;
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
  const identity = parseIdentity(values.get('metaBlock'));
  const anchorStrings = contentAnchorTexts(contract.package.anchors);
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
        pedido: {
          file: 'insumos/PEDIDO.md',
          paragraphs: values.get('pedidoOriginal').map((p) => collect(p))
        },
        'inventario-repo': { file: 'insumos/inventario-repo.txt', deterministic: true },
        'verificador-mecanico': { file: 'insumos/verifica_contexto_spec.py' }
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
        'guia-de-correcao/solucao/ (CONTEXTO/PRD/SPEC modelo)',
        'guia-de-correcao/contraexemplos/ (4 negativos rejeitados pelo verificador, um por família)',
        'guia-de-correcao/solucao.md + teste_verificador.py (saídas reais e suíte do verificador)'
      ]
    },
    pedagogicalSeparation: {
      statement:
        'A projeção separa o material do corretor (guia-de-correcao: documentos-modelo, contraexemplos rejeitados e saídas reais) do caminho visível ao aprendiz, preservando a guarda "consulte após a tentativa". É separação pedagógica — não garantia de segurança nem mecanismo anti-cópia: o material completo permanece no repositório.',
      allowlistReviewedBy:
        'Content Designer — ratificação da allowlist (prompts, feedback, perChecks e separação do guia-de-correcao) exigida na revisão nativa deste PR antes de liberar o consumidor',
      allowlistRoles: contract.extractions.filter((e) => e.reviewRequired === true).map((e) => e.role)
    },
    limitations: [
      'Projeção de fonte congelada (PR643 head 32888d9f): revisões futuras do pacote exigem contrato novo com hashes repinchados',
      'perChecks são as perguntas de verificação ratificadas na rubrica v1; não incluem os documentos-modelo nem os contraexemplos (gabarito)',
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
  const { chainText } = loadPrerequisiteChain(contract);
  const { files, manifest } = readSourceFiles(sourceDir, contract);
  assertContentVersionInterface(contract, files);
  const values = runExtractions(files, contract);
  verifyExtractions(values, contract);
  assertAnchorsTraced(contract.package.anchors, values.get('anchorsMeta'), [chainText]);
  validateStructure(values, contract);
  const { artifact, texts, allowlistedValues } = buildArtifact(values, contract, manifest);
  const serialized = `${JSON.stringify(artifact, null, 2)}\n`;
  assertTraceableTexts(texts, files, allowlistedValues, [chainText]);
  assertNoGabaritoLeak(serialized, files, allowlistedValues);
  return { artifact, serialized, sha256: sha256Hex(serialized), bytes: Buffer.byteLength(serialized) };
}

function usage() {
  return [
    `usage: node curriculum/sequencia-dev-guiada/tools/${TOOL}.mjs [options]`,
    '',
    'options:',
    '  --source DIR     package source dir (default: ../pg-d04-contexto-e-spec)',
    '  --contract FILE  source contract fixture (default: fixtures/pg-d04-source-contract.json)',
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
