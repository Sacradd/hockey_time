import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, token, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 'var(--space-xl)' }}>
        Загрузка…
      </p>
    )
  }

  if (!token || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (user.must_change_password) {
    return <Navigate to="/activate" replace />
  }

  return children
}

export function RequireGuest({ children }: { children: React.ReactNode }) {
  const { user, token, loading } = useAuth()

  if (loading) {
    return (
      <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 'var(--space-xl)' }}>
        Загрузка…
      </p>
    )
  }

  if (token && user) {
    if (user.must_change_password) {
      return <Navigate to="/activate" replace />
    }
    return <Navigate to="/home" replace />
  }

  return children
}

export function RequireActivate({ children }: { children: React.ReactNode }) {
  const { user, token, loading } = useAuth()

  if (loading) {
    return (
      <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 'var(--space-xl)' }}>
        Загрузка…
      </p>
    )
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />
  }

  if (!user.must_change_password) {
    return <Navigate to="/home" replace />
  }

  return children
}
