# Pacote de contexto — exportação CSV

Este arquivo mostra o que entra no contexto de uma tarefa e o que fica de fora.

## Objetivo

Implementar o núcleo de exportação de tarefas concluídas em CSV para um `user_id` autenticado,
sem acessar rede, banco ou credenciais.

## Regras relevantes

- A posse é determinada por `owner_id == user_id`.
- Somente `status == completed` entra no resultado.
- O CSV possui quatro colunas fixas.
- Campos livres devem ser escapados pela biblioteca CSV.
- Dados ausentes devem falhar explicitamente quando o contrato exigir.

## Arquivos incluídos

- `PRD.md` — problema, usuário, escopo e critérios de aceite.
- `SPEC.md` — interface, erros, regras e testes.
- `PLAN.md` — fatias aprovadas de execução.
- `export_tasks.py` — implementação do núcleo puro.
- `test_export_tasks.py` — cenários executáveis.

## Arquivos excluídos

- banco de dados e migrations;
- endpoint HTTP e middleware de autenticação;
- dependências externas;
- build output, cache e logs;
- segredos e variáveis de ambiente;
- qualquer código de UI.

## Por que este pacote é suficiente

A pergunta desta fatia é sobre filtro, ordenação, escaping e erros do serializador. HTTP e banco
seriam contexto necessário para uma próxima fatia, mas incluí-los agora aumentaria a superfície
sem aumentar a prova do núcleo. O limite é intencional e está registrado na spec.

## Critério de seleção

Um arquivo entra quando muda diretamente a decisão ou o comportamento desta etapa. Um arquivo
fica de fora quando só seria útil para uma integração ainda não especificada.
