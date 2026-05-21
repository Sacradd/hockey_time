import { apiFetch } from '@/api/http'
import type { GameDetailResponse, GamePublic } from '@/types/games'

export function fetchGameDetail(token: string, gameId: number) {
  return apiFetch<GameDetailResponse>(
    `/games/detail.php?game_id=${gameId}`,
    { method: 'GET', token }
  )
}

export function castVote(token: string, gameId: number, choice: number) {
  return apiFetch<{ ok: boolean; vote: { choice: number; voted_at: string } }>(
    '/games/vote.php',
    {
      method: 'POST',
      token,
      body: JSON.stringify({ game_id: gameId, choice }),
    }
  )
}

export function startVote(
  token: string,
  data: {
    game_id: number
    vote_label_1: string
    vote_label_2: string
    vote_label_3?: string
    vote_go_option?: number
    hours?: number
  }
) {
  return apiFetch<{ ok: boolean; game: GamePublic }>('/admin/start-vote.php', {
    method: 'POST',
    token,
    body: JSON.stringify(data),
  })
}

export function stopVote(token: string, gameId: number) {
  return apiFetch<{ ok: boolean; game: GamePublic }>('/admin/stop-vote.php', {
    method: 'POST',
    token,
    body: JSON.stringify({ game_id: gameId }),
  })
}
