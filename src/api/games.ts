import { apiFetch } from '@/api/http'
import type { GameDetailResponse, GameLineup, GamePublic } from '@/types/games'

export function fetchGameDetail(token: string, gameId: number) {
  return apiFetch<GameDetailResponse>(
    `/games/detail.php?game_id=${gameId}`,
    { method: 'GET', token }
  )
}

/** Админ: отметить оплату полевого (в т.ч. если игрок сообщил вне приложения). */
export function markPlayerPayment(token: string, gameId: number, userId: number) {
  return apiFetch<{ ok: boolean; lineup: GameLineup; already?: boolean }>(
    '/admin/mark-payment.php',
    {
      method: 'POST',
      token,
      body: JSON.stringify({ game_id: gameId, user_id: userId }),
    }
  )
}

export function updateGame(
  token: string,
  data: {
    game_id: number
    date: string
    title?: string
    game_time?: string
    weekday?: number | null
  }
) {
  return apiFetch<{ ok: boolean; game: GamePublic }>('/admin/update-game.php', {
    method: 'POST',
    token,
    body: JSON.stringify(data),
  })
}

export function deleteGame(token: string, gameId: number) {
  return apiFetch<{ ok: boolean; deleted: boolean; roster_id: number }>(
    '/admin/delete-game.php',
    {
      method: 'POST',
      token,
      body: JSON.stringify({ game_id: gameId }),
    }
  )
}

export function confirmPayment(token: string, gameId: number) {
  return apiFetch<{ ok: boolean; payment: { paid_at: string }; already?: boolean }>(
    '/games/confirm-payment.php',
    {
      method: 'POST',
      token,
      body: JSON.stringify({ game_id: gameId }),
    }
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

/** Включить требование об оплате (голосование не закрывается). */
export function startPayment(token: string, gameId: number) {
  return apiFetch<{ ok: boolean; game: GamePublic }>('/admin/start-payment.php', {
    method: 'POST',
    token,
    body: JSON.stringify({ game_id: gameId }),
  })
}

/** Убрать из «еду»: голос → «не еду», резерв пересчитывается по времени голоса. */
export function markPlayerNotGoing(token: string, gameId: number, userId: number) {
  return apiFetch<{ ok: boolean; lineup: GameLineup }>('/admin/mark-not-going.php', {
    method: 'POST',
    token,
    body: JSON.stringify({ game_id: gameId, user_id: userId }),
  })
}

export const ADD_QUEUE_GUEST = '__guest__'

/** Гость на эту игру: имя как ник, проверка уникальности на сервере. */
export function addGuestToQueue(
  token: string,
  gameId: number,
  guestName: string,
  queuePosition: number,
  memberPosition: 'player' | 'goalie' = 'player'
) {
  return apiFetch<{ ok: boolean; lineup: GameLineup }>('/admin/add-guest-to-queue.php', {
    method: 'POST',
    token,
    body: JSON.stringify({
      game_id: gameId,
      guest_name: guestName.trim(),
      position: queuePosition,
      member_position: memberPosition,
    }),
  })
}

/** Вернуть в «еду» из «не едут»; место в очереди по времени занесения. */
export function markPlayerInLineup(token: string, gameId: number, userId: number) {
  return apiFetch<{ ok: boolean; lineup: GameLineup }>('/admin/mark-in-lineup.php', {
    method: 'POST',
    token,
    body: JSON.stringify({ game_id: gameId, user_id: userId }),
  })
}

/** Вставить/переставить полевого в очереди «еду» (сдвиг остальных). */
export function setLineupQueuePosition(
  token: string,
  gameId: number,
  userId: number,
  position: number
) {
  return apiFetch<{ ok: boolean; lineup: GameLineup }>('/admin/set-lineup-position.php', {
    method: 'POST',
    token,
    body: JSON.stringify({ game_id: gameId, user_id: userId, position }),
  })
}
