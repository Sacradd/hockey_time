import { useMemo, useState } from 'react'
import { copyToClipboard } from '@/lib/copyToClipboard'
import {
  buildTeamBoardSlots,
  formatMatchTeamsCopyText,
  matchTeamLabel,
  type MatchTeam,
} from '@/lib/gameLineup'
import type { LineupMember } from '@/types/games'

function TeamBoardColumn({
  team,
  members,
}: {
  team: MatchTeam
  members: LineupMember[]
}) {
  const slots = useMemo(() => buildTeamBoardSlots(members), [members])

  return (
    <div className={`game-teams-board__col game-teams-board__col--${team}`}>
      <p className="game-teams-board__title">{matchTeamLabel(team)}</p>
      <ul className="game-teams-board__list">
        {slots.map((m, index) => (
          <li
            key={m?.user_id ?? `${team}-slot-${index}`}
            className={`game-teams-board__slot${
              m ? '' : ' game-teams-board__slot--empty'
            }`}
          >
            {m && (
              <>
                {m.name}
                {m.position === 'goalie' && (
                  <span className="game-teams-board__goalie"> вр.</span>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

type Props = {
  whiteMembers: LineupMember[]
  blackMembers: LineupMember[]
  /** Кнопка копирования (админ). */
  showCopy?: boolean
  className?: string
}

export function MatchTeamsBoard({
  whiteMembers,
  blackMembers,
  showCopy = false,
  className,
}: Props) {
  const [copyDone, setCopyDone] = useState(false)

  function handleCopy() {
    try {
      copyToClipboard(formatMatchTeamsCopyText(whiteMembers, blackMembers))
      setCopyDone(true)
      window.setTimeout(() => setCopyDone(false), 2000)
    } catch {
      /* вызывающий может показать ошибку; на опубликованном экране тихо */
    }
  }

  const boardClass = ['game-teams-board', 'neo-surface', className]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={boardClass}>
      <TeamBoardColumn team="white" members={whiteMembers} />
      <TeamBoardColumn team="black" members={blackMembers} />
      {showCopy && (
        <button
          type="button"
          className="game-teams-board__copy-btn"
          aria-label={
            copyDone ? 'Составы скопированы' : 'Скопировать составы белых и чёрных'
          }
          title={copyDone ? 'Скопировано' : 'Скопировать составы'}
          onClick={handleCopy}
        >
          <svg
            className="game-teams-board__copy-icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <rect
              x="9"
              y="9"
              width="11"
              height="11"
              rx="2"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
            />
            <path
              d="M7 15H6a2 2 0 01-2-2V6a2 2 0 012-2h7a2 2 0 012 2v1"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
            />
          </svg>
        </button>
      )}
    </div>
  )
}
