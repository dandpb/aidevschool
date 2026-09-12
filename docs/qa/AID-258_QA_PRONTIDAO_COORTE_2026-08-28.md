# AID-258 — QA independente da prontidão da coorte (pós-AID-256)

**Data:** 2026-08-28 UTC  
**QA independente:** `ca6a3f95-8572-43f4-822a-6b40b9bdb63b` (contexto separado do produtor)  
**Disposição:** **PRONTIDÃO TÉCNICA E DOCUMENTAL VERIFICADA (verde em todos os checks executáveis); emissão formal do GO/NO-GO permanece condicionada à finalização de AID-257/AID-142** (sequência determinada pelo CEO).

## Escopo

Verificar em contexto independente, após AID-256 (done) e na pendência de AID-257 (blocked): (1) que
AID-180 aponta exclusivamente para a revisão aprovada em AID-254; (2) que o protocolo final de
AID-142 limita público e dados; (3) que rollback owner, legais, suporte e abort conditions estão
operacionais. Sem convites, sem correção de defeitos, sem escrita em `learner/`/`.mavis/`.

## Charters e evidência executável

Ambiente: Linux x86_64; curl 8.x; rede pública para Netlify; todos os comandos abaixo executados
em 2026-08-28 UTC a partir do workspace do QA (leitura apenas).

### QA1 — Identidade publicada vs. aprovada (Sev-1)

```text
curl -fsSL https://aidevschool-codexdojo-os.netlify.app/pilot-bundle-manifest.json | sha256sum
ddf404d93468bcf0cea776b080990774cd2b68566aa163b60d2b5f682c7fc6b7   == AID-253/AID-256/AID-254 PASS

curl -fsSL https://6a9141bc5ac75e6a300cc00e--aidevschool-codexdojo-os.netlify.app/pilot-bundle-manifest.json | sha256sum
ddf404d93468bcf0cea776b080990774cd2b68566aa163b60d2b5f682c7fc6b7   permalink == alias PASS

manifest JSON: sourceRevision = ec265fab13ac98700e9de58b5d719d55d979178d          PASS
```

Commit imutável existente na object store canônica do projeto (`_default/.git`):

```text
git cat-file -t ec265fab13ac98700e9de58b5d719d55d979178d  -> commit
git show -s --format='%H %T' -> ec265fab... tree=89a4cc24eb3812521236af26a6d4bd7ff0447f43
tree confere com AID-253/AID-254/AID-256                                                       PASS
```

### QA2 — Correlação de superfícies publicadas (Sev-1)

HTTP 200 e SHA-256 idênticos ao manifesto para 7/7 superfícies verificadas no alias canônico:

| Superfície | SHA-256 (observado = manifesto) |
| --- | --- |
| `/` (OS) | `3919eb19e52c418f58965ea67b3ec2d2b0185e859139bd0cb5f29d1c8ceface4` |
| `/apps/literacydojo/index.html` | `ccc53b8f9852079bd64c51cae20d6bf24d0e4561a8f2ccc0917b8414e785c185` |
| `/apps/literacydojo/sw.js` | `520c1205d666a51b2120dc3f07ce3b774510242dd03e547122ed4313e1ec06e4` |
| `/apps/literacydojo/termos.html` | `385d87d6c123385137dee041abe6f9904b193ad19811cc71e45c7399a6763b12` |
| `/apps/literacydojo/privacidade.html` | `27fe5a37e1aff970029adcd348cb32c0597b1fb3bee5ba4c5eada235b42cd487` |
| `/apps/warehouse/index.html` | `43d9a8b56d17c447f0322c4a3f7431e40c2d0548d7cafd4af8f85f62db77b9a6` |
| `/apps/wormhole/index.html` | `dd8c0311bacb0e00cf3a24ebff03da4fde70609db6708db5b070bbfa353ba1bc` |
| `/apps/relay-station/index.html` | `fbc0e96ae613d02c3e20de31d3c4dd3d60ab9c27157cc49e4a5b99988c3507c5` |

Páginas legais publicadas são byte-a-byte idênticas às auditadas na identidade anterior
(AID-180: `385d87d6…` termos, `27fe5a37…` privacidade). Nota: `termos.html`/`privacidade.html`
na raiz do alias retornam o index do OS (fallback SPA), não páginas legais; o caminho canônico
vigente é `apps/literacydojo/`. Permalink LiteracyDojo legado (`6a8ddc9afe…`) respondeu 200
(auditoria apenas; não faz parte da identidade da coorte).

