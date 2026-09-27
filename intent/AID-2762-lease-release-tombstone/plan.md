# Plan — AID-2762-lease-release-tombstone

Status: approved
Aprovação: blocos "Defeito"/"Sugestão"/"Impacto" da própria AID-2762 (fast path para fix
bornido, mesmo regime de AID-2731). Auto-verificação produtora + countersign de run distinta
(AID-2754) ANTES do merge — produtor desta run é QA Lead, então o veredito independente vem
de outra run/agente (guard Platform & CI).

Passos:

1. `factory/model.py` — `Lease` ganha `released_at: Optional[str] = None`;
   `from_json` filtra chaves desconhecidas (`fields(cls)`).
2. `factory/queue.py` — `release()` com enforcement regrava via campo tipado,
   atomicamente (tmp + `os.replace`); import `json` removido (sem demais usos).
3. `factory/tests/test_release_tombstone.py` — regressões: (a) repro AID-2762
   (claim pós-release → `LeaseHeldError`, não TypeError; `lease_of` lê túmulo;
   item fora de `pending`); (b) takeover sobre túmulo expirado (época+1 + recibo);
   (c) `from_json` tolerante a chaves desconhecidas + lease legado sem
   `released_at`; (d) `holder_enforcement=False` continua unlink (item volta).
4. `factory/README.md` — seção "Liberação de lease: túmulo legível (AID-2762)"
   registrando a intenção e a semântica.
5. Auto-verificação: `python3 -m pytest factory/tests/ -q` verde na íntegra
   (baseline 50 + novos) em worktree nova na ponta `5c40b8d7`; runtime confinado
   a tmp dirs (testes usam `tmp_path`).
6. PR para main; veredito de run distinta antes do merge (AID-2754); receipt
   (comandos + saídas-chave) na AID-2762.

Aceite checkável = fix + testes + README + pytest verde + PR com countersign de run distinta.
