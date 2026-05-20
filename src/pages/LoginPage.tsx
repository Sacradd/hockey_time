import { useState } from 'react'
import { Emblem } from '@/components/Emblem'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import './LoginPage.css'

export function LoginPage() {
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    console.log('login', { login, password })
  }

  return (
    <div className="login-page">
      <Emblem />

      <form className="login-page__form" onSubmit={handleSubmit}>
        <Input
          id="login"
          type="text"
          autoComplete="username"
          placeholder="Логин"
          aria-label="Логин"
          value={login}
          onChange={(e) => setLogin(e.target.value)}
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

        <Button variant="accent" type="submit" className="login-page__submit">
          Войти
        </Button>
      </form>
    </div>
  )
}