### QA3 — Integridade do learner (Sev-1)

```text
sha256(501cb456/aidevschool/learner/learning_state.yaml)
= c3cae54c452413b75b64f1e97ab6f34fe9d529a8be4b50fdccf861696d230bbf   == AID-180/AID-254 PASS
mtime 2026-08-04 — intocado desde antes dos preflights; .mavis/learning_state.yaml cdab3318…
```

Preservado; nenhum teste desta verificação escreveu em `learner/` ou `.mavis/`. Workspaces de
desenvolvimento de outros agentes (`fa8130d5`, `0bfa47c1`) contêm cópias divergentes
(`36419ae4…`) com mtime 2026-08-21 — não são a fonte da identidade do piloto e não afetam o gate.

### QA4 — Protocolo AID-142 v1: público e dados (Sev-1, documental)

Revisão direta do work product `work-products/AID-142/FIRST_PILOT_FEEDBACK_PROTOCOL.md`
(v1, `confirmation:AID-142:first-pilot-protocol:v1`): limite exato de 2 sessões (1 `IA Prática`
`l02` + 1 `Trilha Dev` `game-02-warehouse`, §2); consentimento literal com retirada a qualquer
momento e canal pelo código de sessão (§§3–4, §7); allowlist de eventos/campos sem resposta,
prompt, texto livre, PII, IP, UA ou identificadores (§6); armazenamento restrito fora do git com
exclusão em 30 dias (§9); sem claim de eficácia ou mastery (§§1–2, §8). Confere com o checklist
§10 aprovado na revisão executiva do CEO (`/paperclip/aid142_ceo_review.json`: escopo 1+1,
papeis nomeados — moderador `0bfa47c1`, revisor independente QA Lead `ca6a3f95`, armazenamento
restrito `fa8130d5`; retenção 30 dias; nenhum convite pré-aprovação).

### QA5 — Gate operacional de AID-180 (Sev-2, documental)

`work-products/AID-180/INITIAL_CONTROLLED_COHORT.md` aponta exclusivamente para a identidade
aprovada (`ec265fab`/`6a9141bc`/`ddf404d9`); identidades AID-178/AID-219 e NO-GOs anteriores
estão históricas, sem reuso. Rollback owner (`fa8130d5`) e procedimento (republicar deploy
anterior pelo histórico Netlify + interromper convites) definidos. Suporte técnico triado pelo
Founding Product Engineer; feedback do piloto pelo CEO; retirada pelo código da sessão. Abort
conditions cobrem consentimento, dados, escrita canônica, falsa mastery, hint revelador,
acessibilidade sev-3 e indisponibilidade. Participantes convidados: 0 (consistente com o estado
observado; verificação negativa não é executável).

## Resultado consolidado

| Charter | Resultado |
| --- | --- |
| QA1 identidade publicada | PASS |
| QA2 correlação de superfícies | PASS (8/8 arquivos, 7/7 superfícies) |
| QA3 integridade do learner | PASS (preservado) |
| QA4 protocolo limita público/dados | PASS |
| QA5 gate operacional/rollback/suporte/abort | PASS |

Nenhum defeito Sev-1/Sev-2 encontrado no escopo. Nenhuma alteração em produto, learner ou
convites.

## Limitações explícitas

- Jornadas em browser não foram reexecutadas neste heartbeat: o manifesto publicado é
  byte-a-byte o mesmo smoked 6/6+6/6 por AID-254 (independente) neste deploy; este runner segue
  sem dependências de browser (AID-32). Um novo deploy invalida esta leitura.
- Aceite do CEO existe como revisão executiva em `/paperclip/aid142_ceo_review.json`, mas a
  `request_confirmation` `35fd67c0…` ainda consta `pending` na API — discrepância de registro a
  resolver na finalização de AID-257/AID-142.
- A emissão formal do GO/NO-GO da coorte aguarda AID-257 done, conforme sequência do CEO
  ("AID-257 finaliza o gate e marca AID-142 done; AID-258 emite GO/NO-GO").
