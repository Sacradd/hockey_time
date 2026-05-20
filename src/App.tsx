import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { RequireActivate, RequireAuth, RequireGuest } from '@/components/RequireAuth'
import { AppLayout } from '@/components/layout/AppLayout'
import { ActivatePage } from '@/pages/ActivatePage'
import { HomePage } from '@/pages/HomePage'
import { LoginPage } from '@/pages/LoginPage'

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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
