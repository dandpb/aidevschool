# pg-d05 — Rúbrica de avaliação v1 (objetiva; mesma forma de pg-d01/pg-d02/pg-d03/tp-c01)

Veredito por critério: `met` | `partial` | `not_met` — sempre com
evidência (comando/saída/diff citado no recibo). Sem nota agregada: a
prática é concluída com os 7 critérios `met` ou `partial` justificado.
A rúbrica avalia o **processo de controlar a delegação** (julgar entrega
de produtor com evidência), não o código da fixture nem a velocidade.

| # | Critério | Pergunta de verificação (perCheck executável) |
| --- | --- | --- |
| c1-contrato-antes-do-diff | Recibo registra a preparação ANTES do julgamento: allowlist E1, proibições E2 e validações V1–V3 lidas do plano/contrato, sem usar conteúdo do `guia-de-correcao/` | A seção "preparação" do recibo lista allowlist (2 caminhos), E2.1 (`testes.py` proibido) e V1–V3 ANTES de qualquer saída sobre o diff? |
| c2-escopo-mecanico **(objetivo (a))** | Escopo da r1 verificado mecanicamente e rejeitado pelas violações citadas (não "no olho") | O revisor roda `python3 insumos/verifica_delegacao.py escopo insumos/delegacao-r1/diff-r1.patch` → exit 1 citando `testes.py` (proibido) e `util_texto.py` (fora da allowlist); o recibo cita essas duas violações? |
| c3-evidencia-propria **(objetivo (b))** | Alegação decomvida: r1 aplicada em cópia limpa e re-executada pelo controlador — suíte verde reproduzida, sha256 de `testes.py` divergindo do MANIFEST e V3 divergindo do congelado, tudo com comando+exit+saída | O revisor aplica `insumos/delegacao-r1/diff-r1.patch` em árvore limpa e reproduz os três: (i) suíte `6 testes passaram`; (ii) `sha256sum insumos/fixture/testes.py` = `41c0669d…` ≠ `e1deddbf…`; (iii) V3 com `categoria invalida`/`renovacoes fora do limite` ≠ bloco `aceite-v3`? Sem os três, `not_met` |
| c4-veredito-e-retrabalho | Rejeição da r1 fundamentada por cláusula (E1/E2.1/C2/V3) por achado + instruções de retrabalho objetivas (o que reentregar) | O veredito do recibo nomeia as cláusulas E1/E2.1/C2/V3 e o retrabalho pedido corresponde ao que a r2 entrega (mensagens restauradas, `util_texto.py` removido, `testes.py` restaurado, teste novo em arquivo próprio)? "Não gostei"/"quebrou tudo" sem cláusula ⇒ `not_met` |
| c5-aceite-r2-com-recibo **(objetivo (c))** | r2 aceita SOMENTE com: escopo ok + V1 verde com `testes.py` byte-idêntico (sha256) + V2 verde + V3 igual ao congelado — registrado em recibo que passa no verificador | O revisor roda: `python3 insumos/verifica_delegacao.py escopo insumos/delegacao-r2/diff-r2.patch` (exit 0); aplica a r2 e confere sha256 `e1deddbf…`, V2 `4 testes passaram`, V3 igual linha a linha; e `python3 insumos/verifica_delegacao.py evidencia <recibo-do-aluno>` → APROVADO? |
| c6-skill-extraida **(objetivo (d))** | Skill `skill-verificar-delegacao.md` escrita (gatilho + passos + armadilha real desta sessão) e checagem validada nos dois sentidos | O revisor lê a skill: o gatilho é concreto (delegação/PR de produtor), os passos incluem contrato-antes-do-diff + escopo mecânico + re-execução + aceite congelado, e a "armadilha já paga" é a desta sessão (suíte verde manufaturada/alegação sem V3)? E roda `escopo` com r1 (REPROVADO) e r2 (APROVADO) como validação dupla? |
| c7-limites-e-integridade | Nenhum passo com rede/conta/segredo; arquivos do pacote intocados (só a allowlist do `ALLOWLIST.md` mexe no espaço do aluno); fixture restaurada após a prática | `git status`/diff no pacote mostra apenas artefatos permitidos (recibo, skill, cópias descartáveis removidas); `sha256sum insumos/fixture/*` bate com o `MANIFEST.md`; nenhum comando do recibo acessa rede? |

## Notas de aplicação

- `partial` exige justificativa escrita apontando o que faltou; `not_met`
  sem retry deixa a prática **inconclusa** (ver enunciado §Retry).
- Evidência textual (comando + exit + saída colada no recibo) basta; não
  exige captura de imagem.
- Referência completa (veredito modelo, recibo que passa, recibo falso
  que deve reprovar e saídas reais): `guia-de-correcao/` — **após** a
  tentativa.
- v1 — revisões futuras versionam este arquivo (v2, v3) sem editar a
  v1, mesmo padrão de pg-d01/pg-d02/pg-d03.
