import type { CoreAppId, LearnerSnapshot, LearningContext } from '../domain'
import { EngineHubApp } from '../engines/EngineHubApp'
import { DojoApp } from './DojoApp'
import { ArchitectureApp, SoftwareApp } from './SystemApps'
import { FilesApp, TerminalApp } from './TerminalFilesApps'

type AppContentProps = {
  readonly appId: CoreAppId
  readonly learner: LearnerSnapshot
  readonly onTeach: (context: LearningContext) => void
  readonly onOpenApp: (id: CoreAppId) => void
}

export function AppContent({ appId, learner, onTeach, onOpenApp }: AppContentProps) {
  switch (appId) {
    case 'dojo':
      return <DojoApp learner={learner} onTeach={onTeach} onOpenApp={onOpenApp} />
    case 'terminal':
      return <TerminalApp onTeach={onTeach} />
    case 'files':
      return <FilesApp onTeach={onTeach} />
    case 'architecture':
      return <ArchitectureApp onTeach={onTeach} />
    case 'software':
      return <SoftwareApp onTeach={onTeach} />
    case 'engines':
      return <EngineHubApp />
  }
}
