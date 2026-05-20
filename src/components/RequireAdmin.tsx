import { Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 'var(--space-xl)' }}>
        Загрузка…
      </p>
    )
  }

  if (!user || user.role !== 'admin') {
    return <Navigate to="/home" replace />
  }

  return children
}
