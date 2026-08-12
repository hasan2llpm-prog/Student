/* =========================================================
   Student Service Worker
   Offline shell + runtime cache + Firebase Cloud Messaging
========================================================= */
const CACHE_VERSION = "student-v4.4.0";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const OFFLINE_URL = "./index.html";
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
            .then((keys) => Promise.all(
                keys
                    .filter((key) => key.startsWith("student-") && ![STATIC_CACHE, RUNTIME_CACHE].includes(key))
                    .map((key) => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

async function networkFirst(request) {
    const cache = await caches.open(RUNTIME_CACHE);
    try {
        const response = await fetch(request);
        if (response && response.ok && request.method === "GET") {
            cache.put(request, response.clone());
        }
        return response;
    } catch (_) {
        return (await cache.match(request)) ||
            (request.mode === "navigate" ? (await caches.match(OFFLINE_URL)) : Response.error());
    }
}

async function staleWhileRevalidate(request) {
    const cache = await caches.open(RUNTIME_CACHE);
    const cached = await cache.match(request);
    const network = fetch(request)
        .then((response) => {
            if (response && (response.ok || response.type === "opaque")) {
                cache.put(request, response.clone());
            }
            return response;
        })
        .catch(() => null);
    return cached || (await network) || Response.error();
}

self.addEventListener("fetch", (event) => {
    const request = event.request;
    if (request.method !== "GET") return;

    const url = new URL(request.url);

    if (url.hostname.endsWith("supabase.co") || url.hostname.includes("googleapis.com")) return;

    if (request.mode === "navigate") {
        event.respondWith(networkFirst(request));
        return;
    }

    if (url.origin === self.location.origin || ["cdn.jsdelivr.net", "cdnjs.cloudflare.com", "www.gstatic.com"].includes(url.hostname)) {
        event.respondWith(staleWhileRevalidate(request));
    }
});

/* Register click handling before Firebase Messaging imports. */
self.addEventListener("notificationclick", (event) => {
    event.notification.close();

    let target;
    try {
        const candidate = new URL(event.notification.data?.url || "./index.html", self.location.origin);
        target = candidate.origin === self.location.origin
            ? candidate.href
            : new URL("./index.html", self.location.origin).href;
    } catch (_) {
        target = new URL("./index.html", self.location.origin).href;
    }

    event.waitUntil(
        self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (list) => {
            for (const client of list) {
                if (client.url.startsWith(self.location.origin) && "focus" in client) {
                    if ("navigate" in client) await client.navigate(target);
                    return client.focus();
                }
            }
            return self.clients.openWindow ? self.clients.openWindow(target) : null;
        })
    );
});

/* ===== Firebase Cloud Messaging ===== */
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");

firebase.initializeApp({
    apiKey: "AIzaSyCWhbGfLtUymIO3O5itIC9054FOgE0aYi0",
    authDomain: "student-1fcba.firebaseapp.com",
    projectId: "student-1fcba",
    storageBucket: "student-1fcba.firebasestorage.app",
    messagingSenderId: "898081758778",
    appId: "1:898081758778:web:7c7f0fa6b2cb52387e5f03"
});

const messaging = firebase.messaging();

/*
   send-push sends DATA messages. For background/closed-tab delivery,
   Firebase wakes this service worker and this handler displays the alert.
*/
messaging.onBackgroundMessage((payload) => {
    const data = payload?.data || {};
    const title = data.title || "Student";
    const notificationId = data.notification_id || "";
    const targetUrl = new URL("./index.html", self.location.origin);
    if (notificationId) targetUrl.searchParams.set("student_notification", notificationId);

    return self.registration.showNotification(title, {
        body: data.body || "لديك إشعار جديد",
        icon: "./icon-192.png",
        badge: "./icon-192.png",
        tag: notificationId ? `student-${notificationId}` : "student-notification",
        renotify: true,
        data: {
            url: targetUrl.href,
            notification_id: notificationId,
            kind: data.kind || ""
        }
    });
});
