<!-- issue: AID-3356 | key: vol2-header-template | doc_id: 52fac1db-1955-4be5-b442-e23a5c8ee021 | updated: 2026-09-29 14:41:04.476+00 -->

# vol2-header-template

(AID-3356)

# TEMPLATE — header canônico do `sdlc-audit-index-2` (v3.1/AID-3356)

> **Doc de trabalho: o volume vivo vive em carrier SM-assigned (ORDEM AID-3357).** O SM copia o header abaixo verbatim para o doc `sdlc-audit-index-2` na issue da ORDEM. Este template é a fonte canônica do texto do header.

# SDLC — Índice cumulativo de auditorias de conformidade · VOLUME 2

**Fonte de mandato:** decisão CEO AID-1607 (Opção B) → Diretiva v3 §3 + **Emenda v3.1 (decisão CEO AID-3356, 2026-09-29 — superfície de continuação por volumes)** → ORDEM AID-1610 (volume 1) → **AID-3356** (abertura deste volume; carrier).

**Volume 1 (fechado, imutável):** doc key `592f8efe-ff10-41df-8b4b-afe4c57af45c` (id `ed6206dd-8fa6-4c1c-b4e3-12c4c349a26b`), carrier AID-1610 — rows **#1–#246** (piloto/âncora/instâncias/delegadas até a auditoria #246, 2026-09-29). Fechado por atingir o cap de 512KB (524.288 chars) da API Paperclip docs; linha-ponteiro de fechamento no próprio volume 1. Alias `sdlc-audit-index` = tombstone DEPRECATED (AID-3233).

**Este volume:** rows a partir de **#247**, mesmas colunas e mesma densidade probatória da era #220+ (~2.400 chars/row, sem truncamento). Numeração continua a série histórica — **não reinicia**.

**Manutenção (diretiva v3 §3 + v3.1):** cada nova auditoria anexa **exatamente 1 linha** ao final da tabela do volume vigente. O playbook e os templates permanecem em `docs/sdlc/` (fonte canônica); o índice registra onde/quando as auditorias aconteceram, veredito e follow-ups.

**SM-RA-1 — verify-after-append (ratificada AID-3230; vale em TODOS os volumes):** todo append exige PUT completo com `format:"markdown"` + `baseRevisionId` → **GET fresco imediato** confirmando (a) `updatedAt` avançou e (b) a row presente no corpo → só então o receipt cita a persistência (updatedAt/revNo/row). Receipt sem GET pós-PUT = violação F1.

**Regra de rotação v3.1 (pre-autorizada, operacional do SM):** quando o espaço remanescente do volume vigente ficar **< 3.000 chars**, fechar o volume na última row completa (1 linha-ponteiro apontando o próximo volume), criar `sdlc-audit-index-N` com header cross-linkado bidirecional e registrar a rotação na row da instância vigente. Novo gate CEO não é exigido.

**Tipos:** `piloto` (pré-âncora) · `âncora` (registro rolling, diretiva v2) · `instância` (auditoria por despacho founder/CEO) · `delegada` (protocolo executado por delegação CEO em issue própria).

| # | Auditoria | Tipo | Fechamento | Gatilho/despacho de origem | Veredito/resumo | Follow-ups despachados |
|---|---|---|---|---|---|---|
