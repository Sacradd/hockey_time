import type { GameSummary } from '@/types/groups'

type GameListBadgesProps = Pick<
  GameSummary,
  'teams_published' | 'vote_active' | 'vote_open' | 'payment_active'
>

/** Бейджи в карточке игры в списке (главная, группа). */
export function GameListBadges({
  teams_published,
  vote_active,
  vote_open,
  payment_active,
}: GameListBadgesProps) {
  if (teams_published) {
    return (
      <span className="group-card__badge group-card__badge--teams-formed">
        Составы сформированы
      </span>
    )
  }

  return (
    <>
      {(vote_open ?? vote_active) && (
        <span className="group-card__badge group-card__badge--active">голосование</span>
      )}
      {payment_active && (
        <span className="group-card__badge group-card__badge--active">оплата</span>
      )}
    </>
  )
}
