import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, cpSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..', '..', '..');
const ADAPTER = path.join(HERE, 'pg-d04-source-adapter.mjs');
const CONTRACT = path.join(HERE, 'fixtures', 'pg-d04-source-contract.json');
const PG_D02_CONTRACT = path.join(HERE, 'fixtures', 'pg-d02-source-contract.json');
const PACKAGE_DIR = path.join(HERE, '..', 'pg-d04-contexto-e-spec');
const PG_D01_DIR = path.join(HERE, '..', 'pg-d01-debug-reproduza');

const CANONICAL_LEARNER_FILES = [
  'enunciado.md',
  'exemplo-trabalhado.md',
  'insumos/PEDIDO.md',
  'insumos/inventario-repo.txt',
  'insumos/verifica_contexto_spec.py',
  'rubrica-v1.md'
];
const GABARITO_PATHS = [
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
const PG_D01_LEARNER_FILES = [
  'enunciado.md',
  'exemplo-trabalhado.md',
  'insumos/bugreport.md',
  'insumos/REGRA.md',
  'insumos/fixture/notas.py',
  'insumos/fixture/testes.py',
  'rubrica-v1.md'
];
// Golden calculado com o algoritmo exato de compute_content_version do PR628
// (learner/substrate/mission_catalog_guided_practice.py @ e376d04f) sobre a
// árvore pg-d01 aceita — prova de paridade da fórmula deste adapter.
const PG_D01_CONTENT_VERSION = 'pg-d01@55882460a2bf';
const CANONICAL_CONTENT_VERSION = 'pg-d04@730ac9dc41c2';
const CANONICAL_SHA256 = '3edfb5cce50cdfdb975e8dca3bc8034691b22d48253db5ea009464ad32ddf793';

const A = await import(`file://${ADAPTER}`);
const contract = A.loadContract(CONTRACT);
const CRITERIA = [
  'c1-contexto-duas-tabelas',
  'c2-contexto-resolve-sem-ruido',
  'c3-limite-30min',
  'c4-fora-de-escopo-real',
  'c5-aceite-verificavel',
  'c6-spec-fecha-decisoes',
  'c7-recibo-honesto'
];
const RESOLVED_THROUGH_SHA = contract.package.anchors.prerequisiteLesson.resolvedThrough.sourceSha256;

function verifiedFiles() {
  return A.readSourceFiles(PACKAGE_DIR, contract).files;
}

function projectFrom(dir = PACKAGE_DIR, contractPath = CONTRACT) {
  return A.project({ sourceDir: dir, contractPath });
}

function contractWith(mutate) {
  const doctored = structuredClone(contract);
  mutate(doctored);
  const dir = mkdtempSync(path.join(tmpdir(), 'pg-d04-cv-'));
  const file = path.join(dir, 'contract.json');
  writeFileSync(file, JSON.stringify(doctored));
  return file;
}

function mustThrow(code, fn) {
  try {
    fn();
  } catch (err) {
    assert.equal(err.code, code, `expected ${code}, got ${err.code}: ${err.message}`);
    return err;
  }
  assert.fail(`expected AdapterError ${code}, nothing thrown`);
}

test('manifest pins every source file byte a byte (frozen PR643 head preserved)', () => {
  const { files, manifest } = A.readSourceFiles(PACKAGE_DIR, contract);
  assert.equal(manifest.length, 24);
  for (const pinned of contract.files) {
    const buffer = files.get(pinned.path);
    assert.ok(buffer, `missing pinned file ${pinned.path}`);
    assert.equal(A.sha256Hex(buffer), pinned.sha256);
    assert.equal(buffer.length, pinned.bytes);
  }
  const { artifact } = projectFrom();
  assert.equal(artifact.source.pin.pullRequest, 643);
  assert.equal(artifact.source.pin.head, '32888d9f03006f3dbcdaa57811b29c54a2c09146');
  assert.equal(artifact.source.pin.merge, 'a68c0f237cdf0c6f661817fb50e745d3f0544595');
  assert.equal(artifact.source.pin.base.pullRequest, 620);
  assert.equal(artifact.source.pin.base.head, 'e01d9d42b99434c10d8f155cde0cbbc57b25cf61');
  assert.deepEqual(
    artifact.source.manifest.map((m) => m.path).sort(),
    contract.files.map((f) => f.path).sort()
  );
});

test('golden projection: identity from source, 6 steps, B1/B2/B3, 7 criteria, ternary verdict, 2 takeaway prompts', () => {
  const { artifact } = projectFrom();
  assert.equal(artifact.schema, 'aidevschool/sequencia-dev-guiada/projection@1');
  assert.equal(artifact.package.id, 'pg-d04-contexto-e-spec');
  assert.equal(artifact.package.version, 'rubrica-v1');
  assert.equal(artifact.package.unit, 'U09');
  assert.equal(artifact.package.competencies.primary, 'D2');
  assert.deepEqual(artifact.package.competencies.support, ['D3']);

  const lp = artifact.learnerPath;
  assert.deepEqual(lp.steps.map((s) => s.id), ['1', '2', '3', '4', '5', '6']);
  for (const step of lp.steps) assert.ok(step.instruction.length > 40, `step ${step.id} too short`);
  assert.ok(lp.steps[0].instruction.includes('Disseque o pedido'));
  assert.ok(lp.steps[5].instruction.includes('Auto-check mecânico'));

  assert.deepEqual(lp.edgeCases.map((e) => e.id), ['B1', 'B2', 'B3']);
  assert.ok(lp.edgeCases[0].text.startsWith('ciclo em `depends_on`'));
  assert.ok(lp.edgeCasePolicy.includes('Um SPEC que não decide'));

  assert.ok(lp.objective.includes('**(a)**'));
  assert.ok(lp.objective.includes('**(b)**'));
  assert.ok(lp.objective.includes('**(c)**'));

  assert.deepEqual(
    artifact.rubricSkeleton.criteria.map((c) => c.id),
    CRITERIA
  );
  const tags = Object.fromEntries(
    artifact.rubricSkeleton.criteria.filter((c) => c.objectiveTag).map((c) => [c.id, c.objectiveTag])
  );
  assert.deepEqual(tags, {
    'c1-contexto-duas-tabelas': 'a',
    'c2-contexto-resolve-sem-ruido': 'a',
    'c3-limite-30min': 'b',
    'c4-fora-de-escopo-real': 'b',
    'c5-aceite-verificavel': 'c',
    'c6-spec-fecha-decisoes': 'c'
  });

  assert.deepEqual(artifact.rubricSkeleton.verdict.allowed, ['met', 'partial', 'not_met']);
  assert.equal(artifact.rubricSkeleton.verdict.binary, false);
  assert.equal(artifact.rubricSkeleton.verdict.aggregateScore, 'none');
  assert.equal(artifact.rubricSkeleton.verdict.partialRequiresJustification, true);
  assert.ok(artifact.rubricSkeleton.verdict.rules.includes('`not_met` sem retry'));

  assert.equal(lp.takeaway.prompts.length, 2);
  assert.match(lp.takeaway.prompts[0], /^\(a\)/);
  assert.match(lp.takeaway.prompts[1], /^\(b\)/);
  // O prompt (b) termina em interrogação — o terminal [.!?] é obrigatório:
  assert.ok(lp.takeaway.prompts[1].includes('exclusão de uma view gerada'));
  assert.deepEqual(Object.keys(artifact.rubricSkeleton.perCheckByCriterion), CRITERIA);
  assert.equal(lp.feedback.criteriaCount, 7);
  assert.equal(lp.retry.failedCriteriaOnly, true);
});

test('fidelity: perCheck commands, retry criterion id, guards and learner inputs arrive intact', () => {
  const { artifact } = projectFrom();
  const perCheck = artifact.rubricSkeleton.perCheckByCriterion;
  assert.ok(
    perCheck['c1-contexto-duas-tabelas'].includes('python3 insumos/verifica_contexto_spec.py'),
    'c1 perCheck must keep the verifier command intact'
  );
  assert.ok(perCheck['c3-limite-30min'].includes('30 min'));
  assert.ok(perCheck['c2-contexto-resolve-sem-ruido'].includes('fora do inventário'));
  // ID anotado no texto do retry chega inteiro (c5-aceite-verificavel):
  assert.ok(artifact.learnerPath.retry.instruction.includes('`c5-aceite-verificavel`'));
  // Guardas preservadas:
  assert.ok(artifact.learnerPath.guards.afterAttempt.includes('consulte **após** a tentativa'));
  assert.ok(artifact.learnerPath.guards.scopeNote.includes('avalia os **documentos**'));
  // O pedido original (insumo do aprendiz) chega por inteiro, em parágrafos:
  const paragraphs = artifact.learnerPath.inputs.pedido.paragraphs;
  assert.ok(paragraphs.length >= 3);
  assert.ok(paragraphs.some((p) => p.includes('**De:** Bia (líder técnica)')));
  assert.ok(paragraphs.some((p) => p.includes('ordenar o plano por `depends_on`')));
  assert.ok(paragraphs.some((p) => p.includes('não pode quebrar nada')));
  // A nota em blockquote (fixture fictícia) é preservada no ARQUIVO, mas o
  // verificador é projetado como input determinístico à parte:
  assert.equal(artifact.learnerPath.inputs['inventario-repo'].file, 'insumos/inventario-repo.txt');
  assert.equal(artifact.learnerPath.inputs['verificador-mecanico'].file, 'insumos/verifica_contexto_spec.py');
});

test('determinism: repeated projection is byte-identical, in-process and via CLI', () => {
  const first = projectFrom();
  const second = projectFrom();
  assert.equal(first.sha256, second.sha256);
  assert.equal(first.serialized, second.serialized);

  const cliOut1 = execFileSync(process.execPath, [ADAPTER, '--quiet'], { cwd: ROOT, encoding: 'utf8' });
  const cliOut2 = execFileSync(process.execPath, [ADAPTER, '--quiet'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(cliOut1, cliOut2);
  assert.equal(A.sha256Hex(cliOut1), first.sha256);
});

test('determinism negative control: altered content cannot reproduce the canonical artifact', () => {
  const { artifact } = projectFrom();
  const doctored = structuredClone(artifact);
  doctored.learnerPath.steps[0].instruction = 'passo alterado';
  assert.notEqual(A.sha256Hex(`${JSON.stringify(doctored, null, 2)}\n`), projectFrom().sha256);
});

test('negative: a single altered source byte fails with E_SOURCE_HASH_MISMATCH (source drift)', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'pg-d04-tamper-'));
  cpSync(PACKAGE_DIR, dir, { recursive: true });
  const target = path.join(dir, 'insumos', 'PEDIDO.md');
  const original = readFileSync(target, 'utf8');
  writeFileSync(target, original.replace('e-mail da Bia', 'e-mail da Bia '));
  const err = mustThrow('E_SOURCE_HASH_MISMATCH', () => projectFrom(dir));
  assert.equal(err.details.path, 'insumos/PEDIDO.md');
});

