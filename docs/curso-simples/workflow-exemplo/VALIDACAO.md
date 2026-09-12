# VALIDACAO — release notes (executada de verdade)

**Data:** 2026-08-21 · **Método:** cada comando abaixo foi executado nesta data.
Saídas coladas sem edição. Ambiente: Python 3.12.2, macOS, pytest.

## 1. RED — testes antes do código

Os 22 testes foram escritos primeiro. Primeira execução:

```text
$ python3 -m pytest test_release_notes.py -q
Interrupted: 1 error during collection        # módulo não existia ainda
```

## 2. GREEN — primeira implementação

```text
$ python3 -m pytest test_release_notes.py -q
1 failed, 21 passed in 0.14s
```

**A falha foi real e instrutiva:** `test_descricao_vazia_e_erro` — o caso de
borda 5 da spec (`feat: ` com descrição vazia) caía na seção "Fora do padrão"
em vez de falhar fechado. Correção: regex `_EMPTY_DESC_RE` que distingue
"suject bem formado mas vazio" (→ `ValueError`) de "suject fora do padrão"
(→ seção visível). É o aprendizado *validador genérico perde semântica*
aplicado na prática: `None` do parser significava duas coisas diferentes.

## 3. Suíte final

```text
$ python3 -m pytest test_release_notes.py -q
22 passed in 0.12s
```

## 4. CLI com commits reais do repo

`demo_commits.json` foi gerado do `git log` real do aidevschool (20 commits,
incluindo commits de agentes Sentinel/Bolt/Palette fora do padrão):

```text
$ python3 release_notes.py demo_commits.json --version v2026.08
# Release v2026.08

## ✨ Novidades
- **curso:** workflow lab + course page validators and skill pack (`1cf2271`)
- AI dev workflow teaching page + tested workflow library (`e63f0f0`)
...
## 🔍 Fora do padrão
- 🛡️ Sentinel: [HIGH] Fix XSS vulnerabilities in string interpolation (#126) (`301d2bc`)
- ⚡ Bolt: Optimize escapeHtml with RegExp fast-path (#123) (`177ff58`)
...
```

Saída completa em `VALIDACAO.md` não reproduzida aqui por economia; reproduza com
`python3 release_notes.py demo_commits.json --version v2026.08`.

## 5. Determinismo

```text
$ python3 release_notes.py demo_commits.json --version v2026.08 > /tmp/run1.md
$ python3 release_notes.py demo_commits.json --version v2026.08 > /tmp/run2.md
$ diff /tmp/run1.md /tmp/run2.md && echo OK
OK        # saídas idênticas
```

## 6. Falha fechada no CLI

JSON inválido → exit code ≠ 0 e mensagem no stderr (coberto por
`test_cli_json_invalido_falha_fechado`).

## 7. Contagem preservada

`test_nenhum_commit_e_descartado` garante: número de entradas renderizadas ==
número de commits de entrada. Na demo real: 20 commits → 20 entradas nas seções
(11 classificadas + 9 fora do padrão).

## Limitações conhecidas (fora de escopo por decisão)

- Não lê `.git` diretamente (contrato de entrada é JSON).
- Não deduplica hashes nem ordena por data.
- Footer `BREAKING-CHANGE` (hífen, variante da spec) é aceito, mas apenas um
  footer por commit.

## Como reproduzir tudo

```bash
cd docs/curso-simples/workflow-exemplo
python3 -m pytest test_release_notes.py -q          # 22 passed
python3 release_notes.py demo_commits.json --version v2026.08
```
