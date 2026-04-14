const CACHE_NAME = 'dokumhane-v1';
const DATA_CACHE_NAME = 'dokumhane-data-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Kurulum Aşaması: Statik dosyaları önbelleğe al
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

// Aktivasyon: Eski önbellekleri temizle
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME && name !== DATA_CACHE_NAME)
          .map(name => caches.delete(name))
      );
    })
  );
});

self.addEventListener('fetch', event => {
  // POST istekleri (form gönderme gibi) önbelleğe alınmamalıdır.
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);

  // Veri API'leri için (opensheet.elk.sh), önce ağa git, başarısız olursa önbelleği kullan.
  // Bu, çevrimdışıyken bile uygulamanın son çekilen veriyi göstermesini sağlar.
  if (url.hostname === 'opensheet.elk.sh') {
    event.respondWith(
      caches.open(DATA_CACHE_NAME).then(cache => {
        return fetch(event.request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => {
          // Ağ isteği başarısız oldu, önbellekten sunmayı dene.
          return cache.match(event.request);
        });
      })
    );
    return;
  }

  // Diğer tüm GET istekleri (uygulama kabuğu) için önbelleği öncelikli kullan.
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});