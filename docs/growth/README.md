# Kit self-service de recrutamento O1 — AiDevSchool (docs/growth/)

> Decisão do founder (comentário 7f74f2e5 em AID-909, 2026-10-17): bloqueio de intros
> manuais **removido**; funil O1 pivota para **kit self-service e assíncrono** dentro do
> repositório, com convite direto linkado em `/escola/`.

## O que é este kit

Material público para que **desenvolvedores** façam o teste moderado O1 de forma
**assíncrona e auto-guiada** — sem depender de agendamento síncrono ou de intros manuais.
Lições curtas no ritmo Duolingo: cada passo é pequeno, com começo, meio e fim.

| Arquivo | Conteúdo |
| --- | --- |
| [`convite-escola.md`](./convite-escola.md) | Copy PT-BR do convite + snippet pronto do link para a página `/escola/` (inserção a cargo da lane de produto) |
| [`roteiro-self-service-dev.md`](./roteiro-self-service-dev.md) | Roteiro auto-guiado assíncrono: lições `l27`–`l29` (app) + práticas `pg-d02` e `pg-c01` (repositório) |
| [`triagem-consentimento-metricas.md`](./triagem-consentimento-metricas.md) | Triagem de 3 perguntas, consentimento escrito assíncrono (padrão AID-142), regras honestas do funil e formato de handoff para UX |

## Limites do kit (invioláveis)

1. **Não promete nada além do roteiro do teste** — sem recompensa, incentivo, certificado
   ou acesso antecipado (incentivos exigem aprovação explícita do founder).
2. **Nenhum PII além de contato** (e-mail); contato vai **somente** para armazenamento
   restrito de pesquisa (regra AID-142/AID-641). Nada de PII em issues, PRs ou comentários
   públicos deste repositório.
3. Instrumentos do teste (AID-639) e sínteses da UX (AID-641) **não são alterados aqui** —
   este kit apenas alimenta o funil.

## Como o funil self-service conta (resumo)

`contatos` → envios confirmados do convite (receipt do canal, não analytics) ·
`respostas` → triagem respondida · `screened` → aprovado nas 3 perguntas ·
`agendados` → consentimento + roteiro iniciado · `concluídas` → roteiro concluído com
feedback registrado. Detalhe e justificativa em
[`triagem-consentimento-metricas.md`](./triagem-consentimento-metricas.md).

## Governança

- Dono do conteúdo: **Growth & Recruiter** (AID-909).
- Inserção do convite em `/escola/` (superfície de produto `engines/literacyDojo`): **não
  é feita aqui** — snippet pronto em `convite-escola.md`, execução via lane de produto.
- Métricas e estado do funil: doc `tracker` da issue AID-909 (cadência lá definida).
