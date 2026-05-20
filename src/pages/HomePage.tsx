import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchRosters } from '@/api/rosters'
import { ApiError } from '@/api/http'
import { useAuth } from '@/context/AuthContext'
import { weekdayLabel } from '@/lib/labels'
import type { Roster } from '@/types/groups'
import './Groups.css'

export function HomePage() {
  const { token } = useAuth()
  const [rosters, setRosters] = useState<Roster[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return
    let cancelled = false
    setLoading(true)
    fetchRosters(token)
      .then((res) => {
        if (!cancelled) setRosters(res.rosters)
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
      <header className="groups-page__header">
        <h1 className="groups-page__title">Время хоккея</h1>
      </header>

      {loading && <p className="groups-page__empty">Загрузка…</p>}
      {error && <p className="groups-page__error">{error}</p>}

      {!loading && !error && rosters.length === 0 && (
        <p className="groups-page__empty">
          Нет групп. Запустите миграцию: /api/migrate-rosters.php?secret=...
        </p>
      )}

      {!loading && !error && rosters.length > 0 && (
        <ul className="groups-list">
          {rosters.map((r) => (
            <li key={r.id} className="groups-list__item">
              <Link to={`/rosters/${r.id}`} className="neo-surface group-card">
                <div className="group-card__row">
                  <span className="group-card__date">{r.title}</span>
                </div>
                <p className="group-card__meta">
                  {r.venue}
                  {r.weekday !== null ? ` · ${weekdayLabel(r.weekday)}` : ''}
                  {' · '}
                  {r.members_count} в пуле · {r.games_count} игр
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
