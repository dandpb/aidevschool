# SDLC Quest v1.2 — Oficina TLC AI Dev Flow
## Resultado e identidade do artefato

Data da revisão: 16 de setembro de 2026.
HTML: 233,455 bytes.
SHA-256: `bc4809ae66052ce957541f426df3cc400db53d4e04d17899c4b8a46c3c818e11`.
Duas reconstruções consecutivas produziram bytes idênticos.

| Bateria executada | Resultado |
|---|---:|
| Regras, regressões antigas e novos casos TLC | 231 passaram; 0 falharam |
| Campanha original — desktop | 144 verificações passaram |
| Campanha original — mobile | 133 verificações passaram |
| Expansão TLC — desktop | 261 verificações passaram |
| Expansão TLC — mobile | 261 verificações passaram |

Os 140 testes de regras da v1.1 foram mantidos; 91 casos foram acrescentados.
As contagens têm escopos e sobreposições diferentes. Não devem ser somadas como se representassem funcionalidades únicas.

## O que foi exercitado

As quatro jornadas completas (campanha original e TLC, em desktop e mobile) usaram controles do jogo e gabaritos fixados em arquivos separados. Não usaram um atalho para concluir missões.

Na TLC: todos os 16 desafios; decisões incorretas; envio vazio sem desconto; estudo gratuito; foco de teclado; Esc; replay sem acumular XP; laboratório com teste fraco e teste de contrato; comparação pré-patch/candidata/mutante; review com veredito errado e correto; downloads e conteúdo dos arquivos; backup e importação com confirmação; restauração de rascunho; comando e prompts com fallback de cópia; links contextuais e manual.

A jornada TLC inclui três erros deliberados e termina com 1555/1600 XP. O gabarito de regras sem erros termina com 1600/1600. Isso é pontuação do jogador de teste, não nota do software nem progresso do usuário.

A migração exercitou via interface um backup no formato da v1.1 construído com fixtures: 18 conquistas, 1800 XP e uma nota. A oficina começa vazia ao importar esse backup antigo. A importação substitui o progresso após confirmação; ela não faz merge de dois saves.

O laboratório executa cinco asserções em três funções predefinidas (15 asserções por rodada com a suíte completa). A versão antiga falha em dois acessos cruzados; a candidata passa; o mutante que nega tudo falha nos dois acessos válidos. Os resultados exportados são os da execução local, não resultados de CI. Nenhum script oficial de Skill foi executado.

## Inspeção de interface

38 estados por jornada TLC passaram no detector de contraste aplicado e nas verificações de limites do diálogo/rolagem horizontal; zero candidatos de contraste abaixo do limiar dessa heurística. Larguras principais: 1440 e 390; amostras adicionais: 320 e 768. Os estados adicionais se repetem entre as jornadas.

Screenshots representativos de home, oficina, laboratório, review e mobile estão nesta pasta de evidências. A inspeção visual foi feita pelo mesmo assistente implementador. O detector de contraste não é uma auditoria completa de acessibilidade.

Nenhum erro de JavaScript e nenhuma requisição HTTP de runtime foram registrados nas quatro jornadas finais. Abrir um link de fonte continua sendo uma ação externa explícita do jogador.

## Achados e ajustes antes da versão final

1. O primeiro runner TLC usou um seletor ambíguo para dois botões de retorno no último prêmio. O runner foi corrigido para selecionar o botão de navegação pelo seletor específico; o log da primeira tentativa foi preservado. Não era uma falha de navegação do jogo.
2. A classificação de observabilidade foi revisada para permanecer no contexto do retry, em vez de usar um subpasso editorial alheio à capacidade. O enunciado e a fixture de aceitação foram atualizados explicitamente. n/a permanece explicado como saída válida somente com motivo pertinente à própria mudança.
3. Os exemplos de artefatos deixaram de insinuar que uma função foi executada só porque o guia foi exportado. A evidência da execução ganhou um download separado, disponível após rodar o laboratório.
4. O nome de download dos artefatos passou a manter a extensão .md/.json. A cópia indisponível ganhou campo selecionável em vez de uma falsa confirmação.

## Ambiente e limitações

Navegador: 144.0.7559.96 (Chromium Linux). Regras: Node.js v22.16.0.

Uma tentativa de navegação direta para o HTML por file:// retornou `ERR_BLOCKED_BY_ADMINISTRATOR`. Não houve tentativa de contornar a política. O artefato foi carregado com Playwright `set_content`.

A persistência usa um double explícito de localStorage em memória, inclusive em páginas novas. Portanto, não foi comprovada persistência nativa por duplo clique ou entre sessões no navegador do usuário. Mudar o nome/caminho do HTML pode mudar seu armazenamento: use o backup JSON para transportar o progresso.

Não foram testados Safari, Firefox, aparelhos físicos, leitores de tela reais ou aprendizagem com participantes. Não houve publicação em domínio externo, instalação de skills no computador do usuário, execução do instalador npx ou revisão independente por subagente. O the-judge não foi acionado sobre uma PR real.

## Reproduzir

```sh
python3 tools/build.py
node --test tests/*.test.cjs
python3 tests/playtest.py desktop
python3 tests/playtest.py mobile
python3 tests/tlc-browser.py desktop
python3 tests/tlc-browser.py mobile
```

Os testes de browser requerem Playwright para Python e Chromium. Consulte README.md. Os reports JSON, TAP, screenshots, downloads e fixtures permitem examinar o que efetivamente foi testado.
