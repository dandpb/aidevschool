# Worksheet — “Corrija a rotina sem começar do zero”

Diretório novo de documentação de projeto (AID-3649). Artefato **fora do currículo
canônico**: não altera lições, gates, bindings, IDs, progresso, mastery, engines ou runtime.

## Arquivos

| Arquivo | Papel |
| --- | --- |
| `worksheet-visual.html` | Worksheet visual antes/depois (arquivo único, offline, mobile-first ≥360 px). **É o material do aprendiz.** |
| `worksheet-texto.md` | Equivalente em texto puro (leitores de tela, baixa banda, P&B). Mesmos campos, mesma numeração. |
| `guia-docente.md` | Guia de correção **separado** (rubrica por campo, feedback direcionado + retry, fronteiras). Não distribuir com o worksheet. |

## Como usar

1. Abrir `worksheet-visual.html` em qualquer navegador (sem dependências externas) ou
   imprimir; para acessibilidade/Impressão P&B, usar `worksheet-texto.md`.
2. Aplicar após a lição l32 (progressão natural l30 → l32 → autorar o reparo).
3. Corrigir com `guia-docente.md` (docente), um padrão por vez, retry no campo indicado.

## Desenho (decisões registradas)

- **Gap atendido:** l32 tem choice / output_comparison / missing_context (seleção); aqui o
  aprendiz **autora** o reparo reutilizável (produção) sobre um caso sintético próprio —
  sem duplicar pg-c01/tp-c01 nem tabela supported/contradicted/unknown.
- **Exemplo acompanhado separado do caso do aprendiz** (Mariana/atendimento vs loja/pedidos),
  cada um com semana de teste própria.
- **Campos em branco pedidos pela issue:** prompt reutilizável (fixo × variável — Campo 1),
  reparo mínimo de contexto para saída plausível-desatualizada (Campo 2), pergunta final de
  validação humana (Campo 3), teste com nova semana sintética (semana 2).
- **Negativos concretos:** manter input velho · pedido vago “atualize” · reescrita total.
- **Identidade visual:** tokens SDLCQuest v1.3 copiados 1:1 (paper/card/ink/mint/gold/coral,
  raios 18/10/9, foco 3 px #12624c, corpo ≥14 px/1,75, reduced-motion) — nenhum sistema
  visual paralelo. É **worksheet/mockup**, não app implementado.
- **Fronteiras honradas:** sem dados reais, sem live API, sem contas, sem publicação externa,
  sem promessa de automação/eficácia/persistência; nada é salvo pelo HTML.

## Proveniência e fidelidade

- Aprovado: AID-3649 (PO; pedido Dani 2026-10-01 18:27 UTC). Revisão pedagógica independente:
  Content Designer (CD) — aceite independente antes de qualquer claim “learner-ready”.
- Fontes imutáveis (somente leitura, verificadas por blob):
  `curriculum/ai-literacy/modules/08-rotina-com-ia-ii/l30-rotinas-repetitivas.yaml` · blob `595e33643211a83af191364abc2379d7c30149f0`
  `curriculum/ai-literacy/modules/08-rotina-com-ia-ii/l32-quando-a-automacao-erra.yaml` · blob `e6c78deb01f41b60dedf25616c8fcddbdc7c9c9a`
  `curriculum/ai-literacy/modules/06-rotina-com-ia/l18-biblioteca-de-pedidos.yaml` · blob `67d388ee39e4c46d3a4ba7a0dcb3a2260d72e186`
  `curriculum/ai-literacy/modules/06-rotina-com-ia/l19-conversas-longas.yaml` · blob `f3611e2a36e2ca799ac7d9f98eac79f60db31795`
  pin `main` = `86fca77987408ff85d8050cb2d87ded48a7e49b0` (nenhuma fonte modificada).
- Autoria/execução: UX Designer de Aprendizagem, agente `0bfa47c1-099a-42a1-99a5-7d7b0a380ba9`,
  run `64d19f2e-30c8-4404-ab43-628c62c1c036`, 2026-10-01.
