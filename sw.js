// Service Worker — 网络优先，回退缓存 (自动更新)
const CACHE_NAME = 'zen-match3-v2';
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
  'js/starfield.js',
  'manifest.json',
  'icons/icon-192.png'
];

// 安装：预缓存文件
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES))
  );
  self.skipWaiting();
});

// 激活：删除所有旧版本缓存
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 请求：网络优先，失败时回退缓存（确保始终拿到最新版本）
self.addEventListener('fetch', (e) => {
  e.respondWith(
    fetch(e.request)
      .then((response) => {
        // 网络成功 → 更新缓存
        if (response.ok && e.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(e.request))
  );
});
