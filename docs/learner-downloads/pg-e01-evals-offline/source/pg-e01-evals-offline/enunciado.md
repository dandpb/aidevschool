# pg-e01 — Pratica guiada: evals offline de saidas de modelo

**Trilha:** Dev (jornada por competencias, AID-3453) · **Unidade:** U13 da
sequencia (AID-3510 `SEQUENCIA.md` §3P3, lacuna D5) · **Competencia
primaria:** D5 (produto IA/evals) · **Apoio:** D1 (fundamentos/harness)
**Ancoras:** l11 "como comparar alternativas"
(`curriculum/ai-literacy/modules/03-avaliar-e-verificar/l11-como-comparar-alternativas.yaml`,
blob `cf370d228d02`, base `86fca779`) e l08 "a primeira resposta nao e a
melhor" (blob `cc0ae70259a1`); aprofundamento: curso-simples M9 Loop
Engineering (`docs/curso-simples/index.html` §9, blob `2bcf99fbd831`) —
fonte parcial, sem pratica executavel (por isso esta unidade existe).
**Pre-requisitos:** U05 (critérios objetivos: aceitar/recusar com motivo);
pg-d01 ajuda mas nao e obrigatorio.
**Duracao alvo:** 25–40 min (uma sessao, cadencia da escola).

## Objetivo observavel

Diante da proposta de troca do prompt v1→v2 do PrismaDesk
(`insumos/CENARIO.md`), executar o ciclo completo de avaliacao offline —
**criterios congelados antes de ver as saidas** → scoring deterministico
A vs B por fatia → diagnostico da melhora agregada que esconde fatia que
piorou → proposta de correcao de prompt → teste em casos NOVOS (heldout)
— sem terceirizar a prova: quem roda o scorer e le as tabelas e voce.
Ao fim, voce consegue dizer, com numeros e fonte: (1) quanto o agregado
mudou; (2) qual fatia regrediu e quanto; (3) o que mudaria no prompt e
por que; (4) o que o heldout confirma; (5) o que ainda NAO esta provado.

## O ciclo guiado (exemplo → tentativa → feedback → retry → takeaway)

### 1. Exemplo trabalhado (≈ 8 min)

Leia `exemplo-trabalhado.md` (caso TrilhaFit, fixture sintetica propria
em `exemplo/`, com saidas reais do scorer citadas). Note a ordem:
criterios primeiro, saidas depois. Nao pule: sua tentativa usa a mesma
disciplina num cenario de produto diferente (helpdesk, 4 classes).

### 2. Tentativa (≈ 20 min)

Com os insumos locais (sem rede, sem conta, sem chave), faca **nesta
ordem**:

1. **Congele seus criterios ANTES de abrir qualquer `saidas_*.json`.**
   Preencha `insumos/modelo-de-criterios.md` → salve como
   `meus-criterios.md` → registre `sha256sum meus-criterios.md` no seu
   log. So depois abra as saidas. (Nao olhe o heldout nem o
   `guia-de-correcao/` ainda.)
2. **Plano de medicao antes do veredito**: escreva qual comando do
   scorer (`insumos/fixture/metricas.py comparar ...`) vai produzir cada
   numero da sua regra de decisao — agregado E fatias.
3. **Rode o scorer no conjunto base** (A vs B) e registre a saida real.
   Compare com o veredito: o agregado melhora? Alguma fatia piora?
4. **Diagnostico**: escreva qual fatia regrediu, com n e delta, e POR QUE
   o agregado escondeu (qual fatia "pagou" a melhora da outra). So entao
   leia `insumos/prompts/prompt_v2.md` e explique a mecanica do prompt
   que causa o erro nessa fatia.
5. **Proposta de correcao (v2.1)**: escreva o diff exato do trecho de
   prompt que voce mudaria, o por_que (ligado a mecanica diagnosticada),
   o que voce NAO mudaria (para nao perder o que melhorou) e o risco.
   Registre por escrito + `sha256sum` (e o congelamento da proposta).
6. **Heldout so agora**: abra `insumos/fixture/heldout/` e rode o scorer
   — (a) A vs B: o diagnostico se reproduz em casos NOVOS? (b) B vs C
   (C = correcao de referencia, ja fornecida): a fatia se recupera sem
   derrubar as outras? Registre as saidas reais. Se sua proposta difere
   da referencia, explique a diferenca (diferente pode ser melhor —
   desde que fundamente).
7. Compare sua proposta com `guia-de-correcao/proposta-referencia.md`.

Guarde: `meus-criterios.md` + hash, o plano de medicao, as saidas do
scorer (base e heldout), o diagnostico numerico, a proposta v2.1 com
hash, e o takeaway. Esse conjunto e o seu recibo da pratica.

### 3. Feedback (rubrica)

Avalie sua entrega contra `rubrica-v1.md` (6 criterios objetivos, com
pergunta de verificacao por criterio). Se houver revisor disponivel,
peca leitura com a mesma rubrica; a rubrica e o contrato — nao gosto.

### 4. Retry (se algum criterio nao passar)

Refazer **apenas** o passo do criterio reprovado, nao a pratica inteira:
exemplo — se `c-heldout` falhou (heldout aberto cedo demais), registre o
que fez, refaca o passo 5 (reproposta sem olhar o heldout de novo — ou
peça um colega de gerar casos novos sinteticos) e documente o replay.
Retry e parte do metodo, nao punicao.

### 5. Takeaway (≈ 5 min)

Responda em duas frases: (a) por que o numero agregado da autora do v2
era "verdadeiro e enganoso" ao mesmo tempo; (b) qual parte da sua rotina
(criterios antes / fatias / heldout / evidencia independente) impediria
a sua equipe de promover uma mudanca que quebra uma fatia. Arquive junto
com os hashes — e o seu recibo da pratica.

## Limites explicitos

- Nenhum passo exige rede, conta, chave ou segredo; fixtures locais e
  deterministicas (Python 3 puro, stdlib).
- **Tudo e sintetico e rotulado como tal**: tickets, prompts e saidas
  nao medem eficacia de modelo/prompt/produto reais; nenhum benchmark
  real e alegado.
- A variante C (heldout) e uma **correcao de referencia sintetica** para
  exercitar o teste em casos novos — validar a SUA correcao exige
  executa-la num pipeline com casos reais novos e evidencia independente;
  isso esta fora do escopo offline desta unidade (e o ponto do takeaway).
- Alegacao de produtor nao e verificacao: o veredito desta pratica vem
  do scorer deterministico executado por voce, sob criterios congelados.
- Solucao separada em `guia-de-correcao/` — consulte **apos** a tentativa.
