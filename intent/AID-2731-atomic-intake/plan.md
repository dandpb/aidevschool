# Plan — AID-2731-atomic-intake

Status: approved
Aprovação: blocos "Missão"/"Aceite" de AID-2731 (fast path autorizado para fix bornido;
auto-verificação e revisão produtor≠verificador não dispensadas). Veredito independente
(QA Lead ou fresh-context verifier contra este plan) ANTES do merge.

Passos (diff mínimo, sem toque em produção):

1. `factory/queue.py` — reescrever `submit` (~15 linhas): escrever `event.to_json()` em
   tmp único por escritor `queue/<id>.<pid>.<uuid8>.tmp`; publicar com `os.link(tmp, path)`
   (create-if-absent atômico, EEXIST = alguém publicou antes); em `FileExistsError`,
   reler o existente e aplicar a comparação atual (campo volátil `created_at` fora da
   igualdade): idêntico → retorna existing; divergente → `FactoryError` (mensagem
   inalterada). Unlink do próprio tmp em todo caminho (try/finally).
2. `factory/tests/test_p1_atomic_intake.py` — regressões adaptadas das fontes citadas em
   AID-2731: (a) X2 de `/paperclip/w2710qa/stress/test_stress_qa.py`
   (`test_x2_concurrent_divergent_intake`) — barreira dupla, asserts exatos: exatamente
   1 aceite + 1 `FactoryError`, 0 `FileNotFoundError`, disco == payload do aceite;
   (b) S4 de `/paperclip/w2716/stress/s4_intake_race.py` — 200 rodadas concorrentes
   divergentes com contagem estrita (0 aceites duplos, 0 crashes) + S4-seq (idêntico
   idempotente / divergente `FactoryError`) + idempotência concorrente de payload igual.
3. `factory/README.md` — nota de que o intake publica atomicamente (tmp por escritor +
   link create-if-absent) na seção/tabela de gates P1.
4. Auto-verificação: `python3 -m pytest factory/tests/ -q` verde na íntegra (baseline
   27 testes + novos) na worktree nova na ponta `43dd3e2e`; runtime confinado a
   `.scratch/factory/` (testes usam tmp_path do pytest).
5. Veredito independente antes do merge; PR para main; receipt (comandos + saídas-chave)
   na AID-2731; countersign no thread da AID-2727.

Aceite checkável = blocos 1–5 de AID-2731.
