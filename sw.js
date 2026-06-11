// ===== InvestIQ Service Worker =====
const CACHE_NAME = 'investiq-v2'; // incrémenté pour forcer la mise à jour

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  // PURGE tous les anciens caches (y compris ceux d'anciennes versions du SW)
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Stratégie network-first pour les fichiers de l'app : toujours la version fraîche
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Seulement pour nos propres fichiers JS/CSS/HTML
  if (url.origin === self.location.origin && /\.(js|css|html)$|\/$/.test(url.pathname)) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
  }
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
