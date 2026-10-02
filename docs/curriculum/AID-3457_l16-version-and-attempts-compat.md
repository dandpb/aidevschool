# AID-3457 — Contrato explícito de versão e compatibilidade de tentativas/progresso para o ajuste l16 (apoio ao FPE, integração PR #610)

**Escopo:** apoio contratual à correção em andamento no PR #610 (head `8be20045`) — CI real
falhou em l16/l16-a2 (bridge: `deterministicChecks` do produtor não coincide com a
recomputação independente) e a revisão apontou **`version` 3 sem bump após mudança de
critério**. Este documento NÃO toca a branch do FPE; fixa o contrato que a correção deve
seguir — sem mudar menos e sem verificar menos. PRs #611/#612 permanecem congelados
(esta análise é separada e pertence à integração de conteúdo #610).

## 1. Estado first-hand (base main `1975e2c7` + patch do PR #610 @ `8be20045`)

- `l16-primeiro-codigo-com-assistente.yaml` está em `version: 3`; o patch do PR #610 muda
  critérios/vereditos de `l16-a2` (rubric_review) — `c-redact` **dividido** em
  `c-redact-shape` (met) + `c-redact-runtime` (not_met), textos de `c-erros` e vereditos
  reescritos — **sem bump de `version`** (nenhuma linha `version:` no patch).
- Regra violada: `content-contract.md` regra 3 ("Toda alteração de conteúdo incrementa
  `version` da lição") e, em cadeia, o acoplamento de `contentVersion` (doc AID-3457 §2.4).

## 2. Contrato de versão (o que a correção deve fazer)

1. **Bump `version` 3 → 4 em l16** no mesmo change que muda os critérios (regra 3). Não há
   "mudança cosmética de critério": textos de critério e `expectedVerdicts` são conteúdo
   avaliado — veredito e feedback alimentam verificador e corpus.
2. **Bump único de `contentVersion` do catálogo** propagado nos lugares acoplados
   (mission-bindings: tracks `ai-pratica`+`dev` e `runtime.contentVersion` dos 32 bindings
   de lição) + `gen:content` + `python3 -m learner.substrate` — doc AID-3457 §2.4 (achado F-2).
3. **Bridge (deterministicChecks):** produtor e corpus devem ser gerados da **mesma versão**
   de conteúdo. A vereditos declarados (`expectedVerdicts`) têm que coincidir com a
   recomputação independente a partir do mesmo YAML — qualquer divergência é conteúdo
   inconsistente, não flake. O mesmo change que altera critérios deve regenerar o corpus do
   verificador e atualizar o teste bridge (fail no CI é o comportamento correto até isso).

## 3. Compatibilidade de tentativas/progresso antigos (o que NÃO pode quebrar)

Regra 4 do `content-contract.md`, aplicada ao caso l16:

| Objeto | Regra na correção |
| --- | --- |
| `id` da lição (`l16`) / atividade (`l16-a1`, `l16-a2`) | **imutáveis** — id novo = lição nova, sem migração automática |
| `completed` já registrado (v3) | **permanece válido** para progresso/experiência; nada vira não-completed |
| Tentativas/evidências históricas (check `c-redact`, v3) | **não reprocessadas**: evidência é trilha de auditoria; `deterministicChecks` antigo continua verdadeiro **para a versão em que foi emitido** (receipt pinha `lesson_version`) |
| Próxima revisão espaçada de l16 | usa a **versão nova (4)** |
| `LearnerProgress.schemaVersion` | migração forward-only antes de ler estado antigo; nenhum rewrite retroativo |
| Estado do learner (`ai-literacy:l16`, missão `l16`) | intocado; nada vira `mastered` por mudança de conteúdo |

**Implicação para o bridge:** a recomputação independente de tentativas **antigas** usa o
YAML **da versão gravada na tentativa** (v3, critério `c-redact`), não o YAML novo.
Tentativas novas usam v4 (`c-redact-shape`/`c-redact-runtime`). O contraste de versões é o
que torna o `deterministicChecks` histórico verificável — recomputar tentativa v3 contra
critérios v4 produz mismatch espúrio (a classe exata da falha atual se o corpus/bridge
misturar versões).

## 4. Checklist para o PR de correção do FPE

1. `version: 4` em l16 (mesmo commit dos critérios novos).
2. `contentVersion` do catálogo bumpado e propagado (tracks + 32 runtime bindings).
3. Corpus do verificador regenerado da mesma versão; teste bridge verde com recomputação
   independente de v4; tentativas v3 continuam verificáveis contra v3.
4. IDs/estado do learner preservados (tabela §3); `completed` mantido; revisão espaçada
   aponta para v4.
5. CI real no head novo (mesmo rigor da revisão: Python + literacyDojo + bridge).

— Produzido pelo Curriculum Platform Engineer a pedido da revisão f9571e42; análise em
branch isolada, sem tocar a branch do FPE e sem alterar PRs congelados.
