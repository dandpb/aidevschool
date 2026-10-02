# AID-3458 — Fatia 1 · Mapa de atrito priorizado + spec da superfície de entrada

Data: 2026-09-30 · Autor: UX Designer de Aprendizagem · Revisor de aceite: System Designer
Escopo: primeira fatia — **uma entrada clara, duas jornadas (IA no cotidiano · IA para Dev) e fundamentos compartilhados F1–F4**, reusando SDLCQuest v1.3. Sem deploy; contratos e progresso preservados.

## 1. Mapa de atrito priorizado (primeiro contato → seleção → primeira lição)

Evidência = revisão do CEO 2026-09-30 (comentário 478680b2) + inspeção da fonte canônica (`engines/sdlc-quest/index.html`, `src/style.css`, `src/app.js`). Classificação: **E** = evidência observada; **H** = hipótese a validar em teste; **P** = preferência (não bloqueia).

| # | Atrito | Evidência | Impacto no aluno | Correção na fatia 1 | Prioridade |
| --- | --- | --- | --- | --- | --- |
| A1 | Três contadores concorrentes no primeiro paint (`0/18` desafios + XP + `0/6` estações; banners somam `0/16` TLC) | `index.html` l.20–22 (`#progress-fraction`, `#xp`, `#bag-count`), banners l.21–22; `app.js` l.98 | Não sabe qual progresso importa; sobrecarga no primeiro contato | **Um** sinal primário: "Fundamentos 0/4". Contadores de jogo só dentro de "Prática opcional" | P0 |
| A2 | Banners avançados (TLC, laboratório com gates) aparecem **antes** do CTA | `index.html` l.21–22 antes do mapa/CTA | Iniciante vê conteúdo avançado antes de saber por onde começar | Ordem invertida: CTA → prática recomendada discreta **depois** | P0 |
| A3 | Sem uma entrada única da escola: cada engine é porta; jargão OS/admin afasta não-programadores | Decisão AID-3453 + revisão CEO | Fragmentação; não-programador não sabe onde entrar | Entrada única com escolha de jornada em linguagem de escola | P0 |
| A4 | Rótulos pequenos no canvas do mapa | revisão CEO (E) + `style.css` v1.0 mobile (corrigido parcialmente na v1.1 p/ DOM, não p/ canvas) | Estações ilegíveis ≈ mobile | Rótulos do canvas ≥ 13px equivalentes + **alternativa textual** sempre disponível | P1 |
| A5 | Alternativa textual ao mapa ausente/oculta na entrada | padrão `worldFallback` existe no jogo (E) mas não na entrada | Leitor de tela/teclado perde o mapa | `<details>` "Versão em texto do mapa" com lista ordenada + links | P1 |
| A6 | Rolagem aninhada / mentor lotado | revisão CEO (E) | Perde o lugar; fadiga | Fatia 1: diálogo de lição com topo sticky e UMA região de rolagem; mentor não entra nesta fatia (H: medir em teste) | P1 |
| A7 | Setas de progressão ausentes (ordem das etapas não óbvia) | revisão CEO (E) | Não sabe o que vem depois | Setas visíveis entre F1→F2→F3→F4 (DOM e canvas) | P1 |
| A8 | Acessibilidade de base (skip link, foco visível, teclado, contraste, reduced motion) | Existe no jogo v1.1 (E, `style.css` l.13, l.8) — validar na entrada | Exclusão se ausente | Nasce com todos (ver 04); breakpoint 630 validado ao vivo só na QA (H) | P1 |
| A9 | Loop de lição sem "exemplo trabalhado" antes da tentativa | revisão CEO (diretriz pedagógica) | Erro antes de aprender o padrão | Loop explícito: exemplo → tentativa → feedback explicativo → retry → takeaway | P0 |
| A10 | Jogos podem parecer obrigatórios (pré-requisito) | Decisão AID-3453: jogos = prática opcional | Barreira falsa | Nenhum pré-requisito aponta p/ jogo; jogos = "prática recomendada" | P0 |

## 2. Arquitetura da informação (entrada única)

```
Entrada (escola)
├─ Cabeçalho: marca + "Fundamentos 0/4" (único contador primário)
├─ Título: "Uma escola. Duas jornadas." (Georgia só no em)
├─ Mapa Canvas 2D (ilhas: Fundamentos → jornada Cotidiano · jornada Dev)
│   ├─ rótulos legíveis + setas de progressão
│   └─ "Versão em texto do mapa" (details, sempre acessível)
├─ Painel da etapa atual (F1 Entender IA) + CTA primário "Começar F1"
│   └─ nota: "Prática opcional: jogos" — DEPOIS do CTA, discreta
├── Trilha F1→F2→F3→F4 (nós com aria-current/bloqueado + setas)
├─ Escolha de jornada (2 cartões): IA no cotidiano · IA para Dev
│   └─ ambos partem dos mesmos fundamentos F1–F4
└─ Prática recomendada (opcional): SDLC Quest (18 desafios · 16 TLC · 6 gates)
    — contadores aqui dentro, fora do primeiro paint
```

Fundamentos (F1–F4; ids finais dependem do PR #610 — usar rótulos até lá):
**F1 Entender IA → F2 Uso seguro → F3 Prompt e contexto → F4 Verificação.**
Jornadas: **IA no cotidiano** (não-programadores) e **IA para Dev** (fundamentos/harness → intenção/spec/plano → construção → teste/debug/review → produto IA/evals → agentes → capstone — fora desta fatia, só a porta).

## 3. Loop da primeira lição (F1) — estados e feedback

`Exemplo acompanhado → Tentativa → Feedback explicativo → (retry) → Takeaway → Progresso`

| Estado | Regra |
| --- | --- |
| Exemplo acompanhado | `.lesson-primer` com caso resolvido + porquê da resposta correta |
| Tentativa | opções `.option` com `aria-pressed`; uma escolha por vez; "Confirmar" habilita |
| Feedback explicativo | nunca só "errado": explica qual princípio foi violado; `aria-live` |
| Retry | "Tentar de novo" reabre as opções (máx. conteúdo igual, sem punição); sem portão novo |
| Takeaway | frase curta "leve com você" + o que a próxima etapa destrava |
| Progresso | 0/4 → 1/4 no cabeçalho (único contador), toast, F2 destrava com seta acesa |
| Recuperação de erro | fechar/reabrir diálogo mantém estado da lição; Sem JS: mapa textual + trilha continuam navegáveis |

## 4. Fronteiras respeitadas nesta fatia

- Protótipo local: **não** escreve estado canônico do aluno, não marca mastery, não toca contratos/gates (AID-1222, AID-641/909 preservados; sem recrutamento).
- Implementação no Learner App/OS canônico somente via pai AID-3453, após aceite do System Designer — PR draft com revisão independente, sem deploy.
- Sem redesenho global especulativo; jogos permanecem opcionais e lições úteis são reaproveitadas (código curado pelas frentes CCE/CPE).
