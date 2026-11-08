<!-- issue: AID-909 | key: growth-kit | doc_id: a9390ec8-80e6-4336-a275-d9e23c017c8a | updated: 2026-10-17 16:30:06.698+00 -->

# growth-kit

(AID-909)

# Kit self-service O1 — docs/growth/ (espelho autoritativo AID-909)

> Pivot founder `7f74f2e5` (2026-10-17). Conteúdo idêntico ao commit `bc065bc5` (branch local `aid-909/growth-self-service-kit`, base `b08e0096`). Entrega ao repo main pendente de push/merge sancionado pelo SDLC (2 pushes revertidos server-side — ver tracker hb103); inserção do convite em `/escola/` é superfície de produto (lane FPE/UX). Este doc é a cópia de trabalho até o merge.

## `README.md`

```markdown
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

```

## `convite-escola.md`

```markdown
# Convite `/escola/` — copy PT-BR (self-service O1)

Copy curta, voz do produto (lições curtas no ritmo Duolingo). Nada além do roteiro do
teste. Versão para link direto na página `/escola/` do site AiDevSchool.

## Copy do convite (versão dev)

> **Dev, teste 3 lições + 2 práticas guiadas — no seu tempo (~40 min).**
> Estamos testando a trilha **IA para Dev** do AiDevSchool: lições curtas no ritmo
> Duolingo para quem constrói software com IA. O percurso é auto-guiado: 3 lições no app
> (`l27`–`l29`) e 2 práticas guiadas do repositório (`pg-d02`, `pg-c01`), com feedback
> curto no fim. Sem instalar nada, sem conta, sem custo. Quer participar?
> [Comece pelo roteiro](https://github.com/dandpb/aidevschool/tree/main/docs/growth/roteiro-self-service-dev.md).

Regras: não prometer recompensa/incentivo/certificado; não prometer "mudar seu jeito de
programar"; não coletar nada além de e-mail no consentimento.

## Snippet pronto para a página `/escola/` (execução: lane de produto)

Local sugerido: bloco da jornada dev (`#jornada-dev`) ou rodapé do hero — decisão final é
da lane de produto/UX. HTML proposto:

```html
<!-- AID-909: convite self-service O1 (dev) — remover ao fim da onda O1 -->
<a class="primary" href="https://github.com/dandpb/aidevschool/tree/main/docs/growth/roteiro-self-service-dev.md"
   rel="noopener">Devs: teste a trilha IA para Dev — roteiro self-service (~40 min)</a>
```

Texto alternativo curto (se couber só 1 linha):

```html
<a href="https://github.com/dandpb/aidevschool/tree/main/docs/growth/roteiro-self-service-dev.md" rel="noopener">Devs: roteiro self-service de teste (~40 min)</a>
```

## Copy do convite (versão e-mail/DM, para reuso)

> Oi! Estamos testando a trilha IA para Dev do AiDevSchool — lições curtas no ritmo
> Duolingo. Roteiro assíncrono de ~40 min: 3 lições no app + 2 práticas guiadas. Sem
> conta, sem instalação. Se topa, começa aqui: [roteiro self-service](https://github.com/dandpb/aidevschool/tree/main/docs/growth/roteiro-self-service-dev.md)
> (consentimento de 1 página no início — pesquisa moderada, sem PII além do seu e-mail).

## Métrica de contato (honestidade)

Um `contato` conta somente com **envio confirmado** (receipt do canal — post/link ativo
publicado, envio de e-mail registrado). Analytics de clique **não** é evidência de funil.

```

## `roteiro-self-service-dev.md`

```markdown
# Roteiro self-service (dev) — O1 assíncrono

Teste moderado O1 em formato **auto-guiado**: você faz no seu tempo, em qualquer ordem de
horário. Total ~40 min. Sem conta, sem instalação, sem custo. Sem promessa além deste
roteiro (sem recompensa, certificado ou acesso antecipado).

**Comece aqui:** [triagem + consentimento](./triagem-consentimento-metricas.md) (3
perguntas + consentimento de 1 página, ~5 min) — depois volte a este roteiro.

## Parte 1 — Lições no app (l27 → l28 → l29, ~15 min)

App de lições: **https://aidevschool-literacydojo.netlify.app/** (entrada pela home; a
avaliação curta inicial é opcional para este teste — pode pular direto às lições da trilha
dev quando disponível na sua rota).

| Ordem | Lição | O que testa |
| --- | --- | --- |
| 1 | `l27` — **Debug com assistente: reproduza antes de perguntar** | Antes de pedir ajuda à IA: reproduzir o erro |
| 2 | `l28` — **Refatore com assistente sem quebrar comportamento** | Refatoração guiada mantendo comportamento |
| 3 | `l29` — **Avalie as dependências sugeridas** | Critério diante de sugestões de dependência |

Enquanto faz, anote (para o feedback final): 1 coisa clara, 1 coisa confusa, 1 coisa que
faltou — por lição.

## Parte 2 — Prática guiada no repositório (pg-d02, ~15 min)

**`pg-d02` — Pedido estruturado** (sequência dev guiada). Material do aprendiz:

- `curriculum/sequencia-dev-guiada/pg-d02-pedido-estruturado/enunciado.md`
- `curriculum/sequencia-dev-guiada/pg-d02-pedido-estruturado/insumos/`
- `curriculum/sequencia-dev-guiada/pg-d02-pedido-estruturado/exemplo-trabalhado.md`
  (mini-caso distinto, de estudo)

Faça a tentativa sozinho seguindo o enunciado; o exemplo trabalhado é referência DEPOIS
da tentativa. Nenhum envio é necessário — o que vale é o seu feedback do percurso.

## Parte 3 — Prática guiada cotidiano (pg-c01, ~10 min)

**`pg-c01` — Dados mínimos e verificação** (família cotidiano; incluída para medir o
cruzamento de públicos). Material do aprendiz:

- `curriculum/praticas-guiadas-cotidiano/pg-c01-dados-minimos-e-verificacao/enunciado.md`
- `curriculum/praticas-guiadas-cotidiano/pg-c01-dados-minimos-e-verificacao/insumos/`
- `curriculum/praticas-guiadas-cotidiano/pg-c01-dados-minimos-e-verificacao/exemplo-trabalhado.md`

Mesmo protocolo: tentativa → exemplo trabalhado → feedback.

## Parte 4 — Feedback final (~5 min)

Responda (canal do consentimento, por e-mail — nunca em issue/PR público):

1. Para cada lição (`l27`, `l28`, `l29`): 1 coisa clara / 1 confusa / 1 que faltou.
2. Para `pg-d02` e `pg-c01`: a instrução foi suficiente? Onde travou?
3. De 0–10: quanto você recomendaria a um dev amigo? Por quê (1 linha)?
4. (Opcional) Topa uma sessão síncrona de 45–60 min para aprofundar? — se sim, 3 janelas
   de horário.

Fim do roteiro. Obrigado por testar a trilha IA para Dev do AiDevSchool.

```

## `triagem-consentimento-metricas.md`

```markdown
# Triagem, consentimento e métricas — funil self-service O1

## 1. Triagem: 3 perguntas (sem PII além de contato)

Respondidas por e-mail antes de iniciar o roteiro (mesma triagem do funil síncrono,
adaptada ao formato assíncrono):

1. Você programa profissionalmente (ou estuda para isso)? — contexto em 1 linha.
2. Já usou assistentes de IA no seu fluxo de trabalho? Com que frequência (diário /
   semanal / raramente / nunca)?
3. Consegue dedicar ~40 min, assíncrono, nos próximos 7 dias?

**Critério de aprovação** (`screened`): dev (Q1 = sim) E qualquer frequência em Q2
(inclui "nunca" — queremos o espectro completo) E "sim" em Q3. Recusa é neutra e sem
justificativa exigida.

## 2. Consentimento escrito assíncrono (padrão AID-142)

Texto de 1 página, respondido por e-mail ("CONCORDO" + nome + data) antes de iniciar:

> Participação voluntária em teste de usabilidade moderado (O1) do AiDevSchool, formato
> assíncrono, ~40 min. Sem remuneração. Dados coletados: seu feedback (respostas às
> perguntas do roteiro) e seu e-mail de contato, usados apenas para esta pesquisa e
> armazenados em armazenamento restrito de pesquisa. Nenhum dado pessoal além disso é
> coletado; nenhum dado é publicado de forma identificável. Você pode parar a qualquer
> momento, sem qualquer consequência.

**Fluxo do PII:** e-mail do participante vai **somente** para o armazenamento restrito de
pesquisa (mesmo destino do funil síncrono, regra AID-641). **Proibido** PII em issues,
PRs, comentários ou docs públicos deste repositório. Analytics **não** é evidência de
funil nem substitui consentimento.

## 3. Métricas do funil self-service (honestas)

| Etapa | Conta como | Não conta como |
| --- | --- | --- |
| Contatos | Convite **entregue com receipt** (link publicado ativo em `/escola/` confirmado pela lane de produto; envio de e-mail/DM registrado) | Cliques, impressões, analytics |
| Respostas | Triagem respondida (e-mail recebido) | Abertura de página |
| Screened | Aprovado no critério §1 | — |
| Agendados | Consentimento registrado (`CONCORDO`) + roteiro iniciado | Consentimento sem roteiro |
| Concluídas | Roteiro concluído = feedback final recebido (P1–P3 do roteiro) | P4 opcional sozinho |

Sessões síncronas voluntárias (P4) seguem o fluxo original de handoff à UX (AID-641) com
pin/deploy vigente anotado.

## 4. Handoff para a UX (AID-641) — formato

Para cada participante concluído, registro no armazenamento restrito (não no repositório)
no formato:

```
HANDOFF O1 — [P#]
data-conclusão (UTC) | contato (restrito) | consentimento: sim/não | pin/deploy vigente: <pin>
triagem: Q1/Q2/Q3 | feedback P1–P3 recebido: sim/não | sessão síncrona pedida: sim/não
```

Scorecards e sínteses ficam com a UX (AID-641); G&R alimenta apenas o funil. Instrumentos
do teste (AID-639) intocados.

## 5. Fim da onda

O kit é **escopo da onda O1**: ao fim da onda (ou decisão do founder), o convite sai da
página `/escola/` e este diretório permanece como registro do experimento.

```
