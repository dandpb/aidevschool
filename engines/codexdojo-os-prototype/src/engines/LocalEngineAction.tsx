import { Play } from 'lucide-react'
import { useState } from 'react'
import type { EngineActionResult, EngineId } from './protocol'

type LocalActionState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'running' }
  | { readonly kind: 'complete'; readonly result: EngineActionResult }

export type EngineActionRunner = (
  engineId: EngineId,
  action: string,
) => Promise<EngineActionResult>

export type LocalEngineActionProps = {
  readonly engineId: EngineId
  readonly action: string
  readonly label: string
  readonly runAction: EngineActionRunner
}

export function LocalEngineAction({
  engineId,
  action,
  label,
  runAction,
}: LocalEngineActionProps) {
  const [state, setState] = useState<LocalActionState>({ kind: 'idle' })

  const run = async () => {
    setState({ kind: 'running' })
    try {
      const result = await runAction(engineId, action)
      setState({ kind: 'complete', result })
    } catch (error) {
      const output = error instanceof Error ? error.message : 'Falha desconhecida da ponte local.'
      setState({
        kind: 'complete',
        result: { ok: false, summary: 'A ação local falhou', output },
      })
    }
  }

  return (
    <div className="local-engine-action">
      <button
        type="button"
        className="primary-action"
        disabled={state.kind === 'running'}
        onClick={run}
      >
        <Play /> {state.kind === 'running' ? 'Executando…' : label}
      </button>
      <p>Esta execução é isolada e não concede domínio nem grava o estado canônico do aprendiz.</p>
      {state.kind === 'complete' ? (
        <div className={state.result.ok ? 'engine-receipt pass' : 'engine-receipt fail'} role="status">
          <strong>{state.result.summary}</strong>
          <pre>{state.result.output}</pre>
        </div>
      ) : null}
    </div>
  )
}
