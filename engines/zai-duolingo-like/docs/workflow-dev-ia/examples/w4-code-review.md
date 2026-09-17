# W4 — Code review do diff acumulado (skill `/review`)

**Quando usar:** antes de commitar/mergear um conjunto de mudanças. Review é
controle de qualidade independente — até do seu próprio código.

## Fluxo

1. `/review [--effort low|medium|high]` — o skill resolve o alvo (aqui: local).
2. `parse-args` → `capture-local`: captura staged + unstaged + **untracked**
   (um `git diff` comum jamais mostraria os 13 arquivos novos deste dia).
3. Leitura por ângulos (effort low): corretude, testes, segurança, consistência
   com siblings, acurácia de docs, varredura de comportamento removido.
4. Findings: corrija os reais; difira explicitamente o resto (silêncio > ruído).

## Execução real (2026-08-19)

- Diff: 2876 linhas (266 source, 359 testes, 567 docs, 1684 gerados — lockfile
  ignorado como conteúdo gerado), 24 arquivos.
- **Ângulo corretude:** semântica do unlock preservada 1:1 nos dois
  consumidores (comparada linha a linha); `NaN`/boolean no goal cai no 400.
- **Ângulo testes:** os testes afirmam o que dizem (clock injetado é
  distinguível do relógio real por construção).
- **Ângulo docs:** finding real — `QWEN.md` dizia que E2E "precisa do servidor
  no ar"; na verdade a suíte sobe o próprio servidor (precisa é de build).
  Corrigido na hora.
- **Varredura de remoções:** nenhum comportamento perdido nas extrações.
- Finding diferido: caminho Windows hardcoded em `playwright.config.ts`
  (fora do escopo do review) → virou o primeiro passo do W5.

## Valor

2 findings reais antes do commit (1 corrigido, 1 roteado) e a confirmação
documentada de que o restante do diff é sólido — com os untracked incluídos,
que é onde reviews costumam falhar.
