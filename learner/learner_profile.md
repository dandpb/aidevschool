# Perfil do Aprendiz — Ágora Continuum

> Whiteboard vivo do aprendiz. Atualizado pelo `sonda` (diagnóstico) e pelo orquestrador ao fim
> de cada unidade. Recuperável e auditável para retomar trilhas longas.

## Resumo

- **Nível autodeclarado:** intermediário (foco em robustez)
- **Linguagens foco:** Go, Rust, Node.js/TypeScript
- **Objetivo:** escrever código robusto e de qualidade (testes, design patterns, tratamento de
  erros, code review, refactoring) e raciocinar sobre arquitetura/escala.

## Matriz de competência (Dreyfus × Bloom)

| Conceito | Estágio (Dreyfus) | Nível cognitivo (Bloom) | Evidência |
|----------|-------------------|-------------------------|-----------|
| Test Design | Intermediário (Competent) | Aplicar (Apply) | Desenhou casos de teste cobrindo limites de capacidade, concorrência e vazão. |
| Raciocínio de Concorrência | Avançado (Proficient) | Analisar (Analyze) | Identificou escopo de concorrência explícita e tratamento de locks fora do I/O de rede. |
| Tratamento de Erro e Contrato | Intermediário (Competent) | Aplicar (Apply) | Seguiu à risca os cabeçalhos de resposta HTTP, códigos de status 429 e formato de dados. |
| Instinto de Refatoração | Intermediário (Competent) | Analisar (Analyze) | Associou riscos identificados (ex. spoofing de IP, OOM por map ilimitado) com passos seguros reversíveis. |

## Pré-requisitos comprovados

- _(unidades promovidas a `mastered` com evidência executável aparecem aqui)_

## Lacunas detectadas

- Sincronização e coordenação de locks em ambientes multi-processados com Node.js (cluster).
- Tratamento fino de clocks não-monotônicos durante NTP adjustments no refill do Token Bucket.


## Profile Note (2026-06-18)
No Dreyfus/Bloom level changes from prompt-gap implementation work. Documentation, dashboard,
and ecosystem contract work does not count as executable learning evidence. See
`learner/pitfalls.md` and `learner/journal.md` for curated process lessons from this cycle.
