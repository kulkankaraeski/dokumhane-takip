// Service Worker'ı ve önbellekleri tamamen temizlemek için "Kill Switch" (İptal Anahtarı)

self.addEventListener('install', event => {
  // Yeni worker'ın hemen devreye girmesini ve eskisinin yerini almasını sağla
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    // Tüm mevcut önbellekleri (caches) sil ve Service Worker kaydını tamamen iptal et (unregister)
    caches.keys().then(cacheNames => {
      return Promise.all(cacheNames.map(name => caches.delete(name)));
    }).then(() => {
      return self.registration.unregister();
    })
  );
});