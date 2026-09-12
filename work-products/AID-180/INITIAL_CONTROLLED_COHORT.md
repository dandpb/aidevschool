# AID-180 — coorte inicial controlada

**Preflight UTC:** 2026-08-25T19:04:02Z  
**Gate reconciliado UTC:** 2026-08-28 (pin `ec265fab`) → 2026-08-29 (pin `29b59a92`) →
2026-08-29 (pins `7426d384`/`bbf27bb5`) → **2026-08-29 (pin `3f641906`, vigente)**  
**Executor/moderador nomeado:** Founding Product Engineer
`fa8130d5-e24e-4f98-8470-ccfeef17c6d5`  
**Disposição:** **COORTE EXECUTADA (atestação CEO 2026-08-30T00:32:33Z; consolidação
AID-365)** — as duas sessões consentidas ocorreram na identidade vigente `3f641906`/
`6a923bf2`/`fc694824…` (nenhum re-pin na janela). Critério 5 ENTREGUE em 2026-08-30T00:37Z:
**recomendação explícita `continuar`** — QA Lead independente (`ca6a3f95`), AID-348
(veículo canônico) e AID-366 (duplicata) ambas `done` com o mesmo veredito, C1–C4 PASS,
nenhum gatilho de `pausar`; evidências `docs/qa/AID-348_QA_REVISAO_POS_SESSOES_2026-08-30.md`
e `docs/qa/AID-366_QA_EXECUCAO_COORTE_2026-08-30.md`. **Os seis critérios de AID-180 estão
satisfeitos; resta somente o aceite CEO do desfecho** (confirmação `141d9ac9-52ce-45d5-b411-490ef0aa65bc`,
wake-on-accept). Qualquer novo deploy/re-pin invalida a leitura corrente.**

## Aceite CEO — 2026-08-29 (UTC), agente CEO `501cb456-b786-4d67-b951-6c71e0f0915d`

Decisão executiva registrada no heartbeat AID-319:

1. **Aceite do protocolo AID-142 v1** — confirmação `35fd67c0-3706-4e12-9ca2-4ba98f9000d9`
   ACEITA. O protocolo final limita público (duas sessões consentidas: uma `IA Prática`
   `l02`, uma `Trilha Dev` `game-02-warehouse`, uma trilha por participante) e dados
   (scorecards anonimizados allowlisted, sem PII, sem gravação; armazenamento de pesquisa
   restrito fora do git; exclusão em 30 dias). Verificado por AID-301 (protocolo v1 PASS) e
   AID-313 (F2 PASS).
2. **Aceite da confirmação reconcilada `17956ad1` para a identidade vigente** — revisão
   `3f6419063e1dad923317c911227a8b21fcf50ad7`, deploy `6a923bf25bc97ecfacfd3fed`, manifesto
   `fc694824…`. GO de QA independente sobre ESTA identidade: **concedido em AID-313**
   (4/4 charters PASS; ponte Dev viva com recibo FAIL→retry→PASS). As confirmações
   anteriores `5a7837ea`/`510c6903` (pin `ec265fab`) permanecem superseded.
3. **Nomeações operacionais:** moderador/executor = Founding Product Engineer (`fa8130d5`);
   QA independente da coorte = QA Lead (`ca6a3f95`, produtor ≠ verificador); armazenamento
   restrito = research storage fora do git conforme protocolo AID-142 §3; owner de rollback =
   FPE (alias `6a923b59` `bbf27bb5` ou `6a9227f6` `29b59a92` conforme AID-313).
4. **Ordem de execução restante:** (a) ~~QA Lead emite GO/NO-GO de prontidão da coorte em
   AID-258 contra ESTA identidade~~ — **RESOLVIDO em 2026-08-29: GO emitido (5/5 charters
   PASS; AID-320/AID-258; evidência `docs/qa/AID-258_QA_PRONTIDAO_COORTE_2026-08-29.md`;
   achado P3 de registro: confirmações `35fd67c0`/`17956ad1` seguem `pending` na API —
   saneamento com UX/AID-324)**; (b) fundador/CEO recruta e
   agenda os dois participantes consentidos em sistema separado — contatos nunca nesta issue
   nem no git; (c) só então executar as duas sessões dentro do limite aprovado.
   Convites permanecem proibidos até (b).

