# Entrada independente com recomendação de engines TypeSafe

> Próximo executor: **tlc-implement** (`.codex/skills/tlc-implement`). Cada critério vira uma prova por número. **Aprovada para implementação local.** Daniel delegou o fechamento das recomendações e dos detalhes técnicos/visuais com “siga com as recomendaçoes” e “aprovado”. O checklist .checks/engine-entry-recommender.md registra as resoluções antes do código.

## Intent

O aluno precisa escolher uma experiência do ecossistema sem conhecer os nomes e papéis das engines. O operador precisa controlar quais destinos estão disponíveis para todos. O registro atual do OS possui uma lista pública fixa e não cobre todas as engines presentes no repositório. A descoberta não mediu tempo perdido, uso ou taxa de encaminhamento inadequado; não há alegação quantitativa de impacto.

A nova entrada independente recebe uma descrição, consulta liberação global e funcionamento automático e usa TypeSafe para apresentar até três engines próximas do pedido. O aluno entra sem conta e escolhe “Começar”; o operador administra a liberação numa interface restrita. Falha do TypeSafe mostra o catálogo disponível inteiro. Fonte funcional: [descoberta](../.design/engine-entry-recommender.md). Referência visual selecionada sob delegação: `engines/school-entry/DESIGN.md` e `docs/entry-concept.png`. O resumo em `.lavish/engine-entry-discovery/index.html` é apenas revisão documental.

**14 critérios originais em 5 slices; resoluções complementares no checklist aprovado. Restam 2 pendências de publicação, sem bloqueio de implementação local.**

Ambiente confirmado por Daniel: preparar a primeira versão para acesso público pela internet, mantendo a publicação efetiva para uma etapa posterior. Uma solução restrita a localhost não satisfaz essa direção; domínio e provedor continuam pendentes. Essa confirmação não responde aos demais itens de Unresolved.

Uma tarefa para a fonte inteira. Os cinco slices abaixo são resultados observáveis, não tarefas de frontend/backend/banco separadas. Base de dimensionamento: a skill aplicada determina uma tarefa por fonte; as convenções consultadas não estabelecem tamanho diferente. A consulta ao tracker retornou duas issues abertas sobre CI e divergências de catálogo, sem evidência suficiente para uma convenção de tamanho. Não se inferiu tamanho de tarefas pelo histórico de PRs. O escopo é amplo porque identidade administrativa, estado global e disponibilidade ainda precisam de contratos; nenhum requisito de migração em produção ou segunda equipe foi demonstrado para forçar a divisão. O trabalho pode ser dividido em PRs revisáveis depois que os bloqueios forem resolvidos.

## Criteria

Os nomes A, B, C e D abaixo são identidades distintas de fixtures, não novas engines. “Disponível” significa liberação manual E checagem automática aprovada segundo o contrato definido em Resolved 2. Composição de ranking e qualidade do modelo são provas diferentes.

### Operador controla a oferta para todos os alunos

1. Ao abrir a administração com acesso de operador sobre o inventário inicial verificado em Sources, a lista apresenta 13 engines, uma por raiz listada, com nome e controle de liberação individual. `shared` e caches não são engines. Esse inventário prova cobertura da administração, não disponibilidade pública; autoridade de manutenção futura permanece em Resolved 4.
2. Após o operador salvar A como bloqueada e B como liberada, duas sessões de aluno distintas que consultem a oferta veem a mesma liberação de A e B; não há configuração individual por aluno ou turma. Autorização e armazenamento globais dependem de Resolved 3.
3. Após o operador salvar uma mudança de liberada para bloqueada, a próxima pergunta consulta esse novo valor: A deixa de ser candidata, mesmo que tenha aparecido na pergunta anterior. O filtro de elegibilidade aplica a liberação corrente; invalidação durante uma pergunta já em andamento é Resolved 10.

### Aluno recebe apenas destinos elegíveis

4. Um aluno sem sessão de autenticação consegue abrir a entrada independente e enviar sua descrição, inclusive quando a aplicação é servida em uma origem HTTP(S) de teste diferente de localhost; não precisa entrar no CodexDojo OS para alcançar esse fluxo. Essa prova exige configuração compatível com acesso público, não a publicação efetiva ou compra de domínio.
5. Na mesma consulta, com A liberada/checagem aprovada, B bloqueada/checagem aprovada e C liberada/checagem reprovada, o conjunto elegível contém somente A. O filtro determinístico da conjunção precede a composição de recomendações e fallback; o contrato da checagem é Resolved 2.
6. Quando uma engine liberada não possui resultado de funcionamento que satisfaça o contrato aprovado, ela não aparece como disponível. O filtro exige aprovação da checagem; cada consulta e clique exige nova checagem de até10s; ausência, erro e timeout são excluídos conforme Resolved 2.

