# AID-3654: Verificar fixtures congeladas de evals U13

- **Status:** done | **Priority:** medium | **Origin:** manual
- **Assignee:** Verifier & Evidence Engineer | **Created:** 2026-10-01T19:08:18.169714+00:00 | **Updated:** 2026-11-01T14:14:23.766+00:00
- **ID:** `13c9a5c4-bfae-42ea-9185-037224ce6318`

## Description

Gate adicional V\&E explicitamente previsto na3648 e aprovado pelo PO: verificação EXECUTÁVEL INDEPENDENTE do artefato já congelado, não autoria nem repetição genérica da revisãoCPE. Produtor original\=Analytics803ca017; verifier\=V\&E616b5f9b, distinto. Head alvo PR645 ce6b347962ff88c197657ef519b4f1b85e487d3b, base main86fca77987408ff85d8050cb2d87ded48a7e49b0. Manifesto curriculum/praticas-evals-offline/pg-e01-evals-offline/MANIFEST-AID3648.md pina27arquivos; produtor+CPE conferiram27/27,8testes. Esta folha só entrega o parecer independente faltante, PO adjudica resultado; não altera estágiosCPE→CD da3648.



Em worktree própria, confirmar bytes/pins reais e auditar contrato/fixtures por cálculo independente (não só repetir saída do próprio scorer). Aprendiz define critérios antes dos outputs, hash permanece fixo; baseA→B agrega+0.042 mas pagamento cai5/6→2/6; heldout12casos são realmente novos/disjuntos, Bcolapsa2/3→0/3 com agregada8/12igual; referênciaC recupera3/3 sem mascarar outra regressão. Reproduzir métricas por fatia e denominadores; testar contraprovas de alteração de critérios após observar resultado, leakage e média sem slices, falta/duplicação deID e alegação do produtor sem prova independente. Diferenciar teste que de fato falha da regra apenas escrita na rubrica; registrar limites honestos. Verificar que exemplos/soluções docentes separados não contam como tentativa/heldout do aluno.



Escopo somente leitura da árvore, execução local offline/stdlb e relatório de provas/achados. Não implementar fix, alterar fixtures/testes/pins, produzir outro scorer permanente ou novo pacote. Sehead mudou, pare e peça repinPO; não seguir silenciosamente. Não reabrirformatter637 (pode reusar para fatos explícitos), não repetir suítes625, não executarAPI/live/dadosreais/credenciais/runtime/restart/manualCI/merge/deploy. GateCI vermelho pré-counter não impede julgamento independente; evidência pedagógica não autoriza release. Entregar veredito fundamentado por head/arquivo/entrada/resultado esperado-observado e própria run/session real, apontando falhasreproduzíveis à3648 pelo caminho permitido. Sem self-countersign do produtor; nenhuma escrita fora do boundary, parar na primeira403/409/422 sem ator/endpoint/owner alternativo.

## Document `Continuation Summary` (2026-10-01)

# Continuation Summary

- Issue: AID-3654 — Verificar fixtures congeladas de evals U13
- Status: done
- Priority: medium
- Current mode: review
- Last updated by run: 1b125ee3-25d1-4657-94ae-9a0ad06fb71b
- Agent: Verifier & Evidence Engineer (opencode_local)

## Objective

Gate adicional V\&E explicitamente previsto na3648 e aprovado pelo PO: verificação EXECUTÁVEL INDEPENDENTE do artefato já congelado, não autoria nem repetição genérica da revisãoCPE. Produtor original\=Analytics803ca017; verifier\=V\&E616b5f9b, distinto. Head alvo PR645 ce6b347962ff88c197657ef519b4f1b85e487d3b, base main86fca77987408ff85d8050cb2d87ded48a7e49b0. Manifesto curriculum/praticas-evals-offline/pg-e01-evals-offline/MANIFEST-AID3648.md pina27arquivos; produtor+CPE conferiram27/27,8testes. Esta folha só entrega o parecer independente faltante, PO adjudica resultado; não altera estágiosCPE→CD da3648.



Em worktree própria, confirmar bytes/pins reais e auditar contrato/fixtures por cálculo independente (não só repetir saída do próprio scorer). Aprendiz define critérios antes dos outputs, hash permanece fixo; baseA→B agrega+0.042 mas pagamento cai5/6→2/6; heldout12casos são realmente novos/disjuntos, Bcolapsa2/3→0/3 com agregada8/12igual; referênciaC recupera3/3 sem mascarar outra regressão. Reproduzir métricas por fatia e denominadores; testar contraprovas de alteração de critérios após observar resultado, leakage e média sem slices, falta/duplicação deID
[truncated]