## Reconciliação do GO — cadeia AID-242/AID-251/AID-253/AID-254 (histórico, pin `ec265fab`)

O GO funcional independente de AID-251 para o candidato integrado de AID-242 tinha uma única
condição: vincular o bundle a uma revisão Git imutável antes de promover o alias. AID-253
satisfez essa condição, reconstruiu o bundle a partir da revisão `ec265fab13ac98700e9de58b5d719d55d979178d`
e promoveu exatamente o artefato verificado ao alias canônico.

AID-254 verificou a promoção em contexto independente: manifesto e revisão correlacionados,
smoke remoto `6/6` no permalink e `6/6` no alias, e hashes de `learner/learning_state.yaml` e
`.mavis/learning_state.yaml` preservados. Sua disposição final foi **GO**.

Em 2026-08-28, o preflight mínimo deste gate confirmou `HTTP 200` em `/` e
`/apps/warehouse/`, e o manifesto publicado declarou a mesma `sourceRevision` registrada em
AID-253. Esse GO histórico **não é mais a identidade vigente**: foi superado pelos re-pins
abaixo. Os NO-GOs AID-186, AID-200, AID-212 e AID-218 e as identidades de AID-178/AID-219
(incluída a `ec265fab`) permanecem históricos e não são reutilizados para novos convites.

## Re-pins intermediários — AID-290/AID-297/AID-301 (`29b59a92`) e AID-306/AID-307 (`7426d384`) + AID-298 (`bbf27bb5`) — superseded

AID-290 re-pinou a produção em `29b59a92` (GO independente AID-297; pré-verificação AID-301
5/5 charters PASS, veredito GO-ready condicional com achados F1/F2). AID-306 promoveu
`7426d384` (fix reflow AID-271; PASS independente AID-307 sobre o permalink `6a92389c`) e o
fix de contraste AID-298 foi promovido como `bbf27bb5` (verificação AID-308 em curso contra
essa revisão). Essas revisões **não são mais a identidade vigente**: foram retidas como
ancestrais do pin final abaixo (nenhuma perdeu conteúdo; a identidade é o controle).

## Pin vigente — AID-305 (`3f641906`, 2026-08-29): ponte de verificação Dev restaurada

Decisão executiva do CEO (heartbeat AID-300, achado F1): **restaurar a ponte de verificação
in-repo** em vez de aceitar a degradação "Verificador indisponível" — a confirmação pendente
`35fd67c0` foi emitida contra o protocolo v1 cujo estado verificado (AID-219) inclui a ponte
viva. AID-305 executou: função canônica
`learner/gate/netlify-functions/dojo-verification-bridge.mjs` rastreada no git (bytes
idênticos aos do GO AID-219, sha256 `ce72a04f…`), staging deployável dentro do site root
(`netlify/functions/`, guarda de drift no deploy), redirects `__dojo/bridge` à frente do
fallback SPA (paridade `ec265fab`), PR #181 (branch `aid-305/dev-bridge-in-repo`), e re-pin
`3f641906` = merge `bbf27bb5` (produção vigente: reflow + contraste retidos) + ponte.
Superfícies estáticas byte-idênticas ao deploy anterior — único delta é a função do
verificador e o `sourceRevision` do manifesto. Sonda do produtor em draft, alias e permalink:
sessão same-origin `200` JSON (token 43 chars), cross-origin `403` JSON `origin-forbidden`,
`POST /verification` com recibo PASS sintético (`canonical_gate_status: not-submitted`);
pre-check 21/21 contra alias e permalink (`work-products/AID-305/precheck-bridge.mjs`;
provenança completa em `work-products/AID-305/RELEASE.md`).

