# Intent: W3 fundações de design — componente do loop tentativa/feedback/retry como padrão documentado + forced-colors wave 1

Author: CEO sweep AID-1092 (ordem AID-1096, FPE executor) · Change-id: AID-1096-w3-loop-component · Status: accepted

> Fonte canônica: doc `proposal` da AID-914 (rev `70649549`, aprovada pela board),
> §2.5 W3 + §4 + §3 B7 + §6. Ordem AID-1096 cita e não reescreve.
> Gate de início verificado first-hand: PR #303 **MERGED** (`1412155`, 2026-09-09T03:25:32Z),
> AID-1089/AID-1093 `done`, countersign QA GO (AID-1099 @ `6fb94833`).

## Problem

As 3 engines têm loops tentativa/feedback/retry reais mas sem contrato documentado:
o loop de referência (literacyDojo LessonScreen+FeedbackPanel) não está formalizado,
OS/dojoToday aderem parcialmente por coincidência, e `forced-colors` está ausente em
0/3 engines (auditoria AID-914 §1.4) — B7 é o check perpetuamente adiado.

## Proposed outcome

1. `docs/design/design-foundations.md` publicado: contrato canônico do loop
   (anatomia §4.1, estados §4.2, critérios de aceite QA-verificáveis §4.3),
   state contract §2.3, baseline a11y §3 e changelog de ondas — o padrão passa a ser
   documentado, não implícito.
2. FeedbackPanel/ResultScreen das 3 engines aderem ao contrato nos pontos auditados
   (testids canônicos onde o papel existe, `aria-invalid` nos checks falhos,
   mapeamento de papéis documentado).
3. `@media (forced-colors: active)` wave 1 nos controles/containers do loop
   (borda/outline sobrevivem a system colors; distinção pass/fail sem cor).
4. Alias layer permanece mínima (`--ads-focus` + pares de feedback) — decisão
   documentada com critério §6 (alias sem adoção em 2 ciclos = remover).

## Affected users and systems

engines/literacyDojo, engines/codexdojo-os-prototype, engines/dojoToday (src + tests);
docs/design (novo contrato); docs/product-readiness (re-grant v39 — fontes cobertas
por fingerprints mudam com `invalidatingChanges: accessibility`).

## Constraints

- Sem big-bang rewrite de tokens; sem migrar engines ao núcleo semântico completo
  (pós-W3, decisão board); sem tocar gate/learner state.
- Single-writer/PR para `main`; countersign QA obrigatória (produtor ≠ verificador).
- Lição D1/AID-1093: re-grant da matriz de readiness embarca no próprio PR;
  `product readiness (claims)` verde no head.
- Nenhum estado do loop marca `mastered` (§4.3-5, inegociável).

## Open questions

- Estender a alias para o núcleo de 18 tokens agora? Decisão: **não** — ver spec.md
  (nenhuma onda consumidora; critério §6 vigente).
