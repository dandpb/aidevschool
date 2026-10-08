# Práticas guiadas (cotidiano)

Família de práticas guiadas **simuladas** para o público cotidiano (jornada `ia_pratica`):
ciclo completo **preparar → verificar → responder** com insumos sintéticos rotulados,
exemplo trabalhado, tentativa com feedback por critério, retry e takeaway. Não é tarefa de
transferência, não gera `mastered`, nota ou certificação, e não exige conta, serviço real,
envio ou ferramenta de IA.

Este diretório é **conteúdo revisável** versionado; nenhum runtime, engine, schema,
telemetria, progresso ou catálogo de missões o consome ainda (próximo consumidor é decisão
posterior, ver Parte 6 §6.3 abaixo).

## Pacote atual

| Prática | Público | Problema | Competências |
|---|---|---|---|
| `pg-c01-dados-minimos-e-verificacao/` | cotidiano | Preparar pedido com dados mínimos, verificar resposta de IA (apoiada/contrariada/fontes não dizem, citação fonte+linha), recusar dado sensível e responder só com o que as fontes sustentam | **P F4** verificação · **S F2** uso seguro |

## Como usar

- **Pacote do aprendiz:** `pg-c01-dados-minimos-e-verificacao/enunciado.md` +
  `insumos/` (2 fontes sintéticas + resposta da IA) + `exemplo-trabalhado.md`
  (mini-caso DISTINTO, de estudo). Nenhum gabarito neste caminho.
- **Material do corretor:** `rubrica-v1.md` (6 critérios separáveis, controles negativos),
  `guia-de-correcao/solucao.md` (gabarito — NÃO entregar com o enunciado) e
  `exemplos/` (calibração autoral rotulada, nunca resultados de alunos).

## Estrutura

```
curriculum/praticas-guiadas-cotidiano/
├── README.md                                   (este índice)
└── pg-c01-dados-minimos-e-verificacao/
    ├── enunciado.md                            objetivo, cenário, 3 etapas, regras, retry, takeaway
    ├── insumos/                                fonte-1-recado-tia-regina.md · fonte-2-grupo-familia.md · resposta-ia.md
    ├── exemplo-trabalhado.md                   mini-caso diferente (churrasco do prédio)
    ├── rubrica-v1.md                           6 critérios separáveis + perCheck + controles negativos
    ├── guia-de-correcao/solucao.md             GABARITO (fora do pacote do aprendiz)
    └── exemplos/                               exemplo-falha.md · exemplo-sucesso.md (autorais rotulados)
```

## Procedência e mapa verificável origem → arquivos

- **Origem:** issue **AID-3565** (prática guiada pg-c01 v1, autor Content Designer), documento
  `pg-c01-pacote` rev `7263b987`, anexo `fdc8b748` — arquivo
  `pg-c01-dados-minimos-e-verificacao-v1.md`, **26161 bytes**,
  sha256 `904ea56a97495a3dcbacc4e6bdf8d8df5b98b8f16df1f0ac95b835ffed4e73e5`
  (confirmado antes da divisão). Parecer pedagógico QA: comentário
  `f8a8f8ee-8f3b-4499-84b0-d3505dff0132` em AID-3565 (vereditos 5/5, critérios 6/6).
- **Incorporação:** issue **AID-3573** (Curriculum Content Engineer), mapeamento 1:1 das
  Partes 1-6 conforme §6.3 do pacote.
- **Não byte-idêntico:** o documento foi **dividido** em arquivos; a fidelidade é verificável
  pela reconciliação linha-a-linha (toda linha de conteúdo da origem está presente na íntegra,
  exceto as 10 edições de navegação T3 abaixo) e pelos hashes por arquivo.

