# AID-3585: Validar recibos canônicos offline

- **Status:** done | **Priority:** medium | **Origin:** manual
- **Assignee:** Verifier & Evidence Engineer | **Created:** 2026-10-01T04:15:16.494065+00:00 | **Updated:** 2026-11-01T14:14:33.726+00:00
- **ID:** `d5153c09-1a24-4e07-b41e-6d495249560e`

## Description

PO aprovou implementar um helper pequeno, puro e offline para evitar os erros repetidos de formatação de Provenance/Countersign. Produtor: Platform & CI Engineer. Revisor nativo distinto: Verifier & Evidence Engineer. Dedup já feito em scripts/docs e 24 PRs abertos; busca atual formatter só trouxe problemas antigos de biome, nenhum helper equivalente. Confirmar dedup antes de código; manter separado de AID-3278/controle-plane Phase2 e do template específico Jules AID-3275.



Consumir fatos EXPLICITAMENTE fornecidos/capturados: head esperado, identidades do produtor e revisor, run/session reais e referência do veredito. Reusar CITATION\_RE e PROVENANCE\_RE de scripts/countersign\_gate\_check.py e os contratos existentes; não mudar esse gate, suas regex, regras, permissões, CI ou merge door. Escolher mínima fronteira aditiva para helper + testes/fixtures e pequena instrução de uso; worktree e branch isoladas. --print-citation existente só imprime citação já válida, countersign\_assign repassa o texto; não duplicar isso sem valor.



Saída da FERRAMENTA: texto RASCUNHO canônico e relatório de validação, nada publicado. Linhas canônicas completas e isoladas; explicações em linhas separadas. Distinguir produtor/revisor e rejeitar campo ausente, placeholder conhecido (incluindo \_default), agent ID usado como session, head ausente/stale/divergente e produtor\=revisor. Nunca adivinhar run/session/veredito nem inferir autoria verdadeira por formato. UUID em session não é automaticamente inválido: comparar com os actor IDs capturados, preservando formatos legados legítimos. Somente emitir formato válido, jamais review válida/countersign válido/merge autorizado.



Reter fixtures sintéticas positivas e negativas: linha válida independente, prosa ao fim de session, campos ausentes, placeholders, actor/session trocados, head mismatch, mesmo ator e sessão legada legítima. Testes determinísticos/offline no pin final, com resultados/limites. A ferramenta não usa API/credencial/rede, não posta no GitHub, não reexecuta checks nem autoriza operação. Não coletar segredos nem consultar credenciais.



Entrega da implementação: patch/Draft isolado com evidência dos testes e revisão independente V\&E por ESTA etapa nativa, não criar filho de review. Não alterar testes existentes para fazer passar. Preservar WIP/stash alheio; sem reset/clean. Ao receber 403/409/422 em ação de board, parar e reportar pelo dono legítimo, sem endpoint/ator/owner alternativo ou issue-workaround. Nada aqui autoriza merge/deploy, mudança de acesso ou reavaliação manual de CI de outros PRs.

## Document `Continuation Summary` (2026-10-01)

# Continuation Summary

- Issue: AID-3585 — Validar recibos canônicos offline
- Status: done
- Priority: medium
- Current mode: review
- Last updated by run: a48e07e6-c1e5-4dd6-9261-a5131a3e6240
- Agent: Verifier & Evidence Engineer (opencode_local)

## Objective

PO aprovou implementar um helper pequeno, puro e offline para evitar os erros repetidos de formatação de Provenance/Countersign. Produtor: Platform & CI Engineer. Revisor nativo distinto: Verifier & Evidence Engineer. Dedup já feito em scripts/docs e 24 PRs abertos; busca atual formatter só trouxe problemas antigos de biome, nenhum helper equivalente. Confirmar dedup antes de código; manter separado de AID-3278/controle-plane Phase2 e do template específico Jules AID-3275.



Consumir fatos EXPLICITAMENTE fornecidos/capturados: head esperado, identidades do produtor e revisor, run/session reais e referência do veredito. Reusar CITATION\_RE e PROVENANCE\_RE de scripts/countersign\_gate\_check.py e os contratos existentes; não mudar esse gate, suas regex, regras, permissões, CI ou merge door. Escolher mínima fronteira aditiva para helper + testes/fixtures e pequena instrução de uso; worktree e branch isoladas. --print-citation existente só imprime citação já válida, countersign\_assign repassa o texto; não duplicar isso sem valor.



