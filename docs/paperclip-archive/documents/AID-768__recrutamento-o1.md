<!-- issue: AID-768 | key: recrutamento-o1 | doc_id: 3fb7a6f0-244b-43e8-8a02-cf509d3ed003 | updated: 2026-09-10 21:21:31.181+00 -->

# recrutamento-o1

(AID-768)

# AID-768 — Recrutamento do teste moderado O1 (l27–l29)

Ordem **AID-767/A** (via AID-768, 04/Sep). Issue-mãe de execução: **AID-641** (docs `execucao-kit` rev `c4440650` e `sintese` rev `ea76c9b5`). Kit de origem: AID-639 (`teste-moderado-o1`, work product `be106669`).

## 0. DECISÃO DO FOUNDER — card consolidado `c2cd1381` (AID-890, respondido 2026-09-06T10:45:24Z; aplicado via ordem AID-890/B → AID-895)
- **q1-o1-janela → (a) estender-0923**: conclusão das sessões O1 estendida para **~09-23** (alinhada ao d+21 do O3-C1). n=5–8 e cotas de composição (§3) preservados.
- **q2-o1-canal → (a) founder-network**: recrutamento pela **rede do founder** — ele envia o convite pronto a devs que usam IA ≥1×/semana. Kit pronto para envio republicado em **AID-895** (comentário único copiável).
- Cards antigos `cf8b749c` (ask_user_questions) e `a3d01a76` (request_confirmation, janela-estendida) na AID-641: **superseded por `c2cd1381`** — cancelados com reason de supersessão (registro no comentário da AID-641).
- ~~**Intake `42e6116b` (nesta issue) permanece ABERTO** como caminho de indicações/screening e encaminhamento~~ → **EXPIROU 2026-09-10T15:41:57Z** (verificado first-hand, watchdog 31ffcdeb rodada 3). Substituído operacionalmente pelo thread **AID-909** + cards `feb9d13c`/`12b3bdaa` (resposta do founder acorda G&R, dona do funil — tracker AID-909).

