# Aprendizados consolidados

**Data do corte:** 2026-08-17  
**Objetivo:** preservar o que já foi aprendido sem carregar toda a complexidade do ecossistema para o próximo produto.

Este arquivo é uma síntese operacional, não substitui as fontes canônicas. Os snapshots
`docs/CONSOLIDACAO_2026-08-17.md` e `docs/ESTADO_REAL_2026-08-17.md` guardam o inventário e
a execução detalhada deste corte.

## 1. Diagnóstico honesto

- O repositório é um **guarda-chuva de projetos**, não uma aplicação única: há engines,
currículo compartilhado, estado do aprendiz e vários motores de orquestração.
- A máquina de honestidade funciona: estado em texto, tentativas, evidências, gate independente
e views derivadas permitiram detectar masterizações falsas e separar `completed` de `mastered`.
- A máquina de valor ficou para trás: o histórico consolidado registra muita infraestrutura,
documentação e superfícies paralelas para poucas unidades verificadas e nenhum funil de uso.
- O aprendizado estratégico é direto: **fechar uma fatia vertical pequena vale mais que
replicar arquitetura antes de provar valor**.
- A primeira entrega deste novo ciclo deve ser um material utilizável por um aluno,
sem backend, conta, framework ou automação obrigatória.

## 2. Princípios que sobreviveram aos projetos

1. **Contrato antes do código.** Defina entradas, saídas, erros e critérios antes de implementar.
2. **Uma fonte da verdade, várias views.** Edite a fonte canônica; regenere projeções. Não corrija
view gerada manualmente.
3. **Produtor não verifica o próprio trabalho.** Toda afirmação relevante precisa de evidência
executável e, quando necessário, de um verificador em contexto separado.
4. **Estado auditável.** Markdown, YAML, NDJSON e git tornam decisões, tentativas e regressões
visíveis.
5. **Fatia vertical antes de escala horizontal.** Uma entrega completa atravessando conteúdo,
execução e validação ensina mais que várias frentes parcialmente prontas.
6. **Gates empíricos, não opinião.** Diga qual comando, métrica ou comportamento prova que algo
está pronto; declare amostra e incerteza.
7. **Falha visível.** Um processo deve mostrar fase, bloqueio, artefato pendente e próxima ação.
8. **Simplificação é uma etapa obrigatória.** Antes de ampliar o sistema, remova peças que não
provam valor para o aluno.

## 3. Aprendizados técnicos reutilizáveis

- **Pure core, thin shell:** lógica de negócio recebe dependências como clock e devolve resultados;
o transporte HTTP/CLI apenas adapta. A costura de teste e a costura de deploy ficam claras.
- **Clock injection:** qualquer TTL, retry, debounce ou refill dependente de tempo deve aceitar um
relógio injetável. Isso elimina `sleep` e testes instáveis.
- **Lazy computation:** para contadores por chave, calcular o estado no acesso costuma ser melhor
que manter um timer por cliente.
- **Estado externo precisa de limite:** mapas indexados por input do usuário precisam de teto,
TTL e estratégia de eviction; sweep eventual sozinho não é proteção suficiente.
- **Mutex simples pode ser a melhor escolha:** para seções críticas curtas, comece com lock único
e só faça sharding quando uma métrica mostrar o gargalo. Registre o penhasco de escala.
- **Monotônico para matemática, wall-clock para representação:** deadlines, retry-after e métricas
ficam mais previsíveis quando o cálculo não depende de ajustes do relógio civil.
- **Abstração testada não significa abstração usada:** procure callers no caminho de produção.
Cobertura de um arquivo morto pode dar falsa confiança.
- **Single-threaded não significa sem race:** em Node, a atomicidade atual pode depender de não
haver `await` entre validação e commit. Uma mudança futura pode quebrar essa propriedade.
- **Validador genérico pode perder semântica:** `> 0` e `>= 0` são contratos diferentes; valide cada
configuração segundo seu domínio.
- **A chave de bucket é decisão de segurança:** proxy confiável deve ser definido por hop count ou
CIDR, não por um booleano permissivo sem contexto.
- **N=1 é protótipo, não benchmark:** use amostras repetidas, mediana, desvio/CV e declare quando
a diferença está dentro do ruído.
- **Otimizar o que o benchmark não mede é metric gaming:** primeiro explique a lacuna ou melhore
o cenário; não transforme uma hipótese em vitória.
- **Refactor de manutenção pode alterar performance:** lógica equivalente pode custar dispatch,
alocação ou latência. Meça antes de chamar de neutro.
- **Teste ignorado é risco ativo:** se a propriedade de segurança não roda, a suíte verde não prova
que ela está protegida.

