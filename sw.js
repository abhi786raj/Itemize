const CACHE = 'itemize-v6'
const ASSETS = [
  './',
  './index.html',
  './script.js',
  './tailwind.min.js',
  './js/state.js',
  './js/db.js',
  './js/validation.js',
  './js/prompt.js',
  './js/router.js',
  './js/views/home.js',
  './js/views/json-input.js',
  './js/views/review.js',
  './js/views/history.js',
  './js/views/settings.js',
  './assets/icon.svg',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon-512-maskable.png',
  './assets/splash/splash-1290x2796.png',
  './assets/splash/splash-1179x2556.png',
  './assets/splash/splash-1170x2532.png',
  './assets/splash/splash-1284x2778.png',
  './assets/splash/splash-828x1792.png',
  './assets/splash/splash-750x1334.png',
  './assets/splash/splash-1668x2388.png',
  './assets/splash/splash-2048x2732.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { pathname } = new URL(event.request.url)
  if (pathname.endsWith('/manifest.webmanifest')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    )
    return
  }
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  )
})
