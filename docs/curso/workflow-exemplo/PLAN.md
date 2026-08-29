# Plano de execução — exportação CSV

## Plan Mode (sem editar)

### Diagnóstico

A fatia precisa de um núcleo puro. Não há necessidade de servidor, dependência nova ou acesso
a um banco para provar as regras centrais de autorização e serialização.

### Arquivos permitidos

- `export_tasks.py`
- `test_export_tasks.py`
- `PRD.md`, `SPEC.md`, `CONTEXTO.md`, `PLAN.md`, `VALIDACAO.md`
- `skills/exportar-csv-seguro.md`

### Etapas aprovadas

1. Criar testes comportamentais para filtro de posse, status, cabeçalho, ordem, escaping,
lista vazia e data ausente.
2. Implementar `export_completed_tasks` com a biblioteca `csv` da biblioteca padrão.
3. Executar a suíte específica e corrigir somente falhas ligadas ao contrato.
4. Fazer revisão curta de risco: vazamento de dados, concatenação CSV, escopo e limites.
5. Registrar a evidência e transformar o padrão em skill reutilizável.

### Critérios de parada

- Parar se a implementação exigir banco, rede ou dependência externa.
- Parar se a posse não puder ser determinada pela entrada.
- Parar se a spec precisar inventar o contrato HTTP.

### Critérios de aceite

- Todos os testes do arquivo específico passam.
- O cabeçalho permanece presente para lista vazia.
- A ordem é descendente por data.
- Campos especiais são escapados pelo módulo `csv`.
- Nenhuma tarefa de outro usuário aparece.
- A validação declara explicitamente que HTTP/banco estão fora do escopo.