### Aluno compara até três recomendações próximas do pedido

7. Dada uma descrição e candidatos elegíveis, uma execução de integração realiza uma chamada real à API TypeSafe e usa seus julgamentos para compor os resultados; recibo de teste identifica candidatos enviados, respostas, modelo e consumo sem incluir a chave. Os testes sintéticos anteriores não substituem essa prova sobre engines. A rubrica deve julgar a proximidade com o pedido sobre capacidades verificadas; sua redação e fixtures são trabalho de engenharia. Limiar que exclua todas as opções altera o caso de produto de Resolved 1 e não pode ser presumido.
8. Com quatro candidatos adequados A, B, C e D e julgamentos válidos que os ordenam nessa sequência, a página apresenta exatamente A, B e C nessa ordem. Essa fixture prova a composição do top três, não a correção semântica da inferência.
9. Com somente dois candidatos disponíveis e adequados A e B, a página apresenta duas opções; não cria um terceiro destino. Identidades exibidas vêm do conjunto elegível, não de URLs ou nomes gerados pelo modelo.
10. Cada opção recomendada apresenta o nome da engine, um motivo curto e a ação “Começar”. O motivo deve corresponder a uma capacidade documentada da engine e ao pedido; copy e forma visual dependem de Resolved 5. A prova usa exemplos com capacidades identificáveis na fonte para verificar os motivos, sem tratar probabilidades altas como prova de verdade.

### Aluno escolhe a engine para iniciar

11. Exibir as recomendações mantém o aluno na entrada; acionar “Começar” na opção B leva ao destino configurado de B. O destino vem do catálogo, não da resposta livre do provedor. A verificação adicional no instante do clique permanece em Resolved 10.

### Entrada continua útil sem recomendação personalizada

12. Com quatro engines disponíveis A, B, C e D, quando a chamada TypeSafe termina em falha, a página mostra as quatro, cada uma com descrição e ação de acesso, sem apresentar a lista como recomendação personalizada. O prazo e a classificação operacional de falha estão em Resolved 12; a ordem do catálogo está em Resolved 14.
13. Com A disponível e B bloqueada, quando TypeSafe falha, o fallback mostra somente A. A mesma filtragem de liberação e funcionamento usada na recomendação é aplicada ao fallback; falhar o modelo não remove o filtro.
14. Com zero engines disponíveis, a entrada informa que não há engines disponíveis e apresenta zero ações de acesso a engines. Falha ao consultar a configuração não equivale a uma consulta bem-sucedida com conjunto vazio; esse estado está em Resolved 9.

## Out of scope

- Gerar atividades, aulas ou exercícios — o objeto escolhido é a engine.
- Executar ou incorporar engines na entrada — o usuário escolheu encaminhamento por botão.
- Alterar gates, mastery, currículo, progresso ou sincronização entre engines — recomendação não tem essa autoridade.
- Permissões por aluno/turma — a liberação confirmada é global.
- Limitar a oferta a programação ou a quinze minutos — foram exemplos, não limites do produto.
- Migrar todos os consumidores do catálogo do OS — nenhuma migração global foi confirmada.
- Reutilizar a flag `operator=1` como autenticação — ela apenas seleciona a interface existente.
- Publicar, trocar domínio ou redirecionar entradas atuais — não autorizado neste planejamento; Unresolved 6 trata preparação para lançamento.
- Instalar serviços de monitoramento, comprar infraestrutura ou cadastrar operadores — nenhuma contratação ou conta foi autorizada.
- Alterar a integração TypeSafe em `learner/substrate/` — trabalho concorrente com outra responsabilidade.

## Observable

