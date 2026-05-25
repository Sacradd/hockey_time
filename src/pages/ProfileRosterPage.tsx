import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchProfileRoster } from '@/api/profile'
import { ApiError } from '@/api/http'
import { PositionPill } from '@/components/PositionPill'
import { useAuth } from '@/context/AuthContext'
import type { ProfileRosterDetail, RosterMember } from '@/types/groups'
import './Groups.css'

function MemberList({ title, items }: { title: string; items: RosterMember[] }) {
  if (items.length === 0) return null
  return (
    <>
      <h2 className="groups-section-title">{title}</h2>
      <ul className="members-list members-list--profile-compact">
        {items.map((m) => (
          <li key={m.user_id}>
            <div className="neo-surface member-row member-row--profile-compact">
              <span className="member-row__name">
                {m.name}
                {m.is_admin && (
                  <span className="status-pill status-pill--admin member-row__admin-badge">
                    админ
                  </span>
                )}
              </span>
              <PositionPill position={m.position} />
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}

export function ProfileRosterPage() {
  const { id } = useParams()
  const rosterId = Number(id)
  const { token } = useAuth()
  const [data, setData] = useState<ProfileRosterDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token || !Number.isFinite(rosterId)) return
    let cancelled = false
    fetchProfileRoster(token, rosterId)
      .then((res) => {
        if (!cancelled) setData(res)
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
    <div className="groups-page groups-page--profile-roster">
      {data?.roster && (
        <header className="groups-page__header">
          <h1 className="groups-page__title">{data.roster.title}</h1>
          <p className="groups-page__user">{data.roster.venue ?? ''}</p>
        </header>
      )}

      {loading && <p className="groups-page__empty">Загрузка…</p>}
      {error && <p className="groups-page__error">{error}</p>}

      {data && (
        <>
          <MemberList title="Администраторы" items={data.admins} />
          <MemberList title="Полевые" items={data.players} />
          <MemberList title="Вратари" items={data.goalies} />

          {data.can_manage && (
            <Link
              to={`/rosters/${rosterId}`}
              className="neo-btn neo-btn--accent"
              style={{ marginTop: 'var(--space-md)' }}
            >
              Управление группой
            </Link>
          )}
        </>
      )}
    </div>
  )
}
