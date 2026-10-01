import { Bug, CheckCircle2, ClipboardCopy, ListChecks, RotateCcw } from 'lucide-react'
import { useEffect, useRef, useReducer } from 'react'
import { guidedPracticeProjection } from '../data/generated/guidedPractice'
import type { LearningContext } from '../domain'
import {
  buildPracticeReceipt,
  conclusionBlockers,
  initialGuidedPracticeState,
  openRetryTargets,
  reduceGuidedPractice,
  type RubricVerdict,
} from './guidedPracticeCycle'

const VERDICT_OPTIONS: readonly { readonly value: RubricVerdict; readonly label: string }[] = [
  { value: 'met', label: 'Atendido' },
  { value: 'partial', label: 'Parcial (justifique)' },
  { value: 'not_met', label: 'Não atendido' },
]

type GuidedPracticeAppProps = {
  readonly onTeach?: (context: LearningContext) => void
  // AID-3527: fired exactly once when the guided cycle concludes with the
  // deterministic receipt (OS-native mission completion).
  readonly onConcluded?: () => void
}

export function GuidedPracticeApp({ onTeach, onConcluded }: GuidedPracticeAppProps) {
  const projection = guidedPracticeProjection
  const [state, dispatch] = useReducer(
    (current, event) => reduceGuidedPractice(current, event, projection),
    initialGuidedPracticeState(projection),
  )
  const blockers = conclusionBlockers(state, projection)
  const receipt = buildPracticeReceipt(state, projection)
  const concludedRef = useRef(false)
  useEffect(() => {
    if (state.phase !== 'concluida' || concludedRef.current) return
    concludedRef.current = true
    onConcluded?.()
  }, [onConcluded, state.phase])

  const recordedEvidence = state.stepEvidence.filter((evidence) => evidence.trim() !== '').length
  const retryTargets = openRetryTargets(state)

  const copyReceipt = () => {
    void navigator.clipboard?.writeText(receipt)
    onTeach?.({
      eyebrow: 'Prática guiada',
      title: 'Recibo copiado',
      summary:
        'O recibo da prática registra evidências, rúbrica e takeaway contra a versão exata do conteúdo.',
      concepts: [
        { name: 'Recibo determinístico', detail: 'Mesma sessão e mesmo conteúdo produzem o mesmo recibo.' },
      ],
      challenge: 'Compare o seu recibo com o de um colega: o que muda e o que permanece?',
    })
  }

  return (
    <div className="practice-app">
      <header>
        <span className="section-label">PRÁTICA GUIADA · {projection.anchorLessonId.toUpperCase()} · TRILHA {projection.track.toUpperCase()}</span>
        <h1>{projection.title}</h1>
        <p>
          {projection.objective} Sessão de {projection.estimatedMinutes.min}–{projection.estimatedMinutes.max} min.
          Conteúdo canônico: <code>{projection.contentVersion}</code>.
        </p>
        <ol className="practice-phase-rail" aria-label="Fases do ciclo guiado">
          {(['exemplo', 'tentativa', 'feedback', 'retry', 'takeaway'] as const).map((phase) => (
            <li
              key={phase}
              aria-current={state.phase === phase ? 'step' : undefined}
              data-state={state.phase === phase ? 'active' : state.phase === 'concluida' ? 'done' : 'idle'}
            >
              {phase}
            </li>
          ))}
        </ol>
      </header>

      {/* Sticky action bar (AID-3527 review item 3): the current phase's
          primary action stays reachable even when the OS "Modo Aprender"
          bottom sheet covers the lower half of the window. */}
      <div className="practice-action-bar">
        {state.phase === 'exemplo' && (
          <button type="button" className="practice-primary" onClick={() => dispatch({ type: 'exemplo-concluido' })}>
            Li o exemplo e vou para a tentativa
          </button>
        )}
        {state.phase === 'tentativa' && (
          <>
            <button
              type="button"
              className="practice-primary"
              disabled={recordedEvidence < state.stepEvidence.length}
              onClick={() => dispatch({ type: 'tentativa-concluida' })}
            >
              Concluir a tentativa e avaliar pela rúbrica
            </button>
            {recordedEvidence < state.stepEvidence.length && (
              <small className="practice-note">
                Evidência registrada em {recordedEvidence}/{state.stepEvidence.length} passos — registre
                o comando e a saída real de cada passo para continuar.
              </small>
            )}
          </>
        )}
        {state.phase === 'feedback' && (
          <>
            <button
              type="button"
              className="practice-primary"
              onClick={() => dispatch({ type: 'takeaway-registrado', a: state.takeaway.a, b: state.takeaway.b })}
            >
              Rúbrica registrada — ir para o takeaway
            </button>
            {retryTargets.length > 0 && (
              <button type="button" onClick={() => dispatch({ type: 'retry-pedido' })}>
                <RotateCcw size={14} aria-hidden /> Retry: refazer apenas os critérios reprovados (
                {retryTargets.join(', ')})
              </button>
            )}
          </>
        )}
        {state.phase === 'retry' && (
          <button type="button" className="practice-primary" onClick={() => dispatch({ type: 'retry-concluido' })}>
            <RotateCcw size={14} aria-hidden /> Retry concluído — voltar à rúbrica
          </button>
        )}
        {(state.phase === 'takeaway' || state.phase === 'concluida') && (
          <>
            {state.phase === 'takeaway' ? (
              <button
                type="button"
                className="practice-primary"
                disabled={blockers.length > 0}
                onClick={() => dispatch({ type: 'pratica-concluida' })}
              >
                <CheckCircle2 size={14} aria-hidden /> Concluir a prática e emitir o recibo
              </button>
            ) : (
              <button type="button" className="practice-primary" onClick={copyReceipt}>
                <ClipboardCopy size={14} aria-hidden /> Copiar recibo
              </button>
            )}
            {state.phase === 'takeaway' && blockers.length > 0 && (
              <small className="practice-note">Pendências antes de concluir: {blockers.join(', ')}</small>
            )}
          </>
        )}
      </div>

      {state.phase === 'exemplo' && (
        <section aria-labelledby="practice-exemplo-title">
          <h2 id="practice-exemplo-title">1. Exemplo trabalhado</h2>
          <details open className="practice-source">
            <summary>
              Leia <code>{projection.exemplar.sourcePath}</code> antes de tentar — a sua tentativa usa a mesma
              disciplina num problema de natureza diferente.
            </summary>
            <pre>{projection.exemplar.markdown}</pre>
          </details>
        </section>
      )}

      {state.phase === 'tentativa' && (
        <section aria-labelledby="practice-tentativa-title">
          <h2 id="practice-tentativa-title">2. Tentativa — registre a evidência de cada passo</h2>
          <ol className="practice-steps">
            {projection.attemptSteps.map((step, index) => (
              <li key={step}>
                <ListChecks size={14} aria-hidden />
                <span>{step}</span>
                <label>
                  Comando + saída real do passo {index + 1}
                  <textarea
                    rows={2}
                    value={state.stepEvidence[index]}
                    onChange={(event) =>
                      dispatch({ type: 'passo-evidenciado', step: index + 1, evidence: event.target.value })
                    }
                    aria-label={`Evidência do passo ${index + 1}`}
                  />
                </label>
              </li>
            ))}
          </ol>
          <details className="practice-source">
            <summary>Insumos da prática (bug report, regra e fixture — sem rede, sem conta)</summary>
            {projection.inputs.map((input) => (
              <details key={input.path} className="practice-input">
                <summary>
                  <code>{input.path}</code> · {input.role}
                </summary>
                <pre>{input.contents}</pre>
              </details>
            ))}
          </details>
        </section>
      )}

      {(state.phase === 'feedback' || state.phase === 'retry') && (
        <section aria-labelledby="practice-feedback-title">
          <h2 id="practice-feedback-title">
            {state.phase === 'retry' ? '4. Retry — refaça apenas os critérios reprovados' : '3. Feedback pela rúbrica'}
          </h2>
          {state.phase === 'retry' && (
            <p className="practice-note">
              Alvos deste retry: {state.retryTargets.join(', ')}. Os demais critérios seguem travados.
            </p>
          )}
          <ul className="practice-rubric">
            {projection.rubric.map((criterion) => {
              const assessment = state.assessments[criterion.id]
              const locked = state.phase === 'retry' && !state.retryTargets.includes(criterion.id)
              return (
                <li key={criterion.id} className={locked ? 'practice-locked' : undefined}>
                  <details>
                    <summary>
                      <code>{criterion.id}</code> {criterion.criterion}
                    </summary>
                    <p>
                      <Bug size={14} aria-hidden /> perCheck: {criterion.perCheck}
                    </p>
                  </details>
                  <fieldset disabled={locked}>
                    <legend>Veredito</legend>
                    {VERDICT_OPTIONS.map((option) => (
                      <label key={option.value}>
                        <input
                          type="radio"
                          name={`verdict-${criterion.id}`}
                          checked={assessment.verdict === option.value}
                          onChange={() =>
                            dispatch({
                              type: 'criterio-avaliado',
                              criterion: criterion.id,
                              verdict: option.value,
                              evidence: assessment.evidence,
                              partialJustification: assessment.partialJustification,
                            })
                          }
                        />
                        {option.label}
                      </label>
                    ))}
                    <label>
                      Evidência (comando/saída/diff citado)
                      <textarea
                        rows={2}
                        value={assessment.evidence}
                        onChange={(event) =>
                          dispatch({
                            type: 'criterio-avaliado',
                            criterion: criterion.id,
                            verdict: assessment.verdict,
                            evidence: event.target.value,
                          })
                        }
                        aria-label={`Evidência do critério ${criterion.id}`}
                      />
                    </label>
                    {assessment.verdict === 'partial' && (
                      <label>
                        Justificativa do parcial
                        <textarea
                          rows={2}
                          value={assessment.partialJustification}
                          onChange={(event) =>
                            dispatch({
                              type: 'criterio-avaliado',
                              criterion: criterion.id,
                              verdict: 'partial',
                              evidence: assessment.evidence,
                              partialJustification: event.target.value,
                            })
                          }
                          aria-label={`Justificativa do parcial em ${criterion.id}`}
                        />
                      </label>
                    )}
                  </fieldset>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {(state.phase === 'takeaway' || state.phase === 'concluida') && (
        <section aria-labelledby="practice-takeaway-title">
          <h2 id="practice-takeaway-title">5. Takeaway</h2>
          <label>
            (a) {projection.takeawayPrompts.a}
            <textarea
              rows={2}
              value={state.takeaway.a}
              onChange={(event) =>
                dispatch({ type: 'takeaway-registrado', a: event.target.value, b: state.takeaway.b })
              }
            />
          </label>
          <label>
            (b) {projection.takeawayPrompts.b}
            <textarea
              rows={2}
              value={state.takeaway.b}
              onChange={(event) =>
                dispatch({ type: 'takeaway-registrado', a: state.takeaway.a, b: event.target.value })
              }
            />
          </label>
          {state.phase === 'concluida' && (
            <p className="practice-note">
              Prática concluída com {state.attempt} tentativa(s). O recibo abaixo é determinístico para este
              conteúdo ({projection.contentVersion}); arquive-o junto com o seu diff — é o seu recibo da
              prática. Registro: o recibo é local e demonstrativo — não prova execução externa do aluno.
            </p>
          )}
          {state.phase === 'concluida' && (
            <pre className="practice-receipt">{receipt}</pre>
          )}
        </section>
      )}
    </div>
  )
}
