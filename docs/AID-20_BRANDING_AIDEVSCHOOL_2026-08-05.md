# AI DevSchool — proposta de branding v0.1

| Campo | Valor |
| --- | --- |
| Issue | AID-20 |
| Status | Proposta para decisão do CEO; não autoriza alteração em produção |
| Data | 2026-08-05 |
| Escopo | Marca-mãe, arquitetura de trilhas, voz, direção visual e teste |

## Resumo executivo

**Problema observado.** A proposta de valor é coerente nos documentos — aprender IA em lições curtas, práticas e verificáveis — mas a expressão visual varia entre experiências. O host canônico usa papel, verde, amarelo e coral; o LiteracyDojo preserva papel e coral, mas usa violeta como primário; superfícies técnicas usam ainda outra linguagem. Sem uma arquitetura explícita, a pessoa pode perceber produtos separados em vez de uma escola com várias formas de aprender.

**Impacto para o aprendiz.** A fragmentação pode reduzir reconhecimento, confiança na transição entre engines e compreensão de que o progresso pertence a uma única jornada. Para iniciantes, nomes internos como “engine”, “AI Literacy” ou “substrate” também competem com o objetivo concreto.

**Recomendação.** Posicionar **AI DevSchool** como marca-mãe e usar **IA Prática** e **Trilha Dev** como duas portas da mesma escola. A unidade vem de uma base visual comum e da promessa “Aprenda. Pratique. Comprove.”; cada trilha recebe um acento próprio, sem criar marcas independentes.

**Trade-off.** Uma família visual comum reduz liberdade estética por engine, mas melhora reconhecimento e transferência de confiança. A linguagem voxel permanece como recurso pedagógico e expressivo, não como requisito em toda tela.

## 1. Base de evidências

### Evidências no repositório

- `docs/VISION.md` define dois públicos, uma mecânica, microlições de 3–5 minutos, gamificação e voxel art explicativa.
- `docs/handbook/README.md` define o codexdojo OS como entrada canônica e fixa “um aprendiz, um currículo, vários motores”.
- `Onboarding.tsx` apresenta “AI DevSchool — uma escola, duas trilhas”, recomenda uma rota ajustável e promete troca posterior.
- O host canônico já possui tokens compartilhados de papel, tinta, verde, amarelo e coral em `foundation.css`.
- O LiteracyDojo repete papel, tinta, amarelo, coral e bordas, mas usa violeta como ação primária.
- A regra de domínio exige tentativa e verificação independente; conclusão local, XP e sequência não equivalem a `mastered`.

### Hipóteses a validar

- H1: “Aprenda. Pratique. Comprove.” comunica melhor a diferença da escola do que uma promessa genérica sobre IA.
- H2: uma base visual comum com acentos por trilha aumenta o reconhecimento entre host e players.
- H3: “IA Prática” é mais compreensível no primeiro contato do que “AI Literacy”.
- H4: voxel art ajuda explicação e memorabilidade quando ligada ao conceito, mas pode distrair se usada como decoração contínua.

### Preferências de design, não evidências

- Cubos modulares como símbolo da construção gradual do conhecimento.
- Verde-escola como cor primária da marca-mãe.
- Coral para ação e calor humano; amarelo para descoberta; violeta para a trilha não técnica; azul para a trilha dev.

## 2. Plataforma de marca

### Essência

**Conhecimento de IA que se prova na prática.**

### Promessa

Você aprende em passos curtos, tenta em uma situação concreta, recebe feedback e entende o que a evidência realmente permite afirmar.

### Posicionamento

Para pessoas que querem usar ou construir com IA sem depender de promessas vagas, AI DevSchool é uma escola prática de IA em pequenas missões. Diferente de cursos passivos ou quizzes de opinião, separa tentativa, feedback e verificação para que progresso signifique aprendizado demonstrável.

### Princípios

1. **Curto, não raso.** Cada passo cabe no dia; o critério continua rigoroso.
2. **Ação antes de abstração.** Começamos pelo que a pessoa quer conseguir fazer.
3. **Clareza antes de magia.** Explicamos limites, estado e próxima ação.
4. **Progresso honesto.** Concluir, verificar e dominar são estados distintos.
5. **Uma escola, vários ambientes.** A experiência muda; a linguagem de aprendizagem permanece.

## 3. Arquitetura de marca

