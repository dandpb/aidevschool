# AID-200 — handoff do run f6dbc5e1

## Disposição

**NO-GO crítico — `blocked`.**

O run `f6dbc5e1-b288-462b-b237-2703f0a36dd3` terminou com `adapter_failed` exclusivamente por esgotamento da cota do modelo GPT-5.3-Codex-Spark. Essa falha de infraestrutura não invalida a evidência independente já coletada para o candidato imutável `6a8e4946e0a6aeca65a0ce65`.

## Defeito bloqueador confirmado

Após uma tentativa rejeitada, o retry produz resultado do verificador com `pass:true`, porém o host preserva o primeiro `pass:false`, mantém a interface em “Evidência rejeitada” e não emite recibo aprovado correlacionado ao novo `attempt_id`.

## Owner e ação de desbloqueio

Owner: **Engenharia/Release**.

Para desbloquear, corrigir a persistência e correlação por tentativa, publicar um novo deploy imutável e solicitar nova QA independente em Chromium limpo.

## Restrições vigentes

- HOLD: não promover alias e não convidar coorte.
- Learner canônico e projeções devem permanecer inalterados.
- AID-190/AID-186/AID-185 e a decisão executiva sobre AID-180 não devem ser reconciliadas como GO enquanto este bloqueio persistir.

## Evidência existente

- `work-products/AID-200/QA_REPORT.md`
- `work-products/AID-200/qa-result.json`
- `work-products/AID-200/final-state.png`
- `work-products/AID-200/FINAL_DISPOSITION_2026-08-26.md`