Portanto o gate técnico das duas jornadas está **GO-ready apenas para a identidade unificada
abaixo, condicionado ao GO de QA independente sobre esta identidade** (filha AID-305 em voo:
identidade/linhagem, superfícies, jornada Dev com recibo, smoke 6/6). Esse GO substitui as
identidades técnicas anteriores (`ec265fab`/`6a9141bc`/`ddf404d9`,
`29b59a92`/`6a9227f6`/`48714a7f`, `7426d384`/`6a92389c`/`bb2bc520`,
`bbf27bb5`/`6a923b59`) para novos convites; não é herdado por qualquer deploy futuro e não
declara mastery. Um novo deploy/re-pin invalida a leitura corrente (identidade é o controle).

O gate operacional da coorte continua **BLOCKED**: o GO técnico não substitui consentimento,
nomeação do moderador e QA independente, armazenamento restrito nem recrutamento/agendamento.

## Identidade técnica vigente e rollback

| Item | Identidade |
| --- | --- |
| Revisão Git imutável | `3f6419063e1dad923317c911227a8b21fcf50ad7` (retém `bbf27bb5`, `7426d384`, `29b59a92`, `afd6789`, `61b85535`, `ec265fab`) |
| Deploy de produção | `6a923bf25bc97ecfacfd3fed` |
| Permalink imutável | `https://6a923bf25bc97ecfacfd3fed--aidevschool-codexdojo-os.netlify.app` |
| Alias canônico | `https://aidevschool-codexdojo-os.netlify.app` |
| Manifesto do bundle | `fc694824d22e0dbd0def7be6c284ce37d8274342df34e3855eb03c4fc6c7d658` |
| Ponte de verificação Dev | viva: `GET /__dojo/bridge/v1/session` → same-origin `200` JSON / cross-origin `403` JSON `origin-forbidden` |
| Jornadas no host | IA Prática + Trilha Dev (`game-02-warehouse` como primeira missão) |
| Owner de rollback | Founding Product Engineer `fa8130d5-e24e-4f98-8470-ccfeef17c6d5` |
| Rollback | republicar deploy anterior pelo histórico Netlify e interromper novos convites |

A identidade normativa é a revisão, o permalink imutável e o hash do manifesto, não o checkout
compartilhado nem apenas o alias mutável. Em regressão crítica: interromper novos convites,
republicar o deploy anterior, registrar IDs/hashes e pedir novo smoke independente. O rollback não
autoriza escrita no learner canônico.

## Preflight reproduzido — pin vigente `3f641906`/`6a923bf2` (2026-08-29)

Checagens FPE contra produção (2026-08-29, sem convites, sem escrita em
`learner/`/`.mavis/`):

- Manifesto `pilot-bundle-manifest.json`: alias e permalink `6a923bf2` ambos SHA-256
  `fc694824…` (== build local, correlação produtor), declarando `sourceRevision`
  `3f6419063e1dad923317c911227a8b21fcf50ad7`.
- Superfícies estáticas byte-idênticas ao deploy anterior `6a923b59` (reflow AID-271 e
  contraste AID-298 retidos); OS `index.html` `4658412b…` == manifesto.
- Pre-check 21/21 contra alias e permalink (identidade, superfícies 200, MOTOR l01/l02,
  warehouse, pin same-origin literacy, predicado reflow @320/@298) —
  `work-products/AID-305/precheck-bridge.mjs` (re-executável).
- `GET /__dojo/bridge/v1/session`: same-origin `200 application/json` (token 43 chars);
  sem contexto same-origin `403` JSON `{"error":"origin-forbidden"}` — ponte viva
  (paridade AID-219). `POST /verification` sem token `401`.
- `learner/learning_state.yaml`:
  `c3cae54c452413b75b64f1e97ab6f34fe9d529a8be4b50fdccf861696d230bbf` (intocado; nenhuma
  escrita em `learner/`/`.mavis/` nesta cadeia).
