import type { CoreAppId, LearnerSnapshot, LearningContext } from '../domain'
import { ArchitectureApp, SoftwareApp } from './SystemApps'
import { DojoApp } from './DojoApp'
import { FilesApp, TerminalApp } from './TerminalFilesApps'
import { EngineHubApp } from '../engines/EngineHubApp'
import { GuidedPracticeStandaloneApp } from '../practice/GuidedPracticeApp'

type AppContentProps = {
  readonly appId: CoreAppId
  readonly learner: LearnerSnapshot
  readonly onTeach: (context: LearningContext) => void
  readonly onOpenApp: (id: CoreAppId) => void
  // AID-3643: context-only rail update (does not force the rail open).
  readonly onRailContext?: (context: LearningContext) => void
}

export function AppContent({ appId, learner, onTeach, onOpenApp, onRailContext }: AppContentProps) {
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
    case 'practice':
      // AID-3590: standalone surface — explicit content choice lives ONLY
      // here (pg-d01 default + pg-c01); the embedded AC1 mission runtime
      // keeps GuidedPracticeApp pinned to pg-d01.
      return <GuidedPracticeStandaloneApp onTeach={onTeach} onRailContext={onRailContext} />
  }
}
