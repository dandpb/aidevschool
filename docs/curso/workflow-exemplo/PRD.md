# PRD — Exportação CSV de tarefas concluídas

## Problema

Um usuário autenticado consegue concluir tarefas, mas não consegue levar um recorte das tarefas
concluídas para um relatório pessoal ou uma planilha.

## Usuário

Uma pessoa autenticada que quer exportar somente as próprias tarefas concluídas.

## Objetivo

Disponibilizar um núcleo de exportação que gere CSV determinístico com `id`, `title`,
`completed_at` e `priority`, sem misturar dados de outros usuários.

## Escopo desta fatia

- Filtrar tarefas pelo usuário autenticado.
- Filtrar somente `status == completed`.
- Ordenar por `completed_at` descendente.
- Emitir cabeçalho e linhas CSV.
- Escapar vírgulas, aspas e quebras de linha usando a biblioteca padrão.
- Cobrir o comportamento com testes automatizados.

## Fora de escopo

- Endpoint HTTP, banco de dados e autenticação real.
- Exportação XLSX.
- Paginação, filtros avançados ou agendamento.
- Sanitização específica para fórmulas de planilhas.

## Critérios de aceite

- [ ] Uma tarefa de outro usuário nunca aparece no resultado.
- [ ] Tarefas pendentes nunca aparecem no resultado.
- [ ] O cabeçalho é `id,title,completed_at,priority`.
- [ ] Campos com vírgula, aspas ou quebra de linha são serializados como CSV válido.
- [ ] A ordem é da conclusão mais recente para a mais antiga.
- [ ] Lista vazia ainda retorna o cabeçalho.
- [ ] Tarefa concluída sem `completed_at` falha explicitamente.
- [ ] O comportamento é exercitado sem dependências externas.

## Riscos

- Um filtro de posse incompleto pode vazar dados entre usuários.
- Concatenar strings manualmente pode produzir CSV inválido.
- O núcleo puro não prova sozinho a integração com HTTP ou banco; isso fica registrado como próxima fatia.
