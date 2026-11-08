# AID-3553: CCE — pg-d02 (U03): prática guiada "pedido estruturado de 5 campos" a partir de curso-simples M3 + workflow-exemplo — revisão CD — AID-3510 P2 (fatia 1)

- **Status:** done | **Priority:** medium | **Origin:** manual
- **Assignee:** Content Designer | **Created:** 2026-09-30T23:37:20.304291+00:00 | **Updated:** 2026-11-01T14:14:39.033+00:00
- **ID:** `44b15979-ab85-43b2-b2a7-0c533e2c1989`

## Description

Successor único e concreto da AID-3510 priorizado pelo PO (comentário ee335f70): produzir UMA adaptação entre U03/U07/U09/U10. **Seleção registrada pelo Content Designer: U03.**

## Atividade escolhida (registro CD)

**Unidade U03 — "Pedido estruturado de 5 campos" (SEQUENCIA.md §2, adaptação).** Prática guiada (sugestão de id: `pg-d02-pedido-estruturado`; nome final a critério do CCE dentro dos padrões existentes — NÃO criar id de lição l33+ nem módulo; contrato regra 7 intocado).

**Por que U03 (da classificação pronto 7 / adaptação 4 / lacuna 2):** (a) menor adaptação contida — uma sessão de 25–40 min a partir de material já curado (curso-simples M3: `docs/curso-simples/index.html` blob `2bcf99fbd831` + ROADMAP Fase 1 blob `5dc6f72ce505`; exemplo executável `docs/curso-simples/workflow-exemplo/release_notes.py` blob `8bbe0fdffcf5`, 22 testes, local); (b) maior alavancagem pedagógica: os 5 campos CONTEXTO/OBJETIVO/RESTRIÇÕES/ACEITE/NÃO-META são o esqueleto consumido à montante por U09 (context engineering) e à jusante pelo formato spec da tp-d01 (`curriculum/praticas-transferencia/tp-d01-dev/fixture/spec.md`) — é a dobradiça da cadeia D2/D3 entre l16 (U02) e l21 (U04); (c) pré-req simples (U02/l16); (d) não duplica pg-d01 (ciclo de debug), tp-d01 (transferência em review) nem AID-3527 (integração de app do pg-d01 — em andamento pelo LEE, não tocar).

## Objetivo observável (registro CD — o pacote deve avaliar exatamente isto)

Dado um pedido de código real (caso-modelo do workflow-exemplo ou pedido próprio do aprendiz), **reescrever o pedido nos cinco campos** CONTEXTO / OBJETIVO / RESTRIÇÕES / ACEITE / NÃO-META, tal que: (a) o ACEITE seja verificável por comando executável local; (b) a NÃO-META exclua explicitamente ao menos um escopo plausível adjacente; (c) um revisor independente consiga dizer, para dois casos de borda fornecidos, se estão dentro ou fora do pedido.

## Especificação da entrega (padrão pg-d01 — AID-3510 aprovada)

- Ciclo completo guiado: **exemplo trabalhado → tentativa → feedback (rúbrica) → retry por critério → takeaway**, uma sessão de 25–40 min.
- Exemplo trabalhado citando fonte real (M3/workflow-exemplo) com saídas reais, não reescrito.
- Tentativa com **fixture local segura e determinística**: basear no workflow-exemplo (ex.: amostra fixa de `meus_commits.json` fornecida no pacote — o caminho avaliado NÃO pode depender do repositório do aprendiz; uso do repo próprio pode ficar como extensão opcional não avaliada). Zero rede/conta/segredo.
- Rúbrica v1 no padrão da casa (tp-c01/tp-d01/pg-d01): veredito `met|partial|not_met` por critério, **perCheck executável por critério**, sem nota agregada; critérios derivados do objetivo observável acima (incluindo um critério para cada uma das condições (a),(b),(c)).
- **Critérios negativos (o que a prática NÃO exige/não avalia):** não avalia elegância de código nem velocidade; não exige framework, rede, conta ou LLM específico; não cria/altera lição, módulo, engine, runtime, progresso, gates, PRs #610–#619; não mede eficácia nem transferência comprovada (sem alegação de resultado de alunos); não duplica pg-d01/tp-d01/AID-3527.
- Solução SEPARADA em `guia-de-correcao/` (não referenciada pelo enunciado), com saídas reais executadas.
- Entrega em draft PR/branch isolada sobre `main` vigente, base pinada, fontes com blob SHA; trailer Provenance do body em formato canônico desde a criação (linha única parseável — ver AID-3552 para o contraexemplo).

## Deduplicação (fazer antes de editar)

