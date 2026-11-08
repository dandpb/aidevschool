# AID-3656: Verificar contraprovas de delegação U10

- **Status:** done | **Priority:** medium | **Origin:** manual
- **Assignee:** Verifier & Evidence Engineer | **Created:** 2026-10-01T19:21:01.109999+00:00 | **Updated:** 2026-11-01T14:14:23.113+00:00
- **ID:** `27440aa6-8fa5-4c99-be1d-f6e808b4705b`

## Description

Gate V\&E independente previsto na AID-3647 e aprovado pelo PO, agora com contrato e fixtures congelados e corrigidos. O produtor é Content Designer; V\&E é um verificador distinto e somente executa e relata, sem editar as fontes. Head exato do PR #646: f7e3228a80cecc68e426e7d59d080a234d249104. Não usar o head antigo ef8b74d6. Base: e01d9d42, branch aid3510/sequencia-dev-guiada. Pacote: curriculum/sequencia-dev-guiada/pg-d05-delegacao-controlada/, MANIFEST.md com 17 arquivos e ALLOWLIST.md. A revisão CPE seguida do aceite CCE na AID-3647 permanece independente; o PO adjudica este gate adicional. Nenhuma mudança dos estágios ou do dono da tarefa principal.



Em worktree própria, verificar pins, hashes e o contrato fornecido, que independe de U09. Executar as contraprovas offline, sem confiar apenas no selftest do produtor. A baseline deve passar 6 testes e reproduzir V3. A proposta r1 deve produzir uma suíte verde manufaturada pela adulteração de testes.py, infringir a allowlist e o máximo de 2 arquivos, e divergir de V3. A proposta r2 deve preservar testes.py e V3, passar V1 e os 4 testes de V2. O recibo falso deve reprovar por fatos verificáveis de identidade, proveniência e resultado, enquanto o legítimo passa. Uso inválido deve falhar de forma fechada. Confirmar que o aprendiz pode separar a alegação do produtor da evidência independente e apontar a violação concreta.



Contraprovas podem usar cópias temporárias fora da árvore. Não alterar fontes, fixtures ou manifesto. Conferir as instruções corrigidas de bundle e worktree: a proposta do exemplo deve reproduzir a falha esperada e o master do demo deve passar, sem confundir esse master com a main do projeto. Evitar testes sem relação com o escopo.



Entregar relatório com head, entrada, arquivo, resultado esperado e observado, comandos, códigos de saída e limites. Esta é uma verificação real, não uma nova implementação, outro scorer, formatter ou exercício. Sem APIs live, credenciais, dados pessoais, mudanças de runtime, restart, CI manual, merge ou deploy. Se o head divergir, parar e pedir novo pin ao PO. A situação do countersign de release é separada do mérito da verificação. O formatter aceito do PR #637 só pode validar fatos explícitos, nunca estabelecer autoridade. Registrar a própria run e sessão reais, nunca UUID de projeto ou \_default. Reportar falhas pelo caminho permitido ao produtor legítimo. Parar na primeira negação 403, 409 ou 422, sem proxy, outro ator, endpoint, dono ou filha alternativa.

## Document `Continuation Summary` (2026-10-01)

# Continuation Summary

- Issue: AID-3656 — Verificar contraprovas de delegação U10
- Status: done
- Priority: medium
- Current mode: review
- Last updated by run: 8ac630fd-a5ef-4579-b51d-1812c77cc3b2
- Agent: Verifier & Evidence Engineer (opencode_local)

## Objective

Gate V\&E independente previsto na AID-3647 e aprovado pelo PO, agora com contrato e fixtures congelados e corrigidos. O produtor é Content Designer; V\&E é um verificador distinto e somente executa e relata, sem editar as fontes. Head exato do PR #646: f7e3228a80cecc68e426e7d59d080a234d249104. Não usar o head antigo ef8b74d6. Base: e01d9d42, branch aid3510/sequencia-dev-guiada. Pacote: curriculum/sequencia-dev-guiada/pg-d05-delegacao-controlada/, MANIFEST.md com 17 arquivos e ALLOWLIST.md. A revisão CPE seguida do aceite CCE na AID-3647 permanece independente; o PO adjudica este gate adicional. Nenhuma mudança dos estágios ou do dono da tarefa principal.



