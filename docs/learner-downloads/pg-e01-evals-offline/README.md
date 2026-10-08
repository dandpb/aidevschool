# Kit de download pg-e01-evals-offline — prática U13/D5 em etapas (AID-3667)

Downloads offline da prática guiada **pg-e01** (evals offline de saídas de
 modelo, U13/D5), empacotados **em etapas** para proteger o método:
 critérios congelados **antes** dos resultados; held-out **depois** da
 proposta. O conteúdo vem **byte-idêntico** do kit aprovado em AID-3648
 (PR #645, commit `b028652d7853cbd4efdf15035d9f9414aeb76094`) — nenhum
 arquivo do currículo foi editado aqui; este diretório apenas empacota.

## As etapas (cada ZIP é cumulativo)

 | Etapa | ZIP | Público | Propósito | Limite (o que NÃO contém) |
| --- | --- | --- | --- | --- |
| 1 — Início | `zips/pg-e01-etapa-1-inicio.zip` | aprendiz | Cenário, prompts v1/v2, modelo de critérios, casos base e scorer para **declarar critérios e plano de medição antes dos resultados** (passos 1–2 da tentativa) | Nenhuma `saidas_*.json` do PrismaDesk; sem heldout de `insumos/`; sem `guia-de-correcao/`. As saídas do exemplo TrilhaFit (`exemplo/`) estão incluídas por desenho (leitura obrigatória do passo 1) |
| 2 — Base | `zips/pg-e01-etapa-2-base.zip` | aprendiz | Saídas A/B do conjunto base: rodar o scorer, diagnosticar a fatia que piorou, escrever proposta v2.1 **com hash** (passos 3–5) | Sem heldout, sem variante C, sem guia |
| 3 — Held-out | `zips/pg-e01-etapa-3-heldout.zip` | aprendiz | Casos NOVOS: A vs B (diagnóstico se reproduz?) e B vs C (correção de referência recupera sem derrubar?) — passo 6 | Sem `guia-de-correcao/` |
| 4 — Referência mínima | `zips/pg-e01-etapa-4-referencia.zip` | aprendiz | Exatamente o que o passo 7 manda consultar: `proposta-referencia.md` | Só `proposta-referencia.md`; critérios/solução/testes ficam fora |
| 5 — Docente | `zips/pg-e01-etapa-5-docente.zip` | docente | Gabaritos completos + 9 checks determinísticos (`testes.py`) | Uso docente/após concluir; não é etapa do aprendiz |

 Manifestos explícitos por etapa (nome/público/propósito/limite/arquivos):
 `manifests/stages.json`; hashes do pin imutável: `manifests/pin-hashes.json`.

## Guia de início, extração e execução (workspace limpo)

 Requisitos: Python 3 (stdlib apenas; testado em 3.13.5). Sem rede, conta
 ou chave. Exemplo com a Etapa 1 (as demais seguem o mesmo roteiro):

 ```sh
 mkdir pg-e01-work && cd pg-e01-work
 python3 -c "import zipfile; zipfile.ZipFile('pg-e01-etapa-1-inicio.zip').extractall('.')"
 cd pg-e01
 cat ETAPA.md          # nome, propósito e limite desta etapa
 sha256sum enunciado.md   # confira contra INVENTARIO.txt (hash/bytes por arquivo)
 # siga enunciado.md — passo 1 (exemplo) e passo 2 (congelar critérios ANTES das saídas)
 ```

 Avançando de etapa: extraia o ZIP seguinte **na mesma pasta** (cada ZIP é
 cumulativo e contém tudo das anteriores) — ou extraia em pasta nova; os dois
 funcionam. Cada ZIP traz `ETAPA.md` (a etapa atual) e `INVENTARIO.txt`
 (inventário exato com sha256/bytes desta construção).

 Comando do scorer (válido a partir da Etapa 2; saída real abaixo, capturada
 da Etapa 3 extraída em workspace limpo):

 ```sh
 $ python3 insumos/fixture/metricas.py comparar \
     --casos insumos/fixture/casos_base.json \
     --A insumos/fixture/saidas_A_base.json --B insumos/fixture/saidas_B_base.json
 scorer=metricas.py fatia=area casos=24
 A=insumos/fixture/saidas_A_base.json
 B=insumos/fixture/saidas_B_base.json
 area             n A         B         delta
 conta            5    3/5       4/5    +0.200
 pagamento        6    5/6       2/6    -0.500
 tecnico          8    6/8       8/8    +0.250
 uso              5    3/5       4/5    +0.200
 GERAL           24   17/24     18/24   +0.042
 VEREDITO: agregada +0.042 COM regressao de fatia: pagamento (-0.500, n=6)
 FLAG_REGRESSAO_ESCONDIDA=1
 ```

## Verificação (reproduzível por qualquer revisor)

 ```sh
 python3 verify_kit.py --report RELATORIO-VERIFICACAO.md
 # 24 ok, 0 falha(s): fonte 28/28 byte-idêntica ao pin; inventário exato por
 # ZIP; bytes internos = pin; fronteiras pedagógicas; execução limpa do scorer
 # (base 17/24→18/24 e pagamento 5/6→2/6; heldout A/B 8/12→8/12 e B/C
 # 8/12→11/12); testes.py 9 checks; 2 construções byte-idênticas.
 ```

 Relatório da construção deste PR: `RELATORIO-VERIFICACAO.md`. Reconstruir os
 ZIPs: `python3 packager.py --out /tmp/pg-e01-zips` (determinístico: ordem ordenada,
 timestamps e modos fixos, deflate nível 9).

## Limites declarados

 - **Ordem é disciplina declarada, não barreira segura**: o kit não controla
   quando o aprendiz abre cada arquivo e **não alegar enforcement
   criptográfico**, nota ou mastery. A separação por etapas existe para tornar
   a ordem do `enunciado.md` operacional (o que abrir, quando).
 - Dados 100% sintéticos; a variante C é correção de referência sintética —
   não prova qualidade do prompt produzido pelo aluno, nem eficácia real.
 - Nenhum tracker/rede/PII; extração e execução locais.
 - Este diretório não altera o currículo: `source/` é cópia congelada do pin
   (ver `PROVENANCE.md`) usada como entrada do empacotador.

## Proveniência e revisão

 Fonte imutável, comandos reais e inventário hash/bytes: `PROVENANCE.md`.
 Autoria original do conteúdo: AID-3648 (aceita; não reaberta aqui — este
 trabalho empacota, não reautora). Empacotamento: Learner Analytics Engineer
 (AID-3667); revisão técnica CPE; aprovação pedagógica CD, conforme política
 de execução da issue.
