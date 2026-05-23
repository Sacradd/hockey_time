import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { addMember, createPlayer, searchPlayers } from '@/api/admin'
import { ApiError } from '@/api/http'
import { PositionPill } from '@/components/PositionPill'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/context/AuthContext'
import {
  buildCredentialsCopyText,
  type CreatedCredentials,
} from '@/lib/credentialsCopy'
import { copyToClipboard } from '@/lib/copyToClipboard'
import type { PlayerSearchHit } from '@/types/groups'
import './Groups.css'
import './LoginPage.css'

type Tab = 'new' | 'existing'

function hitLabel(h: PlayerSearchHit): string {
  return h.name
}

export function AdminAddPlayerPage() {
  const { id } = useParams()
  const rosterId = Number(id)
  const { token } = useAuth()
  const [tab, setTab] = useState<Tab>('new')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [newUserPosition, setNewUserPosition] = useState<'player' | 'goalie'>('player')
  const [searchQ, setSearchQ] = useState('')
  const [hits, setHits] = useState<PlayerSearchHit[]>([])
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerSearchHit | null>(null)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [created, setCreated] = useState<CreatedCredentials | null>(null)
  const [copied, setCopied] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  /** После выбора карточки подставляем ник в поле, но не дергаем список повторным поиском */
  const skipSearchOnceRef = useRef(false)

  useEffect(() => {
    if (!token || tab !== 'existing' || !Number.isFinite(rosterId)) {
      setHits([])
      return
    }

    if (skipSearchOnceRef.current) {
      skipSearchOnceRef.current = false
      return
    }

    const delay = searchQ.trim().length >= 2 ? 300 : 0
    const t = setTimeout(() => {
      setSearching(true)
      setError('')
      searchPlayers(token, rosterId, searchQ.trim())
        .then((res) => setHits(res.players))
        .catch((err) => {
          setHits([])
          setError(err instanceof ApiError ? err.message : 'Не удалось загрузить список')
        })
        .finally(() => setSearching(false))
    }, delay)

    return () => clearTimeout(t)
  }, [token, rosterId, searchQ, tab])

  function switchTab(next: Tab) {
    setTab(next)
    setCreated(null)
    setCopied(false)
    setError('')
    setSuccess('')
    if (next === 'existing') {
      setSearchQ('')
      setSelectedPlayer(null)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return
    setError('')
    setSuccess('')
    setCreated(null)
    setCopied(false)
    setSubmitting(true)
    const passwordForCopy = password
    try {
      const res = await createPlayer(token, {
        roster_id: rosterId,
        phone: phone.trim(),
        password: passwordForCopy,
        position: newUserPosition,
      })
      setSuccess(`Создан: ${res.phone_display}. Передайте телефон и пароль игроку.`)
      setCreated({
        phone_display: res.phone_display,
        password: passwordForCopy,
      })
      setPhone('')
      setPassword('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Ошибка')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleAddSelected() {
    if (!token || !selectedPlayer) return
    setError('')
    setSuccess('')
    setCreated(null)
    setCopied(false)
    setSubmitting(true)
    const userId = selectedPlayer.user_id
    try {
      const res = await addMember(token, {
        roster_id: rosterId,
        user_id: userId,
      })
      setSuccess(`Добавлен: ${res.name}`)
      setSearchQ('')
      setSelectedPlayer(null)
      setHits((prev) => prev.filter((h) => h.user_id !== userId))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Ошибка')
    } finally {
      setSubmitting(false)
    }
  }

  function selectPlayer(h: PlayerSearchHit) {
    setSelectedPlayer(h)
    skipSearchOnceRef.current = true
    setSearchQ(hitLabel(h))
    setError('')
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
          className={`neo-btn add-player-tabs__btn${tab === 'new' ? ' neo-btn--accent' : ''}`}
          onClick={() => switchTab('new')}
        >
          Новый
        </button>
        <button
          type="button"
          className={`neo-btn add-player-tabs__btn${tab === 'existing' ? ' neo-btn--accent' : ''}`}
          onClick={() => switchTab('existing')}
        >
          Из списка
        </button>
      </div>

      {tab === 'new' && (
        <form className="login-page__form" onSubmit={handleCreate}>
          <label className="neo-field">
            <span className="neo-label">Амплуа</span>
            <select
              className="neo-input"
              value={newUserPosition}
              onChange={(e) =>
                setNewUserPosition(e.target.value as 'player' | 'goalie')
              }
            >
              <option value="player">Полевой</option>
              <option value="goalie">Вратарь</option>
            </select>
          </label>
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
          {created && (
            <Button
              type="button"
              onClick={() => {
                try {
                  copyToClipboard(buildCredentialsCopyText(created))
                  setError('')
                  setCopied(true)
                } catch {
                  setError('Не удалось скопировать')
                }
              }}
            >
              {copied ? 'Скопировано' : 'Скопировать данные'}
            </Button>
          )}
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
            onChange={(e) => {
              setSearchQ(e.target.value)
              setSelectedPlayer(null)
            }}
            autoComplete="off"
          />
          {searching && hits.length === 0 && (
            <p className="groups-page__empty">Поиск…</p>
          )}
          {!searching && searchQ.trim().length >= 2 && hits.length === 0 && (
            <p className="groups-page__empty">Никого не найдено</p>
          )}
          {!searching && searchQ.trim().length < 2 && hits.length === 0 && (
            <p className="groups-page__empty">
              В пуле пока нет свободных игроков для этой группы
            </p>
          )}
          <ul className="search-hits">
            {hits.map((h) => {
              const selected = selectedPlayer?.user_id === h.user_id
              return (
                <li key={h.user_id}>
                  <button
                    type="button"
                    className={`neo-surface search-hits__item${
                      selected ? ' search-hits__item--selected' : ''
                    }`}
                    disabled={submitting}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectPlayer(h)}
                  >
                    <span className="search-hits__name-wrap">
                      <span className="search-hits__name">{h.name}</span>
                      <span className="search-hits__meta">
                        {[
                          h.phone_display && h.name !== h.phone_display
                            ? h.phone_display
                            : null,
                          !h.is_active ? 'не активирован' : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </span>
                    <PositionPill position={h.position} />
                  </button>
                </li>
              )
            })}
          </ul>
          {error && <p className="login-page__error">{error}</p>}
          {success && <p className="login-page__success">{success}</p>}
        </div>
      )}

      {tab === 'existing' && (
        <Button
          type="button"
          variant="accent"
          disabled={!selectedPlayer || submitting}
          onClick={() => void handleAddSelected()}
        >
          {submitting ? 'Добавление…' : 'Добавить'}
        </Button>
      )}
    </div>
  )
}
