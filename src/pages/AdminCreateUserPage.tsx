import { useState } from 'react'
import { createUser } from '@/api/admin'
import { ApiError } from '@/api/http'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/context/AuthContext'
import {
  buildCredentialsCopyText,
  type CreatedCredentials,
} from '@/lib/credentialsCopy'
import { copyToClipboard } from '@/lib/copyToClipboard'
import './Groups.css'
import './LoginPage.css'

export function AdminCreateUserPage() {
  const { token } = useAuth()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [position, setPosition] = useState<'player' | 'goalie'>('player')
  const [isGroupAdmin, setIsGroupAdmin] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [created, setCreated] = useState<CreatedCredentials | null>(null)
  const [copied, setCopied] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return
    setError('')
    setSuccess('')
    setCreated(null)
    setCopied(false)
    setSubmitting(true)
    const passwordForCopy = password
    try {
      const res = await createUser(token, {
        phone: phone.trim(),
        password: passwordForCopy,
        position,
        is_group_admin: isGroupAdmin,
      })
      const note = res.is_group_admin
        ? ' · может создавать группы'
        : ''
      setSuccess(`Создан: ${res.phone_display}${note}. Передайте телефон и пароль.`)
      setCreated({
        phone_display: res.phone_display,
        password: passwordForCopy,
      })
      setPhone('')
      setPassword('')
      setPosition('player')
      setIsGroupAdmin(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Ошибка')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="groups-page">
      <h1 className="groups-page__title">Новый игрок</h1>

      <form className="login-page__form" onSubmit={handleSubmit}>
        <label className="neo-field">
          <span className="neo-label">Амплуа</span>
          <select
            className="neo-input"
            value={position}
            onChange={(e) => setPosition(e.target.value as 'player' | 'goalie')}
          >
            <option value="player">Полевой</option>
            <option value="goalie">Вратарь</option>
          </select>
        </label>
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
        <Button type="submit" variant="accent" disabled={submitting}>
          {submitting ? 'Создание…' : 'Создать'}
        </Button>
      </form>
    </div>
  )
}
