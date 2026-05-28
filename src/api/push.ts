import { apiFetch, ApiError } from '@/api/http'

export function fetchPushConfig() {
  return apiFetch<{ ok: boolean; push: boolean; public_key?: string; error?: string }>(
    '/push/config.php',
    {
      method: 'GET',
    }
  )
}

export function fetchPushStatus(token: string) {
  return apiFetch<{
    ok: boolean
    subscribed: boolean
    count: number
    push_enabled?: boolean
    table_missing?: boolean
    error?: string
  }>('/push/status.php', {
    method: 'GET',
    token,
  })
}

export async function savePushSubscription(
  token: string,
  sub: { endpoint: string; p256dh: string; auth: string }
) {
  const data = await apiFetch<{ ok: boolean; error?: string }>('/push/subscribe.php', {
    method: 'POST',
    token,
    body: JSON.stringify(sub),
  })
  if (!data.ok) {
    throw new ApiError(data.error ?? 'Сервер не сохранил подписку', 400)
  }
  return data
}