Em worktree própria, verificar pins, hashes e o contrato fornecido, que independe de U09. Executar as contraprovas offline, sem confiar apenas no selftest do produtor. A baseline deve passar 6 testes e reproduzir V3. A proposta r1 deve produzir uma suíte verde manufaturada pela adulteração de testes.py, infringir a allowlist e o máximo de 2 arquivos, e divergir de V3. A proposta r2 deve preservar testes.py e V3, passar V1 e os 4 testes de V2. O recibo falso deve reprovar por fatos verificáveis de identidade,
[truncated]

## Acceptance Criteria

No explicit acceptance criteria captured.

## Recent Concrete Actions

- Run `8ac630fd-a5ef-4579-b51d-1812c77cc3b2` finished with status `succeeded` at 2026-10-01T20:01:13.117Z.
- Dedup: PR #646 tem 1 comentário (Provenance do produtor CD, issuecomment-5938624594); **nenhuma linha `Countersign:` existe** — preciso publicá-la. Head confirmado `f7e3228a`, base `e01d9d42`. Agora capturo o run/sessão REAIS da verificação original nos registros:

Esse log é a publicação atual em execução (`ses_f071629e1ffe…`, iniciada em 19:56Z) — autorreferenciado. Encontrando o log de execução original (~19:21–19:24Z):

O log de execução original `64079f87…ndjson` (15:24 local = 19:24Z). Extraindo sua sessão real e prova de conteúdo:

Sessão real identificada: `ses_f071629e1ffeFXNNu6KHk1PwU6` — janela do run original 19:21:01Z→19:24:32Z, com as marcas da verificação (selftest ×10, worktree ×4, veredito 5f1c3c7b ×3). Confirmo criação/atividade da sessão no registro do opencode:

Registro da sessão confirmado (título "Contraprovas de delegação U10 (AID-3656)", criado em 19:21:09.416Z). Agora o formato canônico exato do gate antes de publicar:

Requisitos do gate mapeados (CITATION_RE + PROVENANCE_RE + head pin + fora de code-fence + produtor ≠ countersigner). Verificando convenção do meu identificador de agente em provenances anteriores:

Existe o helper offli
[truncated]

## Files / Routes Touched

- `scripts/receipt_canon_check.py`
- `scripts/sdlc_aid_resolve.sh`
- `scripts/sdlc_guard_check.sh`
- `scripts/countersign_gate_check.py`

## Commands Run

- Heartbeat run `8ac630fd-a5ef-4579-b51d-1812c77cc3b2` invoked adapter `opencode_local`.
- Detailed shell/tool commands remain in the run log and transcript.

## Blockers / Decisions

- No new blocker was recorded by the latest run.

## Next Action

- Review the completed issue output and close any remaining follow-up comments.

## Comments (3)

**Verifier & Evidence Engineer** · 2026-10-01T19:24:07.017996+00:00

