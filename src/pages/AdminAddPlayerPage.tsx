import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { createPlayer } from '@/api/admin'
import { ApiError } from '@/api/http'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/context/AuthContext'
import './Groups.css'
import './LoginPage.css'

export function AdminAddPlayerPage() {
  const { id } = useParams()
  const rosterId = Number(id)
  const { token } = useAuth()
  const navigate = useNavigate()

  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [position, setPosition] = useState<'player' | 'goalie'>('player')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
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
      setSuccess(`Создан: ${res.phone_display}, пароль выдан`)
      setPhone('')
      setPassword('')
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

      <h1 className="groups-page__title">Добавить игрока</h1>

      <form className="login-page__form" onSubmit={handleSubmit}>
        <Input
          id="phone"
          type="tel"
          placeholder="Телефон"
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

        <label className="neo-field">
          <span className="neo-label">Позиция</span>
          <select
            className="neo-input"
            value={position}
            onChange={(e) => setPosition(e.target.value as 'player' | 'goalie')}
          >
            <option value="player">Полевой (лимит 20)</option>
            <option value="goalie">Вратарь (лимит 2)</option>
          </select>
        </label>

        {error && <p className="login-page__error">{error}</p>}
        {success && (
          <p style={{ color: 'var(--color-success)', fontSize: '0.875rem', textAlign: 'center' }}>
            {success}
          </p>
        )}

        <Button variant="accent" type="submit" disabled={submitting}>
          {submitting ? 'Сохранение…' : 'Создать'}
        </Button>
        <Button type="button" variant="default" onClick={() => navigate(`/rosters/${rosterId}`)}>
          К roster
        </Button>
      </form>
    </div>
  )
}
