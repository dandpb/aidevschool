# AID-123 — correlação de deploy e prova de rollback

**Data UTC:** 2026-08-24  
**Site Netlify:** `8bec714f-22cb-4468-8e2b-e3cd38652931` (`aidevschool-codexdojo-os`)  
**SHA candidato AID-121:** `3586cb587092abea2c4881b2f6a8b926e9487921`  
**Executor:** Founding Product Engineer  
**Disposição:** candidato restaurado em produção; requer aceite independente de QA

## Correlação imutável

- Deploy candidato válido: `6a8c366553da9a55fed22b04`.
- URL imutável: <https://6a8c366553da9a55fed22b04--aidevschool-codexdojo-os.netlify.app>.
- URL canônica: <https://aidevschool-codexdojo-os.netlify.app/>.
- Título registrado pelo Netlify: `AID-123 candidate SHA 3586cb587092abea2c4881b2f6a8b926e9487921 complete pilot bundle`.
- Criado em `2026-08-24T12:17:41.837Z`; restaurado após o ensaio em `2026-08-24T12:18:04.249Z`.
- Asset raiz observado após restore: `/assets/index-BftoyJQ1.js`.
- SHA-256 do `dist/index.html` publicado: `93e9209df712bf9cede769e37a3a9bbfa6b93b336aa9075c2c1eb6375b2a53df`.

O artefato foi produzido em worktree destacada e limpa no SHA acima. O bundle completo contém o OS e as quatro rotas empacotadas: LiteracyDojo, WAREHOUSE, WORMHOLE e RELAY STATION.

## Ensaio de rollback e restauração

1. Alvo anterior conhecido: deploy `6a877a6a68d0cee5f09b3934`, URL imutável <https://6a877a6a68d0cee5f09b3934--aidevschool-codexdojo-os.netlify.app>.
2. `restoreSiteDeploy(site_id, 6a877a6a68d0cee5f09b3934)` publicou o alvo anterior em `2026-08-24T12:18:01.450Z`.
3. A URL canônica passou a servir `/assets/index-BPUaM4x4.js`, provando a troca efetiva de artefato.
4. `restoreSiteDeploy(site_id, 6a8c366553da9a55fed22b04)` restaurou o candidato em `2026-08-24T12:18:04.249Z`.
5. A URL canônica voltou a servir `/assets/index-BftoyJQ1.js`.
6. Após a restauração, `/apps/literacydojo/` e `/apps/warehouse/` responderam HTTP 200; a URL imutável do candidato também respondeu HTTP 200 para `/apps/relay-station/`.

Receita operacional:

```bash
npx netlify api restoreSiteDeploy --data '{"site_id":"8bec714f-22cb-4468-8e2b-e3cd38652931","deploy_id":"<deploy-id>"}'
curl -fsS https://aidevschool-codexdojo-os.netlify.app/
```

## Hashes dos pontos de entrada do bundle

| Superfície | SHA-256 de `index.html` |
| --- | --- |
| OS | `93e9209df712bf9cede769e37a3a9bbfa6b93b336aa9075c2c1eb6375b2a53df` |
| LiteracyDojo | `e7d434bac95646bb4efe23cd0d31457d67d28b12fc8e79f117a1a2d23ce87625` |
| WAREHOUSE | `e84d9ada359fdca4b1ac18a11918027719564a8fa6de7e760b61c056027be96f` |
| WORMHOLE | `3c62187b8b9132f9f3f938cc4c09e1b864481afe33524b0017d272485dc75f68` |
| RELAY STATION | `afe5ee990f18bc65b4ffa85fb3457153b3ce8f490cbf1e9f33b8908c70c93371` |

## Incidente controlado durante o ensaio

Dois deploys inválidos (`6a8c35f62f9c4a49dfb3d8c5` e `6a8c362467e39d068a630b72`) foram publicados brevemente enquanto o bundler falhava por omissão de dependências de desenvolvimento sob `NODE_ENV=production`. Em ambos os casos o alvo conhecido `6a877a6a68d0cee5f09b3934` foi restaurado imediatamente. Eles não são candidatos de release.

O risco operacional é que `netlify deploy` executa o build configurado por padrão, e um comando shell posterior pode publicar um `dist` parcial se não houver fail-fast. Para este candidato, a publicação válida usou somente um `dist` completo, previamente verificado, com `netlify deploy --no-build`. Uma correção separada deve tornar o pipeline fail-fast e garantir dependências de build em ambiente de produção; isso não muda o SHA AID-121 e não deve ser confundido com o aceite independente deste deploy.

## Limites do aceite

Esta evidência prova correlação deploy ↔ SHA, alvo anterior acionável, rollback efetivo e restauração. Não substitui o QA funcional independente de AID-122, não declara mastery e não autoaprova o release.