Saída da FERRAMENTA: texto RASCUNHO canônico e relatório de validação, nada publicado. Linhas canônicas completas e isoladas; explic
[truncated]

## Acceptance Criteria

No explicit acceptance criteria captured.

## Recent Concrete Actions

- Run `a48e07e6-c1e5-4dd6-9261-a5131a3e6240` finished with status `succeeded` at 2026-10-01T05:02:13.727Z.
- Board state confirmed: review stage, participant is me, returnAssignee is the producer, lastDecisionOutcome none. Worktree `aid3585-wt` at `d015cb98` matches the reported PR637 head. Now I'll inspect the exact delta and verify the evidence claims independently.

The thread confirms the mandate: PO approved fixing only the N1 finding from my earlier review (parecer 5c74d991) — `check_facts` tuple-contract bug — at new head `d015cb98`. Now I review that delta.

Delta is minimal and matches the mandate: `check_facts` now returns `(p, {})` with the F0001 type documented, `check_draft` guards non-dict facts, and `countersign_gate_check.py` has 0 changed lines. Now the tests and fixture:

Tests cover the tuple contract, draft guard, and both CLI modes. Now independent verification at the reviewed head:

Both CLI modes now emit documented F0001 with exit 1, no traceback. Quick fail-before confirmation at the previous head `f9c15c3f`:

Fail-before confirmed (`ValueError: not enough values to unpack`) at `f9c15c3f`; fixed at `d015cb98`. One last check — that PR637's head on GitHub matches the reviewed commit:

PR637 head matches exactly. All evidence collected — verdict
[truncated]

## Files / Routes Touched

- `scripts/merge_pr.sh`
- `scripts/countersign_gate_check.py`
- `scripts/receipt_canon_check.py`
- `scripts/docs`
- `scripts/countersign`
- `scripts/receipt_canon_fixtures/facts_non_object.json`
- `scripts/test_receipt_canon_check.py`
- `scripts/sdlc_aid_resolve.sh`
- `scripts/storage/test_progress_backup.py`
- `scripts/receipt_canon_fixtures/`

## Commands Run

- Heartbeat run `a48e07e6-c1e5-4dd6-9261-a5131a3e6240` invoked adapter `opencode_local`.
- Detailed shell/tool commands remain in the run log and transcript.

## Blockers / Decisions

- No new blocker was recorded by the latest run.

## Next Action

- Review the completed issue output and close any remaining follow-up comments.

## Comments (9)

**Platform & CI Engineer** · 2026-10-01T04:27:13.706698+00:00

**Entrega da implementação AID-3585 — Draft PR #637** (head `f9c15c3fc6676fe25f1b24ee036fdc1fd434136d`, branch `aid3585/receipt-canon-offline` off `origin/main`@`86fca779`, worktree isolada):

Helper offline de recibos canônicos, conforme plano PO:

- **`scripts/receipt_canon_check.py`** — puro/offline (stdlib; sem rede/API/credencial; nada publicado). Reusa `CITATION_RE`/`PROVENANCE_RE`/`strip_code_fences` de `countersign_gate_check.py` **por import** (gate intocado). `--render` emite rascunho canônico de fatos explícitos; `--check` valida rascunho com relatório (códigos F*/D*). Rejeita: campo ausente (nunca adivinha), placeholder (incl. `_default`), agent ID como session (vs `captured_actor_ids`; UUID fora deles = legítimo, legado preservado), head ausente/stale/divergente (contrato gate §3: `head=` ou 40-hex nu), produtor=revisor, prosa ao fim de linha, typo de prefixo, linha em fence (AID-2824). Sucesso = apenas "forma canônica do RASCUNHO OK".
- **`scripts/test_receipt_canon_check.py` + `scripts/receipt_canon_fixtures/`** — 15 fixtures sintéticas retidas (positivas/negativas: linha válida isolada, prosa ao fim de session, campos ausentes, placeholders, actor/session trocados, head mismatch, mesmo ator, sessão legada legítima, fence, typo, 40-hex nu).
- **`docs/sdlc/README.md`** — § "Helper offline de recibos canônicos (AID-3585)" após o bloco canônico (instrução de uso curta).

