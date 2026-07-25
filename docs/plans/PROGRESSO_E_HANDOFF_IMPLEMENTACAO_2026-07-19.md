# Progresso e handoff — implementação dos planos (2026-07-19)

| Campo | Valor |
| --- | --- |
| Data | 2026-07-19 |
| Objetivo | Implementar as soluções dos dois planos anexados pelo dono |
| Planos fonte | `docs/plans/PLANO_IMPLEMENTACAO_LITERACY_DOJO_2026-07-19.md` e `docs/plans/ai_devschool_mvp_spec.agent.final.md` |
| Status | LiteracyDojo Fases 0 e 1 **concluídas e verificadas**; Fase 2 **parcial, com build verde e testes ainda quebrados**; MVP spec com **scaffold parcial não rastreado e não verificado**; integração documental do ecossistema **atualizada no working tree** |
| Como usar | Cole este arquivo no Kimi Code (ou outro agente) junto com o repo; ele contém o estado real, as falhas exatas e os próximos passos acionáveis |

> **Aviso de estado git:** a Fase 2 parcial e o scaffold de `engines/aiDevschoolMvp/` estão **não commitados** no working tree. O último commit verde da Fase 1 é `fb624ae` ("test(literacydojo): add vertical-slice e2e…"). Há também mudanças documentais e commits externos paralelos feitos por outras sessões; este handoff descreve o estado observado, não atribui autoria.

---

## 1. Os dois planos (escopo original)

1. **LiteracyDojo** (`docs/plans/PLANO_IMPLEMENTACAO_LITERACY_DOJO_2026-07-19.md`): novo engine `engines/literacyDojo/` — PWA mobile-first de microaprendizagem de IA para não-técnicos (14 lições em 4 módulos, React+Vite+TS, local-first, sem backend/LLM obrigatório). Conteúdo canônico em `curriculum/ai-literacy/`, contratos em `docs/design/ai-literacy/`.
2. **AI DevSchool MVP** (`docs/plans/ai_devschool_mvp_spec.agent.final.md`): skill package para plataformas OpenClaw/Hermes — um aprendiz, trilha "AI Fluency Foundations" (24 conceitos C01–C24, módulos M1–M6), canal Telegram, quatro gates G1–G4, estado 100% em arquivos, núcleo determinístico em Python (state machine, `gate_check.py`, `schedule.py`, `ledger.jsonl`, `replay.py`, `progress_card.py`), `SKILL.md` de persona, `install.py`, suíte de aceitação no cap. 12.

---

## 2. CONCLUÍDO E VERIFICADO ✅

### A1 — LiteracyDojo Fase 0 (decisão e contratos)

- `docs/design/adr/0005-ai-literacy-bounded-context.md` — as 5 decisões da seção 18 do plano (bounded context independente; `curriculum/ai-literacy/` como trilha; progresso local ≠ domínio verificado; conteúdo compilado para read model tipado; sem backend/LLM no slice).
- `docs/design/ai-literacy/` — `README.md`, `content-contract.md` (7 tipos de atividade, pipeline, regras de versão), `evidence-contract.md` (envelope `LiteracyEvidenceRecord`, `mastered` proibido, 10 eventos de analytics).
- `curriculum/ai-literacy/` — `catalog.yaml`, `schemas/lesson.schema.json`, `schemas/rubric.schema.json`, módulos `01`–`04`, e `tools/validate.py` (validador + compilador do read model TS).
- Verificação: `/usr/local/bin/python3 curriculum/ai-literacy/tools/validate.py` → **OK (14 lições ready)**; `python3 -m unittest discover -s curriculum/ai-literacy/tools/tests` → **19 testes OK**.

### A2 — LiteracyDojo Fase 1 (vertical slice)

- `engines/literacyDojo/` completo: React 18 + Vite 6 + TS 5.7, Vitest 3 + Testing Library, Playwright 1.49 (Chromium headless funciona nesta máquina), Biome 1.9, npm.
- Arquitetura em camadas (`domain/` → `application/` portas+casos de uso → `adapters/` → `screens/`+`components/`), 6 portas (`ContentRepository`, `ProgressRepository`, `EvidenceSink`, `FeedbackProvider`, `AnalyticsSink`, `Clock`), 9 casos de uso.
- 3 tipos de atividade funcionais: `output_comparison`, `prompt_builder`, `safety_classification`. Onboarding (3 telas), Home, Mapa da trilha, Player, Resultado. Persistência IndexedDB via porta. Evidência `LiteracyEvidenceRecord` por tentativa (console + bridge dev-only para testes).
- Verificação na Fase 1 (commit `fb624ae`): `npm run lint` limpo; `npm run test` **52/52**; `npm run build` OK; `npm run test:e2e` **1 passed** (fluxo das 3 lições com reload/retomada e envelope de evidência validado).

---

## 3. PARCIAL — LiteracyDojo Fase 2 (interrompida pelo usuário) ⚠️

O trabalho foi interrompido no meio. **Existe e valida:**

