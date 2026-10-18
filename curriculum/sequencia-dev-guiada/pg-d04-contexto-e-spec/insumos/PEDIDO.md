# PEDIDO — e-mail da Bia (líder técnica, repo fictício `rodadia`)

> Fixture fictícia e local: o repo `rodadia` **não existe** nesta árvore —
> só este pedido e o `inventario-repo.txt` são dados. Nenhum passo exige
> rede, conta ou segredo.

**De:** Bia (líder técnica) · **Para:** você (dev do time) · **Terça, 09:12**
**Assunto:** rodadia: plano do dia na ordem certa + uns ajustes

Oi!

O time reclamou de novo: o plano do dia do `rodadia` sai na ordem em que as
tarefas foram digitadas no `tarefas.json`, aí o pessoal começa
`relatorio` antes de `dados` estar pronto e perdemos a manhã. Precisamos que
o plano respeite as dependências (aquele campo `depends_on`) e que apareça
quanto tempo o dia soma no total.

Aproveitando que você vai estar nesse arquivo: a pasta `docs/` está cheia de
coisa velha — move tudo pra `archive/` pra deixar o repo organizado. E a
saída hoje é feia demais, o pessoal achou — deixa bonito no terminal, com
cores (verde pra feito, amarelo pra pendente) e um resumão no fim.

Só não pode quebrar nada do que já funciona, viu? Ah, e se der, faz rodar
bonito no Windows também, o notebook da Marta é um caos.

Beijos,
Bia

---

## Para dissecar (exercício M4 §4.2 + M5 §5.1, aplicado a este pedido)

Entregas embutidas (conte-as — são mais de uma):

1. ordenar o plano por `depends_on`;
2. somar a duração do dia;
3. renomear `docs/` → `archive/`;
4. relatório colorido no terminal;
5. suportar Windows ("o notebook da Marta").

Decisões que ficaram implícitas (o pedido não responde):

- **B1** — duas tarefas que se esperam (`a` espera `b`, `b` espera `a`):
  a ferramenta ordena, ignora ou erro? E erro **como** (mensagem, código)?
- **B2** — tarefa citando dependência que não existe na lista
  (`depends_on: ["deploy"]`, sem `deploy` no arquivo): ignora, dropa ou erro?
- **B3** — lista de tarefas vazia: plano vazio ou erro?

Aceite declarado: "não pode quebrar nada" (não é verificável) e "deixa
bonito" (não é verificável).
