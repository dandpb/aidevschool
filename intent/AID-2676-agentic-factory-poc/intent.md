# Intent: agentic factory — implementação prática da POC no produto

Author: founder (issue AID-2676) · Change-id: AID-2676-agentic-factory-poc · Status: accepted

> Origem: issue Paperclip AID-2676 ("agentic factory in our product"), corpo:
> "leia o html e implemente na pratica os conceitos." O HTML anexo
> `agentic-factory-poc-aidevschool.export.html` ("Da sequência de skills à
> fábrica agente", 25 set 2026) é a fonte primária desta mudança — link, não
> reescrita.

## Problem

O ecossistema já documenta o fluxo (TLC AI Dev Flow), tem contrato de prova
(tlc-spec-lean) e padrões operacionais (heropa-ai), mas a **continuidade
entre as estações** não existe como código: entrada, contrato, construção,
verificação e PR hoje dependem de coordenação manual na conversa. A proposta
anexa diagnóstica a lacuna e desenha a POC; está marcada "implementação ainda
não iniciada".

## Proposed outcome

Um MOTOR executável no repo (`factory/`) prova que um trabalho atravessa
entrada → contrato → construção → verificação → PR com estado recuperável e
evidência ligada ao mesmo commit, respeitando os critérios de saída P1–P5
(com casos negativos) e a fronteira de domínio (não tocar `learner/`,
`curriculum/`, `.mavis/`; produção fora do piloto).

## Affected users and systems

Repo-raiz (novo pacote `factory/` + `pyproject.toml` testpaths + map no
`AGENTS.md`); nenhum engine é alterado. `intent/` ganha o registro desta
própria mudança (dogfooding do contrato com `checks.md`).

## Constraints

- Registro canônico único (`intent/<change-id>/`) — não criar autoridade
  concorrente; compatibilidade tlc-spec-lean é spike declarado, não symlink.
- Runtime state fora do Git (`.scratch/factory/`, já gitignored).
- Producer ≠ verifier; promoção fail-closed (exit 0 isolado ≠ PASS).
- Stdlib only (sem dependências novas); Python ≥3.11.

## Open questions

1. Qual item real (bug/melhoria pequena em engine, com teste executável)
   será o primeiro caso de ponta-a-ponta da fábrica? (decisão do dono)
2. Escopo da POC confirmado como "terminar em PR/CI" (recomendação do HTML
   §06)? Staging/produção ficam de fora até haver sinais e autorização.
