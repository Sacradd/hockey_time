import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '@/api/auth'
import { ApiError } from '@/api/http'
import { Emblem } from '@/components/Emblem'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/context/AuthContext'
import { tryEnablePushAfterLogin } from '@/lib/pushClient'
import './LoginPage.css'

export function LoginPage() {
  const { setSession } = useAuth()
  const navigate = useNavigate()
  const [loginValue, setLoginValue] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const res = await login(loginValue.trim(), password)
      if (res.ok && res.token && res.user) {
        setSession(res.token, res.user)
        if (res.user.must_change_password) {
          navigate('/activate', { replace: true })
        } else {
          await tryEnablePushAfterLogin(res.token)
          navigate('/home', { replace: true })
        }
      } else {
        setError(res.error ?? 'Не удалось войти')
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Ошибка сети. Проверьте Laragon и npm run dev')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <Emblem />

      <form className="login-page__form" onSubmit={handleSubmit}>
        <Input
          id="login"
          type="text"
          inputMode="text"
          autoComplete="username"
          placeholder="Телефон или ник"
          aria-label="Телефон или ник"
          value={loginValue}
          onChange={(e) => setLoginValue(e.target.value)}
        />

        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder="Пароль"
          aria-label="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p className="login-page__error">{error}</p>}

        <Button
          variant="accent"
          type="submit"
          className="login-page__submit"
          disabled={submitting}
        >
          {submitting ? 'Вход…' : 'Войти'}
        </Button>
      </form>
    </div>
  )
}
