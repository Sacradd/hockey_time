import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { activate } from '@/api/auth'
import { ApiError } from '@/api/http'
import { Emblem } from '@/components/Emblem'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/context/AuthContext'
import './LoginPage.css'

export function ActivatePage() {
  const { token, setSession } = useAuth()
  const navigate = useNavigate()
  const [displayLogin, setDisplayLogin] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (newPassword !== confirm) {
      setError('Пароли не совпадают')
      return
    }

    if (!token) {
      setError('Сессия истекла, войдите снова')
      navigate('/login', { replace: true })
      return
    }

    setSubmitting(true)
    try {
      const res = await activate(token, newPassword, displayLogin)
      if (res.ok && res.token && res.user) {
        setSession(res.token, res.user)
        navigate('/home', { replace: true })
      } else {
        setError(res.error ?? 'Не удалось сохранить')
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Ошибка сети')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <Emblem />

      <p className="login-page__hint">Первый вход: задайте свой пароль и ник</p>

      <form className="login-page__form" onSubmit={handleSubmit}>
        <Input
          id="nick"
          type="text"
          autoComplete="username"
          placeholder="Ваш ник"
          aria-label="Ник"
          value={displayLogin}
          onChange={(e) => setDisplayLogin(e.target.value)}
        />

        <Input
          id="new-password"
          type="password"
          autoComplete="new-password"
          placeholder="Новый пароль"
          aria-label="Новый пароль"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />

        <Input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          placeholder="Повторите пароль"
          aria-label="Повторите пароль"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />

        {error && <p className="login-page__error">{error}</p>}

        <Button
          variant="accent"
          type="submit"
          className="login-page__submit"
          disabled={submitting}
        >
          {submitting ? 'Сохранение…' : 'Продолжить'}
        </Button>
      </form>
    </div>
  )
}