| Surface | Decision | Landing |
|---|---|---|
| Tela de entrada | empty state: zero disponíveis | 14 |
| Tela de entrada | empty state: descrição vazia | Resolved 8 |
| Tela de entrada | loading | Resolved 9 |
| Tela de entrada | error: TypeSafe | 12, 13; prazo em Resolved 12 |
| Tela de entrada | error: disponibilidade não consultável | Resolved 9 |
| Tela de entrada | unauthorised | 4 — autenticação não exigida do aluno |
| Tela de entrada | density | 8, 9, 10; desenho em Resolved 5 |
| Tela de entrada | ordering | 8; empate em Resolved 14 |
| Tela de entrada | destructive action confirms | n/a — não há ação destrutiva do aluno |
| Tela de entrada | nenhuma correspondência com engines disponíveis | Resolved 1 |
| Administração | empty state | Resolved 4 e 9 — distinguir inventário vazio de erro de leitura |
| Administração | loading | Resolved 9 |
| Administração | error de salvamento | Resolved 9 |
| Administração | unauthorised | Resolved 3 — sessão no servidor e CSRF definidos |
| Administração | density | 1; desenho em Resolved 5 |
| Administração | ordering | Resolved 14 |
| Administração | destructive action confirms | n/a — exclusão não faz parte do escopo; confirmação de bloqueio reversível em Resolved 9 |
| API interna da entrada/painel | response shape | Resolved 8 — contratos definidos no checklist Landing |
| API interna da entrada/painel | error shape e códigos | Resolved 8 |
| API interna da entrada/painel | who may call | 4; mutações restritas em Resolved 3 |
| API interna da entrada/painel | versioning | Resolved 8; não há contrato público para terceiros confirmado |
| API interna da entrada/painel | rate limit | Resolved 12 |
| Checagem automática | comando/agendamento, formato e verbosidade | Resolved 2 — sob demanda; não há CLI ou agendamento de health exposto |
| Checagem automática | flags/defaults, exit codes e falha parcial | Resolved 2; n/a para flags/exit: não há CLI de health |
| Copy de recomendação | structure | 10 — nome, motivo curto, Começar |
| Copy de recomendação | tone | Resolved 5 |
| Copy de recomendação | depth | 10 — motivo curto; sem tamanho em caracteres inventado |
| Copy de recomendação | next action | 11 |
| Copy do fallback | estrutura, tom, profundidade | 12; copy final em Resolved 5 |
| Copy do fallback | next action | 12 — escolher engine disponível |
| Catálogo organizado | grouping | 5, 6 — elegibilidade; agrupamento visual em Resolved 14 |
| Catálogo organizado | naming | 1 e inventário em Sources; manutenção em Resolved 4 |
| Catálogo organizado | ordering | 8; fallback/admin em Resolved 14 |
| Catálogo organizado | duplicates | Resolved 4 — conciliar entradas locais, hospedadas e aliases |
| Catálogo organizado | exception: engine sem destino acessível | Resolved 2 e 4 — existir no disco não concede disponibilidade |

## Swept

- validation: Resolved 8 — entrada, payload, metadados e resposta externa possuem limites e formatos no checklist.
- failure modes: 12–14 cobrem falha TypeSafe e oferta vazia; Resolved 9 cobre falha de leitura e salvamento.
- idempotency and retry: Resolved 10 — repetição de salvamento e respostas tardias não estão resolvidas por uma prova de filtragem.
- authorization: 4 para leitura anônima; Resolved 3 para autorização de mutações. A flag do OS e o bridge local não protegem esta nova aplicação.
- concurrency and ordering: 3 cobre consulta posterior ao save; Resolved 10 cobre atualizações concorrentes, perguntas sobrepostas e clique posterior à desativação. Não usar 3 como prova desses casos.
- data lifecycle: Resolved 11 — inicialização, persistência, remoção de engines e retenção da descrição.
- external-dependency failure: 12, 13; Resolved 2 para timeout de checagem e Resolved 12 para prazo/limites TypeSafe.
- state transitions: 2, 3 para liberação salva e nova consulta; 12 para recomendação→fallback; 14 para oferta vazia; Resolved 2 e 10 para validade e transições concorrentes.
- observability: Resolved 13 — diagnóstico da recomendação, checagem e alteração global; nenhuma meta de uptime ou latência foi confirmada.

## Impact

