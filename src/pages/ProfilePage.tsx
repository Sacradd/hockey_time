import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchProfileRosters, updateProfile } from '@/api/profile'
import { fetchPushStatus } from '@/api/push'
import { ApiError } from '@/api/http'
import { TeamAvatar } from '@/components/TeamAvatar'
import { TeamPicker } from '@/components/TeamPicker'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/context/AuthContext'
import {
  enablePushNotifications,
  pushEnableResultMessage,
  type PushEnableResult,
} from '@/lib/pushClient'
import { getKhlTeam } from '@/data/khlTeams'
import { weekdayLabel } from '@/lib/labels'
import type { ProfileRosterSummary } from '@/types/groups'
import './Groups.css'
import './LoginPage.css'

export function ProfilePage() {
  const { user, token, updateUser } = useAuth()
  const [phoneDisplay, setPhoneDisplay] = useState('')
  const [rosters, setRosters] = useState<ProfileRosterSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [editing, setEditing] = useState(false)
  const [editNick, setEditNick] = useState('')
  const [editTeam, setEditTeam] = useState('')
  const [editError, setEditError] = useState('')
  const [saving, setSaving] = useState(false)
  const [pushBusy, setPushBusy] = useState(false)
  const [pushSubscribed, setPushSubscribed] = useState(false)
  const [pushNotice, setPushNotice] = useState('')
  const [pushNoticeOk, setPushNoticeOk] = useState(false)

  const nick = user?.display_login ?? 'Игрок'
  const team = getKhlTeam(user?.favorite_team)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    fetchPushStatus(token)
      .then((res) => {
        if (!cancelled && res.ok) {
          setPushSubscribed(res.subscribed)
        }
      })
      .catch(() => {
        /* статус push не критичен */
      })
    return () => {
      cancelled = true
    }
  }, [token])

  useEffect(() => {
    if (!token) return
    let cancelled = false
    fetchProfileRosters(token)
      .then((res) => {
        if (!cancelled) {
          setPhoneDisplay(res.phone_display)
          setRosters(res.rosters)
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

  function openEdit() {
    setEditNick(user?.display_login ?? '')
    setEditTeam(user?.favorite_team ?? '')
    setEditError('')
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
    setEditError('')
  }

  async function handleEnablePush() {
    if (!token || pushBusy) return
    setPushBusy(true)
    setPushNotice('')
    setPushNoticeOk(false)
    try {
      const result: PushEnableResult = await enablePushNotifications(token)
      const ok = result === 'subscribed'
      setPushNoticeOk(ok)
      setPushNotice(pushEnableResultMessage(result))
      if (ok) {
        setPushSubscribed(true)
      } else {
        const status = await fetchPushStatus(token).catch(() => null)
        if (status?.ok) {
          setPushSubscribed(status.subscribed)
        }
      }
    } finally {
      setPushBusy(false)
    }
  }

  async function saveEdit() {
    if (!token) return
    setEditError('')
    if (!editNick.trim()) {
      setEditError('Введите ник')
      return
    }
    if (!editTeam) {
      setEditError('Выберите команду')
      return
    }
    setSaving(true)
    try {
      const res = await updateProfile(token, {
        display_login: editNick.trim(),
        favorite_team: editTeam,
      })
      updateUser(res.user)
      setEditing(false)
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : 'Не удалось сохранить')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="groups-page">
      <div className={`profile-card neo-surface${editing ? ' profile-card--editing' : ''}`}>
        {!editing ? (
          <>
            <TeamAvatar slug={user?.favorite_team} size={56} />
            <div className="profile-card__main">
              <h1 className="profile-card__nick">{nick}</h1>
              {team && <p className="profile-card__team">{team.name}</p>}
              <p className="profile-card__phone">{phoneDisplay}</p>
              {user?.role === 'super' && (
                <span className="profile-card__badge">супер</span>
              )}
            </div>
            <button
              type="button"
              className="profile-edit-btn"
              onClick={openEdit}
              aria-label="Редактировать профиль"
              title="Редактировать"
            >
              <svg className="profile-edit-btn__icon" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M4 20h4l10.5-10.5a1.5 1.5 0 0 0 0-2.12L14.62 3.5a1.5 1.5 0 0 0-2.12 0L4 12v8z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinejoin="round"
                />
                <path
                  d="M13.5 6.5l4 4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </>
        ) : (
          <div className="profile-card__edit">
            <div className="profile-card__edit-row">
              <TeamAvatar slug={editTeam || user?.favorite_team} size={56} />
              <label className="neo-field profile-card__nick-field" htmlFor="profile-nick">
                <input
                  id="profile-nick"
                  className="neo-input"
                  type="text"
                  value={editNick}
                  onChange={(e) => setEditNick(e.target.value)}
                  autoComplete="username"
                  aria-label="Ник"
                  placeholder="Ник"
                />
              </label>
            </div>
            <TeamPicker compact value={editTeam} onChange={setEditTeam} />
            {editError && <p className="login-page__error profile-card__edit-error">{editError}</p>}
            <div className="profile-card__edit-actions">
              <Button type="button" variant="default" onClick={cancelEdit} disabled={saving}>
                Отмена
              </Button>
              <Button type="button" variant="accent" onClick={saveEdit} disabled={saving}>
                {saving ? 'Сохранение…' : 'Сохранить'}
              </Button>
            </div>
          </div>
        )}
      </div>

      <section className="profile-push neo-surface">
        <p className="profile-push__hint groups-page__user">
          Чтобы приходили напоминания об оплате и голосовании — включите уведомления. На iPhone
          открывайте приложение <strong>с иконки «Домой»</strong>, не из закладки Safari.
        </p>
        <Button
          type="button"
          variant={pushSubscribed ? 'default' : 'accent'}
          className="profile-push__btn"
          disabled={pushBusy || !token}
          onClick={() => void handleEnablePush()}
        >
          {pushBusy
            ? 'Подключение…'
            : pushSubscribed
              ? 'Уведомления включены'
              : 'Включить уведомления'}
        </Button>
        {pushNotice && (
          <p
            className={`profile-push__notice groups-page__user${pushNoticeOk ? ' profile-push__notice--ok' : ' profile-push__notice--err'}`}
            role="status"
          >
            {pushNotice}
          </p>
        )}
      </section>

      <Link to="/home" className="neo-btn neo-btn--accent profile-page__home-btn">
        На главную
      </Link>

      <h2 className="groups-section-title">Мои группы</h2>
      {loading && <p className="groups-page__empty">Загрузка…</p>}
      {error && <p className="groups-page__error">{error}</p>}

      {!loading && !error && rosters.length === 0 && (
        <p className="groups-page__empty">Вы пока не в группах</p>
      )}

      <ul className="groups-list">
        {rosters.map((r) => (
          <li key={r.id} className="groups-list__item">
            <Link to={`/profile/rosters/${r.id}`} className="neo-surface group-card">
              <span className="group-card__date">{r.title}</span>
              <p className="group-card__meta">
                {r.venue}
                {r.weekday !== null ? ` · ${weekdayLabel(r.weekday)}` : ''}
                {' · '}
                {r.members_count} участников
                {r.is_admin ? ' · вы админ' : ''}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
