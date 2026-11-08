# AID-3532: Defeito /escola/ (P3, a11y): foco perdido ao ativar link do mapa em texto para a jornada — removeAttribute("tabindex") dropa foco para BODY (escola.js:106-118, lineage e95611da)

- **Status:** done | **Priority:** low | **Origin:** manual
- **Assignee:** Engine Systems Engineer | **Created:** 2026-09-30T21:17:51.030594+00:00 | **Updated:** 2026-10-01T00:12:31.044+00:00
- **ID:** `9f15de3f-5d86-459e-961f-868aabdb407b`

## Description

Achado da preparação da matriz de aceite público (AID-3517), reproduzido no build local do lineage exato do PR #616 (merge `d9dbdd5c`, head `e95611da`).

**Comportamento desejado:** ao ativar (mouse ou teclado) o link interno `a[href="#jornada-dev"]` da alternativa textual do mapa (`details.map-alt`), o foco deve ir para o cartão `#jornada-dev`.

**Comportamento real:** o foco vai para `BODY` — `document.activeElement` = `<body>` imediatamente após o handler.

**Causa (escola.js:106-118):** padrão `target.setAttribute("tabindex","-1"); target.focus(); target.removeAttribute("tabindex")` — o Chromium 151 dropa o foco para BODY quando o atributo `tabindex` é removido do elemento focalizado. Prova passo-a-passo: `during:"jornada-dev"` (foco OK) → `after:""`/BODY após `removeAttribute`.

**Repro independente (2026-09-30, worktree detach d9dbdd5c, vite build+preview :4181):**
```js
// Playwright chromium 151, http://127.0.0.1:4181/escola/
document.querySelector('.map-alt a[href="#jornada-dev"]').click();
document.activeElement.id; // "" (BODY)
```

**Severidade P3 — não bloqueia publicação:** a ativação funciona (preventDefault + foco pretendido), perda afeta usuários de teclado/switch na alternativa textual do mapa. Superfície continua usável por teclado (skip link, dialog, CTA por Tab — verificados no mesmo run).

**Correção sugerida:** manter `tabindex="-1"` no elemento (não remover após focus), ou mover a remoção para `blur`.

**Cobertura:** o caso B9 da matriz pública (AID-3517) codifica o comportamento desejado como `test.fail` esperado neste lineage; ao corrigir, o run público passa a falhar "inesperadamente" no B9 → sinal de fechar esta issue com evidência.

## Document `Continuation Summary` (2026-09-30)

# Continuation Summary

- Issue: AID-3532 — Defeito /escola/ (P3, a11y): foco perdido ao ativar link do mapa em texto para a jornada — removeAttribute("tabindex") dropa foco para BODY (escola.js:106-118, lineage e95611da)
- Status: done
- Priority: low
- Current mode: review
- Last updated by run: 9c95aa73-e03e-4744-850a-7fef606a60fe
- Agent: Engine Systems Engineer (opencode_local)

## Objective

Achado da preparação da matriz de aceite público (AID-3517), reproduzido no build local do lineage exato do PR #616 (merge `d9dbdd5c`, head `e95611da`).

**Comportamento desejado:** ao ativar (mouse ou teclado) o link interno `a[href="#jornada-dev"]` da alternativa textual do mapa (`details.map-alt`), o foco deve ir para o cartão `#jornada-dev`.

**Comportamento real:** o foco vai para `BODY` — `document.activeElement` = `<body>` imediatamente após o handler.

**Causa (escola.js:106-118):** padrão `target.setAttribute("tabindex","-1"); target.focus(); target.removeAttribute("tabindex")` — o Chromium 151 dropa o foco para BODY quando o atributo `tabindex` é removido do elemento focalizado. Prova passo-a-passo: `during:"jornada-dev"` (foco OK) → `after:""`/BODY após `removeAttribute`.

**Repro independente (2026-09-30, worktree detach d9dbdd5c, vite build+preview :4181):**
```js
// Playwright chromium 151, http://127.0.0.1:4181/escola/
document.querySelector('.map-alt a[href="#jornada-dev"]').click();
document.activeElement.id; // "" (BODY)
```

**Severidade P3 — não bloqueia publicação:** a ativação funciona (preventDefault + foco pretendido), perda afeta usuário
[truncated]

## Acceptance Criteria

No explicit acceptance criteria captured.

## Recent Concrete Actions

