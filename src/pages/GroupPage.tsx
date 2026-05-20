import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchGroupMembers } from '@/api/groups'
import { ApiError } from '@/api/http'
import { useAuth } from '@/context/AuthContext'
import { groupLabel } from '@/lib/formatDate'
import { positionLabel } from '@/lib/labels'
import type { GroupDetail, GroupMember } from '@/types/groups'
import './Groups.css'

export function GroupPage() {
  const { id } = useParams()
  const groupId = Number(id)
  const { token } = useAuth()
  const [group, setGroup] = useState<GroupDetail | null>(null)
  const [members, setMembers] = useState<GroupMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token || !Number.isFinite(groupId) || groupId < 1) return
    let cancelled = false
    setLoading(true)
    setError('')

    fetchGroupMembers(token, groupId)
      .then((res) => {
        if (!cancelled) {
          setGroup(res.group)
          setMembers(res.members)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Не удалось загрузить участников')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [token, groupId])

  return (
    <div className="groups-page">
      <Link to="/home" className="neo-btn groups-page__back">
        ← К группам
      </Link>

      {group && (
        <header className="groups-page__header">
          <h1 className="groups-page__title">{groupLabel(group.group_date, group.title)}</h1>
          <p className="groups-page__user">Участники</p>
        </header>
      )}

      {loading && <p className="groups-page__empty">Загрузка…</p>}
      {error && <p className="groups-page__error">{error}</p>}

      {!loading && !error && members.length === 0 && (
        <p className="groups-page__empty">В группе пока никого нет</p>
      )}

      {!loading && !error && members.length > 0 && (
        <ul className="members-list">
          {members.map((m) => (
            <li key={m.user_id}>
              <div
                className={`neo-surface member-row${m.excluded ? ' member-row--excluded' : ''}`}
              >
                <div>
                  <div className="member-row__name">{m.name}</div>
                  {m.role === 'admin' && <div className="member-row__sub">админ</div>}
                </div>
                <div className="member-badges">
                  <span
                    className={`status-pill ${m.position === 'goalie' ? 'status-pill--guest' : ''}`}
                  >
                    {positionLabel(m.position)}
                  </span>
                  {m.is_guest && <span className="status-pill status-pill--guest">гость</span>}
                  {m.excluded && (
                    <span className="status-pill status-pill--inactive">не участвует</span>
                  )}
                  {!m.excluded && (
                    <span
                      className={`status-pill ${m.actual ? 'status-pill--actual' : 'status-pill--inactive'}`}
                    >
                      {m.actual ? 'в пуле' : 'ожидает входа'}
                    </span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
