# W7 — Loop de qualidade com medida e parada

**Quando usar:** melhoria difusa ("deixar o código mais limpo") que precisa de
limites. Sem medida não há progresso; sem parada não há loop, há vício.

## Fluxo

1. Escolha UMA medida barata e objetiva (grep, contagem, cobertura).
2. Baseline: meça antes.
3. Iteração: menor mudança que reduz a distância → gates (test/lint/tsc).
4. Repita até a meta OU até N iterações sem melhoria (teto sempre existe).
5. Registre antes/depois.

## Execução real (2026-08-19)

- **Medida:** ocorrências de `any`/`as any` em `src/`
  (`grep -rEn "as any|: any|<any>" src`).
- **Baseline:** 4.
- **Iteração 1:** `src/app/api/settings/route.ts` — `Record<string, unknown>` +
  `as any` → objeto tipado `{ sound?: boolean; rain?: boolean; reducedMotion?: boolean }`.
- **Iteração 2:** `src/components/game/Home.tsx` — `{ lesson: any; module: any }`
  → `{ lesson: ClientLesson; module: ClientModule }` (tipos já existiam em
  `types.ts` — o loop também revela ativos esquecidos).
- **Iteração 3:** `src/components/game/LessonComplete.tsx` — idem (2 locais).
- **Verificação:** medida re-executada → **0**. Gates: 123/123, lint 0, tsc 0.
- **Parada:** meta atingida; loop encerrado (não sair caçando `any` em testes
  ou node_modules — isso seria scope creep).

## Valor

4 → 0 com prova em cada passo. O mesmo esqueleto serve para qualquer meta
mensurável: cobertura, warnings, TODOs, tempo de build.
