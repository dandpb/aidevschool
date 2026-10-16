# R9: orientar edição de cópias portáteis

Origem: delegação do Dani de 2026-10-04, após aceite de R7. Autorizado:
documentação não protegida útil sobre fontes, cópias e contratos de paridade;
sem runtime, testes, scripts, hooks, arquitetura ou publicação.

HEAD `b9f77774643b94bfd9fafbd756a1b17482c33e45`, branch `work`. R5/R7 e
preparação R2a já existem no working tree; preservar todos os artefatos.
R2a está autorizada no recorte específico, mas bloqueada pela transferência
técnica. Não repetir materialização nem reconstruir os patches.

## Lacuna observada e resultado

O README MVP descreve a fronteira de mastery; seu teste de paridade descreve
quatro espelhos do runtime. Guard, lock e pins descrevem as três cópias de
harness-eval. Falta no handbook uma rota que classifique os dois mecanismos e
indique onde editar. Produzir mapa de navegação com links a essas fontes,
sem inventar gerador ou fonte principal entre cópias vendorizadas pares.

O comentário de core.py menciona byte-for-byte, mas o teste compara definições
AST e permite diferenças de imports/docstrings/formatação. Documentar o que o
check realmente prova; não corrigir runtime/comentários neste recorte.
