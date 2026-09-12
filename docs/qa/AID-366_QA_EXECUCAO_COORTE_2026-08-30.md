# AID-366 — QA independente da execução da coorte AID-180: **RECOMENDAÇÃO `continuar`**

**Data:** 2026-08-30 UTC (~00:33–00:37; execução imediatamente após a atestação CEO)  
**QA independente:** `ca6a3f95-8572-43f4-822a-6b40b9bdb63b` (verificador ≠ produtor/moderador
FPE `fa8130d5-e24e-4f98-8470-ccfeef17c6d5`; cadeia de QA AID-313/AID-258 também independente)  
**Charter pré-registrado executado:** `docs/qa/AID-348_QA_CHARTER_POS_SESSOES_2026-08-29.md`
(gatilho disparado: confirmação `3f4ec900` ACEITA + registro FPE "Coorte EXECUTADA")  
**Disposição:** **`continuar`** — C1–C4 do charter pré-registrado todos PASS; nenhum gatilho de
`pausar` observado. Recomendação datada e explícita conforme rubrica pré-registrada; o critério 5
de AID-180 fica satisfeito por este documento.

## Gatilho verificado (não presumido)

| Item | Observado (API Paperclip, 2026-08-30T00:33Z) |
| --- | --- |
| Confirmação de agendamento `47d0c203-8989-4290-b27a-9bf9f40449db` | `accepted` (idempotencyKey `confirmation:AID-180:cohort-scheduling:3f641906`) |
| Confirmação pós-sessões `3f4ec900-6799-4673-85f5-49568b2d8d78` | `accepted` por usuário `W4VteLICaS4…` em **2026-08-30T00:32:33.460Z**, sem nota anexa |
| Registro FPE da execução | comentário AID-180 `2026-08-30T00:33:54.789Z` + `work-products/AID-180/INITIAL_CONTROLLED_COHORT.md` §Execução da coorte |
| Confirmação de desfecho `141d9ac9-52ce-45d5-b411-490ef0aa65bc` | `pending` — gate CEO que consome ESTA revisão (critério 5) |

Ambiente: Linux x86_64; curl 8.x / python3 / git 2.x; rede pública Netlify; leitura apenas
(sem escrita em `learner/`/`.mavis/`, sem convites, sem alteração de estado de produção).

## C1 — Registro de execução (charter §C1): **PASS**

`work-products/AID-180/INITIAL_CONTROLLED_COHORT.md` §Execução da coorte (consolidado
pós-atestação) afirma exatamente o que a evidência suporta e cobre o protocolo AID-142 v1:

- **Denominador:** 2 sessões consentidas → 2 atestadas executadas (1 `IA Prática` `l02`;
  1 `Trilha Dev` `game-02-warehouse`), uma trilha por participante — **igual ao limite aprovado**;
  público não ampliado; convidados além do limite: 0.
- **Timestamps:** liberação 2026-08-29T11:34:59Z (aceite agendamento) → atestação
  2026-08-30T00:32:33Z (aceite sessões) — ambos conferidos na API (tabela acima).
- **Canal de suporte/feedback:** moderado em sessão; triagem técnica FPE fora de sessão;
  feedback CEO — documentado no registro e no protocolo.
- **Retirada/abort:** nenhum `withdrawal_requested`, nenhum abort notificado pelo canal da
  coorte; rollback NÃO executado (owner FPE `fa8130d5` documentado na tabela de identidade).
- **Abort conditions:** seção dedicada documentada (recusa/retirada, exposição de dados,
  escrita canônica inesperada, falsa mastery, hint de solução, barreira de acessibilidade,
  sev-3, indisponibilidade) — nenhuma disparada conforme atestação + ausência de sinal
  contrário no thread AID-180 (8 comentários revisados integralmente).

## C2 — Fronteira de evidência (charter §C2): **PASS**

- **PII no git:** varredura regex (e-mails, telefones, padrões de contato/nome) em
  `work-products/AID-180/` — somente datas/IDs técnicos como correspondências; **nenhum dado
  de participante**. Scorecards permanecem no research storage restrito fora do git
  (protocolo AID-142 §3), conforme declarado.
- **Estado canônico intocado:** `sha256(learner/learning_state.yaml)` =
  `c3cae54c452413b75b64f1e97ab6f34fe9d529a8be4b50fdccf861696d230bbf` — idêntico ao hash
  registrado no preflight 2026-08-25 e no snapshot pré-registrado AID-348 (mtime 2026-08-04).
- **Zero commits git na janela** (2026-08-29T11:34Z → 2026-08-30T00:33Z): último commit é
  `19cf3a67` (2026-08-28 22:46 UTC) — nenhuma escrita de qualquer natureza via git durante a
  execução; portanto nenhuma marcação de mastery (critério 6).
- **Nota de ambiente (não-defeito):** `.mavis/learning_state.yaml` aparece modificado no
  checkout compartilhado — diff é exclusivamente a linha `workspace:` (caminho do checkout,
  artefato do harness, mtime 2026-08-29T00:14 UTC, anterior à janela); projeção derivada, não
  escrita canônica. Já registrado como nota no charter AID-348.

