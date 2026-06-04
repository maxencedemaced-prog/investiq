// ===== InvestIQ Service Worker =====
const CACHE_NAME = 'investiq-v1';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(self.clients.claim());
});

// ─── Réception d'une notification push ───
self.addEventListener('push', e => {
  if (!e.data) return;

  let data;
  try { data = e.data.json(); }
  catch { data = { title: 'InvestIQ', body: e.data.text(), icon: '/icons/icon-192.png' }; }

  const options = {
    body:    data.body  || 'Nouvelle notification',
    icon:    data.icon  || '/icons/icon-192.png',
    badge:   '/icons/icon-192.png',
    tag:     data.tag   || 'investiq-notif',
    data:    { url: data.url || '/' },
    actions: data.actions || [],
    vibrate: [200, 100, 200],
    requireInteraction: data.requireInteraction || false,
  };

  e.waitUntil(
    self.registration.showNotification(data.title || 'InvestIQ', options)
  );
});

// ─── Clic sur une notification ───
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const existing = clients.find(c => c.url.includes(self.location.origin));
      if (existing) { existing.focus(); existing.navigate(url); }
      else self.clients.openWindow(url);
    })
  );
});
