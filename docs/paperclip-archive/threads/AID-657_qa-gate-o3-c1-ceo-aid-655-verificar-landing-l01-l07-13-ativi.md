# AID-657: QA GATE O3-C1 (CEO AID-655): verificar landing l01–l07 (+13 atividades) apos PR UNICO do AID-654 — GO/NO-GO + relay fechamento AID-644

- **Status:** done | **Priority:** high | **Origin:** manual
- **Assignee:** QA Lead | **Created:** 2026-09-02T15:04:28.563895+00:00 | **Updated:** 2026-11-01T14:14:00.395+00:00
- **ID:** `9680d305-f238-4e49-a19c-a48c514ba6d8`

## Description

Owner: **QA Lead** (ca6a3f95). Gate de qualidade da onda **O3-C1** (ORDEM AID-644, spec rev 2 FECHADA — doc `spec-rev2` na AID-647 §§0–2.8 + advisory AID-645 `2ed06cf2`). Precedente: gate GO da O1 (AID-631) + Gate B (AID-638).

## Gatilho (first-class)
`blockedBy: AID-654` — começar somente quando o landing relay fechar `done` (PR único T1+T2 merged em main). Verificar ao vivo: PR merge sha + main atualizado.

## O que verificar em main (pós-merge)
1. **7 lições l01–l07** no padrão de 3 atividades cada (+13 novas: l01-a2/a3, l02-a2/a3, l03-a3, l04-a2/a3, l05-a2/a3, l06-a2/a3, l07-a2/a3) — conformidade com template AID-525 §2 e spec rev 2 §§2.1–2.7.
2. **Bump único de `contentVersion`** (§4.2) e catálogo/índice consistentes.
3. **Ferramentas**: `tools/validate.py` verde + CI do PR verde (checks do PR único).
4. **Copy do aviso 'atividades novas'** (S1/S2) conforme sign-off UX AID-646, se aplicável ao landing.

## Veredito
- **GO**: comentário-veredito estruturado nesta issue + criar relay para o **System Designer** (bb7b8143) fechar com receipt: **AID-648** (T1, se ainda aberta) e **AID-644** (ORDEM da onda — status hoje `todo`, corrigir para refletir e fechar `done`).
- **NO-GO**: child issues de defeito com blockers first-class + donos nomeados; manter esta issue aberta até re-teste.

## Fora de escopo
- Novo conteúdo (onda é retrofit/consolidação, sem novas lições além das especificadas).

## Document `Continuation Summary` (2026-09-02)

# Continuation Summary

- Issue: AID-657 — QA GATE O3-C1 (CEO AID-655): verificar landing l01–l07 (+13 atividades) apos PR UNICO do AID-654 — GO/NO-GO + relay fechamento AID-644
- Status: done
- Priority: high
- Current mode: review
- Last updated by run: 7713211f-0335-4038-a0cc-dcf4499d5043
- Agent: QA Lead (opencode_local)

## Objective

Owner: **QA Lead** (ca6a3f95). Gate de qualidade da onda **O3-C1** (ORDEM AID-644, spec rev 2 FECHADA — doc `spec-rev2` na AID-647 §§0–2.8 + advisory AID-645 `2ed06cf2`). Precedente: gate GO da O1 (AID-631) + Gate B (AID-638).

## Gatilho (first-class)
`blockedBy: AID-654` — começar somente quando o landing relay fechar `done` (PR único T1+T2 merged em main). Verificar ao vivo: PR merge sha + main atualizado.

## O que verificar em main (pós-merge)
1. **7 lições l01–l07** no padrão de 3 atividades cada (+13 novas: l01-a2/a3, l02-a2/a3, l03-a3, l04-a2/a3, l05-a2/a3, l06-a2/a3, l07-a2/a3) — conformidade com template AID-525 §2 e spec rev 2 §§2.1–2.7.
2. **Bump único de `contentVersion`** (§4.2) e catálogo/índice consistentes.
3. **Ferramentas**: `tools/validate.py` verde + CI do PR verde (checks do PR único).
4. **Copy do aviso 'atividades novas'** (S1/S2) conforme sign-off UX AID-646, se aplicável ao landing.

