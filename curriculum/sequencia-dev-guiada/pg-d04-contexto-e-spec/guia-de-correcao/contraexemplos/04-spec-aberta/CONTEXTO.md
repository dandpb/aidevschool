# CONTEXTO — pacote selecionado para a tarefa (modelo, repo fictício `rodadia`)

## Objetivo do pacote

Tornar inequívoca a tarefa de ordenar o plano do dia por `depends_on` com
duração total — e **só** ela (ver PRD: limite 30 min).

## Incluído

| Item | Por quê |
| --- | --- |
| `PEDIDO.md` | A necessidade em palavras da própria Bia: origem das entregas embutidas e das decisões implícitas |
| `AGENTS.md` | Regras permanentes do repo (classe "permanente" do M4 §4.1): valem para qualquer mudança, inclusive esta |
| `plano.py` | Onde a ordenação atual vive (ordem de inserção): é o arquivo que a tarefa muda |
| `tarefa.py` | Modelo `Tarefa` (`id`, `depends_on`, `duracao_min`): a interface de dados que a ordenação consome |
| `CONTRATO.md` | Contrato visível do comportamento atual: o que não pode quebrar tem que estar escrito, não subentendido |
| `testes/teste_plano.py` | Suíte existente do plano: rede de segurança e molde dos testes novos (M4 §4.2 ④) |
| `exemplos/tarefas.json` | Amostra fixa usada pela suíte: entrada determinística para aceitar e testar offline |

## Excluído

| Item | Por quê |
| --- | --- |
| `cli.py` | A chamada existente continua válida: a SPEC preserva a interface do plano; mudar CLI não é desta tarefa |
| `testes/teste_tarefa.py` | Cobre o modelo, que não muda; citar aqui seria contexto sem efeito na decisão |
| `docs/` | A renomeação para `archive/` é entrega embutida que o PRD cortou (Fora de escopo); fora do escopo, fora do pacote |
| `relatorios/plano.view.md` | View gerada (M4 §4.4: artefato derivado pode mentir); a fonte (`plano.py`) é quem entra |
| `logs/app.log` | Log integral, sem recorte; nenhum erro deste pedido mora nele (não é bug) |
| `node_modules/`, `package-lock.json`, `.venv/`, `build/` | Dependências/ambiente/build: ruído que compete por atenção (M4 §4.2) |
| `.env.example` | Segredo/ambiente: não é contrato de comportamento e não entra em pacote de contexto |
| `.git/` (347 commits) | Histórico completo não muda esta feature; nada a justificar incluir |
| `apps/mobile/`, `infra/k8s/deploy.yaml` | Sem relação com o planejador de tarefas do CLI |

## Regra aplicada (M4 §4.4)

> Se você não consegue justificar por que um arquivo entra, ele não entra.
> Contexto grande não é contexto bom.
