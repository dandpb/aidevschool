# PROVENANCE — empacotamento pg-e01-evals-offline (AID-3667)

## Fonte imutável

- Repo `dandpb/aidevschool`, **PR #645** (draft, ainda não merged), head
  `b028652d7853cbd4efdf15035d9f9414aeb76094`, caminho
  `curriculum/praticas-evals-offline/pg-e01-evals-offline/` (27 arquivos) +
  README pai `curriculum/praticas-evals-offline/README.md`.
- Autoria original: AID-3648 (Learner Analytics Engineer; revisão CPE/CD
  aceitas em AID-3648/3654/3659 — não reaberta aqui).

## Comandos reais da construção (executados neste worktree, 2026-10-01)

```sh
# 1. export byte-exato do pin
git archive b028652d7853cbd4efdf15035d9f9414aeb76094 \
  curriculum/praticas-evals-offline/ | tar -x -C /tmp/opencode/aid3667/src
# conferência vs MANIFEST-AID3648 (27/27, drift=0) e vendor em source/
cp -r .../pg-e01-evals-offline docs/learner-downloads/pg-e01-evals-offline/source/
cp .../praticas-evals-offline/README.md docs/learner-downloads/pg-e01-evals-offline/source/README-praticas-evals-offline.md

# 2. hashes do pin -> manifests/pin-hashes.json (28 entradas, gerado por
#    script; 27 linhas do MANIFEST-AID3648 conferidas byte a byte + o próprio
#    MANIFEST + o README pai)

# 3. construção determinística
python3 packager.py --out zips

# 4. prova (extração limpa, fronteiras, execução, reprodutibilidade)
python3 verify_kit.py --report RELATORIO-VERIFICACAO.md   # 24 ok, 0 falha(s)
```

## Decisões de ambiguidade (para CPE/CD)

1. **Saídas do exemplo TrilhaFit na Etapa 1**: mantidas (o passo 1 do
   enunciado manda ler o exemplo trabalhado completo, que usa `exemplo/`
   inclusive `exemplo/heldout/`). O gating é sobre as saídas do PrismaDesk
   (`insumos/fixture/saidas_*` e `insumos/fixture/heldout/`).
2. **Variante C na Etapa 3 (heldout)**: por desenho do passo 6 do enunciado
   ("B vs C, C = correção de referência, já fornecida"); o kit inicial
   (Etapas 1–2) não contém C nem nada do `guia-de-correcao/`.
3. **Etapa 4 mínima**: exatamente `proposta-referencia.md` (passo 7); o
   restante do guia docente só na Etapa 5.
4. **MANIFEST-AID3648.md e README pai**: fora dos ZIPs do aprendiz — são
   proveniência de repo; vivem em `source/` (verificáveis) e aqui.

## Inventário do pin (28 arquivos, sha256 | bytes)

