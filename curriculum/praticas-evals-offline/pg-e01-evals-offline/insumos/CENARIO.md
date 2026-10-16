# Cenario de produto (ficticio) — PrismaDesk

> **Tudo aqui e sintetico**: PrismaDesk e um SaaS inexistente; tickets,
> prompts e saidas foram autoralmente fixados para a pratica (AID-3648).
> Nenhuma afirmacao de eficacia real e feita ou pode ser deduzida destes
> dados. Nenhum modelo de IA foi executado para produzi-los.

## O produto

O PrismaDesk e um helpdesk de SaaS (ficticio) que usa um LLM para triar
tickets de suporte em exatamente uma **area**:

| Area | Definicao operacional |
| --- | --- |
| `tecnico` | defeito/erro de funcionamento do produto |
| `pagamento` | cobranca, fatura, reembolso, cartao, assinatura/plano em contexto de pagamento |
| `conta` | usuarios, permissoes, propriedade e dados da conta |
| `uso` | "como faz/da para" sobre funcionalidades existentes |

O prompt em producao e o **v1** (`insumos/prompts/prompt_v1.md`).

## A mudanca proposta

Uma pessoa do time (a "autora do v2") propoe o **prompt v2**
(`insumos/prompts/prompt_v2.md`) e defende a troca com este relato
(reproduzido literalmente):

> "Rodei nos 24 tickets de teste que eu mesma montei: o v2 acertou 18
> contra 17 do v1 (75% vs 71%). Melhorou. Podemos promover amanha.
> Anexei meu planilha — confia."

## O seu papel

Voce e a pessoa responsavel por **decidir com evidencia independente**
se o v2 sobe ou nao. Regra da escola: **certeza de conclusao nunca vive
no LLM** — e tambem nunca vive na palavra de quem fez a mudanca.
A evidencia do produtor (o relato acima) e **entrada para analise,
nao verificacao**: numeros de quem propoe a mudanca nao substituem um
scorer deterministico rodado por quem decide, com criterios definidos
**antes** de olhar as saidas e fatias que o agregado pode esconder.

## O que voce tem (tudo local, sem rede)

- `insumos/fixture/casos_base.json` — 24 tickets sinteticos com rotulo
  dourado (conjunto de DESENVOLVIMENTO: e nele que voce analisa A vs B).
- `insumos/fixture/saidas_{A,B}_base.json` — predicoes sinteticas das
  variantes A (v1) e B (v2) nesses 24 casos.
- `insumos/fixture/metricas.py` — scorer deterministico (acuracia por
  fatia + detector de regressao oculta). Ele nao sabe "a resposta
  certa da pratica": e uma ferramenta generica.
- `insumos/fixture/heldout/` — casos NOVOS (ids `PD-H*`), disjuntos do
  base. **Abra somente DEPOIS de registrar por escrito a sua proposta
  de correcao** (ver enunciado, passo 4). Serve para testar o
  diagnostico e a correcao em dados que nao guiaram a analise.

## Perguntas que o time vai te fazer

1. O v2 melhora no geral? Quanto?
2. Alguma fatia piorou mesmo com o geral melhor?
3. Qual correcao de prompt voce propoe para a fatia que piorou?
4. A correcao funciona em casos NOVOS que voce nao viu?
5. O que ainda falta para afirmar que "funciona" de verdade?