## Acceptance Criteria

No explicit acceptance criteria captured.

## Recent Concrete Actions

- Run `1b125ee3-25d1-4657-94ae-9a0ad06fb71b` finished with status `succeeded` at 2026-10-01T19:46:50.819Z.
- Head confirmed: `b028652d7853cbd4efdf15035d9f9414aeb76094` (= PR645 head = branch). Moving my worktree and inspecting the delta:

Delta is exactly the 5 files stated. Now the directed verification on the new head:

27/27 pins OK; fixtures/scorer/heldout byte-identical between heads. Now confronting the corrected gabarito claims against the frozen data and running the suite:

All corrected claims match the frozen data; residual PD-012 mentions are the corrected explanatory context. Now counter-proofs of the NEW test (mutations in /tmp only):

All counter-proofs pass. Writing and posting the supplementary parecer:

**AID-3654 — done** (parecer complementar registrado; AID-3654 foi o caminho nativo de continuação, sem necessidade de filho/ator alternativo).

**Parecer complementar no novo head `b028652d7853cbd4efdf15035d9f9414aeb76094`** (SHA completo confirmado: PR645 head = branch): **F1 RESOLVIDO — CONFORME, sem novas ressalvas**, no escopo da correção.

- **Delta:** exatamente 5 arquivos (README 8→9 checks, MANIFEST repinado, `proposta-referencia.md`, `solucao.md`, `testes.py`); **27/27 pins OK** no novo head, 23 pins não-alterados byte-iguais ao head original;
[truncated]

## Files / Routes Touched

- No file or route paths were detected in the captured run summary.

## Commands Run

- Heartbeat run `1b125ee3-25d1-4657-94ae-9a0ad06fb71b` invoked adapter `opencode_local`.
- Detailed shell/tool commands remain in the run log and transcript.

## Blockers / Decisions

- No new blocker was recorded by the latest run.

## Next Action

- Review the completed issue output and close any remaining follow-up comments.

## Comments (3)

**Verifier & Evidence Engineer** · 2026-10-01T19:13:32.723958+00:00

# Parecer V&E independente — AID-3654: fixtures congeladas de evals U13 (pg-e01-evals-offline)

- **Verificador:** V&E Engineer `616b5f9b-15c8-4ad1-816c-78a7317e0202` (distinto do produtor `803ca017`)
- **Head verificado:** PR #645 `ce6b347962ff88c197657ef519b4f1b85e487d3b` (= `refs/pull/645/head`, confirmado via `git ls-remote` neste run; head NÃO mudou)
- **Base:** `origin/main` = `86fca77987408ff85d8050cb2d87ded48a7e49b0` (ancestral do head; `git merge-base --is-ancestor` OK)
- **Worktree própria:** `workspaces/616b5f9b-15c8-4ad1-816c-78a7317e0202/wt-3654` @ `ce6b3479`; árvore permaneceu limpa (`git status --porcelain` vazio); mutações só em `/tmp/opencode/aid3654/`
- **Ambiente:** Python 3.13.5, stdlib apenas, offline, sem rede/credenciais/API (run real desta sessão, 2026-10-01)

## Veredito: **CONFORME COM RESSALVA** (1 achado menor F1, não-bloqueante, gabarito docente)

O PO adjudica o resultado final (AID-3648). Este parecer não altera estágios CPE→CD, não é countersign do produtor e não autoriza merge/release.

## 1. Pins e integridade do congelamento — PASS

- MANIFEST-AID3648.md pinará 27 arquivos → **27/27 SHA256 conferidos por cálculo próprio** (`hashlib.sha256`), 0 mismatch, 0 ausente.
- 0 arquivo não-pinado na árvore (além do próprio manifesto).
- Head/base íntegros e imutados durante o run (ver cabeçalho).
- Âncoras citadas no enunciado/README conferidas por `git rev-parse <base>:<path>` @ `86fca779`: l11 `cf370d228d02` ✓, l08 `cc0ae70259a1` ✓, curso-simples §9 `2bcf99fbd831` ✓, ROADMAP `5dc6f72ce505` ✓.

## 2. Reprodução documentada — PASS (byte-idêntica)

Os 3 comandos do scorer + suíte `guia-de-correcao/testes.py` do README/solucao.md reproduzem exatamente as saídas citadas (`+0.042`/`pagamento −0.500` base; `8/12=8/12`/`pagamento 0/3` heldout; B→C `3/3`/`+0.250`; `8 testes passaram`, exit 0 em todos).

## 3. Recálculo independente (código próprio, sem importar `metricas.py`) — PASS

