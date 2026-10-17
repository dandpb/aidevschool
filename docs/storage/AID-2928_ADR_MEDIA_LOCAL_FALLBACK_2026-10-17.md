# ADR — Pipeline de mídia local-first: GitHub Release Assets + kits offline (AID-2928)

- **Data:** 2026-10-17
- **Status:** ACEITA (decisão do founder — comentário de fechamento da AID-2931,
  `7b56b57e-23ed-45be-bdc1-3a2ad03ffed7`, 2026-10-17T16:14:15Z: "DESBLOQUEIO
  CRIATIVO DO FOUNDER: sem dependência de cartão/credenciais externas
  Cloudflare R2; estratégia 100% local-first / static assets versionados via
  GitHub Pages/Release Assets e pacotes offline determinísticos
  (`learner/downloads`); implementação do fallback local segue em AID-2928")
- **Issue:** AID-2928 (pipeline de mídia) · supersede parcial de
  `AID-2886_ADR_MEDIA_PIPELINE_2026-09-26.md` (Opção 2 R2+CDN → produção)
- **Owner:** Storage Engineer

## Contexto

O cutover R2 (AID-2928 §4a) ficou 21 dias bloqueado na única ação que o agente
não pode executar: criar bucket/token no dashboard Cloudflare com cartão da
conta. O tooling S3 está pronto e validado (PR #576, self-test 8/8), mas sem
credenciais não há produção. O founder encerrou a dependência em
2026-10-17: a origem de produção passa a ser 100% local-first, sem novo
fornecedor, sem cartão, sem credencial nova.

## Decisão

1. **Origem dos bytes: GitHub Release Assets** do repo público
   `dandpb/aidevschool`, em releases de mídia dedicadas.
   - Tag: `media-<AAAAMMDD>` (uma release por lote de autoria, nunca por arquivo).
   - Asset: `<sha256>.<ext>` — **content-addressed igual ao contrato S3**
     (mesmo conteúdo → mesmo nome; conteúdo divergente no mesmo nome é erro,
     não overwrite; asset publicado nunca é re-escrito na mesma tag).
   - URL pública estável:
     `https://github.com/dandpb/aidevschool/releases/download/media-<tag>/<sha256>.<ext>`
     (download anônimo, CDN-backed; repo público).
2. **Manifest continua no git como autoridade**:
   `docs/storage/manifests/media-manifest.json` mapeia
   `path → sha256 → {origin: "release", tag, asset, url, bytes}`.
   A release é armazém de bytes; o manifest é revisto em PR. O PR mostra o
   manifest, não os bytes (igual ao contrato R2).
3. **Kits offline determinísticos** para pacotes de micro-lesson, seguindo a
   convenção já ativa em `docs/learner-downloads/` (README + INVENTÁRIO
   sha256 + PROVENANCE com fonte pinada + zips por etapa):
   - zips reproduzíveis (timestamps fixos, ordem de entradas ordenada, sem
     variação de uid/gid) → mesmo sha256 para a mesma árvore;
   - publicados como Release Assets das mesmas releases `media-*`;
   - o aprendiz confere integridade offline com `sha256sum -c` — sem rede,
     sem conta, sem dependência nova.
4. **Retenção**: mesma regra do contrato S3 — manifest-driven, carência de
   90 dias para órfãos. Não existe lifecycle nativo no GitHub; o equivalente
   (`orphan-gc` contra o manifest + listagem de assets) roda no sweep horário
   do Storage Engineer com recibo. Asset referenciado nunca é deletado.
5. **Orçamento**: US$0/mês de novo custo (Release Assets em repo público são
   gratuitos, egress incluso). Teto US$25/mês e alerta US$10/mês permanecem
   como limites para qualquer backend futuro; nenhuma aprovação de gasto é
   necessária nem incorrida aqui.
6. **Netlify**: inalterado — mídia nunca entra no deploy (limite de 10k
   arquivos preservado; a URL aponta para a release, não para o site).

## O que preserva do ADR-2886 (Opção 2)

Bytes content-addressed; manifest no git como fonte da verdade das
referências; lifecycle de órfãos com carência; migração incremental (só mídia
nova; histórico de 619 PNGs/~162 MiB não é reescrito); producer ≠ verifier
(storage devolve recibos de upload/verify/restore, nunca avalia); Level 0 sem
conta (download público anônimo, sem login, sem telemetria nova).

## O que muda

| | R2 (ADR-2886, produção) | Local-first (este ADR) |
|---|---|---|
| Armazém de bytes | bucket S3 `aidevschool-media` | Release Assets `media-*` |
| Credencial | token S3 escopado (CEO) | nenhuma além do git push já existente |
| Custo recorrente | US$0,015/GB-mês + alertas billing | US$0 |
| Lifecycle nativo | regra R2 (rede de segurança) | não existe — GC é só manifest-driven |
| URL pública | CDN custom (`ADS_MEDIA_CDN_BASE`) | URL estável de download da release |

O backend S3 **não é descartado**: `media_pipeline.py` + `s3_miniclient.py`
permanecem íntegros como backend opcional (stand-in local §4b e reativação
futura de produção R2 somente por decisão do CEO).

## Riscos e limites

- **Limite por asset**: 2 GiB por arquivo de release — muito acima do perfil
  de micro-lesson (áudio/imagem curtos); vídeos longos exigiriam decisão nova.
- **Imutabilidade**: garantida por contrato (nunca re-upload na mesma tag);
  o `verify --deep` confere sha256 do download contra o manifest.
- **Disponibilidade GitHub**: queda do GitHub afeta a URL pública; mitigação:
  kits offline espelham os bytes críticos e o restore drill valida cópias.
- **Sem lifecycle nativo**: se o sweep parar, órfãos acumulam (custo US$0;
  risco de higiene, não de faturamento) — o sweep loga pendency.

## Execução (próximos passos, AID-2928)

1. `scripts/storage/release_assets.py` — minicliente Releases (criar release
   draft `media-*`, upload de asset, listagem, sha256 verify; stdlib only).
2. `scripts/storage/offline_kit.py` — empacotador determinístico (zips
   reproduzíveis + INVENTÁRIO + PROVENANCE, convenção `docs/learner-downloads/`).
3. Self-test e2e offline (fake release store in-process) espelhando o
   padrão do `media_pipeline.py self-test`.
4. Primeiro upload real de mídia de micro-lesson + `verify --deep` + drill
   de restore com recibo (fecha os critérios originais da AID-2928, agora
   sobre a origem local-first).

Runbook operacional: `docs/runbooks/MEDIA_PIPELINE.md` §10.
