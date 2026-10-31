# Piloto e distribuição — proposta, não executada

## Superfícies observadas nesta cópia

| Alvo | Evidência local | Carregamento e implantação |
| --- | --- | --- |
| Codex neste ambiente | `/opt/codex/bin/codex`, CLI `0.159.0-alpha.3`; raiz `AGENTS.md` e `.agents/skills/` | O processo atual tem ferramenta para subagente em contexto novo. Descoberta do EGM não testada; a lista de skills desta sessão é gerida pelo host. Piloto CLI isolado abaixo não altera essa lista nem comprova adoção de outros agentes. |
| Claude Code raiz | `CLAUDE.md`, `.claude/skills/`, `.claude/settings.json` | Árvore e hooks presentes no repo; executável `claude` ausente neste ambiente. Máquina, versão, carregamento e instalação reais desconhecidos. |
| MiniMax Evolution Engine | `engines/miniMaxEvolutionEngine/CLAUDE.md`, `.claude/agents/`, supervisor `autonomous.py` | O supervisor usa um adaptador Claude, cwd na raiz e passa contratos específicos; seus controles e fase autônoma restrita continuam valendo. Não há prova de que carregue a nova orientação nem de EGM disponível. Não ativar supervisor para testar. |
| Cursor e Windsurf | `.cursor/skills/`, `.windsurf/skills/`; `scripts/skill_vendored_guard.py` mapeia cópias de harness-eval | São superfícies de arquivos, não inventário de executores nem evidência de que plugins EGM sejam suportados. Nenhuma instalação proposta sem descobrir runtime e mecanismo. |
| Factory | `factory/coordinator.py` executa comando do autor em worktree; `factory/verify.py` usa worktree de verificação | O comando/cliente de cada execução é variável; o repo no commit selecionado deve conter a orientação e o executor deve carregá-la. Sem evidência de runtime ou distribuição efetiva. |
| Paperclip / OpenCode local | Inventário autenticado preliminar reportado pela investigação paralela: 24 agentes usam adapter OpenCode local. CEO e Founding Product Engineer têm instruções Managed e entradas `AGENTS.md` em raízes próprias; para o CEO, `/paperclip/instances/default/companies/f2527e0b-9532-456c-bef8-b7380cd34f9c/agents/501cb456-b786-4d67-b951-6c71e0f0915d/instructions`. A UI Skills indica compartilhamento do diretório Claude `~/.claude/skills` no workspace; CEO tem zero skills selecionadas na biblioteca da empresa. | Essas superfícies são distintas do checkout deste ambiente e não demonstram instalação ou carregamento. Os 24 adapters não provam 24 workspaces ou máquinas distintos. Identificar o mecanismo de atualização gerenciada e a resolução real dos diretórios por agente; testar versão carregada e contexto novo. Destinos e comandos para os demais agentes ainda não foram verificados. Não acessar o VPS por atalhos, nem mudar modelos. |
| Projeto Paperclip Onboarding | Investigação paralela reporta único projeto, sem repo configurado; pasta local gerenciada `/paperclip/instances/default/projects/f2527e0b-9532-456c-bef8-b7380cd34f9c/3cbab3d6-45a5-478c-9212-e1484aacbb04/_default`; isolated task checkouts desligado. | Essa pasta é alvo separado do checkout cloud; não presumir sincronização dos arquivos. O domínio do Paperclip não identifica a máquina executora. Mecanismo de distribuição e permissões seguem em investigação. |
| Outras máquinas, IDEs e tutores | Referências documentais e contratos existem no repo | Inventário de máquinas, configuração de cada agente, versão recebida e capacidade de contexto novo são desconhecidos. Não acessar por atalhos nem presumir propagação. |

`setup.sh` prepara dependências de apps; não distribui plugins aos agentes.
`.agents/.skill-lock.json` e `scripts/skill_vendored_pins.json` protegem uma
skill vendorizada específica: não adicionar EGM ou atualizar todas as skills
sem um mecanismo examinado e verificável. `skills-lock.json` também não prova
instalação. O conteúdo Git deste diff precisa seguir revisão e entrega normais
antes de outras cópias poderem recebê-lo.

## Piloto Codex: solicitação específica de autorização

