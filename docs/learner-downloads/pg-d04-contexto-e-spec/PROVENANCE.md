# Provenance — kit offline pg-d04-contexto-e-spec (AID-3665)

## Fonte imutável (pin exato)

| Campo | Valor |
| --- | --- |
| PR | [#643](https://github.com/dandpb/aidevschool/pull/643) (aberto, stacked na base `aid3510/sequencia-dev-guiada` @ `e01d9d42`) |
| Head pinado | `32888d9f03006f3dbcdaa57811b29c54a2c09146` |
| Pacote-fonte | `curriculum/sequencia-dev-guiada/pg-d04-contexto-e-spec` |
| Acesso em clone fresco | `git fetch origin refs/pull/643/head` (head não-ancestral de main) |
| Leitura pelo builder | `git show <pin>:<pacote>/<arquivo>` — nunca working tree |

A autoria do pacote-fonte foi aceita em AID-3646 (parecer CD `75572a81`,
review CPE `6a7060bb`, fechamento PO `9f117156`) e **não foi reautorada nem
alterada**: nenhum arquivo-fonte é tocado por este PR.

## Allowlist learner exata (6 arquivos, bytes preservados)

| Caminho | SHA-256 | Bytes |
| --- | --- | --- |
| `enunciado.md` | `4bf60840eb3207a2dbfc80533303b609a3d6d92c1d67c5c6a40d8ab498ef60de` | 7297 |
| `exemplo-trabalhado.md` | `68aca19acc9323164138b6616aeeef0f716c597363782c06752767354da39f72` | 6494 |
| `insumos/PEDIDO.md` | `47b7a8f9cda91ab18a1ee2b730953d99c0dc99600b393874f36c72f97a2039bd` | 2029 |
| `insumos/inventario-repo.txt` | `dec5a4e14f26e06231385950e5b2b0a4e6e279fa0c0e19f39449ce62f19dae67` | 1323 |
| `insumos/verifica_contexto_spec.py` | `c44829430540a07c75cecd8bc889d4360362c40ad5d275da1a24f2a627094614` | 13101 |
| `rubrica-v1.md` | `377210d54e11afd8902fc19ff2f5ba2b8fa2c74ded25c3327df4385c790baee1` | 4589 |

## Exclusões (conteúdo docente — nunca projetado)

- `MANIFEST.md` (manifesto docente do pacote-fonte).
- `guia-de-correcao/**` (solução, contraexemplos, testes do verificador).

O builder falha fechado se qualquer nome excluído aparecer no ZIP ou na
árvore do kit (`check_teacher_absent`).

## Cadeia de revisão

CPE produtor (este PR) → FPE reviewer técnico/domínio → CD approver
pedagógico. Sem self-review. Merge não é do produtor: porta canônica
`scripts/merge_pr.sh` com countersign (agente distinto, head pinado).

## Escopo negativo (decisão PO `e23bfab7`, 10-01)

Sem runtime/player/catálogo/schema/bindings/progresso/mastery; sem edição
dos originais 643/641; sem engine nova; nada copiado do contrato 641; saída
exclusiva em `docs/learner-downloads/pg-d04-contexto-e-spec/**`.

## Reprodução

```bash
cd docs/learner-downloads/pg-d04-contexto-e-spec
python3 tools/build-kit.py             # build + verificações fail-closed
python3 tools/build-kit.py --selftest  # negativos (expected-fail)
```

Rebuild repetido produz ZIP byte-idêntico (ver
`RELATORIO-VERIFICACAO.md`).
