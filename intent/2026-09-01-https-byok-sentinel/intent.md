# Intent: registro retroativo do fix HTTPS BYOK (PR #216, origem Sentinel)

> **RETROSPECTIVE RECORD** — criado retroativamente em 2026-09-09 pelo CEO
> sob AID-1136 r2, em resposta ao achado **F1 (Major)** do countersign QA
> AID-1137 (r1): o PR foi merged **sem trilha fast-path do produtor**. Este
> registro documenta o elo escrito do produtor; a substância (severity,
> descrição do fix e verificação abaixo) são **afirmações do bot Sentinel no
> corpo do PR #216**, não re-verificadas de forma independente para este
> retrofit — a aceitação da época foi o founder merge no GitHub.

Author: Sentinel (bot externo, conta `dandpb`, via `google-labs-jules[bot]`) ·
registro retroativo: CEO (AID-1136 r2) · Change-id:
`2026-09-01-https-byok-sentinel` · Status: accepted (founder merge GitHub;
retrofit docs-only)

## Problem (claim do produtor)

Severity **HIGH**: um learner configurando um endpoint BYOK ("Bring Your Own
Key") no `dojoToday` podia inserir uma base URL `http://` (não-criptografada).
Com URL não-criptografada, a API key (enviada no header `Authorization`)
trafegaria em plaintext na rede local, permitindo interceptação.

## Fix aplicado (claim do produtor)

Validação antes do `fetch` em `askSocrates`
(`engines/dojoToday/src/assistant.ts`, +15/−0): a `URL` parseada deve ter
protocolo `https:`, com isenção para `localhost` e `127.0.0.1` (dev local).
Também adicionou `.jules/sentinel.md` (+5).

## Merge

PR #216 merged por founder merge GitHub em 2026-09-01 12:53:15Z, merge
commit `5de4e1470a5533c378c60a040324e10eb9d995f9`.
