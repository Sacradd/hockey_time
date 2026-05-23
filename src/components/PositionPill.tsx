import { positionLabel } from '@/lib/labels'

type Position = 'player' | 'goalie'

function normalizePosition(position: string | undefined): Position {
  return position === 'goalie' ? 'goalie' : 'player'
}

export function PositionPill({ position }: { position: string | undefined }) {
  const pos = normalizePosition(position)

  return (
    <span
      className={`status-pill member-row__position-pill status-pill--${
        pos === 'goalie' ? 'goalie' : 'player'
      }`}
    >
      {positionLabel(pos)}
    </span>
  )
}
