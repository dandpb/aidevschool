# Workflow 08 — Portão de release

## Problema que resolve

Release "na mão" quebra de quatro jeitos clássicos: sai com teste vermelho, o changelog não bate com o que de fato entrou, o bump de versão é chute (feat virando patch, breaking virando minor) e a tag não existe ou aponta para o commit errado. O comando `/release` transforma isso num portão único e verificável: suíte verde → commits classificados por convenção → changelog derivado do `git log` (nunca inventado) → bump coerente → commit + tag anotada → verificação cruzada de tag/changelog/versão. Qualquer falha aborta o release em vez de entregar inconsistência.

## O comando

`.claude/commands/release.md` — slash command genérico (serve para qualquer projeto com git + suíte de testes; nada amarrado ao demo). Aceita `$ARGUMENTS` como override opcional do bump (`major|minor|patch`). Os passos que ele codifica:

1. Rodar a suíte completa; falhou → abortar.
2. Ler commits desde a última tag (`git describe --tags --abbrev=0` + `git log <tag>..HEAD --oneline`); sem commits → abortar.
3. Classificar por convenção: `feat` → minor, `fix` → patch, `!`/`BREAKING CHANGE` → major; demais tipos não elevam. Bump = o mais alto encontrado.
4. Prepend de seção `## vX.Y.Z — data` no `CHANGELOG.md`, agrupada por tipo, cada linha com hash curto.
5. Bump do `version` no `package.json` coerente com a classificação.
6. Commit `chore(release): vX.Y.Z` (só manifesto + changelog) e tag anotada `vX.Y.Z`.
7. Verificação final: tag existe e aponta para HEAD, todos os hashes do passo 2 estão no changelog, versão == tag == título do changelog, suíte verde no commit taggeado. Falhou → desfaz a tag e reporta. Sem push automático (decisão humana).

## Execução real

Demo: cópia do projeto `tempo` (CLI de time tracking, Node 22 puro, `node:test`), `git init` só em `demo/`, commit inicial taggeado `v1.0.0`, e então 4 commits convencionais com mudanças reais de código (suporte a `1d` = jornada de 8h, trim de whitespace no parser, flag `--help`, docs).

**Histórico antes do release** (`git log --oneline`):

```
a15a089 docs: document day unit and --help in CLAUDE.md
7c9a40a feat: add --help flag to CLI
992976c fix: trim surrounding whitespace before parsing durations
c21e192 feat: support day unit (1d = 8h workday) in durations
d987c83 chore: initial project (tempo CLI)
```

**Passo 1 — suíte completa** (`npm test`):

```
# tests 7
# suites 0
# pass 7
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 124.49825
```

**Passo 2 — commits desde a última tag** (`git describe --tags --abbrev=0` + `git log v1.0.0..HEAD --oneline`):

```
v1.0.0
a15a089 docs: document day unit and --help in CLAUDE.md
7c9a40a feat: add --help flag to CLI
992976c fix: trim surrounding whitespace before parsing durations
c21e192 feat: support day unit (1d = 8h workday) in durations
```

**Passo 3 — classificação e bump:** 2× `feat` → minor; 1× `fix` → patch; 1× `docs` → não eleva. Bump final = **minor**: `1.0.0` → `1.1.0`.

**Passo 4 — CHANGELOG.md gerado** (conteúdo real do arquivo):

```markdown
# Changelog

## v1.1.0 — 2026-08-19

### Features
- 7c9a40a feat: add --help flag to CLI
- c21e192 feat: support day unit (1d = 8h workday) in durations

### Fixes
- 992976c fix: trim surrounding whitespace before parsing durations

### Outros
- a15a089 docs: document day unit and --help in CLAUDE.md
```

**Passo 5 — bump:** `package.json` atualizado para `"version": "1.1.0"`.

**Passo 6 — commit de release + tag anotada:**

```
[master 0d37051] chore(release): v1.1.0
 2 files changed, 14 insertions(+), 1 deletion(-)
 create mode 100644 CHANGELOG.md
```

seguido de `git tag -a v1.1.0 -m "Release v1.1.0"`.

**Passo 7 — verificação (saídas reais):**

```
-- tags:
v1.0.0
v1.1.0
-- describe:
v1.1.0
-- versao no package.json:
1.1.0
-- hashes do log presentes no changelog:
a15a089 OK
7c9a40a OK
992976c OK
c21e192 OK
-- suite no commit taggeado:
# pass 7
# fail 0
-- log final:
0d37051 chore(release): v1.1.0
a15a089 docs: document day unit and --help in CLAUDE.md
7c9a40a feat: add --help flag to CLI
992976c fix: trim surrounding whitespace before parsing durations
c21e192 feat: support day unit (1d = 8h workday) in durations
d987c83 chore: initial project (tempo CLI)
```

Todas as checagens do portão passaram: tag `v1.1.0` existe e é o HEAD, os 4 commits desde `v1.0.0` estão citados no changelog por hash, versão do manifesto == tag == título do changelog, suíte 7/7 verde no commit taggeado.

## Como reproduzir

```bash
set -e
cd workflows/08-preparar-release/demo
npm test                                   # 1) suite verde no estado lançado
git tag -l                                 # 2) tags: v1.0.0 e v1.1.0
git describe --tags | grep -qx v1.1.0      # 3) HEAD taggeado como v1.1.0
test "v$(node -p "require(\"./package.json\").version")" = "$(git describe --tags)"   # 4) versao == tag
for h in $(git log v1.0.0..v1.1.0^ --format=%h); do grep -q "$h" CHANGELOG.md; done   # 5) changelog cita todos os commits
git log --oneline
head -15 CHANGELOG.md
echo "PORTAO DE RELEASE: OK"
exit 0
```

Executado de verdade nesta máquina: imprime `PORTAO DE RELEASE: OK` e termina com exit 0 (qualquer checagem quebrada aborta antes, pelo `set -e`).

## Valor para o dev

- **Zero release quebrado:** a suíte roda antes de qualquer mudança de versão e de novo no commit taggeado — teste vermelho aborta o fluxo, nunca vira tag.
- **Changelog e semver deixam de ser opinião:** ambos são derivados mecanicamente dos commits convencionais (`feat` → minor, `fix` → patch, breaking → major), com cada entrada rastreável por hash.
- **Auditável em segundos:** tag anotada + verificação cruzada (tag == versão == título do changelog == hashes do log) significa que qualquer pessoa prova a integridade do release com 5 comandos git.
