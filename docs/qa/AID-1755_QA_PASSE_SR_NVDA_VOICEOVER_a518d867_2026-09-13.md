# AID-1755 — Método do passe real de leitor de tela (NVDA+Firefox / VoiceOver) no main atual `a518d867`

Data: 2026-09-13 UTC (método preparado por LAAE; **passe físico é founder-side**)
Pin verificado: `main` = `a518d867688540bd04eb82c6aa0c4d0affda2a61` (merge PR #392, onda r3 — baseline axe congelada).
Escopo: app standalone `engines/literacyDojo/` (Vila Lume), 5 telas core do funnel — onboarding, mapa, lição+feedback, resultado, progresso.

Este documento segue o método da re-execução AID-264 (`docs/qa/AID-264_QA_ACESSIBILIDADE_PILOTO_REEXEC_61b85535_2026-08-28.md`): pin declarado e verificável, ambiente declarado, veredito por superfície com critério explícito, evidência registrada, limitações declaradas. A diferença: AID-264 mediu com proxy automatizado (árvore computada + live regions + MutationObserver) e **recomendou explicitamente 1 passe NVDA+Firefox antes do GO final** — este documento é o kit executável desse passe. O card de agendamento do founder só existe se o carrier decidir (não criar por padrão).

## 1. Por que um passe físico é necessário (o que o proxy não cobre)

O proxy automatizado existente prova, no DOM computado: semântica (axe WCAG A/AA), live regions presentes (`role=status`/`alert`), refocus (`document.activeElement`) e outline de foco visível. **Não prova**: o que de fato é falado, ordem/inteligibilidade da fala, sobreposição ou engolimento de anúncio no evento de foco, comportamento de forms mode, e verbetes do leitor para os widgets. Só o passe físico com NVDA e VoiceOver cobre isso (Limitação #1 da AID-264, herdada).

## 2. Ambiente do passe (declarar no recibo do founder)

| Item | NVDA | VoiceOver |
| --- | --- | --- |
| Leitor | NVDA (última estável) | VoiceOver do macOS (Cmd+F5) |
| Navegador | Firefox (última estável) | Safari (padrão VO; Firefox-mac opcional como extra) |
| App | `http://localhost:4173` (dev server, §3) | idem |
| Estado | perfil limpo (onboarding) + funnel completo até progresso | idem |
| Áudio | fones ou caixa de som; taxa padrão | idem |

## 3. Setup executável (uma vez, ~3 min)

```bash
git clone https://github.com/dandpb/aidevschool && cd aidevschool
git checkout a518d867   # pin deste método
cd engines/literacyDojo
npm ci && npm run gen:content
npm run dev -- --port 4173
# abrir http://localhost:4173 no navegador do passe
```

Estado limpo por passe: DevTools → Application → Storage → "Clear site data" (apaga o progresso IndexedDB e devolve o onboarding). O funnel é linear: onboarding (5 etapas) → mapa → Mapa Inicial (lição com feedback) → resultado → progresso (home → "Ver progresso").

## 4. Checklist por tela — 2 minutos por tela, veredito PASS/FAIL por item

Veredito de tela = GO só se todos os itens [obrigatórios] passarem. Registrar observação textual por item falhando (o que foi falado vs. o esperado). Atalhos usados no checklist: NVDA `↓/↑` próximo/anterior, `Tab`/`Shift+Tab`, `Insert+Espaço` alterna browse/focus, `Insert+F7` lista de elementos; VO `→/←` próximo/anterior, `Ctrl+Option+Cmd+H` lista de cabeçalhos, `VO+Barra` interagir.

### 4.1 Onboarding (5 etapas) — ~2 min

- [obrigatório] Ao avançar etapa (Continuar jornada), o NVDA/VO **anuncia a nova pergunta** (foco cai no h1) e em seguida ou junto **"Etapa N de 5"** — sem falar duas vezes a mesma coisa e sem engolir o contador.
- [obrigatório] Cada etapa anuncia o radiogroup com a pergunta como label; as opções leem rótulo + estado (selecionado/não selecionado).
- [obrigatório] "Voltar" reposiciona a leitura na pergunta anterior com o contador regressando ("Etapa N-1 de 5").
- [desejável] O outline de foco do título é visível (confirma teclado+sighted parity).

### 4.2 Mapa da trilha — ~2 min

- [obrigatório] Ao entrar no mapa, a leitura começa pelo título da tela (foco no h1) — não fica mudo nem preso no botão anterior.
- [obrigatório] Os nós de lição leem como botões/link com nome da lição **e estado** (ex.: disponível/concluída/bloqueada); o nó do desafio (quando aplicável) é distinguível.
- [desejável] Navegação por cabeçalhos (Insert+F7 / VO lista de cabeçalhos) encontra o título da tela e as seções.

### 4.3 Lição + feedback (Mapa Inicial) — ~2 min

- [obrigatório] Na troca de atividade, o anúncio segue o padrão AID-1150: foco no h1 da nova instrução + contador de atividade em live region — pergunta e passo anunciados sem sobreposição.
- [obrigatório] Após "Verificar resposta", o **feedback é anunciado** (painel de feedback live region) dizendo acerto/erro — não fica mudo.
- [obrigatório] "Pedir dica" adiciona a dica ao DOM **e ela é anunciada**; em erro, "Tentar novamente" limpa e reposiciona a leitura na instrução.
- [desejável] Em modo focus/forms os radios da atividade operam com as setas.

### 4.4 Resultado — ~2 min

- [obrigatório] Ao concluir a lição, a leitura começa pelo título do resultado (foco no h1), não fica mudo na troca de tela.
- [obrigatório] Nota/pontuação e resumo são legíveis na ordem; botões seguintes ("Ir para o mapa"/próxima lição) são alcançáveis por Tab e anunciados pelo nome.
- [desejável] Conquistas novas (se houver) são anunciadas ou pelo menos descobríveis na ordem de leitura.

### 4.5 Progresso — ~2 min

- [obrigatório] Ao entrar pela home ("Ver progresso"), a leitura começa em "Seu progresso" (foco no h1 — contrato T3/PR #399).
- [obrigatório] "Baixar backup JSON" e "Restaurar backup" anunciam o resultado via mensagem de status (sucesso **e** erro — testar import de arquivo inválido p/ ouvir o `role=alert`).
- [obrigatório] Listas de conquistas/habilidades/revisões leem item a item com estado (🏆/🔒 distinguidos por texto, não só emoji).
- [desejável] O botão "Revisar" de revisão vencida é alcançável e anunciado com o nome da habilidade.

## 5. Proxy automatizado do que é mecanizável (roda antes do passe)

Rodar no pin pós-merge do PR #399 — `main` = `f22bb323` (merge #399, 2026-09-13 18:29Z): o `refocus-a11y.spec.ts` entra com o #399 e não existe no pin original `a518d867` deste método — nele o filtro roda sem match (comando cai para 4 arquivos) e a cobertura refocus ficaria silenciosamente de fora (ressalva MÉDIA da QA, PR #401 comment 5654746099). Os demais 4 specs existem em ambos os pins. Se qualquer item falhar, registrar como defeito e tratar antes do passe físico (não é supressão):

```bash
cd engines/literacyDojo && npm ci && npm run gen:content
npx playwright test a11y-axe-smoke.spec.ts onboarding-a11y.spec.ts refocus-a11y.spec.ts a11y-w3-forced-colors.spec.ts reflow-320.spec.ts --project=app
```

| Proxy mecanizado | Espec | Cobertura |
| --- | --- | --- |
| Scanner axe WCAG 2.0/2.1 A+AA por tela + ratchet de baseline | `playwright/a11y-axe-smoke.spec.ts` (AID-1739, T1) | semântica/violações por tela; baseline congelada `a11y-axe-baseline.json` |
| Anúncio de etapa do onboarding (activeElement + role=status + outline) | `playwright/onboarding-a11y.spec.ts` (AID-1150) | refocus/announce onboarding |
| Refocus/anúncio Checkpoint + Progresso | `playwright/refocus-a11y.spec.ts` (AID-1755/T3, PR #399) | contador "Atividade N de M" em live region + foco no h1 |
| Forced colors (Windows Alto contraste) | `playwright/a11y-w3-forced-colors.spec.ts` | legibilidade sem cor custom |
| Reflow @320 (proxy zoom 400%) | `playwright/reflow-320.spec.ts` | sem scroll horizontal essencial |
| Refocus ErrorRecovery (boot quebrado) | `tests/app/screenRefocusAnnounce.test.tsx` (unit) | h1 focado + role=alert na montagem |

## 6. Formato do recibo do passe (founder)

Reproduzir a tabela por tela com veredito por item + observação; declarar versões (NVDA/Firefox/macOS/VO) e o pin efetivamente testado. Descoberta de defeito → issue nova com passo-a-passo e o que foi falado vs. esperado (nunca editar a baseline axe para calar).

## 7. Limitações (declaradas)

1. O passe físico cobre fala/ordem/inteligibilidade — não substitui usuários reais de leitor de tela; amostra de 1 pessoa por leitor.
2. VO testado em Safari (padrão); Firefox-mac é extra opcional.
3. Zoom 400% aproximado por viewport 320px no proxy; o passe físico pode complementar com zoom real do navegador.
4. O checklist cobre o funnel feliz + caminhos de erro listados; não cobre missão hospedada no OS (superfície do host, fora do escopo AID-1755).

## Disposição

- Método + checklist executável (2-min/tela) + proxy automatizado: **prontos neste documento** (T2 da onda 2, carrier AID-1714/r7-A).
- O passe físico é founder-side: **card de agendamento só se o carrier decidir** (instrução explícita do carrier — não criar por padrão).
- Defeitos encontrados no passe entram como issues com dono, na ordem T-onde-caber (mesma regra da baseline axe AID-1739).
