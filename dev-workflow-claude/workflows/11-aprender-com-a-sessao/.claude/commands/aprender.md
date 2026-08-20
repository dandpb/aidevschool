---
description: Retro da sessão — destila erros em regras permanentes no CLAUDE.md e, quando possível, em checagem executável plugada no npm test
---

# /aprender — retro que vira regra

Feche o loop de aprendizado desta sessão: cada erro cometido vira uma regra permanente
no CLAUDE.md do projeto e, quando automatizável, uma checagem executável.
**Regra que não roda, se esquece.**

Foco opcional passado pelo usuário (se vazio, revise a sessão inteira): $ARGUMENTS

## Passos

1. **Revisar a sessão.** Releia a conversa (ou a transcrição indicada em $ARGUMENTS) e liste
   cada ponto onde o agente: errou, repetiu um erro já cometido, ou precisou de correção
   humana para prosseguir. Para cada ponto, anote o que aconteceu e qual comportamento
   teria evitado o problema.

2. **Destilar cada lição em regra.** Uma linha por regra, começando com verbo no imperativo,
   verificável (deve ser possível dizer objetivamente se foi cumprida ou não).
   Descarte lições vagas ("ser mais cuidadoso") — se não dá para verificar, não é regra.

3. **Atualizar o CLAUDE.md do projeto.** Adicione as regras na seção de regras existente
   (ou crie uma seção `## Regras aprendidas`). Antes de gravar, mostre ao usuário o diff
   antes/depois do CLAUDE.md e aguarde nenhuma objeção óbvia no contexto.

4. **Automatizar o que der.** Para cada regra que pode ser checada por script, adicione uma
   checagem em `tools/checar-regras.sh` (crie o arquivo se não existir: `set -euo pipefail`,
   uma função por regra, saída clara `OK`/`FALHA`, exit 1 em qualquer falha). Plugue o script
   no `npm test` (ex.: `"test": "bash tools/checar-regras.sh && node --test"`) ou no comando
   de teste equivalente do projeto, para que rode em toda execução de testes.

5. **Validar a checagem (obrigatório).** Para cada checagem nova:
   a. Plante uma violação mínima da regra e rode o script — ele DEVE falhar (exit != 0).
   b. Remova a violação e rode de novo — ele DEVE passar (exit 0).
   Cole as duas saídas como evidência. Checagem que não foi vista falhando não conta.

6. **Resumo final.** Liste: regras adicionadas ao CLAUDE.md, checagens criadas em
   `tools/checar-regras.sh`, e lições que ficaram só como regra textual (com o motivo de
   não serem automatizáveis).