| Front | What changes |
|---|---|
| domain | Novo significado de negócio “disponível para recomendação”: liberação global E funcionamento automático aprovado. O nome persistido depende de Resolved 3/4. |
| domain | `EngineUrlState.kind === 'ready'` continua significando URL resolvida no OS. `EmbeddedEngine` e demais consumidores atuais não passam a interpretar isso como checagem de saúde. |
| domain | `engine.ready` no protocolo de missões confirma handshake; não será promovido silenciosamente a certificado universal de funcionamento. |
| domain | `mastered`, `portfolioStatus`, prontidão por jornada e liberação administrativa permanecem fatos separados. |
| stored data | Novo estado global de liberação e identidade de catálogo: esquema engine_release registrado no checklist. Nenhuma migração de learner state ou backfill de disponibilidade por diretório está autorizado. |
| consumers | Registro e allowlist do OS são referência, não substituto automático para o inventário completo. `sdlc-quest` evidencia a diferença de cobertura; o registro chama Z.ai de vazio, mas a raiz agora tem fonte versionada. Isso não prova publicação de nenhum dos dois. |
| user-facing entry | Acrescenta porta independente; endereços existentes permanecem válidos até decisão de lançamento. |
| external service | TypeSafe passa a receber descrição e metadados de candidatos; a chave precisa permanecer no servidor conforme a skill aplicada. Não enviar learner state canônico como contexto implícito. |
| documentation | Descoberta e MANIFEST apontam para esta tarefa, distinguindo proposta de superfície implementada. |
| concurrent work | Alterações já presentes em `learner/substrate/` e projeções não pertencem a esta tarefa. |

## Decided

| Decision | Shape | Alternative rejected |
|---|---|---|
| Dependência externa para julgamento | TypeSafe HTTP `POST https://api.typesafe.ai/v1/systemone`; autenticação `Authorization: Bearer` com credencial de servidor; `state` e `questions` conforme contrato oficial. Versão do modelo não congelada. | Fornecedor diferente ou recomendação apenas estática não entrega a integração explicitamente solicitada. |

As portas adicionais descobertas na implementação estão no Landing de `.checks/engine-entry-recommender.md`, sob a delegação explícita de Daniel; não são inferidas do silêncio.

## Sources

- [Descoberta](../.design/engine-entry-recommender.md) — fonte de escopo; somente itens confirmados em Journey/Decisions viraram critérios. Propostas da descoberta permanecem em Unresolved.
- Conversa sem endereço externo: “a ideia eh entender qual engine recomendar baseado na descricao do aluno”; “Todos os alunos”; “entrada separada do AI Dev School”; “top três” e “mais próxima do que o aluno pediu”; “se o TypeSafe falhar, é mostrar todas as engines disponíveis”.
- Respostas explícitas: “Aluno sem login; administração restrita” e “Exigir liberação manual e checagem automática”. Invocar `tlc-plan` não respondeu à pergunta sobre ausência de correspondência.
- Resposta posterior explícita: “preparar a primeira versão para acesso público.. seguir recomendaçao” — confirma ambiente público como alvo e publicação posterior, sem delegação geral das demais decisões.
- Referência de interface: Resolved 5, selecionada pelo implementador sob delegação; o HTML de revisão não é o produto.
- `engines/codexdojo-os-prototype/src/engines/registry.ts`, `protocol.ts`, `EmbeddedEngine.tsx` — tipos e significado atual de URL pronta.
- `engines/codexdojo-os-prototype/src/apps/studentCatalog.ts` — allowlist pública existente.
- `engines/codexdojo-os-prototype/src/surface/operatorSurface.ts` e `bridge/plugin.ts` — flag de interface e bridge local, não autenticação pública.
- `engines/shared/teaching-evidence/hostProtocol.ts` — handshake `engine.ready`, limitado ao protocolo.
- `engines/sdlc-quest/README.md` — engine local documentada fora do registro examinado; não prova publicação.
- Grounding atualizado: `git ls-files -- engines` e leitura das raízes, READMEs e package.json confirmam o inventário abaixo. `engines/zai-duolingo-like/src/` contém fonte versionada; a descrição de diretório vazio no registro do OS está desatualizada. Esta tarefa não corrige código de outras engines.
- `shared/fsio.py` — precedente Python para escrita atômica; não resolve autorização, concorrência de editores ou storage compartilhado deste produto.
- `docs/design/product-readiness.md`, `DESIGN.md`, `docs/VISION.md`, `AGENTS.md`, `REVIEW.md` — fronteiras de autoridade e processo.
- `.agents/skills/typesafe-ai/SKILL.md` e https://docs.typesafe.ai/api — integração, credencial no servidor e resultados tipados. Os testes anteriores são conectividade, não validação do ranking.

Inventário inicial de cobertura administrativa, verificado em 17/09/2026. Raízes são referências do código, não schema ou IDs novos aprovados. Nenhuma linha indica liberação ou funcionamento em produção.

