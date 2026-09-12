# AID-251 — QA independente do candidato integrado AID-242

**Data:** 2026-08-28 UTC  
**Disposição:** **GO condicionado — candidato draft apto para revisão de release**

## Resultado

Nenhum defeito bloqueador foi reproduzido no candidato imutável
`6a9043c45ac75e6bb50cc18b`. O manifesto remoto corresponde ao hash do handoff, os testes
focados, lint e build passaram, e o smoke remoto das duas jornadas passou em 6/6 execuções.

O GO é condicionado porque o manifesto declara `sourceRevision: local-uncommitted`: o artefato é
reproduzível pelo permalink e hash, mas não por uma revisão Git autossuficiente. Antes de promover o
alias canônico, é necessária revisão Git final e associação do deploy a um commit imutável. Isso é
risco de rastreabilidade de release, não falha funcional observada.

## Charters e cobertura executada

1. **Identidade e supply chain:** conferir permalink, manifesto e SHA-256 antes dos testes.
2. **Jornada IA Prática:** tentativa inválida, feedback, recarga/retry, conclusão local, verificação
   independente, separação do gate canônico e persistência após retorno ao hub.
3. **Jornada Dev:** entrada pela trilha técnica, WAREHOUSE, evidência acessível, verificação
   independente e retorno ao hub com próxima missão.
4. **Continuidade entre trilhas:** trocar IA Prática ↔ Dev sem apagar evidência da outra trilha.
5. **Limites e falhas:** recuperação visível, estado canônico somente leitura, analytics com
   vocabulário fechado e sem respostas/evidência/texto livre (cobertura unitária focada).
6. **Buildability:** lint e build de produção do engine canônico.

## Evidência reproduzível

Ambiente: Linux, Node/npm do checkout, Chromium Playwright, rede pública para o draft Netlify.

```text
curl -fsSL https://6a9043c45ac75e6bb50cc18b--aidevschool-codexdojo-os.netlify.app/pilot-bundle-manifest.json | sha256sum
f3e06e4d9f1dc7eed1b02f3a37817cde196e422267c2b980e2e68089ff0e7e3d  -

cd engines/codexdojo-os-prototype
npm test -- --run src/analytics src/journey src/host src/progress
Test Files 15 passed (15); Tests 48 passed (48)

npm run lint
Exit 0; 26 warnings CSS já reportados pelo produtor; nenhum erro, nenhuma correção aplicada.

npm run build
Exit 0; 1.864 módulos transformados.

QA_BASE_URL=https://6a9043c45ac75e6bb50cc18b--aidevschool-codexdojo-os.netlify.app \
  npx playwright test tests/release-journeys.smoke.spec.ts
PASS (6) FAIL (0); 42,6 s.
```

Os SHA-256 de `learner/learning_state.yaml` e `.mavis/learning_state.yaml` foram comparados antes e
depois da bateria e permaneceram idênticos. Nenhum estado canônico foi alterado pela QA.

## Triagem

- **Produto:** nenhum bug bloqueador, crítico, alto ou médio observado nesta cobertura.
- **Dívida conhecida:** 26 warnings CSS de especificidade/`!important`; não bloqueiam lint nem o
  smoke e já constavam no handoff do produtor.
- **Release engineering — limitação:** `sourceRevision: local-uncommitted` impede reconstrução fiel
  apenas pelo Git. Owner: Founding Product Engineer. Ação antes da promoção: consolidar/revisar as
  mudanças, registrar commit imutável e vincular esse commit ao deploy aprovado.

## Limitações explícitas

- A QA cobriu Chromium via suíte de release; Safari/WebKit e Firefox não foram explorados
  manualmente.
- Não houve teste de carga, longa duração, offline real, leitor de tela ou dispositivos físicos.
- O draft foi avaliado; o alias canônico de produção não foi alterado nem testado.
- Passagem de smoke não constitui declaração de mastery, robustez geral ou paridade entre engines.

## Disposição final

**GO condicionado para avançar à revisão final de release; não promover enquanto o deploy não
estiver associado a uma revisão Git imutável revisada.**
