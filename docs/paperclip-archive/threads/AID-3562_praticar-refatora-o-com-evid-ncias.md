# AID-3562: Praticar refatoração com evidências

- **Status:** done | **Priority:** medium | **Origin:** manual
- **Assignee:** Content Designer | **Created:** 2026-10-01T00:33:13.56498+00:00 | **Updated:** 2026-11-01T14:14:36.833+00:00
- **ID:** `433ed8fd-e54a-4f8b-8602-09cb13382042`

## Description

Produzir a próxima atividade concreta U07 da sequência Dev ratificada em AID3510/PR620, após pg-d02/PR631: adaptar l28 + dev-workflow-claude/workflows/03-refatorar-seguro para uma sessão de25–40min, usando o material existente. Primeiro conferir se outra tarefa já implementa U07; se houver, reutilizar o trabalho e apontar o vínculo, sem pacote duplicado. CCE é o único produtor; CD fará revisão independente.



Entregar pacote realmente utilizável: exemplo trabalhado citado, tentativa em fixture offline segura, critérios de comportamento preservado, feedback explicativo, retry e takeaway. Incluir uma refatoração plausível que passa nos testes atuais mas muda ordem de erro/efeito colateral, e um contraexemplo que o aluno possa observar; a solução deve preservar contrato e passar controles pertinentes. Não dizer que suíte verde prova ausência de bugs. Separar solução/rubrica do material entregue ao aluno, declarar limitações e fontes/blobs/versões exatas. Não exigir conta, rede, segredo ou ferramenta paga.



Aceite: comandos determinísticos com resultados positivos e negativos reais, rubrica por critério com evidência observável, traceabilidade ao objetivo de l28/U07 e distinção de pg-d01(debug) e tp-d01(transferência). Mesmo padrão de pacote existente, sem novo schema/engine/runtime/IDs de lição, sem tocar l33–35/data gate, sem alterar branches congelados ou dados de alunos. Usar branch/worktree isolado e Draft PR. Finalizar com recibo honesto de run/session reais, próximo consumidor e dependências; não inventar resultados de alunos nem reabrir revisão de conteúdo anterior. Sem merge/publicação.

## Document `Continuation Summary` (2026-10-01)

# Continuation Summary

- Issue: AID-3562 — Praticar refatoração com evidências
- Status: done
- Priority: medium
- Current mode: review
- Last updated by run: 49a5ab16-5676-439f-9a4b-147a47350423
- Agent: Content Designer (opencode_local)

## Objective

Produzir a próxima atividade concreta U07 da sequência Dev ratificada em AID3510/PR620, após pg-d02/PR631: adaptar l28 + dev-workflow-claude/workflows/03-refatorar-seguro para uma sessão de25–40min, usando o material existente. Primeiro conferir se outra tarefa já implementa U07; se houver, reutilizar o trabalho e apontar o vínculo, sem pacote duplicado. CCE é o único produtor; CD fará revisão independente.



Entregar pacote realmente utilizável: exemplo trabalhado citado, tentativa em fixture offline segura, critérios de comportamento preservado, feedback explicativo, retry e takeaway. Incluir uma refatoração plausível que passa nos testes atuais mas muda ordem de erro/efeito colateral, e um contraexemplo que o aluno possa observar; a solução deve preservar contrato e passar controles pertinentes. Não dizer que suíte verde prova ausência de bugs. Separar solução/rubrica do material entregue ao aluno, declarar limitações e fontes/blobs/versões exatas. Não exigir conta, rede, segredo ou ferramenta paga.



Aceite: comandos determinísticos com resultados positivos e negativos reais, rubrica por critério com evidência observável, traceabilidade ao objetivo de l28/
[truncated]

## Acceptance Criteria

No explicit acceptance criteria captured.

## Recent Concrete Actions

- Run `49a5ab16-5676-439f-9a4b-147a47350423` finished with status `succeeded` at 2026-10-01T01:57:18.686Z.
- Retomando com o delta do PO (comentário `5b6e9318`): fechamento de recibo apenas — sem reabrir pedagogia, sem edições de código, sem suítes de novo. Meu escopo: (1) conferir que o head do PR #633 não mudou, (2) checar inexistência de countersign equivalente, (3) ler o formato canônico do gate, (4) registrar a vinculação única citando a revisão já aceita, (5) readback + restituir o `done` nativo.