## 4. Aprendizados sobre trabalhar com IA

- **Pedido bom é contrato curto:** `CONTEXTO → OBJETIVO → RESTRIÇÕES → ACEITE → NÃO-META`.
- Uma entrega por pedido converge melhor que um pedido com vários "e também".
- Decisão grande deve começar por opções e trade-offs; código é uma forma cara de explorar.
- Peça a prova junto da entrega. "Testes passaram" sem comando e saída não é evidência.
- Contexto persistente deve morar em arquivos de regras/specs; o chat é volátil.
- Contexto grande não é contexto bom: selecione arquivos, regras, testes e erros diretamente
relacionados; exclua build, dependências, logs sem recorte e segredos.
- Plan, build e verify são papéis diferentes. O plano reduz ambiguidade; a validação impede que
o texto "parece certo" vire conclusão.
- O verificador fresco é valioso porque pode refutar a narrativa do produtor. Não envie o raciocínio
do produtor como se fosse prova.
- Paralelismo funciona em diretórios isolados; arquivos compartilhados precisam de serialização.
- Configuração próxima de um template conhecido é mais confiável que configuração improvisada.
- Artefato derivado pode estar errado mesmo quando o código de origem está certo. Regenere a partir
do run vivo e confira identidade por hash quando isso importar.
- O modelo e o harness podem mudar; a spec, o pacote de contexto e os gates devem permanecer.
- Agentes especializados só valem a complexidade depois que o fluxo manual está claro e repetível.

## 5. O que preservar e o que congelar

### Preservar

- As generalizações do `learner/journal.md` e as pegadinhas do `learner/pitfalls.md`.
- O protocolo de pedido em `docs/FUNDAMENTOS.md`.
- A ideia mínima do gate: tentativa, evidência e verificador separado.
- O conteúdo real de `curriculum/` e da trilha `curriculum/ai-literacy/`.
- O princípio pedagógico `objetivo → tentativa → feedback → dica/retry → evidência → revisão`.
- O uso de specs, planos, checklists e skills como arquivos versionados.

### Congelar até haver uso real

- Novos engines, jogos, rosters de agentes e automações de longa duração.
- Backend multiusuário, analytics remoto e sincronização entre dispositivos.
- Replicar horizontalmente o catálogo antes de um aluno completar uma fatia.
- Qualquer abstração que não tenha um usuário, uma métrica ou um caminho de entrega associado.

## 6. Regra do novo ciclo

> **Uma feature pequena, uma spec, um plano, uma implementação, uma validação e um aprendizado promovido a ativo.**

O curso em `docs/curso/` é a primeira entrega. O workflow em `docs/curso/workflow-exemplo/`
é o canário executável: exportar tarefas concluídas para CSV, filtrando a posse do usuário e
escapando valores CSV com testes reais.

## Fontes consultadas

- `docs/CONSOLIDACAO_2026-08-17.md`
- `docs/ESTADO_REAL_2026-08-17.md`
- `docs/FUNDAMENTOS.md`
- `learner/journal.md`
- `learner/pitfalls.md`
- `docs/VISION.md`
- `docs/design/micro-lesson-contract.md`
- `engines/miniMaxEvolutionEngine/CLAUDE.md`
- `engines/miniMaxEvolutionEngine/README.md`
- `engines/minimaxDojo/README.md`
- `engines/codexDojo/ecosystem/OPERATING_MODEL.md`
- `engines/codexDojo/ecosystem/AGENT_PROMPTS.md`
- `engines/codexDojo/ecosystem/MANIFEST.md`
- `curriculum/catalog.md`
- `README.md`, `AGENTS.md` e `CLAUDE.md`

> Quando este resumo divergir do código executado, o estado atual e os comandos executados vencem.
