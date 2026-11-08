<!-- issue: AID-1219 | key: onda-w1-conteudo | doc_id: dc8723d3-8739-4bcd-a382-582dbbc5e1c5 | updated: 2026-09-10 08:58:32.373+00 -->

# AID-1219 — W1 "Rotina com IA II": conteúdo T1–T3 (drafts spec-grade) + brief landing FPE + checklist QA

(AID-1219)

# AID-1219 — W1 "Rotina com IA II" (l30–l32): conteúdo T1–T3 (drafts spec-grade) + brief de landing + checklist QA

**Status:** AUTORIA CD COMPLETA (drafts prontos para o FPE produzir os PRs de lição — batch production AID-471/AID-426). Produção/aguardo: T0 confirmada e mergeada primeiro (card de confirmação no issue). Nenhuma escrita canônica pelo CD.
**Owner:** Content Designer. **Baseline:** `origin/main` @ `e839d0fc` (CI 36/36), catálogo 29/29 `ready`, contrato vigente sem exceções.
**Contrato de conteúdo (7 tipos determinísticos, `lNN-aM`, feedback `onFailure`+`onSuccess`+`perCheck`, hints 1–3, `structured_only`, evidence v1 `verifierRequired`, review [1,7,21], `minimumScore 0.75` todas obrigatórias, rubric 3×weight 1, version 1, pt-BR, vendor-neutral): verificado 100% nos drafts — `validate.py` verde com as 3 lições `ready` em scratch (32/32), read model e corpus do verificador regenerados, catálogo de missões 39 missões com ai-pratica ch 1–23 contíguo e dev ch 1–16 intacto (append de bindings testado via `learner/substrate/mission_catalog.py`).

---

## 1. As 3 lições (mapa)

| id | título | min | skills | prereq canônico | atividades (a1/a2/a3) | rubric |
| --- | --- | --- | --- | --- | --- | --- |
| l30 | Rotinas repetitivas: o que automatizar | 4 | pedir, aplicar | [l18] | choice multiSelect · prompt_builder · output_comparison | r-identifica-candidata · r-parametriza-o-pedido · r-mantem-controle-humano |
| l31 | Pequenas automações: onde o humano valida | 4 | avaliar, proteger | [l12] | safety_classification · missing_context · sort | r-classifica-a-saida · r-nomea-o-que-falta · r-sequencia-a-adocao |
| l32 | Quando a automação erra | 3 | avaliar | [l19] | choice · output_comparison · missing_context | r-detecta-o-desvio · r-aplica-correcao-minima · r-repoem-o-contexto |

Diversidade de tipos na onda: choice×2, prompt_builder×1, output_comparison×2, missing_context×2, safety_classification×1, sort×1 — 6 tipos provados, nenhum dominando (mesma distribuição de C1–C3/mod-07/mod-05; `rubric_review` sem fit temático aqui, maduro para onda futura). Ritmo Duolingo-like preservado: micro-lições 3–4 min, +3 missões alimentam as janelas de revisão espaçada [1,7,21].

## 2. Notas de design (evidência → decisão)

