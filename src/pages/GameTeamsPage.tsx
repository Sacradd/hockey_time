import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { fetchGameDetail, publishMatchTeams, saveMatchTeams } from '@/api/games'
import { ApiError } from '@/api/http'
import { MatchTeamsBoard } from '@/components/MatchTeamsBoard'
import { PowerOffButton } from '@/components/PowerOffButton'
import { TeamAssignRow } from '@/components/TeamAssignRow'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/context/AuthContext'
import { collectInGameLineupMembers, parseMatchTeams, type MatchTeam } from '@/lib/gameLineup'
import type { GameLineup } from '@/types/games'
import './Groups.css'

function TeamsToolbar({
  saving,
  loading,
  onBack,
  backLabel,
}: {
  saving: boolean
  loading: boolean
  onBack: () => void
  backLabel?: string
}) {
  return (
    <div className="game-teams-toolbar">
      <button
        type="button"
        className="neo-btn game-teams-topbar"
        onClick={onBack}
        disabled={loading || saving}
      >
        {backLabel ?? (saving ? 'Сохранение…' : '← К игре')}
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

  async function handleDone() {
    if (!token || saving) return
    setSaving(true)
    setError('')
    try {
      await publishMatchTeams(token, gameId, teams)
      navigate(`/groups/${gameId}`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось опубликовать составы')
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
            <MatchTeamsBoard
              whiteMembers={whiteMembers}
              blackMembers={blackMembers}
              showCopy
            />
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
            <div className="game-teams-done">
              <Button
                type="button"
                variant="accent"
                className="game-teams-done__btn"
                disabled={saving}
                onClick={() => void handleDone()}
              >
                {saving ? 'Публикация…' : 'Готово'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
