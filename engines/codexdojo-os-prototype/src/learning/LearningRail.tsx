import { Bot, BrainCircuit, Send, Trophy, X } from 'lucide-react'
import { useState } from 'react'
import type { LearningContext } from '../domain'

export function LearningRail({ context, onClose }: { readonly context: LearningContext; readonly onClose: () => void }) {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('Posso explicar o conceito em linguagem simples, relacioná-lo ao que está na tela ou propor um pequeno desafio.')
  const ask = (text?: string) => {
    const prompt = (text ?? question).trim()
    if (!prompt) return
    const lower = prompt.toLowerCase()
    if (lower.includes('analogia')) setAnswer(`Pense em “${context.title}” como uma oficina: cada ferramenta tem uma função clara, e o sistema coordena quando e como ela pode ser usada.`)
    else if (lower.includes('código')) setAnswer('No código, isso aparece como estado explícito, contratos tipados e eventos pequenos. O próximo passo seria abrir o laboratório relacionado e observar uma mudança real de estado.')
    else setAnswer(`${context.summary} Em termos práticos, observe a ação na tela, identifique a entrada, a mudança de estado e a saída. Essa sequência revela o fundamento em uso.`)
    setQuestion('')
  }
  return (
    <aside className="learning-rail">
      <header><span><BrainCircuit /> Modo Aprender</span><button type="button" onClick={onClose} aria-label="Fechar Modo Aprender"><X /></button></header>
      <div className="learning-scroll">
        <span className="context-eyebrow">{context.eyebrow}</span>
        <h2>{context.title}</h2>
        <p>{context.summary}</p>
        <div className="concept-list">
          {context.concepts.map((concept, index) => (
            <div key={`${concept.name}-${index}`}><span>0{index + 1}</span><div><strong>{concept.name}</strong><p>{concept.detail}</p></div></div>
          ))}
        </div>
        <div className="mini-challenge"><Trophy /><div><span>DESAFIO RÁPIDO</span><p>{context.challenge}</p></div></div>
        <section className="mentor-box">
          <div className="mentor-heading"><span><Bot /> Mentor IA</span><i>PROTÓTIPO LOCAL</i></div>
          <p className="mentor-answer">{answer}</p>
          <div className="prompt-chips">
            <button type="button" onClick={() => ask('Explique com uma analogia')}>Use uma analogia</button>
            <button type="button" onClick={() => ask('Mostre no código')}>Leve ao código</button>
          </div>
          <form onSubmit={(event) => { event.preventDefault(); ask() }}>
            <input aria-label="Pergunta para o mentor local" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Pergunte sobre esta tela…" />
            <button type="submit" aria-label="Enviar"><Send /></button>
          </form>
        </section>
      </div>
    </aside>
  )
}
