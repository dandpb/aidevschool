# AID-58 — revisão independente da CI bloqueante do piloto

**Disposição:** NO-GO / bloqueado para afirmar “CI bloqueante”  
**Severidade:** crítica (governança de release)  
**Executado em:** 2026-08-22, Linux, Node 24.18.0 local; comandos do workflow usam Node 20 e Python 3.12 no GitHub Actions  
**Checkout avaliado:** `dac40786ecabaf36eafbc22b2a1584f1809765e6`, com mudanças não commitadas preservadas

**Follow-up de desbloqueio:** AID-59, atribuído ao Founding Product Engineer

## Resultado executivo

O candidato de workflow define os quatro checks previstos e sua matriz funcional equivalente passou localmente. Entretanto, `main` não possui branch protection (`GET /repos/dandpb/aidevschool/branches/main/protection` → HTTP 404, `Branch not protected`) e o candidato está apenas no worktree: a execução remota mais recente usa o workflow anterior, SHA `3586cb587092abea2c4881b2f6a8b926e9487921`, com nomes de jobs diferentes. Portanto não existe evidência de que os quatro checks propostos sejam requeridos nem de que uma falha impeça merge.

O software exercitado está saudável dentro desta matriz, mas a propriedade crítica “bloqueante” não está implementada/provada. O piloto não deve receber GO com base nessa CI até publicação do workflow, execução dos quatro checks no mesmo SHA candidato e proteção de `main` sem bypass.

## Charters e evidência

| Risco | Verificação | Resultado |
| --- | --- | --- |
| Conteúdo canônico stale ou app Literacy quebrado | `npm run gen:content`; `git diff --exit-code -- src/data/generated/lessons.ts`; lint, unit, build, E2E em `engines/literacyDojo` | PASS: 17 lições; sem drift; 81 testes; build; 6/6 E2E |
| Host canônico não compila ou regressa jornadas | lint, unit e build em `engines/codexdojo-os-prototype`, com `NODE_ENV` removido para equivaler ao Actions | PASS: lint exit 0 com 26 warnings; 42 arquivos/215 testes; build |
| Tutor/substrato incompatíveis | comandos subjacentes a `make test-core` e `make test-substrate` | PASS: 51 passed + 1 skipped; 151 passed |
| Integração host + Literacy + três missões Voxel falha em desktop/mobile | `env -u NODE_ENV CI=true npm run test:release` | PASS: 4/4 Playwright (32,3 s) |
| Checks não são de fato requeridos | GitHub branch protection API | **FAIL crítico:** HTTP 404, branch sem proteção |
| Workflow candidato não foi executado no SHA avaliado | GitHub Actions run mais recente e comparação dos nomes dos jobs | **FAIL crítico:** run remoto é do SHA `3586cb5...` e ainda usa jobs antigos |

## Triage

1. **Sev 1 — `main` aceita mudanças sem os quatro gates requeridos.**
   - Esperado: branch protegida exigindo exatamente `pilot / LiteracyDojo`, `pilot / canonical host`, `pilot / shared Python` e `pilot / release E2E`, sem bypass.
   - Atual: endpoint de proteção retorna 404 `Branch not protected`.
   - Impacto: um workflow verde é informativo, não bloqueante; merge/push pode contornar toda a matriz.
   - Dono do unblock: CEO/admin do repositório deve publicar o candidato e configurar ruleset/branch protection.

2. **Sev 1 — nenhum run remoto prova o workflow candidato.**
   - Esperado: execução no mesmo SHA candidato, URL registrada e quatro nomes estáveis verdes; teste negativo demonstra bloqueio de merge.
   - Atual: run remoto mais recente [32586620642](https://github.com/dandpb/aidevschool/actions/runs/32586620642), SHA `3586cb5...`, executa o workflow anterior (`literacyDojo (TS + content)`, `codexdojo-os (TS)` etc.).
   - Impacto: diferenças de Node/Python/runner, instalação e YAML ainda não foram validadas no Actions para este candidato.

3. **Sev 3 — sinal de lint do host contém 26 warnings CSS.**
   - O comando retorna 0 e não bloqueia. Há avisos de especificidade descendente e `!important`, inclusive em estilos responsivos. Não foi observada falha funcional na jornada coberta.

## Infraestrutura e limitações

- O ambiente QA exporta `NODE_ENV=production`; o primeiro `npm test` do host falhou em massa com `React.act is not a function`. Removendo a variável — comportamento equivalente ao GitHub Actions proposto — 215/215 testes passaram. Classificação: interferência do harness local, não defeito do candidato.
- O ambiente QA não contém `make`. Foram executados diretamente os alvos definidos no Makefile (`python3 -m pytest engines/minimaxDojo/tests` e `python3 -m pytest learner/substrate/tests`). Classificação: limitação local; `ubuntu-latest` normalmente fornece make, mas a prova final deve vir do run remoto.
- Warnings `NO_COLOR`/`FORCE_COLOR` e aviso de versão do React Grab não afetaram os resultados.
- Não foram testados catálogo Voxel completo, engines fora do boundary do piloto, backend remoto, persistência multi-dispositivo, analytics ou atribuição de mastery.
- Nenhum estado canônico do learner foi alterado intencionalmente; mudanças preexistentes foram preservadas.

## Critério de desbloqueio

1. Publicar/commitar o workflow candidato.
2. Obter run remoto verde no SHA candidato com os quatro nomes exatos.
3. Ativar proteção/ruleset de `main` exigindo PR e os quatro checks, sem bypass.
4. Demonstrar com PR controlado que um check vermelho impede merge e, após correção, os quatro verdes liberam merge.
5. QA independente registra URL, SHA, configuração observada e decisão final.

## Addendum AID-59 — 2026-08-22

A proteção de `main` está ativa e exige PR, uma aprovação, atualização strict,
aprovação do último push, resolução das conversas e enforcement para admins;
force-push e exclusão estão desativados. O run publicado
[32586620642](https://github.com/dandpb/aidevschool/actions/runs/32586620642), SHA
`3586cb587092abea2c4881b2f6a8b926e9487921`, passou os quatro contexts atualmente
requeridos: `literacyDojo (TS + content)`, `codexdojo-os (TS)`,
`Python (learner + curriculum shared)` e `product readiness (claims)`.

O candidato local renomeia/substitui esses jobs pelos quatro contexts `pilot / ...`,
mas ainda não foi publicado. Exigi-los antecipadamente causaria deadlock, pois
nenhum workflow remoto os emite. AID-59 continua bloqueada até o CEO/admin publicar
o conjunto coerente em PR; então os quatro contexts novos podem ser exigidos e o
QA independente pode executar o teste negativo/positivo do critério acima.
