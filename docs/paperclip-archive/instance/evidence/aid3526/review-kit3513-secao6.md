# AID-3526 — Review GWE dos rascunhos §6 do kit AID-3513 vs páginas/links reais (2026-09-30 ~21:3xZ)

Doc revisado: `kit-facilitacao` (AID-3513) rev af580b4c / r1 — §6 linhas 118-143 (rascunhos 6.1-6.7, linhas 122-141).
Pin verificado no tracker AID-909 (doc `tracker` rev 8782e150, 2026-09-29T19:03Z): `b6a0ea1b` (= merge PR #414, canônico desde hb45b 09-17). Alias de produção: aidevschool-codexdojo-os.netlify.app.

## Critério 1 — Links/afirmações vs páginas reais: PASS
- Rascunhos 6.1–6.7 contêm ZERO URLs e ZERO menção a `/escola/` (grep linhas 122-141 = 0 matches para escola|3506|619|http).
- Rotas vivas (curl 2026-09-30): https://aidevschool-codexdojo-os.netlify.app/mission/dev/l27 → 200 · /mission/dev/l28 → 200 · /mission/dev/l29 → 200 (SPA shell 1565B, lang pt-BR).
- Títulos no código no pin b6a0ea1b (repo dandpb/aidevschool, engines/codexdojo-os-prototype/src/data/missions.ts:1277,1312,1347):
  l27 "Debug com assistente: reproduza antes de perguntar" · l28 "Refatore com assistente sem quebrar comportamento" · l29 "Avalie as dependências sugeridas" — temas batem com "debug, refactor e dependências com assistente de IA" dos rascunhos.
  git diff b6a0ea1b..HEAD em missions.ts: apenas version bumps de lições ai-pratica (l04/l18/l19/l20/l24/l25/l26); 0 linhas tocando l27/l28/l29.
- Trilha dev no catálogo: ...l21, l22, l23, l27, l28, l29 (l24-l26 = ai-pratica) → "3 lições novas" e "fim da trilha dev + lições novas" (6.1) coerentes; aquecimento l21/l22 existe (missions.ts:1172,1207; track dev).
- Datas/horários: "entre 13 e 17 de outubro" + "dias úteis... 12:00–19:00 UTC" (6.4) = S2 da janela v3 (10-13→10-17, dias úteis 12:00–19:00Z, última útil ~10-16, teto 10-17) — tracker AID-909 §3.1 + outreach §5 delta v3. 2026-10-13=ter, 10-17=sáb (qualificador "dia útil/dias úteis" cobre).

## Critério 2 — Promessas vs script AID-639: PASS
- Todos os 7 rascunhos: 45-60 min ✓ · tela+áudio c/ consentimento escrito ✓ · sem câmera ✓ (6.1-6.3, 6.5) · parar quando quiser ✓ · anonimato P_ (6.6) ✓ · sem custo/remuneração/contrapartida em TODOS ✓ (7/7).
- Delta v3 de incentivo (acesso antecipado → NENHUM, card cf8b749c 09-26) corretamente APLICADO nos rascunhos do kit — substitui o "acesso antecipado" que ainda existe nos corpos brutos dos cards canônicos §0.4 (outreach rev ce368ee6: DM-01, DM-03, DM-05, T0).

## Critério 3 — Citação de AID-3506/PR619 como resultado: PASS (0 ocorrências)

## ⚠️ Recomendação de handoff (dona: G&R, aplicar no card foldado da S1 — diretiva AID-3376)
Disparo deve usar os textos do §6 do kit, NÃO os corpos brutos do outreach §0.4 (estes ainda prometem "acesso antecipado", morto na v3). Pack é fonte canônica intocada (boundary GWE); registrada via annotation no doc kit-facilitacao.

## LOW (opcional, não bloqueiam o disparo)
1. 6.2 "(lições básicas)" → sugerido "duas lições curtas de preparação (l21/l22)" (mais preciso; sem risco — nenhuma URL é enviada).
2. 6.6 "Se eu puder voltar com uma dúvida rápida nos próximos dias, te aviso por aqui." → manter estritamente condional ou remover; eventual re-contato fora do script AID-639 deve passar pela UX/LGPD antes.
3. 6.1 "horário comercial" ≈ 12:00–19:00Z = 09:00–16:00 BRT ✓ dentro do comercial; 6.4 já leva faixa exata. Sem ação.

## Veredito
§6 APROVADO para o 1º disparo (~10-06) A PARTIR DOS TEXTOS DO KIT. Annotation registrada no doc (anchor §6 header). Disposition AID-3526: done.