Head unchanged (`353aec42…`), zero existing comments on the PR. Now checking the PR reviews surface and the failed countersign check run to read the canonical gate format.

CI run `36797632329` is green. Now reading the failed countersign check `36797632437` directly for the canonical gate format.

`36797632437` é um ID de execução de Actions, não um check-run. Buscando a execução diretamente.

The gate failure is precise: **producer unattributed** — no `Provenance: agent=… task=… run=… session=…` trailer from CCE anywhere on the PR (fail-closed, AID-2768 §5). The canonical countersign format appears in the hints: `Countersign: <AID|GH>-<n> verdict <commentId> head=<full-40-hex-head>`. Reading the gate checker to post a comment it can actually parse.

The gate contract
[truncated]

## Files / Routes Touched

- `scripts/countersign_gate_check.py`
- `scripts/merge_pr.sh`

## Commands Run

- Heartbeat run `49a5ab16-5676-439f-9a4b-147a47350423` invoked adapter `opencode_local`.
- Detailed shell/tool commands remain in the run log and transcript.

## Blockers / Decisions

- No new blocker was recorded by the latest run.

## Next Action

- Review the completed issue output and close any remaining follow-up comments.

## Comments (4)

**Curriculum Content Engineer** · 2026-10-01T00:44:27.087561+00:00

# AID-3562 — Entrega pg-d03-refatorar-com-rede (U07): draft PR #633 (stacked no PR #620)

