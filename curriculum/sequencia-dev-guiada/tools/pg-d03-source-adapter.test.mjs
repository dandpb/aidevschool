import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, cpSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..', '..', '..');
const ADAPTER = path.join(HERE, 'pg-d03-source-adapter.mjs');
const CONTRACT = path.join(HERE, 'fixtures', 'pg-d03-source-contract.json');
const PACKAGE_DIR = path.join(HERE, '..', 'pg-d03-refatorar-com-rede');
const PG_D01_DIR = path.join(HERE, '..', 'pg-d01-debug-reproduza');

const CANONICAL_LEARNER_FILES = [
  'enunciado.md',
  'exemplo-trabalhado.md',
  'insumos/PEDIDO.md',
  'insumos/CONTRATO.md',
  'insumos/proposta-refatoracao.md',
  'insumos/fixture/pedidos.py',
  'insumos/fixture/testes.py',
  'rubrica-v1.md'
];
const GABARITO_PATHS = [
  'guia-de-correcao/caracterizacao/teste_caracterizacao.py',
  'guia-de-correcao/armadilha/pedidos.py',
  'guia-de-correcao/solucao/pedidos.py',
  'guia-de-correcao/solucao.md'
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
const CANONICAL_CONTENT_VERSION = 'pg-d03@20b608d64a13';
const CANONICAL_SHA256 = 'd806f4f9d7784dc5f397b41ae57aabe81407e19ed8650e814251b21ee93e40e2';

const A = await import(`file://${ADAPTER}`);
const contract = A.loadContract(CONTRACT);
const CRITERIA = [
  'c1-baseline-verde',
  'c2-caracterizacao-antes',
  'c3-armadilha-executada',
  'c4-veredito-fundamentado',
  'c5-passos-pequenos',
  'c6-testes-existentes-intocados',
  'c7-comportamento-preservado'
];

function verifiedFiles() {
  return A.readSourceFiles(PACKAGE_DIR, contract).files;
}

function projectFrom(dir = PACKAGE_DIR, contractPath = CONTRACT) {
  return A.project({ sourceDir: dir, contractPath });
}

function contractWith(mutate) {
  const doctored = structuredClone(contract);
  mutate(doctored);
  const dir = mkdtempSync(path.join(tmpdir(), 'pg-d03-cv-'));
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

test('manifest pins every source file byte a byte (frozen PR633 head preserved)', () => {
  const { files, manifest } = A.readSourceFiles(PACKAGE_DIR, contract);
  assert.equal(manifest.length, 12);
  for (const pinned of contract.files) {
    const buffer = files.get(pinned.path);
    assert.ok(buffer, `missing pinned file ${pinned.path}`);
    assert.equal(A.sha256Hex(buffer), pinned.sha256);
    assert.equal(buffer.length, pinned.bytes);
  }
  const { artifact } = projectFrom();
  assert.equal(artifact.source.pin.pullRequest, 633);
  assert.equal(artifact.source.pin.head, '353aec424142c6ef74f7ed030b32724c067e23e7');
  assert.equal(artifact.source.pin.merge, '5679b8b5fe4f29549fd258b9a3c4046cbf4b9a6f');
  assert.equal(artifact.source.pin.base.pullRequest, 620);
  assert.equal(artifact.source.pin.base.head, 'e01d9d42b99434c10d8f155cde0cbbc57b25cf61');
  assert.deepEqual(
    artifact.source.manifest.map((m) => m.path).sort(),
    contract.files.map((f) => f.path).sort()
  );
});

test('golden projection: identity from source, 6 steps, clauses C1–C5, 7 criteria, ternary verdict, 2 takeaway prompts', () => {
  const { artifact } = projectFrom();
  assert.equal(artifact.schema, 'aidevschool/sequencia-dev-guiada/projection@1');
  assert.equal(artifact.package.id, 'pg-d03-refatorar-com-rede');
  assert.equal(artifact.package.version, 'rubrica-v1');
  assert.equal(artifact.package.unit, 'U07');
  assert.equal(artifact.package.competencies.primary, 'D4');
  // o pg-d03 não declara competência de apoio: support é vazio, nunca presumido
  assert.deepEqual(artifact.package.competencies.support, []);

  const lp = artifact.learnerPath;
  assert.deepEqual(lp.steps.map((s) => s.id), ['1', '2', '3', '4', '5', '6']);
  for (const step of lp.steps) assert.ok(step.instruction.length > 40, `step ${step.id} too short`);
  assert.ok(lp.steps[0].instruction.includes('Baseline verde'));
  assert.ok(lp.steps[3].instruction.includes('Julgue a proposta com evidência'));

  assert.deepEqual(lp.contractClauses.map((c) => c.id), ['C1', 'C2', 'C3', 'C4', 'C5']);
  assert.equal(lp.contractClauses[0].title, 'Formato do retorno');
  assert.ok(lp.contractClauses[1].text.includes('produto desconhecido: pizza'));

  assert.ok(lp.objective.includes('**(a)**'));
  assert.ok(lp.objective.includes('**(b)**'));
  assert.ok(lp.objective.includes('**(c)**'));
  assert.ok(lp.houseRule.startsWith('A regra da casa que esta prática instala (l28)'));

  assert.deepEqual(
    artifact.rubricSkeleton.criteria.map((c) => c.id),
    CRITERIA
  );
  const tags = Object.fromEntries(
    artifact.rubricSkeleton.criteria.filter((c) => c.objectiveTag).map((c) => [c.id, c.objectiveTag])
  );
  assert.deepEqual(tags, {
    'c2-caracterizacao-antes': 'a',
    'c3-armadilha-executada': 'b',
    'c5-passos-pequenos': 'c'
  });

  assert.deepEqual(artifact.rubricSkeleton.verdict.allowed, ['met', 'partial', 'not_met']);
  assert.equal(artifact.rubricSkeleton.verdict.binary, false);
  assert.equal(artifact.rubricSkeleton.verdict.aggregateScore, 'none');
  assert.equal(artifact.rubricSkeleton.verdict.partialRequiresJustification, true);
  assert.ok(artifact.rubricSkeleton.verdict.rules.includes('`not_met` sem retry'));

  assert.equal(lp.takeaway.prompts.length, 2);
  assert.match(lp.takeaway.prompts[0], /^\(a\)/);
  assert.match(lp.takeaway.prompts[1], /^\(b\)/);
  assert.deepEqual(Object.keys(artifact.rubricSkeleton.perCheckByCriterion), CRITERIA);
  assert.equal(lp.feedback.criteriaCount, 7);
  assert.equal(lp.retry.failedCriteriaOnly, true);
});

test('fidelity: perCheck commands, retry criterion id, guards and learner inputs arrive intact', () => {
  const { artifact } = projectFrom();
  const perCheck = artifact.rubricSkeleton.perCheckByCriterion;
  assert.ok(
    perCheck['c1-baseline-verde'].includes('PYTHONPATH=insumos/fixture python3'),
    'c1 perCheck must keep the baseline command intact'
  );
  assert.ok(perCheck['c3-armadilha-executada'].includes('6 testes passaram'));
  assert.ok(perCheck['c7-comportamento-preservado'].includes('R$ 24,00'));
  // ID anotado no texto do retry chega inteiro (c3-armadilha):
  assert.ok(artifact.learnerPath.retry.instruction.includes('`c3-armadilha-executada`'));
  // Guardas preservadas:
  assert.ok(artifact.learnerPath.guards.afterAttempt.includes('consulte **após** a tentativa'));
  assert.ok(artifact.learnerPath.guards.scopeNote.includes('avalia o **processo de refatorar com rede de segurança**'));
  // O pedido original (insumo do aprendiz) chega por inteiro, em parágrafos:
  const paragraphs = artifact.learnerPath.inputs.pedido.paragraphs;
  assert.ok(paragraphs.length >= 2);
  assert.ok(paragraphs.some((p) => p.startsWith('De: equipe da cantina')));
  assert.ok(paragraphs.some((p) => p.includes('O comportamento está descrito no `CONTRATO.md`')));
  // O resumo da proposta do assistente é projetado como parágrafo fiel:
  assert.ok(artifact.learnerPath.inputs['proposta-do-assistente'].resumo.startsWith('A proposta promete:'));
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
  const dir = mkdtempSync(path.join(tmpdir(), 'pg-d03-tamper-'));
  cpSync(PACKAGE_DIR, dir, { recursive: true });
  const target = path.join(dir, 'insumos', 'CONTRATO.md');
  const original = readFileSync(target, 'utf8');
  writeFileSync(target, original.replace('## C1 — Formato do retorno', '## C1 — Formato do retorno '));
  const err = mustThrow('E_SOURCE_HASH_MISMATCH', () => projectFrom(dir));
  assert.equal(err.details.path, 'insumos/CONTRATO.md');
});

test('negative: deleted pinned file fails with E_CONTRACT_MISSING_FILE', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'pg-d03-nofile-'));
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
    .filter((line) => !line.startsWith('| c5-passos-pequenos'))
    .join('\n');
  files.set('rubrica-v1.md', Buffer.from(doctored, 'utf8'));
  const stubContract = {
    ...contract,
    extractions: contract.extractions.filter((e) => e.role !== 'perCheck:c5-passos-pequenos')
  };
  const values = A.runExtractions(files, stubContract);
  const err = mustThrow('E_CRITERION_MISSING', () => A.validateStructure(values, stubContract));
  assert.deepEqual(err.details.missing, ['c5-passos-pequenos']);
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

test('negative: malformed source (dropped contract clause, missing section) fails with E_STRUCTURE_INVALID', () => {
  const files = verifiedFiles();
  const doctored = files
    .get('insumos/CONTRATO.md')
    .toString('utf8')
    .split('\n')
    .filter((line) => !line.startsWith('## C4 —'))
    .join('\n');
  files.set('insumos/CONTRATO.md', Buffer.from(doctored, 'utf8'));
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
    .replace('6 testes passaram` anterior', '6 testes passaram` sempre anterior');
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
    'caracteriza_c2_prioridade_de_erro',
    'caracteriza_c3_auditoria_de_rejeitado',
    'C2 violada: ordem de erro trocada',
    'C3 violada: linha sumiu',
    'AUDITORIA apos rejeicao: []'
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
  const tampered = `${projectFrom().serialized.slice(0, -2)}, "leak": "C2 violada: ordem de erro trocada"}\n`;
  mustThrow('E_GABARITO_LEAK', () => A.assertNoGabaritoLeak(tampered, files, allow));
});

test('traceability: every projected text is learner-visible source or reviewed allowlist', () => {
  const files = verifiedFiles();
  const values = A.runExtractions(files, contract);
  const { artifact } = projectFrom();
  A.assertTraceableTexts(
    [artifact.learnerPath.objective, ...[...values.values()].flat()],
    files,
    [...[...values.values()].flat()]
  );
  mustThrow('E_UNTRACED_CONTENT', () =>
    A.assertTraceableTexts(['texto que não existe em fonte nenhuma do pacote'], files, [])
  );
});

test('contract guard: wrong schema is rejected', () => {
  const bad = mkdtempSync(path.join(tmpdir(), 'pg-d03-contract-'));
  const badPath = path.join(bad, 'bad.json');
  writeFileSync(badPath, JSON.stringify({ ...contract, schema: 'outra-coisa@9' }));
  mustThrow('E_CONTRACT_INVALID', () => A.loadContract(badPath));
});

test('CLI determinism: --check and --out agree with in-process projection', () => {
  const tmp = mkdtempSync(path.join(tmpdir(), 'pg-d03-cli-'));
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
  assert.equal(artifact.package.practiceId, 'pg-d03');
  assert.equal(artifact.package.contentVersion, CANONICAL_CONTENT_VERSION);
  assert.match(artifact.package.contentVersion, /^pg-d03@[0-9a-f]{12}$/);
  const files = verifiedFiles();
  assert.equal(A.computeContentVersion(files, 'pg-d03'), artifact.package.contentVersion);
  assert.equal(A.parsePracticeId(files.get('enunciado.md').toString('utf8')), 'pg-d03');
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

test('F1: guia-de-correcao hashes never enter learner entries; the canonical order is load-bearing', () => {
  const files = verifiedFiles();
  const before = A.computeContentVersion(files, 'pg-d03');
  const tampered = new Map(files);
  tampered.set('guia-de-correcao/solucao.md', Buffer.from(`${files.get('guia-de-correcao/solucao.md').toString('utf8')}\n# editado`));
  assert.equal(A.computeContentVersion(tampered, 'pg-d03'), before);
  const reordered = A.computeContentVersion(files, 'pg-d03', {
    allowlist: [
      'enunciado.md',
      'exemplo-trabalhado.md',
      'rubrica-v1.md',
      'insumos/PEDIDO.md',
      'insumos/CONTRATO.md',
      'insumos/proposta-refatoracao.md',
      'insumos/fixture/pedidos.py',
      'insumos/fixture/testes.py'
    ]
  });
  assert.notEqual(reordered, before);
});

test('F1 negatives: date.ordinal-style value, wrong digest, missing field and basis without parity are all rejected', () => {
  mustThrow('E_CONTENT_VERSION_INVALID', () =>
    projectFrom(PACKAGE_DIR, contractWith((c) => { c.package.contentVersion = '2026-10-17.1'; }))
  );
  mustThrow('E_CONTENT_VERSION_MISMATCH', () =>
    projectFrom(PACKAGE_DIR, contractWith((c) => { c.package.contentVersion = 'pg-d03@deadbeefdead'; }))
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

test('F2 anchors: structured block exactly as declared, every value traced to the pinned anchorsMeta extraction', () => {
  const { artifact } = projectFrom();
  assert.deepEqual(artifact.package.anchors, {
    unit: 'U07',
    unitRef: 'SEQUENCIA.md §2',
    competencyPrimary: 'D4',
    anchorLesson: {
      id: 'l28',
      title: 'Refatore com assistente sem quebrar comportamento',
      file: 'curriculum/ai-literacy/modules/05-dev-contexto-e-escolha/l28-refatore-com-assistente-sem-quebrar-comportamento.yaml',
      blob: '386c27fe1a6b'
    },
    workedWorkflow: {
      id: '03-refatorar-seguro',
      file: 'dev-workflow-claude/workflows/03-refatorar-seguro/RESULTADO.md',
      blob: '93087764ac38'
    },
    prerequisiteLesson: { id: 'l21', unit: 'U04', label: 'pedir testes', equivalence: 'ou equivalentes' },
    prerequisitePractice: { id: 'pg-d01', unit: 'U06', label: 'reprodução antes do diagnóstico' }
  });
  const anchorsMeta = A.runExtractions(verifiedFiles(), contract).get('anchorsMeta');
  A.assertAnchorsTraced(artifact.package.anchors, anchorsMeta);
  // rastreabilidade global: strings de anchors passam pelo guardião de textos
  A.assertTraceableTexts(A.anchorTexts(artifact.package.anchors), verifiedFiles(), []);
});

test('F2 negatives: anchorsMeta drift and invented anchor values are rejected', () => {
  const files = verifiedFiles();
  const doctored = new Map(files);
  doctored.set(
    'enunciado.md',
    files.get('enunciado.md').toString('utf8').replace('**Pré-requisitos:** l21 (U04, pedir testes)', '**Pré-requisitos:** l22 (U04, pedir testes)')
  );
  const values = A.runExtractions(doctored, contract);
  mustThrow('E_EXTRACTION_HASH_MISMATCH', () => A.verifyExtractions(values, contract));

  const invented = structuredClone(contract.package.anchors);
  invented.prerequisiteLesson.id = 'l99';
  invented.prerequisiteLesson.label = 'mágica sem evidência';
  mustThrow('E_ANCHOR_UNTRACED', () => A.assertAnchorsTraced(invented, values.get('metaBlock')));
  mustThrow('E_ANCHOR_UNTRACED', () =>
    A.assertAnchorsTraced(
      { ...contract.package.anchors, competencyPrimary: 'D9' },
      A.runExtractions(files, contract).get('anchorsMeta')
    )
  );
});

test('F3 source interface: learnerVisibleFiles (8, canonical order) and provenanceOnlyFiles (4, hash-pinned, out of the learner payload)', () => {
  const { artifact } = projectFrom();
  assert.deepEqual(artifact.source.learnerVisibleFiles, CANONICAL_LEARNER_FILES);
  assert.equal(artifact.source.learnerVisibleFiles.length, 8);
  assert.deepEqual(artifact.source.provenanceOnlyFiles.map((f) => f.path), GABARITO_PATHS);
  for (const entry of artifact.source.provenanceOnlyFiles) {
    assert.equal(entry.contentInLearnerPayload, false);
    const pinned = contract.files.find((f) => f.path === entry.path);
    assert.equal(entry.sha256, pinned.sha256);
    assert.equal(entry.bytes, pinned.bytes);
  }
  assert.deepEqual(
    artifact.source.manifest.slice(0, 8).map((m) => m.path),
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
          ...CANONICAL_LEARNER_FILES.slice(0, 7),
          'guia-de-correcao/solucao.md'
        ];
      })
    )
  );
  mustThrow('E_SOURCE_INTERFACE_INVALID', () =>
    projectFrom(PACKAGE_DIR, contractWith((c) => { delete c.sourceInterface; }))
  );
});

test('catalog parity (real py loader): load_guided_practice_catalog projects pg-d03 with this artifact\'s contentVersion, criteria and anchor', (t) => {
  const pyCode = [
    "import json, sys",
    "sys.path.insert(0, '.')",
    "from pathlib import Path",
    "from learner.substrate.mission_catalog_guided_practice import load_guided_practice_catalog",
    "record = load_guided_practice_catalog(Path('curriculum/sequencia-dev-guiada'))['pg-d03']",
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
  assert.equal(record.anchor_lesson_id, 'l21');
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
  A.assertTraceableTexts(A.anchorTexts(result.artifact.package.anchors), files, []);
});