- **Conteúdo completo:** as 11 lições restantes foram escritas (`l01, l03, l04, l06, l07, l08, l09, l10, l11, l13, l14`). `validate.py` → **14 lições ready, 0 planned**; 19 testes de contrato OK.
- **4 novos componentes de atividade:** `src/components/ChoiceView.tsx`, `SortView.tsx`, `MissingContextView.tsx`, `RubricReviewView.tsx` (+ `ProgressScreen.tsx` nova).
- Domínio alterado: `evaluation.ts`, `evidence.ts`, `migration.ts`, `progress.ts`, `useCases.ts`, `App.tsx`, `ActivityRenderer.tsx`, `LessonScreen.tsx`.

**Estado verificado em 2026-07-19:**

- `npm run build` → **verde** (`tsc -b` e `vite build`).
- `npm run test` → **35 testes passaram; 2 testes falharam e 1 suíte não chegou a coletar testes**:
  - `tests/application/useCases.test.ts`: `TypeError: activity.evaluation.requiredCriterionIds is not iterable`;
  - `tests/app/appFlow.test.tsx`: dois cenários ainda pressupõem o tipo piloto antigo (`choice` sem helper e expectativa de `output_comparison`).

**Falta fazer na Fase 2 (brief original resumido):**

1. Atualizar os helpers/fixtures dos testes para o catálogo atual e deixar as 37 verificações verdes; rode `npm run gen:content && npm run lint && npm run test && npm run build`.
2. XP + **meta diária** + **conquistas** (primeira lição, primeiro módulo, trilha completa, 1ª aplicação real relatada, N dias de sequência) — avaliação no domínio com testes (XP parcial existe; verificar o que falta).
3. **Revisão espaçada** funcional de ponta a ponta: Home lista revisões vencidas (`nextReviewAt`), fluxo de revisão re-executa atividades de lições concluídas emitindo evidência, avança estágio (`passes`) pelos `intervalsDays`.
4. **Área de progresso** completa na `ProgressScreen` (skills, agenda de revisões, conquistas, histórico sem texto livre).
5. **PWA**: `public/manifest.webmanifest` + ícones gerados por código + service worker via `vite-plugin-pwa`; build emitindo SW; comportamento offline verificado.
6. **A11y**: teclado em todas as atividades (incl. sort), foco gerenciado, aria-live no feedback, contraste AA, alvos ≥44px; testes de componente de teclado.
7. **Analytics**: emitir os 10 eventos do `evidence-contract.md` via `AnalyticsSink` (sem texto livre); InMemory para testes.
8. **Migração de progresso**: testes de schemaVersion antigo→novo e contentVersion divergente (regra: manter `completed`, exigir revisão — já documentada? confirmar no código).
9. **e2e**: manter `vertical-slice.spec.ts` verde + novo spec para revisão/meta/conquistas/progresso. Rodar `npm run test:e2e` headless.

---

## 4. PARCIAL E NÃO VERIFICADO ⚠️

### B — AI DevSchool MVP (spec `ai_devschool_mvp_spec.agent.final.md`)

Existe um scaffold **não rastreado e não verificado** em `engines/aiDevschoolMvp/aidevschool/`: `SKILL.md`, `curriculum.json`, `gate_registry.json` e oito rubricas JSON. Isso não comprova que o pacote esteja instalável, completo ou conforme o spec. O núcleo determinístico, instalador, persistência, replay, integrações e suíte de aceitação ainda precisam ser localizados ou implementados e verificados. Os requisitos executáveis estão principalmente em: cap. 4 (skill package, SKILL.md, duas plataformas), cap. 5 (state machine + scheduler), cap. 6 (gates G1–G4 + exemplos worked), cap. 7 (ledger + living plan + progress card), cap. 8 (data model/schemas + regras operacionais), cap. 9 (segurança/privacidade/deletion), cap. 12 (aceitação — normativa, cada linha é um teste executável).

Sequência sugerida:

- **B1 — núcleo determinístico Python:** state machine (8 transições com guards, exit codes 0/1/2), `gate_check.py` (G1–G4 + fixtures do cap. 6 reproduzindo vereditos byte-a-byte), `schedule.py` (gap 7 dias, nudge único dentro de active_hours), `ledger_verify.py`, `replay.py`, `plan_recompute.py`, `progress_card.py` (card de 40 linhas byte-idêntico ao §7.2), `next_step.py`.
- **B2 — skill package:** `SKILL.md` (persona com blocos normativos verbatim do §4.2 e §9.3), `curriculum.json` (24 conceitos, DAG acíclico, gate map §3.2.5, um teach-back por módulo), content pack (markdown, strings externalizadas, inglês), `keys/` e `rubrics/` (leitura só por scripts), `config.json`, `install.py` (OpenClaw + Hermes, idempotente). Casa sugerida no repo: `engines/aiDevschoolMvp/` (pasta do skill byte-idêntica entre plataformas + install + testes). Validar layout contra o §8.1 do spec antes de decidir.
- **B3 — suíte de aceitação (cap. 12):** todas as linhas de §12.1 + a prova da regra de domínio §12.2 (trace C14 em 6 assertivas, controle negativo "mark mastered" sem mutação) + DoD §12.3 (install limpo, aprendiz sintético C05/C14/C17, replay limpo, card byte-idêntico, deletion verificada).

