# Piloto — o percurso do cliente

**Data:** 2026-08-17 · **Para:** Daniel conduzir o primeiro teste com uma pessoa real
**Superfície do piloto:** `engines/literacyDojo/` (trilha **IA na Prática**, 17 lições)
**Duração:** 3 sessões de 15–20 min, ao longo de ~1 semana

> **A hipótese que este piloto testa:** uma pessoa não técnica consegue, sozinha, entrar no produto,
> concluir uma lição e sair com algo que aplica no trabalho — e volta por vontade própria.
>
> **O que este piloto NÃO testa:** trilha Dev, mastery verificado, contas, sincronização entre
> dispositivos, retenção de longo prazo. Não prometa nada disso ao cliente.

---

## Por que a trilha IA na Prática, e não a Dev

| | IA na Prática | Trilha Dev |
| --- | --- | --- |
| Conteúdo | 17 lições prontas e validadas | 3 missões ligadas (de 17 jogos existentes) |
| Exercício separado da resposta | sim | **não** — as soluções estão no repo |
| Verificado ponta a ponta | lint + 76 testes + E2E 6/6 (inclui offline) | shell testado; verificador ausente no build estático |
| Pronto para um estranho usar | **sim** | não |

A trilha Dev entra no piloto só como **demonstração de 5 minutos** (§6), nunca como percurso.

---

## 1. Antes do cliente chegar (você, ~15 min)

Escolha **uma** das duas formas de entrega.

### Opção A — local, com a pessoa do seu lado (recomendada para o primeiro piloto)

```bash
cd engines/literacyDojo
npm install
npm run gen:content
npm run build
npx vite preview --host 0.0.0.0 --port 4399
```

O cliente abre no **próprio dispositivo**, na mesma rede: `http://<seu-ip-local>:4399/`
(descubra o IP com `ipconfig getifaddr en0`). Usar o dispositivo dele importa: o progresso é local
ao navegador, e é isso que você quer observar na sessão 2.

### Opção B — link público (para piloto remoto)

O engine já tem `netlify.toml`. Publique e **verifique você mesmo o link antes de enviar**:

```bash
cd engines/literacyDojo
npx netlify deploy --prod --dir=dist      # exige CLI autenticado
curl -sI <url> | head -1                  # tem de responder 200
```

Abra a URL num navegador anônimo e faça o onboarding inteiro antes de mandar para o cliente.
Nunca envie um link que você não abriu.

### Checagem final antes de chamar a pessoa

- [ ] Abriu a URL num navegador **em aba anônima** e chegou até o mapa da vila.
- [ ] Testou em celular (a maioria vai abrir no telefone).
- [ ] Testou o modo offline: carregue a página, desligue o wi-fi, recarregue — tem de continuar
      funcionando (é PWA e isso está coberto por teste).
- [ ] Tem papel/planilha aberta para a folha de observação (§4). **Não há instrumentação no
      produto** — se você não anotar, o dado não existe.

---

## 2. O percurso — sessão 1 (~20 min)

O que você entrega ao cliente é **uma frase e um link**. Nada mais:

> "Isso é uma escola curta para usar IA no trabalho. Abre o link e vai até onde der. Eu fico
> quieto olhando; se travar de verdade, me chama."

Daqui pra frente, é ele. Você observa e cronometra.

### Passo 1 — Entrada (`Chegue à Vila Lume`)

Ele vê: apresentação da vila, a guia **Lumi**, dois cartões — *Vila Lume · DISPONÍVEL* e
*Trilha Dev · EM BREVE* — e o aviso de privacidade ("seu progresso fica neste navegador, sem conta").
Botão: **Continuar jornada**.

**Observe:** ele lê o aviso de privacidade ou pula? Pergunta o que é "Vila Lume"? Repara no
"EM BREVE"?

### Passo 2 — `O que você quer melhorar com IA?`

Quatro opções: escrever textos/e-mails melhores · economizar tempo em tarefas repetitivas ·
conferir se a resposta da IA está certa · saber o que posso compartilhar com segurança.

**Observe e anote qual ele escolhe.** Essa é a informação mais valiosa da sessão inteira: é o
problema real dele, com as palavras dele.

### Passo 3 — `Onde você mais pretende usar IA?`

No trabalho · Nos estudos · No meu próprio negócio · Na vida cotidiana.

### Passo 4 — `Como você avalia sua confiança hoje?`

Estou começando do zero · Já usei mas sem método · Uso bastante e quero refinar.

**Observe:** ele se subestima ou se superestima? Compare com o desempenho no passo 6.

### Passo 5 — `Qual situação você quer explorar primeiro?`

Três cenários com ilustração voxel: organizar um agendamento · preparar uma mensagem ·
pesquisar uma notícia. Botão: **Abrir mapa da Vila Lume**.

**Observe:** as ilustrações ajudam a escolher ou são só enfeite? (Elas deveriam explicar a tarefa.)

### Passo 6 — Mapa da Vila Lume

