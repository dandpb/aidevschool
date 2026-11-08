<!-- issue: AID-731 | key: brief | doc_id: cd1f7b2b-88fe-42fc-8648-f758167bb72e | updated: 2026-09-03 12:07:07.774+00 -->

# Desbloqueio AID-731 — Brief de objetivos e próximas tarefas (2026-09-03)

(AID-731)

# Desbloqueio AID-731 — Brief (2026-09-03, CEO)

## 1. Objetivos (verificados, não re-perguntados)

- **Missão:** democratizar conhecimento e aplicação de IA com lições curtas e práticas em ritmo Duolingo — para quem quer usar IA sem programar e para devs que querem construir software robusto com IA.
- **Regra do programa em pé:** validação com uso real antes de expandir currículo — **O3-C2 (l08–l13, +12 atividades) segue RESERVADA** até O3-C1 sustentar + evidência OP-B (AID-644 §RESERVADO).

## 2. Estado atual (evidência 2026-09-03 ~12:0xZ)

- **29/29 lições ready · 8/8 use-cases pass** @ re-grant v26 (QA AID-719, pin `0b8148e5`).
- Kit de facilitador do **piloto P6** entregue (AID-720 / PR #259).
- **Janela 21d O3-C1** em curso — checkpoint d+1 hoje 17:16Z; watchdog SD saudável (0 tentativas).
- **CI main VERMELHO** @ `59359d60` (run 33734625483 `failure`): defect **AID-722** (job `dojoToday` sem producer report → `product readiness (claims)` BLOCKED).
- **Fix pronto e verificado:** PR #260 (`d33232ad`, mergeable, ci-only: +122/−0 em 3 arquivos) — **QA GO pré-merge independente** (AID-724 comentário `7c85d6e6`; republicado na AID-723 comentário `55ff0811`, ao lado do gate de merge).
- **Plataforma:** bug do watchdog fingerprint (AID-727) — veredito SM: defect confirmado no código; contenção ativa (watchdog `6fe85bd6` removido, sem trigger 4).

## 3. Corrente crítica — tudo converge em ações do founder

1. **MERGE PR #260** (desbloqueia o CI main): gate `d6a28d7d` na AID-723 (request_confirmation, pending desde 09:16Z). Caminho pós-aceite já vivo: FPE acorda (accept-wake) → revalida enforce no commit de merge → receipt final → fecha AID-723 + AID-722 → AID-725 `done` → QA reabre AID-724 → verificação final → `done`.
2. **GATE AID-727** (`ad2475cf`, pending): aceitar a triage do SM. Rota board-only (CEO tentou aceitar primeiro-mão: 403 por design). Recomendação CEO alinhada à do SM: **escalar upstream** + manter contenção.
3. **Decisões do programa** (card herdado da AID-718): transporte OP-B ON no piloto + confirmar alunos/janela → é a única fonte de evidência OP-B que destrava O3-C2.
4. Cards founder mais antigos (higiene do board): AID-641 (recrutamento n=5–8 devs), AID-699 (card `26d4fc07`), AID-570 (5 interações stale, board-only).

## 4. Delegação — nada órfão, todos com caminho first-class

| Issue | Dono | Estado | Caminho vivo |
| --- | --- | --- | --- |
| AID-725 | FPE | blocked | accept-wake do gate `d6a28d7d` |
| AID-724 | QA | blocked | wake pós-receipt da AID-725 |
| AID-727 | SM | in_review | gate `ad2475cf` (board-only) |
| AID-670 | SD | todo | watchdog d+1 hoje 17:16Z |
| AID-641 | UX | in_progress | card founder de recrutamento |
| AID-699 | SD | in_review | card founder `26d4fc07` |
| AID-570 | CEO | blocked | founder, board-only |
| AID-731 | CEO | in_review | card founder desta issue (ask_user_questions) |

## 5. Pacote de escalonamento AID-727 (para o founder abrir com os mantenedores do Paperclip)

- **Componente:** `@paperclipai/server` — `services/task-watchdogs.js` — `stableStopFingerprint` (~L96) hasheia folhas com `updatedAt`/`latestCommentAt`/`latestDocumentAt`/`latestWorkProductAt`; o bookkeeping de conclusão de rodada watchdog (acks/comentários pós-rodada) regenera o fingerprint da própria issue vigiada → **self-retrigger**.
- **Agravante:** `recovery/service.js:1465` retorna 403 para snooze de watchdog pelo próprio agent watchdog — sem rota de escape pelo agente.
- **Evidência:** AID-725/AID-726 — 3 triggers encadeados em ~15 min, todos NO-OP com estado externo inalterado; veredito SM com leitura read-only do pacote instalado.
- **Contenção aplicada (manter até fix):** watchdog `6fe85bd6` removido (09:49:18Z, DELETE 200); sem trigger 4; gates humanos intactos; regra: não recriar watchdogs em subtrees estáticos com gate humano pendente.
- **Impacto:** queima de heartbeats em rodadas no-op; risco de loop em qualquer watchdog cujo subtree receba bookkeeping próprio.
- **Watch adicional CEO:** watchdog da AID-670 (janela 21d O3-C1) dispara d+1 hoje 17:16Z; se apresentar o mesmo loop pós-checkpoint, mesma mitigação (remoção + checkpoints agendados como issues datadas).

## 6. Novos agentes

**Nenhum.** Cobertura atual (CEO / System Designer / Content Designer / FPE / QA Lead / UX / SDLC SM) cobre toda a carga visível. Os gargalos restantes são decisões e execuções humanas (founder), não capacidade de agente. Reavaliar quando O3-C2 entrar no board (mais um par SD+CD em paralelo provavelmente basta, sem novo papel).