| Raiz existente | Natureza documentada / fonte |
|---|---|
| `engines/aiDevschoolMvp/` | Tutor por skill e scripts; README |
| `engines/codexDojo/` | Dashboard web; README e package.json |
| `engines/codexdojo-os-prototype/` | Experiência OS web; README e package.json |
| `engines/dojoToday/` | Orientação diária web; README e package.json |
| `engines/literacyDojo/` | Microlições de IA; README e package.json |
| `engines/miniMaxEvolutionEngine/` | Orquestração em Claude Code; README |
| `engines/miniTown/` | Exploração Level 0 web; README e package.json |
| `engines/minimaxDojo/` | Núcleo de tutoria; README |
| `engines/openclaw/` | Runner de checklist; README |
| `engines/pixelDojo/` | Jogos 2D, aplicação em pixel-quest; README |
| `engines/sdlc-quest/` | Jogo SDLC local/web; README e package.json |
| `engines/voxelDojo/` | Catálogo de simulações 3D; README e catalog.json |
| `engines/zai-duolingo-like/` | Aplicação Next.js com código versionado; package.json e src; capacidade pedagógica ainda precisa de descrição validada |

Esta tarefa é o registro de decisão para construção. Se a descoberta divergir depois, perguntar antes de implementar. Nenhuma pergunta foi respondida por silêncio ou por delegação implícita. O executor não precisa pedir ao usuário para enumerar arquivos que o repositório já contém.

## Unresolved

| # | Kind | Question | Until answered |
|---|---|---|---|
| 6 | blocks go-live | Quais domínio, infraestrutura e destinos reais serão publicados? | A implementação é public-ready, não publicada; destinos começam bloqueados e exigem configuração e probes reais. |
| 7 | blocks go-live | Quais operadores e credenciais serão provisionados em produção? | Operador local de desenvolvimento não concede acesso à produção. Configuração externa obrigatória para lançamento. |

## Resolutions approved by delegation

User delegated: “siga com as recomendaçoes”, seguido de “aprovado”. As pendências 1–5 e 8–14 foram resolvidas em .checks/engine-entry-recommender.md, Landing, antes do código: no-match vira aviso+catálogo; browser probe exige controle inicial visível/habilitado em até10s com leitura fresca por pergunta e clique; Node/SQLite e sessão scrypt/HttpOnly/CSRF; catálogo versionado de13 engines; frontend semântico com referência gerada e DESIGN.md; validação1–2000 caracteres; erros de leitura distintos de oferta vazia; versão otimista, atualização por valor, última pergunta ganha; todos inicialmente bloqueados, sem persistir descrição; TypeSafe5s e limites; logs sanitizados; ordem alfabética do catálogo e desempate por ID. A prova real TypeSafe não substitui validação de disponibilidade das engines.

## Resolved

| # | Resolução sob delegação explícita |
|---|---|
| 1 | Noul anyFit abaixo de0,5: aviso e catálogo elegível, sem forçar top3. Score por candidato para o caso normal. |
| 2 | Chromium anônimo verifica controle de entrada configurado visível e habilitado, até10s incluindo fila, leitura fresca por pergunta e clique, falha fechada. |
| 3 | Node22/SQLite persistente, senha scrypt configurada, cookie HttpOnly/SameSite/8h, Secure em HTTPS, origem exata e CSRF para mutações. |
| 4 | Inventário versionado da nova entrada,13 raízes e destinos server-side; não migra consumidores existentes. |
| 5 | Referência gerada e DESIGN.md selecionados sob delegação; tela de entrada e painel seguem branco/teal e controles semânticos. |
| 8 | Descrição1–2000, JSON até16KB, códigos400/401/403/409/429/503; rotas internas no Landing. |
| 9 | Carregamento explícito, erro de armazenamento distinto de oferta vazia, save confirmado e preservação em falha. |
| 10 | PUT por valor/versão, conflito409, última pergunta controla UI, rechecagem no clique. |
| 11 | Novas engines bloqueadas, liberação persistente, descrição não armazenada, sessões em memória expiram. |
| 12 | TypeSafe até5s sem retry; login5/min, consulta10/min, launch20/min e concorrência limitada. |
| 13 | Diagnóstico de modelo/tokens/IDs/duração e categoria de falha sem prompt, senha ou chave. |
| 14 | Catálogo alfabético, ranking por score decrescente e empate porID. |
