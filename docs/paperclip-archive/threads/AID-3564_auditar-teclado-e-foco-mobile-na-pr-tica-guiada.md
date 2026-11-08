# AID-3564: Auditar teclado e foco mobile na prática guiada

- **Status:** done | **Priority:** medium | **Origin:** manual
- **Assignee:** QA Lead | **Created:** 2026-10-01T00:37:13.088103+00:00 | **Updated:** 2026-11-01T14:14:36.311+00:00
- **ID:** `c37510e3-315c-422f-bbcd-ce15d27d8e44`

## Description

Auditoria independente aprovada pelo PO, coordenada com a frente de produto. Produtor: Learner App & Accessibility. Revisor nativo: QA Lead. Único dono de correção de código continua LEE na AID-3527; esta tarefa não altera código, não cria PR e não publica.



Escopo: interação por teclado, foco, ativação e entrada de texto da prática guiada pg-d01 em viewport mobile/iPad, complementando o review visual/touch-layout de UX/System Designer na AID-3511. Cobrir launcher→prática→exemplo→tentativa→feedback→retry→takeaway/recibo; Tab/Shift+Tab, Enter/Space, Escape quando aplicável, foco após transições/validação, campos/labels, controle alcançável com teclado virtual, scroll ao focar e retorno ao contexto anterior. Não repetir o review de pixels/contraste já atribuído a UX nem as suites antigas de PR618/624/626.



Pin antes da execução: o último candidato de composição conhecido é b75ccf25 na branch aid3527/ac1-composition, formado por625@52f9d3fe +628@e376d04f +629@a4ba6202. LEE está corrigindo Learning Mode automático até1040px e ações sticky. Prepare cenários e leia o código atual agora, mas obtenha no carrier3527 o PRÓXIMO candidato imutável após essas correções antes de executar o walkthrough. Não auditar o worktree em mutação nem repetir defeitos conhecidos do pin antigo. Se não houver novo build, publique os cenários e registre dependência exata do novo pin/LEE; aguarde o handoff informado pelo coordenador, sem polling/timer ou suite repetida.



Aceite: head completo, receita/build e browser/viewport exatos; distinguir emulação de aparelho real e Chromium/WebKit de iPad físico. Exercitar a aplicação real em fixture local sintética, capturar screenshots e sequência de teclas/resultado observável para cada achado. Nada de aprovação visual por contagem de pixels; declarar limitações de screen reader/teclado virtual real quando não medidos. Findings com passos, esperado/atual, severidade e critério de correção; encaminhar apenas ao LEE na mesma cadeia. Se não houver defeito, fornecer evidência de cobertura e limites.



Não aceitar termos reais, não entrar em contas nem enviar dados pessoais; pare antes de qualquer aceite real e use fixture local para fluxo completo. Sem merge/deploy, código/credencial/configuração, tarefa-ponte ou novo reviewer duplicado. Evidência antes do handoff; respeitar403/409/422 e ownership. Provenance usa os dados reais de run/session da execução correspondente, nunca UUID de agente/projeto, \_default ou placeholder.

## Document `Continuation Summary` (2026-10-01)

# Continuation Summary

- Issue: AID-3564 — Auditar teclado e foco mobile na prática guiada
- Status: done
- Priority: medium
- Current mode: review
- Last updated by run: 7fd1d5ea-d5d9-4286-bc53-c4e0ac4a03eb
- Agent: QA Lead (opencode_local)

## Objective

Auditoria independente aprovada pelo PO, coordenada com a frente de produto. Produtor: Learner App & Accessibility. Revisor nativo: QA Lead. Único dono de correção de código continua LEE na AID-3527; esta tarefa não altera código, não cria PR e não publica.



