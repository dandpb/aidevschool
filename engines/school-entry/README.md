# AI DevSchool — entrada independente

Entrada sem login que recomenda até três engines a partir do objetivo do aluno, usando a API TypeSafe. O painel de operador controla uma liberação global persistida em SQLite. Uma engine só entra na oferta após liberação **e** checagem automática de sua entrada em Chromium.

Não escreve em `learner/` ou `curriculum/`, não concede mastery e não sincroniza progresso. A aplicação está preparada para servir por uma origem pública; este trabalho não publica nem troca as entradas existentes.

## Executar localmente

Node.js 22.13 ou superior. O runtime usa `node:sqlite` (experimental na linha 22) e Playwright; não há etapa de build do frontend.

```sh
npm ci
npx playwright install chromium
npm start
```

Abra `http://127.0.0.1:5185`. Sem configuração, o catálogo começa com as 13 engines bloqueadas. A ausência de senha de operador não cria acesso administrativo padrão. A ausência de chave TypeSafe preserva o catálogo disponível como fallback.

Configure variáveis no ambiente do processo ou use o suporte nativo do Node: `node --env-file=.env server/main.mjs`. `.env` não é versionado. `.env.example` lista os campos para implantação; não contém credenciais nem destinos ficticiamente funcionais.

| Variável | Uso |
|---|---|
| `HOST`, `PORT` | Bind local; padrões `127.0.0.1` e `5185`. |
| `BASE_URL` | Origem externa exata, sem caminho ou barra final. Em produção, obrigatoriamente HTTPS. |
| `ADMIN_PASSWORD_HASH` | Hash scrypt do único operador configurado. Não é a senha em texto. |
| `TYPESAFE_API_KEY` | Credencial exclusivamente no servidor. |
| `DATA_DIR` | Diretório persistente; padrão `.data`, arquivo `release.sqlite`. |
| `ENGINE_TARGETS_FILE` | Caminho de JSON de destinos aprovado pelo operador, lido na inicialização. |
| `ALLOW_LOCAL_TARGETS=1` | Permite destinos locais somente fora de produção, para testes. Produção rejeita essa opção. |

Para gerar o hash, forneça uma senha de ao menos 12 caracteres pela entrada padrão de `npm run --silent hash-password`. O comando imprime somente o hash. Em um shell interativo, uma forma de não gravar a senha no histórico é ler a senha sem eco e passá-la por pipe:

```sh
read -s ENTRY_PASSWORD
printf '%s' "$ENTRY_PASSWORD" | npm run --silent hash-password
unset ENTRY_PASSWORD
```

Coloque o hash no ambiente do servidor, reinicie e entre por `/admin/engines`. Sessões duram oito horas e são encerradas ao reiniciar o servidor. O navegador guarda somente cookie HttpOnly, SameSite=Strict (Secure em HTTPS). Escritas exigem origem exata e token CSRF da sessão. Não há senha padrão, fluxo de cadastro ou conta remota criada por esta aplicação.

## Configurar um destino

O inventário versionado fica em `server/catalog.mjs`. Cada engine possui identidade, descrição e motivo fundamentados nas fontes do repositório. O operador só alterna a liberação; destinos e seletores são configuração confiável do servidor, nunca texto fornecido pelo aluno.

Exemplo **local**, para o SDLC Quest existente nesta cópia do repositório:

```json
{
  "sdlc-quest": {
    "url": "http://127.0.0.1:5291",
    "readySelector": "#mission-panel button"
  }
}
```

Inicie o Quest com `node tools/serve.cjs --port 5291` a partir de `../sdlc-quest`. Configure o JSON acima e `ALLOW_LOCAL_TARGETS=1` na entrada em modo de desenvolvimento. O seletor identifica um controle da missão que aparece após a inicialização do jogo. Depois, libere SDLC Quest no painel.

