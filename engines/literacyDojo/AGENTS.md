# AGENTS.md — engines/literacyDojo

Engine da vertical slice (Fase 1) do LiteracyDojo: microaprendizagem de IA para
pessoas não técnicas. Autoridade: plano
`docs/plans/PLANO_IMPLEMENTACAO_LITERACY_DOJO_2026-07-19.md`, ADR
`docs/design/adr/0005-ai-literacy-bounded-context.md` e contratos em
`docs/design/ai-literacy/`.

## O que é

App React + Vite + TypeScript standalone (npm, sem workspace). Detalhes de
stack, arquitetura e decisões: `README.md` deste diretório.

## Regras duras

1. `src/data/generated/lessons.ts` é gerado por `npm run gen:content`
   (`/usr/local/bin/python3 curriculum/ai-literacy/tools/validate.py --compile …`
   a partir da raiz do repo). **Nunca editar à mão**; nunca duplicar conteúdo
   de lição em componentes.
2. Estado local registra no máximo `completed`. `mastered` é proibido em
   conteúdo, estado, evidência e analytics — é reservado a verificador
   independente futuro.
3. Toda tentativa avaliada emite `LiteracyEvidenceRecord` (`schemaVersion: 1`,
   `source: "literacydojo"`, `verifierRequired: true`) via porta `EvidenceSink`.
   Sem texto livre do usuário em evidência/telemetria; respostas são
   transitórias e não persistem.
4. Feedback é determinístico (checks + `feedback.*` + `hints` do conteúdo).
   Nenhuma chamada externa no caminho de aprendizado.
5. Não tocar `learner/learning_state.yaml` nem outras fontes canônicas fora de
   `curriculum/ai-literacy/` — e lá, só pelo fluxo validador → compilador.
6. Ao mudar prompts/contratos que afetem o read model, rode `gen:content` e a
   suíte inteira; conteúdo inválido deve falhar o build.

## Comandos

```bash
npm run gen:content   # regenera o read model (obrigatório após clone)
npm run dev           # vite puro; args: npm run dev -- --port 4173
npm run lint          # biome check src tests playwright
npm run test          # vitest run (domínio, casos de uso, adapters, app)
npm run build         # tsc -b && vite build
npm run test:e2e      # playwright (webServer vite automático, porta 4173)
```

## Onde mexer

| Tarefa | Lugar |
| --- | --- |
| Regra de progresso, streak, XP, revisão | `src/domain/progress.ts` |
| Avaliação de atividades | `src/domain/evaluation.ts` |
| Envelope de evidência | `src/domain/evidence.ts` |
| Casos de uso | `src/application/useCases.ts` |
| Novas portas/adapters | `src/application/ports.ts`, `src/adapters/` |
| Telas/fluxos | `src/screens/`, `src/components/`, `src/app/App.tsx` |
| Conteúdo de lição | `curriculum/ai-literacy/` (nunca aqui) |
