# Intent: R3B — fold MVP puro, com R3A aditiva posterior

Decisão do responsável recebida em 2026-10-04: estratégia R3A aditiva,
preservando caminho legado; não ativar default estrito sem recibos reais.
Prioridade autorizada neste turno: somente R3B, após revisão deste corte.
Base permanece b9f77774643b94bfd9fafbd756a1b17482c33e45.

O replay MVP mistura fold do ledger com leitura de rubricas. Extrair o fold
para função de valores em memória torna a fronteira verificável sem mudar
avaliação, estados, precedência das roles ou protocolo CLI.

Escopo autorizado: novo scripts/replay_fold.py, ajuste scripts/replay.py e
novo tests/test_replay_fold.py em engines/aiDevschoolMvp. Nenhum teste existente
pode ser editado. Guard negativo exige parada, sem override, substituto ou
exceção R2a. Intent/spec/plan/evidence e revisões registram a entrega local.

R3A0/A não serão implementadas neste turno. Check e --check do substrate seguem
legados, com possibilidade de env/HTTP/gravação; não afirmar offline desses
caminhos. Modo explícito aditivo, obtenção de recibos e integração são futuros.
R3B não precisa de recibos profile/pitfalls, hoje ausentes.

Preservar R5/R7/R9 e transporte R1/R8/R2a bloqueado. Sem Library, mudanças em
canonical/outputs, commit, push, PR, merge ou deploy. Provas em cópia isolada,
ambiente sanitizado e rede bloqueada para processo pai e filhos.

Contrato: [spec.md](spec.md). Execução: [plan.md](plan.md).
A [revisão anterior](review.md) corresponde às versões SHA nela registradas,
anteriores a esta decisão; não é revisão deste novo corte. Antes de código,
obter review-r3b-plan.md independente; após provas, review-r3b-diff.md.
