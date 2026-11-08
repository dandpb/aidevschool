<!-- issue: AID-39 | key: pilot-unlock | doc_id: 47c072a4-d292-4350-9dfb-8994b59acef6 | updated: 2026-08-22 14:06:56.235+00 -->

# Piloto aberto e gratuito — decisão e evidência de lançamento

(AID-39)

# AID-39 — Piloto aberto e gratuito destravado

## Decisão aprovada

O AiDevSchool lançou o primeiro piloto como **público, gratuito, open source, 18+, pt-BR e com facilitador**, usando o LiteracyDojo. O repositório adota **Apache License 2.0**. Essa decisão substitui a rota anterior de piloto pago, Pix e licença proprietária registrada no GitHub #129.

## Evidência de conclusão

### Open source — AID-40

- `LICENSE` contém o texto oficial Apache License 2.0.
- `README.md` e `pyproject.toml` declaram Apache-2.0.
- 43/43 manifests `package.json` declaram `Apache-2.0`.
- Busca focada não encontrou declarações ativas `proprietary`, `All rights reserved` ou `UNLICENSED`.
- Revisão independente concluída sem achados.

### Produto e comunicação — AID-41

- Onboarding e rodapé declaram piloto público gratuito, público 18+ e progresso local ao navegador.
- Termos e privacidade públicos usam linguagem simples e removem checkout, Pix e cliente pagante como fluxo ativo.
- Suporte real aponta para `https://github.com/dandpb/aidevschool/issues/new`, com orientação para não publicar dados pessoais.
- A separação entre conclusão de lição e competência verificada/mastery foi preservada.

### Publicação e QA independente — AID-42/AID-44

- URL canônica: https://aidevschool-literacydojo.netlify.app/
- Deploy imutável: https://6a89abd5f946cce898bf2b09--aidevschool-literacydojo.netlify.app
- Netlify deploy ID: `6a89abd5f946cce898bf2b09`.
- Publicação: 2026-08-22 14:02:03 UTC.
- Responsável operacional: CEO / Daniel Pinheiro Barreto.
- Rollback: republicar o deploy Netlify `6a875db8c5efe0399d609a5b`.
- Jornada abrir → onboarding → mapa → iniciar lição → responder → concluir → resultado passou nas URLs canônica e imutável, Chromium 360×740, sem erros de console.
- Gates locais: lint PASS; unit 81/81 PASS; build PASS; E2E 6/6 PASS.
- Termos e privacidade retornaram HTTP 200.
- Nenhuma alteração foi observada em `learner/learning_state.yaml`.
- QA independente declarou **GO**.

## Limites aceitos do piloto

- Suporte via GitHub exige login.
- Validação remota cobriu Chromium móvel; Safari, Firefox e leitor de tela não foram testados.
- Não há backend remoto de verificação nem persistência multidispositivo.
- Progresso permanece local e isso está comunicado ao aprendiz.

Esses limites não bloqueiam o piloto aprovado; são candidatos a follow-up conforme uso real e feedback.

## Disposição

O piloto está **destravado e público**. Os critérios aprovados foram satisfeitos com evidência independente. AID-39 pode ser encerrado como `done`.