### C — Integração do ecossistema

- A integração documental de `engines/literacyDojo/`, `curriculum/ai-literacy/`, ADR 0005 e das rotas por público foi atualizada no working tree em `CONTEXT-MAP.md`, handbook, manifesto e guias `AGENTS.md`.
- Ainda falta integrar o MVP como superfície oficial quando o scaffold tiver contrato, implementação e aceitação verificados.
- A rodada final de produto continua pendente: todas as suítes root, LiteracyDojo e aceitação do MVP precisam ficar verdes.

---

## 5. Ambiente e armadilhas (importante)

- **Python do repo:** use **`/usr/local/bin/python3`** (3.13, tem pyyaml). O `python3` default do shell do Kimi Work NÃO tem `pyyaml`. `make install` instala `pyyaml`, `fsrs`, `pytest` se necessário.
- **Node:** v24.14 / npm 11.9 disponíveis. Playwright 1.49 + Chromium funcionam headless nesta máquina.
- **Read model gerado:** `engines/literacyDojo/src/data/generated/lessons.ts` é GERADO (DO NOT EDIT); regenere com `cd engines/literacyDojo && npm run gen:content` (hooks de test/build já regeneram).
- **Invariantes do repo/plano (não violar):**
  - Nunca registrar/declarar `mastered` em UI, estado ou evidência — termo reservado a verificador independente futuro.
  - Sem texto livre do usuário em telemetria/evidência (só digest/categorias/resultado de rubrica).
  - Não editar `learner/learning_state.yaml`; não criar backend; feedback 100% determinístico.
  - Não duplicar conteúdo canônico em componentes React — tudo vem do read model.
  - Arquivos gerados nunca editados à mão.
  - Não deixar dev server rodando ao final de uma sessão.
- Suítes root: `make test` (pytest testpaths do `pyproject.toml`, inclui `curriculum/ai-literacy/tools/tests`); `make test-literacy` só o contrato de conteúdo.

## 6. Verificação rápida (copiável)

```bash
cd /Users/danielbarreto/Development/aidevschool
/usr/local/bin/python3 curriculum/ai-literacy/tools/validate.py
/usr/local/bin/python3 -m unittest discover -s curriculum/ai-literacy/tools/tests
cd engines/literacyDojo
npm install            # se node_modules ausente
npm run gen:content && npm run lint && npm run test && npm run build
npm run test:e2e       # Chromium headless
```

**Estado observado em 2026-07-19:** validador OK (14 lições); 19 testes de contrato OK; build do engine OK; Vitest com **35 testes passando, 2 falhando e 1 suíte com erro de coleta** (ver seção 3). Começar pelos helpers/fixtures que ainda pressupõem as atividades piloto.

## 7. Atualização 2026-07-25 (Fase 2)

Itens 1–5, 7, 8 e 9 da seção 3 estão feitos e verificados; item 6 (a11y) segue parcial.

- **Verificado nesta data:** `npm run lint` limpo; `npm run test` **57/57**; `npm run build` verde;
  e2e **6 specs verdes** (projeto `app`: 3 vertical-slice + 2 gamificação; projeto `pwa`: offline).
- **PWA (item 5):** `public/manifest.webmanifest`, `public/sw.js` (Cache API nativa, sem workbox) e
  ícones gerados por código em `tools/gen-icons.mjs` (PNG via `node:zlib`, zero dependências;
  roda no `prebuild`). Registro do SW é PROD-only, então o offline é testado contra `vite preview`
  no projeto `pwa` do `playwright.config.ts` (porta 4174).
- **e2e de gamificação (item 9):** `playwright/gamification.spec.ts` cobre XP (35), meta diária,
  sequência, conquista `first_lesson`, tela de progresso e revisão espaçada vencida (evidência com
  `context: "review"`, sem XP de conclusão e sem mudar a trilha). Helpers em `playwright/support.ts`.
- **Arte voxel nas explicações:** `src/components/VoxelSkillArt.tsx` (cena + metáfora por skill)
  na intro da lição, no player e no resultado; meta diária também aparece na Home.
- **Bug de raiz corrigido:** a arte voxel decorativa dentro de `<label>` interceptava o clique dos
  rádios do onboarding (`pointer-events: none` em `.voxel-scene`/`.voxel-task`).
- **Falta (item 6):** auditoria de a11y completa — foco gerenciado, `aria-live` no feedback e
  teclado no sort existem, mas contraste AA e alvos ≥44px em todas as telas novas não foram medidos.
- **Aviso de ambiente:** havia várias sessões de agente editando `engines/literacyDojo` em paralelo
  nesta data (redesign com `VoxelWorld`/`MentorGuide`). Rodadas e2e simultâneas competem pelas portas
  4173/4174 e por `test-results/` — rode a suíte com uma sessão só.