Proposta **não executada**: obter o repositório completo EGM
`google/elephant-goldfish-model` no commit
`403d8881d62022490637d740657b33f01e321ea8` (Apache-2.0; manifestos,
skills, personas, padrões e demais arquivos do repositório; há scripts, mas
nenhum script do repositório é invocado explicitamente). Registrar o marketplace
local e instalar `egm@egm` pelo Codex CLI apenas no `CODEX_HOME` isolado
`/workspace/aidevschool/.scratch/egm-codex-pilot`; o checkout de origem fica em
`/workspace/aidevschool/.scratch/egm-upstream-403d8881`. Esses diretórios são
ignorados pelo Git. A instalação ativa instruções de terceiros: requer a
confirmação específica do proprietário antes de executar os comandos abaixo.
Não altera o home global nem copia credenciais. Se algum destino já existir,
parar e inspecionar; não remover ou sobrescrever dados.

```sh
(
set -eu
cd /workspace/aidevschool
test ! -e .scratch/egm-upstream-403d8881
test ! -e .scratch/egm-codex-pilot
git clone --no-checkout https://github.com/google/elephant-goldfish-model.git .scratch/egm-upstream-403d8881
git -C .scratch/egm-upstream-403d8881 checkout --detach 403d8881d62022490637d740657b33f01e321ea8
test "$(git -C .scratch/egm-upstream-403d8881 rev-parse HEAD)" = 403d8881d62022490637d740657b33f01e321ea8
egm_status="$(git -C .scratch/egm-upstream-403d8881 status --porcelain)"
test -z "$egm_status"
mkdir -m 700 .scratch/egm-codex-pilot
CODEX_HOME=/workspace/aidevschool/.scratch/egm-codex-pilot codex plugin marketplace add /workspace/aidevschool/.scratch/egm-upstream-403d8881 --json
CODEX_HOME=/workspace/aidevschool/.scratch/egm-codex-pilot codex plugin add egm@egm --json
CODEX_HOME=/workspace/aidevschool/.scratch/egm-codex-pilot codex plugin list --json
)
```

O bloco para se um comando falhar ou se o checkout não estiver limpo. Registre
as saídas, incluindo o `installedPath` retornado, e
confira que o destino real fica sob o home isolado; se não, pare. Confirme no
destino a presença de `skills/`, `agents/`, `resources/document_standards/`,
`docs/` e `LICENSE`, e compare os arquivos instalados aos do checkout fixado.
Ausência, divergência ou instalação fora do destino é falha, não PASS. Os
comandos e o comportamento ainda não foram testados neste ambiente. O home
isolado pode não ter autenticação para abrir uma sessão: não criar, copiar ou
alterar credenciais; registrar o bloqueio e buscar o caminho autorizado.

## Teste de descoberta e smoke após instalação autorizada

1. Em uma **nova sessão** do Codex usando o mesmo `CODEX_HOME`, na raiz do
   projeto, conferir no seletor a descoberta de `egm-review` e seu caminho
   absoluto instalado; `plugin list` sozinho prova apenas o registro. Confirmar
   que o caminho da skill resolve os recursos relativos do mesmo pacote.
2. Criar apenas um documento descartável em `.scratch/egm-smoke/design.md`:
   “Serviço de notificações aceita eventos e entrega por webhook. Clientes
   podem repetir uma requisição após timeout. O sistema deve entregar uma
   notificação por evento. Não há persistência entre reinícios especificada.”
   Não informar a conclusão esperada ao revisor. Solicitar explicitamente
   `egm-review` para esse arquivo, sem fontes adicionais, com a etapa 7
   (crítica de design), artefatos em `.scratch/egm-smoke/` e revisores em
   sequência, mantendo o limite global vigente de quatro agentes. Usar uma
   sessão interativa do CLI, por exemplo:

   ```sh
   CODEX_HOME=/workspace/aidevschool/.scratch/egm-codex-pilot codex -C /workspace/aidevschool
   ```

3. A prova exige registros reais de descoberta e do uso da skill, spawn em
   contexto novo sem histórico (`fork_turns: "none"` quando essa for a schema),
   leitura da persona e do documento pelo revisor, conclusão real do revisor e
   relatório que identifique concretamente o risco de duplicação/idempotência
   e a persistência indefinida. Não passar a conclusão esperada no pedido ao
   filho. Faltas de autenticação, isolamento, leitura, conclusão ou acesso ao
   pacote tornam o teste incompleto; uma declaração do produtor não é prova.
   O resultado prova somente o piloto e a etapa exercitada, não todo o fluxo
   EGM nem adoção global. A revisão normal de segurança, autorização e merge
   do projeto continua separada.

Para os demais alvos: identificar máquina autorizada, usuário de serviço,
runtime/versão, cwd, origem das instruções, capacidade de subagentes e destino
real; propor comandos fixados e escopo próprios antes da confirmação. Após a
instalação, registrar revisão, caminho, versão/digest e evidência de descoberta
e smoke independente para cada alvo. Não executar os comandos de Codex nesses
alvos por analogia.
