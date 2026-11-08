<!-- issue: AID-866 | key: baseline-l08-l13 | doc_id: 4c6d84f2-8fae-463d-be80-66fae187c51b | updated: 2026-09-05 18:19:55.235+00 -->

# AID-866 — QA BASELINE CORRENTE l08–l13 (superfície alvo O3-C2) @ pin ef67fb06 — veredito: pronta p/ retrofit C2 (advisory)

(AID-866)

# QA — Baseline corrente l08–l13 (superfície O3-C2) — validação exploratória read-only

**Owner:** QA Lead (ca6a3f95). **Veredito executivo:** a superfície l08–l13 está **PRONTA para o retrofit C2** no pin vigente — 6/6 lições íntegras em conteúdo e runtime, gates do engine verdes, zero defeito de produto encontrado. 1 achado de **infraestrutura** de teste (colisão/reuso de porta no E2E — child issue criada), 2 observações advisory. Insumo para o GO d+7 (AID-852 passo 4).

## 1. Ambiente e pin (reprodutível)

- Workspace: project primary, branch `main` @ `869d3c2b`; `git diff --stat ef67fb06..HEAD` = apenas `_work-products/`/docs ⇒ **código do app idêntico ao pin `ef67fb06`**.
- Runtime: `engines/literacyDojo` (React/Vite), dev server próprio porta 4207 (`VITE_LITERACY_E2E=1` p/ ponte de evidência; NOTA: `NODE_ENV=production` herdado desliga `import.meta.env.DEV` — a flag explícita é necessária, comportamento já documentado no config).
- contentVersion observado em 3 camadas: `catalog.yaml` = `2026-09-04.1`; read model gerado `src/data/generated/lessons.ts` = `2026-09-04.1`; doc de progresso local (IndexedDB) = `2026-09-04.1`.
- Árvore git permaneceu **limpa** durante toda a sessão (gen:content idempotente; zero commits/merges/produção). Estado canônico do learner intacto; progresso usado foi local em perfil efêmero de navegador.

## 2. Gates do engine @ pin (comandos executados em `engines/literacyDojo`)

| Gate | Comando | Resultado |
| --- | --- | --- |
| Lint | `npm run lint` | PASS (81 arquivos, biome) |
| Unit | `npm test` | PASS **148/148** (19 files) |
| Build | `npm run build` | PASS (tsc -b + vite; dist 427,9 kB js) |
| E2E | `LITERACY_E2E_APP_PORT=4321 LITERACY_E2E_PWA_PORT=4322 npx playwright test` | PASS **9/9** (app 8 + pwa 1) |

Logs brutos anexados: `gates.log`, `e2e.log`.

## 3. Claims do pre-draft (AID-838 proposal rev 2 §1) vs catálogo canônico — 6/6 PASS

Conferência YAML canônico (`curriculum/ai-literacy/modules/{03,04}`) + read model gerado (75 atividades = 23×3 + l08–l13×1):

| Lição | version | atvs | tipo a1 | rubrica | min | storage a1 | veredito |
| --- | --- | --- | --- | --- | --- | --- | --- |
| l08 | v1 | [a1] | output_comparison | 2 | 3 | structured_only | **PASS** |
| l09 | v1 | [a1] | rubric_review | 3 | 4 | structured_only | **PASS** |
| l10 | v1 | [a1] | choice (multi) | 2 | 3 | structured_only | **PASS** |
| l11 | v1 | [a1] | sort | 2 | 4 | structured_only | **PASS** |
| l12 | **v2** | [a1] | safety_classification | 3 | 4 | structured_only | **PASS** |
| l13 | v1 | [a1] | prompt_builder | 3 | 5 | **digest_only** | **PASS** |

## 4. Passada exploratória read-only no runtime — 6/6 PASS + sonda de falha PASS

Método: script Playwright externo ao repo (`explore.mjs` anexo; perfil efêmero; progresso local semeado apenas p/ desbloquear l08 — cadeia l07→l08 respeitada; zero escritas no repo). Por lição: mapa → intro → start → atividade a1 respondida corretamente → submit → feedback → finish → resultado → progresso → evidência.

