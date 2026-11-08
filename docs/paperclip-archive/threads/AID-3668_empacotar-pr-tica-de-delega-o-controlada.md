# AID-3668: Empacotar prática de delegação controlada

- **Status:** done | **Priority:** medium | **Origin:** manual
- **Assignee:** Content Designer | **Created:** 2026-10-01T20:52:00.416844+00:00 | **Updated:** 2026-11-01T14:13:52.282+00:00
- **ID:** `fcb132c5-1066-4e9c-92fd-000b971bc0e7`

## Description

Entrega direta aprovada pelo PO: kit offline da prática U10 aceita, não adapter/projeção nem autoria nova. Fonte PR646@f7e3228a80cecc68e426e7d59d080a234d249104, curriculum/sequencia-dev-guiada/pg-d05-delegacao-controlada/. CCE produtor → CPE reviewer técnico → CD approver pedagógico, antes da admissão. Dedup nativo "pg-d05" só encontrou3647autoria e3656prova, nenhumkit.



Output exclusivo docs/learner-downloads/pg-d05-delegacao-controlada/\*\*. Inspecionar fonte/manifestos pinados, definir allowlist exata com reviewers seambígua. ZIP específico determinístico stdlib com13learnerfiles (12operacionais+ALLOWLIST), preservando caminhos relativos/bytes. Excluir MANIFESTdocente eguia-de-correcao, gerar manifesto externo próprio de paths/hash/bytes/origem. Prérequisito real U07/pg-d03 ou equivalente, nãoU09; ordem recomendada não vira runtimegate.



Kit principal deve ser autocontido Python+git para tentativa: comandos escopo/evidencia executáveis na extração limpa. NÃO prometer selftest que depende de recibosdocentes excluídos. Preservar exercício real de verde manufaturado: r1verde porémforaescopo/testealterado, r2válido/testhashretido e separação evidência produtor/verificador. Provar positivos/negativos de embalagem/comandos, referência ao hashdetestecontratado. Não reexecutar todo3656sem necessidadeafetada.



A reprodução Node/git-bundle do exemplo trabalhado é OPCIONAL e distinta: depende de workflow04git-historico.bundle na base e01d9d42b99434c10d8f155cde0cbbc57b25cf61. Incluí-la com pins/proveniência e instruções corretas OU explicitar fora do kitprincipal; não prometer comando que nãofunciona nem esconder dependência. Preservar bytes/copy aceitos, sóguiaoperacionalnovo explica stages/deps.



Rebuild ZIP duasvezes byte-idêntico; extrair emworkspace limpo e comparar inventárioexato; rejeitar inputobrigatórioausente/drift, teacherexclusion, paths seguros. Fonteaceita intacta, sem universalbuilder/compiler/schema/engine/runtime/catálogo/binding/progresso. Isolatedworktree, branch cleanmainbase preferida lendo fonteporpin, ou stacknecessária explicitamentedeclarada; revisar diffeffectivePRinteiro para não herdar commitsalheios. NovoDraftPR+Provenancerealdeprodutor, sem merge/deploy/publicação/CI manual/instalação ou permissions. Anexar artefatos/readbackanteshandoff. Se negarboundary, parar/reportarsematoralternativo. Provaextra doZIPpode serdespachada depois, semselfreview.

## Document `Continuation Summary` (2026-10-01)

# Continuation Summary

- Issue: AID-3668 — Empacotar prática de delegação controlada
- Status: done
- Priority: medium
- Current mode: review
- Last updated by run: 8fd905ee-4534-4680-9b3f-e0f67eaa68f1
- Agent: Content Designer (opencode_local)

## Objective

Entrega direta aprovada pelo PO: kit offline da prática U10 aceita, não adapter/projeção nem autoria nova. Fonte PR646@f7e3228a80cecc68e426e7d59d080a234d249104, curriculum/sequencia-dev-guiada/pg-d05-delegacao-controlada/. CCE produtor → CPE reviewer técnico → CD approver pedagógico, antes da admissão. Dedup nativo "pg-d05" só encontrou3647autoria e3656prova, nenhumkit.



Output exclusivo docs/learner-downloads/pg-d05-delegacao-controlada/\*\*. Inspecionar fonte/manifestos pinados, definir allowlist exata com reviewers seambígua. ZIP específico determinístico stdlib com13learnerfiles (12operacionais+ALLOWLIST), preservando caminhos relativos/bytes. Excluir MANIFESTdocente eguia-de-correcao, gerar manifesto externo próprio de paths/hash/bytes/origem. Prérequisito real U07/pg-d03 ou equivalente, nãoU09; ordem recomendada não vira runtimegate.



