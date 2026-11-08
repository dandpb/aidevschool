<!-- issue: AID-1503 | key: provision-conta | doc_id: 6f2ca79c-ed44-42f0-9083-7a031aa5507d | updated: 2026-09-12 15:27:12.529+00 -->

# Runbook — provimento de 1 conta externa mínima (TabNews) p/ Canal 2 do funil O1

(AID-1503)

# Runbook — conta TabNews mínima (Canal 2, funil O1)

**Autoridade:** founder respondeu card `8357d74f` (AID-909, 2026-09-12T15:20Z) = **`provision-conta`** — aprova, via CEO, o provimento de 1 conta externa mínima (TabNews) para o G&R postar a T1-G nos alvos auditados, como despacho direto recorrente nesta onda e futuras (receipt: comentário `94d6c828` no thread da AID-909).

## 1. Passos do founder (~3 min, 1 vez só)

1. Abrir **https://www.tabnews.com.br/cadastro** num navegador.
2. Preencher: **username `aidevschool`** (verificado disponível em 09-12 via API; alternativos livres: `aidevschool-br`), e-mail que você controla, senha forte e **única** (não reutilizar).
3. Confirmar o cadastro pelo código que chega no e-mail.
4. Fazer 1 login no site para validar que entra.

## 2. Entrega da credencial — canal seguro (escolher 1)

- **Recomendado:** board Paperclip → empresa AiDevSchool → **Secrets**: criar segredos com keys **`TABNEWS_O1_EMAIL`** e **`TABNEWS_O1_PASSWORD`** (description: "AID-1503 — conta Canal 2 O1; desativar ao fim da onda"). O board depois vincula o secret ao ambiente de execução dos agentes (o mesmo mecanismo usado para a credencial do repo).
- **Alternativa:** qualquer canal de configuração segura que o board já use para credenciais de runtime — indicar qual na resposta do card.
- **Nunca** colar credencial em comentário de issue ou card (threads são lidas por todos os agentes).

## 3. Uso autorizado (limites da conta — espelham a aprovação)

- Postar **apenas** as copies sancionadas: **T0** (endosso) e **T1-G** (voz de time) — doc `outreach` §0/§0.1 da AID-909.
- Alvos: **apenas** os 5 auditados no tracker AID-909 §1.5 (TabNews = alvo nº1).
- Re-posts somente para repor desistências; **zero** amplificação paga.
- Respostas de devs → relay no thread da AID-909 (entram no funil: screening 3 perguntas <24h → agendamento → consentimento AID-142 → handoff UX).
- PII de candidatos somente em research storage restrito; nada de PII em issues.
- Técnico: login via `POST /api/session` (e-mail+senha) → post via `POST /api/contents` (egress do runtime já verificado 200 — hb32/AID-1498).

## 4. Pós-entrega (o que acontece em seguida)

1. CEO valida a credencial (login de teste, sem post) e roteia o **pointer** (canal + keys) ao G&R — nunca o valor em texto.
2. G&R faz o **1º post T1-G no TabNews** = primeiro contato verificável do funil (hoje 0/0/0/0/0) e atualiza o tracker AID-909.
3. Âncoras: 1º handoff à UX até **09-14**; trigger <3 candidatos **09-14 12:00Z**; 1ª sessão **09-18**; n=5-8 até **~09-23**.

## 5. Fallback e encerramento

- **Fallback auditado:** dev.to (usa API key simples gerada nas settings da conta — sem código por e-mail por post). Trocar de alvo = 1 linha na resposta do card.
- **Fim da onda O1:** senha rotacionada + segredo `archived` + conta desativável — exceto se o founder mantiver o canal permanente (a aprovação já fala em "recorrente p/ esta onda e futuras"; decidir no wrap-up).