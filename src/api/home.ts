import { apiFetch } from '@/api/http'
import type { DashboardData } from '@/types/groups'

export function fetchDashboard(token: string) {
  return apiFetch<{ ok: boolean } & DashboardData>('/home/dashboard.php', {
    method: 'GET',
    token,
  })
}
