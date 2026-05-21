import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchDashboard } from '@/api/home'
import { ApiError } from '@/api/http'
import { SuperUsersPanel } from '@/components/SuperUsersPanel'
import { useAuth } from '@/context/AuthContext'
import { groupLabel } from '@/lib/formatDate'
import { weekdayLabel } from '@/lib/labels'
import type { ActiveGame, Roster } from '@/types/groups'
import './Groups.css'

export function HomePage() {
  const { token, user } = useAuth()
  const [adminRosters, setAdminRosters] = useState<Roster[]>([])
  const [activeGames, setActiveGames] = useState<ActiveGame[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!token) return
    let cancelled = false
    setLoading(true)
    fetchDashboard(token)
      .then((res) => {
        if (!cancelled) {
          setAdminRosters(res.admin_rosters)
          setActiveGames(res.active_games)
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

  return (
    <div className="groups-page">
      {loading && <p className="groups-page__empty">Загрузка…</p>}
      {error && <p className="groups-page__error">{error}</p>}

      {!loading && !error && adminRosters.length > 0 && (
        <>
          <h2 className="groups-section-title">Управление группами</h2>
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
        </>
      )}

      <h2 className="groups-section-title">Сейчас важно</h2>

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
        <SuperUsersPanel token={token} rosters={adminRosters} />
      )}
    </div>
  )
}