test('negative: deleted pinned file fails with E_CONTRACT_MISSING_FILE', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'pg-d04-nofile-'));
  cpSync(PACKAGE_DIR, dir, { recursive: true });
  rmSync(path.join(dir, 'rubrica-v1.md'));
  mustThrow('E_CONTRACT_MISSING_FILE', () => projectFrom(dir));
});

test('negative: rubrica without a required criterion fails with E_CRITERION_MISSING', () => {
  const files = verifiedFiles();
  const doctored = files
    .get('rubrica-v1.md')
    .toString('utf8')
    .split('\n')
    .filter((line) => !line.startsWith('| c6-spec-fecha-decisoes'))
    .join('\n');
  files.set('rubrica-v1.md', Buffer.from(doctored, 'utf8'));
  const stubContract = {
    ...contract,
    extractions: contract.extractions.filter((e) => e.role !== 'perCheck:c6-spec-fecha-decisoes')
  };
  const values = A.runExtractions(files, stubContract);
  const err = mustThrow('E_CRITERION_MISSING', () => A.validateStructure(values, stubContract));
  assert.deepEqual(err.details.missing, ['c6-spec-fecha-decisoes']);
});

test('negative: rubrica with an unknown criterion id fails with E_CRITERION_UNKNOWN', () => {
  const files = verifiedFiles();
  const rubrica = files.get('rubrica-v1.md').toString('utf8');
  const extraRow = '| c9-estranho | critério fora do contrato | perCheck qualquer |\n';
  const doctored = rubrica.replace('\n## Notas de aplicação', `\n${extraRow}\n## Notas de aplicação`);
  files.set('rubrica-v1.md', Buffer.from(doctored, 'utf8'));
  const values = A.runExtractions(files, contract);
  const err = mustThrow('E_CRITERION_UNKNOWN', () => A.validateStructure(values, contract));
  assert.deepEqual(err.details.unknown, ['c9-estranho']);
});

