/* Student Web Push Service Worker */
self.addEventListener("push", event => {
    let data = {};
    try { data = event.data ? event.data.json() : {}; } catch (_) { data = { body: event.data?.text() || "" }; }
    const title = data.title || "Student";
    const options = {
        body: data.body || "لديك إشعار جديد",
        icon: data.icon || "./apple-touch-icon.png",
        badge: data.badge || "./apple-touch-icon.png",
        tag: data.tag || (data.notification_id ? `student-${data.notification_id}` : undefined),
        renotify: true,
        data: { url: data.link || data.url || "./index.html", notification_id: data.notification_id || null }
    };
    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", event => {
    event.notification.close();
    const target = new URL(event.notification.data?.url || "./index.html", self.location.origin).href;
    event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
        for (const client of list) {
            if (client.url.startsWith(self.location.origin) && "focus" in client) {
                client.navigate(target);
                return client.focus();
            }
        }
        return clients.openWindow ? clients.openWindow(target) : null;
    }));
});
