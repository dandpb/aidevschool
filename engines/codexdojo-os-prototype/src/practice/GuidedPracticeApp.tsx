import { Bug, CheckCircle2, ClipboardCopy, ListChecks, RotateCcw } from 'lucide-react'
import { useEffect, useReducer, useRef, useState } from 'react'
import { guidedPracticeDailyProjection, guidedPracticeProjection } from '../data/generated/guidedPractice'
import type { LearningContext } from '../domain'
import { coreContexts } from '../learning/learningContexts'
import {
  isDailyGuidedPractice,
  type AnyGuidedPracticeProjection,
  type GuidedPracticeId,
} from './guidedPracticeTypes'
import {
  buildDailyPracticeReceipt,
  buildPracticeReceipt,
  conclusionBlockers,
  initialGuidedPracticeState,
  openRetryTargets,
  reduceGuidedPractice,
  verdictPolicyOf,
  type CyclePhase,
} from './guidedPracticeCycle'
import { DAILY_PRACTICE_CHOICE, dailyLearningContext } from './dailyPresentation'
import { StructuredMarkdown, renderInlineMarkdown } from './structuredMarkdown'

// Single projection registry (AID-3590): pg-d01 stays the DEFAULT and the
// only practice the embedded AC1 mission runtime ever renders; pg-c01 is the
// daily practice, selectable only on the standalone surface.
export const GUIDED_PRACTICE_PROJECTIONS: Readonly<
  Record<GuidedPracticeId, AnyGuidedPracticeProjection>
> = {
  'pg-d01': guidedPracticeProjection,
  'pg-c01': guidedPracticeDailyProjection,
}

const VERDICT_OPTIONS_GRADED: readonly { readonly value: 'met' | 'partial' | 'not_met'; readonly label: string }[] = [
  { value: 'met', label: 'Atendido' },
  { value: 'partial', label: 'Parcial (justifique)' },
  { value: 'not_met', label: 'Não atendido' },
]

const VERDICT_OPTIONS_DAILY: readonly { readonly value: 'sufficient' | 'insufficient'; readonly label: string }[] = [
  { value: 'sufficient', label: 'Suficiente' },
  { value: 'insufficient', label: 'Insuficiente' },
]

type GuidedPracticeAppProps = {
  // Embedded AC1 (MissionShell) passes no id: it is pinned to pg-d01 and its
  // onConcluded callback credits the pg-d01 mission. Only the standalone
  // surface (GuidedPracticeStandaloneApp) selects pg-c01.
  readonly practiceId?: GuidedPracticeId
  readonly onTeach?: (context: LearningContext) => void
  // AID-3527: fired exactly once when the guided cycle concludes with the
  // deterministic receipt (OS-native mission completion). AID-3590: it fires
  // ONLY for pg-d01 — a pg-c01 conclusion/receipt is never accepted by the
  // callback that credits the pg-d01 mission.
  readonly onConcluded?: () => void
  // Standalone switch gate (AID-3590): reports the session phase so the
  // chooser can block content switches during an active attempt.
  readonly onPhaseChange?: (phase: CyclePhase) => void
}

