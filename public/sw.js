const CACHE_NAME = "antivity-v1"
const urlsToCache = [
  "/",
  "/main",
  "/path",
  "/journal",
  "/profile",
  "/social",
  "/logo/antjvity-logo.webp",
  "/logo/favicon.webp",
  "/images/bg3.webp",
  "/icon/home.svg",
  "/icon/message-circle.svg",
  "/icon/book-open.svg",
  "/icon/user.svg",
  "/icon/arrow_left.svg",
  "/icon/arrow_right.svg",
  "/icon/favorite.svg",
  "/icon/plus.svg",
]

// Install event - cache resources
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache)
    }),
  )
})

// Fetch event - serve from cache, fallback to network
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached version or fetch from network
      return response || fetch(event.request)
    }),
  )
})

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName)
          }
        }),
      )
    }),
  )
})