| Comparação | GERAL | fatia crítica | demais fatias |
| --- | --- | --- | --- |
| base A→B (24) | 17/24→18/24 (**+0.042**) | pagamento 5/6→2/6 (**−0.500**) | tecnico +0.250, conta +0.200, uso +0.200 |
| heldout A→B (12) | 8/12→8/12 (**0.000**) | pagamento 2/3→**0/3** (**−0.667**) | tecnico +0.250, uso +0.500, conta 0.000 |
| heldout B→C (12) | 8/12→11/12 (**+0.250**) | pagamento 0/3→**3/3** (+1.000) | nenhuma fatia cai (conta/tecnico/uso Δ=0) |

- Denominadores conferidos: base 24 (tecnico 8, pagamento 6, conta 5, uso 5); heldout 12 (tecnico 4, pagamento 3, conta 3, uso 2).
- Decomposição da ilusão confirmada: +2 (tecnico) +1 (conta) +1 (uso) −3 (pagamento) = +1 líquido (17→18).
- Alegação ficícia da "autora do v2" (CENARIO.md: 18 vs 17, 75% vs 71%) é internamente consistente com as fixtures (18/24=75,0%; 17/24=70,8%≈71%) — e o pacote a trata como **entrada, não verificação** ✓.
- Números do exemplo trabalhado (TrilhaFit, 12+6 casos) também reproduzidos por recálculo próprio ✓.

## 4. Heldout realmente novo/disjunto; exemplo docente separado — PASS

- IDs: base `PD-001..PD-024` ∩ heldout `PD-H01..PD-H12` = **∅** (conjuntos, não prefixo apenas); 0 textos de ticket duplicados entre base e heldout (normalização lower/strip).
- Exemplo docente: IDs `TF-*`/`TH-*`, espaço de rótulos distinto (`bug/duvida/melhoria` vs `tecnico/pagamento/conta/uso`), 0 sobreposição de ID e de texto com as fixtures do aluno → **não pode servir de tentativa/heldout do aluno** nem vazar a resposta do PrismaDesk.
- Escape da proposta-referência verificado nos dados: PD-H01 ("exportar fatura... corrompido", gold `tecnico`) permanece `tecnico` em B e C ✓.

## 5. Contraprovas executadas (checks têm dentes, não só rubrica) — PASS

Mutações aplicadas em cópia `/tmp` (árvore intocada); suíte/saída esperada falha de fato:

| # | Mutação | Resultado observado |
| --- | --- | --- |
| M1 | apagar a regressão no base (pagamento B 6/6) | `testes.py` rc=1 (AssertionError) — o achado pedagógico é mecanicamente afirmado |
| M2 | heldout pagamento B 0/3→1/3 | rc=1: "agregada deveria ficar igual (8/12 = 8/12)" |
| M3 | C perde 1 pagamento (3/3→2/3) | rc=1: "C deveria recuperar pagamento (3/3)" |
| M4 | **vazamento**: caso PD-011 do base injetado no heldout | rc=1: "heldout deve ser disjunto do base (anti-vazamento)" |
| M5 | predição com ID duplicado | CLI fatal: `ValueError: ids de predicoes duplicados` |
| M6 | predição faltante PD-005 | CLI fatal: `faltando=['PD-005'] sobrando=[]` |
| M7 | item sem campo de fatia | CLI fatal: `item PD-001 sem campo de fatia 'area'` |
| M8 | trocar fatia p/ campo inexistente ("criterio" pós-resultado) | CLI fatal (não permite fatia fantasma silenciosa) |
| M9 | `--fail-on-regressao` | base A→B **exit 1**; B→C exit 0 (gate CI funcional) |
| M10 | A vs A (falso positivo) | exit 0, sem flag ✓ |

- Scorer **genérico**: grep próprio não acha `pagamento|tecnico|PD-|17|18` em `metricas.py` — nenhum gabarito embutido; veredito emerge só dos dados.
- Todos os 10 fixtures `.json` rotulados `SINTETIC` em `meta.aviso` (check dedicado passa).

## 6. Achado F1 (menor, docente, não-bloqueante) — enumeração de IDs no gabarito

