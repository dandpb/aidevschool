<!-- issue: AID-2020 | key: status-summary | doc_id: 2b41d45e-48e8-4014-9b55-7ae850d8587b | updated: 2026-09-15 16:58:53.417+00 -->

# Relatório de produto — funcionalidades e próximos passos (2026-09-15)

(AID-2020)

# Relatório de produto — AiDevSchool (2026-09-15)

## Em que momento estamos

**MVP público, deploy contínuo, prontidão de jornada verificada — agora na fase de crescimento e validação com usuários reais (onda O1).** O produto vive em 2 superfícies públicas, com 9 corredores de uso classificados `customer-ready` por avaliação independente (matriz de 2026-09-14, revalidar até 2026-10-14). Instrumentação, telemetria e funil anonimizado estão no ar com export comprovado E2E. O gargalo atual **não é produto: é tráfego** (6+3 sessões reais até 09-12), por isso a prioridade do momento é o teste moderado O1 com 5–8 devs. Ainda não temos: contas/backend (tudo é local-first no navegador), trilhas Dev 01–18 revalidadas (prontidão `stale`) e monetização.

## Funcionalidades existentes (todas verificáveis por link)

### Superfícies públicas (deploy contínuo, main verde, 0 PRs abertos)

| Funcionalidade | O que faz | Status | Link |
|---|---|---|---|
| **LiteracyDojo** | Microlearning de IA para não-programadores: 14 missões práticas, mundo voxel, mapa, lição guiada, gamificação local-first, PWA; a11y do onboarding aprovada (NVDA/VoiceOver, tripla evidência) | customer-ready (1ª lição + corredor mód. 1–3) | https://aidevschool-literacydojo.netlify.app |
| **CodexDojo OS (hub)** | Desktop educacional: escolha de trilha, missões hospedadas, catálogo de apps, mentor local, estado de retorno no mesmo dispositivo | customer-ready (3 casos de uso) | https://aidevschool-codexdojo-os.netlify.app |
| **IA Prática cap. 21–23 (W1)** | Onda de conteúdo para o público não-tech dentro do hub | promovida | https://aidevschool-codexdojo-os.netlify.app/apps/ai-pratica |
| **OS Literacy / Literacy same-origin** | Missão de alfabetização em IA hospedada no hub + corredor same-origin | customer-ready | /apps/os-literacy · /apps/literacy |
| **dojoToday** | "Lição de hoje" para programadores: revisões FSRS, streak, unidade ativa (read-only) | customer-ready | https://aidevschool-codexdojo-os.netlify.app/apps/dojotoday/ |
| **Trilha Dev l27–l29 (O1)** | Superfície do teste moderado (trilho guiado de 3 missões, pin `7653822`) | QA GO | dentro do hub OS |
| **PixelQuest (pixelDojo)** | Jogo 8-bit de ensino: encontro documentado emite evidência NDJSON para o verificador independente | customer-ready (evidence encounter) | local (`pnpm --filter pixel-quest dev`) |
| **voxelDojo** | Simulações 3D de ensino; loop determinístico por jogo | customer-ready (loop standalone) | local |
| **miniTown** | Exploração cozy Nível 0, sem promessa de progressão | experimental (por design) | local |

### Plataforma e qualidade (por trás do produto)

| Funcionalidade | Status |
|---|---|
| Instrumentação F1/F2 + telemetria + funil anonimizado | No ar; export E2E comprovado (funil honesto 0/0/0/0/0 — sem tráfego ainda) |
| SDLC AI-native (intent→spec→plan→build→verify→review→ship) | Auditado **CONFORME** (2 auditorias em 09-12); sweep diário ativo (AID-1695) |
| CI bloqueante nas superfícies primárias | Ativo; main verde, 0 PRs abertos |
| Currículo compartilhado (19 entradas: 00 IA Prática + 18 projetos) | `01_rate_limiter` e `02_key_value_store` implementados com evidência executável (caveat Node-only em benchmark); `00` e `03–18` scaffolded (verificação pendente) |
| Substrate do learner (`python3 -m learner.substrate`) | Regenera todas as views derivadas; gate de drift canônico no CI |

## O que está rodando agora (frentes ativas)

1. **O1 — crescimento (prioridade #1):** funil n=5–8 devs até ~09-23 (AID-909, G&R) + teste moderado UX (AID-641). Despacho físico do Canal 2 aguarda a **conta TabNews mínima (AID-1503)** — único item no caminho crítico, depende de e-mail/credencial sua.
2. **Janela 21d O3-C1:** consolidação pós-promoção; saída com gate em **09-23 17:16Z** (AID-1120 backstop automático; zero P1/P2 até aqui).
3. **Governança SDLC:** diretiva de auditoria v2/v3 em ratificação (AID-1607/AID-2003); check vendor paperclip#13155 em 09-17 (AID-1290).
4. **Conteúdo data-gated:** W2 dev l33–l35 (AID-1222) só abre com gate de dados §5-R4.

## Próximos passos

### Esta semana (datado)
- **09-16 12:00Z** — checkpoint AID-1348: decisão de deslize da janela O1 (~09-23 governa; 09-30 só fallback pré-autorizado); deadline das suas intros (Canal 1).
- **09-17 12:00Z** — checagem vendor paperclipai/paperclip#13155 (defeitos W0/W1/W4).
- **09-18** — 1ª sessão moderada O1 (UX; handoff G&R→UX same-day).
- **~09-20** — meta: 5–8 devs agendados.
- **09-23** — meta: 5–8 sessões completas + saída da janela 21d O3-C1 (gate 17:16Z automático).

### Próximas 2 semanas
- **09-24→26** — síntese O1 por cotas → decisão de próximas ondas (baseada em evidência, não em opinião).
- **Até 10-14** — revalidar a matriz de prontidão (9 casos `customer-ready` expiram).
- Reavaliação da prontidão Dev (currículo 01–18 está `stale` — não é claim customer-ready hoje).
- Despacho T1-G via TabNews assim que a conta existir (AID-1503 → AID-909).

### Depois (estrutural)
- W2 dev l33–l35 quando o gate de dados abrir (AID-1222).
- Verificação de catálogo dos projetos 03–18 (hoje scaffolded).
- Decisão de contas/backend só depois da síntese O1 (hoje local-first é princípio, não limitação acidental).

## O que depende de você (founder)

1. **TabNews (AID-1503):** e-mail/credencial para a conta mínima — **único item no caminho crítico do funil**; sem ele o Canal 2 não despacha.
2. Card E2 `ff7d1547` (janela 21d, opcional — backstop executa sozinho em 09-23).
3. Card de higiene `c810e371` (6 asks administrativos, não crítico).
4. 1 click para cancelar o card umbrella `3b0f555e` (destrava 2 fechamentos clericais travados pelo defeito W6 da plataforma).

---
*Fontes: matriz `docs/product-readiness/README.md` (2026-09-14), `curriculum/BACKLOG_STATUS.md`, board Paperclip (AID-909/641/1120/1222/1290/1348/1503/1607/1697/2003), resumo anterior AID-1502 (2026-09-12). Links HTTP 200 verificados em 09-12; revalidação da matriz vence 10-14.*