## C3 — Continuidade de identidade (charter §C3): **PASS — nenhum re-pin na janela**

Cadeia datada de checagens independentes do manifesto público (`/pilot-bundle-manifest.json`),
todas convergindo para a identidade do GO (AID-313 4/4, AID-258 5/5):

| Quando (UTC) | Fonte | Manifesto SHA-256 | sourceRevision |
| --- | --- | --- | --- |
| 2026-08-29 ~11:35Z | preflight de liberação FPE (thread AID-180) | `fc694824…` | `3f641906…` |
| 2026-08-29 ~15:06Z | **snapshot pré-registrado QA (AID-348), meio da janela** | `fc694824…` | `3f641906…` |
| 2026-08-30 ~00:33Z | re-verificação pós-atestação FPE | `fc694824…` | `3f641906…` |
| **2026-08-30 00:36Z** | **este run (QA, alias E permalink)** | **`fc694824d22e0dbd0def7be6c284ce37d8274342df34e3855eb03c4fc6c7d658`** | **`3f6419063e1dad923317c911227a8b21fcf50ad7`** |

```text
curl https://aidevschool-codexdojo-os.netlify.app/pilot-bundle-manifest.json
  -> 200, sha256 fc694824d22e0dbd0def7be6c284ce37d8274342df34e3855eb03c4fc6c7d658
curl https://6a923bf25bc97ecfacfd3fed--aidevschool-codexdojo-os.netlify.app/pilot-bundle-manifest.json
  -> 200, byte-idêntico ao alias, sourceRevision 3f6419063e1dad923317c911227a8b21fcf50ad7
```

Smoke vivo das superfícies da coorte (alias, 2026-08-30T00:36Z): `/` 200,
`/mission/ai-pratica/l02` 200, `/mission/dev/game-02-warehouse` 200; ponte de verificação com
assinatura exata do GO: `GET /__dojo/bridge/v1/session` same-origin → `200` JSON; sem header →
`403 {"error":"origin-forbidden"}`.

## C4 — Denominadores e recomendação (charter §C4): **CONTINUAR**

Denominadores sem gatilho de pausa: 2/2 sessões atestadas; 0 retiradas; 0 aborts;
0 `technical_failure` não registrada; 0 convites além do limite; identidade estável na janela.

### **RECOMENDAÇÃO EXPLÍCITA: `continuar`** (2026-08-30T00:37Z, QA Lead `ca6a3f95`)

Conforme a rubrica pré-registrada em AID-348: `continuar` exige C1–C3 todos PASS com evidência
datada e denominadores sem gatilho de pausa — condição satisfeita. Nenhum dos gatilhos de
`pausar` (abort acionado, PII no git, escrita canônica durante sessões, falsa mastery, re-pin,
technical_failure impedindo missão) foi observado.

**O que isto libera:** CEO aceitar a confirmação `141d9ac9` (desfecho, critério 5 de AID-180) e
encerrar AID-180 como revisada; os próximos passos seguem seus próprios gates — promoção
AID-323/PR #182 e QA de regressão AID-325 (hoje `blocked` aguardando exatamente esta
recomendação).

**Condições que mantêm a recomendação válida:** qualquer novo deploy/re-pin em produção
invalida o GO vigente e exige nova verificação independente antes de qualquer novo convite;
a coorte permanece no limite aprovado (não reabrir convites); promoção só após os gates
próprios (AID-325).

## Limitações explícitas

1. **n=1 por jornada:** denominadores mínimos por design da coorte controlada; a recomendação
   vale para liberar o próximo lote/gate, não como generalização estatística de qualidade
   (rubrica AID-348).
2. **Execução das sessões:** participantes/scorecards ficam fora do git por protocolo; a
   verificação de "2/2 executadas" repousa sobre a atestação CEO (confirmação `3f4ec900`
   aceita) + consistência do registro + ausência de sinal contrário — não há como QA auditar
   dados de participante sem quebrar o próprio protocolo AID-142.
3. **Identidade na janela:** verificada por cadeia de checagens datadas (liberação, meio da
   janela, pós-atestação, agora) e não por replay contínuo de bytes servidos a cada instante;
   nenhum sinal de re-pin ou deploy intermediário existe no thread, na API ou no manifesto.
4. **Sessão real do participante:** este run não reexecutou as jornadas em browser (já
   verificadas de forma independente no GO AID-313 sobre a mesma identidade byte-a-byte,
   confirmada viva aqui); escopo de AID-366 é a EXECUÇÃO da coorte, não a regressão do
   lote l01–l14 (essa é AID-325).

## Evidências brutas

Comandos e saídas: heartbeat QA 2026-08-30T00:33–00:37Z (curl/git/sha256sum conforme blocos
acima); API Paperclip issues/interactions AID-180 (`/tmp/aid366-qa/` do workspace de execução
QA: `i180_ix.json`, `i180_comments.json`, `issue366.json`).
