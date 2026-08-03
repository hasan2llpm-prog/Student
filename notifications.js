/* =========================================================
   Student - Notifications
   In-app realtime + Web Push subscription + admin broadcast
========================================================= */
(function () {
    "use strict";

    if (window.StudentNotifications) return;

    const VAPID_PUBLIC_KEY = "BDzANVHrkwSN1O6cIyREd5yYgjo7pxiGiizwdOGw2nHIxciXm5Fs5jxmCGh9NjOMX3Xo0t2sd949fLrRfJwTCQI";
    const SW_URL = "./sw.js?v=1.0.1";

    const state = {
        user: null,
        isAdmin: false,
        items: [],
        channel: null,
        overlay: null,
        loading: false,
        initializedFor: null
    };

    function sb() {
        return typeof supabaseClient !== "undefined" ? supabaseClient : null;
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function ensureStyles() {
        if (document.getElementById("student-notifications-style")) return;
        const style = document.createElement("style");
        style.id = "student-notifications-style";
        style.textContent = `
            #student-notifications-page{position:fixed;inset:0;z-index:10050;background:#fff;display:none;overflow:auto;direction:rtl;color:#172033}
            #student-notifications-page.is-open{display:block}
            .sn-head{position:sticky;top:0;z-index:3;background:#fff;border-bottom:1px solid #e9edf3;padding:14px 16px;display:flex;align-items:center;gap:12px}
            .sn-back,.sn-action,.sn-btn{border:0;cursor:pointer;font:inherit}
            .sn-back{width:42px;height:42px;border-radius:50%;background:#f1f4f8;font-size:21px}
            .sn-title{font-size:19px;font-weight:800;flex:1;margin:0}
            .sn-action{background:#087cff;color:#fff;border-radius:12px;padding:10px 13px;font-weight:700}
            .sn-body{max-width:720px;margin:0 auto;padding:14px 14px 90px}
            .sn-permission{border:1px solid #dce8ff;background:#f4f8ff;border-radius:16px;padding:14px;margin-bottom:14px}
            .sn-permission strong{display:block;margin-bottom:5px}.sn-permission p{margin:0 0 12px;color:#566171;line-height:1.7}
            .sn-btn{background:#087cff;color:#fff;border-radius:12px;padding:11px 15px;font-weight:750}.sn-btn.secondary{background:#eef2f7;color:#223047}.sn-btn.danger{background:#e93d4f}
            .sn-list{display:grid;gap:10px}.sn-item{border:1px solid #e8ebf0;border-radius:16px;padding:13px;background:#fff;display:flex;gap:11px;align-items:flex-start}
            .sn-item.unread{background:#f4f8ff;border-color:#cfe0ff}.sn-icon{width:42px;height:42px;border-radius:50%;background:#eef4ff;display:grid;place-items:center;flex:0 0 42px;font-size:19px}
            .sn-content{min-width:0;flex:1}.sn-item-title{font-weight:800;margin-bottom:4px}.sn-item-text{color:#4e5969;line-height:1.65;white-space:pre-wrap;overflow-wrap:anywhere}.sn-meta{font-size:12px;color:#8a94a3;margin-top:7px}
            .sn-empty{text-align:center;padding:60px 20px;color:#788393}.sn-empty .bell{font-size:48px;margin-bottom:12px}
            .sn-modal{position:fixed;inset:0;z-index:10070;background:rgba(10,20,35,.48);display:flex;align-items:flex-end;justify-content:center;padding:14px}
            .sn-sheet{width:min(620px,100%);background:#fff;border-radius:22px;padding:18px;max-height:90vh;overflow:auto}.sn-sheet h3{margin:0 0 15px}
            .sn-field{margin-bottom:12px}.sn-field label{display:block;font-weight:700;margin-bottom:6px}.sn-field input,.sn-field textarea,.sn-field select{width:100%;border:1px solid #dbe1ea;border-radius:12px;padding:12px;font:inherit;outline:none}.sn-field textarea{min-height:110px;resize:vertical}
            .sn-actions{display:flex;gap:9px;justify-content:flex-end;margin-top:15px}.sn-toast{position:fixed;left:50%;bottom:86px;transform:translateX(-50%);z-index:10100;background:#172033;color:#fff;border-radius:12px;padding:11px 16px;max-width:88%;text-align:center}
            .sn-badge{position:absolute;min-width:18px;height:18px;border-radius:9px;background:#ef3340;color:#fff;font-size:11px;font-weight:800;display:grid;place-items:center;padding:0 5px;transform:translate(45%,-45%)}
        `;
        document.head.appendChild(style);
    }

    function toast(message) {
        document.querySelector(".sn-toast")?.remove();
        const el = document.createElement("div");
        el.className = "sn-toast";
        el.textContent = message;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 2800);
    }

    function ensurePage() {
        ensureStyles();
        let page = document.getElementById("student-notifications-page");
        if (page) return page;
        page = document.createElement("section");
        page.id = "student-notifications-page";
        page.innerHTML = `
            <header class="sn-head">
                <button class="sn-back" type="button" aria-label="رجوع">‹</button>
                <h2 class="sn-title">الإشعارات</h2>
                <button class="sn-action" id="sn-broadcast" type="button" hidden>نشر للجميع</button>
            </header>
            <main class="sn-body">
                <div id="sn-permission-box"></div>
                <div id="sn-list" class="sn-list"></div>
            </main>`;
        document.body.appendChild(page);
        page.querySelector(".sn-back").addEventListener("click", close);
        page.querySelector("#sn-broadcast").addEventListener("click", openBroadcast);
        state.overlay = page;
        return page;
    }

    async function getUser() {
        const client = sb();
        if (!client) return null;
        const { data } = await client.auth.getUser();
        return data?.user || null;
    }

    async function checkAdmin() {
        const client = sb();
        if (!client || !state.user) return false;
        try {
            const { data, error } = await client.rpc("current_user_is_admin");
            if (!error) return data === true;
        } catch (_) {}
        try {
            const { data } = await client.from("profiles").select("role").eq("id", state.user.id).maybeSingle();
            return data?.role === "admin";
        } catch (_) {
            return false;
        }
    }

    function dateText(value) {
        if (!value) return "";
        try {
            return new Intl.DateTimeFormat("ar-IQ", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
        } catch (_) {
            return "";
        }
    }

    function renderPermission() {
        const box = document.getElementById("sn-permission-box");
        if (!box) return;
        if (!("Notification" in window) || !("serviceWorker" in navigator)) {
            box.innerHTML = `<div class="sn-permission"><strong>الإشعارات الخارجية غير مدعومة</strong><p>هذا المتصفح لا يدعم إشعارات الهاتف الخارجية.</p></div>`;
            return;
        }
        if (Notification.permission === "granted") {
            box.innerHTML = `<div class="sn-permission"><strong>إشعارات الهاتف مفعلة</strong><p>ستصلك التنبيهات الخارجية حسب إعدادات جهازك.</p></div>`;
            return;
        }
        if (Notification.permission === "denied") {
            box.innerHTML = `<div class="sn-permission"><strong>تم رفض الإذن</strong><p>افتح إعدادات الموقع في المتصفح واسمح بالإشعارات، ثم أعد فتح التطبيق.</p></div>`;
            return;
        }
        box.innerHTML = `<div class="sn-permission"><strong>فعّل إشعارات الهاتف</strong><p>اسمح للتطبيق بإرسال الإشعارات إلى لوحة إشعارات جهازك حتى عند مغادرة الصفحة.</p><button class="sn-btn" id="sn-enable-push" type="button">تفعيل الإشعارات</button></div>`;
        box.querySelector("#sn-enable-push")?.addEventListener("click", enablePush);
    }

    function render() {
        const page = ensurePage();
        page.querySelector("#sn-broadcast").hidden = !state.isAdmin;
        renderPermission();
        const list = page.querySelector("#sn-list");
        if (state.loading) {
            list.innerHTML = `<div class="sn-empty">جارٍ تحميل الإشعارات...</div>`;
            return;
        }
        if (!state.items.length) {
            list.innerHTML = `<div class="sn-empty"><div class="bell">🔔</div><div>لا توجد إشعارات حتى الآن.</div></div>`;
            return;
        }
        list.innerHTML = state.items.map(item => `
            <article class="sn-item ${item.is_read ? "" : "unread"}" data-id="${escapeHtml(item.id)}">
                <div class="sn-icon">${escapeHtml(item.icon || "🔔")}</div>
                <div class="sn-content">
                    <div class="sn-item-title">${escapeHtml(item.title || "إشعار جديد")}</div>
                    <div class="sn-item-text">${escapeHtml(item.body || "")}</div>
                    <div class="sn-meta">${escapeHtml(dateText(item.created_at))}</div>
                </div>
            </article>`).join("");
        list.querySelectorAll(".sn-item.unread").forEach(el => {
            el.addEventListener("click", () => markRead(el.dataset.id));
        });
        updateBadge();
    }

    async function load() {
        const client = sb();
        if (!client || !state.user) return;
        state.loading = true;
        render();
        const { data, error } = await client
            .from("notifications")
            .select("id,title,body,icon,kind,link,is_read,created_at,actor_id,metadata")
            .or(`user_id.eq.${state.user.id},and(user_id.is.null,is_broadcast.eq.true)`)
            .order("created_at", { ascending: false })
            .limit(150);
        state.loading = false;
        if (error) {
            console.error("Notifications load error:", error);
            state.items = [];
            render();
            toast("تعذر تحميل الإشعارات. شغّل كود SQL أولًا.");
            return;
        }
        state.items = data || [];
        render();
        await markAllDelivered();
    }

    async function markRead(id) {
        const client = sb();
        if (!client || !id) return;
        const item = state.items.find(x => String(x.id) === String(id));
        if (item) item.is_read = true;
        render();
        await client.from("notifications").update({ is_read: true, read_at: new Date().toISOString() }).eq("id", id).eq("user_id", state.user.id);
    }

    async function markAllDelivered() {
        const client = sb();
        if (!client || !state.user) return;
        await client.from("notifications").update({ delivered_at: new Date().toISOString() }).eq("user_id", state.user.id).is("delivered_at", null);
    }

    function updateBadge() {
        const unread = state.items.filter(x => !x.is_read).length;
        const bells = document.querySelectorAll(".fa-bell");
        bells.forEach(bell => {
            const host = bell.parentElement || bell;
            host.style.position = host.style.position || "relative";
            host.querySelector(".sn-badge")?.remove();
            if (unread > 0) {
                const badge = document.createElement("span");
                badge.className = "sn-badge";
                badge.textContent = unread > 99 ? "99+" : String(unread);
                host.appendChild(badge);
            }
        });
    }

    async function subscribeRealtime() {
        const client = sb();
        if (!client || !state.user) return;
        if (state.channel) await client.removeChannel(state.channel);
        state.channel = client.channel(`student-notifications-${state.user.id}`)
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, payload => {
                const item = payload.new;
                const belongs = item.user_id === state.user.id || item.is_broadcast === true || (state.isAdmin && item.audience === "admin");
                if (!belongs) return;
                state.items.unshift(item);
                render();
                showForeground(item);
            })
            .subscribe();
    }

    async function showForeground(item) {
        if (document.visibilityState === "visible") {
            toast(item.title || "إشعار جديد");
            return;
        }
        if (Notification.permission !== "granted") return;
        const registration = await navigator.serviceWorker.ready;
        registration.showNotification(item.title || "Student", {
            body: item.body || "لديك إشعار جديد",
            icon: "./apple-touch-icon.png",
            badge: "./apple-touch-icon.png",
            data: { url: item.link || "./index.html", notification_id: item.id }
        });
    }

    function urlBase64ToUint8Array(base64String) {
        const padding = "=".repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
        const rawData = atob(base64);
        return Uint8Array.from([...rawData].map(ch => ch.charCodeAt(0)));
    }

    async function registerServiceWorker() {
        if (!("serviceWorker" in navigator)) throw new Error("SERVICE_WORKER_UNSUPPORTED");
        return navigator.serviceWorker.register(SW_URL, { scope: "./" });
    }

    async function enablePush() {
        const client = sb();
        if (!client || !state.user) return;
        try {
            const permission = await Notification.requestPermission();
            if (permission !== "granted") {
                renderPermission();
                return;
            }
            const registration = await registerServiceWorker();
            let subscription = await registration.pushManager.getSubscription();
            if (!subscription) {
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
                });
            }
            const json = subscription.toJSON();
            const { error } = await client.from("push_subscriptions").upsert({
                user_id: state.user.id,
                endpoint: json.endpoint,
                p256dh: json.keys?.p256dh || "",
                auth: json.keys?.auth || "",
                user_agent: navigator.userAgent,
                is_active: true,
                updated_at: new Date().toISOString()
            }, { onConflict: "user_id,endpoint" });
            if (error) throw error;
            localStorage.setItem(`student-push-asked:${state.user.id}`, "yes");
            renderPermission();
            toast("تم تفعيل إشعارات الهاتف.");
        } catch (error) {
            console.error("Push enable error:", error);
            toast("تعذر تفعيل الإشعارات الخارجية. تأكد من تشغيل SQL ورفع sw.js.");
        }
    }

    function showFirstLoginPrompt() {
        if (!state.user || !("Notification" in window)) return;

        const permission = Notification.permission;
        if (permission === "granted") return;

        const key = `student-push-reminder:${state.user.id}`;
        const lastShown = Number(localStorage.getItem(key) || 0);
        const remindAfter = 24 * 60 * 60 * 1000;

        if (Date.now() - lastShown < remindAfter) return;

        setTimeout(() => {
            if (document.querySelector(".sn-modal[data-push-reminder]")) return;

            const modal = document.createElement("div");
            modal.className = "sn-modal";
            modal.dataset.pushReminder = "1";

            if (permission === "denied") {
                modal.innerHTML = `<div class="sn-sheet"><h3>الإشعارات متوقفة</h3><p style="line-height:1.8;color:#566171">سبق أن تم رفض إذن الإشعارات. افتح إعدادات هذا الموقع في Chrome، ثم غيّر الإشعارات إلى سماح، وبعدها أعد فتح التطبيق.</p><div class="sn-actions"><button class="sn-btn secondary" data-close type="button">حسنًا</button></div></div>`;
            } else {
                modal.innerHTML = `<div class="sn-sheet"><h3>تفعيل الإشعارات</h3><p style="line-height:1.8;color:#566171">فعّل الإشعارات لتصلك تنبيهات Student في لوحة إشعارات الهاتف.</p><div class="sn-actions"><button class="sn-btn secondary" data-close type="button">لاحقًا</button><button class="sn-btn" data-enable type="button">تفعيل الآن</button></div></div>`;
            }

            document.body.appendChild(modal);
            localStorage.setItem(key, String(Date.now()));

            modal.querySelector("[data-close]").onclick = () => modal.remove();
            modal.querySelector("[data-enable]")?.addEventListener("click", async () => {
                modal.remove();
                await enablePush();
            });
        }, 1200);
    }

    function openBroadcast() {
        if (!state.isAdmin) return;
        const modal = document.createElement("div");
        modal.className = "sn-modal";
        modal.innerHTML = `<form class="sn-sheet" id="sn-broadcast-form"><h3>نشر إشعار للجميع</h3>
            <div class="sn-field"><label>عنوان الإشعار</label><input name="title" maxlength="100" required></div>
            <div class="sn-field"><label>نص الإشعار</label><textarea name="body" maxlength="500" required></textarea></div>
            <div class="sn-field"><label>الرابط أو القسم (اختياري)</label><input name="link" maxlength="300" placeholder="مثال: ./index.html"></div>
            <div class="sn-actions"><button class="sn-btn secondary" data-close type="button">إلغاء</button><button class="sn-btn" type="submit">نشر الآن</button></div></form>`;
        document.body.appendChild(modal);
        modal.querySelector("[data-close]").onclick = () => modal.remove();
        modal.querySelector("form").onsubmit = async event => {
            event.preventDefault();
            const button = event.submitter;
            button.disabled = true;
            button.textContent = "جارٍ النشر...";
            const form = new FormData(event.currentTarget);
            const client = sb();
            const { data, error } = await client.rpc("admin_broadcast_notification", {
                p_title: String(form.get("title") || "").trim(),
                p_body: String(form.get("body") || "").trim(),
                p_link: String(form.get("link") || "").trim() || null
            });
            if (error) {
                console.error(error);
                button.disabled = false;
                button.textContent = "نشر الآن";
                toast("تعذر نشر الإشعار.");
                return;
            }
            try {
                await client.functions.invoke("send-push", { body: { notification_id: data, broadcast: true } });
            } catch (error2) {
                console.warn("External push invoke failed:", error2);
            }
            modal.remove();
            toast("تم نشر الإشعار للجميع.");
        };
    }

    async function init() {
        const client = sb();
        if (!client) return;
        const user = await getUser();
        if (!user) return;
        if (state.initializedFor === user.id) return;
        state.initializedFor = user.id;
        state.user = user;
        state.isAdmin = await checkAdmin();
        await registerServiceWorker().catch(() => null);
        await load();
        await subscribeRealtime();
        showFirstLoginPrompt();
    }

    async function open() {
        await init();
        const page = ensurePage();
        page.classList.add("is-open");
        document.body.style.overflow = "hidden";
        await load();
    }

    function close() {
        const page = document.getElementById("student-notifications-page");
        page?.classList.remove("is-open");
        document.body.style.overflow = "";
    }

    window.StudentNotifications = { init, open, close, enablePush };
    window.openNotifications = open;

    const wait = setInterval(() => {
        if (sb()) {
            clearInterval(wait);
            init().catch(console.error);
        }
    }, 500);
    setTimeout(() => clearInterval(wait), 30000);
})();
