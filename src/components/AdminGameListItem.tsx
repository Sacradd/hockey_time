import { Link } from 'react-router-dom'
import { GameListBadges } from '@/components/GameListBadges'
import { MemberSwipeRow } from '@/components/MemberSwipeRow'
import { groupLabel } from '@/lib/formatDate'
import type { ActiveGame, GameSummary } from '@/types/groups'

type GameCardData = Pick<
  ActiveGame,
  | 'id'
  | 'group_date'
  | 'title'
  | 'teams_published'
  | 'vote_active'
  | 'vote_open'
  | 'payment_active'
> &
  Partial<Pick<ActiveGame, 'roster_title' | 'roster_venue'>>

type AdminGameListItemProps = {
  game: GameCardData
  canManage: boolean
  showRosterMeta?: boolean
  onDelete: (game: GameSummary) => void
  onArchive: (game: GameSummary) => void
}

export function AdminGameListItem({
  game,
  canManage,
  showRosterMeta = true,
  onDelete,
  onArchive,
}: AdminGameListItemProps) {
  const card = (
    <Link to={`/groups/${game.id}`} className="neo-surface group-card">
      <div className="group-card__row">
        <span className="group-card__date">
          {groupLabel(game.group_date, game.title)}
        </span>
        <GameListBadges
          teams_published={game.teams_published}
          vote_active={game.vote_active}
          vote_open={game.vote_open}
          payment_active={game.payment_active}
        />
      </div>
      {showRosterMeta && game.roster_title && (
        <p className="group-card__meta">
          Группа — {game.roster_title}
          {game.roster_venue ? ` · ${game.roster_venue}` : ''}
        </p>
      )}
    </Link>
  )

  if (!canManage) {
    return <li className="groups-list__item">{card}</li>
  }

  const published = !!game.teams_published

  return (
    <MemberSwipeRow
      className="groups-list__item"
      revealPx={108}
      removeLabel={published ? 'В архив' : 'Удалить'}
      variant={published ? 'archive' : 'danger'}
      onRemove={() => (published ? onArchive(game) : onDelete(game))}
    >
      {card}
    </MemberSwipeRow>
  )
}
