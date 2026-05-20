import { Outlet, useLocation } from 'react-router-dom'
import { PowerOffButton } from '@/components/PowerOffButton'
import { UserProfileBar } from '@/components/UserProfileBar'
import { useAuth } from '@/context/AuthContext'

const GUEST_PATHS = ['/', '/login', '/activate']

export function AppLayout() {
  const { user, token, loading } = useAuth()
  const { pathname } = useLocation()

  const showTopBar =
    !loading && !!user && !!token && !GUEST_PATHS.includes(pathname)

  return (
    <div className={`app-shell${showTopBar ? ' app-shell--with-topbar' : ''}`}>
      {showTopBar && (
        <>
          <UserProfileBar />
          <PowerOffButton />
        </>
      )}
      <Outlet />
    </div>
  )
}
