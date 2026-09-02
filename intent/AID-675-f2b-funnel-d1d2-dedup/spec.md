# Spec — AID-675 F2b

**Autoritativa: doc `spec` rev 1 na issue AID-673, §2 (System Designer,
2026-09-02).** Este arquivo apenas aponta — nenhuma decisão é duplicada aqui.
Implementar o §2 literal: dedup por `eventId` (ordem de sort vigente), seis
seções novas (`reportVersion: 2`) com k≥5/célula, markdown, fixtures + exemplos
regenerados byte-idênticos, testes estendidos, CLI fail-closed inalterado.

Método local adicional (não conflita com o §2): números esperados dos fixtures
são derivados por recompute independente (script Python de terceira via) antes
de serem gravados nos testes — produtor ≠ verificador começa em casa.
