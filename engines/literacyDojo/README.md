# LiteracyDojo

Microaprendizagem de IA para pessoas não técnicas — **vertical slice (Fase 1)** do plano
[`docs/plans/PLANO_IMPLEMENTACAO_LITERACY_DOJO_2026-07-19.md`](../../docs/plans/PLANO_IMPLEMENTACAO_LITERACY_DOJO_2026-07-19.md),
sob o ADR [`docs/design/adr/0005-ai-literacy-bounded-context.md`](../../docs/design/adr/0005-ai-literacy-bounded-context.md).

Três lições piloto navegáveis (output_comparison, prompt_builder, safety_classification),
onboarding em 3 telas, home, mapa da trilha, player de lição e tela de resultado —
local-first, sem backend, sem chamada de IA, feedback 100% determinístico.

## Stack

| Peça | Versão |
| --- | --- |
| Node | ≥ 20 (desenvolvido em 24.x) |
| React / React DOM | 18.3.1 |
| Vite | 6.0.11 |
| TypeScript | 5.7.3 |
| Vitest | 3.0.5 (+ Testing Library, jsdom, fake-indexeddb) |
| Playwright | 1.49.1 (Chromium headless) |
| Biome | 1.9.4 |

App standalone com **npm** (não faz parte de nenhum workspace pnpm).

## Como rodar

```bash
cd engines/literacyDojo
npm install
npm run gen:content   # gera src/data/generated/lessons.ts (obrigatório após o clone)
npm run dev           # vite puro — repassa args: npm run dev -- --port 4173
npm run lint          # biome check src tests playwright
npm run test          # vitest (pretest roda gen:content antes)
npm run build         # tsc -b && vite build (prebuild roda gen:content antes)
npm run test:e2e      # playwright (sobe o vite dev sozinho na porta 4173)
```

Pré-requisitos do `gen:content`: `/usr/local/bin/python3` com `pyyaml`
(o `python3` padrão do shell pode não ter — ver seção "Problemas comuns").

Playwright: na primeira vez, `npx playwright install chromium`.

## Arquitetura (plano seção 8)

```text
UI (src/screens, src/components)
  → casos de uso (src/application/useCases.ts)
    → domínio (src/domain/*)
      → portas (src/application/ports.ts)
        → adapters (src/adapters/*)
```

- `src/data/generated/lessons.ts` — **read model gerado, DO NOT EDIT BY HAND**.
  O app consome somente ele; conteúdo canônico em `curriculum/ai-literacy/`.
- `src/domain/` — progresso (`LearnerProgress`), avaliação determinística dos 3
  tipos de atividade, evidência (`LiteracyEvidenceRecord` + validador de envelope),
  migração forward-only, feedback, helpers de trilha. Puro, sem React.
- `src/application/` — portas (`ContentRepository`, `ProgressRepository`,
  `EvidenceSink`, `FeedbackProvider`, `AnalyticsSink`, `Clock`) e os casos de uso
  (`startLesson`, `submitActivityAttempt`, `requestHint`, `retryActivity`,
  `completeLesson`, `scheduleReview`, `resumeSession`, `resetProgress`,
  `completeOnboarding`).
- `src/adapters/` — `GeneratedContentRepository` (lê o read model),
  `IndexedDbProgressRepository`, `InMemoryProgressRepository` (testes),
  `ConsoleEvidenceSink` + `InMemoryEvidenceSink` (testes) +
  `DevtoolsBridgeEvidenceSink` (dev/e2e), `DeterministicFeedbackProvider`,
  `NoopAnalyticsSink` + `InMemoryAnalyticsSink` (testes), `SystemClock` +
  `FixedClock` (testes).
- `src/app/` — raiz de composição (`services.ts`), boot e rotas (`App.tsx`).
- `tests/` — vitest (domínio, casos de uso, adapters, componentes, fluxo do app).
- `playwright/` — fluxo e2e completo da vertical slice.

## Invariantes (não quebrar)

1. **Nunca editar `src/data/generated/lessons.ts` à mão** — regenere com
   `npm run gen:content`. Conteúdo inválido falha o build (o compilador sai ≠ 0).
2. **Nada de conteúdo de lição em componentes** — textos de lição/atividade/
   feedback/dicas vêm do read model. Copy de chrome do produto (botões,
   onboarding, avisos) pode viver na UI.
3. **`completed` é o máximo que a UI registra** — `mastered` não existe em
   estado, evidência nem analytics (reservado a verificador independente futuro).
