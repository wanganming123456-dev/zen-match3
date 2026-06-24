// Service Worker — 离线缓存所有游戏资源
const CACHE_NAME = 'zen-match3-v1';
const FILES = [
  '.',
  'index.html',
  'css/style.css',
  'js/config.js',
  'js/core/Gem.js',
  'js/core/Board.js',
  'js/core/Matcher.js',
  'js/core/Gravity.js',
  'js/core/PowerUp.js',
  'js/core/ScoreManager.js',
  'js/core/GameEngine.js',
  'js/render/AnimateManager.js',
  'js/render/Renderer.js',
  'js/input/InputManager.js',
  'js/system/UISystem.js',
  'js/main.js',
  'manifest.json',
  'icons/icon-192.png'
];

// 安装：预缓存所有文件
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES))
  );
  self.skipWaiting();
});

// 激活：清理旧缓存
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 请求：缓存优先
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});