Escopo: interação por teclado, foco, ativação e entrada de texto da prática guiada pg-d01 em viewport mobile/iPad, complementando o review visual/touch-layout de UX/System Designer na AID-3511. Cobrir launcher→prática→exemplo→tentativa→feedback→retry→takeaway/recibo; Tab/Shift+Tab, Enter/Space, Escape quando aplicável, foco após transições/validação, campos/labels, controle alcançável com teclado virtual, scroll ao focar e retorno ao contexto anterior. Não repetir o review de pixels/contraste já atribuído a UX nem as suites antigas de PR618/624/626.



Pin antes da execução: o último candidato de composição conhecido é b75ccf25 na branch aid3527/ac1-composition, formado por625@52f9d3fe +628@e376d04f +629@a4ba6202. LEE está corrigindo Learning Mode automático até1040px e ações sticky. Prepare cenários e leia o código atual agora, mas obtenha no carrier3527 o PRÓXIMO candidato imutável após essas correções a
[truncated]

## Acceptance Criteria

No explicit acceptance criteria captured.

## Recent Concrete Actions

- Run `7fd1d5ea-d5d9-4286-bc53-c4e0ac4a03eb` finished with status `succeeded` at 2026-10-01T02:48:08.426Z.
- Wake com comentário do PO (793ae5c0, 02:22Z — anterior ao meu fechamento, que executei sem tê-lo visto). Reconcilio o checklist do PO contra a re-verificação já executada e cubro as lacunas nomeadas. Primeiro, estado atual e anexos do produtor em AID-3527:

Relatório da LEE detalhado. Verifico agora (1) se as adaptações dela são só locators, e (2) o preview 8799 ainda no ar:

Os specs adaptados da LEE não estão acessíveis em disco; a claim dela é corroborável empiricamente pelo meu lado: meus copies verbatim exigiram **exatamente uma** adaptação (locator do Retry) e nada mais falhou. Confiro agora os checks F1 retry→rúbrica/conclusão nos meus dados e escrevo o mini-probe das lacunas do PO (fechar via toggle + touch sem deslocamento + transição de conclusão):

F1 retry→rúbrica e conclusão já PASS em todos os perfis (foco no `<h2>`, recibo 1955 chars). Escrevo o mini-probe das duas lacunas do PO (fechar via toggle; touch no Fechar sem deslocamento):

m1/m3 (touch, janela de risco ≤1040px) PASS nos 3 checks — foco no toggle e scroll `win:0→win:0` (zero deslocamento). A falha em m0 é do meu probe (API touch em contexto sem touch). Corrijo para mouse no m0 e re-execu
[truncated]

## Files / Routes Touched

- `scripts/merge_pr.sh`

## Commands Run

- Heartbeat run `7fd1d5ea-d5d9-4286-bc53-c4e0ac4a03eb` invoked adapter `opencode_local`.
- Detailed shell/tool commands remain in the run log and transcript.

## Blockers / Decisions

- No new blocker was recorded by the latest run.

## Next Action

- Review the completed issue output and close any remaining follow-up comments.

## Comments (10)

**Learner App & Accessibility Engineer** · 2026-10-01T00:40:41.984725+00:00

# AID-3564 — Cenários publicados; execução aguardando o próximo pin imutável

**Disposição: `blocked`** com dependência de pin registrada (regra de pin da própria tarefa). Nada de código alterado, sem PR, sem publicação.

## 1. Verificação de pin feita agora (2026-10-01 ~00:4xZ)

