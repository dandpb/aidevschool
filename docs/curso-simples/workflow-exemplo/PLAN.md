# PLAN — fatias de execução (aprovado antes do build)

Restrição de modo: cada fatia implementa somente o seu escopo; teste primeiro.

## Fatia 1 — parsing do subject

- Implementar `parse_subject`: regex `tipo(escopo)?!?: descrição`.
- Testes: tipos conhecidos, escopo, `!`, sujeito sem padrão → `None`.
- Validação: `pytest -k parse`.

## Fatia 2 — agrupamento e render

- Implementar `generate_release_notes`: agrupar, ordenar seções fixas, formatar.
- Testes: seções corretas, ordem preservada, hash curto, escopo em negrito.
- Validação: `pytest -k render or agrup`.

## Fatia 3 — falha fechada e bordas

- Erros: lista vazia, hash/message ausentes, descrição vazia.
- Bordas: footer `BREAKING CHANGE:`, tipo desconhecido → Fora do padrão.
- Testes de erro com `pytest.raises`.
- Validação: `pytest` completo.

## Fatia 4 — CLI e demo

- `__main__`: ler JSON, `--version` opcional, imprimir Markdown.
- `demo_commits.json` com commits reais do repo.
- Validação: rodar o CLI duas vezes e conferir saída idêntica (determinismo).

## Critério de pronto (DoD da feature)

- [ ] Suíte verde com número de testes declarado
- [ ] CLI demonstrado com saída colada na VALIDACAO.md
- [ ] Nenhum commit descartado silenciosamente (teste de contagem)
- [ ] Aprendizado promovido: skill `gerar-release-notes.md`