- `guia-de-correcao/solucao.md:37-38` e `guia-de-correcao/proposta-referencia.md:10` afirmam que as "3 perdas" de pagamento são **PD-011, PD-012, PD-013**.
- Cálculo independente: perdas reais do v2 (corretas em A, erradas em B) = **PD-011, PD-013, PD-014**. **PD-012 já era erro do v1** (A=`tecnico`, gold `pagamento`) — estável em A e B, contribui 0 para o delta −0.500; **PD-014** (A=`pagamento`→B=`conta`) é omitida.
- Impacto: contagens/deltas/testes inalterados (nenhum teste afirma IDs); caminho do aluno inalterado (gabarito é lido após a tentativa); mas um aluno que enumerar corretamente PD-011/013/014 seria "corrigido" errado pelo gabarito, e a lista de exemplos da mecânica em `proposta-referencia.md:16-18` cita "fatura com valor errado" (=PD-012, que não regrediu no v2) e omite PD-014 (desviada para `conta`, não `tecnico` — 2 de 3 perdas encaixam no desempate→tecnico; a terceira encaixa em "leitura parcial"→conta).
- Encaminhamento: reportado à AID-3648 pelo caminho permitido (comentário informativo, sem countersign); correção compete ao produtor/PO — fora do meu boundary (read-only).

## 7. Limites honestos declarados

1. "Critérios antes das saídas" e "heldout só após proposta" são **disciplina processual**: o pacote fornece o mecanismo falsificável (modelo de critérios + hash + rubrica `c-criterios-antes`/`c-heldout` com verificação de ordem no log), mas nada mecanicamente impede um aprendiz self-paced de ler `guia-de-correcao/` antes — inerente a conteúdo offline; o recibo (hashes + ordem) torna a violação auditável ex post.
2. Trocar `--fatia` para outro campo **existente** produz re-decomposição honesta (M8 cobre apenas campo inexistente); a defesa é a regra de decisão congelada com fatias mínimas declaradas antes.
3. Evidência pedagógica não autoriza release; C é referência sintética do autor do pacote (não prova da correção do aluno) — limites já declarados nos próprios docs e reconfirmados aqui.
4. Não repeti suítes AID-3625 nem abri formatter AID-3637; sem CI manual/merge/deploy/API/live.

## Disposição

AID-3654 **done**: parecer independente entregue (este documento + comentário no thread + apontamento F1 à AID-3648). Adjudicação do resultado é do PO na AID-3648.

**founder** · 2026-10-01T19:44:48.79875+00:00

PO — continuação dirigida da sua própria verificação F1, sem reabrir a suíte anterior. O produtor original corrigiu PR #645 no head b028652d, recibo aacf1fa9-eee2-49e8-b36c-f0dc260a6151 da AID-3648. Confira o SHA completo publicado antes de avaliar.



Delta de cinco arquivos: dois gabaritos agora enumeram PD-011/013/014, explicação causal corrigida, teste negativo derivado das fixtures e manifesto atualizado. Verifique diretamente nos dados congelados que PD-012 já era erro em A e PD-014 é regressão A→B; confronte as duas referências docentes, hashes e o novo teste (incluindo contraprova do gabarito errado). Confirme que fixtures brutas, métricas e heldout permanecem idênticos.



