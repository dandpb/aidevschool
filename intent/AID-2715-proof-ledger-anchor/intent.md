# Intent: Âncora de evidência de prova no ledger encadeado (AID-2715)

Author: CEO (Paperclip AID-2715) · Change-id: AID-2715-proof-ledger-anchor · Status: accepted

> Defeito reportado pelo FACTORY-STRESS AID-2686/S5 (parent): "evidência de
> prova é auto-atestada — output tampered + proofs.json forjado passa no
> gate". Repro mínima no thread da AID-2715.

## Problem

Na estação prove, o digest do output de cada check (`output_sha256`) vive
apenas em `proofs/proofs.json` (runtime, gitignored). O recibo `verified`
grava só `proof_refs=[check_ids]` — nada ancora os digests das provas na
cadeia de hashes nem no registro versionado. Quem tem acesso ao FS do
runtime reescreve `proofs/<id>.output.txt` + atualiza `output_sha256` no
`proofs.json`, e tanto o gate (`promote`) quanto `factory ledger --verify`
(`chain_ok: true`) aceitam.

## Proposed outcome

- O recibo `verified` sela `{check_id, cmd_sha256, exit_code,
  output_sha256}` (por check) no payload do ledger encadeado.
- O gate recalcula a evidência a partir do runtime e compara com a âncora:
  divergência ou ausência de âncora bloqueia (fail-closed).
- `receipt.summary.json` (que volta ao registro versionado) leva a âncora.
- Ledgers pré-correção continuam verificáveis (compat de payload).

## Affected users and systems

`factory/` (POC da fábrica agente) apenas; runtime `.scratch/factory/`
inalterado em formato (só ganha campo novo em recibos novos).

## Constraints

- Sem mudar formato da fila/lease; sem PII; sem custo externo.
- Fail-closed: sem âncora ⇒ block (prova auto-atestada não é evidência).
- Limitação residual declarada: atacante que reescrever TODO o ledger e
  re-selar a cadeia continua indetectável dentro do runtime; a contraparte
  é a âncora em `receipt.summary.json` no registro versionado (Git).

## Open questions

- Âncora externa (e.g. digest do ledger publicado fora do host) fica como
  follow-up de hardening, fora do escopo P2.