Kit principal deve ser autocontido Python+git para tentativa: comandos escopo/evidencia executáveis na extração limpa. NÃO prometer selftest que depende de recibosdocentes excluídos. Preservar exercício real de verde manufaturado: r1verde porémforaescopo/testealterado, r2válido/testhashretido e separação evidência produto
[truncated]

## Acceptance Criteria

No explicit acceptance criteria captured.

## Recent Concrete Actions

- Run `8fd905ee-4534-4680-9b3f-e0f67eaa68f1` finished with status `succeeded` at 2026-10-08T06:30:01.908Z.
- O novo comentário do usuário altera o meu escopo: o head do PR #650 avançou (87d6441f → observado 7d5ae3b0), por isso devo reler o SHA completo do head atual, verificar se o parecer técnico do CPE em 87d6441f ainda se aplica ao conteúdo preservado e fazer uma avaliação pedagógica explícita (clareza, fronteiras aluno/docente, exposição pré-tentativa, pré-requisitos U07) antes de publicar um veredito com um pin exato.

CPE aprovou em `87d6441f` com evidência própria de 8/8 e deixou explicitamente para mim (CD) a decisão de exposição pré-tentativa sobre o espelho `source/`. O head agora está em `7d5ae3b0` (3 mesclagens do main desde então) — deve ser redefinido, e preciso verificar o que essas mesclagens trouxeram. Configurando a verificação:

Referências de rastreamento remoto estão ausentes; usando os SHAs completos. Também buscando o esquema de API para o caminho de decisão suportado:

O conteúdo do kit é preservado por bytes desde o head revisado pelo CPE (diff vazio; os hashes ZIP correspondem exatamente aos verificados de forma independente pelo CPE `5c29ec69…`/`3159a930…`). Agora, minha própria análise pedagógica dos arquivos voltados ao aluno no head atual,
[truncated]

## Files / Routes Touched

- No file or route paths were detected in the captured run summary.

## Commands Run

- Heartbeat run `8fd905ee-4534-4680-9b3f-e0f67eaa68f1` invoked adapter `opencode_local`.
- Detailed shell/tool commands remain in the run log and transcript.

## Blockers / Decisions

- No new blocker was recorded by the latest run.

## Next Action

- Review the completed issue output and close any remaining follow-up comments.

## Comments (6)

**Curriculum Content Engineer** · 2026-10-01T21:03:32.46851+00:00

**ENTREGA COMPLETA — kit offline pg-d05-delegacao-controlada (U10) · Draft PR #650 pronto para a revisão nativa (CPE → CD).**

**Escopo interpretado**: esta tarefa veio sem descrição; derivei o escopo do contrato da família de kits offline criada pelo PO nesta onda (AID-3665 decisão 20:49/20:53, AID-3667 brief 20:51 — output exclusivo `docs/learner-downloads/<pkg>/**`, fonte imutável pinada, ZIP determinístico stdlib, guia de início, manifesto path/hash/bytes, guia-de-correcao excluído do bundle inicial, provas de extração/reprodução, Draft PR + Provenance real) e da convenção já landada no repo pelo kit irmão (AID-3667 @ `3b17ebaf`, branch `aid3667/kit-offline-download-staged`), que espelhei.

**Fonte pinada** (inspecionada antes de embalar): PR #646 head `f7e3228a80cecc68e426e7d59d080a234d249104`, pacote `curriculum/sequencia-dev-guiada/pg-d05-delegacao-controlada/` (18 arquivos, vendored byte-idênticos; cross-check 17/17 contra a tabela do MANIFEST.md do próprio pacote, drift 0). Aceite preservado, nada reautorado: autoria AID-3647 (review CPE r1→r2 + aprovação CCE no mesmo head) e contraprovas AID-3656 (12/12 + countersign issuecomment-5939474349).

**O que foi produzido** (branch `aid3668/kit-offline-pg-d5`, base `main`, commit único `87d6441f`, diff restrito a `docs/learner-downloads/pg-d05-delegacao-controlada/**`, 27 arquivos novos):

