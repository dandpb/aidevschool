# Plan: manutenção mínima autorizada

Escopo: engines/aiDevschoolMvp/aidevschool/install.py e recibos desta pasta.
Snapshot/original em /tmp/aidevschool-install-help, antes de qualquer escrita.
Preflight protect-paths/protect-tests ordinário, sem override.

1. Mover parser atual para _parse_args antes do import local. Parsear uma vez
   no bootstrap __main__; mover corpo pós-parse para _run_from_args e manter
   main(argv=None). Não mudar helpers nem mensagens.
2. Confrontar AST de todos os helpers, parser e corpo extraídos com original;
   preservar exports/catches/resolve. Preflight de runtime permitido.
3. Preparar duas cópias frias: checks direcionados e execução final. Copiar
   engine inteiro, pyproject, módulos gate determinísticos e spec referenciada;
   conferir hashes antes de execução. Sem dados compartilhados ou credenciais.
4. Rodar testes existentes test_install.py relevantes ao import/CLI/instalação
   e probes ad hoc main/API/-h/--help/erro2. Depois rodar uma vez o diretório
   MVP completo na cópia final independente. Rede bloqueada inclusive filhos;
   logs em /tmp, sem dependencia nova. Não repetir HTTP/guards já verdes.
5. Revisão independente do diff e saídas sem repetir suite completa; se falhar,
   diagnosticar e parar se contrato/teste protegido exigir alteração.
6. Rehash snapshot: somente install.py pode diferir. Atualizar pacote em novo
   diretório separado, preservar versões antigas e verificar apply/reverse só
   em cópia. Rollback desta fatia restaura install.py original sem mexer R3B.

Risco principal: preservar parser/API e resolver fora do try, evitando dupla
interpretação ou alteração de error paths. A prova red existente é válida;
não recriar/redigir teste congelado. Proposta já foi aceita e revisada.
