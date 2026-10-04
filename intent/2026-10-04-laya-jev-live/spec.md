# Contrato — evidências live

Aceito pelo pedido detalhado do usuário. Preservar bytes do corpus e manifesto de checkpoints. Validar digest de todo o corpus e de cada entrada antes da análise; rejeitar IDs desconhecidos/duplicados, status inválidos, tipos/chaves/probabilidades inválidas e valores não finitos. Falhas não produzem métricas de qualidade. Não sobrescrever saídas nem análise existentes.

Laya usa os três diretórios locais, hashes oficiais e CPU; um aquecimento por checkpoint precede medições. Separar carregamento, aquecimento e inferência local. Jev registra versão concreta retornada e tempo HTTP total; sem telemetria do provedor, transporte e computação remota não podem ser isolados. Comparação principal auto cobre 62 casos, com rodada especializada separada. Reutilizar `/workspace/laya` da revisão fixa se verificado; preservar evidências históricas.
