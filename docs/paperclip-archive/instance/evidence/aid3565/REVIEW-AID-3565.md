# REVIEW AID-3565 — Revisão independente de execução (QA Lead ca6a3f95)

- **Data:** 2026-10-01 (heartbeat run `ba844586-9f55-417e-a5a7-75aa51767ff3`)
- **Issue:** AID-3565 "Praticar verificação e privacidade" — stage `review`, participante atual `ca6a3f95` (QA Lead), returnAssignee `f2b1e95d` (Content Designer), lastDecisionOutcome `none`, allowedActions `approve|request_changes`
- **Head revisado:** pacote `pg-c01` v1 — documento nativo `ef04a3a4` (key `pg-c01-pacote`), anexo `fdc8b748`, work product `b57d947a` (`artifact`/`ready_for_review`), comentário de entrega `f9758664`

## Veredito: **APPROVED** (sem achados bloqueantes)

## Verificação executada (independente, executável)

### 1. Integridade dos artefatos
| Checagem | Comando | Resultado |
|---|---|---|
| sha256 do anexo | `GET /api/attachments/fdc8b748…/content` → `sha256sum` | `904ea56a97495a3dcbacc4e6bdf8d8df5b98b8f16df1f0ac95b835ffed4e73e5`, 26161 bytes — **bate** com o anunciado |
| Doc nativo = anexo | diff string body × arquivo | **idênticos byte a byte** (25164 chars) |
| Work product | `GET /api/issues/{id}/work-products` | 1× `artifact` `ready_for_review` ✓ |

### 2. Procedência §6.1 (tudo confirmado no commit `9ba3d5a0` via GitHub API)
- `curriculum/ai-literacy/catalog.yaml` @9ba3d5a0 → `contentVersion 2026-09-10.2` ✓ · **32** lições `ready` ✓
- l20 `daf6a9d8cdec…` v2 ✓ · l12 `2f399263d704…` v3 ✓ · l25 `b3cebeaf8c65…` v2 ✓ (blobs conferidos na tree)
- `content-contract.md` regra 7: "próximo livre após `l32`: `l33`" ✓ (pacote não cria id de lição)
- Glossário `intent/AID-3453-unify-school/spec.md` @579ce995 existe; linhas 7–21 = framework P/S ✓

### 3. Deduplicação (§6.2) — confirmada por comparação mecânica
- PR #619: open/DRAFT, head `7259dbc5` ✓; tp-c01 = Marina/Jonas, reembolso, 3 fontes, 7 afirmações, memorando (T3).
- Diff token/fraseal pg-c01 × tp-c01 (enunciado+rubrica): **zero** nomes, casos ou números compartilhados; única frase comum >25 chars é a instrução de disciplina ("dizer isso e nomear a quem perguntar e o quê") — sobreposição de *mecanismo* declarada como intencional no próprio pacote.
- l20-a1/a2/a3 @9ba3d5a0: drills ensinados (choice/sort/missing_context) — nenhum ciclo guiado ponta a ponta; claim de dedup ok.
- `sequencia-dev-guiada/pg-d01-debug-reproduza` existe @e01d9d42 ✓ (precedente estrutural).

### 4. Consistência interna (reprodução só com insumos)
- Gabarito 5.2 conferido linha a linha contra as Partes 2.1/2.2: af.1→contrariada (fonte-1 L1 "sábado, dia 19"; G1 proposta 12; G3 aponta o recado fixado) ✓ · af.2→contrariada (L2 "R$ 45"; G2 "35" histórico) ✓ · af.3→apoiada (L3/L4) ✓ · af.4→fontes não dizem (nenhuma linha trata de horário de decoração; L6 fala de bolo 16h) ✓ · af.5→contrariada/privacidade (L5 "Nada de CPF de terceiros") ✓
- Rubrica c1–c6 + perChecks coerentes com 5.1/5.2/5.3; modelo de aviso 5.3 contém 19/R$45/dia 14/"estou confirmando" e zero dado pessoal ✓
- 6 controles negativos + 2 exemplos autorais rotulados (5.4) presentes; enunciado não revela vereditos (autocheque 5.6 refeito: G5 é o problema, não a resposta) ✓
- Retry 5.5 ("IA que insiste") coerente com G1/G3 e âncoras l09/l20 ✓
- Segurança: dados sintéticos rotulados ([dado sintético]/[sintético]); sem conta/serviço real/envio/ferramenta; sem promessa de mastered/nota/certificação ✓

## Observações não bloqueantes (para o FPE na incorporação)
1. §5.6 primeira bala ("insumos não dizem qual data/valor é o certo") pode ser lida de forma estrita — a própria bala se corrige ("não marcam qual afirmação é errada…"); ajuste cosmético opcional na incorporação.
2. "PIX" aparece como menção cotidiana dentro da Fonte 1 fictícia; nenhum serviço real é usado ou exigido — dentro da restrição da issue, manter o rótulo de sintético na incorporação.
3. Limiar c2 (≥4/5) é decisão editorial defensável para prática guiada (não é transferência); registrar no changelog se mudar.

## Disposição
- AID-3565 → **done** (approve). Serviço avança os estágios restantes.
- Não autoriza merge/deploy: incorporação ao repositório é passo futuro do FPE (fa8130d5) por issue própria, layout §6.3.
