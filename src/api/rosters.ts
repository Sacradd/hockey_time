import { apiFetch } from '@/api/http'
import type { GameSummary, Roster, RosterMember } from '@/types/groups'

export function fetchRosters(token: string) {
  return apiFetch<{ ok: boolean; rosters: Roster[] }>('/rosters/list.php', {
    method: 'GET',
    token,
  })
}

export function fetchRosterMembers(token: string, rosterId: number) {
  return apiFetch<{ ok: boolean; roster: Roster; members: RosterMember[] }>(
    `/rosters/members.php?roster_id=${rosterId}`,
    { method: 'GET', token }
  )
}

export function fetchRosterGames(token: string, rosterId: number) {
  return apiFetch<{ ok: boolean; games: GameSummary[] }>(
    `/rosters/games.php?roster_id=${rosterId}`,
    { method: 'GET', token }
  )
}