test('negative: malformed source (dropped edge case, missing section) fails with E_STRUCTURE_INVALID', () => {
  const files = verifiedFiles();
  const doctored = files
    .get('enunciado.md')
    .toString('utf8')
    .split('\n')
    .filter((line) => !line.includes('**B3**'))
    .join('\n');
  files.set('enunciado.md', Buffer.from(doctored, 'utf8'));
  let values = A.runExtractions(files, contract);
  mustThrow('E_STRUCTURE_INVALID', () => A.validateStructure(values, contract));

  const files2 = verifiedFiles();
  files2.set(
    'enunciado.md',
    files2.get('enunciado.md').toString('utf8').replace('## Limites explícitos', '## Limites explícitos sumiram')
  );
  mustThrow('E_STRUCTURE_INVALID', () => A.runExtractions(files2, contract));
});

test('negative: binary pg-c01 verdict policy transported into the rubrica is rejected', () => {
  const files = verifiedFiles();
  const doctored = files
    .get('rubrica-v1.md')
    .toString('utf8')
    .replace('`not_met`', '`insufficient`');
  files.set('rubrica-v1.md', Buffer.from(doctored, 'utf8'));
  const values = A.runExtractions(files, contract);
  mustThrow('E_STRUCTURE_INVALID', () => A.validateStructure(values, contract));
});

