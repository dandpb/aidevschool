# Intent — AID-2762-lease-release-tombstone

Status: accepted
Change-Id: AID-2762-lease-release-tombstone
Origin-Issues: AID-2759 (countersign QA PR #533, achado latente) / AID-2762 (hardening baixa, execução QA Lead)
Base: 5c40b8d7 (ponta corrente de origin/main, pós PR #533)
Cluster: FACTORY (AID-2676) — hardening de caminho morto, sem chamador produto/CLI

## Defeito (citado de AID-2762 — não reescrito)

> `factory/queue.py::EventQueue.release(event_id, holder_enforcement=True)` regrava o lease
> acrescentando a chave `released_at`; `Lease.from_json` (model.py) faz `cls(**json.loads(text))`
> e levanta `TypeError: unexpected keyword argument 'released_at'` em qualquer leitura posterior
> (`lease_of`/`claim`/`lease_expired`).

Repro (executada first-hand pelo QA na abertura de AID-2762 e re-executada na base `5c40b8d7`
desta run antes do fix — `/paperclip/w2762/repro_base.log`):

```python
q = EventQueue(tmp); q.submit(WorkEvent(id='E1', origin='t', scope='t', risk='low'))
q.claim('E1', 'holder-a'); q.release('E1'); q.claim('E1', 'holder-b')  # TypeError
```

Impacto: nenhum chamador produto/CLI usa `release()` com enforcement (único chamador interno
é o takeover em `claim`, que usa `holder_enforcement=False` e faz unlink). Caminho morto —
risco apenas para uso futuro/operador.

## Missão (citada de AID-2762 — "Sugestão")

> Ou `from_json` filtra chaves desconhecidas, ou `release` remove o arquivo (como o takeover
> faz), ou `Lease` ganha `released_at: str | None = None`. Registrar a intenção no README do
> factory.

## Decisão de design

Combinação das opções 1+3 (superset do mínimo pedido), mantendo a semântica existente de
"rewrite-to-released" (o comentário original do código declara a intenção de preservar
histórico; remover o arquivo — opção 2 — mudaria a semântica de `pending()` para um caminho
que hoje é túmulo):

1. `Lease.released_at: Optional[str] = None` — o túmulo vira campo first-class, tipado e
   serializado (o fato de o lease ter sido liberado fica visível/auditável em `lease_of`).
2. `Lease.from_json` filtra chaves desconhecidas — leitura tolerante mata a CLASSE do defeito
   (qualquer chave extra futura, não só `released_at`, deixa de envenenar leitores).
3. `release()` regrava atomicamente (tmp + `os.replace`, mesmo padrão de `heartbeat`) em vez
   de `write_text` direto — crash no meio da regravação não pode truncar o arquivo do lease.

Semântica preservada e agora documentada (README): item liberado NÃO volta a `pending()`;
`claim` dentro do TTL → `LeaseHeldError`; pós-expiração → takeover com época incrementada e
recibo no ledger; `holder_enforcement=False` continua removendo o arquivo (item volta à fila).
