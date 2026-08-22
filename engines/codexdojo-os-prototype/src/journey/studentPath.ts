import type { TrackId } from '../domain'

export const STUDENT_TRACK_ID: TrackId = 'ai-pratica'

export const STUDENT_MISSION_CHAPTERS = [
  {
    id: 'literacy' as const,
    label: 'IA Prática',
    detail: 'Uso consciente sem exigir código',
    trackId: 'ai-pratica' as const,
  },
  {
    id: 'hosted-simulations' as const,
    label: 'Simulações hospedadas',
    detail: 'WAREHOUSE, WORMHOLE e RELAY STATION no OS',
    trackId: 'dev' as const,
  },
] as const
