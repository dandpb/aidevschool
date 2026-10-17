# Catálogo de práticas (preview local) — AID-3669

Diretório de documentação de projeto. Entrega nova de entrada para o aprendiz aprovada pelo PO:
**apenas PREVIEW LOCAL, não publicação**. Artefato **fora do currículo canônico**: não altera
lições, gates, bindings, IDs, progresso, dominância, engines ou runtime.

## Arquivos

| Arquivo | Papel |
| --- | --- |
| `catalogo-visual.html` | Catálogo visual em arquivo único, offline, responsivo (mobile-first ≥320 px). **Material do aprendiz.** |
| `catalogo-texto.md` | Equivalente em texto puro (leitores de tela, baixa banda, P&B). Mesmas práticas e informações. |
| `README.md` | Este arquivo: uso, decisões, nota técnica (procedência/pins/fronteiras). |

## Como usar

1. Abrir `catalogo-visual.html` em qualquer navegador (sem dependências externas, sem JS, sem rede);
   para acessibilidade/baixa banda, usar `catalogo-texto.md`.
2. O objetivo de escolha: o aprendiz escolhe atividade por **resultado, duração real, requisitos,
   primeiros passos e disponibilidade VERDADEIRA**.
3. Disponibilidade verdadeira nesta versão: **as quatro práticas estão em preparação** — os botões
   ficam nativamente `disabled` (inertes), sem link falso, download simulado ou rota pública
   inventada. Quando os kits forem aceitos/existentes, o botão ganha o link relativo real.

## Práticas listadas e fontes aceitas (pins inspecionados antes da autoria — 2026-10-01)

| Prática | Kit (issue) | Status do kit | Fonte aceita (pin) |
| --- | --- | --- | --- |
| U09 — pg-d04 contexto + PRD/SPEC | AID-3665 | em produção | PR #643 @ `32888d9f03006f3dbcdaa57811b29c54a2c09146` |
| U10 — pg-d05 delegação controlada | AID-3668 | em produção | PR #646 @ `f7e3228a80cecc68e426e7d59d080a234d249104` |
| U13 — pg-e01 evals offline | AID-3667 | em produção | PR #645 @ `b028652d7853cbd4efdf15035d9f9414aeb76094` |
| Cotidiano — folha “reparo de rotina” | AID-3666 (folha imprimível) | em produção | PR #644 @ `fb8b4fe7e1a1cfe21708197761ef54987a0c95d9` |

Pré-requisitos declarados conforme as fontes: U09 exige U03 (ou equivalente); U10 exige U07 (ou
equivalente) e **não** exige U09; U13 exige U05 (pg-d01 ajuda, não é obrigatória); a folha cotidiana
aplica-se após l30 → l32 e é folha de exercício, não jogo publicado. U13 é apresentada como offline /
sintética / held-out em etapas. Textos e conteúdo dos pacotes aceitos preservados (nenhum gabarito,
resposta ou preload de solução; sem claims de eficácia/nota/mastery).

## Desenho (decisões registradas)

- **Identidade visual:** tokens SDLCQuest v1.3 copiados 1:1 (paper/card/ink/muted/line/deep/mint/
  menta-escuro/gold/coral, raios 18/10/9, foco visível 3 px `#12624c` offset 3, corpo ≥14 px/1.75,
  eyebrow/mono 11 px, h1 com `em` em Georgia, seleção menta, reduced-motion zera transições) —
  nenhum sistema visual paralelo. Ajuste de acessibilidade com token existente: texto do chip de
  unidade usa `--muted` `#4c6057` (razão 5,67:1 em `#e9ede3`) em vez do `#557260` da fonte
  (4,46:1, reprovado pelo axe) — cor já pertencente ao conjunto, sem tom novo. Extensão limitada
  documentada: rótulo de trilha (ouro p/ “IA no cotidiano”, menta-escuro p/ “IA para Dev”) e ponto
  ouro p/ status “em preparação” na legenda, ambos com tokens existentes (mesma regra bounded do
  contrato AID-3458).
- **Estrutura pronta para integração:** o grid de cards, a barra de contagem e a legenda de status
  já distinguem “disponível agora” (ponto menta) de “em preparação” (ponto ouro); a integração de QA
  acontece uma vez que existam pacotes reais, trocando apenas o estado/botão por link relativo real.
- **Sem JS:** catálogo estático em HTML semântico; botões indisponíveis são `disabled` nativos
  (não recebem foco por Tab e não disparam nada — verificação registrada no issue).
- **Linguagem simples na copy do aprendiz:** “prática”, “folha de exercício”, “tente novamente”;
  IDs internos (AID-*) e pins ficam apenas nesta nota técnica.
- **Fronteiras honradas:** sem site publicado/deploy/merge/CI manual, sem runtime/catálogo/bindings/
  permissões/modelo/credencial/instalação, sem dados reais (tudo sintético/fictício), nada é salvo
  pelo HTML.

## Nota técnica (procedência e fronteira)

- Aprovado: AID-3669 (PO). Fluxo: UX produtor → revisão de conteúdo do Content Designer → aceite
  visual do System Designer, antes da admissão. Dedup nativa por “catalogo-preview” = zero resultados
  (2026-10-01 20:54) + re-leitura independente sem equivalente; `docs/learner-downloads/` não existe
  na base.
- Base de ramificação declarada: `main` = `86fca77987408ff85d8050cb2d87ded48a7e49b0` (worktree
  isolada; diff efetivo do PR = apenas este diretório novo, sem herança alheia).
- Fontes por pins (imutáveis, somente leitura): PR #643 @ `32888d9f`, PR #646 @ `f7e3228a`,
  PR #645 @ `b028652d`, PR #644 @ `fb8b4fe7`; identidade visual SDLCQuest PR #614 @ `7c72a4a1`
  (contrato `_work-products/AID-3458/fatia1/01-tokens-e-identidade.md`). Nenhuma fonte modificada.
- Verificação registrada no issue (headless Chromium, sem alegar dispositivo/leitor físico não
  testado): navegação por teclado e ordem de foco, foco visível, HTML semântico + equivalente
  textual, legibilidade e não-overflow em 320/375/1280, funções em estado indisponível inertes,
  capturas reais dos três viewports.
- Autoria/execução: UX Designer de Aprendizagem, agente `0bfa47c1-099a-42a1-99a5-7d7b0a380ba9`.
