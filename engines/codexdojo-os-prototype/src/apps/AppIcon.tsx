import {
  AppWindow,
  BookOpen,
  Code2,
  Boxes,
  Cpu,
  FolderOpen,
  GraduationCap,
  Layers3,
  PackageCheck,
  Sparkles,
  SquareTerminal,
} from 'lucide-react'
import type { AppDefinition } from '../domain'

export function iconFor(app: AppDefinition, size = 20) {
  const props = { size, strokeWidth: 1.8 }
  if (app.appId === 'dojo') return <GraduationCap {...props} />
  if (app.appId === 'terminal') return <SquareTerminal {...props} />
  if (app.appId === 'files') return <FolderOpen {...props} />
  if (app.appId === 'architecture') return <Layers3 {...props} />
  if (app.appId === 'software') return <PackageCheck {...props} />
  if (app.appId === 'engines') return <Boxes {...props} />
  if (app.category === 'Aprender') return <BookOpen {...props} />
  if (app.category === 'Desenvolver') return <Code2 {...props} />
  if (app.category === 'Criar') return <Sparkles {...props} />
  if (app.category === 'Sistema') return <Cpu {...props} />
  return <AppWindow {...props} />
}
