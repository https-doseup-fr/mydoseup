/**
 * sw.js — Service Worker MyDoseUp
 * ─────────────────────────────────────────────────────────────
 * Stratégie :
 *  - Pages HTML (navigation) : réseau d'abord, cache en secours
 *    (toujours la version la plus fraîche quand il y a du réseau,
 *    mais le site fonctionne hors-ligne une fois visité).
 *  - Fichiers statiques (icônes, manifest...) : cache d'abord,
 *    mise à jour en arrière-plan.
 *
 * Incrémente CACHE_VERSION à chaque déploiement important pour
 * forcer le renouvellement du cache chez les utilisateurs.
 * ─────────────────────────────────────────────────────────────
 */

const CACHE_VERSION = 'v1';
const CACHE_NAME = 'mydoseup-' + CACHE_VERSION;

const APP_SHELL = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
];

// ─── Installation : précharge l'essentiel ───
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// ─── Activation : nettoie les anciens caches ───
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name.startsWith('mydoseup-') && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

// ─── Fetch : stratégie selon le type de requête ───
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // On ignore tout ce qui n'est pas GET, et les requêtes cross-origin
  // (polices Google, analytics, etc.) : elles passent directement au réseau.
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) {
    return;
  }

  // Navigation (chargement d'une page HTML) : réseau d'abord, cache en secours
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          return res;
        })
        .catch(() =>
          caches.match(req).then((cached) => cached || caches.match('/'))
        )
    );
    return;
  }

  // Fichiers statiques : cache d'abord, mise à jour en arrière-plan
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return res;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
