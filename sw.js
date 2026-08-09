/* =========================================================
   Student Service Worker
   Offline shell + runtime cache + Web Push
========================================================= */
const CACHE_VERSION = "student-v4.1.0";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const APP_SHELL = [
    "./",
    "./index.html",
    "./style.css",
    "./app.js",
    "./social.js",
    "./manifest.json",
    "./icon-192.png",
    "./icon-512.png",
    "./apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((key) => key.startsWith("student-") && ![STATIC_CACHE, RUNTIME_CACHE].includes(key)).map((key) => caches.delete(key))))
            .then(() => self.clients.claim())
    );
});

async function networkFirst(request) {
    const cache = await caches.open(RUNTIME_CACHE);
    try {
        const response = await fetch(request);
        if (response && response.ok && request.method === "GET") cache.put(request, response.clone());
        return response;
    } catch (_) {
        return (await cache.match(request)) || (request.mode === "navigate" ? caches.match(OFFLINE_URL) : Response.error());
    }
}

async function staleWhileRevalidate(request) {
    const cache = await caches.open(RUNTIME_CACHE);
    const cached = await cache.match(request);
    const network = fetch(request).then((response) => {
        if (response && (response.ok || response.type === "opaque")) cache.put(request, response.clone());
        return response;
    }).catch(() => null);
    return cached || (await network) || Response.error();
}

self.addEventListener("fetch", (event) => {
    const request = event.request;
    if (request.method !== "GET") return;

    const url = new URL(request.url);

    // Never cache Supabase API/auth calls: data should obey current RLS/session state.
    if (url.hostname.endsWith("supabase.co")) return;

    if (request.mode === "navigate") {
        event.respondWith(networkFirst(request));
        return;
    }

    if (url.origin === self.location.origin || ["cdn.jsdelivr.net", "cdnjs.cloudflare.com"].includes(url.hostname)) {
        event.respondWith(staleWhileRevalidate(request));
    }
});

self.addEventListener("push", (event) => {
    let data = {};
    try { data = event.data ? event.data.json() : {}; }
    catch (_) { data = { body: event.data?.text() || "" }; }

    const title = data.title || "Student";
    const options = {
        body: data.body || "لديك إشعار جديد",
        icon: data.icon || "./icon-192.png",
        badge: data.badge || "./icon-192.png",
        tag: data.tag || (data.notification_id ? `student-${data.notification_id}` : undefined),
        renotify: true,
        data: {
            url: data.link || data.url || "./index.html",
            notification_id: data.notification_id || null
        }
    };
    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    let target;
    try {
        const candidate = new URL(event.notification.data?.url || "./index.html", self.location.origin);
        target = candidate.origin === self.location.origin ? candidate.href : new URL("./index.html", self.location.origin).href;
    } catch (_) {
        target = new URL("./index.html", self.location.origin).href;
    }

    event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
        for (const client of list) {
            if (client.url.startsWith(self.location.origin) && "focus" in client) {
                if ("navigate" in client) client.navigate(target);
                return client.focus();
            }
        }
        return self.clients.openWindow ? self.clients.openWindow(target) : null;
    }));
});
