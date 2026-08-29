import { Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { iconFor } from '../apps/AppIcon'
import { visibleAppCatalog } from '../apps/studentCatalog'
import type { AppDefinition } from '../domain'

export function Launcher({
  query,
  onQuery,
  onClose,
  onLaunch,
  operatorSurface = false,
}: {
  readonly query: string
  readonly onQuery: (value: string) => void
  readonly onClose: () => void
  readonly onLaunch: (app: AppDefinition) => void
  readonly operatorSurface?: boolean
}) {
  const catalog = useMemo(() => visibleAppCatalog(operatorSurface), [operatorSurface])
  const availableCount = catalog.filter((app) => app.status === 'disponivel').length
  const [category, setCategory] = useState('Todos')
  const categories = ['Todos', 'Aprender', 'Desenvolver', 'Criar', 'Sistema', 'Utilitários']
  const filtered = useMemo(() => {
    const normalizedQuery = query.toLowerCase()
    return catalog.filter((app) => {
      if (category !== 'Todos' && app.category !== category) return false
      if (normalizedQuery === '') return true
      const haystack = `${app.name} ${app.category} ${app.concepts.join(' ')}`.toLowerCase()
      return haystack.includes(normalizedQuery)
    })
  }, [catalog, category, query])
  return (
    <section
      className="launcher-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Lançador de aplicativos"
      tabIndex={-1}
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose()
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose()
      }}
    >
      <div className="launcher-panel">
        <header>
          <div className="launcher-search"><Search /><input aria-label="Buscar aplicativos ou fundamentos" placeholder="Busque apps ou fundamentos…" value={query} onChange={(event) => onQuery(event.target.value)} /></div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Fechar lançador"><X /></button>
        </header>
        <div className="launcher-body">
          <aside>
            <span>Explorar</span>
            {categories.map((item) => <button type="button" key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item}</button>)}
            <div className="catalog-summary"><strong>{catalog.length}</strong><span>apps no ecossistema</span><small>{availableCount} disponíveis agora</small></div>
          </aside>
          <div className="launcher-main">
            <div className="launcher-heading"><span>{category}</span><small>{filtered.length} resultados</small></div>
            <div className="app-grid">
              {filtered.map((app) => (
                <button type="button" key={app.name} onClick={() => onLaunch(app)}>
                  <span className={`catalog-icon ${app.status}`}>{iconFor(app, 23)}</span>
                  <span className="catalog-copy"><strong>{app.name}</strong><small>{app.concepts[0]}</small></span>
                  <i className={`status-dot ${app.status}`} title={app.status} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