- GO de QA independente sobre ESTA identidade: pendente (filha AID-305; inclui jornada Dev
  em browser com recibo FAIL→retry→PASS e smoke 6/6 — produtor ≠ verificador).

## Preflight histórico — pin anterior `ec265fab`/`6a9141bc` (superseded)

- AID-254: GO independente da promoção, smoke `6/6` no permalink e `6/6` no alias, limitado a
  Chromium; learner canônico e projeção `.mavis` invariáveis.
- Preflight AID-256 em 2026-08-28: alias `/`, `/apps/warehouse/` e manifesto retornaram HTTP 200;
  manifesto SHA-256 `ddf404d93468bcf0cea776b080990774cd2b68566aa163b60d2b5f687c7fc6b7` e
  `sourceRevision` `ec265fab13ac98700e9de58b5d719d55d979178d`.
- OS `index.html` no pin anterior:
  `41c8c332eb8345bac6aec76b18c6245205de264242ef9452471520a33a78887`.
- AID-178: jornada Chromium limpa, recibo independente correlacionado, legais e ausência de falso
  mastery/escrita canônica: PASS.
- AID-219: WAREHOUSE `FAIL -> retry -> PASS` em Chromium limpo, duas evidências persistidas,
  recibo PASS correlacionado à segunda tentativa e learner invariável: APROVADO — a ponte que
  esse GO exercitou está **restaurada no pin vigente** (AID-305).

## Limite da coorte e protocolo

O limite proposto em AID-142 é exatamente duas sessões consentidas: uma `IA Prática` (`l02`) e uma
`Trilha Dev` (`game-02-warehouse`), uma trilha por participante. O suporte/feedback é uma sessão
moderada de até 25 minutos; suporte técnico é triado pelo Founding Product Engineer e feedback do
piloto pelo CEO. Scorecards anonimizados ficam em armazenamento de pesquisa restrito, fora do git,
com exclusão em 30 dias. Nenhum nome, contato, resposta, prompt, gravação, IP ou texto livre entra
neste repositório ou no scorecard.

Participantes convidados nesta execução: **0**. Participantes anonimizados observados: **nenhum**.
Não houve sessão, coleta, escrita em `learner/`/`.mavis/`, nem marcação de mastery.

## Logística operacional — desbloqueio executivo AID-328 (2026-08-29, sem participantes)

Diretiva CEO AID-327/AID-328: todos os gates satisfeitos; issue desbloqueada
(`blocked` → `todo`). Registro dos critérios 1–4 da descrição de AID-180 na parte que
NÃO depende de participantes:

1. **Identidade/registro (critério 1):** já vigente na tabela acima — revisão
   `3f6419063e1dad923317c911227a8b21fcf50ad7`, deploy `6a923bf25bc97ecfacfd3fed`,
   permalink `https://6a923bf25bc97ecfacfd3fed--aidevschool-codexdojo-os.netlify.app`,
   manifesto SHA-256 `fc694824…`, owner de rollback = FPE (`fa8130d5`). Re-verificado ao
   vivo em 2026-08-29 (desbloqueio AID-328): alias `HTTP 200`, manifesto do alias SHA-256
   `fc694824…` declarando `sourceRevision` `3f641906…` — identidade inalterada desde o GO
   AID-313. Nenhum deploy/re-pin desde então; qualquer novo invalida este GO.
2. **Legais/smoke/recibo independente (critério 2):** satisfeitos pela cadeia vigente —
   QA independente AID-313 (4/4 charters PASS sobre `3f641906`/`6a923bf2`, incluída jornada
   Dev com recibo FAIL→retry→PASS) e GO de prontidão AID-258/AID-320 (5/5 charters PASS).
3. **Limite de convite (critério 3):** participantes convidados até aqui: **0**. Convites
   seguem proibidos até o gate único remanescente (recrutamento pelo fundador, fora do
   git/issues). Limite aprovado inalterado: 1 `IA Prática` (`l02`) + 1 `Trilha Dev`
   (`game-02-warehouse`), uma trilha por participante.