test('negative: edited allowlisted text fails extraction review with E_EXTRACTION_HASH_MISMATCH', () => {
  const files = verifiedFiles();
  const doctored = files
    .get('rubrica-v1.md')
    .toString('utf8')
    .replace('nãoreporta', 'nunca reporta');
  files.set('rubrica-v1.md', Buffer.from(doctored, 'utf8'));
  const values = A.runExtractions(files, contract);
  mustThrow('E_EXTRACTION_HASH_MISMATCH', () => A.verifyExtractions(values, contract));
});

test('leak check: markers are gabarito-only facts and none reach the learner projection', () => {
  const files = verifiedFiles();
  const learnerBlob = CANONICAL_LEARNER_FILES.map((f) => files.get(f).toString('utf8'))
    .join('\n')
    .replace(/\s+/g, ' ');
  const gabaritoBlob = GABARITO_PATHS.map((f) => files.get(f).toString('utf8'))
    .join('\n')
    .replace(/\s+/g, ' ');
  const markers = [
    'Fora de escopo com 1 item(ns)',
    'aceite vago (<4 palavras)',
    'categoria de exclusão do checklist M4 §4.2 citada como incluída'
  ];
  for (const marker of markers) {
    assert.ok(gabaritoBlob.includes(marker), `marker must exist in guia-de-correcao: ${marker}`);
    assert.ok(!learnerBlob.includes(marker), `marker must NOT be learner-visible (else it proves nothing): ${marker}`);
  }

  const { serialized } = projectFrom();
  const flat = serialized.replace(/\s+/g, ' ');
  for (const marker of markers) {
    assert.ok(!flat.includes(marker), `leaked marker: ${marker}`);
  }
  const values = A.runExtractions(files, contract);
  A.assertNoGabaritoLeak(serialized, files, [...values.values()].flat());
});

