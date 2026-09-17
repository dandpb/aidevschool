# Plan: registro fast-path do fix HTTPS BYOK zai-duolingo-like `/api/chat` (PR #488)

Change-id: AID-2359-https-byok-zai-sentinel · From: PR #488 (Sentinel, `google-labs-jules[bot]`) · Status: approved (plan block fast-path — bounded fix; veredito FPE GO AID-2359 cmt `3ecf91fa`)

## Files that change (diff real do PR #488 @ `2c1daca1`, +55/−0)

- `engines/zai-duolingo-like/src/app/api/chat/route.ts` (+20) — após
  resolver `baseUrl`/`model` e antes do único `fetch`: `new URL(baseUrl)`;
  se `protocol !== "https:"` AND hostname ∉ {`localhost`,`127.0.0.1`} →
  400 `{ok:false, error:"Segurança: O endpoint deve usar HTTPS (exceto localhost.)"}`;
  catch (URL inválida) → 400 `{ok:false, error:"URL base inválida."}`.
- `engines/zai-duolingo-like/tests/api/chat.test.ts` (+35, arquivo pré-existente mas somente casos NOVOS acrescentados) — (1) `http://api.z.ai/api` → 400 contém "Segurança"; (2) `http://localhost:11434` → 200 com fetch stubado; (3) `not-a-url` → 400 "URL base inválida.".

## Order of work (como executou)

1. Bot abre PR #488 com fix + testes (19:51:02Z; push final 19:58:51Z, head `2c1daca1`).
2. CI roda no head: run `35268068214` — 41/41 jobs success, incl. `SDLC guardrails (diff)` (19:59:03Z→19:59:16Z) e `zai-duolingo-like (Next.js + Prisma)`.
3. Triagem Paperclip AID-2359 (FPE, despachada pela auditoria AID-2358 Registro #1): revisão first-hand + execução dos testes + controle negativo — veredito **GO** 20:43:32Z.
4. Este registro commitado no branch do PR **antes do merge** (este commit).
5. Aceitação: founder merge no GitHub OU countersign FPE (passo 3) + merge single-writer citando-o. Branch `behind` (main strict) → update-branch → **re-verificar by-name `SDLC guardrails (diff)` PRESENTE+SUCCESS no head final** antes do merge (AID-1618 §2; preced. #92/PR #482).

## Risks

- Quebrar LLM local do learner: mitigado pela isenção localhost/127.0.0.1 (teste (2) cobre).
- Quebrar endpoints https legítimos: não afetados (validação só rejeita não-https não-localhost; suíte completa 128/128 verde).
- Risco do passo de merge: head final pós update-branch sem re-check by-name — mitigação é o item 5 (re-check obrigatório).
- Alternativas consideradas e NÃO escolhidas: allowlist de domínios (mais rígida, quebra BYOK genérico); warning-only (não fecha a exposição).

## Proof (executado first-hand pelo verificador FPE na worktree do head `2c1daca1`; ver AID-2359 cmt `3ecf91fa`)

- `vitest run tests/api/chat.test.ts` → **7/7 pass** (3 novos incluídos).
- Controle negativo com route.ts de `origin/main`: testes novos 1 e 3 **falham** (bind real ao fix); restaurado e conferido.
- `vitest run` (engine completo) → **128/128 pass (25 files)**; `eslint` (2 arquivos) → exit 0; `tsc --noEmit` → exit 0.
- CI by-name no head: `SDLC guardrails (diff)` + `zai-duolingo-like (Next.js + Prisma)` = success.

## Verification split

- Produtor: bot Sentinel (diff + testes declarados, sem execução própria beyond CI).
- Verificador: FPE fresh-context (veredito GO AID-2359; execução first-hand acima).
- Merger: founder no GitHub ou single-writer CEO citando o countersign (não o produtor, não o verificador como produtor).
