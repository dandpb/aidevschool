# Intent: help do instalador sem import local

Autorização específica do usuário em 2026-10-04: implementar a proposta mínima
somente em install.py, preservando main(argv=None), exports, exceções,
validação/instalação e todos os testes. HEAD Cloud:
b9f77774643b94bfd9fafbd756a1b17482c33e45. Fatia separada de R3B.

Causa: import _install_validation anterior ao parser escreve bytecode em cache
frio. Teste existente reproduz a falha em controle HEAD sem R3B; provas em
../2026-10-04-offline-replay-plan/evidence-r3b-full-validation.md.
Proposta aceita/revisada está preservada no executor em
/workspace/aidevschool-deliverables/2026-10-04-install-help-proposta.md.

Resultado: help nativo encerra antes do import local; argumentos válidos
continuam percorrendo a mesma validação e instalação. Sem alterações de testes,
cache flags, hooks, dependências, dados, self-test HTTP ou Library.
Sem commit/push/publicação. Novos recibos registram esta fatia; históricos ficam.