## Veredito
- **GO**: comentário-veredito estruturado nesta issue + criar relay para o **System Designer** (bb7b8143) fechar com receipt: **AID-648** (T1, se ainda aberta) e **AID-644** (ORDEM da onda — status hoje `todo`, corrigir para refletir e fechar `d
[truncated]

## Acceptance Criteria

No explicit acceptance criteria captured.

## Recent Concrete Actions

- Run `7713211f-0335-4038-a0cc-dcf4499d5043` finished with status `succeeded` at 2026-09-02T17:45:17.427Z.
- Relay e AID-644 fechados `done` pelo SD (17:03Z). Mas AID-657 voltou a `in_progress` com comentário novo `b02c019b` (17:13Z). Lendo-o por completo:

O escopo do gate foi estendido: condicionado à promoção AID-666 (§5.6→§5.7), com passos pós-promoção definidos. O wake diz `issue_blockers_resolved` — verifico o estado real da promoção e do pré-check:

AID-666 (promoção FPE) fechou `done` agora (17:30Z) — blocker resolvido, é hora da verificação hosted pós-promoção. Leio o receipt da promoção e o doc `qa-prepromo` da AID-667:

Receipt da promoção lido (produção `6a9859d1` @ alias, 17:16:03Z). O precheck 129/129 do FPE é evidência do **produtor** — meu dever é verificação independente. Leio o plano pós-promoção na AID-667:

Plano claro: verificação hosted independente em produção → veredito → re-grant readiness → relay. Vejo o que já está fechado (AID-668/670) e localizo o script de probe para adaptar minha própria perna independente:

AID-668 done, AID-670 (janela 21d, SD) `in_progress` — meu close-out alimenta ela. O script da AID-666 está no PR #249 (não mesclado). Busco-o para adaptar minha perna independente:

Tenho o script completo. Adapto minha própria perna
[truncated]

## Files / Routes Touched

- No file or route paths were detected in the captured run summary.

## Commands Run

- Heartbeat run `7713211f-0335-4038-a0cc-dcf4499d5043` invoked adapter `opencode_local`.
- Detailed shell/tool commands remain in the run log and transcript.

## Blockers / Decisions

- No new blocker was recorded by the latest run.

## Next Action

- Review the completed issue output and close any remaining follow-up comments.

## Comments (3)

**QA Lead** · 2026-09-02T16:57:25.532973+00:00

## VEREDITO QA GATE O3-C1: **GO** ✅ (sem reservas bloqueantes)

Verificação **independente first-hand** em `main @ 4c2aeb7` (merge PR [#248](https://github.com/dandpb/aidevschool/pull/248)), árvore limpa, sem alteração de estado canônico do learner. Gatilho confirmado: AID-654 `done` (relay T1+T2 merged).

### Evidência por critério do gate

**1. 7 lições l01–l07 × 3 atividades (+13 novas) — CONFORME**
Parse scriptado próprio (PyYAML) dos 7 YAMLs em `curriculum/ai-literacy/modules/{01-ai-sem-misterio,02-pedir-bem}/` vs. baseline `7101cf4` (git show):
- **+13 exatamente como spec rev 2 §§2.1–2.7**: l01-a2/a3, l02-a2/a3, l03-a3, l04-a2/a3, l05-a2/a3, l06-a2/a3, l07-a2/a3 — zero remoções/renomeações (diff puramente aditivo, R1.1).
- **a1 intacta**: `activities[0]` byte-idêntico ao baseline nas 7 lições.
- Versões v2/v4/v2/v2/v3/v2/v2; minutos **4/4/4/4/5/4/4** (bumps só l01 3→4 e l04 3→4 — Q3; l05 já era 5).
- Rubricas: critérios pré-existentes verbatim preservados nas 7; +1 critério novo nas 5 que tinham 2 (l01/l03/l04/l06/l07 → 3×weight-1); l02/l05 mantêm as 3 existentes (§2.8/advisory AID-645).
- `completion.requiredActivityIds` = conjunto completo (a1+a2+a3) nas 7.

**2. Bump único de `contentVersion` + consistência — CONFORME**
- `catalog.yaml`: `2026-09-02.2 → 2026-09-02.3` (§4.2); zero ocorrências da versão antiga em arquivos canônicos rastreados.
- `mission-bindings.yaml`: `tracks[ai-pratica]` e `tracks[dev]` = `2026-09-02.3`; **29/29 missões literacyDojo** com `runtime.contentVersion` uniforme `2026-09-02.3` (7 bindings de jogo usam identificadores `game-*@0.1.0`, inalterados e fora do escopo).
- `estimatedMinutes` l01/l04 bumpados no catálogo; **árvore limpa após `gen:content`** (read model regenerado = sem drift vs. YAML canônico).

**3. Ferramentas — CONFORME**
- `python3 curriculum/ai-literacy/tools/validate.py` (executado por mim no main): `OK: 29 lição(ões) ready validadas: 20 IA na Prática, 9 Dev; 0 planned`.
- **CI first-hand via GitHub API** no merge commit `4c2aeb7a`: **36 check-runs = 35 success + 1 skipped, zero failures**. O único skipped é `pixelDojo games/${{ matrix.game }} (TS)` (skip de matriz benigno, sem relação com a onda). Nota de transparência: o relay "36/36 verde" é, com precisão, 35 verde + 1 skipped.
- Suítes locais independentes: literacyDojo unit **138/138** (18 arquivos, incl. `migration.test.ts` 8 e `retrofitNotice.test.ts` 7); gate do verificador **310/310** (`python3 -m pytest learner/gate/tests/`).

**4. Copy S1/S2 + item D (sign-off UX AID-646) — CONFORME**
- `src/domain/retrofitNotice.ts`: S1 e S2 **byte-idênticos ao texto verbatim da spec rev 2 §3**; registro `RETROFITTED_LESSONS_BY_CONTENT_VERSION["2026-09-02.3"] = [l01..l07]`; gatilho derivado (lição da onda + status "completed") + ack estrutural idempotente por/lição/bump (A5 coberto por teste).
- Renderização: S1 em `HomeScreen.tsx:149` (card Revisão pendente), S2 em `LessonScreen.tsx:262` (intro), **item D** plural aplicado em `LessonScreen.tsx:228` ("refaça **as atividades** desta lição…").

### Ambiente
Repo `_default` @ `4c2aeb7` (main, pós-merge PR #248); Python 3 + PyYAML; Node/vitest via `npm run test` (pretest `gen:content`); GitHub REST API direto para check-runs.

### Defeitos encontrados
**Nenhum** product bug nem infra failure. Divergências de texto de relay (36/36 vs. 35+1 skipped) registradas acima apenas como transparência — não afetam o veredito.

### Limitações
- Não executei E2E Playwright do literacyDojo localmente nesta sessão (CI do PR rodou a suíte completa no merge; unit+gate+validate+parse cobriram o risco do retrofit). Amostragem de conteúdo foi estrutural (IDs/versões/rubricas/required), não pedagógica (texts dos enunciados foram revisados pelo advisory CD AID-645 13/13, fora do meu escopo).
- Promoção/deploys (padrão AID-630, precheck estendido §5.6) **não fazem parte deste gate** — a ORDEM AID-644 define se há etapa de promoção própria; se houver, exigirá gate subseqüente.

### Disposição
**GO.** Relay de fechamento criado para o System Designer (`bb7b8143`): fechar **AID-644** (ORDEM, hoje `todo` — corrigir status para refletir execução concluída e fechar `done` com receipt). **AID-648 já está `done`** (verificado agora; AID-649/relay de landing também `done`). Esta issue fecha `done`.

**QA Lead** · 2026-09-02T17:13:36.159132+00:00

**QA (cross-ref AID-667):** ciclo preparatório em main @ `4c2aeb7` COMPLETO E VERDE — A1–A8 (itens verificáveis pré-hosted), a11y local, RD4 vendor-neutral, R1 diff aditivo, mapa 36 missões @ `2026-09-02.3`, CI 35✓+1 skip. Evidência integral: doc `qa-prepromo` na **AID-667** (comment `d8c7cbb4`).

Gate GO/NO-GO desta issue permanece condicionado à promoção AID-666 (§5.6 → §5.7): `blocked` com unblock owner **FPE**. Pós-promoção: verificação hosted → veredito estruturado aqui → re-grant `os-literacy-guided-mission` → relay de receipt ao SD para close-out §5.8.

Nota: status oscilou para `done` por ~1min durante um PATCH de `blockedByIssueIds` sem `status` explícito (quirk da API, corrigido na mesma heartbeat; `closedAt` permaneceu nulo).

**QA Lead** · 2026-09-02T17:44:16.988677+00:00

## VEREDITO QA GATE O3-C1 — FASE PÓS-PROMOÇÃO (§5.7): **GO** ✅ — produção verificada first-hand, 132/132

**Escopo desta fase** (complemento AID-667, doc `qa-prepromo`): promoção única AID-666 concluída (deploy `6a9859d1b3f3fda747dbe1ff`, alias `aidevschool-codexdojo-os.netlify.app`, published 17:16:03Z, pin `4c2aeb7`). O precheck 129/129 do FPE é evidência do **produtor**; abaixo, verificação **independente** executada por mim contra produção (script `qa-aid657-postpromo.mjs`, Playwright chromium + fetch, log integral `aid657_qa_pospromo.log`).

### Identidade e integridade (pernas exclusivas da QA)
- **Alias == permalink byte-idênticos** (manifesto sha256 `c4a1e9b4…` nos dois); `sourceRevision` == pin `4c2aeb7a…` == main (conferido por mim no git); sha256 da superfície os **conferido contra meu próprio fetch** de `/index.html` (`9ed2fb42…`).
- **Alvo de rollback íntegro**: deploy pré-onda `6a9816a5--…` serve `sourceRevision 7653822…` com conteúdo PRÉ-onda (sem `l01-a2`, `contentVersion 2026-09-02.2`) — swap atômico comprovado, re-pin `release/7653822` viável.

### Onda em produção
- **7/7 missões hosted** `/mission/ai-pratica/l01..l07` com MOTOR rodando em iframe same-origin `/apps/literacydojo/` (+ regressão l27 dev track); **contador `ATIVIDADE 1 DE 3` nas 7** dentro do iframe hospedado.
- **S1/S2 E2E nas 7 lições**: learner returning com l01–l07 `completed` sob `2026-09-02.2` → S1 no card do Home, S2 1×/lição/bump na intro hospedada, **ack estruturado `literacydojo:retrofit-acks` = {l01..l07: "2026-09-02.3"}**, reentrada = 0 S2 (idempotente), item D plural, sessão de revisão com 3 atividades (standalone e hosted).
- **Motor publicado**: contentVersion `.3` presente e uniforme (32 strings: header + 2 tracks + 29 runtimes), versões antigas ausentes; 13 ids novos + a1/a2/a3 ×7; copy S1/S2/item D embarcada; mapa 36 (29 literacy = 20 ia-pratica + 9 dev; 7 games; verifierRequired 36; fallback dom 36); rail pública anônima honesta em 6 (#225).
- **RD4 (anti-escopo §8.5)**: região l01–l07 do bundle publicado **sem menção a vendor** (também nos YAMLs canônicos mod-01/02). *Divulgação*: 8 hits bundle-wide de "OpenAI/gpt-" na lição **l17** (dev track, onda antiga — o vendor é o próprio assunto técnico da lição), **idênticos no deploy pré-onda** → pré-existentes, fora do escopo desta onda, sem ação da O3-C1. Ponto para o SD/board decidir política RD4 p/ dev-track na janela 21d (AID-670).
- **Bridge/verificador**: 200/403/401/422; **10 atividades re-avaliáveis da onda → PASS independente** (`independent-literacy-verifier`, `producer_writes_mastered:false`); **3 prompt_builder fail-closed** (`mastery_eligible:false`); regressões AID-449 (forged-FAIL, 422) e AID-448 (echo attempt_id jogos) verdes.
- 20 superfícies 200; 10 env pins same-origin; guardas de reflow no CSS publicado.

### CI do pin (first-hand)
Merge commit `4c2aeb7a`: 36 check-runs = **35 success + 1 skipped** (pixelDojo matrix), 0 fail — idêntico ao meu levantamento da fase landing.

### Re-grant de readiness (padrão AID-631 v22)
**`os-literacy-guided-mission`: stale → `pass` / `customer-ready` @ `4c2aeb7`** (verified 2026-09-02T17:45Z, revalidate-by 2026-10-02). Perna automatizada: `test:readiness` local @ pin (3/3 cenários pass) + CI do pin; perna observada: produção (acima). Matriz re-renderizada, `cli.py check` em sincronia. **PR #252** (docs-only) aguardando merge CEO (single-writer). `literacy-standalone-first-lesson` permanece `stale` (fora do mandato AID-559 ii) — decisão deferida ao close-out §5.8 (AID-670).

### Defeitos
**Nenhum** product bug nem infra failure nesta fase. Duas falhas iniciais do MEU script (seed l02; formato de permalink) corrigidas por triagem — não eram defeitos do produto.

### Limitações
- Contraste/leitor-de-tela reais e E2E Playwright completa do literacyDojo não re-executadas nesta fase (cobertas na fase preparatória AID-667 em main + CI do pin); teclado/ARIA exercitados via playwright nas jornadas hosted.
- Janela 21d (AID-670) fica com o SD; este veredito é do gate de promoção.

### Disposição
**GO confirmado pós-promoção.** AID-657 → `done` (gate completo: landing GO 16:57Z + pós-promoção GO agora). AID-667 fechada com receipt. AID-670 (SD) notificada. Pendência operacional única: merge do PR #252 pelo CEO.

---

