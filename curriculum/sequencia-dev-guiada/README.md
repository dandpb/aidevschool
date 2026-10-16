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
└── pg-d01-debug-reproduza/          # primeira prática guiada (U06, l27, D4)
    ├── enunciado.md                 # ciclo: exemplo → tentativa → feedback
    │                                # → retry → takeaway (25–40 min)
    ├── exemplo-trabalhado.md        # caso real wf 02-corrigir-bug (citado)
    ├── insumos/                     # bugreport, REGRA (autoridade), fixture
    │   ├── bugreport.md             #   notas.py (Python puro, sem rede) +
    │   ├── REGRA.md                 #   testes.py (5 testes, verde c/ bug)
    │   └── fixture/{notas.py,testes.py}
    ├── rubrica-v1.md                # 6 critérios objetivos + perChecks
    └── guia-de-correcao/            # SEPARADO do enunciado:
        ├── teste_regressao_bug001.py  # vermelho contra a fixture original
        ├── solucao/notas.py           # fix mínimo (1 caractere, causa raiz)
        └── solucao.md                 # saídas reais da execução completa
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

## Deduplicação

Consome sem refazer: AID-3456 (matriz r2.1), AID-3497 (competências l01–l32
r3), AID-3505 (metadados P/S), AID-3506 (práticas tp-c01/tp-d01). Ver
`SEQUENCIA.md` § Deduplicação e §6 (próximos trabalhos com donos).
