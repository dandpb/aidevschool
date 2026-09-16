# Observation scripts — dojotoday re-grant v90 (AID-2206 / relay CEO AID-2224)

Método da observação independente (assessorContext `independent-readiness-review`,
observerContext `independent-readiness-observer`) para o use case
`dojotoday-daily-guidance` re-ancorado sobre a main `15d69d50` após o
STALE-WINDOW pós-merge #460 (run 35147464091; AID-2206, mesma classe do
precedente v28 `2026-09-04-289cdbd-dojotoday-xsschain-regrant-v28`, cadeia XSS
#262/#264/#265):

- `dojotoday-daily-guidance` — cenários `dojotoday-active-unit-guidance`,
  `dojotoday-read-only-boundary`, `dojotoday-returning-next-day`.

Cadeia do re-grant (GO CEO relay AID-2224 @ 22:05Z; PR #461 merged 22:04:09Z):

1. PR #460 (Sentinel HIGH XSS dojoToday, merge `58098bb5`) mudou
   `engines/dojoToday/src/main.ts` sob os sourcePaths do use case → stale
   mecânico dos 3 cenários (fingerprint de fonte).
2. Downgrade deliberado v89 (PR #464, merge `6611dac8`) — re-grant retido até a
   guarda de mutação pousar (precedência #262→#264→#265).
3. Guarda AID-2205 (PR #465, merge `15e5454d`): numeric-fields-escape.spec.ts +
   fixtures hostis (`today.numeric-hostile.ts`/`today.numeric-hostile-record.ts`,
   servers 5183/5184) — falham se qualquer escapeHtml ou Number(...)||0 do diff
   do #460 for removida.
4. PR #461 (re-grant v88 dos outros 8 UCs, AID-2199/AID-2213) merged `15d69d50`
   preservando dojotoday no v89 downgraded — zero dependências restantes.
5. Esta re-validação independente v90 sobre `15d69d50` com a guarda no lugar.

## Producer gates (executados first-hand na árvore 15d69d50, worktree limpo)

Runtime: node 24.18.0 (CI: node 20), Python 3.13.5 (fsrs+pyyaml do root
`pip install -e ".[dev]"`). `npm ci --include=dev` (o ambiente de sessão tinha
`NODE_ENV=production`, que omitiria devDependencies — igual ao CI em espírito).
Ports fixas 5180-5184 com `--strictPort` (guards falham rápido se ocupadas).

1. `engines/dojoToday` — `npm run selfcheck` → OK: dojotoday self-check passed
   (track + game_dir).
2. `npm run lint` (biome, 19 files) → sem achados.
3. `npm run build` (`tsc --noEmit` + vite build) → OK.
4. `npm run test:readiness` (= selfcheck + playwright + readiness-report):
   **25 passed** — incl. `readiness.spec.ts` (active-unit-guidance),
   `continuity.spec.ts` (returning-next-day), `numeric-fields-escape.spec.ts`
   (guarda AID-2205: 2 testes contra projeções hostis) e `hosted-os.spec.ts`
   (fronteira de autoridade da vista hosted). Reports emitidos em
   `engines/dojoToday/test-results/readiness/` (2 cenários playwright) e
   arquivados em `../logs/dojotoday-readiness/`. O cenário
   `dojotoday-read-only-boundary` é observation/document-review-only (argv
   `npm run selfcheck` — fato de producer registrado acima).

A árvore no momento dos gates era exatamente main `15d69d50` (worktree limpo;
node_modules/dist/test-results são outputs não rastreados fora dos
sourcePaths; `evidence/observations/` não entra em nenhum sourcePath) —
fingerprints idênticos aos da main.

## Observação documental first-hand

Guias (`student-guide.md`:233-247 / `facilitator-guide.md`:307,318-319,328-330,337
— âncoras manualRefs do inventory.yaml) + walk de código na árvore `15d69d50`
com citações arquivo:linha em `../observations.json`. Notas verificam também
que a mudança que causou o stale window (#460, render-time escaping/coerção em
`src/main.ts`) é estritamente de view rendering — sem caminho de escrita de
estado do aprendiz — e que a guarda AID-2205 vigente na árvore protege a classe
de mutação (cadeia #262→#264→#265 respeitada, agora #460+#465).

Sem scripts de browser extras: os 3 cenários já possuem automação própria ou
são observation-only (`dojotoday-read-only-boundary`); a camada independente é
documental (evidence `observation`/`document-review`), arquivada em
`../observations.json`. Logs das execuções em `../logs/`.
