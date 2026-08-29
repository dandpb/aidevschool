# Skill — Exportar dados em CSV com segurança

## Quando usar

Use quando uma feature precisa exportar entidades existentes para CSV sem misturar dados de
usuários e sem quebrar campos que contenham delimitadores.

## Entrada mínima

- entidade e campos permitidos;
- identidade do usuário autenticado;
- regra de posse/autorização;
- ordenação esperada;
- casos de borda;
- comando de teste.

## Procedimento

1. Escreva PRD e spec antes de escolher a implementação.
2. Filtre posse e escopo antes de serializar.
3. Use uma biblioteca CSV; não concatene strings manualmente.
4. Defina o cabeçalho como contrato estável.
5. Cubra outro usuário, status não elegível, lista vazia, vírgulas, aspas, quebras de linha e
campos obrigatórios ausentes.
6. Rode teste específico e suíte do projeto.
7. Declare se HTTP, banco, paginação e proteção contra fórmulas de planilha ficaram fora do escopo.
8. Registre a evidência e atualize a skill somente com o que foi realmente verificado.

## Checklist de saída

- [ ] posse validada;
- [ ] somente colunas permitidas;
- [ ] escaping coberto por teste;
- [ ] ordenação coberta;
- [ ] lista vazia coberta;
- [ ] erro de dado obrigatório coberto;
- [ ] comando de validação executado;
- [ ] limites documentados.
