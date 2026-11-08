<!-- issue: AID-1219 | key: t0-emenda | doc_id: 9b7e19a4-cb99-473c-beee-d3a0fec4c66d | updated: 2026-09-10 08:58:32.328+00 -->

# AID-1219 — T0: emenda board-gated W1 mod-08 (l30–l32) — texto literal + verificação first-hand

(AID-1219)

# AID-1219 — T0: emenda de contrato board-gated (W1 mod-08 "Rotina com IA II", ids l30–l32)

**Status:** EMENDA PUBLICADA para confirmação do CEO (card `request_confirmation` neste issue; regra 7 do content-contract). **Nenhuma escrita canônica foi feita** — o diff abaixo foi montado e verificado num clone scratch de `origin/main` @ `e839d0fc`; o merge é do FPE, somente após aceite.
**Owner:** Content Designer (f2b1e95d). Dispatch CEO AID-1216 decisão `3 ACEITAR` → BUILD AID-1219/B2.
**Fonte dos ids/conteúdo:** AID-528 rev 1 §5 (briefs spec-grade do candidato (a), board-vistos, nunca produzidos — ressurreição com re-id mecânico l21–l23→l30–l32) via AID-1214 doc `arco-proposta` §3.1 (triagem SM AID-1215 §1 item 4: CONFORME). Precedentes de emenda: PR #199 (C1–C3), PR #221 (l21–l23), `016b3b8a` (l24–l26), `09a25019` (l27–l29).

---

## 0. Verificação executada first-hand (clone scratch @ `e839d0fc`, árvore canônica intocada)

- `python3 curriculum/ai-literacy/tools/validate.py` → **OK: 29 ready (20 IA na Prática + 9 Dev); 3 planned** (l30–l32, sem arquivo exigido — regra 5).
- `validate.py --compile` → read model gerado com **mod-08 "Rotina com IA II"** (`order: 8`, `journey: ia_pratica`) e l30/l31/l32 `planned` com `hasContent: false` ⇒ standalone LiteracyDojo exibe o módulo 8 público "em breve". Zero mudança de comportamento em runtime; 0 migração de estado.
- `validate.py --compile-verifier` → corpus do verificador regenera limpo.
- `contentVersion` "2026-09-06.1" → **"2026-09-10.1"** no diff (bump `YYYY-MM-DD.N` na data do merge — o FPE ajusta se o merge cair em outra data).
- `mission-bindings.yaml` **intocado** na T0 (só nas tarefas de produção T1–T3; §3 do doc `onda-w1-conteudo`).
- âncoras de prereq re-verificadas `ready` no main: **l18, l12, l19** (T1–T3 paralelizáveis — todos os prereqs são canônicos pré-existentes).

## 1. Diff literal — `curriculum/ai-literacy/catalog.yaml`

1. Cabeçalho (comentário): "20 lições públicas de IA na Prática (l01–l14 + ondas de continuação l18–l20 e l24–l26) e 9 lições da trilha Dev," → "23 lições públicas de IA na Prática (l01–l14 + ondas de continuação l18–l20, l24–l26 e l30–l32) e 9 lições da trilha Dev,". O 9 da trilha Dev **não** muda.
2. `contentVersion: "2026-09-06.1"` → `"2026-09-10.1"` (data do merge).
3. Novo módulo (após mod-07, no bloco `modules`):

```yaml
  - id: mod-08
    slug: 08-rotina-com-ia-ii
    title: "Rotina com IA II"
    order: 8
    journey: ia_pratica
    skillIds: [pedir, avaliar, aplicar]
```

4. Três entradas `planned` ao final do bloco `lessons` (literais):

