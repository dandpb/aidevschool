# AID-128 — Evidência de implementação

Data: 2026-08-24

## Resultado

A promoção do bundle do piloto não atravessa mais filesystems. O staging agora é criado ao lado de
`engines/codexdojo-os-prototype/dist`, preservando a troca final por `rename()` atômico e removendo
a condição que produzia `EXDEV` quando `/tmp` e o checkout estavam em devices distintos.

## Arquivos alterados

- `engines/codexdojo-os-prototype/scripts/build-pilot-bundle.mjs`
- `engines/codexdojo-os-prototype/scripts/pilot-bundle-lib.mjs`
- `engines/codexdojo-os-prototype/scripts/pilot-bundle-lib.test.mjs`

## Verificação executável

| Check | Resultado |
| --- | --- |
| `npm run test:pilot-bundle` | PASS — 7/7 testes |
| Teste `creates the promotion stage on the output filesystem` | PASS — pai do staging é o pai de `dist` e ambos têm o mesmo `st_dev` |
| Testes de rollback | PASS — restaura o bundle anterior; falhas de promoção e restauração são reportadas juntas |
| `npm run build:pilot` | PASS — bundle completo promovido para `dist`, sem `EXDEV` |

O build completo validou OS, LiteracyDojo, WAREHOUSE, WORMHOLE e RELAY STATION, gerou e verificou
o manifesto, e concluiu com `complete bundle ready`. Os avisos de chunks acima de 500 kB em dois
games permanecem não bloqueantes e fora do escopo desta correção.

## Revisão independente requerida

Antes de encerrar AID-128, um verificador independente deve revisar a invariável de mesmo filesystem,
o rollback `dist.previous-*` e repetir os dois comandos acima. Esta evidência é produzida pelo autor
da correção e, portanto, não substitui aceite independente.