- `origin/aid3527/ac1-composition` → cabeça **`b75ccf25`** (= pin antigo citado na tarefa: 625@`52f9d3fe` + 628@`e376d04f` + 629@`a4ba6202`).
- `origin/aid3527/pg-d01-os-pratica` (PR #625) → ainda **`52f9d3fe`**.
- Carrier AID-3527 está `blocked` desde 00:06Z; último evento é o changes-requested do PO (comentário `95fe9eb0`, 23:59Z: contraste/estados dos botões de progressão, wrap da navegação de fases sem clipping, desobstrução rail/bottomsheet na entrada real com Modo Aprender).
- **Conclusão: não existe novo candidato imutável.** O worktree está em mutação (LEE corrigindo Learning Mode ≤1040px + sticky actions + changes do PO), então o walkthrough NÃO foi executado — conforme a regra "não auditar o worktree em mutação nem repetir defeitos conhecidos do pin antigo".

## 2. Progresso durável entregue neste heartbeat

**Cenários v1 publicados** em `aid3564-evidence/scenarios-keyboard-focus-mobile-v1.md`, fundamentados em leitura de código @ `b75ccf25` (permitida pela tarefa: "prepare cenários e leia o código atual agora"):

- Matriz browser/viewport M0–M4 com limites declarados (emulação ≠ iPad físico WebKit; teclado virtual real e screen reader não medidos por padrão);
- Receita de execução (build do pin + `vite preview` + Playwright com dispositivo, registro de activeElement/teclas/screenshots por passo);
- Mapa de controles por fase (rail, details/summary, textareas rotulados, grupos de radio por critério, fieldsets travados no retry, CTAs com gate disabled, recibo/copiar);
- 9 cenários C-A/B/T/F/R/K/E/S/M (+C-P contraste desktop): tab/shift-tab, Enter/Space em summary e botões, setas em radios, gate 0/6→6/6, inserção condicional do parcial, escape, foco após cada transição, scroll ao focar, entrada real com Modo Aprender/sticky;
- Modelo de achado (passos, esperado/atual, severidade, critério de correção, encaminhamento só à LEE na cadeia AID-3527) e formato de evidência de cobertura se não houver defeito.

Hipóteses levantadas na leitura (a verificar no walkthrough, não são achados): ausência de gestão de foco nas transições de fase (foco presumivelmente cai no body), foco perdido quando botão/fieldset fica `disabled`, clipboard sem feedback em falha, entrada de texto sob overlays sticky/Modo Aprender.

## 3. Dependência exata para desbloquear

- **Preciso de:** SHA de cabeça + branch do **próximo candidato imutável** anunciado pela **LEE** no carrier **AID-3527**, após Learning Mode ≤1040px, ações sticky e as correções do changes `95fe9eb0`.
- **Dono do desbloqueio:** LEE (agente `98ed5775-4ae8-442e-81d0-e4c50c435205`, cadeia AID-3527) / coordenador que fizer o handoff.
- **Como retomo:** no heartbeat seguinte ao handoff, executo a receita §2 do documento contra o pin anunciado (revendo §3 se a estrutura de controles mudar) e volto aqui com findings ou evidência de cobertura. Sem polling/timer e sem suite repetida, conforme a tarefa.

Provenance deste heartbeat: preparação por leitura de código apenas (nenhuma execução de app/run para reportar; quando houver, virá com run/session reais da execução correspondente).

**founder** · 2026-10-01T00:50:28.211218+00:00

Build imutável disponível: branch remoto aid3527/ac1-composition @83f415a364a66dde993db03e98f0d75844bb3b1c, confirmado na API GitHub; inclui AC1 e correções de Learning Mode≤1040px/contraste/wrap. O mesmo patch UI foi aplicado no PR625 como e99e9152d72791407b18a1dd84e7da1c21e0474a (parent52f9d3fe), ainda sem AC1. Para esta auditoria usar o candidato integrado83f415a3 em worktree limpa e registrar o pin. Cenários preparados podem agora ser executados, sem reabrir pixels já aceitos. Ressalva atual conhecida: barra sticky de feedback tem Retry com6IDs e fica alta, correção00e86add já com único LEE; não criar achado/tarefa duplicado. Concentrar prova independente em teclado/ordem/foco, mobile/iPad emulado e lançamento de OUTROS apps + alternância LearningMode iniciada pelo usuário após mudança sharedDesktopApp. Se a barra impedir um cenário, marcar esse caso dependente do delta e prosseguir com os demais; repetir só casos afetados após novo pin. Não usar workspace em mutação, não aceitar termos, não alterar código/produção. Findings acionáveis e evidência vão ao LEE3527 e QA reviewer já configurado; nenhuma nova task necessária.

**founder** · 2026-10-01T01:09:42.703837+00:00

Novo pin final informado pelo coordenador: PR625@2c41037f51c43faa57fab6980c025bc2c13a8a89; composição integrada@ab295b49021f5ce7bb30fb1051efe447dc0e8c4f. A barra Retry compacta já passou pela inspeção de pixels. Preserve toda evidência de interação do83f415a3 com seu pin original; no candidato final, repetir apenas os casos sticky/foco/scroll afetados e qualquer achado que dependa do delta, sem auditoria integral duplicada.



Distinguir comportamento pré-existente da rail/fechamento por mouse de regressão introduzida pelo candidato, indicando o bloqueio real ao usuário. Para a troca sharedDesktopApp, manter a prova sobre outros apps e alternância Learning Mode iniciada pelo usuário. Não alterar código; achados vão ao único LEE3527. Caso seu papel já tenha passado ao QA quando receber isto, não force writes: encaminhe pelo responsável atual e fluxo nativo. Sem termos reais, publicação ou novos filhos.

**Learner App & Accessibility Engineer** · 2026-10-01T01:18:04.083468+00:00

# AID-3564 — Auditoria executada contra o pin `83f415a3`: 3 findings acionáveis (F1 maior, F2 maior, F3 menor); cobertura e evidência em `aid3564-evidence/`

**Disposição: `in_review`** — evidência pronta para o QA Lead (estágio de revisão nativo desta issue). Findings acionáveis encaminhados à LEE na cadeia AID-3527 (comentário irmão). Resposta ao handoff `d4332b7d`: walkthrough executado no candidato integrado em worktree limpa; ressalva da barra sticky de retry NÃO bloqueou cenários (retry exercitado com 1 alvo); nenhum achado duplica pixels/contraste já aceitos.

## Pin e receita (auditável)

- Worktree limpa `/paperclip/tmp/opencode/aid3564-wt` @ `83f415a364a66dde993db03e98f0d75844bb3b1c` (`git status` limpo), `npm run build` (gen+tsc+vite, sem erro), `vite preview` 127.0.0.1:8797, node v24.18.0, Playwright 1.61.1 Chromium. Execuções ~01:02–01:15Z (2026-10-01).
- Perfis emulados: m1 Pixel 7 412×915 touch, m2 paisagem 915×412, m3 iPad-like 768×1024 touch (Chromium, não WebKit), m0 desktop 1280×800 controle, +probe 768×1024 sem touch.
- Saída: `run/observations.jsonl` (573 linhas — tecla/foco/scroll por passo), `run/probe-observations.jsonl`, `run/shots/` 95 PNGs, recibo completo em **`aid3564-evidence/run-log.md`**.

## Findings (passos/esperado/atual/severidade/critério de correção no run-log §3)

1. **F1 (maior, geral — reproduz inclusive desktop)**: foco cai no `<body>` em TODAS as 5 transições de fase do ciclo guiado (exemplo→tentativa→feedback→retry→rúbrica→takeaway). Sem gestão de foco no GuidedPracticeApp. 25 checks fail ×5 perfis; e.g. `B-after-m1.png`, `T-after-m1.png`, `R-back-m1.png`, `K-in-m1.png`.
2. **F2 (maior touch/pointer; média teclado — m1 total, m3 do critério 2+)**: MentorPanel cobre os controles da rúbrica na posição em tela (`elementFromPoint` retorna elementos do mentor; com **Tab real** o radio focado permanece coberto — radio t:795–839 vs mentor t:612–1250). Toque/click acerta o mentor; teclado opera às cegas. Elemento DISTINTO da ressalva `00e86add` (não é a barra sticky de retry). Provas: `P4-rubric-probe2-p-m1.png`, `P5-rubric-tab-probe3-p-m1.png`, `P4-rubric-probe2-p-m3.png`.
3. **F3 (menor, geral)**: fechar "Modo Aprender" (botão Fechar ou toggle) devolve foco ao `<body>` em vez do toggle que abriu (5/5 perfis). Abrir mantém o foco corretamente.

## Verificado OK (resumo; detalhe §4 do run-log)

Enter/Space em summary nativo e CTAs; rail de fases nunca focável (só `aria-current`); setas+Space nos grupos de radio por critério; campo condicional do Parcial entra na ordem de tab; gate 0/6→6/6 com nota visível; fieldsets travados do retry pulados nativamente (P2); scroll-into-view por Tab de campo abaixo da dobra (P1 — a falha inicial era artefato de foco programático, descartada); CTA do takeaway disabled até (a)+(b); recibo determinístico + "Copiar recibo" com toast; Escape sem ação destrutiva; **correção ≤1040px confirmada por teclado** (Modo Aprender inicia fechado, abre por ação do usuário, janela por baixo alcançável — `input#command` do Terminal) e lançamento de 2º app via launcher só por teclado (5/5 perfis).

## Limites declarados

Emulação Chromium (sem teclado virtual real, sem screen reader medido, sem WebKit de iPad físico); clipboard sem permissão real não exercitado (toast observado); contraste/pixels não re-abertos (UX/AID-3511); suites PR618/624/626 não repetidas.

## Caminho de revisão

QA Lead: re-executável com os comandos do run-log §6 (worktree e preview deixados no ar; `playwright.config.ts` 8/8 + `probe2/probe3` para F2). Findings F1–F3 seguem para a LEE na cadeia AID-3527 — esta issue não altera código.

**Learner App & Accessibility Engineer** · 2026-10-01T01:18:51.290754+00:00

Encaminhamento dos findings à LEE: tentei postar o pacote F1–F3 na cadeia AID-3527 conforme a tarefa pede ("encaminhar apenas ao LEE na mesma cadeia") e a API recusou com `"Issue is outside this actor's authorization boundary"` — boundary/ownership respeitado, sem retry. **O pacote completo (passos/esperado/atual/severidade/critério de correção + provas) está no meu comentário `c8baa572` acima e em `aid3564-evidence/run-log.md` §3**, pronto para o coordenador/QA Lead rotear à LEE (98ed5775) na janela dela. Nenhum achado foi aberto como task nova (instrução do handoff `d4332b7d`).

**Learner App & Accessibility Engineer** · 2026-10-01T01:23:18.058691+00:00

New final pin received (`ab295b49` composition, PR625@`2c41037f`). Per the delta instructions: preserve the 83f415a3 evidence (already pinned), re-run only affected sticky/focus/scroll cases + the sharedDesktopApp proof, and classify pre-existing vs regression. The 83f415a3 environment stays untouched on port 8797.

Delta is small: compact Retry label (the `00e86add` fix), retry-target IDs moved to scrolling content, `role="group"` removed from the sticky bar, CSS note ordering. Setting up the final-pin worktree and a delta-only harness.

All carried findings (F1/F2/F3) reproduce on the final pin — **pre-existing, not regressions**. The S3 fail is my harness bug (delta `activeDesc` omits id/class, so the regex can never match). Fixing and re-running:

S3 passes everywhere — no regression from the final candidate. All 19 delta fails map 1:1 to the three pre-existing findings. Appending the delta section to the run log:

The issue write hit the authorization boundary — per the coordinator's explicit instruction ("não force writes: encaminhe pelo responsável atual e fluxo nativo"), I stop writing to the thread. The delta evidence is durable on disk; leaving a handoff note for the QA reviewer there instead:

Heartbeat complete. Delta executed on the final candidate; issue stays **`in_review`** with the QA Lead (native flow) — per the coordinator's instruction when the role has passed to QA.

**Delta results (`ab295b49` vs audited `83f415a3`)** — diff audited first (compact Retry, targets note moved to scrolling content, `role=group` removed, CSS order), then re-checked only affected cases + the sharedDesktopApp proof on a clean worktree (6/6 tests, 42 checks, `run-final/`):

- **F1/F2/F3 all confirmed pre-existing** — reproduce on the final pin; **no regression introduced** by the final candidate. Real user-facing mobile blocker remains F1+F2 combined (Tab-focused rubric control covered by mentor + tab restart on every transition).
- **Delta-specific all green**: compact Retry label (no IDs in sticky bar), targets note in scrolling content, sticky retry CTA keyboard-operable, Tab scroll-into-view, gate 6/6, receipt, rail starts closed ≤1040px, second app launched keyboard-only (3/3), window content reachable with rail open (3/3).
- **1 new minor observation for LEE**: `role="group"`/`aria-label` removed from the sticky bar at `ab295b49` (SR loses the labeled grouping).

**Writes**: the delta comment on AID-3564 was refused by the API (`outside this actor's authorization boundary`) — respected without retry, as instructed. Routing is via `aid3564-evidence/HANDOFF-QA-LEE.md` (evidence order, re-execution recipes — both previews still serving on 8797/8798, worktrees clean) for the QA Lead and the coordinator to forward F1–F3 to LEE. No code changed, no new tasks, no merge/publication.

**QA Lead** · 2026-10-01T01:30:13.026716+00:00

**Approved** — revisão nativa QA Lead (participante atual do estágio review). Auditoria de teclado/foco mobile pg-d01 verificada de forma independente e reproduzida por este revisor; produtor ≠ verificador respeitado.

**Verificação independente executada neste heartbeat** (não apenas leitura da evidência do executor):
- **Pinos/worktrees**: `83f415a3` e `ab295b49` confirmados em HEADs detached limpos (`aid3564-wt`, `aid3564-final-wt`; `git status` vazio); previews 8797/8798 respondendo 200.
- **Re-execução do harness principal** (cópia isolada, sem contaminar o JSONL do executor): 8/8 testes, 111 ok/29 fail — padrão de falhas idêntico ao do executor: `focus=BODY` nas 5 transições de fase (F1) e no fechamento do Modo Aprender (F3); toda a cobertura restante verde (Tab/Shift+Tab, Enter/Space em summary/CTAs, setas+Space nos radios, gate 6/6, fieldsets travados pulados, recibo/copiar, launcher de 2º app só por teclado, ≤1040px).
- **Re-execução do delta** no pino final: 5/6 + f-m1 re-executado 2/2 após 1 flake de entrada (app parou na tela "escolha sua trilha"; infra de entrada, não comportamento auditado) — fails mapeiam 1:1 a F1 (15×BODY), F2 (1×covered, hit `<strong>` do mentor), F3 (3×BODY) = 19/19; delta-specific verde (D1 `role=null`, Retry compacto, Tab scroll, sharedDesktopApp 3/3).
- **F2 corroborado por dados mensuráveis**: radio focado por Tab real t:795–839 dentro do mentor t:612–1250 (viewport 839); `elementFromPoint` retorna elementos do mentor sobre TODOS os controles medidos em m1; m3 crit.1 ok, crit.2+ covered — coerente com o reportado.
- **Triage de 2 checks não-conformes do run principal aceita como som**: `disabled-viols=20` (check mais estrito que o comportamento — fieldset[disabled] dá skip nativo com `.disabled` próprio false; probe P2 confirma cadeia Tab nunca para em travado) e scroll com foco programático (artefato descartado pelo executor via Tab real P1/delta). Ambos divulgados no run-log, não são defeitos de produto.

**Veredito de fundo**: F1 (maior), F2 (maior touch/média teclado), F3 (menor) são defeitos de produto **pré-existentes** no candidato final — corretamente encaminhados à LEE, não à auditoria. A auditoria em si cumpriu o aceite: pin imutável + build/browser exatos, aplicação real em fixture sintética, teclas/resultado observável por achado, severidade + critério de correção, limites declarados (sem teclado virtual real/SR/WebKit físico), sem tocar código/canônicos, sem re-abrir pixels (UX/AID-3511) nem suites PR618/624/626.

**Roteamento pendente (registro de bloqueio)**: tentei postar o pacote F1–F3 na cadeia AID-3527 como QA Lead e a API recusou com `Issue is outside this actor's authorization boundary` (3ª recusa: executor 2×, revisor 1×; sem retry/contorno). **Dono do desbloqueio: coordenador** — postar o pacote (pronto em `aid3564-evidence/HANDOFF-QA-LEE.md` + meu comentário) para a LEE (98ed5775) na janela dela em AID-3527.

Esta aprovação fecha a revisão da auditoria; **não autoriza merge/deploy** — seguem gates próprios (countersign/porta única).

**founder** · 2026-10-01T02:22:49.58135+00:00

PO: reabrir somente a re-verificação independente do delta novo, pelo QA Lead já designado. Não repetir auditoria integral nem conteúdo inalterado. LEE terminou run 8ac96226-553c-4ca9-b882-e333d691b0e4 com correções F1/F2/F3 e fechamento por ponteiro. Pins confirmados no GitHub: fix aid3527/fix-f1-f3 @2776d90331d17c6a90ec03de3c3c831172385a40 (base PR625 @2c41037f); composição integrada aid3527/ac1-composition @bc59b392afbf2b5290b10e6963905619b097ce30. Esta composição é o candidato a testar, não PR625 antigo.

Usar cópia/worktree própria limpa e fixar baseURL/head/build. Recibo e anexos recentes em AID-3527: f-fix-rubrica-m1.png, f-fix-foco-toggle-1280.png, f-fix-manifest.json. Reproduzir os checks originais de F1 transições incluindo retry→feedback e conclusão, F2 radios/campos realmente visíveis e clicáveis por ponteiro + Tab em mobile/iPad, F3 foco ao fechar via botão e toggle, mouse/touch Fechar sem deslocamento, outros apps e Learning Mode acionado pelo usuário. Reaproveitar suites desta auditoria; verificar que adaptações do produtor alteram só locators do Retry compacto, sem enfraquecer assertivas. Tornar entrada na fixture local determinística antes do subset; não aceitar termos reais nem contornar telas com dados pessoais. Não alegar SR/iPad físico não medidos.

A11y anterior e pixels contraste/wrap/Retry continuam aceitos no seu pin original; a decisão nova deve nomear o head corrigido e cada finding, com evidência de interação e limitações. Nenhuma escrita de código, cherry-pick, merge/deploy ou novo filho. Reportar no seu próprio carrier; se a cadeia LEE negar comentário, parar e o coordenador encaminha. Run/session reais. Dados do produtor não substituem sua execução independente.

**QA Lead** · 2026-10-01T02:38:25.528186+00:00

# Re-verificação QA (reabertura) — F1–F3 CORRIGIDOS no pino `bc59b392`; zero regressões; auditoria encerrada

**Contexto da reabertura**: coordenador reabriu esta issue (done→todo, 02:21Z) após a LEE corrigir F1–F3 (fix `aid3527/fix-f1-f3`@`2776d903`, composição `bc59b392`) — caminho de espera nomeado pela LEE: re-verificação QA pelo fluxo nativo desta issue. Executada agora, de forma independente (QA ≠ produtor do fix), pelos critérios de correção da própria auditoria.

## Resultado (worktree limpa @ `bc59b392`, build real, preview 8799, Playwright 1.61.1 Chromium)

- **F1 CORRIGIDO** — foco pós-transição = `<h2>` da nova fase em todas as transições e 4/4 perfis (0 fails; antes 15).
- **F2 CORRIGIDO** — probe2 2/2 + probe3 1/1: controles da rúbrica são o próprio hit-target (`covered=false`; radio t:563–607 vs mentor t:624+; antes hit=mentor/covered=true).
- **F3 CORRIGIDO** — fechar Modo Aprender devolve foco a `button.learn-toggle` (4/4 perfis; antes body).
- **Sem regressões** — delta 6/6 com **0 fails** (antes 19 = F1–F3); audit 8/8 (140 checks pós-fix: só o artefato conhecido `disabled-viols`, estrito do check, skip nativo confirmado); **unit 390/390 ✓**; D1 resolvido (`<section aria-label="Ação da fase atual">`).
- **Adaptação de harness divulgada**: meu copy de audit/probe2 usava o rótulo antigo do CTA Retry (válido só no `83f415a3`; o compacto veio do fix `00e86add` já aceito) — atualizado na cópia do revisor, semântica preservada. Evidência original intacta.

Evidência: `aid3564-evidence/run-log.md` §RE-VERIFICAÇÃO + `run-fix/` (jsonl/screenshots/specs adaptados). Previews: 8797/8798 (pins antigos) e 8799 (fix) no ar para conferência.

**Disposição**: `done` — auditoria original aprovada (ee4f654f) e correções F1–F3 re-verificadas de forma independente neste pino. Pendências fora daqui: cherry-pick do fix ao PR #625 e fechamento AID-3527/AID-3567 (PO/FPE). Nada de merge/deploy autorizado por esta issue.

**QA Lead** · 2026-10-01T02:47:58.758298+00:00

Reconciliação do comentário PO `793ae5c0` (02:22Z — chegou ao QA após a re-verificação já executada; nenhuma parte conflita, lacunas complementares cobertas agora).

Checklist PO → evidência:
- **Worktree/baseURL/head/build próprios**: `aid3564-fixwt` @ `bc59b392`, build real, preview 8799 ✓.
- **F1 transições incl. retry→feedback e conclusão**: 4/4 perfis — `focus back on rúbrica` → `<h2#practice-feedback-title>`; `focus after conclusion` → `<h2#practice-takeaway-title>`; recibo 1955 chars ✓.
- **F2 radios/campos visíveis + clicáveis por ponteiro E Tab (mobile/iPad)**: probe2 2/2 (elementFromPoint = próprio controle em m1/m3) + probe3 1/1 (Tab real, covered=false) ✓.
- **F3 via botão E toggle + mouse/touch sem deslocamento** (probe novo `run-fix/pocheck.spec.ts`): fechar pelo toggle → `focus=<button.learn-toggle>`; tap touch no Fechar (m1/m3) e mouse (m0) → rail=0, foco no toggle, **scroll win:0→win:0** — fix `onPointerDown` confirmado; 3/3 perfis ✓.
- **Outros apps + Learning Mode do usuário**: delta S-tests 3/3 ✓.
- **Adaptações do produtor só locators, sem enfraquecer**: verificado comportamentalmente — meus copies verbatim exigiram exatamente 1 adaptação (locator Retry compacto, fix `00e86add` já aceito) e nenhuma outra asserção falhou/precisou mudar. Limitação declarada: `audit.fix/probe2.fix` da LEE não acessíveis em disco para diff byte-a-byte.
- **Entrada determinística**: 0 flakes nas runs finais (8/8, 2/2, 1/1, 6/6, 3/3).
- **Head nomeado por finding, limitações SR/iPad físico mantidas; sem código/cherry-pick/merge/filho; report no próprio carrier** ✓. Anexos f-fix do produtor tratados como recibo dele, não substituem esta execução.

Evidência: `aid3564-evidence/run-log.md` §RE-VERIFICAÇÃO + §Reconciliação PO; `run-fix/` (jsonl, specs, 82 prints). **Disposição: `done`** — veredito mantido: F1/F2/F3 corrigidos em `bc59b392`, zero regressões (delta 0 fails, unit 390/390).

---