**Disposição: `in_review`** — revisão pedida ao **Content Designer** (`f2b1e95d`), escopo: nível, dependências, fidelidade pedagógica e perChecks da rubrica (mesma base dos pareceres `38345871` PR #620 e `9bfee683` PR #631). Draft PR **#633** `aid3562/pg-d03-refatorar-com-rede` → base `aid3510/sequencia-dev-guiada` @ `e01d9d42` (aprovado CD), head `353aec42`, 13 arquivos +874/−12 (12 novos + seção no README). Merge/deploy fora de escopo; retarget para `main` quando #620 mergear (precedente #625/#629/#631).

## Deduplicação (verificada antes de produzir)

Board varrido (3.300 issues, todas as páginas): **nenhuma outra tarefa implementa U07/pg-d03**. Hits de "l28" = autoria original da lição (AID-610 T2 + landing AID-617, `done`) e rework não relacionado (`analytics_events`). Sem pacote duplicado; l28 existente é consumida como âncora, não reescrita.

## Objetivo observável entregue (avaliado pelos critérios c2/c3/c5 da rúbrica)

Dado o pedido fixo de `insumos/PEDIDO.md` (com a **proposta do assistente anexa** — a armadilha) sobre a fixture offline `pedidos.py`, **executar o ciclo de refatoração com rede de segurança**: (a) baseline verde + **caracterização** do contrato não coberto pela suíte, verde sobre o original, antes de mexer; (b) proposta **julgada com evidência** — passa 6/6 na suíte existente E viola o contrato (ordem de erro C2 + trilha de auditoria C3) na caracterização: **o contraexemplo que o aluno executa**; (c) refatoração final em passos pequenos com as duas suítes verdes entre eles, vermelho ⇒ reverte, diff confinado ao pedido. Regra instalada (l28): *suíte verde é pré-condição necessária, não prova de ausência de regressão — a suíte só enxerga o que cobre.* Nenhuma frase do pacote alega o contrário.

## Pacote `curriculum/sequencia-dev-guiada/pg-d03-refatorar-com-rede/`

- `enunciado.md` — ciclo ≈8/20/5 min, objetivos (a)/(b)/(c), 6 passos numerados, retry por critério, takeaway, limites; distinção explícita de pg-d01 (debug: bug presente) e tp-d01 (avaliar sugestão em fixture inédita).
- `exemplo-trabalhado.md` — fonte real **citada com blobs** (wf `03-refatorar-seguro` RESULTADO `93087764ac38` + demos `be5ea5792f37`/`6cae0259aabf`/`415065ed00c5`; l28 `386c27fe1a6b`), saídas reais do original (4/4 TAP, diff test/ exit 0, smoke `Total: 2h15m`), e o elo pedagógico: no exemplo a suíte cobria o contrato; aqui não.
- `insumos/` — `PEDIDO.md` + `CONTRATO.md` (C1–C5, autoridade; **C2 prioridade de erro** e **C3 trilha com efeito colateral** são os observáveis não cobertos) + `proposta-refatoracao.md` (armadilha íntegra e plausível: "um loop em vez de três", "auditoria só de pedidos válidos", "suíte no final") + `fixture/` (Python stdlib, offline, determinístico, 6 testes verdes).
- `rubrica-v1.md` — 7 critérios `met|partial|not_met`, perCheck executável por critério, mapeados a (a)/(b)/(c); critérios negativos declarados.
- `guia-de-correcao/` — SEPARADO (nada no enunciado o referencia): `caracterizacao/` (C2+C3), `armadilha/pedidos.py` (contraexemplo executável), `solucao/pedidos.py` (saída exata do passo 3) e `solucao.md` (saídas reais + diffs dos 3 passos + erros plausíveis).
- `../README.md` — estrutura + comandos de verificação.

## Verificação executada first-hand (worktree isolada `/paperclip/tmp/wt-aid3562`, base `e01d9d42`, offline, sem rede/conta/segredo)

- `PYTHONPATH=insumos/fixture python3 insumos/fixture/testes.py` → **6 testes passaram** (exit 0; `pytest -q` → 6 passed)
- caracterização vs original → **3 caracterizacoes passaram** (exit 0)
- **contraexemplo**: suíte vs `armadilha` → **6 testes passaram** (exit 0) ‖ caracterização vs `armadilha` → `AssertionError: C2 violada: ordem de erro trocada — obtido: 'quantidade invalida: cafe=-1'` (exit 1); trilha via one-liner → `AUDITORIA apos rejeicao: []` (C3 violada)
- solução: suíte 6/6 + caracterização 3/3; **3 passos executados um a um**, ambas verdes entre eles; `solucao/pedidos.py` = passo 3 byte a byte; `testes.py` intocado (sha256 `28ad46c4…`); smoke `R$ 24,00`/`R$ 18,90` idêntico original↔solução

## Recibo honesto

- **Run/session reais:** run `e8d120bb-e39f-428a-906e-6fe294ff75bc` (este heartbeat), sessão persistida `ses_f0b1eac34ffe179zZLLyAGFsr0` (metadados reais do run, não project/agent id — lição da errata AID-3553 aplicada).
- **Sem resultado de alunos:** nenhuma tentativa/veredito de aluno é relatado ou presumido; o guia declara "erros plausíveis" como hipóteses de correção, não dados.
- **Próximo consumidor:** Content Designer (revisão independente deste PR #633). Depois: merge door (`scripts/merge_pr.sh`, countersign distinto) quando #620 mergear (retarget); fatia de app/missão consumindo o pacote permanece follow-up do dono de `/engines/` (Learning Engine Engineer, SEQUENCIA.md §6 — não aberta aqui).
- **Dependências:** PR #620 (base da stack, aprovado, aguardando merge); nenhuma dependência de runtime (pacote é Markdown+Python stdlib puro).
- **Limitações declaradas:** fixture fictícia (cantina) construída para a prática; a armadilha representa uma classe real de proposta de assistente, não uma amostra coletada; duração 25–40 min é cadência-alvo, não medição.

Provenance: agent=curriculum-content-engineer(93e26ea9-8f2a-4f6f-9b82-3591ebc4255c) task=AID-3562 run=e8d120bb-e39f-428a-906e-6fe294ff75bc session=ses_f0b1eac34ffe179zZLLyAGFsr0

**Content Designer** · 2026-10-01T00:50:15.528044+00:00

**Approved** — parecer do Content Designer (revisor designado, execution stage `review`) sobre a entrega pg-d03 (U07) do AID-3562: **draft PR #633**, branch `aid3562/pg-d03-refatorar-com-rede`, head pin `353aec424142c6ef74f7ed030b32724c067e23e7`, base `aid3510/sequencia-dev-guiada` @ `e01d9d42` (aprovado), 13 arquivos +874/−12 — exatamente o head do recibo `96b2bf89`. Mesma base de escopo dos pareceres PR #620 (`38345871`) e PR #631 (`9bfee683`): nível, dependências, fidelidade pedagógica e perChecks da rúbrica. **Verificação executada first-hand, offline, em extração limpa de `353aec42`** (`git archive` para diretório novo, sem confiar no estado da worktree do produtor):

**1. Bateria executável (tudo reproduz):** baseline `6 testes passaram` (exit 0; `pytest -q` → 6 passed) · caracterização 3/3 verde sobre o original (exit 0) · **armadilha**: suíte existente `6 testes passaram` (exit 0) ‖ caracterização `AssertionError: C2 violada: ordem de erro trocada — obtido: 'quantidade invalida: cafe=-1'` (exit 1) ‖ trilha `AUDITORIA apos rejeicao: []` (C3) · **solução**: 6/6 + 3/3 (exit 0) · `testes.py` byte-idêntico (sha256 `28ad46c4…5014` confere) · smoke original↔solução idêntico (`R$ 24,00`/`R$ 18,90`) · diff original→solução confinado aos 3 pedidos (validação extraída com prioridade C2 preservada, soma deduplicada, formatação fora do `fechar_pedido`, trilha C3 intacta).

**2. Âncoras e rastreabilidade (blobs conferidos no HEAD):** l28 `386c27fe1a6b` — objetivo da lição (testes verdes como pré-condição + passos pequenos, nunca reescrita de uma vez) é operacionalizado 1:1 nos objetivos (a)/(b)/(c) e nos 6 passos; wf `03-refatarar-seguro` RESULTADO `93087764ac38` + demos `be5ea5792f37`/`6cae0259aabf`/`415065ed00c5` todos conferem. Exemplo trabalhado reproduzido: `npm test --prefix demo` → 4/4 exit 0 · `diff -ru antes/test demo/test` → exit 0 · `node demo/src/cli.js 1h30m 45m` → `Total: 2h15m` · `abc` → erro + exit 1. SEQUENCIA.md §2 U07 (l28 + wf03, demo → sessão única 25–40 min): pacote cumpre a unidade como especificada. **Dedup conferido:** nenhum outro PR/tarefa implementa U07 (stack atual: #620 base + #625/#629/#631/#633).

**3. Fidelidade pedagógica e honestidade:** a armadilha é plausível (justificativas que soam razoáveis: "um loop em vez de três", "auditoria só de pedidos válidos", "suíte no final"), passa 6/6 e viola exatamente a classe de comportamento invisível que l28-a1/opt-b nomeia — o contraexemplo é executável pelo aluno. Nenhuma frase do pacote alega que suíte verde prova ausência de bugs; o contrário é declarado e ensinado (enunciado §objetivo, armadilha, exemplo). Rúbrica v1: 7 critérios `met|partial|not_met`, perCheck executável por critério, mapeados a (a)/(b)/(c), regras negativas declaradas — mesma forma de pg-d01/pg-d02. Separação solução/rúbrica de referência confirms: nenhum passo da tentativa referencia `guia-de-correcao/` (apenas nota em Limites: "consulte após a tentativa", padrão pg-d01). Limitações declaradas; sem rede/conta/segredo/ferramenta paga (stdlib puro).

**Notas não-bloqueantes (registro, sem pedido de mudança):** (i) `armadilha/pedidos.py` = código da proposta aplicado verbatim, exceto docstring substituída pelo rótulo "ARMADILHA (nao use em producao)" — rotulação honesta, código idêntico (conferido programaticamente); (ii) o recibo diz "nada no enunciado o referencia" — leitura estrita: os *passos* não referenciam (confere); a seção Limites nomeia o guia com a instrução pós-tentativa, coerente com o padrão pg-d01 e com a alegação precisa do artefato ("nada no caminho do aluno"); (iii) `mergeable_state: unstable` do PR #633 é esperado enquanto a base #620 não mergear — retarget planejado segue o precedente #625/#629/#631.

**Concluir esta revisão não autoriza merge ou deploy**: o merge permanece na porta única `scripts/merge_pr.sh` com countersign distinto, após #620 e retarget. Fatia de app/missão consumindo o pacote segue sendo follow-up do dono de `/engines/` (SEQUENCIA.md §6).

**founder** · 2026-10-01T01:50:01.727351+00:00

[@Content Designer](agent://f2b1e95d-bf0f-4beb-b117-533728fabb1e?i=sparkles) PO: fechamento de recibo apenas, por este mesmo Content Designer que já verificou e aprovou o PR633 head353aec424142c6ef74f7ed030b32724c067e23e7 em b657f8b6-1a9b-4a30-bb40-6042768a347d. Não reabrir pedagogia, não editar código/branch, não repetir suites. O CI técnico36797632329 está verde; counter36797632437 falhou por produtor sem trailer reconhecido. CCE foi instruído a registrar sua proveniência verdadeira após a entrega atual3573. Do seu lado, conferir que o head não mudou e que não existe comentário equivalente; então registrar uma única vinculação/countersign no PR com o parecer independente existente, pin completo e run/session reais daquela revisão, ou os registros reais desta ação quando cabível, sem inventar nem usar UUID de agente/projeto. Não declarar aprovação nova que não executou; cite claramente o review já aceito. Preservar Done desta revisão nativa e usar seu papel atual, sem filho/ponte/novo autor. Ler o formato de gate canônico, sem alterar a política. Verificar readback do comentário e gate; se depender só da correção do produtor, informar dependência sem polling ou rerun cego. Se403/409/422, parar a ação e relatar exatamente; não tentar outro ator/endpoint. PR permanece Draft, sem merge/publicação.

**Content Designer** · 2026-10-01T01:57:06.285078+00:00

**Fechamento de recibo concluído** (wake PO `5b6e9318`) — nenhuma pedagogia reaberta, nenhum código/branch editado, nenhuma suíte re-executada; o `done` da revisão nativa é preservado e restaurado por esta atualização.

**Executado nesta ação (run `49a5ab16-5676-439f-9a4b-147a47350423`):**

1. **Head conferido inalterado**: PR #633 (Draft, base `e01d9d42`) em `353aec424142c6ef74f7ed030b32724c067e23e7` — o mesmo head do veredito Approved `b657f8b6-1a9b-4a30-bb40-6042768a347d` (decisão `db1647c8`).
2. **Inexistência de equivalente confirmada nos dois níveis**: PR #633 com 0 comentários/0 reviews/body sem citação antes da ação; porta canônica de dedup `countersign_assign.sh --check` → "no open countersign issue pins this (PR, head)" — nenhuma issue aberta de countersign para [CS PR#633@353aec42…].
3. **Formato canônico lido sem alteração de política**: `scripts/countersign_gate_check.py` §1–§7 (AID-2768) + padrão de casa do PR #616 (produtor no body/comentário; countersign em comentário único com trailer próprio).
4. **Countersign único registrado** (comentário GH `5923168742`, 2026-10-01T01:56:10Z): cita o parecer já aceito — `Countersign: AID-3562 verdict b657f8b6-… head=353aec42…` — com os registros reais do run de revisão: run `380ccf28-bda9-4160-a12d-975bfcc6b606`, session `ses_f0b140e05ffe9IODDcwA6jK039` (lidos do registro do run, não inventados). Nenhuma aprovação nova declarada.
5. **Readback verificado**: comentário relido via API (linha de citação e trailer fora de fences, head 40-hex presente) e gate avaliado localmente em modo somente-leitura (uma única avaliação de leitura — nenhum rerun de CI disparado): **countersign-gate PASS** — produtor `curriculum-content-engineer` (trailer registrado pelo CCE no comentário `5923158691` às 01:55:17Z, 53s antes do meu, corrigindo o body sem prefixo canônico) ≠ countersigner `content-designer`; citação operativa é a minha; sem marcadores de supersessão. O check run `36797632437` no GitHub confirmará no próximo evento do PR.

**Sem merge/publicação**: PR #633 permanece Draft; countersign não autoriza merge — porta única `scripts/merge_pr.sh`, e o stack aguarda #620 (retarget planejado, precedente #625/#629/#631). Nenhum filho/ponte/novo autor criado.

---

