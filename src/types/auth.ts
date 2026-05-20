export type UserRole = 'admin' | 'player'

export interface User {
  id: number
  phone: string
  display_login: string | null
  role: UserRole
  must_change_password: boolean
  is_active: boolean
}

export interface AuthResponse {
  ok: boolean
  token?: string
  user?: User
  error?: string
}
