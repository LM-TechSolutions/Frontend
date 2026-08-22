self.addEventListener('push', (event) => {
  let payload = { title: 'Tokuma', body: '', data: { url: '/notifications' } };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    payload.body = event.data?.text() ?? '';
  }
  event.waitUntil(
    self.registration.showNotification(payload.title || 'Tokuma', {
      body: payload.body,
      icon: '/favicon.ico',
      data: payload.data,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/notifications';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate?.(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
