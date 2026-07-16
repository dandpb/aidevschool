import { Maximize2, Minimize2, ServerCog } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { type EmbeddedEvidenceReceipt, readEmbeddedEvidenceMessage } from './evidence'
import { resolveEngineUrl } from './registry'

export type EmbeddedEngineProps = {
  readonly engineName: string
  readonly configuredUrl: string | undefined
  readonly developmentUrl: string
  readonly development: boolean
  readonly focused: boolean
  readonly onToggleFocus: () => void
  readonly evidenceSource: EmbeddedEvidenceReceipt['source'] | null
}

export function EmbeddedEngine({
  engineName,
  configuredUrl,
  developmentUrl,
  development,
  focused,
  onToggleFocus,
  evidenceSource,
}: EmbeddedEngineProps) {
  const runtime = resolveEngineUrl(configuredUrl, developmentUrl, development)
  const runtimeUrl = runtime.kind === 'ready' ? runtime.url : null
  const frameRef = useRef<HTMLIFrameElement>(null)
  const [evidence, setEvidence] = useState<EmbeddedEvidenceReceipt | null>(null)

  useEffect(() => {
    if (runtimeUrl === null) return
    const receiveEvidence = (event: MessageEvent<unknown>) => {
      const receipt = readEmbeddedEvidenceMessage(
        event,
        frameRef.current?.contentWindow ?? null,
        runtimeUrl,
        evidenceSource,
      )
      if (receipt !== null) setEvidence(receipt)
    }
    window.addEventListener('message', receiveEvidence)
    return () => window.removeEventListener('message', receiveEvidence)
  }, [evidenceSource, runtimeUrl])

  if (runtime.kind === 'unavailable') {
    return (
      <div className="engine-unavailable" role="status">
        <ServerCog />
        <strong>Runtime não está configurado</strong>
        <p>{runtime.reason}</p>
      </div>
    )
  }

  return (
    <div className="embedded-engine">
      <div className="embedded-engine-toolbar">
        <span>{engineName}</span>
        <button type="button" onClick={onToggleFocus}>
          {focused ? <Minimize2 /> : <Maximize2 />}
          {focused ? 'Voltar ao Hub' : 'Expandir motor'}
        </button>
      </div>
      <iframe
        ref={frameRef}
        className="engine-frame"
        title={`${engineName} integrado`}
        src={runtime.url}
        sandbox="allow-forms allow-pointer-lock allow-same-origin allow-scripts"
        allow="fullscreen; clipboard-write"
        referrerPolicy="strict-origin"
      />
      {evidence === null ? null : <EmbeddedEvidenceReceiptView evidence={evidence} />}
    </div>
  )
}

function EmbeddedEvidenceReceiptView({ evidence }: { readonly evidence: EmbeddedEvidenceReceipt }) {
  return (
    <div className={evidence.pass ? 'embedded-evidence pass' : 'embedded-evidence fail'} role="status">
      <div>
        <strong>Evidência bruta recebida</strong>
        <span>{evidence.project} · {evidence.attemptId}</span>
      </div>
      <div>
        <b>{evidence.pass ? 'PASS produzido' : 'FAIL produzido'} · {evidence.source}</b>
        <span>Verificação independente obrigatória</span>
      </div>
    </div>
  )
}
