# SPEC — Núcleo puro de release notes

## Estado atual → estado desejado

Hoje não existe gerador; o changelog é escrito à mão. Meta: um módulo Python
puro, sem dependências, que transforma lista de commits em Markdown estável.

## Interface

```python
parse_subject(message: str) -> ParsedCommit | None
# ParsedCommit: {type: str, scope: str|None, breaking: bool, description: str}

generate_release_notes(commits: Iterable[Mapping], version: str | None = None) -> str
```

### Entrada

Iterável de mappings com chaves:
- `hash` (str, obrigatória, não vazia)
- `message` (str, obrigatória, não vazia) — primeira linha é o subject; o resto
  do corpo é inspecionado para `BREAKING CHANGE:`.

### Saída

Markdown com esta ordem fixa de seções (seções vazias são omitidas):

```
# Release <version>            (ou "# Release notes" sem versão)

## ⚠️ Breaking changes
- **scope:** descrição (`hash7`)

## ✨ Novidades
- descrição (`hash7`)

## 🐛 Correções
- descrição (`hash7`)

## 📦 Outras mudanças
- **docs:** descrição (`hash7`)
- **refactor:** descrição (`hash7`)
```

Regras de formatação:
- Hash curto: 7 primeiros caracteres.
- Escopo aparece em negrito antes da descrição quando existe.
- Ordem dentro de cada seção = ordem da entrada (determinístico).
- Tipos conhecidos: feat, fix, docs, style, refactor, perf, test, build, ci, chore.
- `feat` → Novidades; `fix` → Correções; demais conhecidos → Outras mudanças
  (com rótulo do tipo em negrito).

### Erros (falha fechada)

- Lista vazia → `ValueError("no commits to release")`.
- Commit sem `hash` ou sem `message` → `ValueError` citando o índice.
- Subject fora do padrão Conventional Commit → seção "Fora do padrão", nunca descarte.

## Casos de borda

1. `feat!: x` e `feat(scope)!: x` → breaking pelo `!`.
2. Corpo com `BREAKING CHANGE: x` → breaking pelo footer (a descrição do footer
   entra como linha extra na seção de breaking).
3. Tipo desconhecido (`featx: x`) → Fora do padrão.
4. Subject sem `:` → Fora do padrão.
5. Descrição vazia após o tipo (`feat: `) → ValueError citando o índice.

## Arquivos permitidos

- `release_notes.py`, `test_release_notes.py`, `demo_commits.json` — nada além.

## Estratégia de teste

pytest, stdlib apenas. Testes: agrupamento por tipo, ordem preservada, breaking
por `!` e por footer, fora-do-padão visível, erros de entrada, versão no título,
determinismo (duas chamadas, saídas idênticas), contagem total preservada.

## Ordem de implementação

1. `parse_subject` + testes de parsing.
2. Agrupamento e render Markdown + testes de seção.
3. Erros e casos de borda + testes de falha fechada.
4. CLI (leitura de JSON, `--version`) + demo com commits reais.

## Não-metas

- Não ler `.git`. Não ordenar por data. Não deduplicar. Não internacionalizar.
