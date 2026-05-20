import { apiFetch } from '@/api/http'
import type { DayGroup, GroupDetail, GroupMember } from '@/types/groups'

export function fetchGroups(token: string) {
  return apiFetch<{ ok: boolean; groups: DayGroup[] }>('/groups/list.php', {
    method: 'GET',
    token,
  })
}

export function fetchGroupMembers(token: string, groupId: number) {
  return apiFetch<{ ok: boolean; group: GroupDetail; members: GroupMember[] }>(
    `/groups/members.php?group_id=${groupId}`,
    { method: 'GET', token }
  )
}
