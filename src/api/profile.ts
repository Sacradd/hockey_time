import { apiFetch } from '@/api/http'
import type { User } from '@/types/auth'
import type { ProfileRosterDetail, ProfileRosterSummary } from '@/types/groups'

export function fetchProfileRosters(token: string) {
  return apiFetch<{
    ok: boolean
    phone_display: string
    rosters: ProfileRosterSummary[]
  }>('/profile/rosters.php', { method: 'GET', token })
}

export function updateProfile(
  token: string,
  data: { display_login: string; favorite_team: string }
) {
  return apiFetch<{ ok: boolean; user: User }>('/profile/update.php', {
    method: 'POST',
    token,
    body: JSON.stringify(data),
  })
}

export function fetchProfileRoster(token: string, rosterId: number) {
  return apiFetch<{ ok: boolean } & ProfileRosterDetail>(
    `/profile/roster.php?roster_id=${rosterId}`,
    { method: 'GET', token }
  )
}
