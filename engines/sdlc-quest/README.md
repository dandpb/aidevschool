# SDLC Quest v1.3 — pacote local completo

Campanha original, oficina TLC e central de execução, em português. Este pacote mantém o jogo v1.3: as alterações são apenas de empacotamento, inicialização, build e preparação dos testes.

## Começar pelo servidor local

Extraia o ZIP inteiro. Dentro da pasta `sdlc-quest`, com **Node.js 22 ou superior** disponível no terminal:

```sh
npm start
```

Abra **http://127.0.0.1:8080**. Encerre com **Ctrl+C** no terminal.

**Não precisa executar `npm install`.** O servidor, o build e os testes de regras usam somente módulos nativos do Node. Não há backend remoto, banco de dados, chave de API ou serviço externo necessário para jogar. O servidor escuta apenas neste computador e disponibiliza somente o HTML e os recursos do jogo.

A entrada do servidor é `index.html`, que carrega `src/`. Assim, para editar o jogo, basta alterar o código-fonte e recarregar a página. `sdlc-quest.html` é a versão autocontida, gerada pelo build.

### Inicializadores por sistema

- **macOS:** abra `INICIAR-Mac.command`, com Node já instalado. Se o sistema impedir a execução do arquivo ou não encontrar Node, use `npm start` no Terminal dentro desta pasta; não é preciso alterar controles de segurança.
- **Windows:** abra `INICIAR-Windows.cmd`, com Node disponível no PATH.
- **Linux:** execute `sh iniciar.sh`, com Node disponível no PATH.

Os inicializadores tentam abrir o navegador e mantêm um terminal com o servidor. Não instalam dependências. Se o navegador não abrir automaticamente, use o endereço impresso no terminal.

### Outra porta

```sh
npm start -- --port 8081
```

Abra http://127.0.0.1:8081. O comando também aceita `--open` para solicitar a abertura do navegador. A troca de porta ou de `127.0.0.1` para `localhost` muda a origem do armazenamento; use sempre o mesmo endereço para continuar o progresso.

## Jogar sem Node e sem servidor

Abra **`sdlc-quest.html`** no navegador. É o jogo completo em um arquivo: inclui JavaScript, CSS e desenho do cenário, sem CDN ou download de recursos. Nenhuma dependência de desenvolvimento é necessária para essa forma de jogar.

Políticas do navegador podem impedir abertura de arquivos locais ou limitar armazenamento. Por isso o servidor local é a opção preferida. Uma URL temporária de pré-visualização não é um local durável para guardar o jogo.

## Trazer o progresso anterior

Antes de sair da versão já aberta: **Configurações → Baixar backup JSON**. Depois, no jogo local: **Configurações → Restaurar backup**, confira a prévia e confirme.

A importação substitui o progresso, não combina backups. O Harness Lab restaura as entradas, mas não aprovações: seus gates precisam ser executados novamente após recarregar/importar. Os recibos do laboratório são didáticos e locais.

## Desenvolver e reconstruir

Edite `index.html` e `src/`. Para atualizar o HTML autocontido:

```sh
npm run build
```

Saída: `sdlc-quest.html`. O build em Node não baixa pacotes. O gerador Python original (`python3 tools/build.py`) também foi preservado; não é necessário utilizá-lo.

## Testes rápidos, sem instalar dependências

```sh
npm test
```

Executa os testes `tests/*.test.cjs`, incluindo as regras das campanhas, o motor de gates e os novos testes de empacotamento/HTTP. O enumerador não depende de expansão de curingas pelo shell.

Antes de modificar os arquivos ou gerar novas evidências, é possível conferir os bytes do pacote:

```sh
npm run check:package
```

O manifesto `SHA256SUMS.txt` é local e não é uma assinatura. Ele confere os arquivos listados, não atesta a ausência de arquivos extras. Edições e reexecuções que alterem evidências podem causar divergências esperadas.

## Verificação completa com navegador — opcional

Além de Node, requer **Python 3.10 ou superior**. A preparação abaixo precisa de internet para baixar as ferramentas de teste. Não é necessária para jogar, desenvolver ou rodar `npm test`.

