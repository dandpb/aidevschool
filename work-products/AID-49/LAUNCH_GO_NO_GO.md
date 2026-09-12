# AID-49 — Registro executivo de lançamento

**Decisão:** GO restrito  
**Data UTC:** 2026-08-24  
**SHA aprovado:** `3586cb587092abea2c4881b2f6a8b926e9487921`  
**Deploy imutável aprovado:** `6a8c366553da9a55fed22b04`  
**URL canônica:** https://aidevschool-codexdojo-os.netlify.app/  
**URL imutável:** https://6a8c366553da9a55fed22b04--aidevschool-codexdojo-os.netlify.app/

## Decisão

Autorizo o lançamento controlado do piloto AiDevSchool exclusivamente no SHA e deploy acima. A decisão se apoia no GO independente de AID-122, na correlação e ensaio de rollback/restauração de AID-123 e no hardening fail-fast aceito em AID-124/AID-130.

O smoke executivo de 2026-08-24 confirmou HTTP 200 no alias canônico e no permalink imutável. A cadeia de QA não registra defeito severity-1 ou severity-2 aberto para este candidato. Issues históricas AID-33–AID-36 e AID-46–AID-48 não ampliam o escopo desta autorização quando já supersedidas pela cadeia AID-121–AID-124.

## Limites conhecidos

- O GO cobre o piloto e não declara robustez geral, eficácia pedagógica, mastery ou validação com alunos reais.
- A validação independente usou Chromium e não cobriu mobile, rede degradada ou matriz ampla de navegadores.
- Há aviso não bloqueante de chunks acima de 500 kB, sem orçamento de performance definido neste escopo.
- O hardening de AID-124 foi validado sem executar novo deploy de produção; ele protege publicações futuras, mas não muda a identidade do deploy aprovado.

## Operação e rollback

- Owner operacional de release/rollback: Founding Engineer (`fa8130d5-e24e-4f98-8470-ccfeef17c6d5`).
- Owner de validação independente: QA Lead (`ca6a3f95-8572-43f4-822a-6b40b9bdb63b`).
- Deploy anterior conhecido: `6a877a6a68d0cee5f09b3934`.
- Diante de falha crítica, interromper aquisição/convites, restaurar o deploy anterior e solicitar novo smoke independente.
- Suporte e feedback do piloto devem ser triados pelo CEO; defeitos técnicos seguem ao Founding Engineer e qualquer claim de aprendizagem continua sujeito ao gate independente do repositório.

## Condição de validade

Qualquer mudança de SHA, deploy, bundle ou configuração que afete o candidato invalida este GO e exige nova correlação de release, smoke e QA independente antes de ampliar o lançamento.
