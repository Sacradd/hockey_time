/* Push-only service worker (no cache logic). */

self.addEventListener('push', (event) => {
  const data = (() => {
    try {
      return event.data ? event.data.json() : null
    } catch (e) {
      return null
    }
  })()

  const title = (data && data.title) || 'Hockey'
  const body = (data && data.body) || ''
  const url = (data && data.url) || '/'

  const options = {
    body,
    data: { url },
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification && event.notification.data && event.notification.data.url) || '/'

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url && 'focus' in client) {
            client.focus()
            if ('navigate' in client) {
              client.navigate(url)
            }
            return
          }
        }
        return self.clients.openWindow(url)
      })
  )
})
