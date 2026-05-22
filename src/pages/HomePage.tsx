import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createRoster } from '@/api/admin'
import { fetchDashboard } from '@/api/home'
import { ApiError } from '@/api/http'
import { SuperUsersPanel } from '@/components/SuperUsersPanel'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/context/AuthContext'
import { groupLabel } from '@/lib/formatDate'
import { weekdayLabel } from '@/lib/labels'
import type { ActiveGame, Roster } from '@/types/groups'
import './Groups.css'

export function HomePage() {
  const { token, user } = useAuth()
  const navigate = useNavigate()
  const [adminRosters, setAdminRosters] = useState<Roster[]>([])
  const [activeGames, setActiveGames] = useState<ActiveGame[]>([])
  const [canCreateRoster, setCanCreateRoster] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateRoster, setShowCreateRoster] = useState(false)
  const [rosterTitle, setRosterTitle] = useState('')
  const [createBusy, setCreateBusy] = useState(false)

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
  }, [token])

  const showGroupsBlock = canCreateRoster || adminRosters.length > 0

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
              Создай группу по кнопке +
            </p>
          )}

          {adminRosters.length > 0 && (
            <ul className="groups-list">
              {adminRosters.map((r) => (
                <li key={r.id} className="groups-list__item">
                  <Link to={`/rosters/${r.id}`} className="neo-surface group-card">
                    <div className="roster-name-plate roster-name-plate--card">
                      <p className="roster-name-plate__title">{r.title}</p>
                    </div>
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

      {!loading && !error && activeGames.length === 0 && (
        <p className="groups-page__empty">Нет предстоящих игр</p>
      )}

      {!loading && !error && activeGames.length > 0 && (
        <ul className="groups-list">
          {activeGames.map((g) => (
            <li key={g.id} className="groups-list__item">
              <Link to={`/groups/${g.id}`} className="neo-surface group-card">
                <div className="group-card__row">
                  <div className="roster-name-plate roster-name-plate--card group-card__name-plate">
                    <p className="roster-name-plate__title">
                      {groupLabel(g.group_date, g.title)}
                    </p>
                  </div>
                  {(g.vote_open ?? g.vote_active) && (
                    <span className="group-card__badge group-card__badge--active">
                      голосование
                    </span>
                  )}
                  {g.payment_active && (
                    <span className="group-card__badge group-card__badge--active">
                      оплата
                    </span>
                  )}
                </div>
                <p className="group-card__meta">
                  {g.roster_title}
                  {g.roster_venue ? ` · ${g.roster_venue}` : ''}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {!loading && !error && user?.role === 'super' && token && (
        <SuperUsersPanel token={token} />
      )}
    </div>
  )
}