Ele vê 17 missões em 5 bairros, contador `0/17 missões`, XP e dias de sequência. O bairro 1 é
*Praça do Encontro · IA sem mistério*. Algumas missões aparecem **Bloqueada**, uma aparece
**Disponível** com botão **Começar**.

**Observe:** ele entende por onde começar sem você falar nada? Fica incomodado com as bloqueadas?

### Passo 7 — A primeira missão

Primeiro vem um briefing: **Pedido da Vila Lume** com o objetivo da lição, a linha
*"Aplicação que você escolheu: <a situação do passo 5>"* e uma dica da Lumi. Botão:
**Começar missão**.

Depois vem a atividade. Exemplo real da lição "IA não é uma fonte de verdade": um cenário
concreto (você pediu números do mercado de delivery para uma apresentação à diretoria), **duas
respostas de IA** — uma com números exatos e muita confiança, outra admitindo o limite e dizendo
onde verificar — e, embaixo, caixas de seleção *"por quê?"* que obrigam a justificar a escolha.

Botões: **Verificar resposta** · **Pedir dica** · **Sair da lição**.

**Observe (o momento mais importante do piloto):**
- Ele percebe que a resposta cheia de números é a menos confiável?
- Ele **preenche os "por quê?"** ou tenta verificar só com a escolha? (Muita gente ignora e tira
  60% — é o comportamento esperado e é dado bom.)
- Ele usa **Pedir dica**? Quantas vezes?
- Quanto tempo do clique em "Começar missão" até o primeiro "Verificar resposta"?

### Passo 8 — Feedback e nota

