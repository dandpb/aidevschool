<!-- issue: AID-1809 | key: ensaio-prep | doc_id: 0fc0f8bf-c842-4630-adb4-820aa97eb8ec | updated: 2026-09-14 04:14:17.938+00 -->

# AID-1809 — Ensaio a seco do kit de teste moderado O1 (PREP, sem participantes) — achados, tempos, recomendações e checklist pronto-para-GO

(AID-1809)

# AID-1809 — Ensaio a seco (dry-run) do kit de teste moderado O1 — PREP

**Status: PRONTO-PARA-GO.** Kit `teste-moderado-o1` (AID-639 Doc 1/3 + artifact `be106669`), runbook `execucao-kit` e esqueleto `sintese` (AID-641) ensaiados ponta a ponta **SEM nenhum contato com participantes** e **SEM editar o kit** (recomendações apenas, §5). Zero escrita canônica; nenhum gate/currículo/produção tocado; nenhuma síntese publicada (isso é a AID-641 pós-GO); analytics ≠ evidência.
**Owner:** UX Designer de Aprendizagem (0bfa47c1). **Despacho:** CEO AID-1808 → esta PREP O1.

## 0. Método (3 camadas, tudo first-hand em 2026-09-14)

1. **Verificação de superfície e materiais:** leitura completa do kit (doc `teste-moderado-o1` + anexo `a7e8460e` do artifact `be106669`), do runbook `execucao-kit` (AID-641), do esqueleto `sintese`, do bloco copiável founder (comentário `b062402a` da AID-895) e da produção vigente no alias `aidevschool-codexdojo-os.netlify.app` (rotas, catálogo, atividades, contrato de handshake) — leitura pública, sem escrita.
2. **Roleplay moderador↔participante simulado:** 2 personas **SIMULADAS** (P-S1 continuista; P-S2 novato com aquecimento l21/l22 feito) conduzidas pelo roteiro §3 A→F contra os materiais reais. Nenhuma pessoa real foi contatada; personas são exercício de mesa, rotuladas como tal.
3. **Modelo de tempos por etapa:** contagem de palavras dos blocos falados (130–150 ppm PT-BR) + tempos de carregamento medidos + estimativas das lições (4/5/4 min) × fator de primeira exposição (1,5–2,5) + transferências. Estimativa declarada, não medição de sessão real.

## 1. Verificação da superfície e materiais (2026-09-14)

| Verificação | Resultado |
| --- | --- |
| Rotas `/mission/dev/l27\|l28\|l29`, `/apps/literacydojo/`, home | **200 OK** todas; carregamento 0,07–0,16 s (sem atrito técnico de rede) |
| Missões no catálogo da produção | l27 "Debug com assistente: reproduza antes de perguntar" (4 min, prereq l21); l28 "Refatore com assistente sem quebrar comportamento" (5 min, prereq l21); l29 "Avalie as dependências sugeridas" (4 min, prereq l22) — **idêntico ao kit §4**; mod-05 com 9 lições ✓ |
| l27-a1 `sort` | 5 passos (reproduzir→isolar→pedir→corrigir→testar) ✓ |
| l27-a2 `prompt_builder` | 3 campos; campo Erro `mustIncludeAny` = erro/exception/stack/falha/trace — **exatamente como o kit cita**; feedback de falha explica o critério ✓ |
| l27-a3 `missing_context` | 6 opções = **3 obrigatórias + 1 opcional (versão/ambiente) + 2 distratores** ("modelo de IA", "print da tela inteira"); feedback por-check desfaz o mito ✓ (nota R5) |
| l28-a2 `rubric_review` | 4 critérios; vereditos esperados `partial` + 3×`not_met` ✓ (plano-isco "arquitetura nova… roda os testes no fim" confirmado) |
| l29-a1 multiSelect | 4 corretas (manutenção, licença, segurança, **alternativa nativa**) + 2 distratores ("nome fácil de digitar", "badges bonitos") ✓ |
| l29-a3 `missing_context` | obrigatórias manutenção/licença/segurança; opcional tamanho; distratores estrelas/ano-de-criação ✓ |
| Contrato host-engine | handshake `aidevschool.host-engine` 1.0, checagem de `contentVersion`, evidência `literacy-evidence` v1, veredito independente (`producer_writes_mastered: false`) — presente na produção ✓ |
| Referências de arquivo do kit | `chapter-continuity.smoke.spec.ts` (linha ~419 = lista de missões dev) e `dojo-verification-bridge.mjs` (~l.1463 = fail-close de `prompt_builder`) existem em `origin/main` — linhas citadas corroboradas com desvio ≤12 linhas (nota R7) |
| Documentos irmãos | `funil-op-b` e `sequencia-evidencia` existem na AID-639 ✓; esqueleto `sintese` (AID-641) operacionaliza as cotas (i)–(iv) ✓ |
| Bloco copiável founder (`b062402a`, AID-895) | convite + screening 3 perguntas + termo de consentimento íntegros e coerentes com o kit §7 ✓ |
| QA GO | AID-631 `done` (veredito GO 13:40Z 09-02, pin `7653822`; conteúdo l27–l29 inalterado até o pin vigente segundo runbook) ✓ |