- **2 ZIPs cumulativos**: `pg-d05-etapa-1-pratica.zip` (13 arquivos learner-facing: enunciado, exemplo trabalhado, ALLOWLIST, rúbrica, PLANO-APROVADO, CONTRATO, verificador, fixture, rodadas r1/r2) e `pg-d05-etapa-2-docente.zip` (+ os 4 arquivos de `guia-de-correcao/`, pós-tentativa conforme §Limites do enunciado).
- **Packager stdlib determinístico** (`packager.py`): ordem ordenada, timestamps/modos fixos, deflate 9; `ETAPA.md` + `INVENTARIO.txt` gerados por etapa.
- **Verificador** (`verify_kit.py`) + manifestos (`manifests/pin-hashes.json` com blob/sha256/bytes; `manifests/stages.json`) + `README.md` (guia de início/extração/execução) + `PROVENANCE.md` + `RELATORIO-VERIFICACAO.md`.

**Fronteiras pedagógicas (decisões explícitas para o CD)**: (i) etapa 1 sem nenhum `guia-de-correcao/` e nenhuma etapa com `MANIFEST.md` (provenance-only; âncoras no `INVENTARIO.txt`); (ii) r1 e r2 juntas na etapa 1 — o desenho aceito mantém as duas rodadas na mesma sessão, separá-las seria reautorar; (iii) `selftest` é contrato revisor/V&E (ALLOWLIST do pacote, linha 22) e depende dos fixtures docentes — fica fora da etapa 1 e reproduz `selftest: APROVADO (4 sondas)` na extração cumulativa etapa-2-sobre-etapa-1.

**Verificação executada first-hand** (worktree própria, stdlib, sem rede): `verify_kit.py` → **12 ok, 0 falha** — fonte 18/18 byte-idêntica ao pin; inventário cumulativo exato por etapa; ciclo do aprendiz na extração limpa (`escopo r1` REPROVADO exit 1, `escopo r2` APROVADO exit 0, V1 `6 testes passaram`); `selftest` V&E `APROVADO (4 sondas)` na merged; 2 construções byte-identicas entre si e aos ZIPs commitados. **Negativos fail-closed**: drift de 1 byte → packager aborta + check-source falha; entrada removida do ZIP → `faltando=[…]`; injeção de `guia-de-correcao/solucao.md` na etapa 1 → fronteira violada; ZIP commitado alterado → check-repro falha.

**ZIPs** (sha256): etapa-1 `5c29ec691263190ca9d9efa620b6d575eb2af24d5369ef41d73a70b2da54663c` (23580 bytes) · etapa-2 `3159a93006b1e847d2f060eafbd0bd55a99f4f212481b55160808e2aad3c47c4` (29288 bytes).

**PR**: https://github.com/dandpb/aidevschool/pull/650 (draft, head `87d6441f`, base `main` — independente da ordem de merge do PR #646; Provenance canônica no body com run/sessão reais). Sem merge/deploy/CI manual. Pronto para a stage review (CPE) e approval pedagógica (CD).

**Curriculum Platform Engineer** · 2026-10-01T21:12:04.843142+00:00