4. **Toda tentativa avaliada emite evidência** com `verifierRequired: true` e
   `deterministicChecks` estruturados — nunca texto livre do usuário (idem
   analytics). Respostas não são persistidas (são transitórias na UI).
5. **`learner/learning_state.yaml` não é tocado** — progresso do produto vive
   só no IndexedDB do navegador.
6. **Feedback sem chamada externa** — `DeterministicFeedbackProvider` usa
   `feedback.*` e `hints` do conteúdo.

## Decisões e desvios da Fase 1

- **IndexedDB (não localStorage)** como `ProgressRepository`, recomendado pelo
  plano: API assíncrona não bloqueia a UI e o caminho fica pronto para estados
  maiores. `fake-indexeddb` cobre o adapter em testes. Fallback para
  localStorage não foi necessário.
- **Compilador estendido (mudança aditiva na Fase 0):** o read model passou a
  exportar `track`, `modules` (com `CatalogLessonEntry[]`, incluindo as 11
  lições `planned` com `hasContent: false` para o mapa "em breve") e `skills` —
  sem isso o mapa da trilha exigiria duplicar o catálogo na UI. `lessons`,
  `contentVersion` e a validação não mudaram de comportamento.
- **`hints` opcionais no schema de lição** (1–3 dicas progressivas pré-escritas)
  para o `requestHint` sem provider de IA. Adicionar dicas alterou conteúdo →
  as 3 lições piloto foram para `version: 2` (regra do contrato).
- **Desbloqueio pela ordem das lições prontas:** a primeira lição `ready` nasce
  `available`; concluir libera a próxima `ready`. Pré-requisitos `planned` não
  bloqueiam (não têm conteúdo — senão a trilha travaria). Regra encapsulada em
  `src/domain/progress.ts` e testada.
- **Regras de aprovação por tipo** (documentadas em `src/domain/evaluation.ts`):
  `output_comparison` exige saída certa + todos os critérios obrigatórios +
  nenhum critério-armadilha; `prompt_builder` e `safety_classification` passam
  com score ≥ 0.75 (limiar do MVP; a lição pode exigir média maior via
  `completion.minimumScore`).
- **`SkillPractice.passes`** foi adicionado ao estado (além do `attempts` do
  plano) para o estágio da revisão espaçada.
- **Respostas são transitórias:** reload no meio de uma atividade retoma no
  início da lição (granularidade da lição, não da resposta) — coerente com
  `storage.policy` e com a regra de não persistir respostas.
- **Ponte dev-only de evidência:** em `vite dev`, cada registro também vai para
  `window.__literacydojo.evidence` e `sessionStorage["literacydojo:evidence"]`
  (o spec Playwright valida o envelope a partir daí). Em build de produção só o
  `ConsoleEvidenceSink` fica ativo. Os dados nunca saem do navegador.
- **`attemptId`** é sequencial por perfil (`att-000001`, …) via contador no
  progresso — determinístico e único por tentativa.
- **Biome 1.9 + overrides por `include`:** `src/data/generated/` fora do
  lint/format (arquivo gerado).

## Problemas comuns

- **`ModuleNotFoundError: yaml` no gen:content** — o `python3` do PATH não tem
  pyyaml; o script usa `/usr/local/bin/python3` (neste ambiente é o que tem
  pyyaml). Em outra máquina, ajuste o caminho no script `gen:content` do
  `package.json` ou instale pyyaml no python padrão.
- **Playwright sem browser** — rode `npx playwright install chromium`. O spec
  sobe o vite dev automaticamente (`webServer` no `playwright.config.ts`,
  porta 4173, viewport 360×740) e derruba ao final.
- **`lessons.ts` ausente** (ex.: após clone limpo) — `npm run gen:content`;
  `test` e `build` já o regeneram via hooks `pretest`/`prebuild`.

## O que ficou para a Fase 2 (do plano)

- 11 lições restantes (hoje `planned`) e os outros 4 tipos de atividade
  (`choice`, `sort`, `missing_context`, `rubric_review`) — o domínio lança
  `UnsupportedActivityTypeError` para eles hoje.
- XP/sequência mais ricos, meta diária, conquistas e revisão espaçada completa
  (reagendamento por revisão feita, tela de revisão).
- PWA instalável + funcionamento com conectividade instável.
- Migrações reais quando `schemaVersion` subir (hoje: 1; incompatível = reset
  explícito com aviso, nunca fallback silencioso).
- Adapter de analytics real (após política de dados aprovada), área de
  progresso com habilidades e revisões futuras.
- (Fase 3) `FeedbackProvider` generativo opcional — a aprovação continuará
  determinística por contrato.
