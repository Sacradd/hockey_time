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
