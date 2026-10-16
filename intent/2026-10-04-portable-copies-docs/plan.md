# Plan: R9 documental

Contrato: [spec.md](spec.md). Arquivos: novo
`docs/handbook/17_portable_copies.md`, somente sua entrada no
`docs/handbook/README.md` e intent/spec/plan/evidence/review neste diretório.

1. Classificar fontes, espelhos MVP, instalação, vendored peers e projeções,
   com links ao mecanismo real. Não editar README do engine, runtime ou skills.
2. Resolver novos links e conferir efeitos dos comandos recomendados.
3. Executar uma vez `PYTHONDONTWRITEBYTECODE=1 python3 engines/aiDevschoolMvp/aidevschool/install.py --check`
   e `PYTHONDONTWRITEBYTECODE=1 python3 scripts/skill_vendored_guard.py`, esperando exit 0.
   Não executar instalação, `--update-pins` ou `--self-test`.
4. Comparar por AST os quatro pares com o mesmo recorte definido pelo contrato
   existente (script ad hoc por stdin, sem importar os runtimes); registrar
   quais pares têm bytes diferentes. Sem repetir suites R5/R7 ou escrever testes.
5. Validar links/whitespace e inventário SHA-256 pré-R9 (somente uma linha nova
   no índice permitida), incluindo entregas/recibos anteriores não rastreados.
6. Revisão independente em contexto novo confronta fontes, critérios e provas,
   sem repetir comandos inalterados. Produtor registra evidence, revisor review.

Risco principal: recomendar edição isolada de uma cópia ou atribuir ao instalador
um gerador inexistente. Mitigação: pares exatos, fonte da comparação e limites
do check. R2a continua bloqueada pela transferência; nenhum download nesta fatia.
