# curriculum/sequencia-dev-guiada — sequência Dev guiada (AID-3510)

Pacote de conteúdo da sequência didática executável da jornada **IA para
Dev** (D1–D7) da escola única (AID-3453). Não é um projeto numerado do
`catalog.md` e não altera engine, runtime ou progresso.

## Estrutura

```text
sequencia-dev-guiada/
├── SEQUENCIA.md                     # documento versionado (r1): ordem por
│                                    # objetivo/pré-requisito, pronto/adaptação/
│                                    # lacuna, fontes+blob SHA, primeira unidade
│                                    # + critérios de aceite + integração
├── pg-d01-debug-reproduza/          # primeira prática guiada (U06, l27, D4)
│   ├── enunciado.md                 # ciclo: exemplo → tentativa → feedback
│   │                                # → retry → takeaway (25–40 min)
│   ├── exemplo-trabalhado.md        # caso real wf 02-corrigir-bug (citado)
│   ├── insumos/                     # bugreport, REGRA (autoridade), fixture
│   │   ├── bugreport.md             #   notas.py (Python puro, sem rede) +
│   │   ├── REGRA.md                 #   testes.py (5 testes, verde c/ bug)
│   │   └── fixture/{notas.py,testes.py}
│   ├── rubrica-v1.md                # 6 critérios objetivos + perChecks
│   └── guia-de-correcao/            # SEPARADO do enunciado:
│       ├── teste_regressao_bug001.py  # vermelho contra a fixture original
│       ├── solucao/notas.py           # fix mínimo (1 caractere, causa raiz)
│       └── solucao.md                 # saídas reais da execução completa
└── pg-d04-contexto-e-spec/          # prática guiada (U09, M4/M5, D2;
                                     # AID-3646) — pacote de contexto +
                                     # PRD/SPEC de tarefa ≤30 min
    ├── enunciado.md                 # ciclo guiado + objetivos (a)/(b)/(c)
    │                                #   + bordas fixadas B1/B2/B3
    ├── exemplo-trabalhado.md        # CONTEXTO/PRD/SPEC reais do
    │                                #   workflow-exemplo + gates ciclos
    │                                #   05/06 (citados, c/ blobs e saídas)
    ├── insumos/                     # fixture fictícia local: PEDIDO (5
    │   ├── PEDIDO.md                #   entregas embutidas), inventário
    │   ├── inventario-repo.txt      #   neutro do repo fictício e
    │   └── verifica_contexto_spec.py  # verificador mecânico offline
    ├── rubrica-v1.md                # 7 critérios (met/partial/not_met) + perChecks
    ├── MANIFEST.md                  # allowlist do pacote + proveniência (blobs)
    └── guia-de-correcao/            # SEPARADO do enunciado:
        ├── solucao/{CONTEXTO,PRD,SPEC}.md  # documentos-modelo
        ├── contraexemplos/01..04/   # 4 negativos rejeitados (ruído/sem
        │                            #   limite/aceite vago/spec aberta)
        ├── teste_verificador.py     # suíte determinística positivo+negativo
        └── solucao.md               # saídas reais + leitura por critério
```

## Como rodar a fixture (verificação local, sem rede)

```sh
cd curriculum/sequencia-dev-guiada/pg-d01-debug-reproduza
python3 insumos/fixture/notas.py "Ana 5.5 6.5" "Bia 6.0 6.0" "Caio 7.0 5.0"
# bug: 3x "REPROVADO" (média 6.0 deveria aprovar — REGRA.md)

PYTHONPATH=insumos/fixture python3 insumos/fixture/testes.py
# 5 testes passaram (suíte verde com o bug presente)

PYTHONPATH=insumos/fixture python3 guia-de-correcao/teste_regressao_bug001.py
# AssertionError ... obtido 'REPROVADO' (vermelho pelo motivo certo)
```

## Como rodar o pg-d04 (verificação local, sem rede)

```sh
cd curriculum/sequencia-dev-guiada/pg-d04-contexto-e-spec
python3 insumos/verifica_contexto_spec.py guia-de-correcao/solucao
# falhas: 0 / veredito: met (solução-modelo no piso mecânico)

python3 guia-de-correcao/teste_verificador.py
# 6 testes passaram (1 positivo + 4 contraexemplos rejeitados + uso inválido)

python3 insumos/verifica_contexto_spec.py guia-de-correcao/contraexemplos/01-contexto-ruidoso
# FALHA ... node_modules/ ... veredito: not_met (negativo pelo motivo certo)
```

## Deduplicação

Consome sem refazer: AID-3456 (matriz r2.1), AID-3497 (competências l01–l32
r3), AID-3505 (metadados P/S), AID-3506 (práticas tp-c01/tp-d01). Ver
`SEQUENCIA.md` § Deduplicação e §6 (próximos trabalhos com donos).
pg-d04 (AID-3646, U09) fatia a adaptação U09 consumindo curso-simples M4–M5,
o workflow-exemplo (CONTEXTO/PRD/SPEC) e os fixtures 05/06 do workflow_lab
como fontes (blobs no MANIFEST do pacote), sem duplicar pg-d01/pg-d02
(pg-d02 em PR próprio fatia U03), pg-d03 (U07, em PR próprio), tp-d01 nem a
fatia de app AID-3527/3643; sem integração com runtime/catálogo — autoria
offline apenas.
