# AID-3458 — Fatia 1 · Critérios de aceite + plano de verificação

Data: 2026-09-30 · Autor: UX Designer de Aprendizagem · **Aceite: System Designer** (revisor designado na política da issue) · QA valida no RC-5 (não é auditoria WCAG concluída).

Entregável da fatia: artefatos 01–03 (contrato de tokens, mapa de atrito + spec, protótipo limitado). Implementação no Learner App/OS só via pai AID-3453 (PR draft + revisão independente). Sem deploy.

## 1. Critérios de aceite da fatia (testáveis)

### Identidade (sem novo sistema)
- **AC1** Todos os tokens visuais do protótipo (`--paper #f5f3ec`, `--card #fffef9`, `--ink #172935`, `--muted #4c6057`, `--line #d9ded5`, `--deep #101d28`, `--mint #a7e6cd`, `--mint-dark #195d4b`, `--gold #e8c888`, `--coral #b64c36`, raios 18/10/9px, foco 3px `#12624c` offset 3px) coincidem 1:1 com `engines/sdlc-quest/src/style.css`. **Verificação:** diff contra o contrato 01 (feito na construção; System Designer confere por amostragem).
- **AC2** Georgia itálica aparece exclusivamente no `<em>` do título; fontes sans/mono idênticas às do jogo. **Verificação:** inspeção computada (verificação executada: ok) + revisão.
- **AC3** Zero assets novos obrigatórios; mapa é Canvas 2D papel/menta/ilhas desenhado em código. **Verificação:** arquivo único sem dependências externas (executado via `file://`).

### Entrada clara e jornadas
- **AC4** Existe UMA ação primária visível no primeiro paint ("Começar F1"); banners/prática avançada (TLC/gates/jogos) aparecem DEPOIS do CTA e sem contadores no primeiro paint. **Verificação:** ordem DOM + geometria (executado: ok; corrige A1/A2).
- **AC5** Um único contador primário ("Fundamentos 0/4") na entrada; contadores de jogo (18/16/6) só dentro de "Prática opcional". **Verificação:** varredura de contadores no primeiro paint (executado: ok; corrige A1).
- **AC6** Zero jargão OS/admin na entrada (sem "desktop/dock/janela/terminal/admin"). **Verificação:** busca lexical no HTML (executado: ok) + revisão.
- **AC7** Duas jornadas apresentadas como cartões irmãos partindo dos mesmos F1–F4; nenhum pré-requisito aponta para jogo. **Verificação:** revisão da spec + inspeção (executado: ok; corrige A3/A10).

### Loop da lição
- **AC8** A primeira lição implementa `exemplo acompanhado → tentativa → feedback explicativo → retry → takeaway`, nesta ordem, com feedback que cita o princípio violado (nunca só "errado"). **Verificação:** roteiro interativo (executado: ok).
- **AC9** Concluir F1 atualiza 0/4→1/4, desbloqueia F2 (nó + seta acesa) e emite toast `aria-live`. **Verificação:** executado: ok.

### Acessibilidade (nasce com ela; QA confere ao vivo)
- **AC10** Skip link presente e funcional; foco visível com o token do jogo em todos os focáveis; tudo operável por teclado (diálogo nativo, opções, trilha). **Verificação:** executado: ok (outline `rgb(18,98,76)`); QA valida leitor de tela no RC-5.
- **AC11** Alternativa textual ao mapa sempre disponível ("Versão em texto do mapa", 3 destinos navegáveis) + `role="img"` com rótulo no canvas; rótulos desenhados ≥ 15px equivalentes. **Verificação:** executado: ok; tamanho percebido a validar ao vivo (H).
- **AC12** `prefers-reduced-motion` desliga animações/transições, e o mapa tem botão "pausar cenário". **Verificação:** regra presente (executado); comportamento ao vivo com QA.
- **AC13** Breakpoint 630px: coluna única, setas rotacionadas, sem rolagem aninhada (uma região de rolagem por contêiner). **Verificação:** executado em 390px (ok); **validação ao vivo pendente (H)** — não é claim de auditoria.

### Contratos e limites
- **AC14** Protótipo 100% local/demonstrativo: não escreve estado canônico, não marca mastery, sem rede, sem deploy. Preserva AID-1222 (gate) e piloto AID-641/909; sem recrutamento. **Verificação:** revisão de código (sem fetch/storage de rede) + nota visível no rodapé.

## 2. Plano de verificação executado (evidência)

Roteiro `verify-prototipo.js` (Playwright, Chromium headless, `file://`): 17 checagens — skip link; contador único 0→1/4; ordem CTA→prática; alternativa textual com 3 links; 3 setas na trilha; diálogo abre; feedback errado explica princípio + retry visível; feedback correto; takeaway; F2 desbloqueada; diálogo fecha; foco visível por teclado; regra reduced-motion; coluna única em 390px. **Resultado: 17/17 ok, 0 erros de console** (2026-09-30). Screenshots: `aid3458_desktop.png`, `aid3458_mobile.png` (evidência visual para revisão humana — não auto-avaliação estética).

## 3. Pendências honestas (não bloqueiam a fatia)

- Breakpoint 630 e leitor de tela: validação ao vivo pela QA (RC-5) — hipóteses, não claims.
- IDs finais F1–F4/D*: dependem do PR #610 (usar rótulos até lá).
- Mentor/rolagem aninhada (A6): fora desta fatia; medir em teste de usabilidade antes de redesenhar.
- Mapa do protótipo é simplificado (3 ilhas) — o cenário completo do jogo é preservado, não substituído.
