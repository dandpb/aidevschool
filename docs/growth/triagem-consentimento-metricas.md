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
