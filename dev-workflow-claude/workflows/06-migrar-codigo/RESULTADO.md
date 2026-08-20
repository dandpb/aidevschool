# Workflow 06 — Migração mecânica verificada

## Problema que resolve

Migrações em lote (CommonJS→ESM, moment→date-fns, enzyme→testing-library…) costumam ser feitas "de uma vez": um mega-diff que, quando quebra, ninguém sabe qual dos 30 arquivos causou. O comando `/migrar` codifica a disciplina inversa: inventário explícito, base verde antes de começar, **um arquivo por vez com a suíte rodando entre cada passo**, revert cirúrgico do arquivo que quebrar, e relatório final arquivo × migrado × testes.

## O comando

`.claude/commands/migrar.md` — `/migrar <padrão antigo> para <padrão novo>`. Genérico (nada amarrado ao demo). Passos codificados:

1. **Inventariar** — lista explícita de TODOS os arquivos com o padrão antigo (grep, sem "etc."), ordenada folhas→consumidores→testes.
2. **Linha de base verde** — suíte completa no estado antigo; vermelho = não começa. Ponto de restauração em git.
3. **Migrar UM arquivo por vez** — transformação mecânica no arquivo (+ ajustes de path nos consumidores diretos que a mudança exigir), suíte completa, verde antes do próximo.
4. **Se quebrar, reverter só aquele arquivo** — restaurar, confirmar verde, anotar o motivo, tentar de novo.
5. **Relatório final** — tabela arquivo × migrado × testes cobrindo todo o inventário.

## Execução real

Demo: `demo/` — CLI de time tracking em CommonJS (Node 22.23.2, zero dependências, `node:test`). Migração executada: **CommonJS → ESM**.

### Passo 1 — Inventário (grep real, sem "etc.")

```
$ grep -rln 'require(\|module.exports' src test
src/index.cjs
src/parser.cjs
src/formatador.cjs
test/index.test.cjs
test/parser.test.cjs
test/formatador.test.cjs
```

Ordem definida (folhas primeiro, testes por último): 1. `src/parser.cjs` → 2. `src/formatador.cjs` → 3. `src/index.cjs` → 4. os três `test/*.test.cjs`.

### Passo 2 — Linha de base verde (estado ANTIGO) — **evidência ANTES**

```
=== BASELINE: node --test (estado CommonJS) ===
# tests 5
# pass 5
# fail 0
```

Ponto de restauração: `git init` no demo + commit `756d890 baseline: estado CommonJS, suite verde (5 pass)`.

### Passo 3a — `parser.cjs` → `parser.mjs`

Arquivo convertido para `export`, consumidores diretos (`src/index.cjs`, `test/parser.test.cjs`) atualizados para `require('./parser.mjs')` — Node 22 suporta `require()` de ESM síncrono.

```
=== PASSO 1/4: parser.cjs -> parser.mjs — node --test ===
# tests 5
# pass 5
# fail 0
```

### Passo 3b — `formatador.cjs`: quebrou de verdade, revert do passo 4 em ação

Primeira tentativa converteu só o arquivo, sem atualizar os requires dos consumidores. A suíte pegou na hora:

```
=== PASSO 2/4 (tentativa 1): formatador.cjs -> formatador.mjs SEM atualizar consumidores ===
# Error: Cannot find module '../src/formatador.cjs'
not ok 1 - test/formatador.test.cjs
# Error: Cannot find module './formatador.cjs'
not ok 2 - test/index.test.cjs
# tests 4
# pass 2
# fail 2
```

Revert só desse arquivo (`rm formatador.mjs` + `git checkout -- src/formatador.cjs`), motivo anotado: *consumidores diretos ainda apontavam para `./formatador.cjs`*.

```
=== REVERT formatador: suite de volta ao verde ===
# tests 5
# pass 5
# fail 0
```

Tentativa 2, agora com os dois consumidores atualizados no mesmo passo — **evidência do MEIO** (2 de 3 módulos src migrados, testes ainda em CJS, tudo verde):

