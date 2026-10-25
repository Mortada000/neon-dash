// قمنا بتغيير الإصدار إلى v2 لنجبر المتصفح على مسح الملفات القديمة وتحميل الجديدة
const CACHE_NAME = 'neon-dash-v3';
const ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './icon-192.png',
    './icon-512.png',
    './style.css',
    './js/main.js',
    './js/ui.js',
    './js/input.js',
    './js/player.js',
    './js/obstacle.js',
    './js/coin.js',
    './js/background.js',
    './js/audio.js',
    './js/skins.js',
    './js/progression.js'
];

self.addEventListener('install', event => {
    self.skipWaiting(); // إجبار المتصفح على تفعيل التحديث فوراً
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.map(key => {
                // مسح أي كاش قديم لا يحمل اسم v2
                if (key !== CACHE_NAME) return caches.delete(key);
            })
        )).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request);
        })
    );
});