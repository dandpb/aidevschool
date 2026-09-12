# AID-200 — QA independente do candidato Dev corrigido

**Data:** 2026-08-26 UTC  
**Candidato imutável:** `6a8e4946e0a6aeca65a0ce65`  
**Disposição:** **NO-GO — blocker crítico reproduzido**

## Resultado executivo

O deploy carrega o WAREHOUSE e permite erro, retry e acerto no iframe. Porém, o host persiste
somente a primeira evidência (`pass:false`), permanece em **Evidência rejeitada** e ignora a
evidência correta do retry. O candidato não contém a correção observável e não está pronto para
coorte.

## Charter baseado em risco

1. Confirmar carregamento do iframe/WebGL no permalink imutável.
2. Executar a jornada Dev crítica: erro deliberado, retry oferecido pelo jogo e acerto.
3. Verificar duas evidências auditáveis, persistência da segunda e aprovação independente.
4. Rodar testes locais focados e build para distinguir defeito publicado de falha de ferramenta.

## Ambiente e comandos

- Linux/UTC; Chromium headless do Playwright 1.61.1; viewport 1280×800.
- Checkout compartilhado sujo preservado; nenhum learner state canônico foi escrito.

```text
rtk node work-products/AID-200/qa-warehouse-retry.mjs
cd engines/codexdojo-os-prototype
rtk env NODE_ENV=test npm run test -- --run src/host/MissionShell.test.tsx src/verification/evidenceIntakePersistence.test.ts src/verification/evidenceIntakeTeachingGame.test.ts
rtk npm run build
```

## Evidência e triagem

- **PASS:** iframe `/apps/warehouse/` carregado; WebGL ativo; sem erro de console.
- **PASS:** jogo emite duas evidências brutas: primeira `pass:false`, segunda `pass:true` após retry.
- **FAIL crítico:** IndexedDB contém apenas a primeira evidência, com `status: gateway-unavailable`.
- **FAIL crítico:** host mostra `Evidência rejeitada`; aprovação independente não aparece.
- **PASS local:** 3 arquivos/14 testes focados.
- **PASS local:** `tsc -b && vite build`.
- **INFRA local:** a primeira execução dos testes sem `NODE_ENV=test` falhou com
  `React.act is not a function`; com ambiente de teste explícito, os mesmos 14 testes passam.
  Isso não explica a falha no deploy, reproduzida em Chromium.

Esperado: cada retry deve produzir uma submissão correlacionada própria; a evidência correta deve
ser persistida, enviada ao verificador e refletida como aprovação separada.

Atual: a sessão do host terminaliza no primeiro `FAIL`, apesar de o engine oferecer e concluir o
retry. É defeito de integração/produto no artefato publicado, não falha de CSP, MIME, WebGL ou rede.

Artefatos: `qa-warehouse-retry.mjs`, `qa-result.json` e `final-state.png` neste diretório.

## Limitações e decisão

Escopo restrito à trilha Dev/WAREHOUSE e ao blocker de retry. WORMHOLE, RELAY, outras viewports,
alias e escrita real no verificador não foram exercitados porque o blocker crítico já determina a
decisão. O conector da issue estava sem autenticação, impedindo leitura/comentário/transição remota.

**NO-GO.** Manter alias e convites em HOLD. Unblock owner: Engenharia/Release deve publicar um novo
deploy imutável contendo a correção de correlação/persistência por evidência; então QA deve repetir
este roteiro contra o novo permalink.
