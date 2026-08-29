# Spec técnica — núcleo de exportação CSV

## Estado atual

Não existe um módulo no exemplo que transforme tarefas em um arquivo CSV. O caso será isolado
em Python com biblioteca padrão para ser executável offline e fácil de verificar.

## Interface

```python
export_completed_tasks(tasks: Iterable[Mapping[str, object]], user_id: str) -> str
```

### Entrada

Cada tarefa pode conter:

- `id`: identificador;
- `owner_id`: dono da tarefa;
- `status`: `completed` ou outro status;
- `title`: título livre;
- `completed_at`: data/hora ISO 8601;
- `priority`: prioridade, opcional com default `normal`.

`user_id` identifica o usuário autenticado já resolvido pelo chamador.

### Saída

Texto UTF-8 lógico com final de linha `\n`, cabeçalho fixo e colunas nesta ordem:

```text
id,title,completed_at,priority
```

As linhas são filtradas para `owner_id == user_id` e `status == completed`, e ordenadas por
`completed_at` descendente.

### Erros

- `ValueError` para `user_id` vazio.
- `ValueError` quando uma tarefa elegível não possui `completed_at` não vazio.

## Regras de segurança e integridade

1. A posse é filtrada antes da serialização.
2. Nenhuma coluna fora do contrato é exportada.
3. A serialização usa `csv.DictWriter`, nunca concatenação manual.
4. O módulo não acessa rede, disco, ambiente ou credenciais.

## Fatias

1. Escrever testes para filtro, cabeçalho, ordenação, escaping e erro.
2. Implementar a função pura mínima.
3. Rodar a suíte específica e revisar o diff.
4. Registrar limites e promover o procedimento para uma skill.

## Verificação

```bash
python3 -m pytest docs/curso/workflow-exemplo/test_export_tasks.py -q
```

A integração com endpoint/banco não é afirmada por esta spec. Ela é uma próxima fatia que
reutilizaria o núcleo depois de existir um projeto com esses componentes.
