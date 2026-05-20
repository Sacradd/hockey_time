import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchRosterGames, fetchRosterMembers } from '@/api/rosters'
import { ApiError } from '@/api/http'
import { useAuth } from '@/context/AuthContext'
import { groupLabel } from '@/lib/formatDate'
import { positionLabel } from '@/lib/labels'
import type { GameSummary, Roster, RosterMember } from '@/types/groups'
import './Groups.css'

export function RosterPage() {
  const { id } = useParams()
  const rosterId = Number(id)
  const { token, user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [roster, setRoster] = useState<Roster | null>(null)
  const [members, setMembers] = useState<RosterMember[]>([])
  const [games, setGames] = useState<GameSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token || !Number.isFinite(rosterId)) return
    let cancelled = false
    setLoading(true)

    Promise.all([
      fetchRosterMembers(token, rosterId),
      fetchRosterGames(token, rosterId),
    ])
      .then(([memRes, gamesRes]) => {
        if (!cancelled) {
          setRoster(memRes.roster as Roster)
          setMembers(memRes.members)
          setGames(gamesRes.games)
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
  }, [token, rosterId])

  return (
    <div className="groups-page">
      <Link to="/home" className="neo-btn groups-page__back">
        ← Назад
      </Link>

      {roster && (
        <header className="groups-page__header">
          <h1 className="groups-page__title">{roster.title}</h1>
          <p className="groups-page__user">{roster.venue ?? 'Пул участников'}</p>
        </header>
      )}

      {isAdmin && (
        <Link to={`/rosters/${rosterId}/add-player`} className="neo-btn neo-btn--accent">
          + Добавить игрока
        </Link>
      )}

      <h2 className="groups-section-title">Игры</h2>
      {loading && <p className="groups-page__empty">Загрузка…</p>}
      {error && <p className="groups-page__error">{error}</p>}

      {!loading && games.length === 0 && (
        <p className="groups-page__empty">Пока нет игр на даты</p>
      )}

      <ul className="groups-list">
        {games.map((g) => (
          <li key={g.id} className="groups-list__item">
            <Link to={`/groups/${g.id}`} className="neo-surface group-card">
              <span className="group-card__date">{groupLabel(g.group_date, g.title)}</span>
              {g.vote_active && (
                <span className="group-card__badge group-card__badge--active">голосование</span>
              )}
            </Link>
          </li>
        ))}
      </ul>

      <h2 className="groups-section-title">Участники пула</h2>
      <ul className="members-list">
        {members.map((m) => (
          <li key={m.user_id}>
            <div className="neo-surface member-row">
              <div>
                <div className="member-row__name">{m.name}</div>
                <div className="member-row__sub">
                  {positionLabel(m.position)}
                  {!m.is_active ? ' · не активирован' : ''}
                </div>
              </div>
              <span
                className={`status-pill ${m.position === 'goalie' ? 'status-pill--guest' : 'status-pill--actual'}`}
              >
                {positionLabel(m.position)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