4. **Timestamp/participantes/canal de suporte/retirada (critério 4):**
   - Agendamento: duas sessões moderadas de até 25 min, agendadas somente em sistema
     separado pelo fundador/CEO (dono do gate; comunicado em AID-327); contatos nunca
     neste issue nem no git. Nenhum slot agendado ainda; participantes anonimizados
     observados: **nenhum** (registro de timestamp de sessão fica para o dia da sessão).
   - Canal de suporte/feedback: durante a sessão, o próprio canal moderado (protocolo
     AID-142 §5 — moderador só formula as perguntas do roteiro); suporte técnico triado
     pelo FPE (`fa8130d5`) fora da sessão; feedback do piloto encaminhado ao CEO
     (`501cb456`). Falha técnica vira `technical_failure` no denominador, sem desvio
     silencioso.
   - Código de retirada: cada sessão recebe código aleatório sem tabela de
     correspondência (formato protocolar `AI-xx-XXX`, gerado no início da sessão, nunca
     armazenado no git); o participante pode parar a qualquer momento e solicitar
     retirada pelo código da sessão → `withdrawal_requested=yes`, linha apagada pelo
     código, permanece só a contagem agregada (protocolo AID-142 §3.5/§7).
   - Abort conditions ARMADAS (abaixo): execução imediata pelo moderador em sessão;
     owner de rollback = FPE; nenhum abort escreve no learner canônico.
5. **Confirmações pendentes no thread (`8ac159cc`, `cb8e5987`, `a7973153`, `5a7837ea`,
   `510c6903`, `17956ad1`):** todas SUPERSEDED pelo aceite CEO registrado (confirmação
   `35fd67c0` ACEITA, seção "Aceite CEO" acima) — nenhuma é gate; nenhuma nova confirmação
   será criada por conta delas.

## Liberação de sessões — aceite CEO 2026-08-29T11:34:59Z

A confirmação de agendamento `47d0c203-8989-4290-b27a-9bf9f40449db` foi **ACEITA** pelo
CEO (usuário `W4VteLICaS4…`) em 2026-08-29T11:34:59.916Z: os dois participantes
consentidos estão recrutados e agendados em sistema separado, fora do git. **Sessões
LIBERADAS** dentro do limite aprovado (1 `IA Prática` `l02` + 1 `Trilha Dev`
`game-02-warehouse`, uma trilha por participante, até 25 min moderadas cada).

Preflight de liberação (mesmo heartbeat, 2026-08-29 ~11:35Z): alias e permalink
`6a923bf2` servindo manifesto SHA-256 `fc694824…` com `sourceRevision` `3f641906…`;
ponte `200` same-origin; superfícies `/`, `/mission/ai-pratica/l02`,
`/mission/dev/game-02-warehouse` todas `200`. **Nenhum re-pin — o GO vigente cobre as
sessões liberadas.** Aparato de dia de sessão ARMADO: códigos de retirada gerados no
início de cada sessão (formato `AI-xx-XXX`, sem tabela de correspondência, nunca no git),
canal moderado como suporte em sessão, triagem técnica FPE fora de sessão, feedback CEO,
abort conditions armadas (owner de rollback FPE). Sem escrita canônica; sem mastery.

Caminho pós-sessão: confirmação `3f4ec900-6799-4673-85f5-49568b2d8d78`
(`request_confirmation`, wake-on-accept) — CEO aceita quando as DUAS sessões ocorreram
(apenas datas/horas e desfecho agregado). Ao aceitar: consolidação do registro
(timestamps, agregados allowlistados em research storage fora do git) e abertura da
revisão independente do QA Lead (`ca6a3f95`) com recomendação explícita
`continuar`/`pausar` (critério 5). QA AID-325 e promoção AID-323/PR #182 permanecem
posteriores a essa revisão.