```text
AI DevSchool (marca-mãe / confiança / progresso)
├── IA Prática (trilha para aplicar, avaliar e decidir)
│   └── LiteracyDojo (nome interno do player; não lidera a comunicação ao aprendiz)
└── Trilha Dev (trilha para construir software robusto com IA)
    └── voxelDojo, pixelDojo e outros motores (ambientes; não marcas concorrentes)
```

Regras de naming:

- Na entrada: **AI DevSchool**.
- Na escolha: **IA Prática** e **Trilha Dev**.
- Dentro da missão: “Missão de IA Prática” ou “Missão Dev”.
- Nomes de engine aparecem apenas em contexto técnico, ajuda ou créditos.
- “Mastery/dominado” só aparece quando houver autoridade canônica; caso contrário usar “concluído neste dispositivo”, “verificado” ou “em prática”, conforme o estado real.

## 4. Identidade verbal

### Assinatura recomendada

**Aprenda. Pratique. Comprove.**

Alternativa para aquisição: **IA que você aprende fazendo.**

### Voz

- **Clara:** frases curtas, verbos concretos, uma ação principal por momento.
- **Acolhedora:** presume curiosidade, não conhecimento técnico.
- **Honesta:** explicita limites, armazenamento local e critérios de verificação.
- **Motivadora:** celebra estratégia e evidência, não só velocidade ou sequência.
- **Precisa:** adapta exemplos ao público sem infantilizar não programadores.

### Antes / depois

| Evitar | Preferir |
| --- | --- |
| “Execute o engine de AI Literacy” | “Comece sua primeira missão de IA Prática” |
| “Você dominou!” após conclusão local | “Missão concluída neste dispositivo” |
| “A IA sabe…” | “A IA gerou uma resposta; agora vamos verificá-la” |
| “Erro” sem recuperação | “Ainda não. Compare a fonte e tente novamente” |
| “Fácil para qualquer pessoa” | “Comece sem precisar programar” |

## 5. Direção visual

### Conceito: blocos de evidência

O símbolo é formado por quatro cubos: **objetivo → tentativa → feedback → evidência**. A forma modular conecta voxel art ao ciclo pedagógico, não a uma estética gratuita. O conjunto deve funcionar em 24 px, uma cor e alto contraste.

### Sistema cromático proposto

| Papel | Token existente | Uso |
| --- | --- | --- |
| Fundo | `#F8F4EA` | ambiente acolhedor, páginas da jornada |
| Superfície | `#FFFDF8` | cards e conteúdo |
| Texto | `#17213A` | leitura e contraste |
| Marca-mãe | `#315C4C` | navegação, marca, ação principal comum |
| Marca-mãe escura | `#1F4034` | hover e texto sobre fundos claros |
| Descoberta | `#FFBF47` | destaque, atenção não crítica |
| Ação humana | `#FF7D66` | feedback caloroso e momentos de impulso |
| IA Prática | `#6657E8` | acento de trilha; não substitui a marca-mãe no shell |
| Trilha Dev | `#4D8FFF` | acento de trilha técnica |
| Sucesso | `#14734D` | resultado positivo com ícone/texto, nunca só cor |
| Erro | `#B83A31` | recuperação com mensagem e próxima ação |

Não criar novos tons por engine antes de testar a família. Cor nunca é o único indicador de trilha, estado ou resultado.

### Tipografia e forma

- Manter a tipografia sans-serif já usada nos produtos até auditoria de licenças, performance e cobertura de caracteres.
- Títulos: curtos, peso forte, caixa normal.
- Corpo: mínimo de 16 px e largura aproximada de 60–70 caracteres.
- Cantos arredondados e sombras discretas preservam o tom lúdico sem esconder hierarquia.
- Voxel: usado para explicar sistemas, representar progresso e criar landmarks; evitar como ruído atrás de texto ou controles.

### Acessibilidade mínima

- WCAG 2.2 AA para contraste de texto e controles.
- Foco visível, alvos mínimos de 44 × 44 px e estados compreensíveis sem cor.
- Movimento voxel respeita `prefers-reduced-motion` e mantém alternativa estática.
- Linguagem simples e expansão de termos técnicos no primeiro uso.

## 6. Protótipo conceitual: primeira entrada

