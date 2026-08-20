---
name: auditar-workflows
description: Audita a biblioteca de workflows reexecutando o bloco "Como reproduzir" de cada RESULTADO.md. Use quando pedirem para checar se os fluxos ainda funcionam, após mexer em qualquer demo ou comando, antes de atualizar a página, ou em manutenção periódica.
---

# Auditar a biblioteca de workflows

1. Rode `node tools/auditar-workflows.mjs` a partir de `dev-workflow-claude/`.
2. **Exit 0** — nada a fazer; cole o relatório na resposta e pare.
3. Para cada **FALHA**, leia o `RESULTADO.md` do fluxo, reexecute o bloco linha a
   linha e classifique a causa:
   - **demo quebrou** (código/teste) → conserte a causa raiz no `demo/`;
   - **evidência desatualizada** (números mudaram de verdade) → reexecute o fluxo
     e atualize o `RESULTADO.md` com a saída nova — nunca edite números na mão;
   - **bloco frágil** (caminho absoluto, dependência de estado externo) → conserte
     o bloco, mantendo-o dentro da regra 2 do `CLAUDE.md`.
4. Depois de consertar, rode a auditoria de novo até exit 0 e peça o veredito à
   skill `verificar-workflow` — produtor ≠ verificador vale para manutenção também.
5. Se um número citado na página mudou, aplique a regra 5 do `CLAUDE.md`
   (atualize a linha da tabela e o card do fluxo com a saída nova).

Nunca: fabricar saída, enfraquecer o bloco de reprodução para ele passar, ou
remover ressalvas registradas pelo verificador.
