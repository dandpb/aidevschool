# Relatório de verificação do produtor — kit pg-d04 (AID-3665)

Data: 2026-10-07 · Ambiente: Linux, Python 3.13 (stdlib), git 2.x ·
Builder: `tools/build-kit.py` · Pin: PR #643 @
`32888d9f03006f3dbcdaa57811b29c54a2c09146`

## 1. Build determinístico (rebuild 2× byte-idêntico)

```
$ python3 tools/build-kit.py
OK: 6 arquivos projetados; zip=zips/pg-d04-contexto-e-spec.zip (15626 bytes)
$ python3 tools/build-kit.py
OK: 6 arquivos projetados; zip=zips/pg-d04-contexto-e-spec.zip (15626 bytes)
$ sha256sum zips/pg-d04-contexto-e-spec.zip  (execução 1 e 2)
c7f2c342bdb663d07b6ab5c87fbafb252f46705119648a005f65e9076f0fd94a
c7f2c342bdb663d07b6ab5c87fbafb252f46705119648a005f65e9076f0fd94a
```

Mesmos bytes nas duas execuções: entradas ordenadas, timestamp fixo
1980-01-01, modo 0644, `create_system=0`, deflate nível 9 (stdlib).

## 2. Fail-closed — cenarios negativos (expected-fail)

```
$ python3 tools/build-kit.py --selftest
[selftest] ok (expected-fail) input ausente: fonte ausente no pin: enunciado.md
[selftest] ok (expected-fail) drift de bytes: enunciado.md tem 7298 bytes, pin exige 7297
[selftest] 2/2 cenarios reprovaram como esperado
```

Input learner obrigatório ausente → falha fechada (nada é escrito). Drift
de hash/bytes contra o pin → falha fechada. Divergência de allowlist no ZIP
→ falha fechada e artefato removido (`verify_zip`).

## 3. Inventário de extração em pasta limpa

Extração do ZIP em diretório vazio (tempfile) — inventário == allowlist
exata, byte a byte contra `manifests/pins.json`:

| Arquivo extraído | Bytes | SHA-256 (16 primeiros) |
| --- | --- | --- |
| `enunciado.md` | 7297 | `4bf60840eb3207a2` |
| `exemplo-trabalhado.md` | 6494 | `68aca19acc932316` |
| `insumos/PEDIDO.md` | 2029 | `47b7a8f9cda91ab1` |
| `insumos/inventario-repo.txt` | 1323 | `dec5a4e14f26e062` |
| `insumos/verifica_contexto_spec.py` | 13101 | `c44829430540a07c` |
| `rubrica-v1.md` | 4589 | `377210d54e11afd8` |

Projeção na árvore byte-idêntica ao conteúdo extraído do ZIP.

## 4. Exclusão de conteúdo docente

`MANIFEST.md` e `guia-de-correcao/**` ausentes do ZIP e da árvore do kit
(checagem mecânica `check_teacher_absent` + varredura rglob). O conteúdo
docente nunca define a saída learner nem entra no payload.

## 5. Manifesto externo (path/hash/bytes)

`manifests/SHA256SUMS.txt` cobre o payload learner (6 arquivos + README +
ZIP), gerado mecanicamente pelo builder no fim de um build bem-sucedido.

## 6. O que NÃO foi verificado aqui

- Execução do verificador com submissões válidas/inválidas criadas pelo
  revisor (V&E clean-archive proof — pós-primeiro ZIP, conforme decisão PO;
  cadeia FPE → CD).
- Qualidade substantiva do conteúdo (fora do piso de formato; aceita em
  AID-3646 e não reautorada).