- **Âncoras canônicas, não sequenciais** ([l18]/[l12]/[l19], padrão mod-06/07): l30 herda o pedido-padrão da l18 (a1 usa o mesmo cenário do relatório semanal; a2 é o prompt_builder descendente direto de l18-a1 com o campo variável explícito `dado-que-muda`); l31 estende a regra de sensibilidade da l12 para **dentro** da rotina (labels reescritas como uso-direto vs checagem-obrigatória — mesma regra, novo endereço); l32 reusa o padrão de l19 (detectar contexto perdido → correção mínima) no endereço da rotina (degradação silenciosa). Coerência inter-trilhas: os ecos dev de l31/l32 estão registrados no arco W2 (l34 checkpoints humanos, l35 verificação não-determinística — data-gated, fora desta onda).
- **Condicionantes anti-R6 do case UX §3.2 (herdadas da AID-528 rev 1 §5):** âncora em rotinas já ensinadas (nada de "agentes mágicos"), julgamento humano explícito em toda atividade (a3 de l30 é a rejeição do envio cego; a1 de l31 é o mapa do onde-valida; a1 de l32 ensina que o erro silencioso é o perigoso), zero vendor (grep negativo executado).
- **Anti-R1 (expectativa de automação real):** l30-a2/a3 usam copy honesta ("Neste exercício você não roda automação nenhuma — você monta o pedido-padrão por campos rotulados, como faria na ferramenta real ao criar a rotina") — padrão mod-07 de simulação textual.
- **Critérios observáveis** (critério de conclusão por lição, spec AID-1214 §3.1): l30 a1 pontua por opção (5 checks: ≥2 de 3 candidatas + ≥2 de 2 não-candidatas = 4/5 = 0,8 ≥ 0,75); l31 a1 (6 itens: ≥5 de 6 = 0,83 ≥ 0,75) + a3 sequência completa; l32 sinal-correto no cenário âncora + pedido de correção com "o que mudou" + "regra vigente".
- **Ids de feedback/perCheck** referenciam apenas ids de `data` (validador verde).

## 3. Brief de landing FPE (PR único de bindings + promoção única — não por lição)

1. **Arquivos de lição** (drafts anexados; colocar em `curriculum/ai-literacy/modules/08-rotina-com-ia-ii/`): `l30-rotinas-repetitivas.yaml`, `l31-pequenas-automacoes.yaml`, `l32-quando-a-automacao-erra.yaml` — conteúdo pronto, `version: 1`; flip `planned→ready` das 3 entradas no `catalog.yaml` acompanha cada arquivo (ou os 3 no PR único da onda, conforme o padrão batch AID-471).
2. **Bindings (append ao final do bloco `bindings` de `mission-bindings.yaml`)** — por lição, no padrão literal do mod-07:

```yaml
  - missionId: l30
    chapterOrder: 21
    prerequisites: [l18]
    trackId: ai-pratica
    curriculum:
      kind: ai-literacy-lesson
      lessonId: l30
      projectId: 00_ai_in_practice
      unitId: ai-literacy:l30
    runtime:
      engineId: literacyDojo
      entrypoint: http://127.0.0.1:5178/?hosted=1
      environmentKey: VITE_LITERACYDOJO_URL
      protocolVersion: "1.0"
      contentVersion: "<versão vigente no merge>"
    evidence:
      schema: literacy-evidence
      version: 1
      verifierRequired: true
    fallback:
      kind: dom
      summary: "Decida quais tarefas repetitivas viram rotina assistida e monte o pedido-padrao com o dado que muda por controles rotulados."
```
   (l31: `chapterOrder: 22`, `prerequisites: [l12]`, `unitId: ai-literacy:l31`, fallback "Classifique saidas de automacao entre uso direto e checagem obrigatoria e ordene a adocao segura por controles rotulados." · l32: `chapterOrder: 23`, `prerequisites: [l19]`, `unitId: ai-literacy:l32`, fallback "Detecte a rotina automatizada degradada e monte a correcao minima que repoe o contexto por controles rotulados.")
