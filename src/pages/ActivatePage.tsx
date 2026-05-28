import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { activate } from '@/api/auth'
import { ApiError } from '@/api/http'
import { Emblem } from '@/components/Emblem'
import { TeamPicker } from '@/components/TeamPicker'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/context/AuthContext'
import { tryEnablePushAfterLogin } from '@/lib/pushClient'
import './LoginPage.css'

export function ActivatePage() {
  const { token, setSession } = useAuth()
  const navigate = useNavigate()
  const [favoriteTeam, setFavoriteTeam] = useState('')
  const [displayLogin, setDisplayLogin] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!favoriteTeam) {
      setError('Выберите команду КХЛ')
      return
    }

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
      const res = await activate(token, newPassword, displayLogin, favoriteTeam)
      if (res.ok && res.token && res.user) {
        setSession(res.token, res.user)
        await tryEnablePushAfterLogin(res.token)
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
    <div className="login-page login-page--activate">
      <Emblem />

      <p className="login-page__hint">Первый вход: команда КХЛ, ник и новый пароль</p>

      <p className="login-page__hint login-page__hint--section">Ваша команда</p>
      <TeamPicker value={favoriteTeam} onChange={setFavoriteTeam} />

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
