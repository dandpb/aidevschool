import { useState } from 'react'

type EvaluationProfile = {
  readonly name: string
  readonly input: string
  readonly steps: readonly string[]
  readonly outputs: readonly string[]
  readonly boundary: string
}

const evaluationProfiles: Readonly<Record<string, EvaluationProfile>> = {
  minimaxDojo: {
    name: 'minimaxDojo Tutor Core',
    input: 'Tentativa do aprendiz + ponto exato de confusão',
    steps: ['Tentativa do aprendiz', 'Hipótese de tutoria', 'Pergunta socrática', 'Verificação independente'],
    outputs: ['feedback proposto', 'próxima pergunta', 'gate ainda aberto'],
    boundary: 'A demonstração não antecipa a solução e não fecha gate ou domínio.',
  },
  miniMaxEvolutionEngine: {
    name: 'MiniMax Evolution Engine',
    input: 'Fase atual + artefatos + status YAML do pipeline',
    steps: ['Planejar', 'Transição proposta', 'Produzir', 'Verificar em contexto separado'],
    outputs: ['próximo comando sugerido', 'artefatos esperados', 'verificador exigido'],
    boundary: 'Uma transição simulada não altera learner/pipeline_status.yaml.',
  },
  openclaw: {
    name: 'OpenClaw',
    input: 'Fase + projeto + presença dos artefatos declarados',
    steps: ['Inspecionar artefatos', 'Resultado do checklist', 'Expor lacunas', 'Aguardar verificação'],
    outputs: ['itens presentes', 'itens ausentes', 'preview sem mutação'],
    boundary: 'Checklist prova presença e tamanho, não correção, verificação ou domínio.',
  },
  aiDevschoolMvp: {
    name: 'AiDevSchool MVP',
    input: 'Estado local + unidade + evidência já registrada',
    steps: ['Escolher atividade', 'Tentativa registrada', 'Registrar evidência', 'Solicitar gate independente'],
    outputs: ['próxima ação explicada', 'critérios do gate', 'progresso auditável'],
    boundary: 'A avaliação web não instala o runtime, não grava ledger e não concede domínio.',
  },
}

export function hasStaticEngineEvaluation(engineId: string): boolean {
  return evaluationProfiles[engineId] !== undefined
}

export function StaticEngineEvaluation({ engineId }: { readonly engineId: string }) {
  const profile = evaluationProfiles[engineId]
  const [stepIndex, setStepIndex] = useState(0)

  if (profile === undefined) return null

  return (
    <section className="static-engine-evaluation" aria-label={`Avaliação web · ${profile.name}`}>
      <header>
        <span className="section-label">DEMONSTRADOR DE CONTRATO · SOMENTE LEITURA</span>
        <h3>{profile.steps[stepIndex]}</h3>
        <p>{profile.input}</p>
      </header>
      <ol aria-label="Fluxo declarado">
        {profile.steps.map((step, index) => (
          <li key={step} aria-current={index === stepIndex ? 'step' : undefined}>
            <span>{index + 1}</span>{step}
          </li>
        ))}
      </ol>
      <div className="static-engine-outputs">
        <strong>Saídas declaradas pelo motor</strong>
        <ul>{profile.outputs.map((output) => <li key={output}>{output}</li>)}</ul>
      </div>
      <p className="static-engine-boundary"><strong>Limite verificável:</strong> {profile.boundary}</p>
      <p>Esta superfície percorre o contrato em modo somente leitura; ela não executa o motor Python.</p>
      <button
        className="primary-action"
        type="button"
        onClick={() => setStepIndex((current) => (current + 1) % profile.steps.length)}
      >
        Avançar simulação
      </button>
    </section>
  )
}