## 2. Roleplay simulado — log resumido (P-S1/P-S2 são personas de mesa)

**P-S1 (continuista simulado):** encontrou a trilha dev no mapa em ~1,5 min; leu o rótulo do módulo como **"Dev: contexto e decisão"** (kit cita "contexto e decisão" → R3); l27 a1/a2 de primeira (colou mensagem real com "exception"); em a3 marcou também a **opcional** versão/ambiente → scorecard não tem campo para opcionais (R4/R5); l28-a2 aceitou "parcialmente atendido" sem perguntar; T27/T28/T29 respondidas em 8 min no total.
**P-S2 (novato simulado):** navegação até l27 em ~4 min (9 lições acumuladas em mod-05 exigiram scroll — citação simulada: "tem muita lição junto aqui"); em l27-a2 escreveu "caiu de madrugada de novo" → **falsa rejeição** pela checagem de palavra-chave (sem nenhuma das 5 palavras) — feedback explicou o critério e a 2ª tentativa passou (+3 min; percepção de justiça ficaria registrada); em l28-a2 perguntou ao moderador **"o que significa 'parcialmente atendido'?"** → roteiro não define resposta-padrão (R2); abriu hint em l28-a2 (contabilizado); sessão total simulada chegou a ~58 min com o incidente de falsa rejeição → sem regra de overrun (R1).

## 3. Modelo de tempos por etapa (estimativa média por sessão)