Consome sem refazer: SEQUENCIA.md r1 (PR #620), matriz r3 (AID-3497), metadados P/S (AID-3505), tp-c01/tp-d01 (AID-3506), pg-d01 (PR #620). Verificado pelo CD em 2026-09-30: nenhuma issue aberta cobre U03/pg-d02/pedido estruturado.

## Fluxo

Produtor: CCE (`93e26ea9`). Revisor: Content Designer (`f2b1e95d`) — nível, dependências, fidelidade pedagógica, mesma base do parecer 38345871. Merge/deploy fora de escopo.

## Document `Continuation Summary` (2026-09-30)

# Continuation Summary

- Issue: AID-3553 — CCE — pg-d02 (U03): prática guiada "pedido estruturado de 5 campos" a partir de curso-simples M3 + workflow-exemplo — revisão CD — AID-3510 P2 (fatia 1)
- Status: done
- Priority: medium
- Current mode: review
- Last updated by run: 2985fcb1-1e63-482a-aa40-f73db7940da9
- Agent: Content Designer (opencode_local)

## Objective

Successor único e concreto da AID-3510 priorizado pelo PO (comentário ee335f70): produzir UMA adaptação entre U03/U07/U09/U10. **Seleção registrada pelo Content Designer: U03.**

## Atividade escolhida (registro CD)

**Unidade U03 — "Pedido estruturado de 5 campos" (SEQUENCIA.md §2, adaptação).** Prática guiada (sugestão de id: `pg-d02-pedido-estruturado`; nome final a critério do CCE dentro dos padrões existentes — NÃO criar id de lição l33+ nem módulo; contrato regra 7 intocado).

**Por que U03 (da classificação pronto 7 / adaptação 4 / lacuna 2):** (a) menor adaptação contida — uma sessão de 25–40 min a partir de material já curado (curso-simples M3: `docs/curso-simples/index.html` blob `2bcf99fbd831` + ROADMAP Fase 1 blob `5dc6f72ce505`; exemplo executável `docs/curso-simples/workflow-exemplo/release_notes.py` blob `8bbe0fdffcf5`, 22 testes, local); (b) maior alavancagem pedagógica: os 5 campos CONTEXTO/OBJETIVO/RESTRIÇÕES/ACEITE/NÃO-META são o esqueleto consumido à montante por U09 (context engineering) e à jusante pelo formato spec da tp-d01 (`curriculum/praticas-transferencia/tp-d01-dev/fixture/spec.md`) — é a dobradiça da cadeia D2/D3 entre l16 (U02) e l
[truncated]

## Acceptance Criteria

No explicit acceptance criteria captured.

## Recent Concrete Actions

- Run `2985fcb1-1e63-482a-aa40-f73db7940da9` finished with status `succeeded` at 2026-10-01T00:19:50.638Z.
- Head verificado. Deixe-me inspecionar o diff atual da errata para confirmar se é a alteração de wording da divulgação:

Delta confirmado: somente `enunciado.md`, a linha de divulgação agora declara ambas as entradas adaptadas. Agora, deixe-me buscar o thread para localizar o meu parecer 9bfee683, a diretiva PO 6e620aec e o adendo 63193b8c §4:

Context fully recovered. Let me read the CCE's evidence comment `5368e35d` and my parecer `9bfee683` in full, then verify the PR #631 body fix:

My verification of head/delta is done. Now a light spot-check of the PR #631 body fix (item 2 of the errata), and a check for existing AID-3553 work products:

Todas as verificações foram bem-sucedidas. Deixe-me verificar se a sessão do meu run atual tem metadados publicados (para a linha de proveniência) e, em seguida, postar o registro:

Run session metadata not yet published — I'll declare `pendente` per the PO directive (no substitution). Posting the on-call registration of the final head:

Comment posted. Now the terminal disposition:

AID-3553 concluído. Resumo do heartbeat:

**Ação de plantão (addendum §4 / retorno do CCE 18c46527):**
- Verificado em primeira mão: branch `a
[truncated]

## Files / Routes Touched

- No file or route paths were detected in the captured run summary.

## Commands Run

- Heartbeat run `2985fcb1-1e63-482a-aa40-f73db7940da9` invoked adapter `opencode_local`.
- Detailed shell/tool commands remain in the run log and transcript.

## Blockers / Decisions

- No new blocker was recorded by the latest run.

## Next Action

- Review the completed issue output and close any remaining follow-up comments.

## Comments (10)

**Curriculum Content Engineer** · 2026-09-30T23:49:29.073662+00:00

# AID-3553 — Entrega pg-d02-pedido-estruturado (U03): draft PR #631 (stacked no PR #620)

**Disposição: `in_review`** — revisão pedida ao **Content Designer** (`f2b1e95d`), escopo da própria issue: nível, dependências, fidelidade pedagógica, mesma base do parecer `38345871`. Draft PR **#631** `aid3553/pg-d02-pedido-estruturado` → base `aid3510/sequencia-dev-guiada` (@ `e01d9d42`, aprovado CD), head `dd0097f9`, 8 arquivos +712/−2. Merge/deploy fora de escopo; retarget para `main` quando #620 mergear (precedente #625/#629).

## Objetivo observável entregue (avaliado pelos critérios c4/c6/c7 da rúbrica)

Dado o pedido-romance fixo (`insumos/pedido-original.md`, caso-modelo workflow-exemplo), reescrever nos 5 campos tal que (a) ACEITE verificável por comando local; (b) NÃO-META exclui ≥1 escopo adjacente de fato embutido; (c) revisor independente decide B1 (`docs:` filtrado) e B2 (breaking em commit selecionado) sem perguntar ao autor.

## Pacote `curriculum/sequencia-dev-guiada/pg-d02-pedido-estruturado/`

- `enunciado.md` — ciclo exemplo→tentativa→feedback→retry→takeaway (25–40 min), B1/B2 fixados, prática avalia o **pedido** (não exige implementar).
- `exemplo-trabalhado.md` — M3 §3.1–3.4 (blob `2bcf99fbd831`) + PRD/SPEC do workflow-exemplo (blobs `2b4deb2764fe`/`1d5c696c3bb2`) citados com saídas reais.
- `insumos/` — pedido-original (4 entregas embutidas, 2 armadilhas: esconder fora-do-padrão choca com o PRD; Slack exige rede), `meus_commits.json` fixo determinístico (11 commits, derivado de `demo_commits.json` blob `8a0d39ce99e1`; caminho avaliado não depende do repo do aprendiz), `verifica_pedido.py` (perCheck mecânico c1/c2).
- `rubrica-v1.md` — 7 critérios `met|partial|not_met` com perCheck executável, um por condição do objetivo; critérios negativos declarados.
- `guia-de-correcao/` — separado, não referenciado pelo enunciado: pedido-modelo que decide B1/B2 + saídas reais completas + vereditos de referência + erros plausíveis.
- `../README.md` atualizado (estrutura + verificação local).

## Verificação first-hand (nesta árvore, base `e01d9d42`, offline)

- `pytest test_release_notes.py -q` → **22 passed** (fonte intocada);
- CLI sobre `meus_commits.json --version v0.9.0` → exit=0, 5 seções (saída integral na solução);
- `verifica_pedido.py guia-de-correcao/pedido-5-campos.md` → `campos: 5/5 · met` (exit 0); `--caminhos` → 3× `ok caminho · met`;
- `verifica_pedido.py insumos/pedido-original.md` → `campos: 0/5 · not_met` (exit 1 — discrimina);
- `--types feat,fix` hoje → exit=2 `unrecognized arguments` (baseline vermelho do ACEITE, pelo motivo certo);
- trailer Provenance do body do PR #631 valida contra `PROVENANCE_RE` do gate (linha única parseável — lição da AID-3552 aplicada desde a criação).

## Anti-escopo respeitado

Não altera PRs #610–#619 nem o SEQUENCIA.md r1 (flip U03 adaptação→pronto fica para r2 pós-revisão CD); não cria lição/módulo/engine/runtime/progresso/gates; não implementa o `--types` (fontes pinadas por blob); não duplica pg-d01/tp-d01/AID-3527; zero rede/conta/segredo; sem alegação de eficácia ou resultado de alunos.

## Deduplicação

Consome sem refazer: SEQUENCIA.md r1 (PR #620), matriz r3 (AID-3497), metadados P/S (AID-3505), tp-c01/tp-d01 (AID-3506), pg-d01 (PR #620). Nenhuma outra issue aberta cobre U03/pg-d02 (verificado 2026-09-30 pelo CD na abertura desta).

**Content Designer** · 2026-09-30T23:56:01.535622+00:00

**DECISÃO: `approved` — pg-d02-pedido-estruturado (U03) aprovado na revisão CD do PR #631, head `dd0097f9` (base `e01d9d42`, stacked #620), com verificação first-hand do revisor. 1 erratum não bloqueante registrado (§3) para ser dobrado no draft antes do retarget/merge.**

Escopo desta revisão (o pedido do CCE em d55bd4a6): nível, dependências, fidelidade pedagógica — mesma base do meu parecer `38345871` (PR #620). Merge/deploy fora de escopo e **não autorizados** por esta aprovação (countersign/porta única permanecem gates próprios).

## 1. Verificação first-hand (revisor, 2026-09-30, worktree `/paperclip/tmp/wt-aid3553` @ `dd0097f9`, offline)

Todos os 6 checks mecânicos declarados pelo produtor reproduzidos por mim, de memória zero:

1. `pytest test_release_notes.py -q` (workflow-exemplo) → **22 passed** (fonte intocada);
2. CLI sobre `insumos/meus_commits.json --version v0.9.0` → **exit=0, 5 seções** (⚠️ Breaking / ✨ Novidades / 🐛 Correções / 📦 Outras / 🔍 Fora do padrão);
3. `verifica_pedido.py guia-de-correcao/pedido-5-campos.md` → `campos: 5/5 · veredito: met` exit 0; `--caminhos` → **3× `ok caminho` · met** exit 0;
4. `verifica_pedido.py insumos/pedido-original.md` → `campos: 0/5 · not_met` exit 1 (detector discrimina romance vs pedido);
5. `--types feat,fix` na árvore atual → **exit 2** `unrecognized arguments` (baseline vermelho do ACEITE pelo motivo certo);
6. Baseline do exemplo-trabalhado: demo `--version v2026.08` → **20 entradas / 4 seções** (claim do exemplo conferida).

CI do head `dd0097f9`: 27 success · 2 skipped · 1 in_progress · **0 failed**.

## 2. Coerência content-contract / anti-escopo (verificado no diff `e01d9d42..dd0097f9`, 9 arquivos +620/−14)

- **Escopo do diff**: tudo dentro de `curriculum/sequencia-dev-guiada/` (8 arquivos novos do pacote + reestruturação do README da sequência, onde estão as −14). Nenhum arquivo canônico tocado (catalog.yaml, SEQUENCIA.md, learner/, gates); **nenhuma lição l33+ nem módulo** (contrato regra 7 intocado); SEQUENCIA.md r1 **não** editado — flip U03 adaptação→pronto corretamente deixado para r2 pós-revisão, como registrado na abertura.
- **Blobs citados**: os 5 prefixes (`2bcf99fbd831` index.html, `2b4deb2764fe` PRD, `1d5c696c3bb2` SPEC, `8bbe0fdffcf5` release_notes.py, `8a0d39ce99e1` demo_commits.json) conferem contra `git hash-object` nesta árvore — todos batem.
- **Citações M3 fiéis** (regra da casa: citar, não reescrever): protocolo §3.1 e a frase "cada campo omitido vira uma decisão… caminho estatisticamente comum" ✔; contraexemplo §3.2 (pedido-romance → 5 campos) ✔; regra 1 ("uma entrega por pedido") usada pela rúbrica c3 ✔; regra 5 ("referencie por caminho") usada pela solução ✔; o "conte-as" do passo 3 é exatamente o exercício de §3.4 ✔.
- **Rúbrica v1** no padrão da casa (tp-c01/tp-d01/pg-d01): 7 critérios `met|partial|not_met`, um por condição do objetivo ((a)→c4, (b)→c6, (c)→c7), perCheck executável por critério, critérios negativos declarados, v1 congelada com versionamento futuro. Sem nota agregada; sem alegação de eficácia.
- **Padrão estrutural pg-d01 seguido** (mesma topologia: enunciado / exemplo-trabalhado citado / insumos fixos determinísticos / rubrica versionada / guia-de-correcao separado com guarda "após a tentativa"); prereq `l16` (U02) confere contra SEQUENCIA.md §2 linha U03.
- **Desenho pedagógico**: o pedido-modelo decide B1 (fora das seções + contagem visível "filtro: feat,fix — 5 commits não exibidos") e B2 (⚠️ Breaking permanece — sinal de segurança, não tipo filtrável) com ACEITE executável por `grep`; as 2 armadilhas do romance (esconder fora-do-padrão choca com PRD "nenhum commit descartado silenciosamente"; Slack exige rede) são exclusões reais, não espantalhos. A dobradiça D2/D3 (esqueleto de 5 campos consumido por U09 e tp-d01) está preservada — é exatamente a alavancagem que motivou a seleção de U03.
- Zero rede/conta/segredo em todos os passos; prática avalia o pedido, não a implementação (não implementa `--types` — fontes pinadas).

## 3. Erratum não bloqueante (dobrar no draft PR #631 antes do retarget/merge — sem nova rodada de revisão CD)

**Provenância da amostra imprecisa no enunciado (§Limites explícitos) e no body do PR**: alega "hashes e subjects reais, com **1 entrada** (`35db5c8`) adaptada". Verificação linha-a-linha contra `demo_commits.json` mostra **2 entradas com subject adaptado**: `35db5c8` (breaking) **e** `96c4d9d` (`ci: fix main red… (#119)` → `fix(ci): fix main red…`). A segunda adaptação é load-bearing (cria o 2º `fix` e faz a aritmética "filtro: feat,fix — 5 commits não exibidos" fechar) — precisamente por isso a divulgação deve ser exata. Correção de 1 linha: "…com 2 entradas adaptadas (`35db5c8` breaking por `!`+footer; `96c4d9d` tipo `ci:`→`fix(ci):` e sufixo `(#119)` removido)". Nada mais muda (amostra permanece fixa/determinística; saídas e vereditos de referência já conferem contra a amostra real).

Nota menor (só issue, sem ação no repo): o comentário de entrega d55bd4a6 traz estatísticas vencidas ("8 arquivos +712/−2"; real: 9/+620/−14) e "guia não referenciado pelo enunciado" é dito de forma ampla — o enunciado §Limites o menciona com a guarda "consulte após a tentativa" (separação funcional preservada).

## 4. Disposição

Aprovado no meu escopo (nível/dependências/fidelidade pedagógica). O erratum de §3 fica como condição de higiene para o FPE/QA no fluxo de produção (mesma classe do erratum não bloqueante ratificado em AID-3497); não abre issue nova, não pede re-revisão CD. Flip U03→pronto no SEQUENCIA.md r2 e missão pg-d02 na trilha seguem o fluxo substrate existente (fora daqui).

Provenance: agent=content-designer(f2b1e95d) task=AID-3553 run=90d571e0-b15f-4312-9509-3539397c8514 session=3cbab3d6-45a5-478c-9212-e1484aacbb04

**Content Designer** · 2026-09-30T23:56:11.035975+00:00

Approved — parecer formal completo do Content Designer no comentário 9bfee683: PR #631 head dd0097f9 (base e01d9d42) verificado first-hand em worktree limpa — 6/6 checks mecânicos reproduzidos (22 passed; exit 0/5 seções; verifica_pedido 5/5 met + 3x ok caminhos; romance 0/5 not_met exit 1; --types exit 2; demo 20 entradas/4 seções), CI head 0 failed, 5/5 blobs citados conferem, citações M3 §3.1–3.4 fiéis, rúbrica v1 no padrão da casa (7 critérios (a)→c4/(b)→c6/(c)→c7), diff confinado a sequencia-dev-guiada sem tocar canônicos/SEQUENCIA.md r1/l33+/módulos. 1 erratum NÃO bloqueante registrado (§3 do parecer: amostra tem 2 subjects adaptados — 35db5c8 e 96c4d9d — não 1; correção de 1 linha a dobrar no draft antes do retarget, sem re-revisão CD). Merge/deploy não autorizados por esta aprovação; countersign/porta única seguem gates próprios.

**founder** · 2026-10-01T00:05:05.089889+00:00

PO: a atividade pg-d02 é uma entrega útil; preservar o parecer9bfee683 e não repetir os6checks. Antes de tratar o draft631 como pronto, encaminhar ao CCE a errata já identificada: amostra tem2 subjects adaptados (35db5c8 e96c4d9d), corrigir enunciado e body; ajustar a afirmação ampla de guia nunca referenciado para a guarda real após tentativa. Corrigir também Provenance de produtor e reviewer: session\=3cbab3d6-45a5-478c-9212-e1484aacbb04 é o ID do projeto, não a sessão. Buscar metadados reais do run correspondente; se indisponível, declarar pendente, nunca substituir por projeto/agente. Review pedagógico permanece válido, mas publicação/merge dependem da proveniência e gate reais. Uma correção pequena no mesmo branch, sem nova tarefa/revisão de conteúdo, sem alterar rubrica/fixture ou adicionar mais conteúdo nesta rodada. Entregar head final e evidência do delta; próximo candidato de conteúdo espera essa higiene e composição do pg-d01, não abrir outra cadeia de engines.

**Content Designer** · 2026-10-01T00:07:08.704621+00:00

**Addendo à diretiva PO `6e620aec` — correção de proveniência do revisor (parecer `9bfee683` preservado, sem alteração) + encaminhamento da errata ao CCE.**

## 1. Proveniência do REVIEWER corrigida (registro, o parecer fica como está)

A última linha do meu parecer `9bfee683` diz `session=3cbab3d6-45a5-478c-9212-e1484aacbb04`. Confirmado o defeito apontado pelo PO: esse é o **ID do projeto**, não uma sessão. Metadados reais do run correspondente (registro do run `90d571e0-b15f-4312-9509-3539397c8514` no Paperclip, campo `usageJson.persistedSessionId`, `freshSession: true`):

- **Sessão real da revisão CD: `ses_f0b460423ffeQsFXbf1I4WqQIH`**

Linha de proveniência do parecer, corrigida:

`Provenance: agent=content-designer(f2b1e95d) task=AID-3553 run=90d571e0-b15f-4312-9509-3539397c8514 session=ses_f0b460423ffeQsFXbf1I4WqQIH`

## 2. Proveniência do PRODUTOR — valor real para a errata

Mesmo defeito no body do PR #631 e na linha de entrega (run `5a7cbb7f-1a64-4594-8b93-ca32158866d5`). Sessão real daquele run (mesma fonte, `usageJson.persistedSessionId`):

- **Sessão real da entrega original: `ses_f0b51c6a5ffeQaXV3ZeXB49qht`**

Para o commit/linhas novos da correção, usar a sessão real do run que produzir a correção — nunca projetizar/agente no lugar; se o metadado não estiver disponível no momento, declarar `session=pendente(run <id>)` (diretiva PO: sem substituição).

## 3. Errata encaminhada ao CCE (`93e26ea9`) — dono da ação

Escopo exato autorizado pelo PO: **uma correção pequena no mesmo branch** (`aid3553/pg-d02-pedido-estruturado`), sem nova tarefa, sem revisão de conteúdo (parecer `9bfee683` e os 6 checks não se repetem), sem tocar rúbrica/fixture/insumos além da linha de divulgação, sem adicionar conteúdo:

1. **`enunciado.md` §Limites explícitos** — trocar "hashes e subjects reais, com **1 entrada** (`35db5c8`) adaptada" por **2 entradas adaptadas**: `35db5c8` (breaking por `!` e por footer) **e** `96c4d9d` (tipo `ci:`→`fix(ci):`, sufixo `(#119)` removido) — a segunda é load-bearing (2º `fix`; fecha a aritmética "filtro: feat,fix — 5 commits não exibidos").
2. **Body do PR #631** — mesma correção de amostra ("1 entrada adaptada p/ breaking" → 2, com o detalhe acima) e correção do `session=` do Provenance para a sessão real do run `5a7cbb7f` (`ses_f0b51c6a5ffeQaXV3ZeXB49qht`); linhas novas da correção usam a sessão real do run da correção (§2).
3. **Wording no thread** — em nota curta nesta issue: "guia-de-correcao separado, não referenciado pelo enunciado" (d55bd4a6) ajusta para o fato real: referenciado em §Limites e na rúbrica **com a guarda "consulte após a tentativa"** (separação funcional preservada). Nota menor opcional no mesmo comentário: estatísticas do d55bd4a6 estavam vencidas (real no head `dd0097f9`: 9 arquivos, +620/−14).

**Entrega esperada**: head final do branch + evidência do delta (diff da correção, 1 commit) nesta issue. Publicação/merge seguem dependendo de provenância real + gates existentes (countersign/porta única) — esta errata não autoriza merge.

## 4. Encaminhamento

Issue reatribuída ao CCE (`93e26ea9`) com esta lista como ação única. CD permanece de plantão apenas para registrar o head final no parecer (sem re-revisão de conteúdo, por diretriz PO).

Provenance: agent=content-designer(f2b1e95d) task=AID-3553 run=5a1c2aef-9e16-4d50-bdb3-af640d86906c session=pendente(run 5a1c2aef-9e16-4d50-bdb3-af640d86906c — sessão persistida ainda não publicada no registro do run em andamento)

**Content Designer** · 2026-10-01T00:07:18.512653+00:00

Routed to CCE (93e26ea9) per PO directive 6e620aec — single action: small errata on the same branch (aid3553/pg-d02-pedido-estruturado), items 1–3 in addendum 63193b8c: enunciado disclosure 1→2 adapted entries (35db5c8 + 96c4d9d), PR #631 body sample claim + real session provenance (producer ses_f0b51c6a5ffeQaXV3ZeXB49qht; new lines use the fix run real session, never project/agent id), and thread wording note on guia-de-correcao guard. No content re-review, no rubrica/fixture changes, no new content. Deliver final head + delta evidence here; merge/publication remain gated.

**Curriculum Content Engineer** · 2026-10-01T00:15:09.769897+00:00

# AID-3553 — Errata entregue (diretiva PO `6e620aec`, itens 1–3 do addendum CD `63193b8c`)

Head final do branch `aid3553/pg-d02-pedido-estruturado`: **`4cabf984591f0d5cf4046e0264871811dd6bd18a`** (1 commit em cima de `dd0097f9`; PR #631 body e head atualizados, CI do head disparado). Merge/publicação seguem gated (countersign/porta única) — esta errata não os autoriza.

## 1. Enunciado §Limites — divulgação 1→2 entradas adaptadas (commit `4cabf984`)

- Antes: "hashes e subjects reais, com 1 entrada (`35db5c8`) adaptada para exercitar breaking por `!` e por footer".
- Agora: "hashes e subjects reais, com 2 entradas adaptadas — `35db5c8` (breaking por `!` e por footer) e `96c4d9d` (tipo `ci:`→`fix(ci):`, sufixo `(#119)` removido; segundo `fix` da amostra, fecha a aritmética \"filtro: feat,fix — 5 commits não exibidos\")".

Verificado first-hand contra os dados (não só contra o addendum): diff de subjects `insumos/meus_commits.json` vs `demo_commits.json` (blob `8a0d39ce99e1`) → exatamente **2 subjects adaptados** (`96c4d9d`, `35db5c8`), os outros 9 idênticos; aritmética confirmada: filtro `feat,fix` seleciona 6 (`1cf2271`, `e63f0f0`, `1155dcb`, `f4fa2dc`, `96c4d9d`, `35db5c8`) → 5 não exibidos. `96c4d9d` é load-bearing: a saída real em `guia-de-correcao/solucao.md` conta "2 `fix`" dependendo dele. Rubrica/fixture/insumos intocados; nenhum conteúdo novo (escopo exato do addendum §3).

## 2. Body do PR #631 — claim de amostra + proveniência real

- Bullet `insumos/`: "1 entrada adaptada p/ breaking por `!` e por footer" → "2 entradas adaptadas — `35db5c8` (…) e `96c4d9d` (…)".
- Trailer `Provenance:` (único, linha final): `session=3cbab3d6-45a5-478c-9212-e1484aacbb04` (id do projeto) → **`ses_f0b51c6a5ffeQaXV3ZeXB49qht`** (sessão real do run `5a7cbb7f-1a64-4594-8b93-ca32158866d5`, `usageJson.persistedSessionId`). Gate `PROVENANCE_RE` segue parseando exatamente 1 linha `Provenance:` no body (verificado pós-patch).
- Linhas novas da errata (seção "Errata" no body do PR): produzidas pelo run `ea5377e7-f38c-4f48-ae3b-55ec038b7893` (CCE) — session=pendente(run ea5377e7-f38c-4f48-ae3b-55ec038b7893): sessão persistida ainda não publicada no registro do run em andamento (diretiva PO: sem substituição; mesma forma do addendum `63193b8c`).

## 3. Nota de wording (ajusta o registro do thread, comentário `d55bd4a6`)

"guia-de-correcao separado, **não referenciado pelo enunciado**" ajusta para o fato real: **referenciado em §Limites do enunciado e na rúbrica, com a guarda "consulte após a tentativa"** — enunciado.md: "Solução separada em `guia-de-correcao/` — consulte **após** a tentativa"; rubrica-v1.md: "`guia-de-correcao/` (após a tentativa)". Separação funcional preservada (o enunciado não referencia o conteúdo da solução, apenas a existência com a guarda). Nota menor: estatísticas do `d55bd4a6` estavam vencidas — real no head `dd0097f9`: **9 arquivos, +620/−14** (não "8 arquivos +712/−2"); no head da errata `4cabf984` o acumulado do PR vs base `e01d9d42` é 9 arquivos, +626/−18.

## Delta (evidência)

```text
commit 4cabf984591f0d5cf4046e0264871811dd6bd18a (fix(curriculum): AID-3553 — errata …)
1 file changed, 6 insertions(+), 4 deletions(-)
 curriculum/sequencia-dev-guiada/pg-d02-pedido-estruturado/enunciado.md | 10 ++++++----
```

Diff completo na aba commits do PR #631. Nenhum outro arquivo tocado.

## Disposição

`in_review` — devolvido ao Content Designer (`f2b1e95d`) para o registro de plantão do head final junto ao parecer `9bfee683` (sem re-revisão de conteúdo, por diretiva PO `6e620aec`/addendum §4). Merge/publicação permanecem gated.

Provenance: agent=curriculum-content-engineer(93e26ea9) task=AID-3553 run=ea5377e7-f38c-4f48-ae3b-55ec038b7893 session=pendente(run ea5377e7-f38c-4f48-ae3b-55ec038b7893 — sessão persistida ainda não publicada no registro do run em andamento)

**Curriculum Content Engineer** · 2026-10-01T00:15:13.412304+00:00



**Curriculum Content Engineer** · 2026-10-01T00:16:39.354678+00:00

Errata CCE entregue — itens 1–3 do addendum 63193b8c concluídos. Head final do branch: 4cabf984591f0d5cf4046e0264871811dd6bd18a (1 commit sobre dd0097f9; delta: enunciado.md apenas, +6/−4 — evidência completa no comentário 5368e35d). Body do PR #631 corrigido no mesmo passo (2 entradas adaptadas; session= real do run 5a7cbb7f = ses_f0b51c6a5ffeQaXV3ZeXB49qht; errata do body produzida pelo run ea5377e7 com session=pendente(run ea5377e7), sem substituição por diretiva PO). Ação única devolvida ao CD (f2b1e95d), de plantão por addendum §4: registrar o head final 4cabf984 junto ao parecer 9bfee683 (sem re-revisão de conteúdo, por diretiva PO 6e620aec) e dar a disposição terminal. Merge/publicação seguem gated (countersign/porta única) — fora desta errata. Nota de higiene: comentário 0831b3b0 (duplicata acidental do routing 1406f2c3 gerada por um PATCH meu mal endereçado) foi deletado por mim nesta run.

**Content Designer** · 2026-10-01T00:19:39.321093+00:00

**Registro de plantão CD — head final `4cabf984` registrado junto ao parecer `9bfee683` (diretiva PO `6e620aec`, addendum `63193b8c` §4). Disposição terminal: `done`.**

## 1. Registro do head final

O parecer `9bfee683` (**DECISÃO: `approved`**, head `dd0097f9`, base `e01d9d42`, stacked #620) passa a valer para o head final do branch `aid3553/pg-d02-pedido-estruturado`: **`4cabf984591f0d5cf4046e0264871811dd6bd18a`**. Sem re-revisão de conteúdo, por diretiva PO (`6e620aec`: parecer e 6 checks preservados, não repetidos).

## 2. Verificação de plantão (mínima, first-hand — não é re-revisão)

- **Branch**: local e `origin/aid3553/pg-d02-pedido-estruturado` ambos em `4cabf984` (1 commit sobre `dd0097f9`) ✓
- **Delta** `dd0097f9..4cabf984`: `curriculum/sequencia-dev-guiada/pg-d02-pedido-estruturado/enunciado.md` apenas, **+6/−4** — somente a divulgação do §Limites (1→**2 entradas adaptadas**: `35db5c8`, `96c4d9d` com a aritmética "filtro: feat,fix — 5 commits não exibidos") ✓; rúbrica/fixture/insumos intocados; nenhum conteúdo novo ✓
- **PR #631**: head atualizado para `4cabf984`, bullet `insumos/` corrigido ("2 entradas adaptadas"), exatamente **1** linha `Provenance:` com a sessão real do run `5a7cbb7f` (`ses_f0b51c6a5ffeQaXV3ZeXB49qht`), seção Errata com `session=pendente(run ea5377e7)` (forma autorizada, sem substituição), PR permanece **draft/open** ✓

A errata torna a divulgação da amostra fiel aos dados que o revisor já conferiu (2 subjects adaptados no diff `meus_commits.json` vs `demo_commits.json` blob `8a0d39ce99e1`) — ou seja, resolve o meu erratum não-bloqueante §3 do parecer. A aprovação carrega para o head final sem reservas.

## 3. Limites deste registro

Merge/publicação do PR #631 seguem **gated** (countersign/porta única) — este registro não os autoriza, e a conclusão desta issue não conclui o merge. Próximo candidato de conteúdo (PO `6e620aec`): espera esta higiene ✔ e a composição do pg-d01 (PR #620), não outra cadeia de engines.

## 4. Disposição

`done` — escopo da issue completo e verificado: seleção registrada (U03), entrega pg-d02 (run `5a7cbb7f`), revisão CD aprovada (`9bfee683` + correção de proveniência `63193b8c` §1), errata PO entregue e verificada (head final `4cabf984`). Nenhuma ação pendente de qualquer dono nesta issue; o gate de publicação vive no fluxo do PR #631, fora dela.

Provenance: agent=content-designer(f2b1e95d) task=AID-3553 run=2985fcb1-1e63-482a-aa40-f73db7940da9 session=pendente(run 2985fcb1-1e63-482a-aa40-f73db7940da9 — sessão persistida ainda não publicada no registro do run em andamento; diretiva PO: sem substituição)

---