```sh
npm run setup:tests
npm run gate
```

A preparação cria `.venv/` dentro do projeto, instala `playwright==1.57.0` de `requirements-dev.txt` e baixa Chromium pelo Playwright. Não instala nada globalmente e não executa `sudo`. No Linux, o sistema também pode precisar do suporte a `venv` e das bibliotecas exigidas pelo Chromium; falhas são informadas, não ignoradas.

O runner detecta o Python da `.venv/` automaticamente, inclusive em Windows. Não é necessário ativá-la. A variável opcional `QUEST_PYTHON` pode indicar um caminho completo para outro executável; nesse caso, ele precisa ter as dependências instaladas. O ambiente é específico do sistema: recrie a `.venv` após mover o projeto entre computadores.

O gate executa contrato local → build → regras → campanha desktop/mobile → oficina TLC desktop/mobile → laboratório desktop/mobile. Para no primeiro erro, timeout ou dependência ausente. Não há modo de pular os testes. Os recibos ficam em:

```text
evidence-v1.3/runs/<id>/run.json
```

Os testes de navegador existentes usam `Playwright.set_content` e armazenamento em memória explicitamente simulado. Não devem ser confundidos com validação nativa de `file://` ou com teste em aparelho físico. `CHROMIUM_EXECUTABLE` permite apontar um Chromium já instalado; se não for definido, o helper usa `/usr/bin/chromium`, quando existe, ou o navegador do Playwright.

```sh
npm run gate:release
```

Esse comando **não faz deploy**. Ele exige uma autorização externa que não está configurada; depois dos checks verdes, o código de saída esperado é **2**. Qualquer falha de verificação retorna **1**. A aprovação local não concede autoridade de produção.

## Arquivos incluídos

```text
sdlc-quest/
  sdlc-quest.html           Jogo completo pronto para abrir
  index.html               Entrada de desenvolvimento
  src/                     Todo o JavaScript e CSS
  tools/                   Servidor, builds, testes e runner de gates
  tests/                   Testes de regras, jornadas e fixtures
  artifacts/               Modelos didáticos de intenção, spec e evidência
  docs/                    Contrato, limites de integração e notas do pacote
  refs/                    Referências da oficina TLC
  evidence-v1.2/            Evidências históricas preservadas
  evidence-v1.3/            Evidências históricas preservadas; novas execuções usam esta pasta
  package.json             Comandos npm, sem dependências JavaScript externas
  package-lock.json        Manifesto npm reproduzível, sem pacotes externos
  requirements-dev.txt     Dependência opcional dos testes de navegador
  INICIAR-Mac.command      Inicializador macOS
  INICIAR-Windows.cmd      Inicializador Windows
  iniciar.sh               Inicializador Linux
  SHA256SUMS.txt           Hashes dos arquivos entregues
```

`README`, guias, relatórios, licença e avisos de terceiros também estão incluídos. As evidências de setembro de 2026 são registros de execuções anteriores, não afirmações de testes realizados no seu computador. A validação específica deste pacote está em `docs/packaging/VALIDACAO-LOCAL.md`.

## Skills e harness-toolkit: limite da integração

A campanha e a oficina TLC são educativas. O ZIP **não instala nem redistribui uma instalação oficial** de `tlc-discover`, `tlc-plan`, `tlc-implement` ou `the-judge`. O comando e os prompts da entrega anterior estão em `TLC-GUIDE.md` e no jogo; nenhuma instalação acontece ao iniciar.

A central e `tools/quest-gate.cjs` são implementações próprias do Quest. O código do repositório `dandpb/harness-toolkit` **não faz parte deste pacote**: seu conteúdo não estava disponível na entrega v1.3, e a integração real continua pendente. Veja `HARNESS-GUIDE.md` e `docs/harness/integration-status.md`.

Nada aqui executa agentes remotos, revisões reais de PR, merge ou deploy. O servidor e o runner locais não são uma sandbox nem uma barreira externa de segurança.
