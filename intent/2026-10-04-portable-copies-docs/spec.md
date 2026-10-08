# Spec: classificação documental de cópias

Autorização: [intent.md](intent.md). Orientação, sem novo contrato executável.

1. Mapear os quatro pares gate/MVP exatos e diferenciar o runtime espelhado
   dos entry scripts e conteúdo autoral do engine.
2. Explicar paridade AST (definições/constantes, sem imports/docstrings/comments)
   sem prometer identidade byte a byte. Instalador copia runtime entregue;
   `--check` valida currículo/manifest, não sincroniza runtime.
3. Classificar harness-eval como três cópias vendorizadas pares, com identidade
   de árvore e proveniência via lock/pins; não generalizar esse contrato às
   demais skills. Distinguir cópia manual de projeção gerada já mapeada em R7.
4. Indicar efeitos de instalação e update-pins; os comandos desta fatia devem
   apenas validar, sem instalar, atualizar pins, gerar ou escrever estado real.
5. Acrescentar uma entrada no handbook e preservar R5/R7/R2a e fontes anteriores.

Aplicam-se AGENTS raiz/docs, REVIEW.md e SDLC local já lidos. Página não altera
prompts/gates/roadmap/contratos, portanto não altera MANIFEST. Uma futura
mudança de runtime/espelhos exige plano e provas próprios; nenhuma está autorizada
nesta fatia. Sem commit, push, PR, merge ou deploy.
