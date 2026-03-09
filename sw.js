// CoûtSalarié Pro — Service Worker
// VERSION AUTO : change à chaque déploiement pour invalider le cache
const CACHE_VERSION = '20260309-3';
const CACHE_NAME = 'coutsalarie-' + CACHE_VERSION;

// Fichiers à mettre en cache
const CACHE_URLS = [
  '/coutsalarie/',
  '/coutsalarie/index.html',
  '/coutsalarie/manifest.json',
];

// ── Installation ──
self.addEventListener('install', event => {
  console.log('[SW] Install v' + CACHE_VERSION);
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CACHE_URLS))
  );
  // Activation immédiate sans attendre la fermeture des onglets
  self.skipWaiting();
});

// ── Activation : supprimer les anciens caches ──
self.addEventListener('activate', event => {
  console.log('[SW] Activate v' + CACHE_VERSION);
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k.startsWith('coutsalarie-') && k !== CACHE_NAME)
          .map(k => { console.log('[SW] Suppression ancien cache:', k); return caches.delete(k); })
      )
    )
  );
  // Prendre le contrôle de tous les onglets immédiatement
  self.clients.claim();
});

// ── Fetch : Network First pour HTML, Cache First pour assets ──
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Pour les pages HTML → toujours essayer le réseau d'abord (pour avoir les mises à jour)
  if (event.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }
  
  // Pour les autres ressources → cache first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match('/coutsalarie/'));
    })
  );
});

// ── Message pour forcer la mise à jour depuis la page ──
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
