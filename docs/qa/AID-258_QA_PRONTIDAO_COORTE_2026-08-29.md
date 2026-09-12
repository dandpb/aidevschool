# AID-258 — QA independente da prontidão da coorte: **GO** (pós-aceite CEO, pin `3f641906`)

**Data:** 2026-08-29 04:10–04:12 UTC  
**QA independente:** `ca6a3f95-8572-43f4-822a-6b40b9bdb63b` (contexto separado do produtor)  
**Executada via:** AID-320 (desbloqueio decretado pelo CEO no heartbeat AID-319, agente
`501cb456-b786-4d67-b951-6c71e0f0915d`, comment `c7f8b1a9` 2026-08-29T04:08:45Z)  
**Disposição:** **GO para iniciar convites controlados da coorte (AID-180), exclusivamente
sobre a identidade vigente `3f641906`/`6a923bf2`/`fc694824…`** — 5/5 charters PASS. O
agendamento dos 2 participantes segue com o fundador/CEO em sistema separado, fora do git.

## Escopo

Verificação agregada de prontidão pós-aceite CEO: (a) AID-180 aponta exclusivamente para
`3f641906` com aceite CEO registrado; (b) protocolo final AID-142 limita público e dados;
(c) rollback owner, legais, suporte e abort conditions operacionais. Sem convites, sem
correção de defeitos, sem escrita em `learner/`/`.mavis/`. Jornada Dev em browser e smoke
6/6 desta identidade foram independentemente verificados em AID-313 (GO, 4/4) e não são
reexecutados aqui; este run re-verifica identidade/superfícies vivas + camada documental.

Ambiente: Linux x86_64; curl 8.x / python3 urllib; rede pública Netlify; leitura apenas.
Artefatos brutos: `aid258-evidence/` (workspace QA).

## C1 — Identidade publicada vs. aprovada (Sev-1): **PASS**

```text
sha256(alias/pilot-bundle-manifest.json)        = fc694824d22e0dbd0def7be6c284ce37d8274342df34e3855eb03c4fc6c7d658
sha256(permalink 6a923bf2/…manifest.json)       = fc694824…  (alias == permalink, byte-idênticos)
manifest.sourceRevision                          = 3f6419063e1dad923317c911227a8b21fcf50ad7
git cat-file -t 3f641906…                       -> commit (tree 0bcba1a1…, FPE, 2026-08-28)
ancestrais retidos 7/7: bbf27bb5, 7426d384, 29b59a92, 7cd393d9, afd6789, 61b85535, ec265fab
bridge canônica learner/gate/netlify-functions/dojo-verification-bridge.mjs = ce72a04f… (== AID-313/AID-305)
```

## C2 — Superfícies publicadas + ponte viva (Sev-1): **PASS**

- Inventário 27/27 arquivos do manifesto retornam HTTP 200 no alias (2026-08-29 04:11 UTC).
- Hashes de superfície 8/8 == manifesto: os `4658412b…`, literacydojo `878b051f…` + sw.js
  `520c1205…`, warehouse `d348c274…`, wormhole `eef9a3b1…`, relay-station `535ee057…`.
- Alias == permalink byte-a-byte em 7/7 superfícies-chave (os index + 3 jogos + legais).
- Legais byte-a-byte == auditorias históricas (AID-254/301/313): termos `385d87d6…`,
  privacidade `27fe5a37…` em `apps/literacydojo/`.
- Ponte de verificação viva: `GET /__dojo/bridge/v1/session` cross-origin → `403
  application/json {"error":"origin-forbidden"}`; `POST /__dojo/bridge/v1/verification`
  cross-origin → `403 origin-forbidden` (assinatura AID-219/AID-313).

## C3 — Integridade do learner (Sev-1): **PASS**

```text
antes == depois (04:10:59Z → 04:12:04Z):
learner/learning_state.yaml  = c3cae54c452413b75b64f1e97ab6f34fe9d529a8be4b50fdccf861696d230bbf
.mavis/learning_state.yaml   = a900918aeb4c29298d5a672bb6c2c9c66c7185f7b14be35c2db40a212c861bdc
```

Nenhuma escrita em `learner/`/`.mavis/` nesta verificação.

## C4 — Protocolo final AID-142 + aceite CEO (Sev-1, documental/API): **PASS**