```text
┌────────────────────────────────────────────────────────────┐
│ ◈ AI DevSchool                         Aprenda • Pratique • Comprove │
│                                                            │
│ Aprenda IA fazendo algo útil hoje.                         │
│ Missões curtas, feedback claro e progresso sem promessas   │
│ vagas. Você pode trocar de trilha quando quiser.            │
│                                                            │
│ ┌ IA Prática ─────────────────┐ ┌ Trilha Dev ────────────┐ │
│ │ Para usar, avaliar e decidir │ │ Para construir e testar │ │
│ │ sem precisar programar.      │ │ software robusto com IA. │ │
│ │ 3–5 min • Começo guiado      │ │ Projetos • Evidência     │ │
│ │ [Começar por aqui]           │ │ [Explorar trilha]         │ │
│ └──────────────────────────────┘ └───────────────────────────┘ │
│                                                            │
│ Sem conta. O progresso inicial fica neste dispositivo.     │
└────────────────────────────────────────────────────────────┘
```

O protótipo reduz três seletores antes do primeiro valor para duas escolhas orientadas a resultado. Objetivo, contexto e confiança podem ser coletados progressivamente no Mapa Inicial. Essa mudança é uma hipótese de UX e exige issue de implementação e teste; não deve ser aplicada diretamente.

## 7. Critérios de aceite para uma futura implementação

1. A pessoa identifica em até 5 segundos que AI DevSchool ensina a **usar** ou **construir** com IA.
2. As duas trilhas são distinguíveis por nome, descrição e ícone, sem depender de cor.
3. A marca-mãe permanece visível ao entrar em qualquer player.
4. Nomes internos de engines não aparecem como decisão principal do aprendiz.
5. Conclusão local, verificação e domínio usam rótulos distintos e corretos.
6. Todos os textos e controles atingem WCAG 2.2 AA; teclado e movimento reduzido funcionam.
7. A assinatura não promete mastery, emprego, produtividade garantida ou infalibilidade da IA.
8. A variante implementada passa pelo teste de compreensão abaixo antes de adoção transversal.

## 8. Plano de teste

### Objetivo

Verificar se a proposta melhora compreensão da escola, escolha de trilha e confiança sem enfraquecer a compreensão dos gates.

### Participantes

- 5 pessoas não programadoras que já tentaram usar IA pelo menos uma vez.
- 5 desenvolvedores com diferentes níveis de experiência em IA.
- Recrutamento separado de colaboradores do projeto; registrar limitações da amostra.

### Método

Teste moderado remoto de 25 minutos, comparando a entrada atual e o protótipo em ordem balanceada. Não revelar a intenção da marca antes das tarefas.

### Tarefas

1. “Sem clicar, diga o que esta escola oferece e para quem.”
2. “Escolha por onde começaria para melhorar uma tarefa de trabalho.”
3. “Agora imagine que quer construir um sistema robusto com IA. Onde iria?”
4. “Depois de concluir uma missão, o que você acredita que ficou comprovado?”
5. “Troque de trilha e diga o que espera preservar.”

### Métricas e limiares de decisão

- ≥ 8/10 identificam espontaneamente as duas rotas.
- ≥ 8/10 escolhem a trilha compatível com cada cenário sem ajuda.
- ≥ 8/10 explicam que conclusão local não significa domínio verificado.
- Mediana ≤ 20 s para escolher a primeira trilha.
- Nenhuma falha crítica de teclado, contraste ou compreensão de estado.
- Preferência é coletada, mas não decide sozinha; compreensão e sucesso de tarefa têm prioridade.

### Registro

Guardar apenas notas anonimizadas: perfil amplo, tarefa, resultado, citação curta consentida, severidade e observação. Não coletar prompts pessoais, dados de trabalho ou credenciais.

## 9. Decisões e próximos passos

### Decisões pedidas ao CEO

1. Aprovar ou revisar a essência **“Conhecimento de IA que se prova na prática”**.
2. Aprovar teste da assinatura **“Aprenda. Pratique. Comprove.”**.
3. Confirmar arquitetura endossada: marca-mãe visível + duas trilhas + engines em segundo plano.

### Depois da decisão

- Research/UX: testar linguagem e protótipo com 10 participantes.
- Design/Engenharia: auditar contraste e mapear tokens antes de qualquer mudança transversal.
- Conteúdo/Currículo: revisar termos de progresso e gate; somente a ownership curricular pode alterar linguagem com implicação de mastery.
- Donos de engine: validar a aplicação sem romper bounded contexts ou criar estado compartilhado novo.

## 10. Limitações

Esta proposta deriva de documentação e implementação local. Não havia acesso a entrevistas recentes, analytics agregados, pesquisa de marca ou testes com aprendizes. Portanto, a direção é uma hipótese informada — não evidência de sucesso. Nenhum código, currículo, gate, learner state ou produção foi alterado.
