# AID-677: QA independente — ONDA OP-B-F23 (AID-673): verificar T1 F2b (learner/gate/analytics) + T2 F3 (sink literacyDojo) — OFF-by-default, dedup, k≥5, guardas; GO/NO-GO wave-level

- **Status:** done | **Priority:** high | **Origin:** manual
- **Assignee:** QA Lead | **Created:** 2026-09-02T17:16:56.482445+00:00 | **Updated:** 2026-11-01T14:16:28.441+00:00
- **ID:** `2ac944d4-2361-435d-9928-376c209f034e`

## Description

Owner: **QA Lead** (ca6a3f95). Porta de verificação independente da ONDA OP-B-F23 (ORDEM CEO AID-669/A → AID-673; spec = doc `spec` na AID-673). **blockedBy T1 (AID-675) + T2 (AID-676)** — verificar após o landing de ambas. Produtor ≠ verificador (padrão AID-489/AID-631/AID-638): o veredito GO/NO-GO é propriedade da QA.

## O que verificar (checklist mínimo; spec §2/§3/§6 são a referência)
1. **F2b (T1):** recomputar o funil e os cortes D1/D2 **por terceira via** sobre as fixtures sintéticas (não reusar o código da ferramenta); conferir dedup por `eventId` (fixture com duplicata); supressão k≥5 por célula em TODAS as seções novas; seção `moduleCompletionMedian` lê o `catalog.yaml` real e o caso ilegível produce `unavailable` (fail-closed); `example-funnel-report.json|.md` regeneram byte-idênticos; CLI continua fail-closed (`--k 4`, `--k abc`, valor ausente ⇒ exit 2 sem report).
2. **F3 (T2):** guardas de teste zero-rede: sem `VITE_ANALYTICS_ENDPOINT` ⇒ zero fetch; `""` ⇒ zero rede; hosted (`?hosted=1`) ⇒ noop mesmo com env; `lesson_completed` emitido 1×/conclusão com envelope válido; **nenhum outro evento** instrumentado (audit por grep no diff).
3. **Invariante de ativação:** grep repo — **nenhuma superfície de build define `VITE_ANALYTICS_ENDPOINT`** (netlify.toml OS/literacy, CI, scripts); transporte permanece OFF (ADR-0010 §4; board gate).
4. **Fronteiras:** nenhum commit de NDJSON real; nenhum evento novo nos vocabulários (OS 12 + ADR-0009 fechado); zero mudança em ADR-0009/0010; nada em F2b/F3 toca learner state/gates/mastery; catálogo/currículo apenas lidos.
5. **CI verde** nas superfícies tocadas (OS job analytics + literacyDojo lint/test/build).

## Entrega
Veredito **GO / NO-GO** (com condições, se GO-com-reservas) na thread da AID-673, com evidência executável própria (recomputação, grep, saídas de teste).

## Document `Continuation Summary` (2026-09-02)

# Continuation Summary

- Issue: AID-677 — QA independente — ONDA OP-B-F23 (AID-673): verificar T1 F2b (learner/gate/analytics) + T2 F3 (sink literacyDojo) — OFF-by-default, dedup, k≥5, guardas; GO/NO-GO wave-level
- Status: done
- Priority: high
- Current mode: review
- Last updated by run: b75073cc-00f7-4030-a9b4-ea1aa6332fe9
- Agent: QA Lead (opencode_local)

## Objective

Owner: **QA Lead** (ca6a3f95). Porta de verificação independente da ONDA OP-B-F23 (ORDEM CEO AID-669/A → AID-673; spec = doc `spec` na AID-673). **blockedBy T1 (AID-675) + T2 (AID-676)** — verificar após o landing de ambas. Produtor ≠ verificador (padrão AID-489/AID-631/AID-638): o veredito GO/NO-GO é propriedade da QA.

## O que verificar (checklist mínimo; spec §2/§3/§6 são a referência)
1. **F2b (T1):** recomputar o funil e os cortes D1/D2 **por terceira via** sobre as fixtures sintéticas (não reusar o código da ferramenta); conferir dedup por `eventId` (fixture com duplicata); supressão k≥5 por célula em TODAS as seções novas; seção `moduleCompletionMedian` lê o `catalog.yaml` real e o caso ilegível produce `unavailable` (fail-closed); `example-funnel-report.json|.md` regeneram byte-idênticos; CLI continua fail-closed (`--k 4`, `--k abc`, valor ausente ⇒ exit 2 sem report).
2. **F3 (T2):** guardas de teste zero-rede: sem `VITE_ANALYTICS_ENDPOINT` ⇒ zero fetch; `""` ⇒ zero rede; hosted (`?hosted=1`) ⇒ noop mesmo com env; `lesson_completed` emitido 1×/conclusão com envelope válido; **nenhum outro evento** instrumentado (audit por grep no diff).
3. **Invariante
[truncated]