**Evidência (offline, determinística, pin `f9c15c3f`):** unittest **28/28 OK**; pytest **28 passed**; gate self-test **35/35** (regressão verde, gate não alterado); `py_compile` OK; determinismo do `--render` coberto em teste. CI do Draft em curso (45 check-runs; factory/vendored-guard success no momento do post).

**Dogfood:** o próprio body do PR #637 e o trailer abaixo foram validados pelo helper antes da postagem (`--check`, rc=0, 0 avisos).

**Dedup confirmado antes do código:** `CITATION_RE`/`PROVENANCE_RE` só existiam no gate; `--print-citation` só imprime citação já válida; `countersign_assign.sh` só repassa texto — nenhum validador offline equivalente (scripts/, docs/, PRs abertos). Separado de AID-3278/control-plane Phase2 e do template Jules AID-3275.

**Fronteira:** nenhum teste existente alterado; sem reset/clean; WIP/stash alheio preservado; nenhum merge/deploy/CI-change autorizado ou executado; 403/409/422 não ocorreram.

**Disposição: `in_review` pela etapa nativa de review desta issue** (participante Verifier & Evidence Engineer `616b5f9b`, approvalsNeeded 1) — sem filho de review, conforme instrução. Countersign/merge seguem o fluxo próprio do gate quando aplicável; nada aqui os autoriza.

Provenance: agent=platform-ci-engineer task=AID-3585 run=24874041-747b-4680-a21e-2b9f0ee61e03 session=ses_f0a536cecffeqjpnGhfipnPXAT

**founder** · 2026-10-01T04:32:37.408755+00:00

Precisão de contrato do PO para a revisão corrente, sem ampliar o escopo: em main86fca779 o gate valida TEXTO e usa o primeiro trailer canônico do body/comentário mais antigo; ele não autentica poster GitHub, run ou session. docs/sdlc/templates/verdict.md:15–19 descreve agent como board-role slug de quem posta. Portanto formato válido não prova identidade, revisão nem autorização de merge. O helper deve continuar puro/offline, com fatos explícitos e saída de RASCUNHO; não deve sugerir transcrever o produtor como assinatura própria, postar entrada operativa do gate, reviver agente que perdeu papel ou trocar o dono. O reviewer atual pode conferir e reunir fatos atribuídos às fontes, mas canonicalização para uso operativo exige interpretação legítima do owner. O precedente CEO #597 tinha identidade/responsabilidade de produtor próprias e não é permissão geral de substituição. Verificar essa distinção na documentação/saída já implementadas, sem alterar gate/regras/CI ou repetir suites fora do delta. Preserve sua revisão nativa corrente; não criar filho ou segundo reviewer.

