import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { fetchGameDetail, publishMatchTeams, saveMatchTeams } from '@/api/games'
import { ApiError } from '@/api/http'
import { AlertDialog } from '@/components/AlertDialog'
import { MatchTeamsBoard } from '@/components/MatchTeamsBoard'
import { TeamAssignRow } from '@/components/TeamAssignRow'
import { Button } from '@/components/ui/Button'
import { useRegisterAppBack } from '@/context/AppBackContext'
import { useAuth } from '@/context/AuthContext'
import {
  collectInGameLineupMembers,
  parseMatchTeams,
  validateMatchTeamAssign,
  type MatchTeam,
} from '@/lib/gameLineup'
import type { GameLineup } from '@/types/games'
import './Groups.css'

export function GameTeamsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const gameId = Number(id)
  const { token } = useAuth()

  const [lineup, setLineup] = useState<GameLineup | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [teamsError, setTeamsError] = useState('')
  const [teams, setTeams] = useState<Record<number, MatchTeam>>({})

  const load = useCallback(() => {
    if (!token || !Number.isFinite(gameId) || gameId < 1) return
    setLoading(true)
    setLoadError('')
    setTeamsError('')
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
        setLoadError(err instanceof ApiError ? err.message : 'Не удалось загрузить игру')
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
    const member = members.find((m) => m.user_id === userId)
    if (!member) return
    const check = validateMatchTeamAssign(member, team, members, teams)
    if (!check.ok) {
      setTeamsError(check.message)
      return
    }
    setTeamsError('')
    setTeams((prev) => ({ ...prev, [userId]: team }))
  }

  const handleBack = useCallback(async () => {
    if (!token || saving) return
    setSaving(true)
    setTeamsError('')
    try {
      await saveMatchTeams(token, gameId, teams)
      navigate(`/groups/${gameId}`)
    } catch (err) {
      setTeamsError(err instanceof ApiError ? err.message : 'Не удалось сохранить составы')
      setSaving(false)
    }
  }, [token, saving, gameId, teams, navigate])

  useRegisterAppBack(
    useMemo(
      () => ({
        onBack: () => void handleBack(),
        disabled: loading || saving,
      }),
      [handleBack, loading, saving]
    )
  )

  async function handleDone() {
    if (!token || saving) return
    setSaving(true)
    setTeamsError('')
    try {
      await publishMatchTeams(token, gameId, teams)
      navigate(`/groups/${gameId}`)
    } catch (err) {
      setTeamsError(err instanceof ApiError ? err.message : 'Не удалось опубликовать составы')
      setSaving(false)
    }
  }

  return (
    <div className="groups-page groups-page--game groups-page--teams">
      {loading && <p className="groups-page__empty game-teams-page__status">Загрузка…</p>}
      {loadError && <p className="groups-page__error game-teams-page__status">{loadError}</p>}

      {!loading && !loadError && members.length === 0 && (
        <p className="groups-page__empty game-teams-page__status">В игре пока никого нет</p>
      )}

      {!loading && members.length > 0 && (
        <div className="game-teams-body">
          <div className="game-teams-scroll">
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

      <AlertDialog
        open={teamsError !== ''}
        message={teamsError}
        onClose={() => setTeamsError('')}
      />
    </div>
  )
}