| Lição | navegação+intro | resposta correta aceita | feedback onSuccess | "Lição concluída" | progresso local | envelope evidência | storage na evidência |
| --- | --- | --- | --- | --- | --- | --- | --- |
| l08 | OK | OK | OK | OK | completed | OK | structured c/ answer |
| l09 | OK | OK | OK | OK | completed | OK | structured c/ answer |
| l10 | OK | OK | OK | OK | completed | OK | structured c/ answer |
| l11 | OK | OK | OK | OK | completed | OK | structured c/ answer |
| l12 | OK | OK | OK | OK | completed | OK (**lessonVersion: 2**) | structured c/ answer |
| l13 | OK | OK | OK | OK | completed | OK | **digest_only SEM answer** |

- Envelope validado por registro: `schemaVersion:1`, `source:"literacydojo"`, `verifierRequired:true`, `attemptId`, `lessonId/activityId`, `pass:true`, `timestamp`. 0 erros de console em toda a sessão.
- **Sem** `retrofit-notice-s2` em nenhuma intro (correto p/ lições nunca concluídas no perfil).
- **Sonda de caminho de erro (l08):** resposta errada → `onFailure` correto; "Pedir dica" → dica #1 com texto do conteúdo; botão **esgota após 2 dicas** (l08 tem 2); "Tentar novamente" OK.
- Rubrica aplicada em runtime: l09-a1 `rubric_review` avalia os critérios da rubrica com verdicts esperados — aceitos corretamente.

## 5. Tempo nominal vs real (limitação declarada)

Tempo de máquina por atividade (script): 238–567 ms — **limite inferior, não mede leitura humana**. Proxy de carga de leitura (chars de instrução+dados ÷ minutos nominais): l08 **320** · l09 179 · l10 121 · l11 82 · l12 132 · l13 94. **l08 é a lição mais densa** da onda (≈1,1k chars + decisão em 3 min); a spec C2 já propõe 3→4 min — coerente, mas vale monitorar pós-C2.

## 6. Achados

### 6.1 Infraestrutura (child issue criada) — severidade MÉDIA p/ processo de onda, não produto
- **E2E reusa servidor vivo em porta ocupada por outro app** (`reuseExistingServer:!CI`): 1ª rodada com porta ocupada por servidor alheio (dojoToday) ⇒ 8/9 FALSES falhas (app errado sob teste). Rerun em portas verificadas livres ⇒ 9/9 PASS. Reproduzível (`LITERACY_E2E_APP_PORT` apontando p/ porta ocupada). Risco p/ ondas T2/T3 se portas colidirem no host compartilhado.

### 6.2 Observações advisory (sem child issue; não bloqueiam C2)
- **O1 (não-confirmada):** cliques rápidos duplicados em "Pedir dica" podem registrar a mesma dica 2× (race de estado assíncrono). Não reproduz com sincronização adequada; registrar p/ investigação futura se ressurdir.
- **O2:** `NODE_ENV=production` herdado desliga a ponte de evidência em dev (`import.meta.env.DEV` falso) — mitigado por `VITE_LITERACY_E2E=1` (já é o comportamento desenhado; documentar p/ futuras sessões QA).

## 7. Top riscos p/ C2 (insumo GO)

1. **Densidade l08** (320 chars/min): a2/a3 novas devem manter minutos 3→4 propostos; risco de estouro de tempo real.
2. **Infra E2E de porta** (6.1): pode contaminar vereditos QA das ondas T2/T3 se não mitigada (porta dedicada/verificação de identidade do app).
3. **Base sã:** nenhum defeito de produto na superfície; cadeia prereq l07→…→l13 íntegra no mapa; versões e storage policies exatamente como o pre-draft assume.

## 8. Veredito (advisory p/ GO d+7)

**Superfície l08–l13 PRONTA p/ retrofit C2** no pin `ef67fb06` / contentVersion `2026-09-04.1`: baseline do pre-draft confirmada first-hand em 3 camadas (YAML, read model, runtime), jornada crítica verde ponta a ponta (happy + failure + evidência), gates do engine 9/9 E2E + 148/148 unit. Limitações: tempo real humano não medido (proxy de leitura apenas); passada executada em dev server local (produção Netlify não re-testada nesta sessão — cobertura de release anterior AID-819/readiness v29).

## 9. Evidências anexadas

`exploratory_report.json` (matriz completa + timings), `claims_check.txt`, `explore.mjs` (script reprodutível), `gates.log`, `e2e.log`.
