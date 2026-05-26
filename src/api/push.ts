import { apiFetch } from '@/api/http'

export function fetchPushConfig() {
  return apiFetch<{ ok: boolean; push: boolean; public_key?: string; error?: string }>(
    '/push/config.php',
    {
      method: 'GET',
    }
  )
}

export function savePushSubscription(
  token: string,
  sub: { endpoint: string; p256dh: string; auth: string }
) {
  return apiFetch<{ ok: boolean; error?: string }>('/push/subscribe.php', {
    method: 'POST',
    token,
    body: JSON.stringify(sub),
  })
}