Em produção, use a URL pública **final**, sem redirecionamentos, e um seletor específico para um controle visível e habilitado da entrada da engine. `body`, um título estático ou uma tela de erro não são seletores válidos de prontidão operacional. A configuração errada pode produzir um falso positivo: revisar esse contrato por engine faz parte de liberar seu destino.

### Alcance da checagem

- Contexto de navegador isolado e anônimo; limite de 10 segundos por checagem, incluindo espera na fila. Até três checagens simultâneas e fila limitada.
- Checagem fresca na consulta e novamente em “Começar”; não existe cache positivo entre perguntas.
- Valida endereços públicos, fixa o IP validado na conexão, preserva a validação TLS e rejeita redirecionamentos. Recursos só da mesma origem, sem credenciais encaminhadas, somente GET/HEAD. WebSockets e service workers bloqueados.
- Até 100 recursos por página, 16 transferências em voo e 5 MiB por recurso. Falha ou resultado desconhecido exclui a engine.
- Comprova que **o controle inicial configurado** está visível e habilitado. Não comprova conclusão de aula, conteúdo pedagógico, login em outro serviço ou funcionamento de todas as jornadas.

Engines que dependem de autenticação, recursos de outra origem, WebSockets ou redirecionamento precisam de um contrato de entrada compatível antes de serem liberadas. Não desligue as proteções para fazê-las aparecer. O inventário completo no painel não afirma que as 13 engines têm destinos públicos.

## Recomendação e recuperação

Uma pergunta usa a descrição (1–2000 caracteres) e os candidatos elegíveis. TypeSafe recebe uma pergunta Noul sobre existência de correspondência e um Score de 0–3 por engine. O modelo está fixado em `jev-1.13.0`. Score decrescente ordena o top três, com ID como desempate. Os motivos vêm de capacidades documentadas; não são texto livre gerado.

Noul abaixo de 0,5 produz aviso de falta de correspondência e catálogo completo disponível. Esse limiar é uma política inicial, não uma alegação de calibração em produção. Falha, resposta inválida, chave ausente ou orçamento de cinco segundos excedido também mostram todo o catálogo elegível, com mensagem distinta. Zero elegíveis mostra indisponibilidade. Falha de armazenamento retorna erro, nunca um falso catálogo vazio.

Há limite de 10 consultas por minuto por endereço de conexão, 5 tentativas de login e 20 lançamentos, além de limite global de trabalho. Cabeçalhos de IP encaminhado não são confiados. Atrás de um proxy, os clientes podem compartilhar o limite do endereço do proxy; revisar limites e política de ingresso antes do lançamento. Não há SLA de latência: a checagem dos destinos precede a inferência.

## Verificar

```sh
npm test
npm run test:browser
npm run test:live
npm run check
```

`test:live` exige a chave existente e faz duas chamadas reais sobre descrições sintéticas de aluno e o catálogo real. A elegibilidade é simulada somente nesse teste para separar julgamento de rede; a saída declara essa fronteira. Não é prova de que as 13 engines estão online. Os demais testes não exigem credencial externa. Provas individuais e critérios: `../../.checks/engine-entry-recommender.md`.

O banco não guarda descrições dos alunos. Os diagnósticos do provedor incluem modelo, tokens e IDs, sem texto da pergunta, senha ou chave. A liberação usa versão otimista para não sobrescrever silenciosamente uma edição concorrente.

## Preparação de implantação

O Dockerfile inclui Chromium e suas bibliotecas, executa como usuário não root e exige volume persistente em `/data`. O serviço HTTP deve ficar atrás de um terminador TLS na origem exata de `BASE_URL`. Configure o hash e a chave fora da imagem; monte o JSON de destinos apenas para leitura. Não exponha SQLite nem arquivos de configuração pelo servidor web.

```sh
docker build -t aidevschool-entry:local .
```

Uma única instância com disco persistente é o modelo suportado nesta versão. Múltiplas réplicas não compartilham sessões em memória e não devem usar cópias independentes do banco. Provisionar domínio, infraestrutura, operador e destinos reais continua sendo trabalho de publicação separado.
