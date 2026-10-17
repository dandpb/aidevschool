# ADR — Produção do pipeline de mídia 100% local-first (GitHub Release Assets + pacotes offline) — AID-2928

**Status:** **ACEITA (2026-10-17)** — decisão do founder/CEO registrada no encerramento do card AID-2931
**Data:** 2026-10-17 · **Owner:** Storage Engineer · **Supera (parcialmente):** ADR AID-2886 (Opção 2 R2 + CDN) — apenas o **destino de produção**; o contrato de conteúdo (endereçamento por sha256, manifest no git, lifecycle manifest-driven) permanece intacto
**Custo recorrente:** **US$0** (repo público: Release Assets e Pages gratuitos) — teto US$25/mês da ADR AID-2886 intocado

> **Registro da decisão** — Card AID-2931 (CEO: provisionar R2 produção) encerrado
> com o "desbloqueio criativo do founder": *sem dependência de cartão/credenciais
> externas Cloudflare R2; estratégia 100% local-first / static assets versionados
> via GitHub Pages/Release Assets e pacotes offline determinísticos
> (`learner/downloads`)*. Implementação do fallback local atribuída à AID-2928.

---

## Contexto

O cutover de produção da ADR AID-2886 (bucket `aidevschool-media` no R2 + token S3
escopado + budget notification US$10) ficou ~3 semanas bloqueado na provisão de
credenciais pelo founder (AID-2928 `blocked`, AID-4311). O tooling, o contrato e o
drill e2e já estavam prontos e mergeados (AID-2925, PR #576, manifest vazio em
produção). O founder optou por remover a dependência externa em vez de provisioná-la.

## Decisão

1. **Byte store de produção = GitHub Release Assets** do repo público
   `dandpb/aidevschool`: assets de mídia sobem como arquivos de release
   (tag `media-v<N>`), nomeados `blobs/<sha256>.<ext>` — o mesmo endereçamento
   por conteúdo da ADR AID-2886. Release assets de repo público são gratuitos,
   imutáveis por tag, servidos por URL pública sem conta, login ou telemetria.
2. **Referências continuam no git**: `docs/storage/manifests/media-manifest.json`
   mapeia `path → sha256 → URL do asset` (contrato inalterado; só muda a base
   da URL: `https://github.com/dandpb/aidevschool/releases/download/media-v<N>/...`).
3. **Pacotes offline determinísticos** (`scripts/storage/offline_package.py`):
   bundles `NAME-VERSION.zip` (blobs content-addressed + `manifest.json` +
   `SHA256SUMS.txt` verificável com `sha256sum -c`), zip reproduzível byte a byte
   (timestamps/ordem/compressão fixos) e restore fail-closed. A pessoa aprende
   baixa o zip para `learner/downloads/` (zona de aterrissagem local, gitignored)
   e verifica offline — Level 0 permanece sem conta.
4. **R2 fica aditado, não abandonado**: §4a do runbook permanece válido; se o
   volume/egress um dia justificar (ou o founder provisionar credenciais), o
   cutover R2 é reativado como estava especificado — o manifest e as chaves
   content-addressed são portáveis entre destinos.

## Consequências

- **+** Zero dependência de credencial externa e zero custo recorrente; o
  bloqueio AID-2928 desaparece por construção.
- **+** CDN implícita (GitHub download + cache de navegador); URLs estáveis por
  sha256 nunca mudam de conteúdo (imutabilidade por construção).
- **−** Sem lifecycle automático de órfãos no destino: o GC é 100%
  manifest-driven (a regra nativa R2 de rede de segurança não existe aqui).
  Mitigação: releases são versionadas (`media-v<N>`) e um release inteiro pode
  ser apagado sem tocar nos referenciados por versões anteriores — o runbook
  documenta a regra de expurgo por release.
- **−** Release assets não são APIs de listagem amigáveis; o manifest no git é a
  única lista autoritativa (já era o contrato).
- **Orçamento**: US$0/mês; budget notification US$10 do dashboard R2 fica **sem
  efeito** (nada para monitorar no GitHub no tier público). O teto US$25 segue
  valendo para qualquer gasto futuro.

## Verificação

- `scripts/storage/test_offline_package.py` (7 testes) e
  `offline_package.py self-test` (8 checagens e2e) — dedup, determinismo do zip,
  verify fail-closed, restore byte-idêntico, tamper detectado.
- Drill de referência: `DRILL-20261017T*-offline-package.log` em
  `/paperclip/storage/aidevschool/drills/` (build com mídia real do repo +
  verify + restore + upload/verificação de Release Asset).

## Provider model (refinamento do founder na própria AID-2928)

Comentários `20863cd9-9be4-4eb4-8ae7-9aee5aa889b5` (2026-10-17T16:15:45Z) e
`0b41794f-1fb2-457f-90c2-ade41baa9d39` (16:18:33Z):

> implemente um provider local-first / static-bundle (`file://` + GitHub
> Release/Pages static path fallback com verificação SHA-256) para custo
> zero e 100% offline/CI-friendly.

Acrescentado ao contrato:

1. **`file://` é o provedor primário**: o consumidor resolve mídia primeiro
   contra o filesystem local (bundle do pacote offline / checkout do repo /
   `learner/downloads/`) — offline e CI-friendly por construção.
2. **Release Assets é o caminho de distribuição/fallback** quando o conteúdo
   não está local (URL pública da decisão 1, sem conta).
3. **SHA-256 fail-closed em todo caminho**: nenhum provedor entrega bytes
   cujo hash diverja do manifest (`docs/storage/manifests/`); divergência é
   erro, nunca aceite silencioso.
4. Ferramenta expõe `--provider file|release` (default `file`); o manifest
   registra qual provedor atende cada entrada.
