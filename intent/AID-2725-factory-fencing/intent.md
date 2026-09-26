# Intent — AID-2725-factory-fencing

Status: accepted
Change-Id: AID-2725-factory-fencing
Origin-Issues: AID-2725 (defeito, tracking SM) / AID-2748 (CORR — execução, produtor FPE)
Base: ae9db6fc (pós-merge PR #530; S2 já fechado pelo fence de AID-2721/PR #529)
Cluster: FACTORY-STRESS P1 (AID-2681) — mesmas janelas S2/S3a/S3b da QA AID-2682,
reproduzidas na base corrente com os repros de `/paperclip/w2716/stress/`

## Defeito (citado de AID-2725 — não reescrito)

> 1. **Zombie worker (S2):** lease expira com worker vivo; outro contexto assume
>    (takeover legítimo em queue.py:80-82) e o worker zumbi mesmo assim atravessa
>    freeze→build→prove→gate até **PROMOTED** — nenhuma estação revalida posse.
> 2. **Takeover duplo (S3b):** 2 threads + barreira em `claim` sobre lease expirado →
>    2 vencedores em 38–43/300 (janela: decide expirado + `release(unlink)` incondicional +
>    recurse sem revalidar).
> 3. **Crash do perdedor (S3a):** na disputa com lease fresco, perdedor pode ler o arquivo
>    de lease vazio (janela entre `os.open` e `fdopen`) → `JSONDecodeError` não tratado em
>    vez de `LeaseHeldError`.

Confirmação first-hand (FPE, 2026-09-26, base `ae9db6fc` = main corrente):
S3b **43/300** duplos (`s3_claims.py`); S3a **76/300** rodadas com
`JSONDecodeError` vazando para o perdedor (harness 8-way com home fresco por
rodada; probe confirmou o stacktrace `lease_expired → lease_of →
Lease.from_json("")`). S2/S2b (zumbi) **já PASSam** nesta base graças ao fence
das estações de AID-2721 (PR #529) — viram regressão no teste
`test_p1_atomic_takeover.py`.

## Missão (citada de AID-2748)

> Correção acordada (proposta 1 do friction-log, AID-2681): fencing token/epoch
> monotônico por evento no lease; takeover atômico (exatamente 1 vencedor);
> estações e gate carregam e conferem epoch antes de cada escrita/append — epoch
> velho = recusa pelo contrato de saída (exit 2 / erro tipado, nunca crash).
> Parse tolerante + retry curto fecha o S3a.

Sem hotfix fora do loop; runtime só em `.scratch/factory/`; produção intacta.
