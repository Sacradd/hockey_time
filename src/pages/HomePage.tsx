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

const WEEKDAYS = [
  { value: 0, label: 'Воскресенье' },
  { value: 1, label: 'Понедельник' },
  { value: 2, label: 'Вторник' },
  { value: 3, label: 'Среда' },
  { value: 4, label: 'Четверг' },
  { value: 5, label: 'Пятница' },
  { value: 6, label: 'Суббота' },
]

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
  const [rosterVenue, setRosterVenue] = useState('')
  const [rosterWeekday, setRosterWeekday] = useState('3')
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
              Управление группами
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
                    venue: rosterVenue.trim() || undefined,
                    weekday: parseInt(rosterWeekday, 10),
                  })
                  setShowCreateRoster(false)
                  setRosterTitle('')
                  setRosterVenue('')
                  navigate(`/rosters/${res.roster.id}`)
                } catch (err) {
                  setError(err instanceof ApiError ? err.message : 'Не удалось создать группу')
                } finally {
                  setCreateBusy(false)
                }
              }}
            >
              <Input
                label="Название"
                value={rosterTitle}
                onChange={(e) => setRosterTitle(e.target.value)}
                placeholder="Среда · ЛД Кристалл"
                required
              />
              <Input
                label="Площадка"
                value={rosterVenue}
                onChange={(e) => setRosterVenue(e.target.value)}
                placeholder="Кристалл"
              />
              <label className="neo-field">
                <span className="neo-label">День недели</span>
                <select
                  className="neo-input"
                  value={rosterWeekday}
                  onChange={(e) => setRosterWeekday(e.target.value)}
                >
                  {WEEKDAYS.map((d) => (
                    <option key={d.value} value={String(d.value)}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </label>
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
              Создайте первую группу кнопкой + выше
            </p>
          )}

          {adminRosters.length > 0 && (
            <ul className="groups-list">
              {adminRosters.map((r) => (
                <li key={r.id} className="groups-list__item">
                  <Link to={`/rosters/${r.id}`} className="neo-surface group-card">
                    <span className="group-card__date">{r.title}</span>
                    <p className="group-card__meta">
                      {r.venue}
                      {r.weekday !== null ? ` · ${weekdayLabel(r.weekday)}` : ''}
                      {' · '}
                      {r.members_count} в пуле
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <h2 className="groups-section-title">Предстоящие игры</h2>

      {!loading && !error && activeGames.length === 0 && (
        <p className="groups-page__empty">Нет активных голосований и оплат</p>
      )}

      {!loading && !error && activeGames.length > 0 && (
        <ul className="groups-list">
          {activeGames.map((g) => (
            <li key={g.id} className="groups-list__item">
              <Link to={`/groups/${g.id}`} className="neo-surface group-card">
                <div className="group-card__row">
                  <span className="group-card__date">
                    {groupLabel(g.group_date, g.title)}
                  </span>
                  {(g.vote_open ?? g.vote_active) && (
                    <span className="group-card__badge group-card__badge--active">
                      голосование
                    </span>
                  )}
                  {!g.vote_active && g.payment_active && (
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