- Run `9c95aa73-e03e-4744-850a-7fef606a60fe` finished with status `succeeded` at 2026-10-01T00:12:38.354Z.
- The gate contract is clear. Gathering the canonical trailer format, my real run/session ids, and PR head state:

All ingredients verified. Posting my own countersign on PR #626 (canonical form, real run/session, supersede note, no fences, no VOID/HELD words):

Countersign posted (`5922023787`). Running the mechanical gate through the normal flow:

**Gate PASS, exit 0.** Posting the receipt on the Paperclip issue and closing back to done via the terminal control:

Mechanical receipt complete. Final disposition: **done**.

**Delivered (nothing beyond the requested receipt — no new review/tests/code):**
- **Countersign próprio posted:** https://github.com/dandpb/aidevschool/pull/626#issuecomment-5922023787 — citation `Countersign: AID-3532 verdict 9ca328d1… head=0b2358ac08b7b165e33f5d188255ff3d9f382a2f` + trailer `Provenance: agent=engine-systems-engineer task=AID-3532 run=1b1e3182… session=ses_f0bc59b90ffePVQYlv6Jl4ASvR` (real review run + sessionIdAfter, verifiable via `GET /api/heartbeat-runs/1b1e3182…`)
- **Exact-missing info reported:** the reconciliation run `9621e83a…` (which posted verdict `9ca328d1`) returns HTTP 500 on the runs API (3 attempts) — trailer
[truncated]

## Files / Routes Touched

- `scripts/sdlc_aid_resolve.sh`
- `scripts/sdlc_guard_check.sh`
- `scripts/countersign_gate_check.py`
- `scripts/merge_pr.sh`
- `scripts/precheck/waves/AID-3453-d9dbdd5.json`

## Commands Run

- Heartbeat run `9c95aa73-e03e-4744-850a-7fef606a60fe` invoked adapter `opencode_local`.
- Detailed shell/tool commands remain in the run log and transcript.

## Blockers / Decisions

- No new blocker was recorded by the latest run.

## Next Action

- Review the completed issue output and close any remaining follow-up comments.

## Comments (7)

**Learning Engine Engineer** · 2026-09-30T21:28:21.598086+00:00

## Entrega: fix + regressão + PR #626 (aguardando revisão independente)

**Plano colapsado** (correção delimitada <20 linhas, skill ai-native-sdlc): o handler dos links do `details.map-alt` fazia `setAttribute("tabindex","-1") → focus() → removeAttribute("tabindex")`; o Chromium dropa o foco para BODY ao remover o atributo do elemento focalizado. **Fix (menor, 1ª sugestão da issue):** `tabindex="-1"` permanece no cartão — mesmo padrão do alvo estático do skip link `#etapa-atual` (`index.html:68`); cartões seguem fora da ordem de Tab; ativação repetida idempotente.

**Branch** `aid3532/fix-map-alt-focus` off `d9dbdd5c` (= main / lineage do achado) · **PR #626** · commits `993cf539` (teste failing-first) → `0b2358ac` (fix). Dif: `escola.js` (−1 linha) + spec NOVO `playwright/escola-map-focus.pwa.spec.ts` (4 casos, projeto `pwa` = build+preview, ambiente da repro).

**Prova** (worktree isolado; evidência em `aid3532-evidence/`, SUMMARY.md):
- Base `d9dbdd5c`: novo spec **4/4 falham** — foco em BODY (repro confirmada; bate com QA B9).
- Com o fix: **4/4 passam** (Enter e click, ambos os cartões, foco re-checado 1 frame depois, `tabindex=-1` afirmado, ativações repetidas).
- Regressão de superfície: `escola-entry.spec.ts` **4/4 passam** (serving/jornadas/SW intactos); `biome check playwright` clean.

**Fluxo a partir daqui:**
1. Revisão formal (produtor ≠ verificador): issue filha criada para o **Engine Systems Engineer** (2º revisor engines/; LEE produziu) — sem revisão nativa pré-configurada nesta issue, portanto um único filho de revisão para este head.
2. Merge: FPE pela porta única `scripts/merge_pr.sh` (countersign-gate) — não mergeio o que produzi.
3. **QA (AID-3517):** publicado este fix, o caso **B9** (marcado `test.fail` no lineage `e95611da`) falhará "inesperadamente" no próximo run público — sinal acordado para fechar esta issue; a atualização do marcador B9 permanece com a QA.

Status: **in_review** (caminho real: revisão ESE → countersign → merge FPE).

**Engine Systems Engineer** · 2026-09-30T21:33:43.022195+00:00

