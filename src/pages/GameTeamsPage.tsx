import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { fetchGameDetail, saveMatchTeams } from '@/api/games'
import { ApiError } from '@/api/http'
import { PowerOffButton } from '@/components/PowerOffButton'
import { TeamAssignRow } from '@/components/TeamAssignRow'
import { useAuth } from '@/context/AuthContext'
import {
  buildTeamBoardSlots,
  collectInGameLineupMembers,
  matchTeamLabel,
  parseMatchTeams,
  type MatchTeam,
} from '@/lib/gameLineup'
import type { GameLineup, LineupMember } from '@/types/games'
import './Groups.css'

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
                {m.is_guest && (
                  <span className="game-teams-board__guest"> гость</span>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function TeamsToolbar({
  saving,
  loading,
  onBack,
}: {
  saving: boolean
  loading: boolean
  onBack: () => void
}) {
  return (
    <div className="game-teams-toolbar">
      <button
        type="button"
        className="neo-btn game-teams-topbar"
        onClick={onBack}
        disabled={loading || saving}
      >
        {saving ? 'Сохранение…' : '← К игре'}
      </button>
      <PowerOffButton />
    </div>
  )
}

export function GameTeamsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const gameId = Number(id)
  const { token } = useAuth()

  const [lineup, setLineup] = useState<GameLineup | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [teams, setTeams] = useState<Record<number, MatchTeam>>({})

  const load = useCallback(() => {
    if (!token || !Number.isFinite(gameId) || gameId < 1) return
    setLoading(true)
    setError('')
    fetchGameDetail(token, gameId)
      .then((res) => {
        if (!res.game.can_manage) {
          navigate(`/groups/${gameId}`, { replace: true })
          return
        }
        setLineup(res.lineup)
        setTeams(parseMatchTeams(res.match_teams))
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'Не удалось загрузить игру')
      })
      .finally(() => setLoading(false))
  }, [token, gameId, navigate])

  useEffect(() => {
    load()
  }, [load])

  const members = useMemo(
    () => (lineup ? collectInGameLineupMembers(lineup) : []),
    [lineup]
  )

  const whiteMembers = useMemo(
    () => members.filter((m) => teams[m.user_id] === 'white'),
    [members, teams]
  )
  const blackMembers = useMemo(
    () => members.filter((m) => teams[m.user_id] === 'black'),
    [members, teams]
  )

  function assignTeam(userId: number, team: MatchTeam) {
    setTeams((prev) => ({ ...prev, [userId]: team }))
  }

  async function handleBack() {
    if (!token || saving) return
    setSaving(true)
    setError('')
    try {
      await saveMatchTeams(token, gameId, teams)
      navigate(`/groups/${gameId}`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось сохранить составы')
      setSaving(false)
    }
  }

  const showToolbar = loading || !!error || members.length === 0

  return (
    <div className="groups-page groups-page--game groups-page--teams">
      {showToolbar && (
        <TeamsToolbar saving={saving} loading={loading} onBack={handleBack} />
      )}

      {loading && <p className="groups-page__empty game-teams-page__status">Загрузка…</p>}
      {error && <p className="groups-page__error game-teams-page__status">{error}</p>}

      {!loading && !error && members.length === 0 && (
        <p className="groups-page__empty game-teams-page__status">В игре пока никого нет</p>
      )}

      {!loading && members.length > 0 && (
        <div className="game-teams-body">
          <div className="game-teams-scroll">
            <TeamsToolbar saving={saving} loading={loading} onBack={handleBack} />
            <div className="game-teams-board neo-surface">
              <TeamBoardColumn team="white" members={whiteMembers} />
              <TeamBoardColumn team="black" members={blackMembers} />
            </div>
            <ul className="members-list members-list--compact game-teams-list">
              {members.map((m) => (
                <TeamAssignRow
                  key={m.user_id}
                  member={m}
                  assigned={teams[m.user_id] ?? null}
                  onAssign={(team) => assignTeam(m.user_id, team)}
                />
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