test('leak check negative control: detector fires on tampered projection', () => {
  const files = verifiedFiles();
  const values = A.runExtractions(files, contract);
  const allow = [...values.values()].flat();
  const tampered = `${projectFrom().serialized.slice(0, -2)}, "leak": "Fora de escopo com 1 item(ns)"}\n`;
  mustThrow('E_GABARITO_LEAK', () => A.assertNoGabaritoLeak(tampered, files, allow));
});

test('traceability: every projected text is learner-visible source, reviewed allowlist or the pinned chain', () => {
  const files = verifiedFiles();
  const values = A.runExtractions(files, contract);
  const { artifact } = projectFrom();
  const { chainText } = A.loadPrerequisiteChain(contract);
  A.assertTraceableTexts(
    [artifact.learnerPath.objective, ...[...values.values()].flat()],
    files,
    [...[...values.values()].flat()],
    [chainText]
  );
  mustThrow('E_UNTRACED_CONTENT', () =>
    A.assertTraceableTexts(['texto que não existe em fonte nenhuma do pacote'], files, [], [chainText])
  );
});

test('contract guard: wrong schema is rejected', () => {
  const bad = mkdtempSync(path.join(tmpdir(), 'pg-d04-contract-'));
  const badPath = path.join(bad, 'bad.json');
  writeFileSync(badPath, JSON.stringify({ ...contract, schema: 'outra-coisa@9' }));
  mustThrow('E_CONTRACT_INVALID', () => A.loadContract(badPath));
});

