import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { fetchMe } from '@/api/auth'
import type { User } from '@/types/auth'
import { subscribeToPushIfGranted } from '@/lib/pushClient'

const TOKEN_KEY = 'hockey_token'

interface AuthContextValue {
  user: User | null
  token: string | null
  loading: boolean
  setSession: (token: string, user: User) => void
  updateUser: (user: User) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(!!sessionStorage.getItem(TOKEN_KEY))

  const setSession = useCallback((newToken: string, newUser: User) => {
    sessionStorage.setItem(TOKEN_KEY, newToken)
    setToken(newToken)
    setUser(newUser)
  }, [])

  const updateUser = useCallback((newUser: User) => {
    setUser(newUser)
  }, [])

  const logout = useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
  }, [])

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }
    let cancelled = false
    fetchMe(token)
      .then((res) => {
        if (!cancelled) setUser(res.user)
      })
      .catch(() => {
        if (!cancelled) logout()
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token, logout])

  useEffect(() => {
    if (!token || !user) return
    subscribeToPushIfGranted(token).catch(() => {
      // полная подписка — по кнопке в профиле (iPhone требует жест пользователя)
    })
  }, [token, user])

  const value = useMemo(
    () => ({ user, token, loading, setSession, updateUser, logout }),
    [user, token, loading, setSession, updateUser, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth вне AuthProvider')
  return ctx
}