```yaml
  # Módulo 8 — Rotina com IA II (onda l30–l32, spec AID-1219 doc t0-emenda;
  # briefs AID-528 rev 1 §5 ressuscitados com re-id, AID-1214 §3.1)
  - id: l30
    moduleId: mod-08
    title: "Rotinas repetitivas: o que automatizar"
    objective: "Distinguir tarefas do próprio trabalho que valem virar rotina assistida (repetitiva + estruturada + baixo risco) das que exigem julgamento humano a cada vez, e parametrizar o pedido-padrão da tarefa escolhida."
    estimatedMinutes: 4
    prerequisites: [l18]
    skillIds: [pedir, aplicar]
    status: planned
  - id: l31
    moduleId: mod-08
    title: "Pequenas automações: onde o humano valida"
    objective: "Classificar saídas de automação entre uso direto e checagem obrigatória, nomear o que falta em um pedido de automação (gatilho, limite de escala) e sequenciar a adoção segura."
    estimatedMinutes: 4
    prerequisites: [l12]
    skillIds: [avaliar, proteger]
    status: planned
  - id: l32
    moduleId: mod-08
    title: "Quando a automação erra"
    objective: "Detectar que uma rotina automatizada degradou (saída coerente com a semana anterior mas errada para esta), aplicar a correção mínima no pedido (só o dado que mudou) e repor o contexto perdido."
    estimatedMinutes: 3
    prerequisites: [l19]
    skillIds: [avaliar]
    status: planned
```

## 2. Diff literal — `curriculum/ai-literacy/schemas/lesson.schema.json`

- `properties.id.description`: "ID estável da lição (**l01..l29** vigentes; novos ids só mediante emenda de contrato aprovada). Nunca deriva do título." → "**l01..l32** vigentes; …". `pattern "^l[0-9]{2}$"` e `estimatedMinutes.enum [3,4,5]` inalterados (l30–l32 já válidos pelo padrão).

## 3. Diff literal — `docs/design/ai-literacy/content-contract.md`

1. `LessonDefinition.id`: "// estável: lNN — vigentes **l01..l29**; nunca deriva do título" → "**l01..l32**".
2. `LessonDefinition.moduleId`: "// **mod-01..mod-07**" → "// **mod-01..mod-08**".
3. Seção Catálogo: "`catalog.yaml` é o índice canônico das lições válidas (**29** após a onda **l27–l29**)." → "(**32** após a onda **l30–l32**)."; frase de jornadas: "`mod-01`…`mod-04`, `mod-06`, `mod-07` **e `mod-08`** pertencem a `ia_pratica` (…; + 3 em `mod-07`: …conferir extração; **+ 3 em `mod-08`: rotina assistida com controle humano — o que automatizar, onde o humano valida, quando a automação erra**) e `mod-05` pertence a `dev` (9 lições… — literal como no main)".
4. Exports do read model: "(**29** após a onda **l27–l29**) (`ia_pratica` + `dev`)" → "(**32** após a onda **l30–l32**)".
5. Regra 7: "ids alocados sequencialmente (próximo livre **após `l29`: `l30`**)" → "(próximo livre **após `l32`: `l33`**)". Ids nunca reutilizados (frase intacta).

## 4. Inalterado por decisão explícita (anti-escopo §3.4 do arco)

Os 7 tipos e suas regras de avaliação; `estimatedMinutes ∈ {3,4,5}`; migração de progresso (ids novos = lições novas; nenhuma lição existente editada); contrato de evidência `literacy-evidence` v1; `mission_catalog_rules.py` (l30–l32 em append satisfazem contiguidade ai-pratica — verificado: ch 21/22/23 mantêm 1–23 contíguo, prereqs mesmos-track resolúveis e acíclicos, entrada recomendada `l02` intacta); skills (nenhuma nova — mod-08 reusa [pedir, avaliar, aplicar]; l31 usa [avaliar, proteger], ambos canônicos — mesmo precedente de l02 [entender, avaliar] em mod-01 [entender]); nenhum binding existente editado (dev ch 1–16 intacto); nada em gates/verifier/mastery/learner state; zero vendor.

## 5. Aceite técnico da T0 (gates do FPE no PR da emenda)

`validate.py` verde · `gen:content` verde · standalone exibe mod-08 "em breve" (`hasContent: false`) · zero mudança de comportamento em runtime · CI verde. Precedente de commit: `016b3b8a` (mesma forma, 3 arquivos + bloco de módulo).

**O diff completo (135 linhas, pronto para `git apply` no `e839d0fc`) está anexado a este issue como arquivo de trabalho** (`t0-emenda-AID-1219.patch`, work product `wp-t0-diff`) e reproduzido literalmente nas seções acima.
