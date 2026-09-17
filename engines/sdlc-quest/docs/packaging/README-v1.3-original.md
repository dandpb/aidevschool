# SDLC Quest v1.3 — Laboratório de execução

Jogo educativo em português. HTML autocontido, sem dependências de rede no runtime.

**O repositório dandpb/harness-toolkit não pôde ser inspecionado nesta sessão. A integração real está pendente.** O jogo inclui sua referência e uma camada de execução local própria; não atribui comandos, formatos ou garantias ao toolkit.

## Conteúdo preservado e novo

- Campanha: 6 estações, 18 desafios, 5 chefes e 1800 XP.
- Oficina TLC: quatro especialistas, 16 desafios e 1600 XP próprios.
- Harness Lab: uma sessão prática com seis gates encadeados; sem XP adicional.
- Execuções locais de funções JavaScript, pré-condições, recibos atuais, invalidação por dependência, falhas e orçamento de três falhas por etapa.
- Parecer de revisão explicitamente simulado, diagnóstico JSON e pacote local. Nunca autorização de produção.
- Backups das versões anteriores preservam os campos suportados. No laboratório, só entradas são restauradas, não validações.

## Jogar

Abra `sdlc-quest.html` e clique em **Abrir central de execução**. O mesmo acesso aparece na oficina TLC. `index.html` é a entrada de desenvolvimento e requer a pasta `src/` ao lado.

Experimente primeiro **Pular para o pacote** ou **“Terminei tudo”**. Depois execute os gates de descoberta, planejamento e implementação. A candidata inicial tem um bug; a suíte completa deve detectá-lo. Corrija para o filtro por ID e tenant, materialize de novo, verifique, selecione o parecer didático atual e empacote. Altere o código após o verde e observe os passos desatualizados.

O código do laboratório é reduzido e fictício; não executa agentes, GitHub, o toolkit, a instalação das skills ou comandos de produção.

## Progresso e arquivos

Na v1.1/v1.2: Configurações → Baixar backup JSON. Na v1.3: Configurações → Restaurar backup → confirmar. A importação substitui, não mescla. Mover um HTML pode mudar o armazenamento disponível; nunca dependa da URL temporária para preservar progresso.

O laboratório mantém os recibos enquanto a página está aberta. Fechar e reabrir seu diálogo não perde a execução. Recarregar a página ou importar backup exige executar os gates novamente. Exporte a timeline antes de iniciar outra execução; JSON local é editável e não é uma atestação assinada.

## Reconstruir

```sh
python3 tools/build.py
```

Não baixa dependências. O HTML gerado contém todos os scripts e estilos necessários.

## Executar o gate real deste projeto

```sh
node tools/quest-gate.cjs
```

Esse é um **runner próprio do Quest**, não um comando do harness-toolkit. Ele executa, em ordem: validação estrutural do contrato local, build, testes de regras, campanha desktop/mobile, oficina TLC desktop/mobile e laboratório desktop/mobile. Um erro, timeout ou dependência ausente interrompe a cadeia. Não há opção para pular testes. Logs, hashes, códigos de saída e a identificação do HTML ficam em `evidence-v1.3/runs/<id>/run.json`.

Requer Node.js, Python, Playwright e Chromium. Para preparar um ambiente de testes, após revisar os arquivos:

```sh
python3 -m pip install -r requirements-dev.txt
python3 -m playwright install chromium
```

Essas instalações não são disparadas pelo jogo nem pelo gate. O runner usa `CHROMIUM_EXECUTABLE`, `/usr/bin/chromium` ou o navegador do Playwright.

`node tools/quest-gate.cjs --require-release` exige também uma autorização externa, que esta versão **não configura**. Após checks locais verdes, retorna **2**, não uma autorização. Uma execução interrompida ou com status `running`/incompleto não deve ser aceita.

O gate local executa código do projeto, inclusive os testes. Não é uma sandbox e não protege contra quem pode alterar o próprio runner ou a política. Hashes detectam mudanças, mas não autenticam a origem da evidência. Merge, credenciais e produção precisam de controles externos protegidos.

## Organização

- `src/core.js`, `src/tlc-core.js`: regras das campanhas existentes.
- `src/harness-core.js`: motor didático puro e estados; não é código do toolkit.
- `src/harness-app.js`, `src/harness-style.css`: central de execução acessível por botões, teclado e toque.
- `tools/quest-gate.cjs`: runner local fixo, sequencial e com logs.
- `docs/harness/contract.json`: critérios da mudança; validação de formato não é aceitação humana.
- `docs/harness/integration-status.md`: lacuna do toolkit e critérios para a adaptação real.
- `tests/harness.test.cjs`, `tests/quest-gate.test.cjs`, `tests/harness-browser.py`: regras, erros de processos e jornadas novas.
- `evidence-v1.3/`: execuções desta revisão. `evidence-v1.2/` e seus relatórios são históricos, não resultados da v1.3.

## Validação e limites

Veja `TEST-REPORT-v1.3.md` e os recibos reais. Os testes de browser usam `Playwright.set_content` e armazenamento em memória explicitamente simulado. A abertura `file://` foi negada pela política administrativa do Chromium deste ambiente; não houve tentativa de contornar essa política. Não testados: Safari, Firefox, aparelhos físicos, leitores de tela reais, persistência nativa entre sessões, aprendizagem com participantes e integração autenticada do toolkit.

Não houve revisão por subagente independente. Não há nota de perfeição, certificação ou promessa de que a ordem dos passos, sozinha, demonstra a correção do software.
