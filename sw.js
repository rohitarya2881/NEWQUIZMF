/* =============================================
   sw.js — Service Worker for QuizMaster Pro
   Strategy: Cache First for assets, Network First for pages
   ============================================= */

const CACHE_NAME    = 'quizmaster-v1';
const STATIC_ASSETS = [
    '/NEWQUIZMF/',
    '/NEWQUIZMF/index.html',
    '/NEWQUIZMF/css/base.css',
    '/NEWQUIZMF/css/components.css',
    '/NEWQUIZMF/css/quiz.css',
    '/NEWQUIZMF/css/features.css',
    '/NEWQUIZMF/css/planner.css',
    '/NEWQUIZMF/css/reels.css',
    '/NEWQUIZMF/js/db.js',
    '/NEWQUIZMF/js/app.js',
    '/NEWQUIZMF/js/navigation.js',
    '/NEWQUIZMF/js/folders.js',
    '/NEWQUIZMF/js/quiz.js',
    '/NEWQUIZMF/js/difficult.js',
    '/NEWQUIZMF/js/rapid.js',
    '/NEWQUIZMF/js/mixed.js',
    '/NEWQUIZMF/js/pomodoro.js',
    '/NEWQUIZMF/js/notes.js',
    '/NEWQUIZMF/js/habits.js',
    '/NEWQUIZMF/js/planner.js',
    '/NEWQUIZMF/js/drive.js',
    '/NEWQUIZMF/js/reels.js',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// ── Install: cache all static assets ─────────
self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('[SW] Caching static assets');
            // Cache individually so one failure doesn't break all
            return Promise.allSettled(
                STATIC_ASSETS.map(url => cache.add(url).catch(err => {
                    console.warn('[SW] Failed to cache:', url, err);
                }))
            );
        }).then(() => self.skipWaiting())
    );
});

// ── Activate: clean old caches ────────────────
self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys
                .filter(k => k !== CACHE_NAME)
                .map(k => { console.log('[SW] Deleting old cache:', k); return caches.delete(k); })
            )
        ).then(() => self.clients.claim())
    );
});

// ── Fetch: Cache first, fallback to network ───
self.addEventListener('fetch', e => {
    // Skip non-GET and chrome-extension
    if (e.request.method !== 'GET') return;
    if (e.request.url.startsWith('chrome-extension')) return;
    // Skip Google APIs (auth)
    if (e.request.url.includes('googleapis.com') ||
        e.request.url.includes('accounts.google.com')) return;

    e.respondWith(
        caches.match(e.request).then(cached => {
            if (cached) return cached;
            return fetch(e.request).then(response => {
                // Cache successful responses for JS/CSS/fonts
                if (response.ok && (
                    e.request.url.includes('/js/') ||
                    e.request.url.includes('/css/') ||
                    e.request.url.includes('/icons/') ||
                    e.request.url.includes('/music/') ||
                    e.request.url.includes('fonts') ||
                    e.request.url.includes('font-awesome')
                )) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
                }
                return response;
            }).catch(() => {
                // Offline fallback for HTML pages
                if (e.request.headers.get('accept')?.includes('text/html')) {
                    return caches.match('/NEWQUIZMF/index.html');
                }
            });
        })
    );
});

// ── Background sync message ───────────────────
self.addEventListener('message', e => {
    if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
    if (e.data?.type === 'CLEAR_CACHE') {
        caches.delete(CACHE_NAME).then(() => {
            e.ports[0]?.postMessage({ done: true });
        });
    }
});
