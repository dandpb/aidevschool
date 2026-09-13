# Intent: triagem do ruído da fábrica de re-grant (§5.1) + anexo §5.3

Author: Paperclip AID-1738 (assigned to Engine Systems Engineer) ·
Change-id: AID-1738-regrant-noise-triage ·
Status: accepted (ORDEM carrier AID-1714/r3-B, countersign CEO e0e08f4b citado no corpo da AID-1738)

> One source of truth: o corpo da issue AID-1738. Trecho decisivo (tradução do
> escopo): "Triage do ruído da fábrica de re-grant (sem mudança de settings):
> root-cause das CI failures `regrant/auto-*` (#1070, #1079; jobs inacessíveis
> pós-delete de branch) + recomendação de política (auto-delete vs diagnóstico
> durável) — entregue como doc/decisão no repo com evidência. §5.3 (elevar gates
> a required) NÃO executa: fica como análise anexa no doc da §5.1, sem tocar
> branch protection."

## Problem

A auditoria de onboarding ESE (AID-1716, recibo a4c30b89 §4) verificou que as
únicas runs não-sucesso do workflow CI na janela auditada viviam em branches
efêmeras `regrant/auto-*` criadas pela fábrica de re-grant
(`readiness-regrant.yml`, AID-1357/AID-1669), e que após o delete da branch os
jobs daquelas runs ficam inacessíveis pela API — vermelho sem causa
reconstruível, i.e. ruído que corrói o significado de "CI vermelho".

## Outcome

- Doc de decisão `docs/product-readiness/REGRANT-FACTORY-NOISE-TRIAGE-2026-09-13.md`
  com: inventário first-hand das runs (#1070/#1074/#1079), root-cause em cadeia,
  reprodução do apagão diagnóstico, valor de sinal, opções de política com
  trade-offs e recomendação (diagnóstico durável no cleanup + convenção de
  consumo; auto-delete permanece).
- Anexo §5.3 (análise only): elevação de gates a required — sem NENHUMA mudança
  em branch protection (dono desse caminho: kit de ativação R1 / AID-1555).
- Cross-link no `REGRANT-RUNBOOK.md` apontando para o doc (lifecycle de drill).

## Constraints

- Zero mudança de settings/branch protection/workflows neste change (doc-only).
- Evidência first-hand citável: todos os fatos de API foram coletados em
  2026-09-13 pelos endpoints listados no doc (reproduzíveis por qualquer
  revisor com credencial de leitura).