Estado anterior (aguardando gate de agendamento): o gate externo de recrutamento (dono:
fundador, fora de git/issues) estava materializado como confirmação como confirmação
`47d0c203-8989-4290-b27a-9bf9f40449db` (kind `request_confirmation`, idempotencyKey
`confirmation:AID-180:cohort-scheduling:3f641906`, continuationPolicy
`wake_assignee_on_accept` — aceitar somente com os dois participantes consentidos
recrutados E agendados em sistema separado; contatos nunca no git). Re-verificação de
identidade viva no mesmo heartbeat (2026-08-29T05:12Z, comentário
`798539a5-f76f-4550-957e-8d69ec5a0660`): alias e permalink `6a923bf2` 200; manifesto SHA-256
`fc694824…` declarando `sourceRevision` `3f641906…` em ambos; ponte com assinatura exata
(`Sec-Fetch-Site: same-origin` → 200 token 43 chars; sem → 403 `origin-forbidden`);
superfícies da coorte 200 (`/apps/literacydojo/`, `/apps/warehouse/`,
`/mission/ai-pratica/l02`, `/mission/dev/game-02-warehouse`); convidados **0**. Nenhum
re-pin desde o GO — o GO vigente permanece válido. Pós-sessões: revisão independente do QA Lead (`ca6a3f95`)
com recomendação explícita `continuar`/`pausar` (critério 5) antes de qualquer promoção
(AID-323/PR #182) ou QA AID-325. Sem escrita canônica de learner; sem mastery sem evidência
independente (critério 6).

## Execução da coorte — atestação CEO 2026-08-30T00:32:33Z

A confirmação `3f4ec900-6799-4673-85f5-49568b2d8d78` foi **ACEITA** pelo CEO (usuário
`W4VteLICaS4…`) em 2026-08-30T00:32:33.460Z: as DUAS sessões consentidas ocorreram.
Aceitação sem nota anexa — o registro abaixo afirma somente o que a evidência suporta;
detalhes por sessão (datas/horas, scorecards anonimizados allowlistados) permanecem no
research storage restrito, fora do git, conforme protocolo AID-142 §3 (exclusão 30 dias).

**Proveniência de primeira classe da atestação:** o aceite formal de `3f4ec900` é rota
board-only para atores-agente; a fonte executiva registrada é a resposta do FUNDADOR à
interação `bcafbb77` em AID-362 (2026-08-30T00:31:31Z, pergunta `coorte-sessoes` →
`sim-duas`), propagada pelo CEO (comentário AID-362 `daa5c5ba`, 2026-08-30T00:34:30Z) e
materializada nesta cadeia por AID-365.

- **Janela de execução (limite suportado pela evidência):** sessões liberadas em
  2026-08-29T11:34:59Z (aceite de agendamento `47d0c203`) → atestadas executadas em
  2026-08-30T00:32:33Z (aceite `3f4ec900`); as duas sessões ocorreram DENTRO dessa janela.
  Timestamps exatos por sessão e códigos anônimos por sessão ficam somente no research
  storage restrito (protocolo AID-142 §3/§3.5 — nenhum código ou tabela de correspondência
  no git).
- **Denominador:** 2 sessões consentidas → 2 atestadas executadas (1 `IA Prática` `l02`;
  1 `Trilha Dev` `game-02-warehouse`). Público não ampliado; convidados além do limite: 0.
- **Retiradas/aborts:** nenhum `withdrawal_requested` nem notificação de abort pelo canal
  da coorte; nenhuma ação de rollback executada (owner permanece FPE).
- **Identidade na janela das sessões:** manifesto SHA-256 `fc694824…` /
  `sourceRevision` `3f641906…` verificados na liberação (2026-08-29 ~11:35Z) E
  re-verificados pós-atestação (heartbeat 2026-08-30) em alias e permalink `6a923bf2` —
  **nenhum re-pin na janela; as sessões correram na identidade aprovada pelo GO** (AID-313
  4/4, AID-258 5/5). Re-verificação viva adicional pelo FPE no heartbeat AID-365
  (2026-08-30 ~00:4xZ UTC): alias e permalink ambos `200`, manifesto SHA-256 `fc694824…`,
  `sourceRevision` `3f641906…` — identidade segue inalterada.
- **Fronteira de evidência:** produtor (FPE) ≠ verificador; nenhuma escrita em
  `learner/`/`.mavis/` pela operação; nenhuma mastery marcada; nenhum dado de participante
  neste repositório (critérios 6 e 4 preservados).
- **Critério 5 ENTREGUE — recomendação `continuar`** (2026-08-30T00:37Z, QA Lead
  `ca6a3f95`, verificador ≠ produtor): AID-348 (canônico) e AID-366 (duplicata) encerradas
  `done` com charter pré-registrado, C1–C4 PASS — registro 2/2 exato ao limite, scan PII
  limpo, `learner/learning_state.yaml` `c3cae54c…` intocado, zero commits git na janela,
  nenhum re-pin. Evidências: `docs/qa/AID-348_QA_REVISAO_POS_SESSOES_2026-08-30.md`,
  `docs/qa/AID-366_QA_EXECUCAO_COORTE_2026-08-30.md`. Nenhum gatilho de `pausar` acionado.
  Promoção (AID-323/PR #182) e QA de regressão (AID-325) permanecem posteriores e com
  gates próprios.

## Abort conditions

Interromper imediatamente por recusa/retirada de consentimento, exposição de dados, escrita
canônica inesperada, falsa mastery, hint que revele solução, barreira de acessibilidade sem
recuperação, severidade 3 ou indisponibilidade que impeça a missão.

## Bloqueadores e owners

1. ~~**CEO:** aceitar a confirmação AID-142 `35fd67c0-3706-4e12-9ca2-4ba98f9000d9` e a
   confirmação reconcilada AID-180 para a revisão `3f641906`~~ — **RESOLVIDO em 2026-08-29
   (aceite CEO registrado acima, seção "Aceite CEO")**: moderador, QA independente e
   armazenamento restrito nomeados. Confirmações `5a7837ea`/`510c6903` (`ec265fab`)
   superseded.
2. ~~**QA Lead (ca6a3f95):** GO/NO-GO independente sobre o pin `3f641906`~~ — **RESOLVIDO:
   GO concedido em AID-313** (evidência `docs/qa/AID-313_QA_REPIN_3f641906_2026-08-29.md`,
   4/4 charters PASS). Resta a AID-258 (GO de prontidão da coorte) como verificação
   agregada final antes de convites.
3. **CEO/recrutamento (ABERTO):** agendar os dois participantes consentidos em sistema
   separado; contatos não devem ser registrados na issue ou no git. Pré-requisito: ~~GO de
   AID-258~~ — **satisfeito em 2026-08-29 (GO, 5/5 charters PASS; AID-320)**.

O bloqueio técnico das duas jornadas percorre a cadeia AID-242 (produção), AID-251 (QA funcional
independente), AID-253 (revisão imutável e promoção), AID-254 (QA independente da promoção),
AID-290/AID-297 (re-pin `29b59a92` + GO), AID-301 (pré-verificação 5/5), AID-306/AID-307
(reflow `7426d384` + PASS), AID-298/PR #179 (contraste) e AID-305 (ponte restaurada no re-pin
`3f641906`), ratificada por AID-285 (runbook de promoção). Os NO-GOs AID-186, AID-200, AID-212 e
AID-218 e as identidades anteriores de AID-178/AID-219 permanecem históricos e não são
reutilizados para novos convites.

Após os gates, executar as duas sessões dentro do limite aprovado, registrar somente códigos
anônimos e agregados allowlisted e abrir revisão independente do QA Lead sobre denominadores,
fronteira de evidência e recomendação explícita `continuar`/`pausar`.
