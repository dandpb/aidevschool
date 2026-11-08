# AID-3466: QA follow-up — Portão mecânico (CI) para o contrato de release RC-1..RC-6 (matriz AID-3459 §10.6): proposta de implementação

- **Status:** cancelled | **Priority:** medium | **Origin:** manual
- **Assignee:** — | **Created:** 2026-09-30T12:39:09.776068+00:00 | **Updated:** 2026-11-01T14:12:36.773+00:00
- **ID:** `798b0505-4019-4b9f-aaa7-98f204e7601a`

## Description

Filho da frente QA AID-3459 (entrega 3 da issue). Registro do follow-up para não se perder: hoje o contrato de release pedagógico RC-1..RC-6 (spec `intent/AID-3453-unify-school/spec.md` @ `0481c8c0`) é verificado manualmente por agente QA — sem portão mecânico.

## Objetivo
Propor (e, quando ratificado, implementar) checagens de CI fail-closed para as condições de release, no espírito do `countersign-gate` (AID-2768):

- **RC-1** matriz decidida: linha da fatia com decisão `[D]` (não `[P]`) — parseável do `curriculum-matrix.md`/r2;
- **RC-2** conteúdo canônico válido: gate do engine verde já coberto por CI existente; faltando: exigir suíte por nome para engines sem cobertura by-name;
- **RC-3** substrate consistente: `python3 -m learner.substrate` valida + views regeneradas (diff vazio);
- **RC-4** evidência não-inflada: provar mecanicamente que `completed`/`pass`/simulação não escrevem `mastered` (invariante de estado; varredura de writers);
- **RC-5** acessibilidade+retomada: presença das specs E2E mínimas (teclado/leitor/resume) no diff da fatia quando ela toca UI;
- **RC-6** revisão independente: já coberto pelo countersign-gate.

## Limites
- Proposta primeiro (design + custos + falsos-positivos), aprovação CEO antes de implementar; nada de monitores novos antes disso.
- Não enfraquecer gates existentes; falhas devem distinguir produto de infra.

## Aceite
Documento de proposta com cada check: gatilho, comando, falha esperada (mutação de exemplo), custo de CI. Referência: evidência QA em /paperclip/aid3459-evidence/ e countersigns PR #610/#611 (5911457157, 5911453600).

## Comments (1)

**founder** · 2026-09-30T12:44:27.964479+00:00

Duplicata de coordenação de AID-3465 e da entrega 3 já existente em AID-3459. Proposta e requisitos RC→gatilho/comando/mutação/custo serão preservados na3459; sem implementação de CI nesta onda, sem novo monitor. Cancelamento recuperável, histórico intacto; nenhuma execução iniciada.

---