## Acceptance Criteria

No explicit acceptance criteria captured.

## Recent Concrete Actions

- Run `b75073cc-00f7-4030-a9b4-ea1aa6332fe9` finished with status `succeeded` at 2026-09-02T18:36:11.508Z.
- Both T1 (PR #251 → main `5cfae21`) and T2 (PR #250 → main `5c5bd1a`) are merged. Now I'll set up an independent verification workspace from `origin/main`.

Now let me inspect the tool source to understand exact semantics, then write my own independent recompute.

Now I'll write an independent Python recompute (third way) implementing the spec semantics over the synthetic fixtures. First, let me check the validator vocabulary used for accepted events.

The only mismatches are the descriptive `definition` string fields (which I intentionally omitted). Let me confirm all numbers match exactly:

All numbers match the committed example report exactly (only omitted `definition` label strings differ). Now: byte-identical regeneration + CLI fail-closed checks.

Byte-identical regeneration confirmed. Now CLI fail-closed checks:

CLI fail-closed verified. Now the `unavailable` fail-closed path for the catalog:

No dependency files touched — I can reuse the main checkout's `node_modules`. Note `fixtureSchemaDrift.test.ts` (OS parity surface) was modified; let me audit that diff plus check ADR/curriculum were untouched:

`fixtureSchemaDrift.test.ts` is a consumer guard upda
[truncated]

## Files / Routes Touched

- No file or route paths were detected in the captured run summary.

## Commands Run

- Heartbeat run `b75073cc-00f7-4030-a9b4-ea1aa6332fe9` invoked adapter `opencode_local`.
- Detailed shell/tool commands remain in the run log and transcript.

## Blockers / Decisions

- No new blocker was recorded by the latest run.

## Next Action

- Review the completed issue output and close any remaining follow-up comments.

## Comments (1)

**QA Lead** · 2026-09-02T18:35:53.05308+00:00

**QA AID-677 — CONCLUÍDO. Veredito: GO (wave-level) para a ONDA OP-B-F23, sem reservas bloqueantes.** Transporte permanece OFF; ativação continua gate do board (ADR-0010 §4).

**Entrega na AID-673:** o comentário de veredito foi **barrado por boundary 403** ("Issue is outside this actor's authorization boundary" — mesmo bloqueio que o CEO encontrou na AID-675; AID-673 é lane do System Designer). O veredito completo está abaixo, pronto para relay: **owner do relay = SD no close-out §5.5 da AID-673 (ou CEO via ordem)**, citando a AID-677.

## Ambiente
Worktree limpo desanexado em `origin/main` @ `5c5bd1a` (pós-merge PR #251 `5cfae21` + PR #250 `5c5bd1a`); diff de onda auditado `4c2aeb7..5c5bd1a` (33 arquivos). Verificador ≠ produtor: a recomputação não reusa nenhum código da ferramenta.

## T1/F2b (AID-675) — evidência executável própria
1. **Recompute por terceira via (Python):** dedup por `eventId` (sort `occurredAt,sequence`; primeira ocorrência vence) + 6 seções novas reimplementadas da spec §2. Contra o example report commitado: **0 divergência numérica** (únicas diferenças: strings `definition` omitidas). Confirmado: `duplicateEvents=2` (`evt-f2b-0033`/`evt-f2b-0103`), `totalEvents=212`; W37 split 11/6; l04 8/5=0.625; unattributed 13/13; friction 6/4=0.6667 e hint 5 / retry suprimido; verificação 6/6/6 share 0.3 e pending suprimido n=2; render dom 6 (creation-failed 6; literacyDojo 6) e canvas2d/none suprimidos; `moduleCompletionMedian` mediana **0.8125** (mod-01 6/6; mod-02 8/5), `missionsWithoutModuleMapping=2`.
2. **k≥5/célula:** assert programático meu sobre o report commitado — nenhuma célula publicada abaixo de k nas seções novas; zero identificadores (`install-`/`session-`/`evt-`) no artefato.
3. **Catálogo real + fail-closed:** minha recomputação leu `curriculum/ai-literacy/catalog.yaml` de forma independente e bateu; catálogo inexistente e catálogo vazio ⇒ seção `unavailable:true` com motivo (verificado nas duas vias).
4. **Examples byte-idênticos:** regeneração com `--now 2026-09-18T00:00:00.000Z` ⇒ `diff` vazio no `.json` e no `.md`.
5. **CLI fail-closed:** `--k 4` / `--k abc` / `--k` sem valor ⇒ exit 2, stdout vazio (zero report); `--k 5` ⇒ exit 0.
6. **Suites:** `node --test dojo_analytics_funnel_aggregation + dojo_analytics_schema_drift_monitor` ⇒ **28/28**; drift monitor no synthetic ⇒ exit 0, 214 linhas, 0 drift; `codexdojo-os-prototype npm test` ⇒ **333/333** (`collectorParity.test.ts` intocado; `fixtureSchemaDrift.test.ts` = guarda consumidora atualizada ao rv2: 94→214, reportVersion 2, dedup=2).

## T2/F3 (AID-676) — evidência
1. **Execução própria:** `literacyDojo` lint (biome 81 arquivos, 0 erros) · test **143/143** (19 files, incl. 5 guardas analytics) · build (tsc -b + vite) ✓.
2. **Guardas (a)–(f):** (a) sem env ⇒ zero fetch; (b) `""` ⇒ zero rede; (c) env ⇒ httpNdjson (POST `application/x-ndjson`); (d) hosted ⇒ noop mesmo com env (seam `overrides?.hostAdapter`, mesmo sinal do `?hosted=1`); (e) `lesson_completed` 1×/conclusão, envelope válido, sem emissão em conclusão incompleta nem review, replay ⇒ +1; (f) **grep meu**: único call site `.track(` em `src/` é `useCases.ts:271` — nenhum outro evento instrumentado.
3. **Fronteira literacy↔coletor OS** documentada em adapter + README (422 `unsupported-schema`).

## Invariantes de onda
- **OFF-by-default:** grep repo `VITE_ANALYTICS_ENDPOINT` ⇒ só tipos/consumidores/testes/comentários; `netlify.toml` OS = comentário; `netlify.toml` literacy e `ci.yml` = zero refs. **Nenhuma superfície de build define valor.**
- **Zero evento novo:** `events.ts` OS (12) fora do diff; ADR-0009 fechado (só o piloto `lesson_completed`).
- **Zero mudança** em ADR-0009/0010, currículo, ids, learner state/gates/mastery; NDJSON real nunca commitado (fixtures sintéticas).
- **CI main `5c5bd1a`:** todos os jobs success (incl. `SDLC guardrails (diff)`, `codexdojo-os (TS)`, `literacyDojo (TS + content)`).

## Observações não-bloqueantes (registro para o gate de ativação)
- **O1:** `trackEntrySplit` publica contagens por trilha abaixo de k dentro de coorte k-válida (W29/W35: split 3/2 com n=5). Consistente com a convenção vigente do bucket=coorte (precedente `activationFunnel`, aprovado AID-489) e explícito em teste; leitura estrita de "célula" na spec §2.2 admitiria gating por trilha. Sem exposição hoje (OFF + sintético). Recomendo o board decidir gating (coorte×trilha) ou coorte k≥10 para splits **antes da leitura A+21 com dados reais**.
- **O2:** `anonymity.suppressedBuckets` soma só seções legadas; o `.md` marca todas as células suprimidas (`n=X < k`). Cosmético.
- **O3:** re-render `fec9991` marcou `os-returning-learner`/`os-voxel` stale no readiness matrix (fingerprint src/ OS mudou pelo F2b) — honesto; re-grant é assessoria separada.

## Limitações
Sem E2E de navegador do literacyDojo (fora do aceite §3; fronteira coberta por guardas zero-rede + build). Eficácia de leitura de funil não é presumida — exige ativação (board) + janela (A+7 saúde / A+21 leitura / A+28–35 mensal k≥5). Zero relatório de dados reais produzido.

**Disposition AID-677: done** — checklist §1–§5 da issue totalmente verificado com evidência independente; veredito GO emitido acima (relay para AID-673 fica com o SD/CEO, conforme boundary).

---

