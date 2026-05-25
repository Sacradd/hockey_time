import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { createRoster } from '@/api/admin'
import { archiveGame, deleteGame } from '@/api/games'
import { fetchDashboard } from '@/api/home'
import { ApiError } from '@/api/http'
import { AdminGameListItem } from '@/components/AdminGameListItem'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { SuperUsersPanel } from '@/components/SuperUsersPanel'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/context/AuthContext'
import { weekdayLabel } from '@/lib/labels'
import type { ActiveGame, GameSummary, Roster } from '@/types/groups'
import './Groups.css'

type PendingGameAction =
  | { type: 'delete'; game: GameSummary }
  | { type: 'archive'; game: GameSummary }

export function HomePage() {
  const { token, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [adminRosters, setAdminRosters] = useState<Roster[]>([])
  const [activeGames, setActiveGames] = useState<ActiveGame[]>([])
  const [canCreateRoster, setCanCreateRoster] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateRoster, setShowCreateRoster] = useState(false)
  const [rosterTitle, setRosterTitle] = useState('')
  const [createBusy, setCreateBusy] = useState(false)
  const [pendingAction, setPendingAction] = useState<PendingGameAction | null>(null)
  const [gameActionBusy, setGameActionBusy] = useState(false)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    setLoading(true)
    fetchDashboard(token)
      .then((res) => {
        if (!cancelled) {
          setAdminRosters(res.admin_rosters)
          setActiveGames(res.active_games)
          setCanCreateRoster(!!res.can_create_roster)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Ошибка загрузки')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token, location.key])

  async function handleConfirmGameAction() {
    if (!token || !pendingAction) return
    setGameActionBusy(true)
    setError('')
    try {
      if (pendingAction.type === 'delete') {
        await deleteGame(token, pendingAction.game.id)
      } else {
        await archiveGame(token, pendingAction.game.id)
      }
      setActiveGames((list) => list.filter((g) => g.id !== pendingAction.game.id))
      setPendingAction(null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось выполнить действие')
    } finally {
      setGameActionBusy(false)
    }
  }

  const showGroupsBlock = canCreateRoster || adminRosters.length > 0
  const hasAdminGames = activeGames.some((g) => g.can_manage)

  return (
    <div className="groups-page">
      {loading && <p className="groups-page__empty">Загрузка…</p>}
      {error && <p className="groups-page__error">{error}</p>}

      {!loading && !error && showGroupsBlock && (
        <>
          <div className="groups-section-head">
            <h2 className="groups-section-title groups-section-title--inline">
              Группы
            </h2>
            {canCreateRoster && (
              <button
                type="button"
                className="super-add-player-btn"
                aria-label="Новая группа"
                onClick={() => setShowCreateRoster((v) => !v)}
              >
                <span className="super-add-player-btn__glyph" aria-hidden>
                  +
                </span>
              </button>
            )}
          </div>

          {showCreateRoster && canCreateRoster && (
            <form
              className="vote-admin__form neo-surface"
              onSubmit={async (e) => {
                e.preventDefault()
                if (!token || createBusy || !rosterTitle.trim()) return
                setCreateBusy(true)
                setError('')
                try {
                  const res = await createRoster(token, {
                    title: rosterTitle.trim(),
                  })
                  setShowCreateRoster(false)
                  setRosterTitle('')
                  navigate(`/rosters/${res.roster.id}`)
                } catch (err) {
                  setError(err instanceof ApiError ? err.message : 'Не удалось создать группу')
                } finally {
                  setCreateBusy(false)
                }
              }}
            >
              <Input
                label="Название группы"
                value={rosterTitle}
                onChange={(e) => setRosterTitle(e.target.value)}
                placeholder="Например: Основной состав"
                required
              />
              <div className="vote-admin__actions">
                <Button type="submit" variant="accent" disabled={createBusy}>
                  Создать группу
                </Button>
                <Button type="button" onClick={() => setShowCreateRoster(false)}>
                  Отмена
                </Button>
              </div>
            </form>
          )}

          {adminRosters.length === 0 && canCreateRoster && !showCreateRoster && (
            <p className="groups-page__empty">
              Создать группу по кнопке +
            </p>
          )}

          {adminRosters.length > 0 && (
            <ul className="groups-list">
              {adminRosters.map((r) => (
                <li key={r.id} className="groups-list__item">
                  <Link to={`/rosters/${r.id}`} className="neo-surface group-card">
                    <span className="group-card__date">{r.title}</span>
                    <p className="group-card__meta">
                      {[
                        r.venue,
                        r.weekday !== null ? weekdayLabel(r.weekday) : null,
                        `Кол-во участников ${r.members_count ?? 0}`,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <h2 className="groups-section-title">Игры</h2>

      {hasAdminGames && (
        <p className="groups-page__hint roster-members-hint">
          Свайп влево по игре — удалить или в архив.
        </p>
      )}

      {!loading && !error && activeGames.length === 0 && (
        <p className="groups-page__empty">Нет предстоящих игр</p>
      )}

      {!loading && !error && activeGames.length > 0 && (
        <ul className="groups-list">
          {activeGames.map((g) => (
            <AdminGameListItem
              key={g.id}
              game={g}
              canManage={!!g.can_manage}
              onDelete={(game) => setPendingAction({ type: 'delete', game })}
              onArchive={(game) => setPendingAction({ type: 'archive', game })}
            />
          ))}
        </ul>
      )}

      {!loading && !error && user?.role === 'super' && token && (
        <SuperUsersPanel token={token} />
      )}

      <ConfirmDialog
        open={pendingAction?.type === 'delete'}
        message="Удалить игру? Данные по ней будут стёрты."
        titleId="home-delete-game-title"
        busy={gameActionBusy}
        onConfirm={() => void handleConfirmGameAction()}
        onCancel={() => !gameActionBusy && setPendingAction(null)}
      />
      <ConfirmDialog
        open={pendingAction?.type === 'archive'}
        message="Отправить игру в архив? Она пропадёт из списка."
        titleId="home-archive-game-title"
        busy={gameActionBusy}
        onConfirm={() => void handleConfirmGameAction()}
        onCancel={() => !gameActionBusy && setPendingAction(null)}
      />
    </div>
  )
}
