# PRD — Notas de release a partir de commits

## Problema

Montar notas de release manualmente é lento e inconsistente: cada pessoa agrupa
mudanças de um jeito, esquece breaking changes e perde commits. O time revisa o
`git log` no olho e escreve o changelog na pressa, sempre diferente do anterior.

## Usuário

Programador(a) que mantém um repositório com commits no padrão Conventional
Commits e precisa publicar notas de release legíveis em minutos.

## Objetivo

Dada uma lista de commits, gerar notas de release em Markdown, agrupadas por
tipo, com breaking changes em destaque e sem descartar commits fora do padrão.

## Escopo

- Ler commits de um arquivo JSON (lista de objetos com `hash` e `message`).
- Classificar cada commit por tipo Conventional Commit (`feat`, `fix`, `docs`, ...).
- Agrupar em seções: Breaking changes, Novidades (feat), Correções (fix), Outras mudanças.
- Commits fora do padrão vão para uma seção própria, visível (nunca descartados).
- CLI: `python3 release_notes.py commits.json [--version v1.4.0]` imprime o Markdown.

## Fora de escopo

- Ler do git diretamente (subprocess, rede, `.git`). O JSON é o contrato de entrada.
- Ordenação por data, deduplicação de hash, multi-repo, changelog acumulativo.
- Qualquer dependência externa (stdlib apenas).

## Critérios de aceite

- [ ] `pytest test_release_notes.py` passa cobrindo: agrupamento, breaking change
      por `!` e por footer, commit fora do padrão, lista vazia, versão no título.
- [ ] CLI roda offline com um JSON de exemplo e imprime Markdown válido.
- [ ] Nenhum commit de entrada é descartado silenciosamente: a soma de entradas
      nas seções equals o número de commits de entrada.
- [ ] Saída determinística: mesma entrada, mesma saída.

## Riscos e decisões abertas

- Risco: mensagens com emoji ou prefixos exóticos (`🛡️ Sentinel: ...`) não casam
  com o parser → mitigado pela seção "fora do padrão" (falha visível).
- Decisão fechada: lista vazia é erro (`ValueError`), não release vazio. Falhar
  fechado é mais seguro que gerar um release sem mudanças.
