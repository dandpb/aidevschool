# Folha de exercício — “Corrija a rotina sem começar do zero”

Diretório de documentação de projeto (AID-3649). Artefato **fora do currículo canônico**: não
altera lições, gates, bindings, IDs, progresso, dominância, engines ou runtime.

> Nota de nomenclatura: os **nomes de arquivo** mantêm “worksheet” por estabilidade do PR; a
> **copy do material do aprendiz** usa “folha de exercício” (decisão do ciclo de correção, item 6).

## Arquivos

| Arquivo | Papel |
| --- | --- |
| `worksheet-visual.html` | Folha de exercício visual antes/depois (arquivo único, offline, mobile-first ≥360 px). **Material do aprendiz.** |
| `worksheet-texto.md` | Equivalente em texto puro (leitores de tela, baixa banda, P&B). Mesmos campos/numeração. |
| `guia-docente.md` | Guia de correção **separado**: números de referência das semanas 1–2 com valores, rubrica por campo, feedback direcionado + nova tentativa, fronteiras. Não distribuir com a folha. |
| `README.md` | Este arquivo: uso, decisões, **nota técnica** (procedência/pins/fronteiras migrada do rodapé do material do aprendiz). |

## Como usar

1. Abrir `worksheet-visual.html` em qualquer navegador (sem dependências externas) ou imprimir;
   para acessibilidade/impressão P&B, usar `worksheet-texto.md`.
2. Aplicar após a lição l32 (progressão natural l30 → l32 → autorar o reparo).
3. Corrigir com `guia-docente.md` (docente): números de referência no §2, um padrão por vez,
   nova tentativa só no campo indicado.

## Desenho (decisões registradas)

- **Gap atendido:** l32 tem choice / output_comparison / missing_context (seleção); aqui o
  aprendiz **autora** o reparo reutilizável (produção) sobre um caso sintético próprio — sem
  duplicar pg-c01/tp-c01 nem tabela supported/contradicted/unknown.
- **Exemplo resolvido separado do caso do aprendiz** (Mariana/atendimento vs loja/pedidos), cada
  um com fonte numérica própria e semana de teste própria.
- **Verificabilidade (núcleo do ciclo de correção PO/CD):** toda saída é conferível contra a
  fonte dada — regra “fonte → soma por categoria → total”; categorias disjuntas declaradas
  (“cada pedido tem um único status”); o total fechar sozinho não garante a divisão (contraexemplo
  explícito nos dois casos); “urgente” ensinado como marca transversal, fora da soma de conferência.
- **Cálculo trabalhado com valores no exemplo** (Mariana): abertos 2 + fechados 3 + reabertos 1
  = 6 = total do painel ✓, com verificação por categoria.
- **Acomodação explícita do número novo:** exemplo declara a renegocião 3→4 indicadores; semana 2
  pede decisão substituir/agregar/renegociar + justificativa.
- **Campos em branco:** pedido reutilizável fixo×variável (Campo 1), conferência na fonte +
  diagnóstico (Campo 2), reparo mínimo com acomodação declarada (Campo 3), validação humana
  (Campo 4), semana 2 com conferência numérica (a–d).
- **Negativos concretos:** manter input velho · pedido vago “atualize” · reescrita total.
- **Identidade visual:** tokens SDLCQuest v1.3 copiados 1:1 (paper/card/ink/mint/gold/coral,
  raios 18/10/9, foco 3 px #12624c, corpo ≥14 px/1,75, reduced-motion) — nenhum sistema visual
  paralelo. É **folha de exercício/mockup**, não app implementado.
- **Linguagem simples na copy do aprendiz:** “folha de exercício”, “tente novamente”; termos
  técnicos (canônico/gates/procedência/pins) migrados para esta nota técnica.
- **Fronteiras honradas:** sem dados reais (tudo sintético), sem live API, sem contas, sem
  publicação externa, sem promessa de automação/eficácia/persistência; nada é salvo pelo HTML.

## Nota técnica (procedência e fronteira — conteúdo migrado do material do aprendiz)

- Aprovado: AID-3649 (PO; pedido Dani 2026-10-01 18:27 UTC). **Ciclo de correção** (HOLD do PO
  + brief do Content Designer, 2026-10-01): itens 1–7 aplicados — dados numéricos sintéticos
  verificáveis semanas 1–2, semântica de mapeamento/contagem explícita (disjunção), cálculo
  trabalhado com valores, saídas revisadas de referência no guia, semana 2 como verificação
  concreta, linguagem simples na copy do aprendiz; layout/mobile-first/campos/negativos/
  identidade preservados. Fluxo: UX entrega → re-review de delta do CD → verificação do PO;
  claim “learner-ready” segue **HELD** até os três passos.
- Fontes imutáveis (somente leitura, verificadas por blob):
  `curriculum/ai-literacy/modules/08-rotina-com-ia-ii/l30-rotinas-repetitivas.yaml` · blob `595e33643211a83af191364abc2379d7c30149f0`
  `curriculum/ai-literacy/modules/08-rotina-com-ia-ii/l32-quando-a-automacao-erra.yaml` · blob `e6c78deb01f41b60dedf25616c8fcddbdc7c9c9a`
  `curriculum/ai-literacy/modules/06-rotina-com-ia/l18-biblioteca-de-pedidos.yaml` · blob `67d388ee39e4c46d3a4ba7a0dcb3a2260d72e186`
  `curriculum/ai-literacy/modules/06-rotina-com-ia/l19-conversas-longas.yaml` · blob `f3611e2a36e2ca799ac7d9f98eac79f60db31795`
  pin `main` = `86fca77987408ff85d8050cb2d87ded48a7e49b0` (nenhuma fonte modificada).
- Autoria/execução: UX Designer de Aprendizagem, agente `0bfa47c1-099a-42a1-99a5-7d7b0a380ba9`;
  entrega inicial run `64d19f2e-30c8-4404-ab43-628c62c1c036`; correção 2026-10-01 (seguida do
  brief CD `b9c782cc`).