[@Verifier & Evidence Engineer](agent://616b5f9b-15c8-4ad1-816c-78a7317e0202?i=puzzle)

**Verifier & Evidence Engineer** · 2026-10-01T04:33:55.632909+00:00

**APPROVED — parecer V&E da revisão nativa AID-3585** (revisor: Verifier & Evidence Engineer `616b5f9b-15c8-4ad1-816c-78a7317e0202`; produtor: Platform & CI Engineer `1e9be0fa-c320-4309-9704-c755c53da7fd`, run `24874041-747b-4680-a21e-2b9f0ee61e03`, session `ses_f0a536cecffeqjpnGhfipnPXAT`; head revisado: `f9c15c3fc6676fe25f1b24ee036fdc1fd434136d`; PR #637 base `main`@`86fca77987408ff85d8050cb2d87ded48a7e49b0`). `lastDecisionOutcome` era `none` antes desta decisão. Toda a evidência abaixo foi verificada **first-hand nesta sessão** em worktree limpa detached no head.

## Tabela verificação × evidência

| # | Afirmação do produtor | Verificação independente | Resultado |
|---|---|---|---|
| 1 | Gate intocado | `git diff 86fca779..f9c15c3f -- scripts/countersign_gate_check.py scripts/storage/test_progress_backup.py .github/` → **vazio** (byte-idêntico base↔head); API GitHub PR #637 files: 18 arquivos, **897+/0−**, somente helper/testes/fixtures/docs | ✅ |
| 2 | Reuso por import dos contratos | `receipt_canon_check.py:54-63` importa `CITATION_RE`/`PROVENANCE_RE`/`SHA40_RE`/`_FENCE_LINE_RE`/`strip_code_fences` do gate; classes locais (`AGENT_RE`/`TASK_RE`/`RUN_RE {3,}`/`SESSION_RE`/`VERDICT_REF_RE`) conferidas idênticas às do gate (`countersign_gate_check.py:81-91`) — sem divergência de cópia | ✅ |
| 3 | unittest 28/28; pytest 28; gate self-test 35/35 | Re-executados por mim no head `f9c15c3f`: unittest **28/28 OK**; pytest **28 passed**; `py_compile` OK; `countersign_gate_check.py --self-test` → **35/35 passed** | ✅ |
| 4 | "CI do Draft em curso" | 46 check-runs no head: 42 success / 2 skipped / **2 failure** — ambas são o estado **pré-countersign by-design**, não defeito: `countersign-gate` "no Countersign line found in any PR comment (AID-2768 §1)" (job 110218369586) e `SDLC guardrails` "process-authority path docs/sdlc/README.md … post the countersign verdict citation first (AID-2318)" (job 110218370099); self-tests internos verdes no mesmo job (26/26 §3); provenance trailer do produtor aceito | ✅ (esperado) |
| 5 | Dogfood: PR body + recibo validados pelo helper | Reproduzido: `--check` do body real do PR #637 e do recibo (comentário `cc3bb1b4`) contra fatos pinados no head real → **rc=0, 0 avisos** nas duas entradas | ✅ |
| 6 | Sem filho de review | AID-3585 children = **0** | ✅ |
| 7 | Docs mínima | `docs/sdlc/README.md` +20 linhas (§ "Helper offline de recibos canônicos (AID-3585)") — instrução de uso curta, dentro do escopo aprovado pelo PO; não toca `curriculum/` | ✅ |

Fronteira verificada adicionalmente (testes retidos do produtor, re-executados): sem APIs de rede no fonte; VEREDITO de sucesso jamais alega countersign/review/merge; exit 0/1/2; fixtures 100% sintéticas.

## Achado N1 — NÃO bloqueante (approve com nit)

`--facts` com JSON não-objeto (ex.: `[1,2]`) → **traceback** `ValueError: not enough values to unpack` em `main` (`receipt_canon_check.py:506`) em vez do relatório `F0001` + exit 2 documentados: o early-return de `check_facts` (`receipt_canon_check.py:134-135`) devolve `p` sem o `parsed`. Reproduzido: exit 1 com traceback — **fail-closed** (nada renderizado/publicado; nenhum caminho produz falso-OK; nenhum caminho válido é afetado). Ajuste de ~1 linha (devolver tupla) a dobrar oportunisticamente no Draft antes do retarget — **sem necessidade de re-revisão V&E** para esse ajuste.

Nota de registro: o resumo de continuação listava `scripts/countersign_gate_check.py` e `scripts/storage/test_progress_backup.py` como "files touched" — foram apenas lidos/executados; o diff prova que não foram modificados.

## Disposição

Review stage **APROVADO** — aplico a disposição estruturada suportada (status → `done`) nesta edição. Nada aqui autoriza merge ou deploy: o PR #637 permanece Draft/`blocked` e o countersign/merge door seguem o fluxo próprio do gate (AID-2768/AID-2318), sob a autoridade competente do repo.

**Verifier & Evidence Engineer** · 2026-10-01T04:34:03.892914+00:00

**Approved** — revisão nativa AID-3585 (revisor V&E 616b5f9b): PR #637 head f9c15c3f (base main@86fca779) verificado first-hand — fronteira 100% aditiva (897+/0−; gate/CI/storage byte-idênticos), contratos do gate reusados por import (classes idênticas), unittest 28/28 + pytest 28 + gate self-test 35/35 re-executados no head, dogfood reproduzido (rc=0, 0 avisos no body do PR e no recibo), sem filho de review. 2 falhas de CI são o estado pré-countersign by-design (AID-2768 §1 / AID-2318), não defeitos. 1 nit N1 não-bloqueante registrado (F0001 inalcançável em facts não-objeto; fail-closed; ~1 linha, sem re-revisão). Evidência completa no comentário 5c74d991-5d03-4950-9084-fb8df13907e2. Nada aqui autoriza merge/deploy; countersign/merge door seguem o fluxo próprio do gate.

**Verifier & Evidence Engineer** · 2026-10-01T04:39:59.064684+00:00

**Resposta ao comentário do PO (7e855f68) — distinção formato≠identidade verificada no delta AID-3585 (head `f9c15c3f`)**

Revisor: V&E `616b5f9b-15c8-4ad1-816c-78a7317e0202`, run `e73b68e5-8a4b-4934-819c-2a59bf1b26f6` (este heartbeat). Verificação first-hand read-only em worktree detached no head revisado; gate/regras/CI intocados; nenhuma suite re-executada fora do delta — apenas o CLI do próprio delta com fatos 100% sintéticos.

| Exigência do PO | Evidência (arquivo:linha em `f9c15c3f`) | Resultado |
|---|---|---|
| Helper puro/offline | `scripts/receipt_canon_check.py:42-48` importa só stdlib; teste proíbe `requests`/`urllib`/`http.client`/`socket`/`subprocess.run`/`os.environ` no fonte (`scripts/test_receipt_canon_check.py:218-222`) | ✅ |
| Fatos explícitos, nada adivinhado | `--facts` obrigatório (`receipt_canon_check.py:486`); F0002 "campo ausente … o tool nunca adivinha/defaulta valores" (`:140-141`) | ✅ |
| Saída de RASCUNHO | header `# RASCUNHO canônico (AID-3585) — texto de recibo, NÃO publicar como está` (`:233`); VEREDITO "forma canônica do RASCUNHO OK" (`:471`) | ✅ |
| Formato válido ≠ identidade/revisão/autorização de merge | docstring FRONTEIRA: "não posta no GitHub, não reexecuta checks, não autoriza operação… identidades reais NÃO são verificáveis aqui" (`:14-19`); DISCLAIMER (`:87-92`) anexado a todo sucesso (`:472-474`); `test_success_output_never_claims_countersign_or_merge` exige "RASCUNHO" no VEREDITO e veta "countersign válido"/"merge autorizado" (`test_receipt_canon_check.py:225-234`) | ✅ |
| Não sugerir transcrever o produtor como assinatura própria | instruções do render atribuem a linha 1 ao comentário de registro **do produtor** e as linhas 2–3 ao comentário **do revisor distinto** (`:243-246`); D0009 rejeita trailer cujo agent não bate com nenhum papel dos fatos (`:422-426`); F0009 veta produtor=revisor (`:213-216`) | ✅ |
| Não postar entrada operativa do gate | ferramenta offline, não posta nada (`:14-15`); linha canônica em fence = "documentação, não operativa (AID-2824)" D0001 (`:356-358`); `docs/sdlc/README.md` §AID-3585: "nunca adivinha valores e nunca publica" | ✅ |
| Não reviver agente que perdeu papel / trocar o dono; precedente #597 não invocado | zero chamadas de API/board no delta (offline, sem credencial); grep `597|substitu|revive|r eviver|trocar o dono|owner|dono|transcrev` sem nenhum hit no helper/testes/fixtures/docs do delta; papéis classificados apenas pela identidade explícita dos fatos, nunca inferida pelo formato (`:409-428`) | ✅ |
| Consistência com `docs/sdlc/templates/verdict.md:15-19` (agent = board-role slug de quem posta) | helper trata `agent` como slug opaco vindo dos fatos (AGENT_RE `:77`) e nunca alega autenticar o poster (FRONTEIRA `:17-19`) | ✅ |

**Dogfood first-hand** (fatos sintéticos, no head do worktree): `--render` → exit 0; saída inicia com "RASCUNHO … NÃO publicar como está", as instruções encaminham cada linha ao papel legítimo e o VEREDITO termina com o disclaimer "não é countersign, não é review, não autoriza merge nem qualquer operação; … não verifica … identidades reais".

**Nota N2 (não-bloqueante, registro):** a instrução "poste como comentário de PR (linhas fora de code fence), sem prosa no fim" (`:247-248`) descreve a mecânica de colocação do contrato do gate para o poster legítimo de cada linha — a atribuição por papel está explícita nos bullets anteriores, sob o header "NÃO publicar como está". Julgo conforme o contrato do PO; se quiserem wording ainda mais defensivo (ex.: "cada papel posta apenas a própria linha"), é ajuste de ~1 linha no Draft, sem necessidade de re-revisão V&E.

**Disposição:** a revisão nativa permanece **aprovada** (decisão `914bec05` registrada às 04:34:03Z, antes do reopen mecânico do wake deste comentário; parecer `5c74d991` + recibo `e05af9e7`). Este comentário fecha o loop do comentário pendente; reaplico a disposição suportada status → `done`. Nada aqui autoriza merge/deploy; countersign/merge door seguem o fluxo próprio do gate (AID-2768/AID-2318), sob a autoridade competente do repo.

**Verifier & Evidence Engineer** · 2026-10-01T04:40:06.077688+00:00

Fechamento pós-wake (AID-3585): comentário do PO 7e855f68 respondido com verificação first-hand da distinção formato≠identidade no delta (tabela requisito×evidência×resultado no comentário 01a7d911) — helper puro/offline, saída RASCUNHO com disclaimer, sem sugerir transcrição de assinatura alheia/entrada operativa/revivificação/troca de dono, #597 não invocado. Revisão nativa segue aprovada (decisão 914bec05; parecer 5c74d991). Gate/regras/CI intocados; nenhuma suite re-executada fora do delta. Nada autoriza merge/deploy — countersign/merge door seguem o fluxo próprio do gate.

**founder** · 2026-10-01T04:56:10.351994+00:00

PO aprovou fechar o N1 útil identificado no parecer V\&E 5c74d991, pela tarefa existente e pelo produtor original Platform & CI Engineer. Reabrir somente este delta no Draft PR637: corrigir o retorno de check\_facts para facts não-objeto, para emitir F0001 documentado e exit não-zero em vez de traceback; reter um teste negativo de input não-objeto. Preservar todo o escopo puro/offline, gate/regex/CI/permissões intocados e WIP alheio.



O aceite V\&E anterior em f9c15c3f permanece histórico e não é aceite automático do novo head. Depois da correção, devolver pela revisão nativa V\&E já configurada para verificação do delta, sem criar filho, audit loop ou reexecutar baselines concluídas sem necessidade. Reter prova falha-antes/passa-depois do diagnóstico relevante e o head final. Não mudar mensagens/documentação fora do necessário para N1, não postar assinatura de outro agente, nem merge/deploy/rerun manual de workflows. Parar e reportar ao dono legítimo se operação de board negar403/409/422; sem sondagem/ator/owner alternativo.

**Platform & CI Engineer** · 2026-10-01T04:59:47.210588+00:00

**Correção do N1 entregue — AID-3585, delta no Draft PR #637** (novel head `d015cb98e3a9edfb03d3a77ca0d92c04c6c2e117`, branch `aid3585/receipt-canon-offline`, commit `fix(scripts): AID-3585 N1 — check_facts devolve (p, parsed) p/ facts não-objeto...`).

Respondendo ao comentário do PO (1588d6e7): o delta N1 do parecer V&E 5c74d991 foi reaberto **somente** no PR #637, pelo produtor original, com fronteira preservada — escopo puro/offline intocado, `countersign_gate_check.py` com **0 linhas alteradas** (self-test 35/35 passed), nenhuma regex/regra/permissão/CI/merge door tocada, WIP alheio preservado, sem filho/audit loop/reexecução de baselines.

## Diagnóstico (causa raiz)
`check_facts` tinha early-return quebrando o contrato de tupla `(p, parsed)` no branch F0001: devolvia só `p`, então todo chamador que desempacota duas valores crashava com `ValueError: not enough values to unpack` (traceback) em vez de emitir o F0001 documentado — em `main()` (linha 506) e `check_draft()` (linha 341), para facts array/string/número, nos modos `--render` e `--check`.

## Correção (mínima, 2 pontos)
1. `check_facts`: branch não-objeto agora devolve `p, {}` e a mensagem F0001 documenta o tipo recebido: `fatos não são um objeto JSON (tipo list|str|int)`;
2. `check_draft`: guarda `facts` não-dict antes de acessar `.get()` (o F0001 já é reportado no escopo fatos; o rascunho segue avaliado sem crash).

## Prova falha-antes/passa-depois (retida em `/paperclip/aid3585-evidence/n1/`)
- **FAIL-BEFORE (head f9c15c3f)**: `--render` e `--check` com facts `['não','é','um','objeto']`, `"apenas uma string"` e `42` → `Traceback ... ValueError: not enough values to unpack (expected 2, got 1)`, exit 1 sem relatório (arquivo `fail_before.txt`).
- **PASS-AFTER (head d015cb98)**: mesmos inputs → `REJECT F0001: fatos não são um objeto JSON (tipo list)` + `VEREDITO: FATOS REJEITADOS — 1 rejeições (forma; nada publicado)` + exit 1, **sem traceback**, nos dois modos (arquivo `pass_after.txt`); nada é renderizado/advinhado.

## Teste negativo retido
- Fixture `scripts/receipt_canon_fixtures/facts_non_object.json` + classe `TestNonObjectFacts` (4 testes: contrato de tupla p/ list/str/int/None, `check_draft` não levanta, CLI `--render` e `--check` exit 1 com F0001 e sem Traceback).
- Suíte: `python3 scripts/test_receipt_canon_check.py` → **32/32 OK**; `python3 -m pytest scripts/test_receipt_canon_check.py -q` → **32 passed**; `python3 scripts/countersign_gate_check.py --self-test` → **35/35 passed** (gate intocado).
- Sem mudanças de mensagens/documentação fora do necessário ao N1 (a única mensagem alterada é a do próprio F0001, que agora nomeia o tipo).

## Disposição
Devolvendo à **revisão nativa V&E já configurada** (participante `616b5f9b`, approvalsNeeded 1) para verificação first-hand apenas deste delta — o aceite anterior em f9c15c3f permanece histórico, sem aceite automático do novo head. Nada aqui autoriza merge/deploy: o gate mecânico de countersign do PR #637 permanece.

Provenance: agent=platform-ci-engineer task=AID-3585 run=f0c13f1f-7e5a-429f-b038-fbff8de93dfc session=ses_f0a2df8deffeJj8kZQ0YYwvi35

**Verifier & Evidence Engineer** · 2026-10-01T05:02:05.108978+00:00

Approved — revisão nativa V&E do delta N1 (AID-3585). Revisor: V&E `616b5f9b-15c8-4ad1-816c-78a7317e0202`, run deste heartbeat; head revisado `d015cb98e3a9edfb03d3a77ca0d92c04c6c2e117` (PR #637 draft/open, branch `aid3585/receipt-canon-offline`, conferido via API GitHub). Mandato: PO 1588d6e7 — somente o N1 do parecer V&E 5c74d991; aceite histórico em f9c15c3f não era aceite automático deste head.

## Verificação first-hand (revisor, evidência independente do produtor)

1. **Fronteira mínima**: delta `f9c15c3f→d015cb98` = 3 arquivos, +40/−2 (`receipt_canon_check.py` 7 linhas; `facts_non_object.json` 1 linha; `test_receipt_canon_check.py` 34 linhas); `scripts/countersign_gate_check.py` com **0 linhas alteradas** (git diff vazio) — regex/regras/permissões/CI/merge door intocados.
2. **Correção do contrato de tupla**: `check_facts` branch não-objeto devolve `(p, {})` com F0001 documentando o tipo (`scripts/receipt_canon_check.py:131-136`); `check_draft` guarda facts não-dict (`:342-343`, F0001 já reportado no escopo fatos).
3. **Execução independente no head**: pytest e unittest → **32/32 passed**; gate self-test → **35/35 passed** (gate intocado); `--render` e `--check` com `facts_non_object.json` → `REJECT F0001: fatos não são um objeto JSON (tipo list)` + `VEREDITO: FATOS REJEITADOS`, **exit 1, sem Traceback** em ambos os modos.
4. **Fail-before reproduzido**: em `f9c15c3f`, mesmo input → `ValueError: not enough values to unpack (expected 2, got 1)` (crash), confirmando o diagnóstico do N1.
5. **Teste negativo retido**: `TestNonObjectFacts` cobre contrato de tupla (list/str/int/None), guarda de `check_draft` e os dois modos CLI com exit 1 + ausência de Traceback.

Disposição: estágio de review APROVADO — status `done`. Esta aprovação não autoriza merge/deploy; o PR #637 permanece draft e o countersign/merge door seguem o fluxo próprio do gate.

---

