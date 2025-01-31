const CACHE_NAME = "foerderung-cache-v1";
const urlsToCache = [
    "./",
    "./index.html",
    "./manifest.json",
    "./styles.css", // Falls vorhanden
    "./script.js",  // Falls vorhanden
    "./icons/icon-192x192.png",
    "./icons/icon-512x512.png"
];

// Installations-Ereignis
self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(urlsToCache);
            })
    );
});

// Fetch-Ereignis (Anfragen abfangen)
self.addEventListener("fetch", event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                return response || fetch(event.request);
            })
    );
});

// Aktivierungs-Ereignis (alte Caches löschen)
self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
});
