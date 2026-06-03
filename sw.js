// ============================================================
// sw.js — Service Worker Principal (Web Push API Nativa)
// O CACHE_NAME e os paths são gerados automaticamente pelo config.js
// ============================================================

// O slug é injectado pelo admin no momento da criação do site
const SITE_SLUG = self.SITE_SLUG || 'SLUG';
const CACHE_NAME = SITE_SLUG + '-cache-v1';
const BASE = '/' + SITE_SLUG;

const urlsToCache = [
  BASE + '/',
  BASE + '/index.html',
  BASE + '/catalogo.html',
  BASE + '/produto.html',
  BASE + '/carrinho.html',
  BASE + '/checkout.html',
  BASE + '/confirmacao.html',
  BASE + '/rastrear.html',
  BASE + '/wishlist.html',
  BASE + '/promocoes.html',
  BASE + '/conta.html',
  BASE + '/sobre.html',
  BASE + '/personalizado.html',
  BASE + '/favicon.svg',
  BASE + '/manifest.json',
  BASE + '/config.js'
];

// ============================================================
// INSTALAR
// ============================================================
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

// ============================================================
// ATIVAR
// ============================================================
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// ============================================================
// FETCH (Cache First)
// ============================================================
self.addEventListener('fetch', function(event) {
  if (event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(function(response) {
      if (response) return response;

      return fetch(event.request).then(function(response) {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, responseToCache);
        });
        return response;
      }).catch(function() {
        return new Response('Offline', { status: 503 });
      });
    })
  );
});

// ============================================================
// PUSH — receber notificação do servidor
// ============================================================
self.addEventListener('push', function(event) {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch(e) {
    data = { titulo: 'Nova notificação', mensagem: event.data ? event.data.text() : '' };
  }

  const titulo   = data.titulo   || 'Admin';
  const mensagem = data.mensagem || '';
  const url      = data.url      || '/Loja/admin.html';
  const icone    = data.icone    || '/Loja/favicon.svg';

  const options = {
    body: mensagem,
    icon: icone,
    badge: icone,
    data: { url: url },
    vibrate: [200, 100, 200],
    requireInteraction: false,
    tag: data.tag || 'admin-notif'
  };

  event.waitUntil(
    self.registration.showNotification(titulo, options)
  );
});

// ============================================================
// NOTIFICATIONCLICK — abrir o admin ao clicar na notificação
// ============================================================
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  const urlDestino = (event.notification.data && event.notification.data.url)
    ? event.notification.data.url
    : '/Loja/admin.html';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      /* Se já há uma janela aberta, focar nela */
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.includes('admin') && 'focus' in client) {
          return client.focus();
        }
      }
      /* Senão, abrir nova janela */
      if (clients.openWindow) {
        return clients.openWindow(urlDestino);
      }
    })
  );
});