| Arquivo (sob `pg-c01-dados-minimos-e-verificacao/`) | sha256 | tamanho | linhas da origem |
|---|---|---|---|
| `enunciado.md` | `36dc9260d75bc0369590abbd61698b16e641021f68faf3db9af9c698f715493d` | 5184 B | L1-11 (título+banner), L14-90 (Parte 1) |
| `insumos/fonte-1-recado-tia-regina.md` | `a6fa215a1de9b827e52463b2dee9d0c0dfddb8a931206c9f71d279bbdbad1a48` | 955 B | L95-96 (nota sintética, T4), L98, L100-107 |
| `insumos/fonte-2-grupo-familia.md` | `693fee8a05015bd5e1e3b21fa68ba840ed582f34c4fa733d347e2dc0912da3eb` | 1131 B | L95-96 (nota sintética, T4), L109, L111-120 |
| `insumos/resposta-ia.md` | `62a68eafc738f9522dbf2cec64015e746ac3bfa5c451ea2703062ec23eddb546` | 893 B | L95-96 (nota sintética, T4), L122, L124-135 |
| `exemplo-trabalhado.md` | `2ec6374abb7148a823124897aabfa7d813978fe4700c93ed865e578fdd3e0cfa` | 1578 B | L139, L141-163 (Parte 3) |
| `rubrica-v1.md` | `c03de75dcb3d862d98ff787eadc7500fa729c8f75b759f196a80dfa55a139e8a` | 5345 B | L167, L169-221 (Parte 4) |
| `guia-de-correcao/solucao.md` | `ec74afb1b44c4706b8acf24a3b34525be5e57980a1494e1f7c1b6d8105ae9106` | 6763 B | L225, L227-274 (5.1-5.3), L292-302 (5.5), L303-320 (5.6) |
| `exemplos/exemplo-falha.md` | `61ad7027218cf7aea2790d38aa469686f54d0fdd3bc37c18c3fc14c95df95c09` | 741 B | L277-284 (bloco INSUFICIENTE da 5.4) |
| `exemplos/exemplo-sucesso.md` | `5f66991393bcc5ef67f3d215cfa613ab80dd7caa13bc45f0e9d8e71919742def` | 471 B | L286-291 (bloco SUFICIENTE da 5.4) |

## Registro de transformações mecânicas (sem alteração semântica)

- **T1** — promoção de headings `###` → `##` dentro dos arquivos divididos (após a remoção
  dos headings estruturais `## PARTE N`); texto inalterado.
- **T2** — remoção da numeração relativa ao documento-fonte nos títulos dos insumos
  (`2.1/2.2/2.3`) e dos headings estruturais `PARTE N —`. Numerações `5.x`/`6.x` mantidas
  (referenciadas internamente pelo pacote).
- **T3** — referências de navegação `Parte N` reescritas para arquivo/pasta (10 ocorrências):
  `na Parte 2` → `na pasta insumos/` (L38); `A resposta da IA (Parte 2.3)` →
  `A resposta da IA (insumos/resposta-ia.md)` (L50); `(Parte 5.5 do guia de correção)` →
  `(seção 5.5 do guia de correção)` (L75); `na Parte 5, material do corretor` →
  `em guia-de-correcao/solucao.md, material do corretor` (L89); `(ver gabarito 5.2)` →
  `(ver gabarito 5.2 em guia-de-correcao/solucao.md)` (L179); `nas fontes da Parte 2` →
  `nas fontes da pasta insumos/` (L180); `contra as linhas da Parte 2` →
  `contra as linhas da pasta insumos/` (L284); `O enunciado (Parte 1) e os insumos (Parte 2)`
  → `O enunciado (enunciado.md) e os insumos (insumos/)` (L305); `6 controles negativos
  (Parte 4)` → `6 controles negativos (na rubrica-v1.md)` (L315); `linha existente na Parte 2`
  → `linha existente na pasta insumos/` (L319).
- **T4** — nota sintética da Parte 2 ("Todos os nomes… SINTÉTICOS…") duplicada no topo dos
  3 arquivos de `insumos/` (na origem era um único banner para a parte inteira).
- **T5** — seção 5.4 dividida: blocos INSUFICIENTE/SUFICIENTE em
  `exemplos/exemplo-falha.md` e `exemplos/exemplo-sucesso.md` (heading derivado do rótulo
  autoral do próprio bloco); ponteiros para os dois arquivos adicionados em
  `guia-de-correcao/solucao.md`.
- **T6** — separadores `---` entre partes do documento-fonte removidos.
- **T7** — Parte 6 (procedência, deduplicação, versão e próximo consumidor) embutida
  **íntegra** na seção seguinte deste README, com seus headings originais `###`.

