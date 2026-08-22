# LiteracyDojo

Microaprendizagem de IA para pessoas não técnicas, com lições de 3–5 minutos,
tentativa, feedback imediato, dica, nova tentativa e progresso local. O ciclo
compartilhado está no
[`contrato de microlição`](../../docs/design/micro-lesson-contract.md).

O bounded context segue o plano
[`docs/plans/PLANO_IMPLEMENTACAO_LITERACY_DOJO_2026-07-19.md`](../../docs/plans/PLANO_IMPLEMENTACAO_LITERACY_DOJO_2026-07-19.md)
e o ADR [`docs/design/adr/0005-ai-literacy-bounded-context.md`](../../docs/design/adr/0005-ai-literacy-bounded-context.md).

## Estado atual

| Parte | Estado |
| --- | --- |
| Conteúdo | O percurso público projeta 14 missões de `ia_pratica` em 4 módulos. As 3 lições Dev continuam válidas no catálogo, mas não entram no app enquanto a Trilha Dev estiver “Em breve”. |
| Aplicação | React/Vite local-first, com conteúdo gerado, progresso em IndexedDB e feedback determinístico. |
| Progresso | A UI registra no máximo `completed`; `mastered` requer verificação independente. |
| Verificação | Rode os comandos desta página no checkout atual; contagens e deploys históricos não são status de release. |

O app é local-first, sem backend e sem chamada de IA no caminho de
aprendizagem. A UI registra no máximo `completed`; nunca `mastered`.
Julgamento independente de evidência bruta (fora deste app):
`python3 -m learner.gate.literacy_verifier --evidence <LiteracyEvidenceRecord.json>`
— ver `learner/gate/README.md` e `docs/design/ai-literacy/evidence-contract.md`.

## Stack

| Peça | Versão |
| --- | --- |
| Node | ≥ 20 (desenvolvido em 24.x) |
| React / React DOM | 18.3.1 |
| Vite | 6.4.3 |
| TypeScript | 5.7.3 |
| Vitest | 3.2.7 (+ Testing Library, jsdom, fake-indexeddb) |
| Playwright | 1.62.0 (Chromium headless) |
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

Pré-requisito do `gen:content`: `python3` do ambiente ativo com `pyyaml`.
Na raiz, prepare e ative `.venv` antes de entrar neste diretório.

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
- `src/domain/` — progresso (`LearnerProgress`), avaliação determinística de
  atividades tipadas, evidência (`LiteracyEvidenceRecord` + validador de envelope),
  migração forward-only, feedback e regras de trilha. Puro, sem React.
- `src/application/` — portas (`ContentRepository`, `ProgressRepository`,
  `EvidenceSink`, `FeedbackProvider`) e os casos de uso (`completeOnboarding`,
  `startLesson`, `submitActivityAttempt`, `requestHint`, `retryActivity`,
  `completeLesson`, `startReview`, `completeReview`, `resumeSession`). O relógio
  é uma função injetada, não uma porta separada.
- `src/adapters/` — funções de conteúdo gerado, `IndexedDbProgressRepository`,
  `consoleEvidenceSink`, `DevtoolsBridgeEvidenceSink`,
  `DeterministicFeedbackProvider` e `systemClock`. As fakes em memória ficam em
  `tests/fakes.ts`.
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
   estado nem evidência (reservado a verificador independente futuro).
4. **Toda tentativa avaliada emite evidência** com `verifierRequired: true` e
   `deterministicChecks` estruturados — nunca texto livre do usuário. Respostas
   não são persistidas (são transitórias na UI).
5. **`learner/learning_state.yaml` não é tocado** — progresso do produto vive
   só no IndexedDB do navegador.
6. **Feedback sem chamada externa** — `DeterministicFeedbackProvider` usa
   `feedback.*` e `hints` do conteúdo.

## Decisões de implementação

- **IndexedDB (não localStorage)** como `ProgressRepository`, recomendado pelo
  plano: API assíncrona não bloqueia a UI e o caminho fica pronto para estados
  maiores. `fake-indexeddb` cobre o adapter em testes. Fallback para
  localStorage não foi necessário.
- **Compilador estendido (mudança aditiva na Fase 0):** o read model exporta
  `track`, `modules`, `CatalogLessonEntry[]` e `skills`, sem duplicar o catálogo
  na UI. A estrutura continua aceitando conteúdo `planned`; o catálogo canônico
  mantém o estado atual.
- **`hints` opcionais no schema de lição** (1–3 dicas progressivas pré-escritas)
  para o `requestHint` sem provider de IA. Alterações em dicas seguem a regra de
  versão do contrato de conteúdo.
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

- **`ModuleNotFoundError: yaml` no gen:content** — ative a `.venv` preparada na
  raiz (`source .venv/bin/activate`) ou instale o projeto com
  `python -m pip install -e ".[dev]"`; não edite o script para um caminho
  absoluto específico da máquina.
- **Playwright sem browser** — rode `npx playwright install chromium`. O spec
  sobe o vite dev automaticamente (`webServer` no `playwright.config.ts`,
  porta 4173, viewport 360×740) e derruba ao final.
- **`lessons.ts` ausente** (ex.: após clone limpo) — `npm run gen:content`;
  `test` e `build` já o regeneram via hooks `pretest`/`prebuild`.

## Gate de release

Antes de anunciar uma alteração local, execute `npm run gen:content`,
`npm run lint`, `npm run test` e `npm run build` no mesmo checkout. Para uma
alteração de fluxo, inclua `npm run test:e2e`. Uma publicação pública exige
verificação separada da rota publicada; ela não muda a fronteira de
`completed` e `mastered`. O procedimento operacional de preview imutável,
promoção humana, saúde pós-deploy e rollback está no
[`RELEASE_RUNBOOK.md`](RELEASE_RUNBOOK.md).
