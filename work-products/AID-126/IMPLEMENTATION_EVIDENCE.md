# AID-126 — evidência de implementação

Data: 2026-08-24

## Resultado

A falha TypeScript que bloqueava o build do WAREHOUSE foi corrigida em
`engines/shared/teaching-evidence/evidenceTransport.ts`, sem afrouxar o modo estrito:

- `DOMStringList.item()` preserva explicitamente o retorno `string | null`, em vez de introduzir
  `undefined` por acesso indexado sob `noUncheckedIndexedAccess`;
- `parentOrigin` mantém `string | null` até o guard que elimina `null`.

Nenhum estado canônico do learner ou projeção gerada foi alterado por esta correção.

## Verificação executada

| Check | Resultado |
| --- | --- |
| `engines/voxelDojo/game-02-warehouse: pnpm run build` | PASS — `tsc --noEmit` e Vite concluíram |
| `engines/voxelDojo/game-02-warehouse: pnpm run test` | PASS — 3 arquivos, 19 testes |
| `engines/codexdojo-os-prototype: npm run test:pilot-bundle` | PASS — 4/4 testes |
| `engines/codexdojo-os-prototype: npm run build:pilot` | Parcial — OS, LiteracyDojo, WAREHOUSE, WORMHOLE e RELAY STATION compilaram; promoção final falhou com `EXDEV` |
| `engines/voxelDojo/game-02-warehouse: pnpm run lint` | Infra existente — Biome processou zero arquivos e encerrou 1 |

## Riscos e próximo gate

O erro original `TS2322` não reaparece, e o WAREHOUSE deixa de bloquear a sequência agregada. O
bundle completo ainda não pode ser declarado publicável neste filesystem porque o script cria o
staging em `/tmp` e usa `rename()` para um volume diferente, produzindo `EXDEV`. Esse problema é
separado da correção TypeScript e deve permanecer visível para o proprietário do empacotador.

Conclusão sensível a release requer revisão independente: repetir o build focado e confirmar o
diff de tipos; não declarar release até o empacotador concluir a promoção e validar o manifesto.