**Countersign de revisão formal: APROVADO** (review AID-3537, Engine Systems Engineer — produtor ≠ verificador).

Verificação independente em `/paperclip/tmp/aid3532-wt` (re-runs do revisor): novo spec **4/4 passam** no head `0b2358ac`; na base `d9dbdd5c` (pré-fix) **4/4 falham** em `toBeFocused` — failing-first confirmado; `escola-entry` **4/4 passam** (sem regressão de superfície); `biome check playwright` clean. Diff mínimo: −1 linha funcional em `escola.js`, `tabindex="-1"` persiste no cartão (padrão do skip link `#etapa-atual`), cartões fora da ordem de Tab.

Recibo: `aid3532-evidence/REVIEW-AID-3537.md`. Issue de review fechada `done`.

Próximo passo real: **merge via FPE** pela porta única `scripts/merge_pr.sh` (countersign-gate). Pós-publicação, QA/AID-3537-matriz: caso **B9** (lineage `e95611da`, marcador `test.fail`) passará a falhar "inesperadamente" — sinal acordado para fechar AID-3532; atualização do marcador é da QA.

**Engine Systems Engineer** · 2026-09-30T21:35:58.104252+00:00

**DECISÃO: `approved` — fix AID-3532 (PR #626, head `0b2358ac`, base `d9dbdd5c` = lineage do achado `e95611da`) aprovado na revisão independente do Engine Systems Engineer, com verificação first-hand do revisor (não apenas reuso da evidência do produtor).**

## 1. Verificação first-hand (revisor, 2026-09-30, worktree `/paperclip/tmp/aid3532-wt`, projeto `pwa` = build+preview)

1. **Red→green independente re-executado por mim:** base `d9dbdd5c` + spec carregado como untracked → **4/4 falham** (foco cai para BODY — defeito reproduzido); head `0b2358ac` → **4/4 passam** (Enter e click em ambos os cartões, ativações repetidas, foco persistente). Confirma (não duplica por duplicação desnecessária — reuso permitido) os runs gravados do produtor em `aid3532-evidence/` (base-fail/fix-pass/escola-entry/lint). ✔
2. **Escopo do diff auditado (`d9dbdd5c..0b2358ac`, 2 arquivos, +75/−1):** única mudança de código é remover `target.removeAttribute("tabindex")` no handler de `details.map-alt` (escola.js:106-118) + comentário justificando; o resto é o spec novo. Sem toque em `entry-contract.js`, UI, CSP, permissões ou app React. ✔
3. **Correção correta e sem efeito colateral:** `tabindex="-1"` permanece no cartão focalizado — é a 1ª sugestão da própria issue e o mesmo padrão do alvo estático do skip link `#etapa-atual` (`index.html:68`, verificado). `-1` não entra na ordem de Tab (cartões continuam não-tabbable), ativação repetida é idempotente, `preventDefault` + foco programático preservam o comportamento intencional. Padrão consistente em todo o diff: nenhuma outra ocorrência de `removeAttribute("tabindex")` sob `engines/` além da linha removida. ✔
4. **Mutation-guard do spec é real:** foco re-checado um frame depois (`requestAnimationFrame`) + `tabindex="-1"` afirmado junto do foco → pega variantes que adiarem a limpeza do atributo (ex.: `setTimeout`), que reintroduziriam a perda de forma assíncrona. ✔
5. **Regressão e lint:** `escola-entry.spec.ts` 4/4 no mesmo build (contrato de serving/SW intacto — arquivo de evidência conferido); `biome check playwright` clean; os 15 achados em `public/escola/js` pré-existem na base e `public/` está fora do gate `lint` do engine (`biome check src tests playwright`) — não bloqueante, fora do escopo deste P3. ✔

## 2. Não-conformidades

Nenhuma bloqueante. Nenhuma menor que exija retrabalho.

## 3. Encaminhamento (pós-aprovação)

- **Merge:** FPE pela porta única `scripts/merge_pr.sh` (countersign-gate) — produtor não mergeia o próprio PR.
- **QA/AID-3517:** com o fix publicado, o caso **B9** da matriz pública (marcado `test.fail` no lineage `e95611da`) passará a falhar "inesperadamente" — sinal acordado para fechar AID-3532; a atualização do marcador é da QA no run pós-publicação.
- **AID-3537** (issue filha de revisão criada antes do estágio nativo, assignee sou eu): fechada como **superseded/cancelled** por este veredito — um único round de revisão para este head, conforme registrado pelo produtor.

*Revisor: Engine Systems Engineer (agente `ae071215-338c-41ad-8782-2c6ffa04a21a`), estágio review `b6f2b1e4` da AID-3532, participante designado; lastDecisionOutcome anterior: none; head exato revisado: `0b2358ac` (PR #626); retorno ao assignee LEE (`98ed5775`) com aprovação.*

**founder** · 2026-09-30T23:28:14.962184+00:00

PO: a correção de foco e a prova red/green de2db8316c estão aceitas no escopo local; não repetir esses testes nem criar outro filho. Há um handoff incompleto: a tela ainda mostra In Review / Review pending with Engine Systems Engineer apesar do veredito approved. ESE deve reconciliar a decisão estruturada do estágio ativo com o head0b2358ac e concluir pelo controle terminal suportado (Done quando aprovado), sem passar para In Progress, que sinaliza changes\_requested. Publicar countersign/proveniência genuínos do review já feito com head exato, sem alegar novo run. PR626 ainda não está integrado/publicado; preparar para FPE a eventual reconciliação de base/conflitos e CI, preservando a mudança mínima. Retornar URL do recibo e estado final verificado. Não mergear/deployar nesta ação; QA pública B9 só muda após publicação futura aprovada.

**Engine Systems Engineer** · 2026-09-30T23:31:01.002446+00:00

Approved — **DECISÃO: `approved`** (controle terminal suportado: PATCH `status=done` + comentário, mesmo controle do precedente AID-3497/evento `source: comment`). Responde ao PO `63de53ed` e reconcilia o estágio review ativo (`b6f2b1e4`) com o head exato revisado `0b2358ac`.

## 1. Countersign/provenância genuína (review JÁ feito — nenhum novo run alegado nesta ação)

- **Veredito APROVADO sobre o head exato `0b2358ac`** (PR #626, base `d9dbdd5c` = lineage do achado `e95611da`), emitido pelo revisor designado ESE (`ae071215`), produtor ≠ verificador (LEE `98ed5775` produziu).
- **Provenância dos runs reais (não repetidos agora, conforme PO):** run `1b1e3182` — veredito `2db8316c` com red→green first-hand do revisor (base `d9dbdd5c` 4/4 falham com foco em BODY → head `0b2358ac` 4/4 passam, projeto `pwa` build+preview, worktree `/paperclip/tmp/aid3532-wt`); run `35e3955f` — countersign `d60a29e2` com re-runs independentes e recibo `aid3532-evidence/REVIEW-AID-3537.md` (veredito APROVADO, diff mínimo confirmado). Evidência do produtor: `aid3532-evidence/` (base-fail/fix-pass/escola-entry/lint) + comentário de entrega `16acbc6f`.
- **Estado reconciliado por esta ação:** decisão estruturada do estágio = `approved` @ `0b2358ac`; issue → **done** diretamente de `in_review` (sem passar por `in_progress`). A pendência exibida ("Review pending with ESE") era resíduo do veredito posted como comentário simples, sem o campo estruturado — corrigida agora pelo controle terminal.
- AID-3537 (filho de revisão pré-nativo): permanece fechada — veredito único é este, sobre este head.

## 2. Handoff FPE — PR #626 (não mergeado/não deployado nesta ação)

- **Base/limites:** `origin/main` avançou 2 commits além de `d9dbdd5c` (`128030d4` + merge `86fca779`, PR #627 — âncora de onda AID-3453). Verificado first-hand: o delta toca **apenas** `scripts/precheck/waves/AID-3453-d9dbdd5.json` (arquivo novo) — **zero sobreposição** com os 2 arquivos do PR (`escola.js`, spec novo) → **merge limpo, sem conflito esperado**; mudança mínima preservada (+75/−1).
- **Porta única:** `scripts/merge_pr.sh` (countersign-gate) — FPE mergeia, produtor não. CI: o novo spec roda no projeto `pwa` (build+preview), mesma suíte verde nos runs de revisão.
- **QA pública (AID-3517):** caso **B9** e marcador `test.fail` permanecem intocados até publicação futura aprovada; a atualização é da QA no run pós-publicação.

## 3. Disposição final

Defeito corrigido e revisado (aprovado); publicação permanece gated no merge FPE + publicação futura. Sem blockers. Runs de revisão: `1b1e3182`, `35e3955f`. Recibo desta reconciliação: este comentário (id retornado no PATCH) no thread da AID-3532.

**founder** · 2026-10-01T00:09:28.785944+00:00

Fechamento somente do recibo mecânico já solicitado, sem novo review/teste/código: o FPE transcreveu seu aceite626 no comentário GitHub5921782095 mas identificou o produtor na linha de proveniência e usou agent-id como session. A aprovação nativa9ca328d1 e os testes anteriores permanecem válidos. Registrar seu PRÓPRIO Countersign no PR626 head0b2358ac08b7b165e33f5d188255ff3d9f382a2f, citando o verdict real e Provenance de ESE com run/sessionIdAfter reais do review; superseder explicitamente a transcrição incorreta mantendo audit trail. Não inventar sessão nem usar ID do agente/projeto/\_default; se faltar, informar exatamente. Rodar apenas countersign\_gate\_check.py --pr626 pelo fluxo normal e devolver exit/URL; sem merge/deploy. FPE já publicou pedido não-countersign5921904650 com contexto. Esta ação não muda owner/permissão nem exige repetir prova4/4.

**Engine Systems Engineer** · 2026-10-01T00:12:31.039711+00:00

**Recibo mecânico concluído (diretiva PO `c1ae39de`) — countersign próprio do ESE registrado no PR #626, gate verde, merge NÃO executado.** Responde também ao pedido de coordenação FPE `5921904650`.

## 1. Countersign próprio (PR #626, head exato `0b2358ac08b7b165e33f5d188255ff3d9f382a2f`)

- **URL do countersign:** https://github.com/dandpb/aidevschool/pull/626#issuecomment-5922023787 (comment `5922023787`, 2026-10-01T00:12:04Z)
- **Citação operativa:** `Countersign: AID-3532 verdict 9ca328d1-51b0-438d-9811-137b5c4f23f2 head=0b2358ac08b7b165e33f5d188255ff3d9f382a2f` — cita o veredito APROVADO real (decisão estruturada `090f3de6`, estágio `b6f2b1e4` completado) e pinna o head atual do PR (verificado: open, não merged, head `0b2358ac…`).
- **Trailer de provenança (real, do review do ESE):** `Provenance: agent=engine-systems-engineer task=AID-3532 run=1b1e3182-3412-40af-b671-56328816f5c4 session=ses_f0bc59b90ffePVQYlv6Jl4ASvR` — run de revisão first-hand (autor do veredito `2db8316c`), sessionIdAfter verificável em `GET /api/heartbeat-runs/1b1e3182…` (agentId `ae071215`, succeeded). **Exatidão exigida pelo PO:** o run de reconciliação `9621e83a…` (que postou o `9ca328d1`) retorna HTTP 500 nesse GET (3 tentativas) — reportado como está; nenhuma sessão inventada, nenhum agent-id/projeto/_default usado.
- **Produtor no body (não na linha de provenância):** LEE `98ed5775`, entrega `16acbc6f`, run `e6a0ee4d`. Independência por AGENTE: `learning-engine-engineer` ≠ `engine-systems-engineer`.
- **Supersede explícito com audit trail preservado:** o comentário `5921782095` (transcrição FPE com os dois defeitos apontados: provenância atribuída ao produtor + agent-id como session) permanece no trail e está formalmente superseded pelo `5922023787` por ordem cronológica (AID-2768 §1/§6).

## 2. Gate mecânico — resultado literal (fluxo normal: `SDLC_GUARD_AID_RESOLVER=scripts/sdlc_aid_resolve.sh`, live via gh)

```
countersign-gate: PASS — operative citation: Countersign: AID-3532 verdict 9ca328d1-51b0-438d-9811-137b5c4f23f2 head=0b2358ac08b7b165e33f5d188255ff3d9f382a2f (posted 2026-10-01T00:12:04Z); producer agent 'learning-engine-engineer' / countersign agent 'engine-systems-engineer'; head 0b2358ac08b7b165e33f5d188255ff3d9f382a2f pinned
```

**exit=0.** Nota de não-fechamento: os check-runs `countersign-gate` do head pré-datam os comentários — o re-run do job no head permanece necessário no momento do merge pela porta única `scripts/merge_pr.sh` (padrão PR #627/#628). Gate não declarado fechado; merge/deploy NÃO executados nesta ação.

## 3. Disposição

Nada além do recibo mecânico foi feito (sem novo review/teste/código, sem repetir a prova 4/4, sem mudança de owner/permissão). Issue retorna a **done** — veredito `9ca328d1` e testes anteriores permanecem válidos; publicação segue gated no merge FPE + QA B9 pós-publicação (AID-3517).

---

