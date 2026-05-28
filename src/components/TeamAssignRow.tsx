import { PositionPill } from '@/components/PositionPill'
import type { MatchTeam } from '@/lib/gameLineup'
import { matchTeamLabel } from '@/lib/gameLineup'
import type { LineupMember } from '@/types/games'

type Props = {
  member: LineupMember
  assigned: MatchTeam | null
  onAssign: (team: MatchTeam) => void
}

export function TeamAssignRow({ member, assigned, onAssign }: Props) {
  return (
    <li className="team-assign-row">
      <button
        type="button"
        className={`team-assign-row__pick team-assign-row__pick--white${
          assigned === 'white' ? ' team-assign-row__pick--active' : ''
        }`}
        aria-label={`${matchTeamLabel('white')}: ${member.name}`}
        aria-pressed={assigned === 'white'}
        onClick={() => onAssign('white')}
      />
      <div className="team-assign-row__main neo-surface">
        <span className="team-assign-row__name">{member.name}</span>
        <PositionPill position={member.position} />
      </div>
      <button
        type="button"
        className={`team-assign-row__pick team-assign-row__pick--black${
          assigned === 'black' ? ' team-assign-row__pick--active' : ''
        }`}
        aria-label={`${matchTeamLabel('black')}: ${member.name}`}
        aria-pressed={assigned === 'black'}
        onClick={() => onAssign('black')}
      />
    </li>
  )
}
