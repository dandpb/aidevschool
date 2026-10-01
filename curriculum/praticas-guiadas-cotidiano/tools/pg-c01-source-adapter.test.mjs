import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, cpSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const ADAPTER = path.join(HERE, 'pg-c01-source-adapter.mjs');
const CONTRACT = path.join(HERE, 'fixtures', 'pg-c01-source-contract.json');
const PACKAGE_DIR = path.join(HERE, '..', 'pg-c01-dados-minimos-e-verificacao');

const A = await import(`file://${ADAPTER}`);
const contract = A.loadContract(CONTRACT);

function verifiedFiles() {
  return A.readSourceFiles(PACKAGE_DIR, contract).files;
}

function projectFrom(dir = PACKAGE_DIR) {
  return A.project({ sourceDir: dir, contractPath: CONTRACT });
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

test('manifest pins every source file byte a byte (approved source preserved)', () => {
  const { files, manifest } = A.readSourceFiles(PACKAGE_DIR, contract);
  assert.equal(manifest.length, 10);
  for (const pinned of contract.files) {
    const buffer = files.get(pinned.path);
    assert.ok(buffer, `missing pinned file ${pinned.path}`);
    assert.equal(A.sha256Hex(buffer), pinned.sha256);
    assert.equal(buffer.length, pinned.bytes);
  }
  const readme = contract.files.find((f) => f.path === '../README.md');
  assert.ok(readme, 'family README is pinned in the manifest');
});

test('golden projection structure: 3 steps, 6 criteria ids, binary all-required verdicts, L/G anchors, 5 statements, 2 takeaway prompts', () => {
  const { artifact } = projectFrom();
  assert.deepEqual(artifact.learnerPath.steps.map((s) => s.id), ['A', 'B', 'C']);
  for (const step of artifact.learnerPath.steps) assert.ok(step.instruction.length > 40);
  assert.deepEqual(
    artifact.rubricSkeleton.criteria.map((c) => c.id),
    ['c1-mínimos', 'c2-vereditos', 'c3-citações', 'c4-incerteza', 'c5-privacidade', 'c6-resposta']
  );
  assert.deepEqual(artifact.rubricSkeleton.verdict, {
    allowed: ['sufficient', 'insufficient'],
    binary: true,
    allCriteriaRequired: true,
    aggregateScore: 'none'
  });
  assert.deepEqual(
    artifact.learnerPath.inputs['fonte-1'].lines.map((l) => l.id),
    ['L1', 'L2', 'L3', 'L4', 'L5', 'L6']
  );
  assert.deepEqual(
    artifact.learnerPath.inputs['fonte-2'].lines.map((l) => l.id),
    ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8']
  );
  assert.deepEqual(
    artifact.learnerPath.inputs['resposta-ia'].statements.map((s) => s.id),
    ['1', '2', '3', '4', '5']
  );
  assert.equal(artifact.learnerPath.takeaway.prompts.length, 2);
  assert.match(artifact.learnerPath.takeaway.prompts[0], /^\(a\)/);
  assert.match(artifact.learnerPath.takeaway.prompts[1], /^\(b\)/);
  assert.ok(artifact.learnerPath.retry.insistedStatement.text.startsWith('Confirmo:'));
  assert.equal(artifact.learnerPath.retry.insistedStatement.provenance.section, '5.5');
  assert.deepEqual(Object.keys(artifact.rubricSkeleton.feedbackByCriterion), contract.structure.criteriaIds);
  assert.equal(artifact.source.pin.head, '88ca305e0f7cd1c9a9f543fbda69f154d1cf8aea');
  assert.equal(artifact.source.pin.pullRequest, 635);
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
  doctored.learnerPath.inputs['resposta-ia'].statements[0].text = 'statement alterado';
  assert.notEqual(A.sha256Hex(`${JSON.stringify(doctored, null, 2)}\n`), projectFrom().sha256);
});

test('negative: a single altered source byte fails with E_SOURCE_HASH_MISMATCH', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'pg-c01-tamper-'));
  cpSync(PACKAGE_DIR, dir, { recursive: true });
  cpSync(path.join(ROOT, 'README.md'), path.join(dir, '..', 'README.md'));
  const target = path.join(dir, 'insumos', 'resposta-ia.md');
  const original = readFileSync(target, 'utf8');
  writeFileSync(target, original.replace('vovó Marta', 'vovó Marta '));
  const err = mustThrow('E_SOURCE_HASH_MISMATCH', () => projectFrom(dir));
  assert.equal(err.details.path, 'insumos/resposta-ia.md');
});

