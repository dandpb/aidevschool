# AID-212 — QA independente do retry WAREHOUSE (AID-207)

## Disposição

**NO-GO / BLOCKED (release blocker crítico).** A correção candidata passa na verificação local
focada, mas AID-207 não publicou um novo candidato imutável com URL e hashes. Portanto não é
possível comprovar em Chromium limpo o fluxo público `falha -> retry -> PASS`, nem autorizar a
promoção do alias ou o convite da coorte.

Responsável pelo desbloqueio: **Engenharia/Release (owner de AID-207)**. Ação necessária: publicar
o bundle corrigido como draft imutável, sem promover o alias, e registrar em AID-207 o deploy ID,
permalink, hash do manifesto/index e instruções de reprodução. Depois disso, reabrir o gate de QA.

## Ambiente e identidade local

- Data: 2026-08-26 UTC
- SO: Linux (workspace Paperclip)
- Git HEAD observado: `9d4b744526891335f0749f77db0f151b2c7ed8b7`
- Node.js: `v24.18.0`
- npm: `11.17.0`
- Playwright: `1.62.1`
- Escopo: `engines/codexdojo-os-prototype/src/verification/`

O workspace é compartilhado e contém mudanças de terceiros ainda não consolidadas. A identidade
de release não pode ser inferida do HEAD; ela deve ser formada pelo deploy imutável e hashes do
artefato publicado.

## Charters de risco executados

1. **Persistência por tentativa (crítico):** duas evidências WAREHOUSE no mesmo `missionRunId`,
   com `evidenceId` distintos, devem permanecer armazenadas sem sobrescrita.
2. **Seleção determinística (crítico):** `latestForMission` deve retornar a tentativa mais recente
   mesmo sob clock fixo, com desempate estável.
3. **Correlação (crítico):** o resultado/recibo PASS do retry deve pertencer à nova evidência; ID
   vazio e colisões de identidade devem ser rejeitados.
4. **Integridade do learner (crítico):** os testes e o build não podem alterar learner canônico nem
   sua projeção `.mavis`.
5. **Jornada pública (crítico):** repetir em Chromium limpo `FAIL -> retry -> PASS`, incluindo
   recibo e resultado do novo `attempt_id`. **Não executado: falta candidato imutável AID-207.**

## Evidência reproduzível

Executado em `engines/codexdojo-os-prototype`:

```bash
npm test -- --run src/verification
npx biome lint \
  src/verification/evidenceIntake.ts \
  src/verification/indexedDbEvidenceRepositories.ts \
  src/verification/evidenceIntakeTeachingGame.test.ts \
  src/verification/evidenceIntake.test.ts \
  src/verification/ports.ts \
  src/verification/evidenceIntakeTestFixtures.ts \
  src/verification/indexedDbEvidenceRepositories.test.ts
npm run build
```

Resultados:

- Vitest: **5 arquivos, 29 testes aprovados**.
- Biome focado: **7 arquivos verificados, sem erros**.
- Build: **PASS**, TypeScript + Vite; 1.864 módulos transformados.
- O teste de regressão confirma duas entradas (`voxel-evidence-1` FAIL e
  `voxel-evidence-2` PASS) no mesmo run e `latest()` igual ao resultado aprovado.

Hashes antes e depois da bateria (sem alteração):

```text
c3cae54c452413b75b64f1e97ab6f34fe9d529a8be4b50fdccf861696d230bbf  learner/learning_state.yaml
a900918aeb4c29298d5a672bb6c2c9c66c7185f7b14be35c2db40a212c861bdc  .mavis/learning_state.yaml
```

## Expected versus actual

| Verificação | Esperado | Atual |
| --- | --- | --- |
| Persistência por `evidenceId` | FAIL e PASS coexistem | PASS local |
| `latestForMission` | retry PASS selecionado deterministicamente | PASS local |
| Correlação/validação | novo ID aceito; vazio/colisão rejeitados | PASS local |
| Build do OS | bundle gerado sem erro | PASS local |
| Learner canônico | hashes inalterados | PASS |
| Chromium limpo no candidato | fluxo público completo e correlacionado | BLOCKED: candidato ausente |

## Limitações e decisão de release

Os testes locais cobrem a lógica de persistência e correlação, mas não provam IndexedDB, reload,
integração host/iframe/verificador e UI no artefato realmente publicado. O único candidato imutável
registrado para WAREHOUSE continua sendo o `6a8e4946...` de AID-191, já reprovado por AID-200 e
anterior à correção AID-207.

**HOLD mantido:** não promover alias, não convidar coorte e não declarar prontidão até novo deploy
imutável receber GO independente em Chromium limpo.
