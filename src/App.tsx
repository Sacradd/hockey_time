import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { RequireActivate, RequireAuth, RequireGuest } from '@/components/RequireAuth'
import { RequireSuper } from '@/components/RequireSuper'
import { AdminCreateUserPage } from '@/pages/AdminCreateUserPage'
import { AppLayout } from '@/components/layout/AppLayout'
import { ActivatePage } from '@/pages/ActivatePage'
import { AdminAddPlayerPage } from '@/pages/AdminAddPlayerPage'
import { GroupPage } from '@/pages/GroupPage'
import { HomePage } from '@/pages/HomePage'
import { LoginPage } from '@/pages/LoginPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { ProfileRosterPage } from '@/pages/ProfileRosterPage'
import { RosterPage } from '@/pages/RosterPage'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route
            path="/"
            element={
              <RequireGuest>
                <LoginPage />
              </RequireGuest>
            }
          />
          <Route
            path="/login"
            element={
              <RequireGuest>
                <LoginPage />
              </RequireGuest>
            }
          />
          <Route
            path="/activate"
            element={
              <RequireActivate>
                <ActivatePage />
              </RequireActivate>
            }
          />
          <Route
            path="/home"
            element={
              <RequireAuth>
                <HomePage />
              </RequireAuth>
            }
          />
          <Route
            path="/profile"
            element={
              <RequireAuth>
                <ProfilePage />
              </RequireAuth>
            }
          />
          <Route
            path="/profile/rosters/:id"
            element={
              <RequireAuth>
                <ProfileRosterPage />
              </RequireAuth>
            }
          />
          <Route
            path="/rosters/:id"
            element={
              <RequireAuth>
                <RosterPage />
              </RequireAuth>
            }
          />
          <Route
            path="/rosters/:id/add-player"
            element={
              <RequireAuth>
                <AdminAddPlayerPage />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/create-user"
            element={
              <RequireAuth>
                <RequireSuper>
                  <AdminCreateUserPage />
                </RequireSuper>
              </RequireAuth>
            }
          />
          <Route
            path="/groups/:id"
            element={
              <RequireAuth>
                <GroupPage />
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
