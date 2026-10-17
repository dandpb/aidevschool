CONTEXTO: docs/curso-simples/workflow-exemplo/release_notes.py
  (CLI _main + generate_release_notes) e
  docs/curso-simples/workflow-exemplo/test_release_notes.py;
  entrada: lista JSON de {"hash","message"} — amostra fixa
  curriculum/sequencia-dev-guiada/pg-d02-pedido-estruturado/insumos/meus_commits.json
OBJETIVO: opção de CLI --types feat,fix que restringe o relatório às
  seções dos tipos selecionados (✨ Novidades e 🐛 Correções); a seção
  ⚠️ Breaking changes permanece quando o commit breaking é de um tipo
  selecionado (sinal de segurança, não tipo filtrável)
RESTRIÇÕES: stdlib apenas, offline (PRD.md "Fora de escopo"); saída
  determinística (SPEC.md); nenhum commit descartado silenciosamente
  (PRD.md "Critérios de aceite", item 3) — os não selecionados saem das
  seções MAS entram na contagem da linha final "filtro: <tipos> — N
  commits não exibidos"; sem --types, saída idêntica à de hoje
ACEITE: (1) python3 -m pytest test_release_notes.py -q → 22 atuais +
  ≥4 novos do --types, 0 failed; (2) python3 release_notes.py
  insumos/meus_commits.json --types feat,fix | grep -c '^## ' → 3
  (⚠️ Breaking, ✨ Novidades, 🐛 Correções); (3) mesmo comando |
  grep -c 'Fora do padrão' → 0; (4) mesmo comando | tail -1 →
  "filtro: feat,fix — 5 commits não exibidos"
NÃO-META: export para Slack/API externa (item 4 do pedido original);
  remover/esconder commits fora do padrão sem contagem (item 3 — choca
  com o PRD; a contagem visível resolve); novo destaque visual de
  breaking (item 2 — segunda entrega, encadear em pedido próprio)
