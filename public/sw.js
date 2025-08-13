const CACHE_NAME = "antivity-v2" // Updated cache version to force refresh
const STATIC_CACHE = "antivity-static-v2"
const DYNAMIC_CACHE = "antivity-dynamic-v2"

const staticAssets = [
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

const dynamicAssets = ["/", "/main", "/path", "/journal", "/profile", "/social"]

// Install event - cache static resources
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(staticAssets)
    }),
  )
  self.skipWaiting()
})

// Activate event - clean up old caches and take control
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all([
        ...cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            return caches.delete(cacheName)
          }
        }),
        self.clients.claim(),
      ])
    }),
  )
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== "GET") {
    return
  }

  // Skip external requests
  if (url.origin !== location.origin) {
    return
  }

  // Static assets - cache first strategy
  if (staticAssets.some((asset) => url.pathname.includes(asset.replace("/", "")))) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        return (
          cachedResponse ||
          fetch(request).then((response) => {
            const responseClone = response.clone()
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(request, responseClone)
            })
            return response
          })
        )
      }),
    )
    return
  }

  // Dynamic content (pages) - network first strategy
  event.respondWith(
    fetch(request)
      .then((response) => {
        // If network request succeeds, update cache
        const responseClone = response.clone()
        caches.open(DYNAMIC_CACHE).then((cache) => {
          cache.put(request, responseClone)
        })
        return response
      })
      .catch(() => {
        // If network fails, serve from cache
        return caches.match(request).then((cachedResponse) => {
          return (
            cachedResponse ||
            new Response("Offline - Content not available", {
              status: 503,
              statusText: "Service Unavailable",
            })
          )
        })
      }),
  )
})

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting()
  }

  if (event.data && event.data.type === "CLEAR_CACHE") {
    event.waitUntil(
      caches
        .keys()
        .then((cacheNames) => {
          return Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)))
        })
        .then(() => {
          event.ports[0].postMessage({ success: true })
        }),
    )
  }
})
