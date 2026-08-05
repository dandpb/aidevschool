import type { TrackId } from '../domain'

const TRACKS: readonly { readonly id: TrackId; readonly label: string; readonly detail: string }[] =
  [
    { id: 'ai-pratica', label: 'IA Prática', detail: 'Uso consciente sem exigir código' },
    { id: 'dev', label: 'Trilha Dev', detail: 'Sistemas por simulações executáveis' },
  ]

export function TrackSwitcher({
  activeTrackId,
  onSwitch,
}: {
  readonly activeTrackId: TrackId
  readonly onSwitch: (trackId: TrackId) => void
}) {
  return (
    <fieldset className="track-switcher">
      <legend>Trilha ativa</legend>
      {TRACKS.map((track) => (
        <button
          key={track.id}
          type="button"
          aria-pressed={activeTrackId === track.id}
          className={activeTrackId === track.id ? 'active' : ''}
          onClick={() => onSwitch(track.id)}
        >
          <strong>{track.label}</strong>
          <small>{track.detail}</small>
        </button>
      ))}
    </fieldset>
  )
}