| Arquivo (em `source/`) | Bytes | SHA256 |
| --- | --- | --- |
| `README-praticas-evals-offline.md` | 4495 | `51d05c8ae61bcdcc0148dde50db7439c18b8fc47ad64718af9b78d3ac20a6ec0` |
| `pg-e01-evals-offline/MANIFEST-AID3648.md` | 3955 | `56f14ae82fd8fc0505a98ed29f7751b2c6a8bf05c04c94fd7133938210b09ac5` |
| `pg-e01-evals-offline/enunciado.md` | 5671 | `904328aee662748c42a8384fdbbfb8f38e715c45b296305845e02059c9254e46` |
| `pg-e01-evals-offline/exemplo-trabalhado.md` | 5123 | `a47aa21de1c4e7f2434bdec66e481a450290fe4e48454861e3b82bed9b247f3f` |
| `pg-e01-evals-offline/exemplo/casos_base.json` | 1595 | `eac15a32d7a6447000231a366139bf0da8be9d7915e686a59f7c7cbfa3d4d56f` |
| `pg-e01-evals-offline/exemplo/heldout/casos_heldout.json` | 918 | `d3ef1abc663aeed0d3b36ecea94e8d704327c1cfe79c2950b1e79edc8bb4043c` |
| `pg-e01-evals-offline/exemplo/heldout/saidas_A_heldout.json` | 543 | `f3287fa489403fea4bddef614695c48750ed209ba2e7aad78934f60375b17ec9` |
| `pg-e01-evals-offline/exemplo/heldout/saidas_B_heldout.json` | 537 | `b7f476416dbfea034e5677f723f002485376671417284c2d12738295dcc0ca5a` |
| `pg-e01-evals-offline/exemplo/heldout/saidas_C_heldout.json` | 581 | `0af2d1351f0f1ae62b1236b39e2881f81e9483e68722e7b6e4c167e449a50f4c` |
| `pg-e01-evals-offline/exemplo/saidas_A_base.json` | 848 | `d6f0a5ae0cbc399aeed6d358e39cfde380df1bcb68e2a306252422501faadb36` |
| `pg-e01-evals-offline/exemplo/saidas_B_base.json` | 842 | `1ca26af3039cc0bb2d95ee2d08dbe054b7a6b5d826e35ab894abab3eef280c33` |
| `pg-e01-evals-offline/guia-de-correcao/criterios-referencia.md` | 2155 | `840e39a51274f69ad01233759ed359752811ecbeaba2fc6eb1c87f7b5cfa196e` |
| `pg-e01-evals-offline/guia-de-correcao/proposta-referencia.md` | 3614 | `637bf64988d1d92a1d222de77658b09552b81a1e147dce52f0570fa23c359420` |
| `pg-e01-evals-offline/guia-de-correcao/solucao.md` | 5494 | `c17d732bc74b5de1bf8703dff206cd2b67fbdd0d9f247ca958c1c6e14372bf5a` |
| `pg-e01-evals-offline/guia-de-correcao/testes.py` | 6635 | `4090195ce0ab91ae0dd75e8ab598e97ef1eb961ae907decd9dcbc20e91c25716` |
| `pg-e01-evals-offline/insumos/CENARIO.md` | 2777 | `44c929332e12acc0f6b68c299deb6a69d5e4390df8c184dd95a8f4ada90861f6` |
| `pg-e01-evals-offline/insumos/fixture/casos_base.json` | 3062 | `b69a6f347031a08330a4afa74b1dbaea519349068ce481158fc4936c6c1bde18` |
| `pg-e01-evals-offline/insumos/fixture/heldout/casos_heldout.json` | 1660 | `9c96e2f413d564ec27ab1e55855e94225d1de4c8ec340ec2561a2770fb2924de` |
| `pg-e01-evals-offline/insumos/fixture/heldout/saidas_A_heldout.json` | 856 | `45727d393cde3de7faac7a2fcc29f5bb0d9ecb5f51f9a5110c11dfd7f5512c38` |
| `pg-e01-evals-offline/insumos/fixture/heldout/saidas_B_heldout.json` | 864 | `5432210088a25d4b32b963f77b2dd816e6151aefbe8bce95cf0a768729d5b0ed` |
| `pg-e01-evals-offline/insumos/fixture/heldout/saidas_C_heldout.json` | 1024 | `49e60ad53aa4671231cfcec3892c2c27388a8bd7bbb93c91424e76670def8b60` |
| `pg-e01-evals-offline/insumos/fixture/metricas.py` | 6053 | `b7e5637b2781d2c8b30485e8dc0fb9dd60564dc370a1351c9b6425a67e884911` |
| `pg-e01-evals-offline/insumos/fixture/saidas_A_base.json` | 1398 | `41b164282ef239431461ff47dd971de68c0c6064b7393e31b13dce473d499642` |
| `pg-e01-evals-offline/insumos/fixture/saidas_B_base.json` | 1406 | `dfc08d4ee226dff82f57b1e6add98aec013789eda4655fb1ee28cfc17cd3b618` |
| `pg-e01-evals-offline/insumos/modelo-de-criterios.md` | 1670 | `bda677586a3b8799fba706563291ba218ba86cb54e52904c1d7cedeefb4ef96d` |
| `pg-e01-evals-offline/insumos/prompts/prompt_v1.md` | 656 | `f9f61545a26c75349dfd873deb2859bd6834012ea1c73f9102818ce3854ab63c` |
| `pg-e01-evals-offline/insumos/prompts/prompt_v2.md` | 894 | `29e5132fd49695400d3a5ceb9b289feb99433ac334646383c67640e6868b867d` |
| `pg-e01-evals-offline/rubrica-v1.md` | 3862 | `b6dcf4b45dc48b3c76e822819b0747078a2b7175b86ba80bdd8428d5b715405d` |

## ZIPs construídos (zips/)

| ZIP | Bytes | SHA256 |
| --- | --- | --- |
| `pg-e01-etapa-1-inicio.zip` | 21017 | `c8124504bfcb0e2bf64ab15791779c2f5950c9e8dbe4f972c10511eb32399d50` |
| `pg-e01-etapa-2-base.zip` | 22028 | `d26dd051b281b763f6de9d3bf52e7232c33dbc3d9210f4cfbdfb6911fa497868` |
| `pg-e01-etapa-3-heldout.zip` | 24845 | `be8e0559631ff00f707458cdf5459b2b0be5baa8b267c6f85d5c29f5d8a60d29` |
| `pg-e01-etapa-4-referencia.zip` | 26823 | `7e2c27ed2ff2dac7610560b3b6b0bb971bd9ddbebf4b29deaec2c32ff5894979` |
| `pg-e01-etapa-5-docente.zip` | 33041 | `c52d4a7c6e06fc9cf12aa4261d4a2bb68ccbd69c9eebb4243d45704088647f9c` |

Reprodutibilidade: duas construções independentes (`verify_kit.py
--check-repro`) produzem exatamente estes hashes; drift em qualquer arquivo
da fonte ou dos ZIPs é rejeitado pelo verificador (exit 1).

Ambiente: Python 3.13.5 (linux), stdlib apenas,
sem rede. Produtor: Learner Analytics Engineer (agente
803ca017-7544-444b-b434-4865b8dc5fc7), AID-3667, branch
`aid3667/kit-offline-download-staged`.
