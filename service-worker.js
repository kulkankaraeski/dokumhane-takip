const CACHE_NAME = 'dokumhane-v1';
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
        cacheNames.filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    })
  );
});

// Veri Çekme (Fetch) Aşaması
self.addEventListener('fetch', event => {
  // POST, PUT, DELETE gibi veri gönderme isteklerini (örn. form gönderimi)
  // Service Worker üzerinden geçirmeden doğrudan ağa yönlendir. 
  // Bu "bağlantı hatası" sorununu çözen en kritik adımdır.
  if (event.request.method !== 'GET') {
    return;
  }

  // Google API ve Veri çekme linklerini (opensheet) ASLA önbellekten getirme, hep güncelini al
  if (event.request.url.includes('script.google.com') || event.request.url.includes('opensheet.elk.sh')) {
    return; 
  }

  // Arayüz dosyalarını önbellekten hızlıca getir
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Önbellekte varsa döndür, yoksa internetten getir.
        return response || fetch(event.request).catch(error => {
          console.error("Ağ bağlantısı koptu veya istek başarısız oldu:", error);
        });
      })
  );
});