# AID-200 — registro do heartbeat ba6efaf6

- Run: `ba6efaf6-6892-4fd3-8a00-aa58b7cf8bfe`
- Resultado do adaptador: falha de infraestrutura por limite de uso do GPT-5.3-Codex-Spark.
- Impacto na QA: nenhum; a falha ocorreu no adaptador e não invalida a evidência independente já coletada.
- Disposição: **NO-GO / blocked**.
- Defeito bloqueador: no retry, a nova tentativa produz `pass:true`, mas o host preserva o primeiro `pass:false`, mantém “Evidência rejeitada” e não emite recibo aprovado correlacionado ao novo `attempt_id`.
- Owner do desbloqueio: **Engenharia/Release**.
- Ação de desbloqueio: corrigir persistência/correlação por tentativa, publicar novo deploy imutável e solicitar nova QA independente.
- HOLD: não promover alias e não convidar coorte.
- Integridade: learner canônico e projeções permanecem inalterados.

Referência principal: `work-products/AID-200/FINAL_DISPOSITION_2026-08-26.md`.
