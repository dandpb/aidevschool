# BUGREPORT — estudante com média 6.0 aparece REPROVADO

**De:** coordenação da turma
**Para:** manutenção do `notas.py`
**Assunto:** saída errada para média exatamente 6.0

Rodamos a consolidação de fechamento de bimestre:

```
$ python3 notas.py "Ana 5.5 6.5" "Bia 6.0 6.0" "Caio 7.0 5.0"
Ana média 6.0 — REPROVADO
Bia média 6.0 — REPROVADO
Caio média 6.0 — REPROVADO
```

A regra da escola (REGRA.md, item 4) diz que média **maior ou igual a 6,0**
aprova. Ana, Bia e Caio ficaram com média exatamente 6,0 e os três apareceram
como REPROVADOS. No bimestre passado, quem tirou 6,5 apareceu APROVADO
corretamente — o problema parece ser só na fronteira.

Podem conferir e corrigir? A listagem oficial precisa sair hoje.

— coordenação
