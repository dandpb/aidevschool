import { Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { iconFor } from '../apps/AppIcon'
import { appCatalog } from '../apps/appCatalog'
import type { AppDefinition } from '../domain'

export function Launcher({ query, onQuery, onClose, onLaunch }: { readonly query: string; readonly onQuery: (value: string) => void; readonly onClose: () => void; readonly onLaunch: (app: AppDefinition) => void }) {
  const [category, setCategory] = useState('Todos')
  const categories = ['Todos', 'Aprender', 'Desenvolver', 'Criar', 'Sistema', 'Utilitários']
  const filtered = useMemo(() => appCatalog.filter((app) => {
    const matchesCategory = category === 'Todos' || app.category === category
    const haystack = `${app.name} ${app.category} ${app.concepts.join(' ')}`.toLowerCase()
    return matchesCategory && haystack.includes(query.toLowerCase())
  }), [category, query])
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
            <div className="catalog-summary"><strong>{appCatalog.length}</strong><span>apps no ecossistema</span><small>5 disponíveis agora</small></div>
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
