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
  const hideProfileBar = /^\/groups\/\d+\/teams\/?$/.test(pathname)
  const isTeamsFormPage = hideProfileBar
  const isGameScrollPage = /^\/groups\/\d+\/?$/.test(pathname)

  return (
    <div
      className={`app-shell${showTopBar ? ' app-shell--with-topbar' : ''}${
        isTeamsFormPage ? ' app-shell--teams-form' : ''
      }${isGameScrollPage ? ' app-shell--game-scroll' : ''}`}
    >
      {showTopBar && (
        <>
          {!hideProfileBar && <UserProfileBar />}
          {!isTeamsFormPage && <PowerOffButton />}
        </>
      )}
      <Outlet />
    </div>
  )
}