Registre aqui um parecer complementar no novo head, preservando seu parecer original ce6b3479 e todas as limitações. Não repetir as dez mutações/suítes não afetadas, não editar fonte ou gabarito, não emitir aprovação em nome do CD ou PO. O aceite pedagógico dirigido CD e a confirmação final PO permanecem pendentes; nenhum CI manual, merge ou deploy. Se o caminho nativo de continuação não permitir seu próprio parecer, pare e reporte sem criar filho duplicado ou trocar ator. [@Verifier & Evidence Engineer](agent://616b5f9b-15c8-4ad1-816c-78a7317e0202?i=puzzle)

**Verifier & Evidence Engineer** · 2026-10-01T19:46:38.861865+00:00

# Parecer complementar V&E — AID-3654: verificação dirigida da correção F1 no novo head

- **Verificador:** V&E Engineer `616b5f9b-15c8-4ad1-816c-78a7317e0202` (produtor `803ca017`, distinto)
- **Head novo verificado:** `b028652d7853cbd4efdf15035d9f9414aeb76094` (SHA completo confirmado por `git ls-remote`: `refs/pull/645/head` = `refs/heads/aid3648/u13-evals-offline` = este SHA; recibo do produtor aacf1fa9-eee2-49e8-b36c-f0dc260a6151 citado pelo PO)
- **Head original preservado:** parecer anterior vale para `ce6b347962ff88c197657ef519b4f1b85e487d3b` (CONFORME COM RESSALVA, F1) — sem alteração
- **Escopo:** somente o delta de 5 arquivos + confronto com dados congelados; não repeti as 10 mutações/suítes não afetadas do parecer original
- **Ambiente:** Python 3.13.5, stdlib, offline; worktree própria atualizada para `b028652d` (árvore limpa; mutações só em `/tmp/opencode/aid3654b/`)

## Veredito complementar: **F1 RESOLVIDO no head b028652d — CONFORME, sem novas ressalvas** (escopo: só a correção F1)

Aceite pedagógico dirigido (CD) e confirmação final PO permanecem pendentes e não são emitidos aqui.

## 1. Head e delta — confirmado

- `git ls-remote`: PR645 head = branch = `b028652d7853cbd4efdf15035d9f9414aeb76094`; novo commit `b028652d` "corrige IDs das perdas... + teste determinístico... MANIFEST 27/27".
- Delta exatamente 5 arquivos, como informado pelo PO: `README.md`, `MANIFEST-AID3648.md`, `guia-de-correcao/{proposta-referencia.md, solucao.md, testes.py}`.

## 2. Fixtures brutas, scorer, heldout, exemplo — intocados — PASS

- `git diff --name-only ce6b3479..b028652d`: **zero** mudanças sob `insumos/fixture/` (inclui `metricas.py`, base e heldout) e `exemplo/` — bytes idênticos entre heads.
- Manifesto: **27/27 pins SHA256 conferidos por cálculo próprio no novo head**; apenas os 4 arquivos de conteúdo alterados ganharam pins novos; os outros 23 pins permanecem **iguais aos do head original** (conferido contra a tabela antiga).

## 3. Fatos nos dados congelados (recálculo direto, novo head) — PASS

- **PD-012 já era erro de A**: gold=`pagamento`, A=`tecnico`, B=`tecnico` — estável, contribui 0 para o −0.500 (afirmação do novo gabarito ✓).
- **PD-014 é regressão A→B**: A=`pagamento` (correto) → B=`conta` (errado) ✓.
- Perdas derivadas dos raw fixtures (A correto ∧ B errado): **{PD-011, PD-013, PD-014}** = enumeração do novo gabarito ✓.
- Todas as citações textuais do trecho corrigido conferem verbatim com `casos_base.json` (PD-011 "Erro 500 ao tentar pagar", PD-013 "Cartao declinado...", PD-014 "Como atualizo o cartao de cobranca da empresa no painel?", PD-012 "…valor errado…").

## 4. Confronto das duas referências docentes — PASS

- `solucao.md:38-46` e `proposta-referencia.md:10-22`: enumeração corrigida para PD-011/PD-013/PD-014; causal agora distingue **2 perdas por desempate→`tecnico`** (PD-011/PD-013 mencionam erro/sistema) de **1 perda por leitura parcial→`conta`** (PD-014 sem menção a erro) — exatamente o que os dados mostram; PD-012 explicitamente marcado "contribui 0".
- `grep -rn PD-012 --include=*.md`: as únicas 2 ocorrências restantes são as dos trechos corrigidos (contexto explicativo correto); **nenhuma enumeração antiga 011/012/013 residual** no pacote.

## 5. Novo teste e contraprovas — PASS

- `test_perdas_pagamento_gabarito_confere_com_fixtures` (testes.py:123-155): **deriva as perdas dos raw fixtures** (não do texto docente), trava o conjunto exato {011,013,014}, nega o gabarito antigo e pinã a causal (PD-014→`conta`).
- Suíte no novo head: **9/9 passaram, exit 0** (saída confere com a lista atualizada em `solucao.md` e README "9 checks").
- Contraprovas (mutações em cópia `/tmp`, árvore read-only):

| # | Mutação | Resultado |
| --- | --- | --- |
| CP1 | fixtures editados para ditarem a enumeração antiga 011/012/013 | rc=1 AssertionError — o teste **rejeita o mundo do gabarito errado** |
| CP2 | PD-014 desviado para `tecnico` (perda mantida, alvo trocado) | rc=1: "PD-014 foi desviado para conta, nao tecnico" |
| CP3 | quarta perda adicionada (PD-009) | rc=1 (suíte internamente consistente) |

## 6. Limitações preservadas (do parecer original, valem integralmente)

Disciplina processual de critérios-antes/heldout-após é auditável ex post via hash/recibo, não mecanicamente forçada; troca de `--fatia` para campo existente re-decompõe honestamente; C é referência sintética do autor, não prova da correção do aluno; evidência pedagógica não autoriza release. Sem CI manual, merge, deploy, API live; sem edição de fonte/gabarito; sem aprovação em nome de CD/PO.

## Disposição

Parecer complementar registrado na AID-3654 (caminho nativo de continuação funcionou). F1 resolvido; novas heads que tocem este pacote exigem novo pin/parecer. Adjudicação final: PO na AID-3648.

---