## Procedência, deduplicação, versão e próximo consumidor (Parte 6 do pacote — íntegra)

### 6.1 Fontes atuais confirmadas (leitura feita antes de produzir)

- Repo `main` @ **9ba3d5a0**; catálogo canônico `curriculum/ai-literacy/catalog.yaml`
  (`contentVersion 2026-09-10.2`; **32 lições ready**; **l20** = "Números e fatos:
  verifique antes de usar", v2, blob `daf6a9d8cdec` — aprofundamento operacional de
  l09/l10; **l12** v3 blob `2f399263d704`; **l25** v2 blob `b3cebeaf8c65`).
- Contrato de conteúdo `docs/design/ai-literacy/content-contract.md` (regra 7: próximo
  id livre **l33** — este pacote **não** cria lição nem module id; é prática guiada fora
  do track canônico, no padrão `praticas-transferencia/` (PR #619) e `sequencia-dev-guiada/` (e01d9d42).

### 6.2 Deduplicação (feita antes de produzir)

- **tp-c01 (PR #619 @ 7259dbc5, DRAFT)**: tarefa de **transferência** (reembolso, 3 fontes,
  memorando, memo aberto sem alternativas). Sobreposição de *mecanismo* (vereditos
  apoiada/contrariada/fontes-não-dizem + citação fonte/linha + recusa de dado sensível) é
  **intencional e declarada** — mesma disciplina, ensinada aqui em régua guiada; a **fatia
  nova** é o ciclo completo **preparar→verificar→responder** com exemplo trabalhado,
  tentativa, feedback por erro, retry e takeaway, cenário novo (festa familiar), 2 fontes
  (não 3) e pedido minimizado pelo aprendiz (tp-c01 começa depois da resposta existir).
  Nenhuma frase, caso ou número reaproveitado.
- **Atividades existentes do track**: l12-a* classificam seguro/sensível (itens soltos),
  l20-a* marcam afirmações para verificar e ordenam fontes, l25 trata de anexos — todas
  em casos **ensinados**; nenhuma pratica o ciclo guiado ponta a ponta num cenario
  cotidiano com conflito de data/valor + dados a remover.
- **pg-d01 (e01d9d42)**: prática guiada **dev** (estrutura reutilizada: exemplo→tentativa→
  feedback→retry→takeaway; público e conteúdo distintos).
- Board: AID-3506 (tp-c01/tp-d01, aceites pendentes de Content Designer — **este pacote
  não opina sobre esse aceite**, só deduplica), AID-3510 (sequência dev), AID-3515
  (dicionário de evidências — rubricas tp-* citadas como canal de evidência; pg-c01
  **não** entra nesse canal: é prática guiada, não evidência).

### 6.3 Próximo consumidor e condições

1. **QA Lead (ca6a3f95)** — revisão independente de rubrica/evidência (6 critérios,
   controles negativos, reprodução dos julgamentos só com insumos, autocheque 5.6).
2. **Founding Product Engineer (fa8130d5)** — incorporação ao repositório, quando
   ordenado por issue própria, no layout do precedente: 
   `curriculum/praticas-guiadas-cotidiano/pg-c01-dados-minimos-e-verificacao/`
   (`enunciado.md`, `insumos/{fonte-1-recado-tia-regina.md, fonte-2-grupo-familia.md,
   resposta-ia.md}`, `exemplo-trabalhado.md`, `rubrica-v1.md`,
   `guia-de-correcao/solucao.md`, `exemplos/{exemplo-falha,exemplo-sucesso}.md`).
   Partes 1–6 deste documento mapeiam 1:1 para esses arquivos.
3. Sem merge, publicação ou outreach por esta issue. Nenhuma alteração de runtime,
   schema, engine, telemetria, progresso ou missões promovidas.

### 6.4 Changelog

- v1 (2026-10-01, AID-3565): primeira emissão — enunciado, 2 fontes sintéticas,
  resposta da IA com 5 afirmações, exemplo trabalhado (mini-caso distinto), rubrica v1
  (6 critérios separáveis + perCheck + erros plausíveis + feedback por critério +
  6 controles negativos), gabarito separado com exemplos autorais rotulados, retry com
  "IA que insiste", takeaway, deduplicação e procedência.
