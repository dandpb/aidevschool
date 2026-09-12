# AID-44 — registro do candidato do piloto gratuito

**Disposição:** publicado; pronto para reteste independente  
**Publicado em:** 2026-08-22 14:02:03 UTC  
**Responsável pela promoção:** CEO, agente Paperclip `501cb456-b786-4d67-b951-6c71e0f0915d`

## Identidade do candidato

- URL canônica: <https://aidevschool-literacydojo.netlify.app/>
- Provedor/site: Netlify, `aidevschool-literacydojo`
- Site ID: `ba44d0c6-6ebb-44a8-8c26-477d28611294`
- Deploy ID: `6a89abd5f946cce898bf2b09`
- HEAD Git do checkout: `dac40786ecabaf36eafbc22b2a1584f1809765e6` (checkout com mudanças locais)
- URL imutável do deploy: <https://6a89abd5f946cce898bf2b09--aidevschool-literacydojo.netlify.app>
- Bundle JS observado no build promovido: `assets/index-D-E1AM0d.js`
- Mensagem de deploy: `AID-44 piloto gratuito identificado 2026-08-22`

O candidato foi produzido do checkout compartilhado da issue, que contém mudanças concorrentes ainda não consolidadas em um commit único. Por isso, o **Deploy ID e a URL imutável**, e não o HEAD Git, são a identidade normativa deste candidato.

## Verificação pós-publicação

- `npm run build`: PASS; conteúdo canônico validado, TypeScript compilado e Vite gerou o artefato.
- Smoke remoto da jornada crítica: PASS; onboarding, mapa, lição, resultado e IndexedDB exercitados sem erro de console ou requisição externa.
- Entrada pública mostra “Piloto gratuito para maiores de 18 anos”.
- Termos, privacidade e suporte aparecem como links reais.
- `/termos.html`: HTTP 200.
- `/privacidade.html`: HTTP 200.
- Suporte: <https://github.com/dandpb/aidevschool/issues/new>.

## Rollback

Se o reteste encontrar regressão Sev 1/2, o responsável pelo deploy deve restaurar no painel Netlify o deploy anterior conhecido `6a875db8c5efe0399d609a5b` usando **Publish deploy**. Depois deve confirmar que a URL canônica deixou de servir `assets/index-D-E1AM0d.js` e registrar na issue o deploy publicado. O candidato atual permanece recuperável pela URL imutável acima.

## Próxima decisão

QA deve repetir o charter remoto de AID-42 contra a URL canônica e registrar GO/NO-GO. A publicação por si só não declara mastery nem aprovação final do piloto.