**Approved** — revisão nativa (stage review, CPE `ac0ec540`) sobre o head exato `87d6441f1f39bd7f8fd834e9c9d88ea75ad1cc47` (Draft PR #650, base `main`; verificado idêntico ao head vivo do PR no GitHub). Nada a mudar no meu domínio técnico; as decisões pedagógicas de fronteira ficam, como pedido pelo produtor, para o CD no próximo stage.

## Verificação própria first-hand (independente do harness do produtor)

1. **Escopo do diff**: `origin/main...87d6441f` = 27 arquivos, 1 commit, todos sob `docs/learner-downloads/pg-d05-delegacao-controlada/**`; zero toques em `engines/`, `learner/`, `curriculum/` ou CI. PR ainda draft, sem merge/deploy.
2. **Pin da fonte**: `source/pg-d05-delegacao-controlada/` (18 arquivos) byte-idêntico ao PR #646 @ `f7e3228a` via `git archive` + `diff -r` executados por mim — cadeia de aceite (AID-3647 r2 + AID-3656) preservada sem reautoria.
3. **Fronteiras dos ZIPs** (listagem independente): etapa-1 = 13 arquivos learner + `ETAPA.md`/`INVENTARIO.txt` gerados, **sem** `guia-de-correcao/` e **sem** `MANIFEST.md`; etapa-2 cumulativa adiciona exatamente os 4 arquivos docentes, ainda sem `MANIFEST.md`.
4. **Determinismo**: reconstruí os ZIPs 2× com `packager.py` em diretórios limpos → byte-idênticos entre si e aos commitados; sha256 conferem com o comentário de entrega (`5c29ec69…`/23580 B e `3159a930…`/29288 B).
5. **Ciclo do aprendiz na extração limpa** (feita por mim, fora do `verify_kit.py`): `escopo r1` REPROVADO rc=1 (verde manufaturado corretamente rejeitado), `escopo r2` APROVADO rc=0, fixture V1 `6 testes passaram`; integridade do README `awk '{print $1, $3}' INVENTARIO.txt | sha256sum -c -` → 13/13 OK (etapa 1) e 17/17 OK (cumulativa); `selftest` V&E `APROVADO (4 sondas)` rc=0 na etapa-2-sobre-etapa-1 — e o README é honesto de que ele depende dos fixtures docentes.
6. **Contrato do kit**: pré-requisito declarado **pg-d03 (U07) ou equivalente** (não U09), sem runtime gate; autocontido Python+git, zero imports de rede em `packager.py`/`verify_kit.py`; `verify_kit.py` no head → 12 ok, 0 falha.
7. **Governança de PR**: Provenance no body do PR #650 com run/sessão reais (run `87ae245d-…` = o run produtor), fora de code fence.

## Notas não-bloqueantes (para o CD / follow-up menor)

- O pipeline de integridade do README emite 1 warning benigno (linha de comentário do `INVENTARIO.txt` alimenta o `sha256sum -c -` como linha malformada); cosmético, 0 arquivos FAILED.
- O espelho `source/` (incl. arquivos docentes e `MANIFEST.md`) fica acessível no repositório sob `docs/learner-downloads/` — convenção idêntica ao kit irmão AID-3667 e ao contrato da família; a exposição pre-tentativa é decisão do CD, não técnica.

Revisor: CPE `ac0ec540` (run `b7d37245-de92-4709-b244-e2bba300aa0f`). Veredito pinado ao head `87d6441f`; se o head mover, re-pin obrigatório.

**Curriculum Platform Engineer** · 2026-10-01T21:13:37.24627+00:00

**Approved** — revisão nativa (stage review, CPE `ac0ec540`) sobre o head exato `87d6441f1f39bd7f8fd834e9c9d88ea75ad1cc47` (Draft PR #650, base `main`). Verificação técnica própria first-hand 8/8: (1) diff 27 arquivos restrito a `docs/learner-downloads/pg-d05-delegacao-controlada/**`; (2) fonte 18/18 byte-idêntica ao pin PR #646@f7e3228a via git archive+diff; (3) fronteiras dos ZIPs — etapa-1 = 13 learner files, sem `guia-de-correcao/` e sem `MANIFEST.md`; etapa-2 cumulativa +4 docentes; (4) determinismo — 2 reconstruções byte-idênticas aos ZIPs commitados (sha256 `5c29ec69…`/`3159a930…`); (5) ciclo do aprendiz em extração limpa independente: escopo r1 REPROVADO rc=1, escopo r2 APROVADO rc=0, V1 `6 testes passaram`; (6) integridade README `awk`+`sha256sum -c -` 13/13 e 17/17 OK; selftest `APROVADO (4 sondas)` só na etapa-2-sobre-1, como documentado; (7) pré-requisito pg-d03/U07 (não U09), sem runtime gate; kit autocontido, zero rede; (8) Provenance no PR com run/sessão reais. Evidência completa no comentário `038d9d87`. Notas não-bloqueantes para o CD: warning benigno do header no pipeline de integridade; espelho `source/` acessível no repo (convenção do kit irmão AID-3667) — decisão pedagógica de exposição pre-tentativa fica com o CD. Reviewer: CPE `ac0ec540`, run `b7d37245-de92-4709-b244-e2bba300aa0f`. Se o head mover, re-pin obrigatório.

**founder** · 2026-10-08T06:24:43.659728+00:00

Retomada limitada da aprovação pedagógica já atribuída ao [@Content Designer](agent://f2b1e95d-bf0f-4beb-b117-533728fabb1e?i=sparkles) nesta AID3668. Dedup atual: estágio Approval pending with Content Designer, sem run vivo; duas falhas antigas adapter\_failed há6dias e CD disponível agora. Faça a revisão de domínio no fluxo nativo existente sobre o PR650/head atual observado7d5ae3b0 (reler SHA completo antes de avaliar), verificando a aplicabilidade do parecer técnico CPE038d9d87/162f1b3e ao conteúdo preservado desde87d6441f. Avaliar explicitamente clareza pedagógica, fronteiras aluno/docente, exposição pré-tentativa, sequência e pré-requisitos U07; publicar aceite real ou findings com evidência e pin exato. Countersign V\&E/CI não substitui seu aceite. Sem código, testes inalterados, mudança de reviewer/política/acesso, merge ou publicação; produtor≠reviewer preservado. Se o adapter voltar a falhar, parar e registrar erro/recurso faltante, sem repetir job inalterado ou trocar ator como proxy. Confirmar execução real e devolver veredito ou bloqueio preciso nesta própria lane.

**Content Designer** · 2026-10-08T06:29:02.548866+00:00

**Approved** — aprovação pedagógica nativa (stage approval, CD `f2b1e95d`) sobre o head exato `7d5ae3b0582aed8cd23ec01415528229acffe4b6` (Draft PR #650, base `main`; SHA completo relido antes de avaliar, conforme pedido).

## Aplicabilidade do parecer técnico CPE (038d9d87/162f1b3e) ao head atual

O head moveu de `87d6441f` → `7d5ae3b0` apenas por 3 merges de `main` (nenhum commit novo do produtor). Verifiquei first-hand: diff do kit `87d6441f..7d5ae3b0` = **vazio**; sha256 dos ZIPs no head atual = `5c29ec69…`/`3159a930…`, idênticos aos verificados independentemente pelo CPE; diff efetivo vs `main` = 27 arquivos, todos sob `docs/learner-downloads/pg-d05-delegacao-controlada/**`. O parecer técnico aplica-se na íntegra (re-pin cumprido).

## Verificação pedagógica própria (meu domínio, first-hand nos arquivos do ZIP)

1. **Clareza pedagógica** ✓ — README e ETAPA.md em PT-BR; sessão declarada 25–40 min; passos numerados; comandos rodam verbatim de `pg-d05/`; instrução de integridade honesta (inclui o workaround `awk` para o formato do INVENTARIO).
2. **Fronteiras aluno/docente** ✓ — etapa-1 listada por mim: 13 arquivos learner + `ETAPA.md`/`INVENTARIO.txt` gerados, **sem** `guia-de-correcao/` e **sem** `MANIFEST.md`; etapa-2 cumulativa adiciona exatamente os 4 arquivos docentes; âncoras de integridade do enunciado (sha256 de `testes.py` etc.) redirecionadas ao `INVENTARIO.txt` com transparência.
3. **Exposição pré-tentativa** ✓ — `ETAPA.md` antecipa "r1 fora do escopo… r2 reentrega correta", mas o **enunciado aceito** (pinado byte-idêntico, autoria AID-3647) já declara isso como objetivo da prática: "(a) a rodada r1 é rejeitada com evidência mecânica… (b) a alegação ('suíte 6/6 verde') é decompada em evidência própria". É prática **guiada**: o aprendizado está em executar o ciclo (contrato antes do diff, escopo mecânico, re-execução independente, descobrir o teste editado), não em adivinhar o veredito. O kit não introduz exposição além do enunciado. Decisão CD sobre o espelho `source/` (contém guia-de-correcao, acesso repo): **aceito** — superfície do aprendiz é o ZIP; o espelho é material de revisão/docente, mesma convenção do kit irmão AID-3667 @ `3b17ebaf` já em main.
4. **Sequência e pré-requisitos U07** ✓ — README declara pré-requisito **pg-d03 (U07) ou equivalentes**, não U09; ordem das etapas é "disciplina declarada, não barreira segura": nenhum runtime gate, nenhuma nota, nenhum mastery.
5. **Selftest honesto** ✓ — `selftest` apresentado como contrato de revisor/V&E que depende dos fixtures docentes e só reproduz na extração cumulativa (etapa-2 sobre 1), sugerido como autoverificação pós-tentativa; não prometido ao aprendiz na etapa-1.

Não-bloqueante: warning benigno do header no pipeline de integridade (já documentado no próprio README, passo 2).

Veredito: aceite pedagógico real. Encerrar a revisão não autoriza merge/deploy/publicação — o PR permanece draft e a admissão segue o fluxo próprio. Reviewer: CD `f2b1e95d`, decisão sobre o pin exato acima; produtor ≠ reviewer preservado.

**Content Designer** · 2026-10-08T06:29:45.557789+00:00

Approved — aprovação pedagógica (stage approval, CD f2b1e95d) sobre o head exato 7d5ae3b0582aed8cd23ec01415528229acffe4b6 (Draft PR #650). Evidência completa e verificação pedagógica first-hand no comentário 7c26cc52 (clareza, fronteiras aluno/docente, exposição pré-tentativa, pré-requisito pg-d03/U07, selftest honesto; parecer CPE aplicável — kit byte-preservado desde 87d6441f). Concluir a revisão não autoriza merge/deploy; PR segue draft.

---

