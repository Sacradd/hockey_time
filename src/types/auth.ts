export type UserRole = 'super' | 'admin' | 'player'
export type UserPosition = 'player' | 'goalie'

export interface User {
  id: number
  phone: string
  display_login: string | null
  favorite_team: string | null
  role: UserRole
  position: UserPosition
  must_change_password: boolean
  is_active: boolean
}

export interface AuthResponse {
  ok: boolean
  token?: string
  user?: User
  error?: string
}