## 1. Gates verificados first-hand (2026-09-04, esta run)
- **QA GO wave-level AID-631: SATISFEITO** — veredito GO 09-02 13:40Z, issue `done` 14:16:06Z. Pin do GO: `7653822`, deploy `6a9816a506dee943d5e6ec25`, alias `aidevschool-codexdojo-os.netlify.app`, `contentVersion 2026-09-02.2`. **Recrutamento liberado** (desde 09-02 17:10Z).
- **Gate de sessões AID-764: FECHADO `done` 03:34:29Z (2026-09-04)** — countersign v28 (AID-766 `done` 03:28Z) → PR #265 merged @ `9a7d840` → README live `pass`/`validated-journey` → recibo QA pós-merge GO (AID-772 `done` 03:39Z) → fechamento CEO/FPE (comentário 1982f6fc). **SESSÕES COM LEARNER LIBERADAS desde 03:34Z** (relay AID-776/AID-777).
- Consequência de superfície — **RESOLVIDA 09-04 (AID-777)**: pin do GO (`7653822`) ≠ pin vigente (`4c2aeb7`, promoção O3-C1; main HEAD `54a741d` adicional é docs-only). Regra de re-pin do runbook §0 **APLICADA**: produção vigente = pin `4c2aeb7` / deploy `6a9859d1b3f3fda747dbe1ff` / manifesto `c4a1e9b4…` (verificado first-hand no alias); l27–l29 com **0 arquivos alterados** entre os pins (git diff); sanity session de moderador executada 2× — onboarding Dev → l27→l28→l29 completas, veredito PASS no host, 0 erros de console. `deploy_id` a registrar em TODO scorecard: `6a9859d1b3f3fda747dbe1ff`.
- **Re-pin C1 09-04 (AID-821 → AID-822):** promoção única ONDA C1 (l15–l17 v2) executada **entre sessões** (janela livre — 0 agendadas; publicada 20:15:43Z) ⇒ produção vigente = pin `ef67fb06be7d8eb6ff3fe8d16e9c65024d4ac118` / deploy `6a9b26edd5ae30f604729704` / manifesto `1f79089d…` / `contentVersion 2026-09-04.1`. §0 pós-re-pin aplicado (AID-822): §0.a diff 0 arquivos em l21/l22/l27–l29 (AID-821), **sanity de moderador 21/21 PASS** (missões l27–l29 com veredito PASS do verificador independente no host; aquecimento /hub //map //progress sem expor l15–l17). **`deploy_id` a registrar em TODO scorecard a partir de agora: `6a9b26edd5ae30f604729704`** (anotar deploy id por sessão; `6a9859d1…` acima é histórico).
- **Re-pin 09-10 (watchdog 31ffcdeb rodada 3):** pin vigente passou para **`e41b9b93`** (vs `ef67fb06` do runbook `execucao-kit`). Zero sessões até aqui ⇒ nada vencido, mas **sanity §0 deve ser re-executado no pin vigente ANTES da sessão 1** (protocolo §4: re-pin entre sessões → sanity antes da próxima) e o `deploy_id` re-registrado por sessão.

## 2. Ordem da CEO e postura de execução
- **INICIAR recrutamento AGORA** (n=5–8 devs) — não esperar o override do founder.
- ~~Interação `cf8b749c` (AID-641) permanece aberta como caminho de override~~ → **RESOLVIDA PELA DECISÃO DO FOUNDER** (`c2cd1381`, 09-06 10:45Z): canal e janela DECIDIDOS (ver §0).
- **Padrões VIGENTES (decisão do founder, não mais default na ausência de override):**
  - Canal: **rede do founder** (único canal ativo — o founder envia o kit pronto, republicado na AID-895, a devs que usam IA ≥1×/semana); comunidades dev BR ficam como alternativa declarada no runbook §1 apenas se o founder pedir; coorte AID-180 apenas se recontatável pelo protocolo original.
  - Janela: **ESTENDIDA — sessões concluídas até ~09-23** (d+21 do O3-C1; decisão q1 `c2cd1381`); 2–3 sessões/semana.
  - Incentivo: **nenhum** (padrão do kit; se o founder oferecer, declarar no termo de consentimento ANTES das sessões).
- Contatos acontecem fora do git (padrão AID-180); este issue concentra pedidos de indicações e o intake de screening.

## 3. Composição-alvo (n=5–8) e exclusões
- ≥2 **continuistas**: trilha dev até l23 no OS.
- ≥2 **novatos na plataforma** com conhecimento equivalente l21/l22 (aquecimento autoguiado de 10 min antes da sessão).
- 1 **flexível** de papel adjacente (QA/analista que lê código).
- **Excluídos:** contribuidores do repo, autores/validadores de l27–l29, decisores de conteúdo.

## 4. Screening (3 perguntas + contato; sem PII além do contato; deletado após a síntese — LGPD mínimo)
1. Você escreve código profissionalmente (ou em primeira função/transição)? Qual papel? (dev / dev em transição / adjacente-QA-analista)
2. Com que frequência usa assistentes de IA no trabalho? (diária / ≥1× semana / raramente / nunca) — e: já revisou sugestão de código de assistente? sabe o que é um teste automatizado? (equivalência l21/l22 p/ novatos)
3. Já usou o AiDevSchool? (nunca / sim — até qual lição da trilha dev?) + disponibilidade (janelas de 60 min) + contato.

Consentimento por escrito (padrão **AID-142**) antes de cada sessão; sessões de 45–60 min, screen+áudio, sem câmera, anônimas na publicação.

## 5. Funil de recrutamento (snapshot — tracker vivo mudou para AID-909)
> **Update 09-10:** o funil passou a ser trackeado pela G&R no thread **AID-909** (rev 19, hb17 — 0/0/0/0/0). A tabela abaixo é snapshot histórico desta lane; atualização por heartbeat acontece lá.

| Estágio | Contagem | Registro |
|---|---|---|
| Indicações recebidas | 0 | — |
| Contatados | 0 | — |
| Screening aprovado | 0 | — |
| Consentimento + agendado | 0 | — |
| Sessões executadas | 0/5–8 | **gate AID-764 fechado (03:34Z) — sessões liberadas; sanity §0 OK** |

Scorecards anonimizados P1…Pn em research storage restrito (fora do git); matriz e cotas (i)–(iv) no doc `sintese` da AID-641.

## 6. Risco de janela e tripwires
- ~~GO 09-02 13:40Z → conclusão ≤09-16 (janela A)~~ → **JANELA ESTENDIDA POR DECISÃO DO FOUNDER (`c2cd1381` q1, 09-06 10:45Z): conclusão das sessões até ~09-23** (d+21 do O3-C1). O risco declarado em 09-05 (comentário 12:06Z, passo 2 do protocolo AID-785: janela A em risco por ausência de indicações, funil 0/0/0/0, intake ~33h pendente) foi **resolvido pela decisão do founder** — a rota "estender" do card `a3d01a76` foi a aceita.
- **Tripwire recalculado para a nova janela:** com conclusão ~09-23 e 2–3 sessões/semana, o 1º participante precisa estar em screening até **~09-11** e o último agendado até **~09-16**; se isso não ocorrer, declarar risco no doc `sintese` da AID-641 (sem presumir nova decisão do founder). **Dono first-class do tripwire ~09-11 (update 09-10): CHECK AID-1237 (CEO) em 09-11 12:00Z — desliza datas ou escala.**
- Tripwires de sessão inalterados (runbook AID-641): <80% em cota → issue de retrabalho da lição ANTES de l30+ travar; abandono → causa-raiz antes do próximo participante; a11y → QA no mesmo dia.

### 6.1 Coordenação de janela de deploy (condição do pré-desbloqueio C1 — veredito AID-804, 09-04)
- **O caminho do instrumento O1 NÃO atravessa nem expõe dev ch 4–6 (l15–l17)** — verificado superfície por superfície (AID-804: screening, sessão A/B, aquecimento de navegação, missões l27–l29, aquecimento novatos l21/l22, pré-reqs transitivos, interior da missão hosted, continuidade, conteúdo, aviso S2, Hub).
- Um eventual dispatch C1 (proposta AID-792 rev 2 §3, escolha do board via gate `8a2bd372`) fica **pré-desbloqueado, condicionado à coordenação de janela de deploy**: implantar **somente entre sessões agendadas, nunca durante** (45–60 min cada); pós-re-pin aplicam as regras §0 (git diff 0 arquivos em l21/l22/l27–l29 + 1 sanity de moderador + re-registro do `deploy_id` nos scorecards).
- **Dona do calendário de sessões: UX Designer (moderador), via AID-641** (intake AID-768 expirou 09-10 — indicações agora via thread AID-909/G&R). Hoje 0 sessões agendadas (funil 0/0/0/0/0) → janela de deploy naturalmente livre; estreita no primeiro participante agendado. Pin vigente: **`e41b9b93` (update 09-10; sanity §0 pendente pré-sessão-1)** — histórico: `ef67fb06`/`6a9b26ed` (promoção C1 09-04 20:15Z — AID-821/822, sanity 21/21 PASS); `4c2aeb7`/`6a9859d1` (elegível de rollback).

## 7. Caminhos vivos (update 09-10)
- ~~**Intake de indicações/screening:** interação `42e6116b` nesta issue (wake_assignee) — PERMANECE ABERTO~~ → **EXPIRADO 09-10 15:41:57Z**; substituído pelo thread **AID-909** (funil/indicações, dona G&R, tracker rev 19) + cards `feb9d13c`/`12b3bdaa` (ação de 30s do founder: colar lista de 5–8 devs nome+canal OU responder o card; 2 entregas anteriores chegaram vazias — `9fd50b19`/AID-1113; descarte exige confirmação explícita do founder).
- **Canal ativo (decidido):** rede do founder — kit pronto para envio (convite + 3 perguntas de screening + termo de consentimento) republicado em **AID-895** para o founder copiar e enviar.
- **Bloqueio nomeado (humano):** founder colar a lista no thread AID-909 ou responder o card `feb9d13c` (pedido por G&R 15:32Z em resposta ao comentário do board `de506f3e`).
- **Watchdog `31ffcdeb`** ativo na AID-641 (tripwires de parada da subárvore); **CHECK AID-1237 (CEO)** em 09-11 12:00Z dono do tripwire de janela; telemetria AID-913 `done` (condição de retomada 2 do relay AID-922 satisfeita — falta a 1: intros).
- ~~Override founder (canal/janela/incentivo): `cf8b749c` na AID-641 (pending)~~ → **superseded por `c2cd1381`** (respondido 09-06 10:45Z; cancelado com reason de supersessão).
- **Gate de sessões:** RESOLVIDO (AID-764 `done` 03:34Z) — agendamento liberado conforme participantes aprovam screening; janela estendida vigente (conclusão ~09-23).
