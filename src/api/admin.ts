import { apiFetch } from '@/api/http'
import type { User } from '@/types/auth'
import type { GameSummary } from '@/types/groups'

export function createPlayer(
  token: string,
  data: {
    roster_id: number
    phone: string
    password: string
    position: 'player' | 'goalie'
  }
) {
  return apiFetch<{ ok: boolean; user: User; phone_display: string }>(
    '/admin/create-player.php',
    {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    }
  )
}

export function searchPlayers(token: string, rosterId: number, q: string) {
  return apiFetch<{
    ok: boolean
    players: import('@/types/groups').PlayerSearchHit[]
  }>(`/admin/search-players.php?roster_id=${rosterId}&q=${encodeURIComponent(q)}`, {
    method: 'GET',
    token,
  })
}

export function addMember(
  token: string,
  data: {
    roster_id: number
    user_id: number
    position: 'player' | 'goalie'
  }
) {
  return apiFetch<{ ok: boolean; user_id: number; name: string; added: boolean }>(
    '/admin/add-member.php',
    {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    }
  )
}

export function createGame(
  token: string,
  data: { roster_id: number; date: string; title?: string }
) {
  return apiFetch<{ ok: boolean; game: GameSummary & { roster_id: number } }>(
    '/admin/create-game.php',
    {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    }
  )
}

export interface SuperUserRoster {
  roster_id: number
  title: string
  is_admin: boolean
}

export interface SuperUserListItem {
  user_id: number
  name: string
  display_login: string | null
  phone_display: string
  is_active: boolean
  role: string
  rosters: SuperUserRoster[]
}

export function fetchAllUsers(token: string) {
  return apiFetch<{ ok: boolean; users: SuperUserListItem[] }>('/admin/list-users.php', {
    method: 'GET',
    token,
  })
}

export function deleteUser(token: string, userId: number) {
  return apiFetch<{ ok: boolean; deleted: boolean; name: string }>(
    '/admin/delete-user.php',
    {
      method: 'POST',
      token,
      body: JSON.stringify({ user_id: userId }),
    }
  )
}

export interface UserResetSearchHit {
  user_id: number
  name: string
  display_login: string | null
  phone_display: string
  is_active: boolean
}

export interface ResetPasswordResult {
  ok: boolean
  user_id: number
  name: string
  display_login: string | null
  phone_display: string
  temporary_password: string
  login_hint: string
}

export function searchUsersForReset(token: string, q: string) {
  return apiFetch<{ ok: boolean; users: UserResetSearchHit[] }>(
    `/admin/search-users-reset.php?q=${encodeURIComponent(q)}`,
    { method: 'GET', token }
  )
}

export function setRosterAdmin(
  token: string,
  data: { roster_id: number; user_id: number; is_admin: boolean }
) {
  return apiFetch<{ ok: boolean; user_id: number; name: string; is_admin: boolean }>(
    '/admin/set-roster-admin.php',
    {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    }
  )
}

export function resetUserPassword(
  token: string,
  data: { user_id: number; password?: string }
) {
  return apiFetch<ResetPasswordResult>('/admin/reset-password.php', {
    method: 'POST',
    token,
    body: JSON.stringify(data),
  })
}

export { startVote, stopVote } from '@/api/games'
