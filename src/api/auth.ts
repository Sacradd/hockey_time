import { apiFetch } from '@/api/http'
import type { AuthResponse, User } from '@/types/auth'

export function login(phone: string, password: string) {
  return apiFetch<AuthResponse>('/auth/login.php', {
    method: 'POST',
    body: JSON.stringify({ phone, password }),
  })
}

export function activate(
  token: string,
  newPassword: string,
  displayLogin: string
) {
  return apiFetch<AuthResponse>('/auth/activate.php', {
    method: 'POST',
    token,
    body: JSON.stringify({
      new_password: newPassword,
      display_login: displayLogin,
    }),
  })
}

export function fetchMe(token: string) {
  return apiFetch<{ ok: boolean; user: User }>('/auth/me.php', {
    method: 'GET',
    token,
  })
}
