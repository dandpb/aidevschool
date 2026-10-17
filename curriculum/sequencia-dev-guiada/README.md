# curriculum/sequencia-dev-guiada — sequência Dev guiada (AID-3510/AID-3553)

Pacote de conteúdo da sequência didática executável da jornada **IA para
Dev** (D1–D7) da escola única (AID-3453). Desde a AID-3535 a família tem
entrada canônica no `catalog.md` (projeto `19_sequencia_dev_guiada`, seção
"Level 0 — Sequência Dev Guiada", status `planned`) para os bindings de
missão do OS — o conteúdo canônico continua **aqui** (o catálogo referencia,
não duplica). Ids canônicos por unidade: unitId `sequencia-dev-guiada:pg-dNN`
(padrão `<família>:<unidade>`, espelhando `ai-literacy:lNN`; ex.
`sequencia-dev-guiada:pg-d01`), `contentVersion` `<practiceId>@<sha256-12>`
sobre os arquivos do pacote (paridade com a projeção do OS, AID-3534). Não
altera engine, runtime ou progresso.

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
├── pg-d02-pedido-estruturado/       # segunda prática guiada (U03, M3, D3;
│   │                                # AID-3553) — pedido de 5 campos
│   ├── enunciado.md                 # ciclo guiado + casos de borda B1/B2
│   ├── exemplo-trabalhado.md        # M3 §3.1–3.2 + PRD/SPEC workflow-exemplo
│   ├── insumos/                     # pedido-original (romance), amostra fixa
│   │   ├── pedido-original.md       #   meus_commits.json (11 commits) e
│   │   ├── meus_commits.json        #   verificador mecânico de formato
│   │   └── verifica_pedido.py
│   ├── rubrica-v1.md                # 7 critérios (met/partial/not_met) + perChecks
│   └── guia-de-correcao/            # SEPARADO do enunciado:
│       ├── pedido-5-campos.md         # pedido-modelo (decide B1/B2)
│       └── solucao.md                 # saídas reais + vereditos B1/B2
└── pg-d03-refatorar-com-rede/       # prática guiada (U07, l28, D4;
                                     # AID-3562) — refatoração com rede de
                                     # segurança (comportamento é o contrato)
    ├── enunciado.md                 # ciclo guiado + objetivos (a)/(b)/(c)
    ├── exemplo-trabalhado.md        # wf 03-refatorar-seguro (citado, c/
    │                                # blobs) — método; prática fecha o buraco
    ├── insumos/                     # PEDIDO (refatoração + proposta do
    │   ├── PEDIDO.md                #   assistente), CONTRATO (autoridade,
    │   ├── CONTRATO.md              #   C1–C5), proposta completa e fixture
    │   ├── proposta-refatoracao.md  #   pedidos.py + testes.py (6 verdes,
    │   └── fixture/{pedidos.py,testes.py}   # cobertura não fecha o contrato)
    ├── rubrica-v1.md                # 7 critérios (met/partial/not_met) + perChecks
    └── guia-de-correcao/            # SEPARADO do enunciado:
        ├── caracterizacao/teste_caracterizacao.py  # C2/C3 (verde no original)
        ├── armadilha/pedidos.py      # proposta aplicada: 6/6 verde E C2/C3
        │                            #   violadas — o contraexemplo executável
        ├── solucao/pedidos.py        # refatoração em 3 passos, contrato vivo
        └── solucao.md                # saídas reais + diffs por passo
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

## Como rodar o pg-d02 (verificação local, sem rede)

```sh
cd curriculum/sequencia-dev-guiada/pg-d02-pedido-estruturado
python3 ../../../docs/curso-simples/workflow-exemplo/release_notes.py \
  insumos/meus_commits.json --version v0.9.0   # estado atual (exit=0, 5 seções)

python3 insumos/verifica_pedido.py guia-de-correcao/pedido-5-campos.md
# campos: 5/5 · veredito: met  (contra insumos/pedido-original.md: 0/5, not_met)

python3 insumos/verifica_pedido.py --caminhos guia-de-correcao/pedido-5-campos.md
# 3x "ok caminho …" · veredito: met

cd ../../../docs/curso-simples/workflow-exemplo && python3 -m pytest test_release_notes.py -q
# 22 passed  (fonte do exemplo, intocada)
```

## Como rodar o pg-d03 (verificação local, sem rede)

```sh
cd curriculum/sequencia-dev-guiada/pg-d03-refatorar-com-rede
PYTHONPATH=insumos/fixture python3 insumos/fixture/testes.py
# 6 testes passaram (baseline verde)

PYTHONPATH=insumos/fixture python3 guia-de-correcao/caracterizacao/teste_caracterizacao.py
# 3 caracterizacoes passaram (rede fecha C2/C3 sobre o original)

PYTHONPATH=guia-de-correcao/armadilha python3 insumos/fixture/testes.py
# 6 testes passaram  ← a proposta do assistente PASSA na suíte existente

PYTHONPATH=guia-de-correcao/armadilha python3 guia-de-correcao/caracterizacao/teste_caracterizacao.py
# AssertionError: C2 violada: ordem de erro trocada (exit 1) — contraexemplo:
# verde na suíte ≠ comportamento preservado

PYTHONPATH=guia-de-correcao/solucao python3 insumos/fixture/testes.py
PYTHONPATH=guia-de-correcao/solucao python3 guia-de-correcao/caracterizacao/teste_caracterizacao.py
# 6 testes passaram + 3 caracterizacoes passaram (contrato vivo na solução)
```

## Deduplicação

Consome sem refazer: AID-3456 (matriz r2.1), AID-3497 (competências l01–l32
r3), AID-3505 (metadados P/S), AID-3506 (práticas tp-c01/tp-d01). Ver
`SEQUENCIA.md` § Deduplicação e §6 (próximos trabalhos com donos).
pg-d02 (AID-3553, U03) e pg-d03 (AID-3562, U07) fatiam as adaptações U03 e
U07 consumindo curso-simples/wf 02–03 como fontes, sem duplicar pg-d01,
tp-d01 nem a fatia de app AID-3527; verificação de deduplicação de U07 no
board registrada na entrega AID-3562.
