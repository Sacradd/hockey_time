import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { addMember, createPlayer, searchPlayers } from '@/api/admin'
import { ApiError } from '@/api/http'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/context/AuthContext'
import type { PlayerSearchHit } from '@/types/groups'
import './Groups.css'
import './LoginPage.css'

type Tab = 'new' | 'existing'

export function AdminAddPlayerPage() {
  const { id } = useParams()
  const rosterId = Number(id)
  const { token } = useAuth()
  const navigate = useNavigate()

  const [tab, setTab] = useState<Tab>('new')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [position, setPosition] = useState<'player' | 'goalie'>('player')
  const [searchQ, setSearchQ] = useState('')
  const [hits, setHits] = useState<PlayerSearchHit[]>([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!token || tab !== 'existing' || searchQ.trim().length < 2) {
      setHits([])
      return
    }
    const t = setTimeout(() => {
      setSearching(true)
      searchPlayers(token, rosterId, searchQ.trim())
        .then((res) => setHits(res.players))
        .catch(() => setHits([]))
        .finally(() => setSearching(false))
    }, 300)
    return () => clearTimeout(t)
  }, [token, rosterId, searchQ, tab])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return
    setError('')
    setSuccess('')
    setSubmitting(true)
    try {
      const res = await createPlayer(token, {
        roster_id: rosterId,
        phone: phone.trim(),
        password,
        position,
      })
      setSuccess(`Создан: ${res.phone_display}. Передайте телефон и пароль игроку.`)
      setPhone('')
      setPassword('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Ошибка')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleAddExisting(userId: number) {
    if (!token) return
    setError('')
    setSuccess('')
    setSubmitting(true)
    try {
      const res = await addMember(token, {
        roster_id: rosterId,
        user_id: userId,
        position,
      })
      setSuccess(`Добавлен: ${res.name}`)
      setSearchQ('')
      setHits([])
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Ошибка')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="groups-page">
      <Link to={`/rosters/${rosterId}`} className="neo-btn groups-page__back">
        ← Назад
      </Link>

      <h1 className="groups-page__title">Добавить в группу</h1>

      <div className="add-player-tabs">
        <button
          type="button"
          className={`neo-btn add-player-tabs__btn ${tab === 'new' ? 'add-player-tabs__btn--active' : ''}`}
          onClick={() => setTab('new')}
        >
          Новый
        </button>
        <button
          type="button"
          className={`neo-btn add-player-tabs__btn ${tab === 'existing' ? 'add-player-tabs__btn--active' : ''}`}
          onClick={() => setTab('existing')}
        >
          Из списка
        </button>
      </div>

      <label className="neo-field" style={{ marginBottom: 'var(--space-md)' }}>
        <span className="neo-label">Позиция в группе</span>
        <select
          className="neo-input"
          value={position}
          onChange={(e) => setPosition(e.target.value as 'player' | 'goalie')}
        >
          <option value="player">Полевой</option>
          <option value="goalie">Вратарь</option>
        </select>
      </label>

      {tab === 'new' && (
        <form className="login-page__form" onSubmit={handleCreate}>
          <Input
            id="phone"
            type="tel"
            placeholder="Телефон (логин для входа)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <Input
            id="password"
            type="text"
            placeholder="Временный пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="login-page__error">{error}</p>}
          {success && <p className="login-page__success">{success}</p>}
          <Button variant="accent" type="submit" disabled={submitting}>
            {submitting ? 'Создание…' : 'Создать аккаунт'}
          </Button>
        </form>
      )}

      {tab === 'existing' && (
        <div className="login-page__form">
          <Input
            id="search"
            type="search"
            placeholder="Ник или телефон (от 2 символов)"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
          />
          {searching && <p className="groups-page__empty">Поиск…</p>}
          <ul className="search-hits">
            {hits.map((h) => (
              <li key={h.user_id}>
                <button
                  type="button"
                  className="neo-surface search-hits__item"
                  disabled={h.in_roster || submitting}
                  onClick={() => handleAddExisting(h.user_id)}
                >
                  <span className="search-hits__name">{h.name}</span>
                  <span className="search-hits__meta">
                    {h.in_roster
                      ? 'уже в группе'
                      : h.is_active
                        ? 'активен'
                        : 'не активирован'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {error && <p className="login-page__error">{error}</p>}
          {success && <p className="login-page__success">{success}</p>}
        </div>
      )}

      <Button type="button" variant="default" onClick={() => navigate(`/rosters/${rosterId}`)}>
        Готово
      </Button>
    </div>
  )
}
