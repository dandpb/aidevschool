# Intent: VERIFIER WAVE 1 — tripwire de cobertura, avaliadores 11+12, verificador de checklist ADR-0004

Author: Verifier & Evidence Engineer (Paperclip AID-1594, ORDEM AID-1592/B, card CEO `a0a9a93a`; registro retroativo cobrado pela auditoria SDLC AID-1603/F2) · Change-id: `AID-1594-vee-verifier-prs` · Status: accepted

> Origina da ORDEM AID-1592/B (Paperclip AID-1594, despacho do sweep AID-1592,
> CEO 2026-09-13 ~03:0xZ). Decisão aprovada via card `a0a9a93a`
> (request_confirmation na AID-1582; accept formal é rota board-only p/ agentes,
> 403 verificado — a ORDEM é o registro canônico). Citação sem reescrita:
>
> "1. **PR1 (tripwire de cobertura)** primeiro:
> `learner/gate/tests/test_gate_game_coverage.py` com allowlist explícita —
> protege o gate durante a adição de avaliadores.
> 2. **PR2 (avaliadores 11+12)**: AIR TRAFFIC + MISSION CONTROL + entradas
> GAME_SPECS + testes de aceitação/rejeição. **HASH RING (10) permanece
> condicionado** ao fix de `engines/voxelDojo/catalog.json:48` (encaminhado ao
> Curriculum Platform Engineer; producer≠verifier preservado).
> 3. **PR3 (verificador de checklist ADR-0004)**:
> `learner/gate/no_code_checklist.py`, fail-closed, receipt digest-bound;
> Prometor como countersign humano.
> 4. Todas pequenas/reversíveis, **PR-first SEM merge em main** (single-writer
> FPE até R1)."

Nota de honestidade: este registro foi criado **pré-merge** mas
**pós-abertura das PRs** (a execução seguiu a ORDEM diretamente; o recibo de
execução está na AID-1582, comentário `db8af478`, 2026-09-13T03:31Z). A
auditoria SDLC AID-1597/F2 (AID-1603) detectou a falta do artefato da cadeia em
`intent/` — este diretório fecha essa lacuna de rastreabilidade sem alterar
nenhuma decisão: tudo abaixo já foi decidido no card `a0a9a93a` e executado
nas PRs #365/#366/#367 (nenhuma merged na criação deste registro).

## Problem

O verifier-map do onboarding VEE (AID-1582, comentário `f3354922`) mapeou as
lacunas do princípio de ouro — `mastered` só emana de verificador
determinístico, nunca de LLM:

- **L5**: sem tripwire de cobertura gates×checks — adicionar/remover
  avaliadores ou jogos silenciosamente desalinha o bridge
  (`learner/gate/teaching_game_bridge.py:29-72` cobria 7/16 jogos).
- **L1**: 9 jogos (10–18) sem avaliador no bridge; PR2 fecha 2 (AIR TRAFFIC
  U11, MISSION CONTROL U12).
- **L3**: checklist falsificável da trilha no-code (ADR-0004) 100% manual
  (`curriculum/catalog.md:46` marca Prometor pendente) — Level 0 sem tooling
  auditável.

## Proposed outcome

1. CI quebra (2 sentidos) se `voxelDojo/catalog.json` × `GAME_SPECS` ×
   avaliadores do bridge divergirem — allowlist explícita de dívida no estilo
   `anchorCheckIds` (PR1, #365).
2. Jogos 11+12 com avaliadores independentes que rejeitam métricas forjadas /
   pass falso (producer ≠ verifier) (PR2, #366).
3. `learner/gate/no_code_checklist.py`: parser estrutural fail-closed do
   artifact do aprendiz, receipt digest-bound; `mastery_eligible` **sempre
   false** — o countersign humano do Prometor (ADR-0004 §3) permanece o
   veredito final (PR3, #367).
4. Nenhum merge em `main` por esta onda: single-writer FPE até R1, merge
   order PR1→PR2→PR3 despachada via relay AID-1600.

## Affected users and systems

`learner/gate/` (tests, bridge, verificador novo), CI (suite de gates),
trilha no-code 00 (contrato de artifact ADR-0004). Nenhuma engine de produto
é alterada; nenhum conteúdo pedagógico (curriculum/) é tocado.

## Constraints

- **HASH RING (game-10) fora do PR2**: condicionado ao fix do `unitId`
  inconsistente em `engines/voxelDojo/catalog.json:48`
  (`"game-10-hash-ring"` com `"unitId": "U9-distributed-cache"`) — dono do
  fix: Curriculum Platform Engineer (producer≠verifier preservado).
- Única edição de teste permitida: encolhimento consciente da allowlist
  `ALLOWED_UNVERIFIED` 9→7 no PR2 (fortalece o tripwire), coberta pelo
  trailer `SDLC-ALLOW-TEST-EDIT: AID-1594` (política AID-554/AID-1136).
- PR-first, pequenas/reversíveis, sem merge em `main`, sem deploy/produção.
- **Merge do PR #367 exige countersign humano do Promotor registrado**
  (ORDEM AID-1592/B item 3): o verificador é estrutural e declara
  `promoter_countersign_required: true`; a revisão humana do Prometor não é
  substituída nem representada pelo tooling.

## Open questions

- HASH RING (10): quando o `unitId` de game-10 for corrigido pela Curriculum
  Platform Engineer, abrir avaliador + entrada GAME_SPECS em PR própria
  (allowlist encolhe 7→6) — carry-forward, não bloqueia esta onda.
- Produtores dos jogos 11/12 passarem a emitir `observations` no artifact
  (Learning Engine Engineer) — follow-up natural, não bloqueia.
