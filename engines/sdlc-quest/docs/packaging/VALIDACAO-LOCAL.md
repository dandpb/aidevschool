# Validação do pacote local — 17/09/2026

## Resultado observado

`npm run gate` terminou com código **0** em uma cópia do projeto cujo caminho contém espaços. Foram aprovadas a validação estrutural do contrato, o build, **323 testes Node** (301 existentes + 22 do empacotamento) e as seis jornadas de navegador.

| Jornada | Resultado |
|---|---|
| legacy — desktop | 144 verificações aprovadas |
| legacy — mobile | 133 verificações aprovadas |
| tlc — desktop | 261 verificações aprovadas |
| tlc — mobile | 261 verificações aprovadas |
| harness — desktop | 163 verificações aprovadas |
| harness — mobile | 163 verificações aprovadas |

Não foram registrados erros JavaScript nas jornadas. Os testes de browser usaram Chromium com `set_content` e armazenamento em memória explicitamente simulado. Isso não comprova persistência nativa entre sessões.

O snapshot dos arquivos de entrada foi igual antes/depois da execução. O HTML produzido pelo build Node é idêntico, byte a byte, ao HTML v1.3 entregue anteriormente:

- Arquivo: `sdlc-quest.html`
- Bytes: 277313
- SHA-256: `f942bb7d6d1d820c27850f7acb2de3a12e3bcc89d0dc810ce95a4adae7a4fcfd`
- Node: 22.16.0
- Python: 3.13.5
- Playwright: 1.57.0
- Chromium: 144.0.7559.96
- Plataforma da validação: Linux

## Servidor local

Os testes Node abrem o servidor em loopback e verificam o HTML, seus 12 recursos, MIME, bytes, HEAD, recusa de POST, caminhos inválidos e arquivos que não devem ser expostos. Uma inicialização separada pela CLI também retornou o HTML correto via HTTP.

O acesso ao servidor por `page.goto` no Chromium foi **bloqueado por política administrativa** (`ERR_BLOCKED_BY_ADMINISTRATOR`). Essa checagem está registrada como bloqueada em `http-probe.json`, não como aprovada. Nenhuma política foi alterada. A porta padrão 8080 estava ocupada por outro processo no ambiente; a prova HTTP foi realizada com uma porta local disponível, usando a opção documentada `--port`.

## O que não foi demonstrado

Não foram executados os inicializadores em macOS/Windows nativos, a abertura por duplo clique, persistência nativa do navegador, instalação limpa de Python/Playwright/Chromium, leitores de tela reais ou aparelhos físicos. As dependências dos testes já estavam disponíveis neste ambiente. A sintaxe dos inicializadores e os caminhos foram inspecionados; isso não equivale a execução nesses sistemas.

Não houve acesso, instalação ou execução do repositório `dandpb/harness-toolkit`, das skills oficiais, de subagentes independentes ou de produção.

## Evidências

- `gate-run/run.json`: recibo da execução completa, com logs relativos na mesma pasta.
- `gate-console.log`: saída resumida do comando.
- `rules.tap`: execução separada dos 323 testes.
- `legacy-*.json`, `tlc-*.json`, `harness-*.json`: verificações individuais das jornadas.
- `http-probe.json`: resposta HTTP e bloqueio da navegação nativa.
- `desktop-home.png`, `mobile-tlc.png`: capturas inspecionadas da interface existente.

A integridade do ZIP extraído também é conferida pelo manifesto `SHA256SUMS.txt`. Hashes locais não são assinaturas nem autorização externa.
