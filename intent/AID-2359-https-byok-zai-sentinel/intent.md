# Intent: registro fast-path do fix HTTPS BYOK zai-duolingo-like `/api/chat` (PR #488, origem Sentinel)

Author: Sentinel (`google-labs-jules[bot]`, produtor do fix) · registro fast-path: FPE (despacho AID-2359, auditoria AID-2358 Registro #1) · Change-id: AID-2359-https-byok-zai-sentinel · Status: accepted (gate = aceitação §PRs automatizados item 3; veredito FPE GO no carrier)

> Registro do produtor criado **antes do merge** (fast path §PRs
> automatizados; ordering binding AID-2219; §Merge protocol item 4 permite
> o registro viver no branch do PR). O produtor é um bot sem presença
> Paperclip e não pode registrar a própria intent — o elo escrito é criado
> pelo agente despachado (AID-2359). Carrier: issue Paperclip **AID-2359**
> (veredito first-hand: comentário `3ecf91fa-e852-4db1-9016-1b638efea33f`,
> 2026-09-17T20:43:32Z — **GO/countersign**). PR:
> https://github.com/dandpb/aidevschool/pull/488 (head `2c1daca1`).

## Problem

Um learner configurando endpoint BYOK via `LLM_BASE_URL` podia informar URL
`http://` (sem criptografia); a rota `POST /api/chat` de
`engines/zai-duolingo-like` enviava `Authorization: Bearer ${apiKey}` para
esse endpoint em texto claro — exposição da API key na rede (CRITICAL para
varredura Sentinel; report no corpo do PR #488).

## Proposed outcome

Requisição com endpoint `http://` não-localhost é recusada com 400 ANTES de
qualquer envio com a chave; `https://` funciona como antes; `localhost`/
`127.0.0.1` em HTTP permanece permitido (LLM local, ex. Ollama :11434 —
chave não sai do loopback). URL inválida → 400. Observável pelos testes de
API do engine.

## Affected users and systems

Engine `engines/zai-duolingo-like` (rota `src/app/api/chat/route.ts` +
`tests/api/chat.test.ts`). Nenhum outro engine; nenhum substrate Python;
sem mudança de contrato público além do novo 400 (novos erros:
"Segurança: O endpoint deve usar HTTPS (exceto localhost)." e
"URL base inválida.").

## Constraints

- Sem novo PII; sem tocar segredos de produção; defaults preservados
  (`https://api.z.ai/...`).
- Fail-closed: parse falho ou protocolo não permitido → 400, nunca
  degrada para envio.
- Guardrails do diff aplicáveis (nenhum path protegido editado; somente
  arquivo de teste NOVO — new-test-allowed; sem credenciais no diff).

## Open questions

- Isentar loopback IPv6 `[::1]`? Nota não-bloqueante do veredito FPE
  (AID-2359 §2a): hoje rejeitado (fail-closed). Follow-up opcional de
  conveniência, não de segurança.
