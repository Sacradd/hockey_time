import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/context/AuthContext'

export function HomePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const name = user?.display_login ?? user?.phone ?? 'Игрок'

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="neo-surface" style={{ padding: 'var(--space-lg)' }}>
      <h1>Главная</h1>
      <p style={{ color: 'var(--color-text-muted)', marginTop: 'var(--space-sm)' }}>
        {name}
        {user?.role === 'admin' ? ' · админ' : ''}
      </p>
      <p style={{ color: 'var(--color-text-dim)', marginTop: 'var(--space-md)', fontSize: 'var(--font-size-sm)' }}>
        Здесь будут группы по дням — следующий этап.
      </p>
      <Button
        type="button"
        variant="default"
        style={{ marginTop: 'var(--space-lg)' }}
        onClick={handleLogout}
      >
        Выйти
      </Button>
    </div>
  )
}