- `work-products/AID-142/FIRST_PILOT_FEEDBACK_PROTOCOL.md` (v1): público limitado a
  exatamente 2 sessões consentidas — 1 `IA Prática` `l02` + 1 `Trilha Dev`
  `game-02-warehouse`, uma trilha por participante (§2); dados limitados a eventos/campos
  allowlisted sem resposta, prompt, texto livre, PII, IP, UA, gravação (§6); armazenamento
  restrito fora do git com exclusão em 30 dias (§9); nenhuma sessão escreve em
  `learner/`/`.mavis/` (§9); sem claim de eficácia/mastery (§§1–2, §8).
- **Aceite CEO verificado na cadeia de registro**: revisão executiva do checklist §10
  aprovada (`/paperclip/aid142_ceo_review.json`: "Aceito a request_confirmation pendente");
  decreto executivo no heartbeat AID-319 (comment `c7f8b1a9`, authorAgentId
  `501cb456…` = CEO, status done) aceitando o protocolo v1 (`35fd67c0`) e a confirmação
  reconcilada `17956ad1` para `3f641906`; registro consolidado em
  `work-products/AID-180/INITIAL_CONTROLLED_COHORT.md` § "Aceite CEO" (blockers 1–2
  resolvidos; confirmações `5a7837ea`/`510c6903` do pin `ec265fab` superseded).

## C5 — Gate operacional de AID-180 (Sev-2, documental): **PASS**

- `INITIAL_CONTROLLED_COHORT.md` declara `3f641906`/`6a923bf2`/`fc694824` como identidade
  vigente exclusiva (tabela "Identidade técnica vigente e rollback"); todas as ocorrências
  de pins anteriores (`ec265fab`, `29b59a92`, `7426d384`, `bbf27bb5` etc.) estão em
  contexto histórico/superseded/ancestral, sem reuso para convites.
- Rollback owner nomeado (FPE `fa8130d5`) + procedimento (republicar deploy anterior pelo
  histórico Netlify, interromper convites, registrar IDs/hashes, novo smoke independente;
  aliases elegíveis `6a923b59`/`6a9227f6`).
- Suporte: sessão moderada ≤25 min; suporte técnico triado pelo FPE; feedback do piloto
  pelo CEO; retirada pelo código de sessão. Abort conditions cobrem consentimento, dados,
  escrita canônica, falsa mastery, hint revelador, acessibilidade sev-3 e indisponibilidade.
- Participantes convidados: **0**; nenhuma sessão executada.

## Resultado consolidado

| Charter | Resultado |
| --- | --- |
| C1 identidade publicada | PASS |
| C2 superfícies + ponte | PASS (27/27; 8/8; 7/7; legais; ponte 403 origin-forbidden) |
| C3 integridade do learner | PASS (antes==depois) |
| C4 protocolo limita público/dados + aceite CEO | PASS (1 achado P3 de registro) |
| C5 gate operacional/rollback/suporte/abort | PASS |

## GO/NO-GO

**GO** para iniciar os convites controlados da coorte (AID-180), condicionado a:

1. identidade imutável `3f641906`/`6a923bf2`/`fc694824…` (qualquer novo deploy/re-pin
   invalida este GO — "identidade é o controle", proibição de re-pin decretada no AID-319);
2. recrutamento/agendamento dos 2 participantes consentidos pelo fundador/CEO em sistema
   separado, fora do git;
3. execução estritamente dentro do limite aprovado (1 `IA Prática` `l02` + 1 `Trilha Dev`
   `game-02-warehouse`), com abort conditions e rollback do work product.

## Achados

- **P3 (registro/higiene, não bloqueante):** as interações `request_confirmation`
  `35fd67c0…` (AID-142 v1) e `17956ad1…` (AID-180 `:3f641906`) continuam `status=pending`
  na API, embora o aceite CEO exista como decreto executivo first-class (AID-319, agente
  CEO) e registro consolidado no work product. Owner do saneamento: UX (AID-324, fechamento
  de AID-257/AID-142) — resolver/anotar as confirmações pendentes ao formalizar o gate.

## Limitações explícitas

- Jornada Dev em browser limpo (FAIL→retry→PASS com recibo) e smoke remoto 6/6 não foram
  reexecutados neste heartbeat: foram verificados de forma independente pela QA em AID-313
  (GO, 4/4 charters) sobre exatamente esta identidade; este run confirmou por hash que o
  publicado continua byte-idêntico ao verificado (manifesto fc694824).
- Verificação negativa de "nenhum convite enviado" não é executável; evidência documental
  (participantes convidados: 0) e ausência de escrita canônica são o substituto.
- Este GO não declara mastery, eficácia, paridade nem robustez; valida apenas a prontidão
  operacional para as duas sessões consentidas dentro do protocolo.
