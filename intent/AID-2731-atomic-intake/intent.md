# Intent — AID-2731-atomic-intake

Status: accepted
Change-Id: AID-2731-atomic-intake
Origin-Issues: AID-2727 (defeito FACTORY-DEFECT MÉDIA, tracking SM) / AID-2731 (execução, Platform & CI)
Base: 43dd3e2e (ponta corrente de origin/main, pós PR #529 e PR #528)
Cluster: FACTORY-STRESS (AID-2681) — mesmo cluster de AID-2721 (fencing), vetor distinto (intake concorrente)

## Defeito (citado de AID-2727 — não reescrito)

> **Comportamento:** `queue.submit` (factory/queue.py:38-52) é check-then-act SEM O_EXCL no
> arquivo da fila. Dois envios concorrentes do MESMO id novo com payloads DIVERGENTES: ambos
> retornam OK (aceitação silenciosa; last-writer-wins) — 1–21/200 rodadas; nas demais, um dos
> lados crasha com `FileNotFoundError` porque ambos usam o MESMO tmp `queue/<id>.tmp` e um
> consome o arquivo do outro no `os.replace`. Sequencial divergente rejeita corretamente (PASS).

> **Correção sugerida:** criação atômica com O_CREAT|O_EXCL no arquivo final (igual ao lease)
> e tmp único por pid/uuid (`<id>.<pid>.tmp`); divergência detectada na segunda escrita →
> FactoryError.

Confirmação first-hand (SM, 2026-09-26, reexecutada na base `2d9928f2` e conferida na ponta
`43dd3e2e` — queue.py:38-52 inalterado): S4-seq PASS; concorrente 10/200 e 5/200 rodadas
aceitaram AMBOS os payloads divergentes; demais rodadas `FileNotFoundError` no tmp compartilhado.

## Missão (citada de AID-2731)

> Intake atômico: criação com `O_CREAT|O_EXCL` no arquivo final da fila (como o lease); tmp
> único por escritor (`<id>.<pid>.<uuid>.tmp` ou equivalente); reenvio idêntico permanece
> idempotente (retorna existing); divergência — concorrente OU sequencial — → `FactoryError`
> (mensagem atual `already exists with different payload`).

## Decisão de design (formato da primitiva atômica)

A semântica exigida é **create-if-absent atômico no arquivo final com conteúdo completo**.
Duas formas literais de `os.open(O_CREAT|O_EXCL)` no destino foram avaliadas e rejeitadas
porque expõem janela de leitura parcial/ vazia a um perdedor sincronizado por barreira
(exatamente o cenário do stress):

- abrir o destino com O_EXCL e escrever o payload direto no fd: o perdedor recebe EEXIST
  e lê o arquivo **enquanto o vencedor ainda escreve** → `JSONDecodeError` fora do contrato;
- abrir o destino com O_EXCL (placeholder vazio) e depois `os.replace(tmp, path)`: o perdedor
  lê o **placeholder vazio** entre open e replace → mesmo problema.

A primitiva escolhida implementa a mesma semântica O_EXCL sem essa janela: **tmp único por
escritor + `os.link(tmp, path)`**. `link(2)` é atômico e create-if-absent (EEXIST se o destino
existe): o arquivo da fila só se torna visível **já com o conteúdo completo** (o tmp é escrito
e fechado antes do link), então o perdedor sempre lê um payload íntegro — determinístico:
exatamente 1 aceite e 1 `FactoryError` por rodada, 0 estados parciais. É o mesmo espírito do
padre do lease (claim usa O_CREAT|O_EXCL; aqui o conteúdo exige tmp+link), tmp por pid+uuid
(`<id>.<pid>.<uuid8>.tmp`), unlink do próprio tmp em todo caminho de saída.

## Fora do escopo (vínculo registrado)

Path injection no `event.id` (friction-log AID-2684 linha 9, `aberto`) habita a mesma função,
mas é defeito com registro próprio — fica para correção própria (decisão da estação: diff
mínimo). Produção (`learner/`, `curriculum/`, `.mavis/`) intacta; runtime só em `.scratch/factory/`.