```
=== PASSO 2/4 (tentativa 2): formatador + consumidores — node --test ===
# tests 5
# pass 5
# fail 0
```

### Passo 3c — `index.cjs` → `index.mjs`

```
=== PASSO 3/4: index.cjs -> index.mjs — node --test ===
# tests 5
# pass 5
# fail 0
```

### Passo 3d — Testes por último: `*.test.cjs` → `*.test.mjs` — **evidência FINAL**

```
=== PASSO 4/4 (FINAL): testes .test.cjs -> .test.mjs — node --test ===
# tests 5
# pass 5
# fail 0

=== VERIFICAÇÃO FINAL: nenhum resíduo CJS ===
0 ocorrências de require/module.exports
src:  formatador.mjs  index.mjs  parser.mjs
test: formatador.test.mjs  index.test.mjs  parser.test.mjs
```

Histórico git — um commit por arquivo migrado, cada um com suíte verde:

```
7bf8333 migrate: testes .test.cjs -> .test.mjs (ESM), migracao completa, suite verde
21dd6a0 migrate: index.cjs -> index.mjs (ESM) + consumidor, suite verde
62f5c90 migrate: formatador.cjs -> formatador.mjs (ESM) + consumidores, suite verde
2fe6911 migrate: parser.cjs -> parser.mjs (ESM), suite verde
756d890 baseline: estado CommonJS, suite verde (5 pass)
```

### Passo 5 — Relatório final: arquivo × migrado × testes

| Arquivo (inventário)      | Migrado para              | Testes após o passo | Observação |
|---------------------------|---------------------------|---------------------|------------|
| src/parser.cjs            | src/parser.mjs            | 5 pass / 0 fail     | — |
| src/formatador.cjs        | src/formatador.mjs        | 5 pass / 0 fail     | 1ª tentativa quebrou (2 fail: consumidores apontavam p/ `.cjs`) → revertida → 2ª tentativa ok |
| src/index.cjs             | src/index.mjs             | 5 pass / 0 fail     | — |
| test/parser.test.cjs      | test/parser.test.mjs      | 5 pass / 0 fail     | migrados por último, conforme inventário |
| test/formatador.test.cjs  | test/formatador.test.mjs  | 5 pass / 0 fail     | idem |
| test/index.test.cjs       | test/index.test.mjs       | 5 pass / 0 fail     | idem |

Migração **completa**: 6/6 arquivos migrados, 0 pendentes, 1 revert intermediário registrado.

## Como reproduzir

```bash
cd workflows/06-migrar-codigo/demo
node --test 2>&1 | grep -E '^# (tests|pass|fail)'   # DEPOIS (ESM): 5 pass / 0 fail
git log --oneline                                    # 1 commit por arquivo migrado
W=$(mktemp -d) && git worktree add -q "$W" "$(git rev-list --max-parents=0 HEAD)" \
  && (cd "$W" && echo '--- baseline CommonJS ---' && node --test 2>&1 | grep -E '^# (tests|pass|fail)') \
  && git worktree remove "$W"                        # ANTES (CJS): 5 pass / 0 fail
```

Saída observada na execução real: `5 pass / 0 fail` no estado final ESM, 5 commits no log, `5 pass / 0 fail` no baseline CommonJS reconstituído via worktree; exit 0.

## Valor para o dev

- **Bisseção grátis:** um commit verde por arquivo — quando algo quebra, o culpado é sempre o último arquivo tocado, nunca "algum dos 30 do mega-diff".
- **Falha barata:** o revert é cirúrgico (só o arquivo do passo), a suíte volta ao verde em segundos e o motivo fica anotado — a migração nunca fica num estado meio-quebrado.
- **Inventário como contrato:** a lista explícita + tabela final elimina o "acho que migrei tudo" — resíduos do padrão antigo são verificáveis por grep, não por memória.