test('CLI determinism: --check and --out agree with in-process projection', () => {
  const tmp = mkdtempSync(path.join(tmpdir(), 'pg-d04-cli-'));
  const outFile = path.join(tmp, 'projection.json');
  const check = spawnSync(process.execPath, [ADAPTER, '--check'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(check.status, 0, `--check exited nonzero: ${check.stderr}`);
  execFileSync(process.execPath, [ADAPTER, '--out', outFile, '--quiet'], { cwd: ROOT });
  const written = readFileSync(outFile, 'utf8');
  const inProcess = projectFrom();
  assert.equal(written, inProcess.serialized);
  assert.match(check.stderr.trim(), new RegExp(`check ok sha256=${inProcess.sha256}`));
});

test('F1 parity: contentVersion = practiceId@sha256-12 over the frozen learner allowlist (PR628/PR625 contract)', () => {
  const { artifact } = projectFrom();
  assert.equal(artifact.package.practiceId, 'pg-d04');
  assert.equal(artifact.package.contentVersion, CANONICAL_CONTENT_VERSION);
  assert.match(artifact.package.contentVersion, /^pg-d04@[0-9a-f]{12}$/);
  const files = verifiedFiles();
  assert.equal(A.computeContentVersion(files, 'pg-d04'), artifact.package.contentVersion);
  assert.equal(A.parsePracticeId(files.get('enunciado.md').toString('utf8')), 'pg-d04');
  // eixos independentes preservados: contentVersion ≠ package.version ≠ schema
  assert.equal(artifact.package.version, 'rubrica-v1');
  assert.equal(artifact.schema, 'aidevschool/sequencia-dev-guiada/projection@1');
});

test('F1 parity cross-check: the same formula reproduces the accepted pg-d01 contentVersion (byte-compatible with PR628 compute_content_version)', () => {
  const files = new Map();
  for (const rel of PG_D01_LEARNER_FILES) {
    files.set(rel, readFileSync(path.join(PG_D01_DIR, rel)));
  }
  assert.equal(
    A.computeContentVersion(files, 'pg-d01', {
      packageRoot: 'curriculum/sequencia-dev-guiada/pg-d01-debug-reproduza',
      allowlist: PG_D01_LEARNER_FILES
    }),
    PG_D01_CONTENT_VERSION
  );
});

test('F1: guia-de-correcao/MANIFEST hashes never enter learner entries; the canonical order is load-bearing', () => {
  const files = verifiedFiles();
  const before = A.computeContentVersion(files, 'pg-d04');
  const tampered = new Map(files);
  tampered.set('MANIFEST.md', Buffer.from(`${files.get('MANIFEST.md').toString('utf8')}\n# editado`));
  assert.equal(A.computeContentVersion(tampered, 'pg-d04'), before);
  const reordered = A.computeContentVersion(files, 'pg-d04', {
    allowlist: [
      'enunciado.md',
      'exemplo-trabalhado.md',
      'rubrica-v1.md',
      'insumos/PEDIDO.md',
      'insumos/inventario-repo.txt',
      'insumos/verifica_contexto_spec.py'
    ]
  });
  assert.notEqual(reordered, before);
});

test('F1 negatives: date.ordinal-style value, wrong digest, missing field and basis without parity are all rejected', () => {
  mustThrow('E_CONTENT_VERSION_INVALID', () =>
    projectFrom(PACKAGE_DIR, contractWith((c) => { c.package.contentVersion = '2026-10-17.1'; }))
  );
  mustThrow('E_CONTENT_VERSION_MISMATCH', () =>
    projectFrom(PACKAGE_DIR, contractWith((c) => { c.package.contentVersion = 'pg-d04@deadbeefdead'; }))
  );
  mustThrow('E_CONTENT_VERSION_INVALID', () =>
    projectFrom(PACKAGE_DIR, contractWith((c) => { delete c.package.contentVersion; }))
  );
  mustThrow('E_CONTENT_VERSION_INVALID', () =>
    projectFrom(PACKAGE_DIR, contractWith((c) => { c.package.contentVersionBasis.allowlist = [...CANONICAL_LEARNER_FILES].reverse(); }))
  );
  mustThrow('E_CONTENT_VERSION_INVALID', () =>
    projectFrom(PACKAGE_DIR, contractWith((c) => { c.package.contentVersionBasis.parity = []; }))
  );
});

test('F2 chain: the pg-d02 prerequisite lesson resolves through hash-pinned sibling contract bytes', () => {
  const { chainText, chainLesson } = A.loadPrerequisiteChain(contract);
  assert.equal(chainLesson.id, 'l16');
  assert.equal(chainLesson.unit, 'U02');
  assert.equal(chainLesson.label, 'pedido de código com contexto');
  assert.equal(A.sha256Hex(chainText), RESOLVED_THROUGH_SHA);
  assert.equal(JSON.parse(chainText).package.id, 'pg-d02-pedido-estruturado');
  // o id declarado no contrato do pg-d04 é exatamente o resolvido pela cadeia
  assert.equal(contract.package.anchors.prerequisiteLesson.id, chainLesson.id);
});

test('F2 chain negatives: moved sibling contract or doctored chain are rejected with E_ANCHOR_UNTRACED', () => {
  // (a) sha pin divergindo dos bytes reais do contrato pg-d02:
  const moved = contractWith((c) => {
    c.package.anchors.prerequisiteLesson.resolvedThrough.sourceSha256 = '0'.repeat(64);
  });
  mustThrow('E_ANCHOR_UNTRACED', () => A.loadPrerequisiteChain(A.loadContract(moved)));

  // (b) contrato pg-d02 citando outra lição (simulação de drift do irmão):
  const dir = mkdtempSync(path.join(tmpdir(), 'pg-d04-chain-'));
  const sibling = JSON.parse(readFileSync(PG_D02_CONTRACT, 'utf8'));
  sibling.package.anchors.prerequisiteLesson.id = 'l17';
  const movedSibling = path.join(dir, 'pg-d02-source-contract.json');
  writeFileSync(movedSibling, JSON.stringify(sibling, null, 2));
  const doctored = structuredClone(contract);
  doctored.package.anchors.prerequisiteLesson.resolvedThrough.sourceSha256 = A.sha256Hex(
    readFileSync(movedSibling)
  );
  const doctoredPath = path.join(dir, 'pg-d04-source-contract.json');
  writeFileSync(doctoredPath, JSON.stringify(doctored));
  mustThrow('E_ANCHOR_UNTRACED', () => A.loadPrerequisiteChain(A.loadContract(doctoredPath)));

  // (c) resolvedThrough ausente:
  const absent = A.loadContract(contractWith((c) => {
    delete c.package.anchors.prerequisiteLesson.resolvedThrough;
  }));
  mustThrow('E_ANCHOR_UNTRACED', () => A.loadPrerequisiteChain(absent));
});

test('F2 anchors: structured block exactly as declared, every value traced to enunciado or the pinned chain', () => {
  const { artifact } = projectFrom();
  assert.deepEqual(artifact.package.anchors, {
    unit: 'U09',
    unitRef: 'SEQUENCIA.md §2',
    competencyPrimary: 'D2',
    competencySupport: ['D3'],
    course: {
      course: 'curso-simples',
      modules: 'M4 (Context Engineering §4.1–4.4) e M5 (PRD e Specs §5.1–5.4)',
      entry: 'docs/curso-simples/index.html',
      blob: '2bcf99fbd831'
    },
    workedExample: {
      dir: 'docs/curso-simples/workflow-exemplo/',
      files: { 'CONTEXTO.md': '9fbc21127ea2', 'PRD.md': '2b4deb2764fe', 'SPEC.md': '1d5c696c3bb2' }
    },
    planGates: {
      dir: 'docs/curso/workflow_lab/fixtures/',
      files: { '05-cycle-05.json': 'dee137438663', '06-cycle-06.json': '90df4afde0c3' }
    },
    prerequisitePractice: { id: 'pg-d02', unit: 'U03', label: 'pedido de 5 campos', equivalence: 'ou equivalente' },
    prerequisiteLesson: {
      id: 'l16',
      unit: 'U02',
      label: 'pedido de código com contexto',
      equivalence: 'ou equivalente',
      resolvedThrough: contract.package.anchors.prerequisiteLesson.resolvedThrough
    }
  });
  const { chainText } = A.loadPrerequisiteChain(contract);
  const anchorsMeta = A.runExtractions(verifiedFiles(), contract).get('anchorsMeta');
  A.assertAnchorsTraced(artifact.package.anchors, anchorsMeta, [chainText]);
  // rastreabilidade global: valores de conteúdo das âncoras passam pelo
  // guardião de textos; o bloco resolvedThrough é verificado byte a byte
  // pela cadeia (não é conteúdo de âncora sujeito a rastreio textual)
  A.assertTraceableTexts(A.contentAnchorTexts(artifact.package.anchors), verifiedFiles(), [], [chainText]);
  const declared = contract.package.anchors.prerequisiteLesson.resolvedThrough.sourcePrerequisiteLesson;
  assert.deepEqual(declared, { id: 'l16', unit: 'U02', label: 'pedido de código com contexto' });
});

test('F2 negatives: anchorsMeta drift and invented anchor values are rejected', () => {
  const files = verifiedFiles();
  const doctored = new Map(files);
  doctored.set(
    'enunciado.md',
    files.get('enunciado.md').toString('utf8').replace('**Pré-requisitos:** U03 (pg-d02 — pedido de 5 campos)', '**Pré-requisitos:** U03 (pg-d03 — pedido de 5 campos)')
  );
  const values = A.runExtractions(doctored, contract);
  mustThrow('E_EXTRACTION_HASH_MISMATCH', () => A.verifyExtractions(values, contract));

  const { chainText } = A.loadPrerequisiteChain(contract);
  const invented = structuredClone(contract.package.anchors);
  invented.prerequisitePractice.id = 'pg-d99';
  invented.prerequisitePractice.label = 'prática inexistente';
  mustThrow('E_ANCHOR_UNTRACED', () => A.assertAnchorsTraced(invented, values.get('metaBlock'), [chainText]));
  mustThrow('E_ANCHOR_UNTRACED', () =>
    A.assertAnchorsTraced(
      { ...contract.package.anchors, competencyPrimary: 'D9' },
      A.runExtractions(files, contract).get('anchorsMeta'),
      [chainText]
    )
  );
});

test('F3 source interface: learnerVisibleFiles (6, canonical order) and provenanceOnlyFiles (18, hash-pinned, out of the learner payload)', () => {
  const { artifact } = projectFrom();
  assert.deepEqual(artifact.source.learnerVisibleFiles, CANONICAL_LEARNER_FILES);
  assert.equal(artifact.source.learnerVisibleFiles.length, 6);
  assert.deepEqual(artifact.source.provenanceOnlyFiles.map((f) => f.path), GABARITO_PATHS);
  for (const entry of artifact.source.provenanceOnlyFiles) {
    assert.equal(entry.contentInLearnerPayload, false);
    const pinned = contract.files.find((f) => f.path === entry.path);
    assert.equal(entry.sha256, pinned.sha256);
    assert.equal(entry.bytes, pinned.bytes);
  }
  assert.deepEqual(
    artifact.source.manifest.slice(0, 6).map((m) => m.path),
    CANONICAL_LEARNER_FILES
  );
  const serialized = projectFrom().serialized;
  assert.ok(serialized.includes('"contentInLearnerPayload": false'));
});

test('F3 negatives: reordered learner list and gabarito inside learnerVisibleFiles are rejected', () => {
  mustThrow('E_SOURCE_INTERFACE_INVALID', () =>
    projectFrom(
      PACKAGE_DIR,
      contractWith((c) => {
        c.sourceInterface.learnerVisibleFiles = [...CANONICAL_LEARNER_FILES].reverse();
      })
    )
  );
  mustThrow('E_SOURCE_INTERFACE_INVALID', () =>
    projectFrom(
      PACKAGE_DIR,
      contractWith((c) => {
        c.sourceInterface.learnerVisibleFiles = [
          ...CANONICAL_LEARNER_FILES.slice(0, 5),
          'guia-de-correcao/solucao.md'
        ];
      })
    )
  );
  mustThrow('E_SOURCE_INTERFACE_INVALID', () =>
    projectFrom(PACKAGE_DIR, contractWith((c) => { delete c.sourceInterface; }))
  );
});

test('catalog parity (real py loader): load_guided_practice_catalog projects pg-d04 with this artifact\'s contentVersion, criteria and anchor', (t) => {
  const pyCode = [
    "import json, sys",
    "sys.path.insert(0, '.')",
    "from pathlib import Path",
    "from learner.substrate.mission_catalog_guided_practice import load_guided_practice_catalog",
    "record = load_guided_practice_catalog(Path('curriculum/sequencia-dev-guiada'))['pg-d04']",
    "print(json.dumps({",
    "  'content_version': record['content_version'],",
    "  'anchor_lesson_id': record['anchor_lesson_id'],",
    "  'rubric_criteria': record['rubric_criteria'],",
    "  'title': record['title'],",
    "  'estimated_minutes': record['estimated_minutes']",
    "}))"
  ].join('\n');
  const probe = spawnSync('python3', ['-c', pyCode], { cwd: ROOT, encoding: 'utf8' });
  if (probe.status !== 0 && /ENOENT|not found|No module named/.test(`${probe.stderr}${probe.stdout}`)) {
    t.skip(`python3/substrate unavailable in this environment: ${probe.stderr.slice(0, 120)}`);
    return;
  }
  assert.equal(probe.status, 0, `python probe failed: ${probe.stderr}`);
  const record = JSON.parse(probe.stdout);
  const { artifact } = projectFrom();
  assert.equal(record.content_version, artifact.package.contentVersion);
  assert.equal(record.anchor_lesson_id, 'l16');
  assert.deepEqual(record.rubric_criteria, CRITERIA);
  assert.equal(record.estimated_minutes, 40);
});

test('canonical golden: the delta artifact is pinned (new head/hash disclosure)', () => {
  const result = projectFrom();
  assert.equal(result.sha256, CANONICAL_SHA256);
  // leak guards cobrem os campos novos (serialização inteira é o haystack)
  const files = verifiedFiles();
  const values = A.runExtractions(files, contract);
  A.assertNoGabaritoLeak(result.serialized, files, [...values.values()].flat());
  const { chainText } = A.loadPrerequisiteChain(contract);
  A.assertTraceableTexts(A.contentAnchorTexts(result.artifact.package.anchors), files, [], [chainText]);
});