3. **contentVersion — descoberta first-hand (delta vs AID-528 rev 3 §3(D)):** `learner/substrate/mission_catalog_bindings.py:100-140` exige que **todo** binding `ai-literacy-lesson` declare `runtime.contentVersion` **igual ao catálogo canônico** ("the hosted literacyDojo engine serves exactly that version"). Logo o PR de landing da onda deve bumpar `runtime.contentVersion` dos **20 bindings ia_pratica existentes** (l01–l14, l18–l20, l24–l26) + os 3 novos + `tracks[ai-pratica].contentVersion` (bump único viajando com o primeiro binding da onda; dev não muda de versão de conteúdo, mas `tracks[dev]` permanece apontando para a própria — conferir igualdade exigida por `validate_tracks` só para ai-pratica). Verificado com append simulado: catálogo de missões 39, ai-pratica ch 1–23 contíguo, prereq identity preservada, sem ciclos.
4. **Fixtures de content wave** com trailer `SDLC-ALLOW-TEST-EDIT: AID-<n>` (política AID-554); nenhum teste existente editado sem trailer.
5. **Promoção única** ao fim da onda (pins/alias/permalink + rollback owner + precheck estendido: motor hosted das 3 lições, contentVersion, mapa 36→39, contagens ia_pratica 23). Nenhum deploy intermediário com lição parcial. Registro `_work-products/AID-1216/WAVE-PROMOTION-<pin>.md` + comentário de landing por tarefa neste issue.
6. **Ordem de produção:** T0 merge → l30 → l31 → l32 (merges em ordem de chapterOrder 21→22→23 para evitar rebases de `contentVersion`) → promoção única → QA wave-level.

## 4. Checklist QA wave-level (produtor ≠ verificador — QA Lead ca6a3f95)

1. Contrato: 7 tipos determinísticos, ids estáveis `lNN-aM`, `onFailure`+`onSuccess`+`perCheck`, hints 1–3, `structured_only`, evidence v1 `verifierRequired: true`, review [1,7,21], `minimumScore 0.75` com todas em `requiredActivityIds`, rubric 3 critérios weight 1, `version: 1`.
2. `validate.py` + `gen:content` + CI verdes; read model: mod-08 real (l30–l32 `ready`), contagens 23/9; mapa OS 39 missões, ai-pratica 1–23 contíguo, entrada `l02` intacta, dev intacto.
3. Vendor-neutral: grep de nomes de produto IA nos 3 YAML (executado pelo CD: negativo).
4. A11y (teclado/ARIA/`aria-live`/reflow@320) nos 3 fluxos hosted + fallbacks DOM.
5. Português/leitura simples; nenhuma lição existente editada (diff do PR de lições = 3 arquivos novos + flips `planned→ready`).
6. Evidência: verificador independente consome corpus regenerado (`--compile-verifier`).

## 5. Verificação executada (método)

Clone scratch @ `e839d0fc` (árvore de trabalho canônica intocada): T0 aplicada → `validate.py` OK (29+3 planned; read model mod-08 "em breve"); lições instaladas em `modules/08-rotina-com-ia-ii/` + flips `ready` → `validate.py --compile --compile-verifier` OK (32/32: 23 IA na Prática + 9 Dev); bindings ch 21/22/23 + bump de contentVersion simulados → `load_mission_catalog` OK (39 missões, contiguidade e prereq identity verdes). YAMLs dos drafts: parse + contagens (3 atividades, hints 3 cada, rubric 3, required = todas). Eficácia pedagógica **não presumida** — teste moderado UX e funil são os instrumentos.

## 6. Arquivos de trabalho (work products deste issue)

- `wp-t0-diff` — `t0-emenda-AID-1219.patch` (135 linhas, aplicável ao `e839d0fc`).
- `wp-w1-lessons` — `l30-rotinas-repetitivas.yaml`, `l31-pequenas-automacoes.yaml`, `l32-quando-a-automacao-erra.yaml` (drafts completos, validados). O conteúdo integral dos 3 YAMLs também está publicado no doc `w1-yaml-drafts` deste issue (redundância de acesso, board-visível).

## 7. Decisões reservadas (não tomadas aqui)

1. **Aceite da emenda T0** — CEO (card `request_confirmation` neste issue; texto literal no doc `t0-emenda`).
2. **Produção/landing/promoção** — FPE (fa8130d5), gates §3.
3. **GO/NO-GO QA e re-grant** — QA Lead (ca6a3f95).
4. **Eficácia pedagógica e prioridade de l33+** — UX com evidência de coorte/funil (W2 data-gated §5 do arco).
