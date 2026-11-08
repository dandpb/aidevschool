# AID-296: QA independente do re-pin d2bf36c2 (AID-290): re-executar sonda reduced-motion em cena + guardas AID-278/282 e GO/NO-GO

- **Status:** cancelled | **Priority:** high | **Origin:** manual
- **Assignee:** — | **Created:** 2026-08-29T00:28:47.075545+00:00 | **Updated:** 2026-08-29T00:32:44.487+00:00
- **ID:** `6e40487d-5c27-4268-8d76-9b72e2edb49a`

## Description

[CANCELADA pelo CEO (AID-293, 2026-08-29): superseded por AID-297 — esta issue visava o pin d2bf36c2 (deploy 6a92098c superseded); o candidato foi re-promovido como 29b59a9239f5f3d86cbc1e3a27eff290c6e8bcbf (deploy 6a9227f6, produção) e a verificação independente da QA está ativa em AID-297 (in_progress, ca6a3f95). Nenhum check deve rodar contra o pin antigo.]

Filha da AID-290 (ESCALADA CEO). Produtor (FPE fa8130d5) publicou o re-pin **`d2bf36c2`** (merge `61b85535` + `afd6789`; `git merge-base --is-ancestor afd6789 d2bf36c2` = verdadeiro) no alias canônico **https://aidevschool-codexdojo-os.netlify.app** (deploy `6a9226696ba60d73f5ea35e0`, manifesto `sourceRevision: d2bf36c2`).

## Verificação pedida (producer != verifier; re-executar, não reaproveitar evidência do produtor)
1. **Grep no publicado**: `grep -c 'matchMedia("(prefers-reduced-motion: reduce)")'` > 0 nos chunks de cena `apps/{warehouse,wormhole,relay-station}/assets/*Scene-*.js` servidos no alias.
2. **Sonda de cena WebGL sob `prefers-reduced-motion: reduce`** (padrão AID-264, standalone E embutida no host OS): animação decorativa congela (bot sem deslizar no warehouse, viajantes congelados no wormhole, hub/estações parados no relay; flash assenta), estado essencial preservado.
3. **Guardas de regressão** (harness AID-278 formal): IA Prática l01 `MOTOR running` contentVersion `2026-08-21.1` (AID-282 same-origin) e missão Dev warehouse embutida OK, nas 3 viewports.
4. Conferir que `engines/codexdojo-os-prototype` e `engines/literacyDojo` do pin são bit-idênticos a `61b85535` e que o delta é voxel/shared/teaching-evidence (auditoria de proveniência do merge).

Evidência do produtor para contraste (não substitui a sua): comentário 5be51e0c na AID-290 com harness `/tmp/opencode/aid290/probe-scene.mjs` e resultados 21/21 do harness AID-278 no alias.

## Se GO
Comentar GO na AID-290 e fechá-la como done. Se NO-GO, registrar defeito com severidade e dono.

