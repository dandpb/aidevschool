# W10 — Transformar gates em ativo permanente

**Quando usar:** quando você rodou a MESMA sequência de comandos manualmente
mais de duas vezes. Sequência repetida vira comando; comando vira convenção;
convenção documentada vira cultura.

## Fluxo

1. Identifique a sequência repetida (aqui: `vitest run` → `eslint .` →
   `tsc --noEmit`).
2. Transforme em um comando do projeto (`scripts` do package.json — mais
   idiomatico que script solto neste repo).
3. Documente no `QWEN.md` (instrução permanente que todo agente/sessão carrega).
4. PROVE o ativo: rode-o uma vez e registre a saída.

## Execução real (2026-08-19)

- Adicionado ao `package.json`:
  `"verify": "vitest run && eslint . && tsc --noEmit"`
- Testado imediatamente após todas as mudanças do dia (W1–W3, W7):
  ```text
  $ npm run verify
  Test Files  25 passed (25) | Tests  123 passed (123)   → exit 0
  ```
- `QWEN.md` referencia o workflow e os gates; o passo a passo do
  `docs/workflow-dev-ia/README.md` agora pode dizer apenas "rode
  `npm run verify`".

## Valor

Onboarding: uma pessoa (ou agente) nova roda UM comando e recebe o mesmo
padrão de qualidade que o autor do dia usou. Gates deixam de depender de
memória — viram interface.
