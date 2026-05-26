import { fetchPushConfig, savePushSubscription } from '@/api/push'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')

  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}

export async function subscribeToPush(token: string): Promise<void> {
  try {
    if (
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator) ||
      !(window as Window & { PushManager?: unknown }).PushManager ||
      typeof Notification === 'undefined'
    ) {
      return
    }

    if (Notification.permission === 'denied') {
      return
    }

    const reg = await navigator.serviceWorker.register('/push/sw.js', {
      scope: '/push/',
    })

    let subscription = await reg.pushManager.getSubscription()

    if (!subscription) {
      const cfg = await fetchPushConfig()
      if (!cfg.ok || !cfg.push || !cfg.public_key) {
        return
      }

      const appServerKey = urlBase64ToUint8Array(cfg.public_key)
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: appServerKey,
      })
    }

    if (!subscription) {
      return
    }

    const json = subscription.toJSON()
    const endpoint = subscription.endpoint
    const p256dh = (json.keys && json.keys.p256dh) || ''
    const auth = (json.keys && json.keys.auth) || ''

    if (!endpoint || !p256dh || !auth) return

    await savePushSubscription(token, { endpoint, p256dh, auth })
  } catch {
    // push не должен ломать приложение
  }
}
