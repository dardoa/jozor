self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', event => {
  const payload = (() => {
    if (!event.data) {
      return {
        title: 'Jozor',
        body: 'You have a new notification.',
        icon: '/logo.svg',
        badge: '/logo.svg',
        data: { url: '/' },
        tag: 'jozor-push-notification',
      };
    }

    try {
      return event.data.json();
    } catch {
      return {
        title: 'Jozor',
        body: event.data.text(),
        icon: '/logo.svg',
        badge: '/logo.svg',
        data: { url: '/' },
        tag: 'jozor-push-notification',
      };
    }
  })();

  event.waitUntil(
    self.registration.showNotification(payload.title || 'Jozor', {
      body: payload.body || 'You have a new notification.',
      icon: payload.icon || '/logo.svg',
      badge: payload.badge || '/logo.svg',
      data: payload.data || { url: '/' },
      tag: payload.tag || 'jozor-push-notification',
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        if ('focus' in client && client.url.includes(urlToOpen)) {
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }

      return undefined;
    })
  );
});
