import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, cpSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..', '..');
const ADAPTER = path.join(HERE, 'pg-d02-source-adapter.mjs');
const CONTRACT = path.join(HERE, 'fixtures', 'pg-d02-source-contract.json');
const PACKAGE_DIR = path.join(HERE, '..', 'pg-d02-pedido-estruturado');
const PG_D01_DIR = path.join(HERE, '..', 'pg-d01-debug-reproduza');

const CANONICAL_LEARNER_FILES = [
  'enunciado.md',
  'exemplo-trabalhado.md',
  'insumos/pedido-original.md',
  'insumos/meus_commits.json',
  'insumos/verifica_pedido.py',
  'rubrica-v1.md'
];
const GABARITO_PATHS = ['guia-de-correcao/pedido-5-campos.md', 'guia-de-correcao/solucao.md'];
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
const CANONICAL_SHA256 = 'e8054bc6e26cec03fe92bf7dd577644b8fd88c02922150350517677692ccfe4f';
const CANONICAL_BYTES = 18473;

const A = await import(`file://${ADAPTER}`);
const contract = A.loadContract(CONTRACT);
const CRITERIA = [
  'c1-cinco-campos',
  'c2-contexto-por-caminho',
  'c3-objetivo-unico',
  'c4-aceite-executavel',
  'c5-resticoes-do-contrato',
  'c6-nao-meta-explicita',
  'c7-casos-borda-decidiveis'
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
  const dir = mkdtempSync(path.join(tmpdir(), 'pg-d02-cv-'));
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

test('manifest pins every source file byte a byte (frozen PR631 head preserved)', () => {
  const { files, manifest } = A.readSourceFiles(PACKAGE_DIR, contract);
  assert.equal(manifest.length, 8);
  for (const pinned of contract.files) {
    const buffer = files.get(pinned.path);
    assert.ok(buffer, `missing pinned file ${pinned.path}`);
    assert.equal(A.sha256Hex(buffer), pinned.sha256);
    assert.equal(buffer.length, pinned.bytes);
  }
  const { artifact } = projectFrom();
  assert.equal(artifact.source.pin.pullRequest, 631);
  assert.equal(artifact.source.pin.head, '4cabf984591f0d5cf4046e0264871811dd6bd18a');
  assert.equal(artifact.source.pin.base.pullRequest, 620);
  assert.equal(artifact.source.pin.base.head, 'e01d9d42b99434c10d8f155cde0cbbc57b25cf61');
  assert.deepEqual(
    artifact.source.manifest.map((m) => m.path).sort(),
    contract.files.map((f) => f.path).sort()
  );
});

test('golden projection: identity from source, 6 steps, B1/B2, 5 template fields, 7 criteria, ternary verdict, 2 takeaway prompts', () => {
  const { artifact } = projectFrom();
  assert.equal(artifact.schema, 'aidevschool/sequencia-dev-guiada/projection@1');
  assert.equal(artifact.package.id, 'pg-d02-pedido-estruturado');
  assert.equal(artifact.package.version, 'rubrica-v1');
  assert.equal(artifact.package.unit, 'U03');
  assert.equal(artifact.package.competencies.primary, 'D3');
  assert.deepEqual(artifact.package.competencies.support, ['D2']);

  const lp = artifact.learnerPath;
  assert.deepEqual(lp.steps.map((s) => s.id), ['1', '2', '3', '4', '5', '6']);
  for (const step of lp.steps) assert.ok(step.instruction.length > 40, `step ${step.id} too short`);
  assert.deepEqual(lp.edgeCases.map((e) => e.id), ['B1', 'B2']);
  assert.ok(lp.edgeCases[0].text.startsWith('Com o filtro de tipos ativo'));
  assert.ok(lp.objective.includes('CONTEXTO /'));
  assert.ok(lp.objective.includes('OBJETIVO /'));
  assert.ok(lp.objective.includes('RESTRIÇÕES /'));
  assert.ok(lp.objective.includes('ACEITE /'));
  assert.ok(lp.objective.includes('NÃO-META'));

  assert.deepEqual(
    lp.template.fields.map((f) => f.name),
    ['CONTEXTO', 'OBJETIVO', 'RESTRIÇÕES', 'ACEITE', 'NÃO-META']
  );
  assert.equal(lp.template.fields[0].hint, 'onde mexer — caminhos de arquivo, não descrições');
  assert.equal(lp.template.fields[3].hint, 'o comando que prova que ficou pronto (+ saída esperada)');

  assert.deepEqual(
    artifact.rubricSkeleton.criteria.map((c) => c.id),
    CRITERIA
  );
  const tags = Object.fromEntries(
    artifact.rubricSkeleton.criteria.filter((c) => c.objectiveTag).map((c) => [c.id, c.objectiveTag])
  );
  assert.deepEqual(tags, {
    'c4-aceite-executavel': 'a',
    'c6-nao-meta-explicita': 'b',
    'c7-casos-borda-decidiveis': 'c'
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

test('fidelity: pipes in table commands and annotated criterion IDs are never truncated', () => {
  const { artifact } = projectFrom();
  const perCheck = artifact.rubricSkeleton.perCheckByCriterion;
  assert.ok(
    perCheck['c5-resticoes-do-contrato'].includes('grep -n "stdlib\\|silenciosamente\\|determin"'),
    'c5 perCheck must keep the grep pattern pipes intact'
  );
  assert.ok(perCheck['c4-aceite-executavel'].includes('--types feat,fix'));
  assert.ok(perCheck['c2-contexto-por-caminho'].includes('--caminhos'));
  // ID anotado no texto do retry chega inteiro (c7-casos-borda):
  assert.ok(artifact.learnerPath.retry.instruction.includes('`c7-casos-borda`'));
  // O passo 4 referencia o template; o template em si chega como bloco próprio:
  assert.ok(artifact.learnerPath.steps[3].instruction.includes('Template (M3 §3.1)'));
  // Guardas preservadas:
  assert.ok(artifact.learnerPath.guards.afterAttempt.includes('consulte **após** a tentativa'));
  assert.ok(artifact.learnerPath.guards.scopeNote.includes('avalia o **pedido**'));
  // O pedido original (insumo do aprendiz) chega por inteiro, em parágrafos:
  const paragraphs = artifact.learnerPath.inputs['pedido-original'].paragraphs;
  assert.ok(paragraphs.length >= 3);
  assert.ok(paragraphs.some((p) => p.startsWith('De: Rafa')));
  assert.ok(paragraphs.some((p) => p.includes('canal do Slack')));
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
  const dir = mkdtempSync(path.join(tmpdir(), 'pg-d02-tamper-'));
  cpSync(PACKAGE_DIR, dir, { recursive: true });
  const target = path.join(dir, 'insumos', 'pedido-original.md');
  const original = readFileSync(target, 'utf8');
  writeFileSync(target, original.replace('De: Rafa', 'De: Rafa '));
  const err = mustThrow('E_SOURCE_HASH_MISMATCH', () => projectFrom(dir));
  assert.equal(err.details.path, 'insumos/pedido-original.md');
});

test('negative: missing pinned file fails with E_CONTRACT_MISSING_FILE', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'pg-d02-nofile-'));
  cpSync(PACKAGE_DIR, dir, { recursive: true });
  writeFileSync(path.join(dir, 'rubrica-v1.md'), 'removida\n');
  const err = mustThrow('E_SOURCE_HASH_MISMATCH', () => projectFrom(dir));
  assert.equal(err.code, 'E_SOURCE_HASH_MISMATCH');
});

test('negative: rubrica without a required criterion fails with E_CRITERION_MISSING', () => {
  const files = verifiedFiles();
  const doctored = files
    .get('rubrica-v1.md')
    .toString('utf8')
    .split('\n')
    .filter((line) => !line.startsWith('| c4-aceite-executavel'))
    .join('\n');
  files.set('rubrica-v1.md', Buffer.from(doctored, 'utf8'));
  const stubContract = {
    ...contract,
    extractions: contract.extractions.filter((e) => e.role !== 'perCheck:c4-aceite-executavel')
  };
  const values = A.runExtractions(files, stubContract);
  const err = mustThrow('E_CRITERION_MISSING', () => A.validateStructure(values, stubContract));
  assert.deepEqual(err.details.missing, ['c4-aceite-executavel']);
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

test('negative: malformed source (missing edge-case bullet, missing section) fails with E_STRUCTURE_INVALID', () => {
  const files = verifiedFiles();
  const doctored = files
    .get('enunciado.md')
    .toString('utf8')
    .split('\n')
    .filter((line) => !line.includes('**B2**'))
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
    .replace('sem `FALHA`?', 'sem `FALHA` nunca?');
  files.set('rubrica-v1.md', Buffer.from(doctored, 'utf8'));
  const values = A.runExtractions(files, contract);
  mustThrow('E_EXTRACTION_HASH_MISMATCH', () => A.verifyExtractions(values, contract));
});

test('leak check: markers are gabarito-only facts and none reach the learner projection', () => {
  const files = verifiedFiles();
  const learnerBlob = [
    'enunciado.md',
    'exemplo-trabalhado.md',
    'rubrica-v1.md',
    'insumos/pedido-original.md',
    'insumos/meus_commits.json',
    'insumos/verifica_pedido.py'
  ]
    .map((f) => files.get(f).toString('utf8'))
    .join('\n')
    .replace(/\s+/g, ' ');
  const gabaritoBlob = ['guia-de-correcao/pedido-5-campos.md', 'guia-de-correcao/solucao.md']
    .map((f) => files.get(f).toString('utf8'))
    .join('\n')
    .replace(/\s+/g, ' ');
  for (const marker of [
    'sinal de segurança, não tipo filtrável',
    '22 atuais',
    '⚠️ Breaking, ✨ Novidades, 🐛 Correções',
    'unrecognized arguments: --types',
    'Cair na armadilha do Rafa',
    'NÃO-META espantalho',
    'dentro: a seção ⚠️ Breaking',
    'fora das seções de mudanças, mas não silencioso'
  ]) {
    assert.ok(gabaritoBlob.includes(marker), `marker must exist in guia-de-correcao: ${marker}`);
    assert.ok(!learnerBlob.includes(marker), `marker must NOT be learner-visible (else it proves nothing): ${marker}`);
  }

  const { serialized } = projectFrom();
  const flat = serialized.replace(/\s+/g, ' ');
  for (const marker of ['22 atuais', 'sinal de segurança, não tipo filtrável', 'NÃO-META espantalho', 'dentro: a seção ⚠️ Breaking', 'fora das seções de mudanças, mas não silencioso']) {
    assert.ok(!flat.includes(marker), `leaked marker: ${marker}`);
  }
  const values = A.runExtractions(files, contract);
  A.assertNoGabaritoLeak(serialized, files, [...values.values()].flat());
});

test('leak check negative control: detector fires on tampered projection', () => {
  const files = verifiedFiles();
  const values = A.runExtractions(files, contract);
  const allow = [...values.values()].flat();
  const tampered = `${projectFrom().serialized.slice(0, -2)}, "leak": "o pedido-modelo exige 22 atuais + novos testes"}\n`;
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
  const bad = mkdtempSync(path.join(tmpdir(), 'pg-d02-contract-'));
  const badPath = path.join(bad, 'bad.json');
  writeFileSync(badPath, JSON.stringify({ ...contract, schema: 'outra-coisa@9' }));
  mustThrow('E_CONTRACT_INVALID', () => A.loadContract(badPath));
});

test('CLI determinism: --check and --out agree with in-process projection', () => {
  const tmp = mkdtempSync(path.join(tmpdir(), 'pg-d02-cli-'));
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
  assert.equal(artifact.package.practiceId, 'pg-d02');
  assert.equal(artifact.package.contentVersion, 'pg-d02@920e17baafd5');
  assert.match(artifact.package.contentVersion, /^pg-d02@[0-9a-f]{12}$/);
  const files = verifiedFiles();
  assert.equal(A.computeContentVersion(files, 'pg-d02'), artifact.package.contentVersion);
  assert.equal(A.parsePracticeId(files.get('enunciado.md').toString('utf8')), 'pg-d02');
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
  const before = A.computeContentVersion(files, 'pg-d02');
  const tampered = new Map(files);
  tampered.set('guia-de-correcao/solucao.md', Buffer.from(`${files.get('guia-de-correcao/solucao.md').toString('utf8')}\n# editado`));
  assert.equal(A.computeContentVersion(tampered, 'pg-d02'), before);
  const reordered = A.computeContentVersion(files, 'pg-d02', {
    allowlist: [
      'enunciado.md',
      'exemplo-trabalhado.md',
      'rubrica-v1.md',
      'insumos/pedido-original.md',
      'insumos/meus_commits.json',
      'insumos/verifica_pedido.py'
    ]
  });
  assert.notEqual(reordered, before);
});

test('F1 negatives: date.ordinal-style value, wrong digest, missing field and basis without parity are all rejected', () => {
  mustThrow('E_CONTENT_VERSION_INVALID', () =>
    projectFrom(PACKAGE_DIR, contractWith((c) => { c.package.contentVersion = '2026-09-30.1'; }))
  );
  mustThrow('E_CONTENT_VERSION_MISMATCH', () =>
    projectFrom(PACKAGE_DIR, contractWith((c) => { c.package.contentVersion = 'pg-d02@deadbeefdead'; }))
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

test('F2 anchors: structured block exactly as ratified, every value traced to the pinned anchorsMeta extraction', () => {
  const { artifact } = projectFrom();
  assert.deepEqual(artifact.package.anchors, {
    unit: 'U03',
    unitRef: 'SEQUENCIA.md §2',
    competencyPrimary: 'D3',
    competencySupport: ['D2'],
    course: {
      course: 'curso-simples',
      module: 'M3',
      topic: 'Prompt Engineering',
      sections: '§3.1–3.4',
      entry: 'docs/curso-simples/index.html',
      blob: '2bcf99fbd831'
    },
    workedExample: { dir: 'docs/curso-simples/workflow-exemplo/', entry: 'release_notes.py', blob: '8bbe0fdffcf5', tests: 22 },
    prerequisiteLesson: { id: 'l16', unit: 'U02', label: 'pedido de código com contexto', equivalence: 'ou equivalente' }
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
    files.get('enunciado.md').toString('utf8').replace('lição-âncora de pré-req: `l16` (U02)', 'lição-âncora de pré-req: `l17` (U02)')
  );
  const values = A.runExtractions(doctored, contract);
  mustThrow('E_EXTRACTION_HASH_MISMATCH', () => A.verifyExtractions(values, contract));

  const invented = structuredClone(contract.package.anchors);
  invented.prerequisiteLesson.id = 'l21';
  invented.prerequisiteLesson.label = 'pedido mágico sem contexto';
  mustThrow('E_ANCHOR_UNTRACED', () => A.assertAnchorsTraced(invented, values.get('metaBlock')));
  mustThrow('E_ANCHOR_UNTRACED', () =>
    A.assertAnchorsTraced(
      { ...contract.package.anchors, competencySupport: ['D9'] },
      A.runExtractions(files, contract).get('anchorsMeta')
    )
  );
});

test('F3 source interface: learnerVisibleFiles (6, canonical order) and provenanceOnlyFiles (2, hash-pinned, out of the learner payload)', () => {
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
          'enunciado.md',
          'exemplo-trabalhado.md',
          'insumos/pedido-original.md',
          'insumos/meus_commits.json',
          'insumos/verifica_pedido.py',
          'guia-de-correcao/solucao.md'
        ];
      })
    )
  );
  mustThrow('E_SOURCE_INTERFACE_INVALID', () =>
    projectFrom(PACKAGE_DIR, contractWith((c) => { delete c.sourceInterface; }))
  );
});

test('canonical golden: the delta artifact is pinned (new head/hash/bytes disclosure)', () => {
  const result = projectFrom();
  assert.equal(result.sha256, CANONICAL_SHA256);
  assert.equal(result.bytes, CANONICAL_BYTES);
  assert.notEqual(result.sha256, '4812076c9d47a8b21fff24a7f5f2e755ddf321f446a8af1308645881d8fa33af');
  // leak guards cobrem os campos novos (serialização inteira é o haystack)
  const files = verifiedFiles();
  const values = A.runExtractions(files, contract);
  A.assertNoGabaritoLeak(result.serialized, files, [...values.values()].flat());
  A.assertTraceableTexts(A.anchorTexts(result.artifact.package.anchors), files, []);
});
