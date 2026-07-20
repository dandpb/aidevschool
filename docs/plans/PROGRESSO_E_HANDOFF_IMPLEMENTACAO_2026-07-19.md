# Progresso e handoff — implementação dos planos (2026-07-19)

| Campo | Valor |
| --- | --- |
| Data | 2026-07-19 |
| Objetivo | Implementar as soluções dos dois planos anexados pelo dono |
| Planos fonte | `docs/plans/PLANO_IMPLEMENTACAO_LITERACY_DOJO_2026-07-19.md` e `docs/plans/ai_devschool_mvp_spec.agent.final.md` |
| Status | LiteracyDojo Fases 0 e 1 **concluídas e verificadas**; Fase 2 **parcial (±65%) com testes quebrados**; MVP spec (skill package) **não iniciado**; integração de docs do ecossistema **não iniciada** |
| Como usar | Cole este arquivo no Kimi Code (ou outro agente) junto com o repo; ele contém o estado real, as falhas exatas e os próximos passos acionáveis |

> **Aviso de estado git:** a Fase 2 parcial está **não commitada** no working tree. O último commit verde da Fase 1 é `fb624ae` ("test(literacydojo): add vertical-slice e2e…"). Havia também commits externos paralelos (ex.: `92876f1` minitown) feitos por outra sessão durante o trabalho — não são desta frente.

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

**Está quebrado (estado exato agora):**

- `npm run test` → **6 failed / 31 passed (37)**.
- `npm run build` (tsc) → erros:
  - `src/components/ActivityRenderer.tsx(119,45): TS2339 Property 'type' does not exist on type 'never'` (provável narrowing da union de atividades com os 4 tipos novos);
  - `tests/domain/progress.test.ts(129,22): TS2554 Expected 3 arguments, but got 2` (assinatura de função de domínio mudou e o teste não foi atualizado).

**Falta fazer na Fase 2 (brief original resumido):**

1. Consertar os 2 erros de TS e os 6 testes falhando; rode `npm run gen:content && npm run lint && npm run test && npm run build`.
2. XP + **meta diária** + **conquistas** (primeira lição, primeiro módulo, trilha completa, 1ª aplicação real relatada, N dias de sequência) — avaliação no domínio com testes (XP parcial existe; verificar o que falta).
3. **Revisão espaçada** funcional de ponta a ponta: Home lista revisões vencidas (`nextReviewAt`), fluxo de revisão re-executa atividades de lições concluídas emitindo evidência, avança estágio (`passes`) pelos `intervalsDays`.
4. **Área de progresso** completa na `ProgressScreen` (skills, agenda de revisões, conquistas, histórico sem texto livre).
5. **PWA**: `public/manifest.webmanifest` + ícones gerados por código + service worker via `vite-plugin-pwa`; build emitindo SW; comportamento offline verificado.
6. **A11y**: teclado em todas as atividades (incl. sort), foco gerenciado, aria-live no feedback, contraste AA, alvos ≥44px; testes de componente de teclado.
7. **Analytics**: emitir os 10 eventos do `evidence-contract.md` via `AnalyticsSink` (sem texto livre); InMemory para testes.
8. **Migração de progresso**: testes de schemaVersion antigo→novo e contentVersion divergente (regra: manter `completed`, exigir revisão — já documentada? confirmar no código).
9. **e2e**: manter `vertical-slice.spec.ts` verde + novo spec para revisão/meta/conquistas/progresso. Rodar `npm run test:e2e` headless.

---

## 4. NÃO INICIADO ⬜

### B — AI DevSchool MVP (spec `ai_devschool_mvp_spec.agent.final.md`)

Nada foi construído. Ler o spec por capítulos; os requisitos executáveis estão principalmente em: cap. 4 (skill package, SKILL.md, duas plataformas), cap. 5 (state machine + scheduler), cap. 6 (gates G1–G4 + exemplos worked), cap. 7 (ledger + living plan + progress card), cap. 8 (data model/schemas + regras operacionais), cap. 9 (segurança/privacidade/deletion), cap. 12 (aceitação — normativa, cada linha é um teste executável).

Sequência sugerida:

- **B1 — núcleo determinístico Python:** state machine (8 transições com guards, exit codes 0/1/2), `gate_check.py` (G1–G4 + fixtures do cap. 6 reproduzindo vereditos byte-a-byte), `schedule.py` (gap 7 dias, nudge único dentro de active_hours), `ledger_verify.py`, `replay.py`, `plan_recompute.py`, `progress_card.py` (card de 40 linhas byte-idêntico ao §7.2), `next_step.py`.
- **B2 — skill package:** `SKILL.md` (persona com blocos normativos verbatim do §4.2 e §9.3), `curriculum.json` (24 conceitos, DAG acíclico, gate map §3.2.5, um teach-back por módulo), content pack (markdown, strings externalizadas, inglês), `keys/` e `rubrics/` (leitura só por scripts), `config.json`, `install.py` (OpenClaw + Hermes, idempotente). Casa sugerida no repo: `engines/aiDevschoolMvp/` (pasta do skill byte-idêntica entre plataformas + install + testes). Validar layout contra o §8.1 do spec antes de decidir.
- **B3 — suíte de aceitação (cap. 12):** todas as linhas de §12.1 + a prova da regra de domínio §12.2 (trace C14 em 6 assertivas, controle negativo "mark mastered" sem mutação) + DoD §12.3 (install limpo, aprendiz sintético C05/C14/C17, replay limpo, card byte-idêntico, deletion verificada).

### C — Integração do ecossistema

- Atualizar `CONTEXT-MAP.md` (raiz), `docs/handbook/README.md` (+ arquivos numerados), `engines/codexDojo/ecosystem/MANIFEST.md` e `AGENTS.md` (raiz) com: novo engine `engines/literacyDojo/`, trilha `curriculum/ai-literacy/`, ADR 0005, e (quando existir) o skill package do MVP.
- Rodada final de verificação: todos os suites verdes (root `make test`, engine literacyDojo, aceitação do MVP).

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

**Estado esperado agora:** validador OK (14 lições); 19 testes de contrato OK; engine com **6 testes falhando + 2 erros de TS** (ver seção 3) — começar por aí.
