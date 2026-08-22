---
type: source
title: "Auditoria local: product-readiness do repositório aidevschool"
source_type: internal-audit
author: autoresearch agent (explore subagent)
date_published: 2026-08-21
url: n/a
confidence: high
key_claims:
  - "O modelo de readiness do repo mede jornadas locais com facilitador, não operação de produto"
  - "A avaliação v4 (2026-08-20) concedeu tiers, mas 6 dos 8 use cases estão stale pela própria regra de frescor"
  - "Não existem auth, billing, documentos legais, telemetria ativa, canal de suporte, i18n ou backup de dados de usuário"
---

# Auditoria local: o que falta para customer-ready (2026-08-21)

Auditoria do repositório `/Users/danielbarreto/Development/aidevschool`
executada nesta sessão. Evidência primária com paths.

## Estado do readiness interno

- `docs/product-readiness/` define 3 tiers (`customer-ready`,
  `validated-journey`, `experimental`) com evidência Playwright + observação
  (`policy.yaml:3-15`) e regra de frescor que invalida avaliações após mudanças
  em entry-route, onboarding, persistência, evidência, recovery ou
  acessibilidade (`policy.yaml:32-41`).
- Última avaliação `assessments/2026-08-20-c8a961c-ready-v4.md`: 4 use cases
  `customer-ready` (1 pass + 3 conditional-follow-up), 3 `validated-journey`,
  1 `experimental`. Revalidação devida 2026-09-20.
- **6 dos 8 use cases constam `stale`** no README gerado
  (`docs/product-readiness/README.md:10-17`) — tiers invalidados pela própria
  policy. Apenas `minitown-explore-only` e `pixelquest-evidence-encounter`
  constam `pass` vigentes.
- 5 gaps abertos, todos severity low (`evidence/results.ndjson`), incluindo
  `os-verification-recovery-no-visible-escalation-destination` — o produto não
  oferece destino de suporte visível.

## Ausências para operação customer-facing (evidência direta)

- **Auth/contas**: nenhum login/signup nos engines; único backend é spike
  read-only sem auth (`learner/service/app.py:1-11`, ADR-0008 Proposed).
  Aprendiz hardcoded `daniel-barreto` em `learner/learning_state.yaml`;
  "Contas e sincronização" pendentes (`docs/VISION.md:155-168`).
- **Billing**: zero — nenhuma dependência ou código de pagamento.
- **Deploy**: manual via `npx netlify deploy --prod`; CI só lint/test/build
  (`.github/workflows/ci.yml`); 1 URL pública verificada
  (`https://aidevschool-literacydojo.netlify.app`).
- **Legal**: sem política de privacidade, termos ou menção LGPD/GDPR (1 match
  num plano); **sem LICENSE** na raiz.
- **Telemetria/errors**: ADR-0009 Accepted com sink padrão no-op; nenhum
  endpoint, Sentry ou equivalente.
- **Suporte**: guias pressupõem facilitador humano
  (`student-guide.md`, `facilitator-guide.md`); nenhum canal público.
- **i18n**: pt-BR hardcoded (`engines/literacyDojo/src/host/protocol.ts:23`).
- **Dados de usuário**: progresso só em IndexedDB do navegador; sem
  export/import, sync ou backup — "clearing site data can erase local
  progress" (`student-guide.md:27`).

## "Rodar para um estranho" por engine

Apenas **literacyDojo** é usável sem toolchain (URL Netlify). codexDojo OS,
miniTown, pixelDojo e dojoToday são dev-only (Node/pnpm + Python venv);
dojoToday lê o learner do dono do repo. URLs de missões do OS são placeholders
`*.example.test` (`engines/codexdojo-os-prototype/README.md:53-58`).

## Contradições internas

1. Avaliação "ready" vs matriz stale (frescor da própria policy).
2. Razão "dispositioned medium/low gaps" sem nenhum gap medium no NDJSON.
3. Missões "hosted" do OS vs URLs placeholder.
4. ADR-0009 Accepted vs telemetria efetivamente inexistente (no-op).
5. Tech debt com impacto em claims de produto: reviewSlices falsos no
   voxelDojo, views discordando sobre AIDI, 3 testes de drift falhando
   (`docs/TECH_DEBT_AUDIT_2026-07-08.md`, itens #4, #5, #21, #8).