**Contraprovas de delegação U10 verificadas first-hand — pacote `pg-d05-delegacao-controlada` no head `f7e3228a80cecc68e426e7d59d080a234d249104` (PR #646): REPRODUZ 12/12, nenhuma divergência. Gate V&E despachável.**

Verificação independente em worktree limpa + clone limpo na base `e01d9d42` (offline, Python 3.13, Node sem instalar dependências), sem confiar em output do produtor.

## Bateria gate × check × status

| # | Check (comando) | Esperado | Obtido | Status |
|---|---|---|---|---|
| 1 | MANIFEST sha256 (17 arquivos, head `f7e3228a`) | 17/17, 0 divergências | 17/17 conferidos, 0 divergências | ✔ |
| 2 | `python3 insumos/verifica_delegacao.py selftest` | APROVADO 4/4, exit 0, saída = congelada | APROVADO 4/4, exit 0, saída byte a byte idêntica ao MANIFEST | ✔ |
| 3 | `escopo delegacao-r1/diff-r1.patch` | REPROVADO exit 1 (3 FALHAs) | REPROVADO exit 1: `proibido: testes.py`, `fora da allowlist: util_texto.py`, `3 arquivos > máx 2` | ✔ |
| 4 | `escopo delegacao-r2/diff-r2.patch` | APROVADO exit 0 | APROVADO exit 0 (biblioteca.py +5 −1; teste_validacao.py +43 −0) | ✔ |
| 5 | `evidencia …/recibo-falso.md` (negativo) | REPROVADO exit 1 | REPROVADO exit 1 (V3 diverge; recibo cita saída do produtor — produtor ≠ verificador) | ✔ |
| 6 | `evidencia …/recibo-aceite-r2.md` | APROVADO exit 0 | APROVADO exit 0 | ✔ |
| 7 | Uso inválido / modo inexistente | fail-closed exit 2 | exit 2 nos dois casos | ✔ |
| 8 | Baseline fixture `python3 testes.py` | 6/6 verde, exit 0 | `6 testes passaram`, exit 0 | ✔ |
| 9 | r1 aplicada em cópia limpa (contraprova do verde manufaturado) | suíte verde MAS `testes.py` sha256 `41c0669d…` ≠ contrato `e1deddbf…` | verde 6/6 exit 0 e `sha256 = 41c0669d` ≠ `e1deddbf` — alegação do produtor reproduz, verde é manufaturado | ✔ |
| 10 | r2 aplicada em cópia limpa | `testes.py` byte-idêntico + V1 6/6 + V2 `4 testes passaram` + V3 = `aceite-v3` | `e1deddbf` ✔, V1 6/6 ✔, V2 `4 testes passaram` exit 0 ✔, V3 igual linha a linha ao bloco congelado ✔ | ✔ |
| 11 | `exemplo-trabalhado.md` §"Como reproduzir" (correção do r1 da revisão) executado exatamente como escrito, clone limpo na base `e01d9d42` | bundle fetch + worktrees: proposta `✖ PROVA-CRÍTICO`/fail 1/exit 1; master 8/8 exit 0; limpeza OK | proposta: `✖ PROVA-CRÍTICO`, `fail 1`, exit 1 ✔; master: `pass 8 / fail 0`, exit 0 ✔; `git worktree remove` OK; zero dependências instaladas | ✔ |
| 12 | Nits do r1 da revisão | enunciado "E2.1–E2.4"; rubrica c3 "decomposta" | enunciado.md:60 `E2.1–E2.4` ✔ (nenhum "E1–E4" remanescente); rubrica-v1.md:13 `decomposta` ✔ | ✔ |

## Integridade e higiene

- Diff `e01d9d42..f7e3228a` restrito ao diretório novo (18 arquivos, +1291/−0, zero originais tocados); base é ancestral do head ✔.
- Gabarito separado: `guia-de-correcao/` não é dependência de nenhum passo learner-facing — enunciado.md:131 orienta consultar **após** a tentativa e ALLOWLIST.md:33 lista consulta prévia como **proibição** ✔.
- CI no head `f7e3228a`: `Python (learner + curriculum shared)`, `curriculum Node/Go/Rust`, `SDLC guardrails (diff)` → success; `countersign-gate` → failure **exclusivamente §1** (anotação: "no 'Countersign: …' line found" — aguarda countersign distinto do aprovador, fluxo normal pré-merge; atribuição de produtor resolvida, sem "producer unattributed") ✔.

## Veredito V&E

O negativo central da prática (falsa comprovação rejeitada) e a contraprova do verde manufaturado (r1 verde com `testes.py` divergindo do contrato) reproduzem first-hand; o comando único congelado (`selftest`) reproduz byte a byte. O bloco de reprodução corrigido no r1 agora executa como escrito. **Nenhuma divergência encontrada; nenhuma ação requerida do produtor.** Pendência restante no PR #646 é só governança (Countersign §1, do fluxo de aprovação — não do meu domínio).

Disposição: **done** (verificação completa, evidência acima). Cross-ref postada na issue pai (AID-3647) para o re-review CPE.

**founder** · 2026-10-01T19:56:07.738709+00:00

PO — fechamento factual de metadados da sua própria verificação independente já concluída, sem repetir os12checks. PR #646, head f7e3228a80cecc68e426e7d59d080a234d249104; seu veredito5f1c3c7b-f974-4e1d-8457-b7e617069ff7 nesta3656. Faça dedup primeiro e confira head atual e Provenance do produtor original CD no body/registro permitido.



Se ainda faltar, publique UMA linha Countersign no formato canônico citando ESTA tarefa/veredito/head, com sua própria Provenance: agente, task, run e sessão REAL da verificação original, capturados nos registros. Separe o run original daquele desta publicação. Nada de UUID de projeto, placeholder, sessão de outro agente ou assinatura por proxy. O formatter offline existente apenas valida fatos, não dá autoridade. Se já houver counter válido, apenas informe a referência.



Readback do comentário, prova de identidade do original reviewer e validação factual do gate; preserve a ressalva de que comentário/revalidação live não torna verde retroativamente o check histórico do head. Sem código, testes, CI manual, merge, deploy, nova tarefa ou mudança de owner/stages. Pare na primeira negativa, sem ator alternativo. Deixe3656Done ao concluir. [@Verifier & Evidence Engineer](agent://616b5f9b-15c8-4ad1-816c-78a7317e0202?i=puzzle)

**Verifier & Evidence Engineer** · 2026-10-01T20:01:04.334189+00:00

**Fechamento de metadados concluído (pedido do PO, comentário 7d6de0e7) — Countersign publicada e validada factualmente. Sem re-execução dos 12 checks.**

## Dedup (antes de publicar)

Varredura de corpo + comentários do PR #646 às 19:56Z: **nenhuma linha `Countersign:` pré-existente** — único comentário era o registro de proveniência do produtor (issuecomment-5938624594). Nenhuma duplicação; a publicação abaixo é a primeira e única citação operativa. Nenhuma marca VOID/HELD posterior.

## Head e Provenance do produtor (conferidos)

- Head atual do PR #646: `f7e3228a80cecc68e426e7d59d080a234d249104` (head ref `aid3647/u10-delegacao-controlada`, base `e01d9d42`, state open) — inalterado desde o veredito.
- Provenance do produtor original CD no registro permitido (comentário 5938624594, fora de code-fence): `Provenance: agent=content-designer task=AID-3647 run=4bba7070-05e7-45b3-bf37-d1b4b448a2a5 session=ses_f07402aefffesG6Dj6jEPEZmiC` — casa em `PROVENANCE_RE` (scripts/countersign_gate_check.py:86).

## Countersign publicada (UMA linha, formato canônico)

Comentário [issuecomment-5939474349](https://github.com/dandpb/aidevschool/pull/646#issuecomment-5939474349) (2026-10-01T20:00:12Z), linhas fora de code-fence:

Countersign: AID-3656 verdict 5f1c3c7b-f974-4e1d-8457-b7e617069ff7 head=f7e3228a80cecc68e426e7d59d080a234d249104
Provenance: agent=verifier-evidence task=AID-3656 run=64079f87-3f77-4330-9434-4b2fa6179ce0 session=ses_f071629e1ffeFXNNu6KHk1PwU6

## Identidade do reviewer original (dos registros, sem placeholder)

- Run original da verificação: `64079f87-3f77-4330-9434-4b2fa6179ce0` (este agente, `616b5f9b-15c8-4ad1-816c-78a7317e0202`, Verifier & Evidence Engineer), janela 19:21:01.863Z → 19:24:32.571Z, succeeded 19:24:32.761Z — log em `run-logs/…/616b5f9b…/64079f87….ndjson`.
- Sessão REAL desse run: `ses_f071629e1ffeFXNNu6KHk1PwU6` — criada 19:21:09.416Z, título "Contraprovas de delegação U10 (AID-3656)", diretório `/paperclip` (opencode.db); é nela que constam a execução da bateria (selftest ×10, worktrees, sha256 ×13) e o POST do veredito `5f1c3c7b…`.
- Run desta publicação é distinto: `8ac630fd-a5ef-4579-b51d-1812c77cc3b2` (aberto 19:56:16Z pela reabertura) — apenas metadados; a Provenance cita o run original, não o da publicação. Sem UUID de projeto, sem sessão de outro agente, sem proxy.

## Validação factual do gate (offline, sem disparar CI)

- Rascunho pré-validado pelo helper offline (`receipt_canon_check.py --render/--check`, AID-3585): forma canônica OK, sem placeholder/troca actor-session.
- Linhas do comentário publicado re-conferidas contra `CITATION_RE`/`PROVENANCE_RE`/`SHA40_RE` do próprio gate no body vivo.
- Gate hermético (`countersign_gate_check.py --context` com body+comments vivos do PR, `--head f7e3228a…`, resolver `sdlc_aid_resolve.sh`): **exit 0** — "agent=verifier-evidence, distinct from producer agent=content-designer, head pinned, posted 2026-10-01T20:00:12+00:00".

## Ressalva preservada

Esta citação/revalidação live **não torna retroativamente verde** o check-run histórico `countersign-gate` (failure §1) registrado no head `f7e3228a`; apenas uma nova execução do pipeline no mesmo head registrará o estado com a citação operativa presente. O formatter offline valida fatos de forma, não confere autoridade.

Nenhum código, teste, CI manual, merge, deploy, nova tarefa ou mudança de owner/stages. Disposição: **done**.

---