export function GuidedPracticeApp({ practiceId = 'pg-d01', onTeach, onConcluded, onPhaseChange }: GuidedPracticeAppProps) {
  const projection = GUIDED_PRACTICE_PROJECTIONS[practiceId]
  const isDaily = isDailyGuidedPractice(projection)
  const policy = verdictPolicyOf(projection)
  const verdictOptions = isDaily ? VERDICT_OPTIONS_DAILY : VERDICT_OPTIONS_GRADED
  const [state, dispatch] = useReducer(
    (current, event) => reduceGuidedPractice(current, event, projection),
    initialGuidedPracticeState(projection),
  )
  const blockers = conclusionBlockers(state, projection)
  const receipt = isDaily
    ? buildDailyPracticeReceipt(state, projection)
    : buildPracticeReceipt(state, projection)
  const concludedRef = useRef(false)
  useEffect(() => {
    if (state.phase !== 'concluida' || concludedRef.current) return
    concludedRef.current = true
    if (practiceId === 'pg-d01') onConcluded?.()
  }, [onConcluded, practiceId, state.phase])

  const phaseChangeRef = useRef(onPhaseChange)
  phaseChangeRef.current = onPhaseChange
  useEffect(() => {
    phaseChangeRef.current?.(state.phase)
  }, [state.phase])

  const recordedEvidence = state.stepEvidence.filter((evidence) => evidence.trim() !== '').length
  const retryTargets = openRetryTargets(state, projection)
  const retryExhausted =
    isDaily && policy.retryAttemptCap !== null && state.attempt >= policy.retryAttemptCap

  // AID-3564 F1: every phase transition must land focus on a meaningful
  // element (the new phase's heading) instead of dropping it to <body>.
  // Headings are never disabled, so focus always sticks.
  const phaseHeadingRefs = useRef<Partial<Record<CyclePhase, HTMLHeadingElement | null>>>({})
  const mountedRef = useRef(false)
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true
      return
    }
    const heading =
      phaseHeadingRefs.current[state.phase] ?? phaseHeadingRefs.current.takeaway
    if (heading !== undefined && heading !== null) heading.focus()
  }, [state.phase])

  const copyReceipt = () => {
    void navigator.clipboard?.writeText(receipt)
    onTeach?.({
      eyebrow: 'Prática guiada',
      title: 'Recibo copiado',
      summary:
        'O recibo da prática registra evidências, critérios e takeaway contra a versão exata do conteúdo.',
      concepts: [
        { name: 'Recibo determinístico', detail: 'Mesma sessão e mesmo conteúdo produzem o mesmo recibo.' },
      ],
      challenge: 'Compare o seu recibo com o de um colega: o que muda e o que permanece?',
    })
  }

  const stepsTotal = state.stepEvidence.length
  const stepInstructions = isDaily
    ? projection.steps.map((step) => step.instruction)
    : projection.attemptSteps
  const stepIds = isDaily ? projection.steps.map((step) => step.id) : null

  return (
    <div className="practice-app">
      <header>
        {isDaily ? (
          <>
            <span className="section-label">
              PRÁTICA GUIADA · COTIDIANO · JORNADA {projection.package.journey.toUpperCase()} ·{' '}
              {projection.package.audience.toUpperCase()}
            </span>
            {/* AID-3643 (P3): human title primary; technical identity
                (practiceId · package slug · canonical projection pins)
                subordinated below it — same strings, new hierarchy. */}
            <h1>{DAILY_PRACTICE_CHOICE.title}</h1>
            <p className="practice-identity">
              {projection.practiceId} · {projection.package.id} {projection.package.version} · Projeção canônica:{' '}
              <code>{projection.contentVersion}</code> ·{' '}
              <code>{projection.projectionPin.artifactSha256.slice(0, 12)}</code>.
            </p>
            <StructuredMarkdown className="practice-objective" text={projection.objective} />
            <p className="practice-app-header-note">
              Prática simulada — não gera nota, mastered ou certificado.
            </p>
          </>
        ) : (
          <>
            <span className="section-label">PRÁTICA GUIADA · {projection.anchorLessonId.toUpperCase()} · TRILHA {projection.track.toUpperCase()}</span>
            <h1>{projection.title}</h1>
            <p>
              {projection.objective} Sessão de {projection.estimatedMinutes.min}–{projection.estimatedMinutes.max} min.
              Conteúdo canônico: <code>{projection.contentVersion}</code>.
            </p>
          </>
        )}
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
      <section className="practice-action-bar" aria-label="Ação da fase atual">
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
              disabled={recordedEvidence < stepsTotal}
              onClick={() => dispatch({ type: 'tentativa-concluida' })}
            >
              Concluir a tentativa e avaliar {isDaily ? 'pelos critérios' : 'pela rúbrica'}
            </button>
            {recordedEvidence < stepsTotal && (
              <small className="practice-note">
                Evidência registrada em {recordedEvidence}/{stepsTotal} {isDaily ? 'peças' : 'passos'} — registre
                {isDaily ? ' a peça de cada etapa (pedido, tabela, aviso)' : ' o comando e a saída real de cada passo'} para
                continuar.
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
              {isDaily ? 'Critérios registrados — ir para o takeaway' : 'Rúbrica registrada — ir para o takeaway'}
            </button>
            {retryTargets.length > 0 && !retryExhausted && (
              <button type="button" onClick={() => dispatch({ type: 'retry-pedido' })}>
                <RotateCcw size={14} aria-hidden /> Retry: {retryTargets.length} critério
                {retryTargets.length === 1 ? '' : 's'} {isDaily ? 'insuficiente' : 'reprovado'}
                {retryTargets.length === 1 ? '' : 's'}
              </button>
            )}
            {retryTargets.length > 0 && retryExhausted && (
              <small className="practice-note">
                Critérios ainda insuficientes na 2ª tentativa — o contrato cotidiano conclui a prática apenas
                com os {projection.criteria.length} critérios suficientes na 1ª ou 2ª tentativa.
              </small>
            )}
          </>
        )}
        {state.phase === 'retry' && (
          <button
            type="button"
            className="practice-primary"
            disabled={isDaily && state.retryResponse.trim() === ''}
            onClick={() => dispatch({ type: 'retry-concluido' })}
          >
            <RotateCcw size={14} aria-hidden /> Retry concluído — voltar {isDaily ? 'aos critérios' : 'à rúbrica'}
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
      </section>

      {state.phase === 'exemplo' && isDaily && (
        <section aria-labelledby="practice-exemplo-title">
          <h2 id="practice-exemplo-title">1. Exemplo trabalhado</h2>
          <details open className="practice-source">
            <summary>
              Leia <code>{projection.workedExample.sourcePath}</code> antes de tentar — a sua tentativa usa a mesma
              disciplina num problema de natureza diferente.
            </summary>
            <StructuredMarkdown text={projection.workedExample.markdown} />
          </details>
          <details className="practice-source">
            <summary>Insumos da prática (recado, grupo e resposta da IA — sem rede, sem conta)</summary>
            <details className="practice-input">
              <summary>
                <code>{projection.inputs.fonte1.file}</code> · linhas {projection.inputs.fonte1.anchorKind}
              </summary>
              <ul>
                {projection.inputs.fonte1.lines.map((line) => (
                  <li key={line.id}>
                    <code>{line.id}</code> {renderInlineMarkdown(line.text, `f1-${line.id}`)}
                  </li>
                ))}
              </ul>
            </details>
            <details className="practice-input">
              <summary>
                <code>{projection.inputs.fonte2.file}</code> · linhas {projection.inputs.fonte2.anchorKind}
              </summary>
              <ul>
                {projection.inputs.fonte2.lines.map((line) => (
                  <li key={line.id}>
                    <code>{line.id}</code> {renderInlineMarkdown(line.text, `f2-${line.id}`)}
                  </li>
                ))}
              </ul>
            </details>
            <details className="practice-input">
              <summary>
                <code>{projection.inputs.respostaIa.file}</code> · afirmações da IA
              </summary>
              <ul>
                {projection.inputs.respostaIa.statements.map((statement) => (
                  <li key={statement.id}>
                    <code>nº {statement.id}</code> {renderInlineMarkdown(statement.text, `ia-${statement.id}`)}
                  </li>
                ))}
              </ul>
            </details>
          </details>
          <details className="practice-source">
            <summary>Regras da prática</summary>
            <ul>
              {projection.rules.map((rule, index) => (
                <li key={rule}>{renderInlineMarkdown(rule, `rule-${index}`)}</li>
              ))}
            </ul>
          </details>
        </section>
      )}

      {state.phase === 'exemplo' && !isDaily && (
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
          <h2
            id="practice-tentativa-title"
            tabIndex={-1}
            ref={(node) => {
              phaseHeadingRefs.current.tentativa = node
            }}
          >
            2. Tentativa — registre a evidência de cada {isDaily ? 'etapa' : 'passo'}
          </h2>
          <ol className="practice-steps">
            {stepInstructions.map((step, index) => (
              <li key={step}>
                <ListChecks size={14} aria-hidden />
                <span>{isDaily ? renderInlineMarkdown(step, `step-${index}`) : step}</span>
                <label>
                  {isDaily ? `Peça da etapa ${stepIds?.[index]}` : `Comando + saída real do passo ${index + 1}`}
                  <textarea
                    rows={isDaily ? 4 : 2}
                    value={state.stepEvidence[index]}
                    onChange={(event) =>
                      dispatch({ type: 'passo-evidenciado', step: index + 1, evidence: event.target.value })
                    }
                    aria-label={isDaily ? `Peça da etapa ${stepIds?.[index]}` : `Evidência do passo ${index + 1}`}
                  />
                </label>
              </li>
            ))}
          </ol>
          {isDaily ? (
            <details className="practice-source" open>
              <summary>Insumos da prática (recado, grupo e resposta da IA — sem rede, sem conta)</summary>
              <details className="practice-input">
                <summary>
                  <code>{projection.inputs.fonte1.file}</code> · linhas {projection.inputs.fonte1.anchorKind}
                </summary>
                <ul>
                  {projection.inputs.fonte1.lines.map((line) => (
                    <li key={line.id}>
                      <code>{line.id}</code> {renderInlineMarkdown(line.text, `tf1-${line.id}`)}
                    </li>
                  ))}
                </ul>
              </details>
              <details className="practice-input">
                <summary>
                  <code>{projection.inputs.fonte2.file}</code> · linhas {projection.inputs.fonte2.anchorKind}
                </summary>
                <ul>
                  {projection.inputs.fonte2.lines.map((line) => (
                    <li key={line.id}>
                      <code>{line.id}</code> {renderInlineMarkdown(line.text, `tf2-${line.id}`)}
                    </li>
                  ))}
                </ul>
              </details>
              <details className="practice-input">
                <summary>
                  <code>{projection.inputs.respostaIa.file}</code> · afirmações da IA
                </summary>
                <ul>
                  {projection.inputs.respostaIa.statements.map((statement) => (
                    <li key={statement.id}>
                      <code>nº {statement.id}</code> {renderInlineMarkdown(statement.text, `tia-${statement.id}`)}
                    </li>
                  ))}
                </ul>
              </details>
            </details>
          ) : (
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
          )}
        </section>
      )}

      {(state.phase === 'feedback' || state.phase === 'retry') && !isDaily && (
        <section aria-labelledby="practice-feedback-title">
          <h2
            id="practice-feedback-title"
            tabIndex={-1}
            ref={(node) => {
              phaseHeadingRefs.current[state.phase as 'feedback' | 'retry'] = node
            }}
          >
            {state.phase === 'retry' ? '4. Retry — refaça apenas os critérios reprovados' : '3. Feedback pela rúbrica'}
          </h2>
          {state.phase === 'retry' ? (
            <p className="practice-note">
              Alvos deste retry: {state.retryTargets.join(', ')}. Os demais critérios seguem travados.
            </p>
          ) : retryTargets.length > 0 ? (
            <p className="practice-note">
              Critérios ainda não aprovados (alvos do retry): {retryTargets.join(', ')}.
            </p>
          ) : null}
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
                    {verdictOptions.map((option) => (
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

      {(state.phase === 'feedback' || state.phase === 'retry') && isDaily && (
        <section aria-labelledby="practice-feedback-title">
          <h2
            id="practice-feedback-title"
            tabIndex={-1}
            ref={(node) => {
              phaseHeadingRefs.current[state.phase as 'feedback' | 'retry'] = node
            }}
          >
            {state.phase === 'retry'
              ? '4. Retry — refaça apenas os critérios insuficientes'
              : '3. Feedback pelos critérios (veredito binário)'}
          </h2>
          {state.phase === 'retry' ? (
            <>
              <p className="practice-note">
                Alvos deste retry: {state.retryTargets.join(', ')}. Os demais critérios seguem travados.{' '}
                {renderInlineMarkdown(projection.retry.instruction, 'retry-note')}
              </p>
              <blockquote className="practice-note">
                IA insiste ({projection.retry.insistedStatement.id}): {projection.retry.insistedStatement.text}
              </blockquote>
              <label>
                Resposta à IA que insiste (re-cite as fontes)
                <textarea
                  rows={3}
                  value={state.retryResponse}
                  onChange={(event) => dispatch({ type: 'retry-respondido', response: event.target.value })}
                  aria-label="Resposta à IA que insiste"
                />
              </label>
            </>
          ) : retryTargets.length > 0 ? (
            <p className="practice-note">
              Critérios ainda insuficientes (alvos do retry): {retryTargets.join(', ')}.
            </p>
          ) : null}
          <ul className="practice-rubric">
            {projection.criteria.map((criterionId) => {
              const assessment = state.assessments[criterionId]
              const locked = state.phase === 'retry' && !state.retryTargets.includes(criterionId)
              const approvedFeedback = projection.feedbackByCriterion[criterionId]
              return (
                <li key={criterionId} className={locked ? 'practice-locked' : undefined}>
                  <details>
                    <summary>
                      <code>{criterionId}</code>
                    </summary>
                    {state.phase === 'retry' && approvedFeedback !== undefined && (
                      <p className="practice-note">
                        <Bug size={14} aria-hidden /> {renderInlineMarkdown(approvedFeedback, `fb-${criterionId}`)}
                      </p>
                    )}
                  </details>
                  <fieldset disabled={locked}>
                    <legend>Veredito</legend>
                    {verdictOptions.map((option) => (
                      <label key={option.value}>
                        <input
                          type="radio"
                          name={`verdict-${criterionId}`}
                          checked={assessment.verdict === option.value}
                          onChange={() =>
                            dispatch({
                              type: 'criterio-avaliado',
                              criterion: criterionId,
                              verdict: option.value,
                              evidence: assessment.evidence,
                            })
                          }
                        />
                        {option.label}
                      </label>
                    ))}
                    <label>
                      Evidência (peça + citação fonte/linha)
                      <textarea
                        rows={2}
                        value={assessment.evidence}
                        onChange={(event) =>
                          dispatch({
                            type: 'criterio-avaliado',
                            criterion: criterionId,
                            verdict: assessment.verdict,
                            evidence: event.target.value,
                          })
                        }
                        aria-label={`Evidência do critério ${criterionId}`}
                      />
                    </label>
                  </fieldset>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {(state.phase === 'takeaway' || state.phase === 'concluida') && (
        <section aria-labelledby="practice-takeaway-title">
          <h2
            id="practice-takeaway-title"
            tabIndex={-1}
            ref={(node) => {
              phaseHeadingRefs.current.takeaway = node
            }}
          >
            5. Takeaway
          </h2>
          {isDaily && <p className="practice-note">{projection.takeaway.instruction}</p>}
          <label>
            (a){' '}
            {isDaily ? renderInlineMarkdown(projection.takeaway.prompts[0], 'tk-a') : projection.takeawayPrompts.a}
            <textarea
              rows={2}
              value={state.takeaway.a}
              onChange={(event) =>
                dispatch({ type: 'takeaway-registrado', a: event.target.value, b: state.takeaway.b })
              }
            />
          </label>
          <label>
            (b){' '}
            {isDaily ? renderInlineMarkdown(projection.takeaway.prompts[1], 'tk-b') : projection.takeawayPrompts.b}
            <textarea
              rows={2}
              value={state.takeaway.b}
              onChange={(event) =>
                dispatch({ type: 'takeaway-registrado', a: state.takeaway.a, b: event.target.value })
              }
            />
          </label>
          {state.phase === 'concluida' && isDaily && (
            <p className="practice-note">
              Prática concluída com {state.attempt} tentativa(s). O recibo abaixo é determinístico para este
              conteúdo ({projection.contentVersion}, projeção {projection.projectionPin.artifactSha256.slice(0, 12)});
              arquive-o junto com as suas três peças — é o seu recibo da prática. Registro: o recibo é local e
              demonstrativo — não prova execução externa, não gera mastered nem certificado.
            </p>
          )}
          {state.phase === 'concluida' && !isDaily && (
            <p className="practice-note">
              Prática concluída com {state.attempt} tentativa(s). O recibo abaixo é determinístico para este
              conteúdo ({projection.contentVersion}); arquive-o junto com o seu diff — é o seu recibo da
              prática. Registro: o recibo é local e demonstrativo — não prova execução externa do aluno.
            </p>
          )}
          {state.phase === 'concluida' &&
            (isDaily ? (
              // AID-3643 (P2): the daily receipt displays with visible
              // structure while `receipt` (copied/archived) stays the exact
              // byte-identical deterministic string.
              <div className="practice-receipt">
                <StructuredMarkdown text={receipt} />
              </div>
            ) : (
              <pre className="practice-receipt">{receipt}</pre>
            ))}
        </section>
      )}
    </div>
  )
}

// AID-3590: standalone surface (OS "Prática Guiada" app). Explicit content
// choice lives ONLY here — the embedded AC1 runtime never renders a chooser.
// Session state is isolated per practiceId@contentVersion (React key remount:
// assessments, receipt and onConcluded never transport between contents).
// Switching during an active attempt requires an explicitly confirmed
// restart; outside an attempt the switch is free. Sessions are volatile:
// closing or minimizing the app dismounts the session (baseline behavior,
// documented — no persistence/resume claim in this slice).
const PRACTICE_CHOICES: readonly {
  readonly id: GuidedPracticeId
  readonly label: string
  readonly detail: string
}[] = [
  {
    id: 'pg-d01',
    label: 'pg-d01 · Dev: reproduza antes de perguntar',
    detail: 'Trilha Dev — rúbrica com vereditos atendido/parcial/não atendido.',
  },
  {
    id: DAILY_PRACTICE_CHOICE.id,
    label: DAILY_PRACTICE_CHOICE.label,
    detail: DAILY_PRACTICE_CHOICE.detail,
  },
]

export function GuidedPracticeStandaloneApp({
  onTeach,
  onRailContext,
}: {
  readonly onTeach?: (context: LearningContext) => void
  // AID-3643 (P2 LearningRail): updates ONLY the rail content (never forces
  // the rail open) so the orientation reflects the content actually in play.
  readonly onRailContext?: (context: LearningContext) => void
}) {
  const [selected, setSelected] = useState<GuidedPracticeId>('pg-d01')
  const [pendingSwitch, setPendingSwitch] = useState<GuidedPracticeId | null>(null)
  const [attemptActive, setAttemptActive] = useState(false)
  const projection = GUIDED_PRACTICE_PROJECTIONS[selected]
  const sessionKey = `${selected}@${projection.contentVersion}`

  const choose = (id: GuidedPracticeId) => {
    if (id === selected) return
    if (attemptActive) {
      setPendingSwitch(id)
      return
    }
    setSelected(id)
  }

  // While pg-c01 is the selected content, the rail orients on the daily
  // practice (projection-derived context); selecting pg-d01 restores the
  // accepted default practice context. Presentation-only: no teach event is
  // fired, so the rail's open/closed state never changes here.
  useEffect(() => {
    if (selected === 'pg-c01' && isDailyGuidedPractice(projection)) {
      onRailContext?.(dailyLearningContext(projection))
      return
    }
    onRailContext?.(coreContexts.practice)
  }, [onRailContext, projection, selected])

  return (
    <div className="practice-standalone">
      <nav className="practice-app practice-chooser" aria-label="Escolha da prática guiada">
        <p className="practice-note">
          Escolha o conteúdo da prática. A troca reinicia a sessão do conteúdo escolhido; sessões são
          independentes e nada é transportado entre elas.
        </p>
        {PRACTICE_CHOICES.map((choice) => (
          <button
            type="button"
            key={choice.id}
            aria-pressed={selected === choice.id}
            className={selected === choice.id ? 'practice-primary' : 'practice-choice'}
            onClick={() => choose(choice.id)}
          >
            {choice.label}
            <small className="practice-note"> — {choice.detail}</small>
          </button>
        ))}
        {pendingSwitch !== null && (
          <p className="practice-note" role="alert">
            Há uma tentativa em curso em {selected}. Trocar agora reinicia explicitamente esta sessão (as
            peças e critérios atuais são descartados — o contrato cotidiano não retoma tentativa no meio).
            <button type="button" className="practice-choice" onClick={() => {
              setSelected(pendingSwitch)
              setPendingSwitch(null)
              setAttemptActive(false)
            }}>
              Confirmar reinício e trocar para {pendingSwitch}
            </button>
            <button type="button" className="practice-choice" onClick={() => setPendingSwitch(null)}>
              Cancelar e continuar {selected}
            </button>
          </p>
        )}
        <p className="practice-note">
          Sessão local e volátil: fechar ou minimizar o app encerra a sessão sem persistir nada (sem conta,
          sem retomada nesta fatia).
        </p>
      </nav>
      <GuidedPracticeApp
        key={sessionKey}
        practiceId={selected}
        onTeach={onTeach}
        onPhaseChange={(phase) => setAttemptActive(phase !== 'exemplo' && phase !== 'concluida')}
      />
    </div>
  )
}
