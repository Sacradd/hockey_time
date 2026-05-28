import { ApiError } from '@/api/http'
import { fetchPushConfig, fetchPushStatus, savePushSubscription } from '@/api/push'

export type PushEnableResult =
  | 'subscribed'
  | 'unsupported'
  | 'denied'
  | 'no-vapid'
  | 'cancelled'
  | 'server-auth'
  | 'server-schema'
  | 'server-error'
  | 'not-saved'
  | 'error'

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

function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** Safari/iOS часто не отдаёт keys в toJSON() — берём через getKey(). */
async function subscriptionKeys(sub: PushSubscription): Promise<{ p256dh: string; auth: string } | null> {
  const json = sub.toJSON()
  let p256dh = json.keys?.p256dh ?? ''
  let auth = json.keys?.auth ?? ''

  if (!p256dh && sub.getKey) {
    const buf = await sub.getKey('p256dh')
    if (buf) p256dh = arrayBufferToBase64Url(buf)
  }
  if (!auth && sub.getKey) {
    const buf = await sub.getKey('auth')
    if (buf) auth = arrayBufferToBase64Url(buf)
  }

  if (!p256dh || !auth) return null
  return { p256dh, auth }
}

function pushUnsupported(): boolean {
  return (
    typeof window === 'undefined' ||
    !('serviceWorker' in navigator) ||
    !(window as Window & { PushManager?: unknown }).PushManager ||
    typeof Notification === 'undefined'
  )
}

async function verifySavedOnServer(token: string): Promise<boolean> {
  const status = await fetchPushStatus(token)
  return status.ok && status.subscribed
}

async function registerPushSubscription(token: string): Promise<PushEnableResult> {
  await navigator.serviceWorker.register('/push/sw.js', {
    scope: '/push/',
  })
  const reg = await navigator.serviceWorker.ready

  let subscription = await reg.pushManager.getSubscription()

  if (!subscription) {
    const cfg = await fetchPushConfig()
    if (!cfg.ok || !cfg.push || !cfg.public_key) {
      return 'no-vapid'
    }

    subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(cfg.public_key),
    })
  }

  if (!subscription) {
    return 'error'
  }

  const keys = await subscriptionKeys(subscription)
  if (!keys) {
    return 'error'
  }

  await savePushSubscription(token, {
    endpoint: subscription.endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
  })

  if (!(await verifySavedOnServer(token))) {
    return 'not-saved'
  }
  return 'subscribed'
}

/** После входа: тихо сохранить подписку, если разрешение уже есть. */
export async function subscribeToPushIfGranted(token: string): Promise<void> {
  try {
    if (pushUnsupported() || Notification.permission !== 'granted') {
      return
    }
    await registerPushSubscription(token)
  } catch {
    // не блокируем вход
  }
}

/**
 * Кнопка «Включить уведомления»:
 * 1) проверить поддержку браузера
 * 2) при необходимости запросить разрешение iOS
 * 3) получить push-подписку (endpoint + ключи)
 * 4) сохранить в БД на сервере под текущим user_id
 */
export async function enablePushNotifications(token: string): Promise<PushEnableResult> {
  if (pushUnsupported()) {
    return 'unsupported'
  }

  if (Notification.permission === 'denied') {
    return 'denied'
  }

  if (Notification.permission === 'default') {
    const perm = await Notification.requestPermission()
    if (perm !== 'granted') {
      return perm === 'denied' ? 'denied' : 'cancelled'
    }
  }

  try {
    return await registerPushSubscription(token)
  } catch (err) {
    return mapPushError(err)
  }
}

export async function tryEnablePushAfterLogin(token: string): Promise<void> {
  try {
    if (pushUnsupported() || Notification.permission === 'denied') {
      return
    }
    if (Notification.permission === 'granted') {
      await subscribeToPushIfGranted(token)
      return
    }
    await enablePushNotifications(token)
  } catch {
    // не блокируем вход
  }
}

function mapPushError(err: unknown): PushEnableResult {
  if (err instanceof Error && !(err instanceof ApiError)) {
    const msg = err.message.toLowerCase()
    if (msg.includes('push_subscriptions') || msg.includes('таблиц')) return 'server-schema'
    if (msg.includes('сохран')) return 'server-error'
  }
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403) return 'server-auth'
    const msg = err.message.toLowerCase()
    if (msg.includes('push_subscriptions') || msg.includes('таблиц')) return 'server-schema'
    if (msg.includes('push') || msg.includes('vapid')) return 'no-vapid'
    if (err.status >= 400) return 'server-error'
  }
  if (err instanceof DOMException) {
    if (err.name === 'NotAllowedError') return 'denied'
    if (err.name === 'AbortError') return 'cancelled'
    if (
      err.name === 'InvalidStateError' ||
      err.name === 'NotSupportedError' ||
      err.name === 'SecurityError'
    ) {
      return 'unsupported'
    }
    if (err.name === 'InvalidAccessError' || err.name === 'OperationError') {
      return 'no-vapid'
    }
  }
  if (err instanceof TypeError) {
    return 'server-error'
  }
  return 'error'
}

export function pushEnableResultMessage(result: PushEnableResult): string {
  switch (result) {
    case 'subscribed':
      return 'Уведомления включены'
    case 'unsupported':
      return 'Браузер не поддерживает push. На iPhone: приложение с иконки «Домой», iOS 16.4+'
    case 'denied':
      return 'Уведомления запрещены в настройках телефона'
    case 'no-vapid':
      return 'Push на сервере не настроен (VAPID)'
    case 'cancelled':
      return 'Разрешение не выдано'
    case 'server-auth':
      return 'Сессия истекла, перезайдите в приложение'
    case 'server-schema':
      return 'На сервере нет таблицы push_subscriptions (нужен install/migrate)'
    case 'server-error':
      return 'Сервер не сохранил подписку — проверьте таблицу push_subscriptions'
    case 'not-saved':
      return 'Запрос прошёл, но в базе подписки нет — залейте api/push/subscribe.php и status.php'
    case 'error':
      return 'Не удалось получить ключи push в браузере (попробуйте перезайти)'
    default:
      return 'Не удалось включить уведомления'
  }
}