O produto responde com nota da tentativa (ex.: *"Pontuação desta tentativa: 60%"*) e diz
exatamente o que faltou (*"Faltou este motivo: uma resposta confiável indica a origem dos
dados…"*). Abaixo de 75% ele oferece **Tentar novamente**.

**Observe:** ele tenta de novo ou desiste? O texto do feedback foi suficiente para ele acertar na
segunda, ou ele chutou?

A rota se define aqui: acerto de primeira → rota **intermediária**; erro, dica ou nova tentativa →
rota **guiada** (mais passo a passo). **Anote em qual rota ele caiu** e se o produto explicou isso
de forma que ele entendeu.

### Passo 9 — Fim da sessão 1

Deixe-o concluir 1 a 3 missões e **pare**. Não peça para continuar.

Então faça exatamente três perguntas, nesta ordem, e anote **as palavras dele**:

1. "O que você faria diferente amanhã por causa disso?"
2. "Teve algum momento em que você não soube o que fazer?"
3. "Você voltaria amanhã? Por quê?"

A pergunta 1 é a que mede valor. Se a resposta for vaga ("achei legal"), o produto **não** entregou
— e isso é o resultado do piloto, não um problema do cliente.

---

## 3. As sessões seguintes

### Sessão 2 — 24 a 48 h depois (~15 min)

**Não avise, não lembre.** Se ele voltar sozinho, esse é o sinal mais forte que este piloto pode
produzir. Se não voltar, pergunte por que — vale mais que qualquer métrica.

Ele deve encontrar: a sequência (streak) preservada, o progresso onde parou e, se já houver revisão
vencida, uma missão de revisão espaçada (a lição volta para reforço).

**Observe:** o progresso realmente sobreviveu? A sequência fez ele voltar ou passou batido? Ele
entendeu por que uma lição já feita reapareceu?

### Sessão 3 — mais 2 ou 3 dias (~15 min)

Objetivo: chegar ao bairro 4 (*Segurança e aplicação*), especialmente as lições **"Proteja suas
informações"** e **"Use IA para uma tarefa real de trabalho"** — é onde o produto pede que ele
aplique numa tarefa da rotina dele.

**Observe:** ele consegue nomear uma tarefa real? Ele aplicou de fato entre as sessões?

Pergunta final: *"Se isso custasse dinheiro, você pagaria? Quanto?"* — e depois fique calado.

---

## 4. Folha de observação (uma linha por sessão)

| Campo | Sessão 1 | Sessão 2 | Sessão 3 |
| --- | --- | --- | --- |
| Data / dispositivo / navegador | | | |
| Quantas vezes ele te chamou | | | |
| Onde travou (passo exato) | | | |
| Missões concluídas | | | |
| Nota da 1ª tentativa | | | |
| Dicas pedidas | | | |
| Rota atribuída (guiada / intermediária) | | | |
| Voltou sozinho? | — | | |
| Frase literal dele sobre o que faria diferente | | | |
| Onde ele bocejou / se distraiu | | | |

Guarde em `docs/piloto/<nome-ou-inicial>-<data>.md`. Anote **também** o que deu certo — sem isso
você só vai lembrar dos problemas.

---

## 5. Critérios de sucesso — declare antes, não depois

Pré-declarados de propósito: é o gate de valor que faltava no ecossistema. Todos são falsificáveis.

| # | Critério | Passa se |
| --- | --- | --- |
| 1 | **Entra sozinho** | conclui o onboarding e abre a 1ª missão com **zero** intervenção sua |
| 2 | **Tira algo dali** | responde a pergunta "o que faria diferente amanhã" com uma ação **concreta e específica** |
| 3 | **Volta** | inicia a sessão 2 em até 48 h **sem** você lembrar |
| 4 | **Aplica** | até a sessão 3, nomeia uma tarefa real onde usou o que aprendeu |

**1 e 2 falharam → o problema é o produto** (entrada ou conteúdo). Conserte antes de qualquer
feature nova.
**1 e 2 passaram, 3 falhou → o produto é bom e falta gancho de retorno** (hoje só existe a
sequência local, sem notificação, sem e-mail, sem conta).
**Os 4 passaram → você tem um produto.** Aí sim vale instrumentar (ADR-0009 já tem os 4 eventos
desenhados), publicar e buscar a pessoa nº 2.

Um piloto com **um** cliente não prova mercado. Prova que o produto funciona nas mãos de alguém
que não é você — que é exatamente o que nunca foi testado até hoje.

---

## 6. Se ele perguntar da trilha Dev (5 min, opcional)

Só mostre se ele pedir, e diga a verdade: **é um preview, não está pronto.**

```bash
cd engines/codexdojo-os-prototype
npm install
npm run test:smoke:pilot     # PRIMEIRO: prova que as missões montam no build estático
npm run preview:pilot        # build + empacota as 4 missões; serve em 127.0.0.1:4173
```

`test:smoke:pilot` é o guarda-corpo desta parte: ele roda contra o `dist/` **sem nenhum
dev-server** e falha se qualquer missão não montar ou se o iframe apontar para fora da origem do
OS. Se ele passar, o que você vai mostrar funciona; se falhar, não mostre.

Uma URL só, um onboarding, e as duas trilhas com 3 missões cada. A missão Dev **WAREHOUSE** é boa
de mostrar: simulação 3D, "preveja a prateleira que cada chave vai ocupar", meta observável de 80%.

Diga explicitamente, porque o produto diz também:

- A evidência é **preservada**, mas não há verificador no build estático → a tela mostra
  *"O verificador local está indisponível"*. Isso é correto: nada é marcado como dominado sem
  verificação independente.
- São **3 missões** por trilha, não o catálogo inteiro.
- O currículo Dev de 18 projetos ainda **não tem exercício separado da resposta** — hoje serve como
  referência, não como trilha de prática.

Não prometa data.

---

## 7. Se algo quebrar durante a sessão

| Sintoma | Causa provável | Ação na hora |
| --- | --- | --- |
| Página não abre no dispositivo dele | `--host 0.0.0.0` ausente, ou firewall/rede separada | reconfira o IP; em último caso, use seu notebook |
| Missão do OS mostra "refused to connect" | build feito com `npm run build` em vez de `build:pilot` | rode `npm run preview:pilot` |
| Progresso sumiu na sessão 2 | outro navegador, aba anônima, ou limpeza de dados | anote como **falha do produto** — não conserte na frente dele |
| Ele fica preso numa lição | conteúdo ou UI | espere **60 s** antes de ajudar, e anote onde |

Regra durante a sessão: **você não explica a interface.** Cada explicação sua é um dado que você
destrói — o produto vai ser usado sem você do lado.

---

## Anexo — estado verificado hoje (2026-08-17)

Tudo abaixo foi executado nesta data, não copiado de doc.

| Superfície | Resultado |
| --- | --- |
| literacyDojo | `gen:content` 17 lições · lint limpo · **76 testes** · build · **E2E 6/6** (inclui PWA offline) · `npm audit` 0 |
| codexdojo OS | lint limpo · **208 testes** · smoke dev **61 passed / 0 failed** (era 52/9) · smoke do build estático **2/2** · `npm audit` 0 (corrigido `nanoid` high) |
| Currículo Node | **18/18** projetos passando por exit code (5 estavam quebrados por symlink) |
| Currículo 01 Go | `gofmt` + `go vet` limpos · `go test -race` · cobertura **85.9% / 99.2%** |
| Currículo 01 Rust | `fmt` + `clippy -D warnings` limpos · **15 unit + 6 integração, 0 `#[ignore]`d** |
| Python compartilhado | **693 passed**, 1 skipped · projeções em sync |
| voxelDojo (16 jogos) | lint · test · typecheck · build · **smoke 16/16 jogos, 50 testes** |
| pixelDojo | lint · typecheck · build · **113 testes** · smoke 1/1 |
| codexDojo · miniTown · dojoToday | verdes · `pnpm audit --prod` sem vulnerabilidades |

Limites honestos que continuam valendo: **zero instrumentação** (por isso a folha de observação);
progresso local e não transferível entre dispositivos; benchmarks Go/Rust do projeto 01 ainda não
executados (é tarefa pendente, não limite de ambiente); nenhuma unidade da trilha 00 tem mastery
verificado; **duas portas de entrada** concorrentes (literacyDojo e OS) — decisão de produto,
não bug.