test('negative: rubrica without a required criterion fails with E_CRITERION_MISSING', () => {
  const files = verifiedFiles();
  const doctored = files
    .get('rubrica-v1.md')
    .toString('utf8')
    .split('\n')
    .filter((line) => !line.startsWith('| c4-incerteza |'))
    .join('\n');
  files.set('rubrica-v1.md', Buffer.from(doctored, 'utf8'));
  const values = A.runExtractions(files, contract);
  const err = mustThrow('E_CRITERION_MISSING', () => A.validateStructure(values, contract));
  assert.deepEqual(err.details.missing, ['c4-incerteza']);
});

test('negative: rubrica with an unknown criterion id fails with E_CRITERION_UNKNOWN', () => {
  const files = verifiedFiles();
  const rubrica = files.get('rubrica-v1.md').toString('utf8');
  const extraRow = '| c9-estranho | critério que não existe no contrato | x | y |\n';
  const doctored = rubrica.replace('\n## Erros plausíveis', `\n${extraRow}\n## Erros plausíveis`);
  files.set('rubrica-v1.md', Buffer.from(doctored, 'utf8'));
  const values = A.runExtractions(files, contract);
  const err = mustThrow('E_CRITERION_UNKNOWN', () => A.validateStructure(values, contract));
  assert.deepEqual(err.details.unknown, ['c9-estranho']);
});

test('negative: malformed input (missing input table, missing enunciado section) fails with E_STRUCTURE_INVALID', () => {
  const files = verifiedFiles();
  files.set('insumos/fonte-2-grupo-familia.md', Buffer.from('sem tabela nenhuma aqui\n', 'utf8'));
  let values = A.runExtractions(files, contract);
  mustThrow('E_STRUCTURE_INVALID', () => A.validateStructure(values, contract));

  const files2 = verifiedFiles();
  files2.set(
    'enunciado.md',
    files2.get('enunciado.md').toString('utf8').replace('## Regras', '## Regras sumidas')
  );
  mustThrow('E_STRUCTURE_INVALID', () => A.runExtractions(files2, contract));
});

test('negative: edited allowlisted text fails extraction review with E_EXTRACTION_HASH_MISMATCH', () => {
  const files = verifiedFiles();
  const doctored = files
    .get('guia-de-correcao/solucao.md')
    .toString('utf8')
    .replace('a festa é sábado, dia 12', 'a festa é sábado, dia 21');
  files.set('guia-de-correcao/solucao.md', Buffer.from(doctored, 'utf8'));
  const values = A.runExtractions(files, contract);
  mustThrow('E_EXTRACTION_HASH_MISMATCH', () => A.verifyExtractions(values, contract));
});

test('leak check: projection carries no answer-key facts from rubrica columns or guia-de-correcao', () => {
  const { serialized } = projectFrom();
  const flat = serialized.replace(/\s+/g, ' ');
  for (const marker of ['12/19', '35/45', '4 das 5', 'contrariada (privacidade)', 'confirmar até 14']) {
    assert.ok(!flat.includes(marker), `leaked marker: ${marker}`);
  }
  const files = verifiedFiles();
  const values = A.runExtractions(files, contract);
  A.assertNoGabaritoLeak(serialized, files, [...values.values()].flat());
});

test('leak check negative control: detector fires on tampered projection', () => {
  const files = verifiedFiles();
  const values = A.runExtractions(files, contract);
  const allow = [...values.values()].flat();
  const tampered = `${projectFrom().serialized.slice(0, -2)}, "leak": "a afirmação 5 conta como contrariada (privacidade)"}\n`;
  mustThrow('E_GABARITO_LEAK', () => A.assertNoGabaritoLeak(tampered, files, allow));
});

test('traceability: every projected text is learner-visible source or reviewed allowlist', () => {
  const files = verifiedFiles();
  const values = A.runExtractions(files, contract);
  A.assertTraceableTexts(
    [projectFrom().artifact.learnerPath.objective, ...[...values.values()].flat()],
    files,
    [...[...values.values()].flat()]
  );
  mustThrow('E_UNTRACED_CONTENT', () =>
    A.assertTraceableTexts(['texto que não existe em fonte nenhuma do pacote'], files, [])
  );
});

test('contract guard: wrong schema is rejected', () => {
  const bad = mkdtempSync(path.join(tmpdir(), 'pg-c01-contract-'));
  const badPath = path.join(bad, 'bad.json');
  writeFileSync(badPath, JSON.stringify({ ...contract, schema: 'outra-coisa@9' }));
  mustThrow('E_CONTRACT_INVALID', () => A.loadContract(badPath));
});
