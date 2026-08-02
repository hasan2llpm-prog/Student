/* =========================================================
   Student - Central Navigation & Compatibility Fixes
========================================================= */
(function () {
    "use strict";

    if (window.StudentNavigation) return;

    const stack = [];
    let exitConfirm = null;
    let recentlyClosedManagedLayer = false;
    let floatingPanelHistoryActive = false;

    function ensureStyles() {
        if (document.getElementById("student-navigation-style")) return;
        const style = document.createElement("style");
        style.id = "student-navigation-style";
        style.textContent = `
            .student-internal-page{position:fixed;inset:0;z-index:10000050;background:#fff;display:flex;flex-direction:column;direction:rtl;overflow:hidden}
            .student-internal-header{height:58px;display:flex;align-items:center;gap:10px;padding:0 12px;border-bottom:1px solid #eee;background:#fff;flex-shrink:0}
            .student-internal-back{width:42px;height:42px;border:0;border-radius:50%;background:#f2f4f6;font-size:19px;cursor:pointer}
            .student-internal-title{font-size:18px;font-weight:800;flex:1}
            .student-internal-body{flex:1;overflow:auto;padding:16px;background:#fafafa}
            .student-profile-page-card{max-width:680px;margin:0 auto;background:#fff;border:1px solid #eee;border-radius:22px;padding:22px;box-shadow:0 5px 22px rgba(0,0,0,.05)}
            .student-profile-page-avatar{width:104px;height:104px;border-radius:50%;object-fit:cover;display:block;margin:0 auto 14px;background:#eaf5ff}
            .student-profile-page-fallback{width:104px;height:104px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 14px;background:#eaf5ff;color:#0095f6;font-size:42px}
            .student-post-owner-menu{margin-inline-start:auto;width:38px;height:38px;border:0;border-radius:50%;background:transparent;cursor:pointer;font-size:18px}
            .student-post-owner-menu:hover{background:#f3f4f6}
            .student-action-sheet{position:fixed;inset:0;z-index:10000080;background:rgba(0,0,0,.45);display:flex;align-items:flex-end;justify-content:center;padding:14px;direction:rtl}
            .student-action-sheet-card{width:100%;max-width:520px;background:#fff;border-radius:22px;padding:12px;box-shadow:0 18px 60px rgba(0,0,0,.3)}
            .student-action-sheet-card button{width:100%;border:0;border-radius:14px;padding:14px;margin:4px 0;font-size:15px;cursor:pointer;background:#f4f5f7}
            .student-action-sheet-card button.danger{color:#d93025;background:#fff0f0}
            .student-exit-confirm{position:fixed;inset:0;z-index:10000100;background:rgba(0,0,0,.48);display:flex;align-items:center;justify-content:center;padding:18px;direction:rtl}
            .student-exit-card{width:100%;max-width:360px;background:#fff;border-radius:22px;padding:22px;text-align:center}
            .student-exit-actions{display:flex;gap:10px;margin-top:18px}
            .student-exit-actions button{flex:1;border:0;border-radius:13px;padding:12px;font-weight:700;cursor:pointer}
            .student-exit-actions .exit{background:#d93025;color:#fff}.student-exit-actions .cancel{background:#eef1f4;color:#222}
        `;
        document.head.appendChild(style);
    }

    function closeKnownFloatingLayers() {
        document.querySelectorAll(
            '#floating-panel.show,#student-posts-overlay.show,#student-story-form-modal.active,#studentStoryViewer.active,#studentStoryViewersModal.active,#studentStoryDeleteConfirm.active,.student-modal.show,.student-overlay.show'
        ).forEach(el => {
            el.classList.remove("show", "active", "is-open", "open");
            if (el.id === "floating-panel" && typeof window.closeFloatingPanel === "function") {
                try { window.closeFloatingPanel(); } catch (_) {}
            }
        });
    }

    function openPage({ id, title, html, onClose }) {
        ensureStyles();
        closeKnownFloatingLayers();
        const current = stack[stack.length - 1];
        if (current?.element) current.element.style.display = "none";

        const page = document.createElement("section");
        page.className = "student-internal-page";
        page.dataset.studentNavPage = id || "page";
        page.innerHTML = `
            <header class="student-internal-header">
                <button class="student-internal-back" type="button" aria-label="رجوع"><i class="fa-solid fa-arrow-right"></i></button>
                <div class="student-internal-title">${escapeHTML(title || "")}</div>
            </header>
            <div class="student-internal-body">${html || ""}</div>`;
        document.body.appendChild(page);
        const entry = { id, element: page, onClose };
        stack.push(entry);
        page.querySelector(".student-internal-back")?.addEventListener("click", back);
        history.pushState({ studentNavigation: true, id: id || "page" }, "");
        return page;
    }

    function back(fromPopState = false) {
        const entry = stack.pop();
        if (entry) {
            entry.element?.remove();
            try { entry.onClose?.(); } catch (_) {}
            const previous = stack[stack.length - 1];
            if (previous?.element) previous.element.style.display = "flex";
            if (!fromPopState && history.state?.studentNavigation) history.back();
            return true;
        }

        const closable = findTopClosable();
        if (closable) {
            closeElement(closable);
            return true;
        }

        showExitConfirm();
        return false;
    }

    function findTopClosable() {
        const selectors = [
            '#studentStoryViewer.active',
            '#student-story-form-modal.active',
            '#studentStoryViewersModal.active',
            '#studentStoryDeleteConfirm.active',
            '#student-reel-publisher.show',
            '#student-reels-overlay.show',
            '#student-store-overlay.show',
            '#student-posts-overlay.show',
            '#student-main-menu.is-open',
            '#floating-panel',
            '.student-overlay.show',
            '.student-modal.show'
        ];
        for (const selector of selectors) {
            const el = document.querySelector(selector);
            if (el) return el;
        }
        return null;
    }

    function isManagedByOwnPopState(el) {
        return Boolean(el && [
            'student-reel-publisher',
            'student-reels-overlay',
            'student-store-overlay',
            'student-main-menu'
        ].includes(el.id));
    }

    function closeFloatingOrEducationPanel() {
        const panel = document.getElementById('floating-panel');
        if (!panel) return false;

        const educationBack = panel.querySelector('#edu-back-btn');
        if (educationBack) {
            educationBack.click();
        } else if (typeof window.closeFloatingPanel === 'function') {
            window.closeFloatingPanel();
        } else {
            panel.remove();
        }

        floatingPanelHistoryActive = false;
        return true;
    }

    function closeElement(el) {
        if (!el) return;
        if (el.id === "floating-panel" && typeof window.closeFloatingPanel === "function") {
            window.closeFloatingPanel();
            return;
        }
        el.classList.remove("active", "show", "is-open", "open");
    }

    function showExitConfirm() {
        if (exitConfirm) return;
        ensureStyles();
        exitConfirm = document.createElement("div");
        exitConfirm.className = "student-exit-confirm";
        exitConfirm.innerHTML = `<div class="student-exit-card"><div style="font-size:38px;color:#d93025;margin-bottom:10px"><i class="fa-solid fa-right-from-bracket"></i></div><h3 style="margin:0 0 8px">الخروج من التطبيق</h3><p style="margin:0;color:#777">هل تريد الخروج من التطبيق؟</p><div class="student-exit-actions"><button class="cancel" type="button">إلغاء</button><button class="exit" type="button">خروج</button></div></div>`;
        document.body.appendChild(exitConfirm);
        exitConfirm.querySelector(".cancel").onclick = () => { exitConfirm.remove(); exitConfirm = null; };
        exitConfirm.querySelector(".exit").onclick = () => {
            exitConfirm.remove(); exitConfirm = null;
            if (navigator.app?.exitApp) navigator.app.exitApp();
            else if (window.Capacitor?.Plugins?.App?.exitApp) window.Capacitor.Plugins.App.exitApp();
            else window.close();
        };
    }

    function escapeHTML(value) {
        return String(value ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
    }

    async function openUserProfile(userId) {
        if (!userId || !window.supabaseClient) return;
        openPage({ id: `profile-loading-${userId}`, title: "الملف الشخصي", html: '<div style="text-align:center;padding:40px;color:#777">جارٍ تحميل الحساب...</div>' });
        const page = stack[stack.length - 1]?.element;
        const { data: profile, error } = await window.supabaseClient.from("profiles").select("id,full_name,username,bio,avatar_url,account_status").eq("id", userId).maybeSingle();
        if (!page?.isConnected) return;
        const body = page.querySelector(".student-internal-body");
        if (error || !profile) {
            body.innerHTML = '<div style="text-align:center;padding:40px;color:#d93025">تعذر تحميل الحساب.</div>';
            return;
        }
        let stats = { followers: 0, following: 0 };
        try {
            const { data } = await window.supabaseClient.rpc("get_profile_stats", { p_user_id: userId });
            const row = Array.isArray(data) ? data[0] : data;
            stats = { followers: Number(row?.followers_count || 0), following: Number(row?.following_count || 0) };
        } catch (_) {}
        const avatar = profile.avatar_url ? `<img class="student-profile-page-avatar" src="${escapeHTML(profile.avatar_url)}" alt="">` : '<div class="student-profile-page-fallback"><i class="fa-solid fa-user"></i></div>';
        body.innerHTML = `<div class="student-profile-page-card">${avatar}<h2 style="text-align:center;margin:0 0 5px">${escapeHTML(profile.full_name || "مستخدم")}</h2><div style="text-align:center;color:#0095f6;direction:ltr">@${escapeHTML(profile.username || "username")}</div><div style="display:flex;justify-content:center;gap:35px;margin:20px 0"><div><b>${stats.followers}</b><div style="font-size:12px;color:#777">متابعون</div></div><div><b>${stats.following}</b><div style="font-size:12px;color:#777">يتابع</div></div></div><p style="line-height:1.9;text-align:center;color:#555">${escapeHTML(profile.bio || "لا توجد نبذة بعد.")}</p></div>`;
    }

    async function getSignedInUserId() {
        if (!window.supabaseClient) return null;
        try {
            const { data } = await window.supabaseClient.auth.getUser();
            return data?.user?.id || null;
        } catch (_) {
            return null;
        }
    }

    async function markOwnedPosts() {
        if (!window.supabaseClient) return;
        const signedInUserId = await getSignedInUserId();
        if (!signedInUserId) return;
        const cards = [...document.querySelectorAll('.student-feed-card[data-feed-id]:not([data-owner-checked])')];
        if (!cards.length) return;
        cards.forEach(c => c.dataset.ownerChecked = "1");
        const ids = cards.map(c => c.dataset.feedId).filter(Boolean);
        const { data } = await window.supabaseClient.from("posts").select("id,user_id,content,post_type,media_url").in("id", ids);
        const map = new Map((data || []).map(p => [String(p.id), p]));
        cards.forEach(card => {
            const post = map.get(String(card.dataset.feedId));
            if (!post) return;
            card.dataset.userId = post.user_id;
            const header = card.querySelector('.student-feed-header');
            const avatar = header?.querySelector('.student-feed-avatar,.student-feed-avatar-placeholder');
            const user = header?.querySelector('.student-feed-user');
            [avatar,user].forEach(el => { if (el) { el.style.cursor = "pointer"; el.dataset.openProfile = post.user_id; } });
            if (String(post.user_id) === String(signedInUserId) && !header?.querySelector('.student-post-owner-menu')) {
                const btn = document.createElement("button");
                btn.type = "button"; btn.className = "student-post-owner-menu"; btn.innerHTML = '<i class="fa-solid fa-ellipsis"></i>';
                btn.onclick = e => { e.stopPropagation(); showPostActions(post, card, signedInUserId); };
                header.appendChild(btn);
            }
        });
    }

    function showPostActions(post, card, signedInUserId) {
        const sheet = document.createElement("div");
        sheet.className = "student-action-sheet";
        sheet.innerHTML = `<div class="student-action-sheet-card"><button type="button" data-edit><i class="fa-solid fa-pen"></i> تعديل المنشور</button><button type="button" class="danger" data-delete><i class="fa-solid fa-trash"></i> حذف المنشور</button><button type="button" data-cancel>إلغاء</button></div>`;
        document.body.appendChild(sheet);
        sheet.querySelector('[data-cancel]').onclick = () => sheet.remove();
        sheet.onclick = e => { if (e.target === sheet) sheet.remove(); };
        sheet.querySelector('[data-edit]').onclick = async () => {
            const next = prompt("عدّل نص المنشور:", post.content || "");
            if (next === null) return;
            const { error } = await window.supabaseClient.from("posts").update({ content: next.trim(), updated_at: new Date().toISOString() }).eq("id", post.id).eq("user_id", signedInUserId);
            if (!error) {
                const text = card.querySelector('.student-feed-text,.student-feed-caption');
                if (text) text.textContent = next.trim();
                post.content = next.trim();
                sheet.remove();
            } else alert("تعذر تعديل المنشور.");
        };
        sheet.querySelector('[data-delete]').onclick = () => {
            sheet.innerHTML = `<div class="student-action-sheet-card" style="text-align:center"><h3>حذف المنشور؟</h3><p style="color:#777">لا يمكن التراجع عن هذا الإجراء.</p><button type="button" class="danger" data-confirm>حذف نهائي</button><button type="button" data-cancel>إلغاء</button></div>`;
            sheet.querySelector('[data-cancel]').onclick = () => sheet.remove();
            sheet.querySelector('[data-confirm]').onclick = async () => {
                const { error } = await window.supabaseClient.from("posts").delete().eq("id", post.id).eq("user_id", signedInUserId);
                if (!error) { card.remove(); sheet.remove(); } else alert("تعذر حذف المنشور.");
            };
        };
    }

    function bindGlobalClicks() {
        document.addEventListener("click", e => {
            const target = e.target.closest('[data-open-profile],[data-user-profile],.student-reel-name,.student-story-user-name');
            if (!target) return;
            const reel = target.closest('[data-user-id],.student-reel');
            const userId = target.dataset.openProfile || target.dataset.userId || reel?.dataset?.userId || reel?.getAttribute('data-user-id');
            if (userId) { e.preventDefault(); e.stopPropagation(); openUserProfile(userId); }
        }, true);
    }

    function patchOwnProfile() {
        const apply = () => {
            if (!window.currentUser) return;
            window.showProfilePanel = () => openUserProfile(window.currentUser.id);
            if (window.StudentProfile) window.StudentProfile.open = () => openUserProfile(window.currentUser.id);
        };
        apply();
        setInterval(apply, 1500);
    }

    function startObservers() {
        const observer = new MutationObserver(() => markOwnedPosts());
        observer.observe(document.documentElement, { childList: true, subtree: true });
        setInterval(markOwnedPosts, 1600);
    }

    // posts.js is loaded before this file. When its publisher closes itself on popstate,
    // it dispatches this event before our popstate handler runs. Remember that closure so
    // we do not incorrectly show the exit confirmation afterward.
    window.addEventListener("student:reel-creator-closed", () => {
        recentlyClosedManagedLayer = true;
        setTimeout(() => { recentlyClosedManagedLayer = false; }, 80);
    });

    // Education uses the shared floating panel and originally had no browser-history entry.
    // Wrap it once so the hardware/browser Back button returns inside Education first.
    function installFloatingPanelHistoryBridge() {
        const original = window.showFloatingPanel;
        if (typeof original !== "function" || original.__studentHistoryWrapped) return;

        function wrappedShowFloatingPanel(title, content) {
            const result = original.apply(this, arguments);
            if (!floatingPanelHistoryActive) {
                history.pushState({ studentFloatingPanel: true }, "", location.href);
                floatingPanelHistoryActive = true;
            }
            return result;
        }
        wrappedShowFloatingPanel.__studentHistoryWrapped = true;
        window.showFloatingPanel = wrappedShowFloatingPanel;

        const originalClose = window.closeFloatingPanel;
        if (typeof originalClose === "function" && !originalClose.__studentHistoryWrapped) {
            function wrappedCloseFloatingPanel() {
                floatingPanelHistoryActive = false;
                return originalClose.apply(this, arguments);
            }
            wrappedCloseFloatingPanel.__studentHistoryWrapped = true;
            window.closeFloatingPanel = wrappedCloseFloatingPanel;
        }
    }

    window.addEventListener("popstate", () => {
        if (recentlyClosedManagedLayer) {
            recentlyClosedManagedLayer = false;
            return;
        }

        if (stack.length) {
            back(true);
            return;
        }

        const closable = findTopClosable();
        if (closable) {
            if (closable.id === "floating-panel") {
                closeFloatingOrEducationPanel();
                return;
            }

            // Reels, Store, Menu and Reel Publisher already own a popstate handler.
            // Do not close them twice and never show the exit dialog in the same Back press.
            if (isManagedByOwnPopState(closable)) return;

            closeElement(closable);
            return;
        }

        showExitConfirm();
    });

    document.addEventListener("backbutton", e => {
        e.preventDefault();
        const closable = findTopClosable();
        if (closable?.id === "floating-panel") {
            closeFloatingOrEducationPanel();
            return;
        }
        back();
    }, false);

    ensureStyles();
    installFloatingPanelHistoryBridge();
    setTimeout(installFloatingPanelHistoryBridge, 0);
    bindGlobalClicks();
    patchOwnProfile();
    startObservers();

    window.StudentOpenUserProfile = openUserProfile;
    window.StudentNavigation = { openPage, back, openUserProfile, showExitConfirm, closeKnownFloatingLayers };
})();
