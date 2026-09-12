# AID-197 — handoff de engenharia para QA independente

**Data:** 2026-08-26 UTC  
**Disposição do produtor:** `in_review` — implementação verificada localmente; requer repetição
independente do roteiro AID-194 antes de qualquer promoção de candidato.

## Resultado

O host agora usa o `messageId` da entrega como identidade estável da evidência e mantém o
`missionRunId` como identidade da sessão. Assim, o retry do WAREHOUSE pode persistir uma segunda
tentativa sem sobrescrever nem colidir com a primeira. O intake também ordena aceitações ocorridas
no mesmo milissegundo, para que `latest()` restaure a tentativa mais recente.

Nenhum estado canônico do learner foi alterado e nenhum `mastered` foi produzido.

## Arquivos-fonte

- `engines/codexdojo-os-prototype/src/host/missionSessionTransitions.ts`
- `engines/codexdojo-os-prototype/src/verification/ports.ts`
- `engines/codexdojo-os-prototype/src/verification/evidenceIntake.ts`
- `engines/codexdojo-os-prototype/src/verification/evidenceIntakeTeachingGame.test.ts`
- fixtures/testes adjacentes atualizados para o contrato explícito de `evidenceId`.

## Evidência executável do produtor

```text
cd engines/codexdojo-os-prototype
npm test -- --run src/verification/evidenceIntakeTeachingGame.test.ts \
  src/verification/evidenceIntakePersistence.test.ts \
  src/host/MissionSessionController.protocol.test.ts
# 3 arquivos, 14 testes: PASS

npm run build
# tsc -b + vite build: PASS; 1864 módulos transformados

npm run lint
# PASS sem erros; 26 warnings CSS preexistentes

git diff --check
# PASS
```

O teste regressivo prova duas evidências distintas no mesmo `missionRunId`: a primeira com
`pass:false`, a segunda com `pass:true`, ambas persistidas por `evidenceId`, duas chamadas ao
verificador e restauração de `latest()` apontando para o recibo PASS da segunda tentativa.

## Revisão solicitada

Revisor independente: repetir o roteiro `work-products/AID-194/qa-warehouse-candidate.mjs` sobre
um novo candidato imutável e confirmar no IndexedDB dois registros de evidência, recibo independente
para a segunda tentativa e UI `Verificação independente aprovada`. Alias e convites permanecem em
HOLD até essa aceitação; o produtor não declara release nem aprovação própria.
