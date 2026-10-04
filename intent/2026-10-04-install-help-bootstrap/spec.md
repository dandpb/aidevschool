# Spec: bootstrap CLI do instalador

1. Parser único com flags/defaults/texto/tipos atuais; CLI parseia uma vez antes
   de import _install_validation. Argparse mantém -h/--help e erros nativos.
2. Corpo pós-parse preservado em _run_from_args; resolve permanece fora do try,
   catches/validação/install/saídas iguais. main(argv=None) permanece adaptador
   público; importlib preserva InstallError e demais exports/helpers.
3. Modificação de runtime só install.py. Nenhum teste, _install_validation,
   install/place_skill/scheduler, pin, hook ou política bytecode muda.
4. Teste existente help cache frio passa sem pyc/source/home/platform writes;
   ad hoc verifica -h/--help, erro2, import API/main argv explícito e implícito,
   --check normal. Cenários de instalação via runners sintéticos nos testes.
5. Uma única execução completa final engines/aiDevschoolMvp/tests, após checks
   direcionados, em cópia com spec docs/plans/ai_devschool_mvp_spec.agent.final.md
   preparada desde início, hash-igual, seccomp/allowlist anteriores.
6. Revisão independente, hashes/preservação, patch e inventário atualizados.
   Não declarar CI integral; EPERM loopback e contexto real PR continuam pendentes.
