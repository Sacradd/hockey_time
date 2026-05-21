import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createUser } from '@/api/admin'
import { ApiError } from '@/api/http'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/context/AuthContext'
import './Groups.css'
import './LoginPage.css'

export function AdminCreateUserPage() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [isGroupAdmin, setIsGroupAdmin] = useState(false)
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
      const res = await createUser(token, {
        phone: phone.trim(),
        password,
        is_group_admin: isGroupAdmin,
      })
      const note = res.is_group_admin
        ? ' · может создавать группы'
        : ''
      setSuccess(
        `Создан: ${res.phone_display}${note}. Передайте телефон и пароль. Игрок в общем списке.`
      )
      setPhone('')
      setPassword('')
      setIsGroupAdmin(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Ошибка')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="groups-page">
      <Link to="/home" className="neo-btn groups-page__back">
        ← На главную
      </Link>

      <h1 className="groups-page__title">Новый игрок в пул</h1>
      <p className="groups-page__user">
        Без привязки к группе. Админ группы сам создаст группу и добавит людей.
      </p>

      <form className="login-page__form" onSubmit={handleSubmit}>
        <Input
          id="phone"
          type="tel"
          placeholder="Телефон"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
        <Input
          id="password"
          type="text"
          placeholder="Временный пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <label className="neo-check">
          <input
            type="checkbox"
            checked={isGroupAdmin}
            onChange={(e) => setIsGroupAdmin(e.target.checked)}
          />
          <span>Будет создавать группы (админ льда)</span>
        </label>
        {error && <p className="login-page__error">{error}</p>}
        {success && <p className="login-page__success">{success}</p>}
        <Button type="submit" variant="accent" disabled={submitting}>
          {submitting ? 'Создание…' : 'Создать в общий список'}
        </Button>
      </form>

      <Button type="button" onClick={() => navigate('/home')}>
        Готово
      </Button>
    </div>
  )
}
