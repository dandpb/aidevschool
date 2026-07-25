# ADR-0006: Contrato de invocação do verificador G4 (skill `aiDevschoolMvp`)

**Status:** Rejected · **Data:** 2026-07-25 · **Decisor:** implementação atual

## Contexto

A spec final `docs/plans/ai_devschool_mvp_spec.agent.final.md` exige que o gate
G4 reproduza seus exemplos *byte-a-byte* e não permite que a skill leia tokens.
Os julgamentos gravados em `keys/g4_recordings/{rubric_id}.json` são a única
fonte de avaliação implementada e testável.

## Decisão

Não manter uma interface com uma única implementação. `gate_check.py` carrega
diretamente os julgamentos gravados, valida artefato, rubric e versão, e passa
esses julgamentos ao scorer compartilhado. Não existe seleção por ambiente nem
caminho de plataforma. Os testes G4 exercitam esse fluxo em toda execução.

Uma integração live poderá ser proposta em outro ADR quando existir uma segunda
implementação real, com contrato de autenticação e testes próprios.