| Etapa | Kit | Dry-run (estimado) | Notas |
| --- | --- | --- | --- |
| A Abertura + consentimento (falado) | 5' | 4–6' | bloco de 111 palavras ≈ 45–50 s de fala + setup gravação/compartilhamento; termo escrito já assinado antes (async) |
| B Pré-entrevista | 5' | 4–6' | 3 perguntas + respostas |
| C Aquecimento observacional | 5' | 2–6' | continuista ~1,5–3'; novato 4–6' (scroll em mod-05) |
| D Missões + transferências | 25–35' | 19–25' fluente / 25–33' novato | missões 6–9' (l27), 7–11' (l28), 6–9' (l29) p/ 1ª exposição ×1,5–2,5; transferências 7–10' (T27 escrita 3–4'; T28 2–3'; T29 2–3'); falsa rejeição em l27-a2 soma +2–4' |
| E Pós-entrevista | 5' | 5–7' | 4 perguntas incl. 3 notas de confiança |
| F Fechamento | — | 1–2' | |
| **Total típico** | **45–60'** | **47–56' (mediana ~50')** | borda superior (novato lento + incidente) pode chegar a 60–65' → R1 |

**Trabalho async do moderador por participante (fora da sessão):** triagem de screening 8–12'; envio/confirmação de consentimento ~5'; preenchimento do scorecard pós-sessão 8–12'. Capacidade planejada de 2–3 sessões/semana é compatível.

## 4. Auditoria de atrito — achados priorizados (evidência → recomendação)

| ID | Achado | Evidência | Sev. | Recomendação (NÃO aplicada — kit intocado) |
| --- | --- | --- | --- | --- |
| R1 | Sem regra de overrun: roteiro não diz o que fazer se D passar de 35' ou a sessão de 60' | roleplay P-S2 chegou a ~58' com um incidente leve | **P1** | pré-registrar no cheat-sheet do moderador: sessão até 65' hard stop; missão incompleta vira "não-conclusão com causa=tempo" (alimenta cota (i) sem ambiguidade); nunca cortar transferências nem mudar ordem |
| R2 | Sem respostas-padrão para perguntas previsíveis ("o que significa parcialmente atendido?", "posso usar dica?", "quanto tempo falta?") — risco de intervenção inconsistente entre 5–8 sessões | roleplay P-S2; kit §3.D só cobre bloqueio técnico/pedido explícito | **P1** | cheat-sheet: (a) vocabulário de veredito → devolver com pergunta ("o que você acha que significa?"); (b) dica → "a decisão é sua; será contada"; (c) tempo → informar |
| R3 | Rótulo do módulo divergente: kit §3.C cita mod-05 "contexto e decisão"; produção exibe **"Dev: contexto e decisão"** (slug `05-dev-contexto-e-escolha`) | verificação 09-14 do catálogo na produção | P2 | cheat-sheet cita o rótulo exato da produção; citações RD6 devem transcrever o que está na tela |
| R4 | Scorecard sem campos para: tempo do aquecimento, citação RD6, expectativa pós-l23, opcionais marcados em a3 | roteiro §3.C pede essas capturas; template §3 do runbook não as tem | P2 | adicionar linhas ao template usado em execução (scorecard é instrumento do moderador, não kit canônico): `aquec: ___' | RD6: ___ | pós-l23: ___ | a3 opcionais: ___` |
| R5 | Kit §4 diz l27-a3 "6 opções/3 corretas"; produção = 3 obrigatórias + 1 opcional aceita + 2 distratores | verificação 09-14 | P2 | nota de cheat-sheet: marcar a opcional **não é erro** (avaliação aceita obrigatórias+opcional) |
| R6 | Termo de consentimento copiável não cita LGPD explicitamente nem higiene de tela (fechar apps pessoais / compartilhar só a janela) | leitura do bloco `b062402a`; kit §3.A menciona LGPD só no roteiro falado | P3 | na próxima republicação do bloco (se houver), adicionar 1 linha "Tratamento conforme LGPD" + instrução de compartilhar apenas a janela do navegador; **não** re-publicar só por isso (funil já em curso) |
| R7 | Citações de código com nº de linha fixo tendem a apodrecer | desvio de ≤12 linhas já observado em `dojo-verification-bridge.mjs:1463` | P3 | citar caminho+símbolo (`evaluateLiteracyActivity`/fail-close `prompt_builder`) em revisões futuras do kit |
| R8 | Screening Q3 agrupa 3 coisas (uso prévio + disponibilidade + contato) | leitura do formulário §1 do runbook | P3 | separar em linhas distintas na próxima republicação |
| R9 | Kit §7 (canais) está defasado vs. decisão híbrida 09-12 (Canal 2 comunidades autorizado; AID-1432/AID-1490) | runbook atualizado 09-12 vs kit de 09-02 | P3 | o runbook §1 é o estado canônico do canal; cheat-sheet aponta para lá (sem editar o kit) |

**Confirmados OK (não-achados):** todas as rotas/links do caminho do participante funcionam; estrutura de atividades confere item a item com o kit; cotas (i)–(iv) são operacionalizáveis no esqueleto `sintese`; consentimento cobre anonimização, direito de parar, descarte e ausência de incentivo; ordem fixa l27→l28→l29 e regra anti-metodologia explícitas; separação producer/verificador preservada (veredito independente na produção).

## 5. Correções recomendadas no kit (apenas recomendações; execução via cheat-sheet do moderador derivado deste ensaio)

1. **Adotar R1+R2 como cheat-sheet de execução** (doc de uso do moderador, sem tocar no kit): regra de overrun + respostas-padrão + rótulos exatos de produção (R3) + notas de a3 opcional (R5) + campos extras de scorecard (R4). Este doc §4 já contém o conteúdo necessário — o moderador pode usá-lo diretamente no GO.
2. **Edição futura do kit** (pós-síntese, decisão de ownership): incorporar R3/R5/R7/R9 ao texto canônico e avaliar R6/R8 na próxima republicação do bloco founder. Nenhuma dessas edições é pré-condição de GO.

## 6. Checklist pronto-para-GO

- [x] Kit + runbook + esqueleto de síntese lidos na íntegra e mutuamente coerentes (exceto defasagens P3 registradas)
- [x] Bloco copiável founder (convite + screening + consentimento) íntegro e acessível (`b062402a`)
- [x] Superfície de produção serve l27–l29 no pin vigente com atividades idênticas às descritas no kit (verificado 09-14)
- [x] QA GO wave-level publicado (AID-631 `done`)
- [x] Tempo médio por sessão estimado (~50'; janela 45–60' sustentável com hard stop 65' via R1)
- [x] Zero contato com participantes; zero edição de kit/currículo/gates; zero síntese
- [ ] **No dia da 1ª sessão (obrigação de execução, não de GO):** sanity de moderador no pin vigente — última sanity foi no `ef67fb06`; pin atual mudou `engines/codexDojo` (runbook §0/6.1) — e anotar `deploy_id` POR SESSÃO
- [ ] Cheat-sheet (R1–R5) adotado pelo moderador na 1ª sessão
- [ ] Participantes: funil é G&R/CEO-owned (AID-909/AID-1432) — fora do escopo desta PREP

## 7. Limites respeitados

Nenhum participante real contatado ou recrutado (gate AID-631/funil intocados); kit original não editado (recomendações apenas); nenhuma síntese publicada; nenhum `mastered`; nenhum dado pessoal coletado (personas são simuladas). Veredicto da PREP: **pronto-para-GO — no GO, a execução começa em horas** (cheat-sheet §5.1 + sanity de pin + deploy_id são as únicas ações de abertura).
