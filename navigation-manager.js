/* =========================================================
   Student — Clean Central Navigation
   one back controller; no old profile/feed observers or timers
========================================================= */
(function () {
    "use strict";

    if (window.StudentNavigation?.version === "clean-2") return;

    const pageStack = [];
    let exitDialog = null;
    let handlingBack = false;
    const GUARD_KEY = "studentBackGuard";

    const visible = (el) => {
        if (!el || !el.isConnected) return false;
        const style = getComputedStyle(el);
        return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
    };

    const hide = (el) => {
        if (!el) return false;
        el.classList.remove("active", "show", "open", "is-open", "visible");
        if (el.hasAttribute("aria-hidden")) el.setAttribute("aria-hidden", "true");
        if (visible(el)) el.style.display = "none";
        return true;
    };

    function safeCall(name, ...args) {
        const fn = window[name];
        if (typeof fn !== "function") return false;
        try {
            const result = fn(...args);
            return result !== false;
        } catch (_) {
            return false;
        }
    }

    function closeTopLayer() {
        /* deepest/temporary layers first */
        const directClosers = [
            ["#studentStoryDeleteConfirm.active", null],
            ["#studentStoryViewersModal.active", null],
            ["#student-reel-comments.show, #student-reel-comments.active", null],
            ["#student-reels-dialog.show, #student-reels-dialog.active", null],
            [".student-store-modal.show, .student-store-modal.active", null],
            ["#student-reel-publisher.show, #student-reel-publisher.active", "closeStudentReelPublisher"],
            ["#student-story-form-modal.show, #student-story-form-modal.active", "closeStoryForm"],
            ["#studentStoryViewer.show, #studentStoryViewer.active", "closeStoryViewer"],
            ["#student-ads-admin-page.show", "closeStudentAdsAdmin"],
            ["#student-teachers-education-overlay.show", "closeStudentTeachersEducation"],
            [".student-admin-overlay.show", "closeStudentAdminPanel"],
            ["#student-store-overlay.show, #student-store-overlay.active", "closeStudentStore"],
            ["#student-reels-overlay.show, #student-reels-overlay.active", "closeStudentReels"],
            ["#student-education-overlay.show, #student-education-overlay.active", "closeEducationPanel"],
            ["#floating-panel.show", "closeFloatingPanel"],
            ["#student-main-menu.is-open", "closeStudentMenu"]
        ];

        for (const [selector, fnName] of directClosers) {
            const el = document.querySelector(selector);
            if (!el || !visible(el)) continue;
            if (fnName && safeCall(fnName)) return true;
            return hide(el);
        }

        const generic = [...document.querySelectorAll(
            ".student-internal-page,.student-fullscreen-page.show,.student-page-overlay.show,.student-page-overlay.active,.student-overlay.show,.student-overlay.active,.student-modal.show,.student-modal.active"
        )].filter(visible).pop();
        if (generic) return hide(generic);

        return false;
    }

    function openPage({ id = "page", title = "", html = "", onClose = null } = {}) {
        const current = pageStack.at(-1);
        if (current?.element) current.element.hidden = true;

        const page = document.createElement("section");
        page.className = "student-internal-page";
        page.dataset.studentNavPage = id;
        page.innerHTML = `
            <header class="student-internal-header">
                <button class="student-internal-back" type="button" aria-label="رجوع">
                    <i class="fa-solid fa-arrow-right"></i>
                </button>
                <div class="student-internal-title"></div>
            </header>
            <div class="student-internal-body"></div>`;
        page.querySelector(".student-internal-title").textContent = title;
        page.querySelector(".student-internal-body").innerHTML = html;
        page.querySelector(".student-internal-back").addEventListener("click", () => back());
        document.body.appendChild(page);
        pageStack.push({ id, element: page, onClose });
        return page;
    }

    function closePage() {
        const entry = pageStack.pop();
        if (!entry) return false;
        entry.element?.remove();
        try { entry.onClose?.(); } catch (_) {}
        const previous = pageStack.at(-1);
        if (previous?.element) previous.element.hidden = false;
        return true;
    }

    function back() {
        if (handlingBack) return true;
        handlingBack = true;
        try {
            if (exitDialog) {
                exitDialog.remove();
                exitDialog = null;
                return true;
            }
            if (closePage()) return true;
            if (closeTopLayer()) return true;
            showExitConfirm();
            return false;
        } finally {
            setTimeout(() => { handlingBack = false; }, 0);
        }
    }

    function showExitConfirm() {
        if (exitDialog) return;
        exitDialog = document.createElement("div");
        exitDialog.className = "student-exit-confirm";
        exitDialog.innerHTML = `
            <div class="student-exit-card" role="dialog" aria-modal="true">
                <h3>الخروج من التطبيق</h3>
                <p style="margin-top:8px;color:#6f7782">هل تريد مغادرة التطبيق؟</p>
                <div style="display:flex;gap:10px;margin-top:18px">
                    <button type="button" data-cancel style="flex:1;padding:12px;border:0;border-radius:12px">إلغاء</button>
                    <button type="button" data-exit style="flex:1;padding:12px;border:0;border-radius:12px;background:#d93025;color:#fff">خروج</button>
                </div>
            </div>`;
        document.body.appendChild(exitDialog);
        exitDialog.querySelector("[data-cancel]").onclick = () => {
            exitDialog.remove();
            exitDialog = null;
        };
        exitDialog.querySelector("[data-exit]").onclick = () => {
            exitDialog.remove();
            exitDialog = null;
            try { window.close(); } catch (_) {}
        };
    }

    /* One permanent browser-history guard. No feature is allowed to own exit logic. */
    function installHistoryGuard() {
        try {
            history.replaceState({ ...(history.state || {}), [GUARD_KEY]: "root" }, "", location.href);
            history.pushState({ [GUARD_KEY]: "guard" }, "", location.href);
        } catch (_) {}
    }

    function onPopState(event) {
        event.stopImmediatePropagation();
        event.stopPropagation();
        const handled = back();
        try { history.pushState({ [GUARD_KEY]: "guard" }, "", location.href); } catch (_) {}
        return handled;
    }

    /* capture phase runs before old bubble listeners still present in feature files */
    window.addEventListener("popstate", onPopState, true);
    document.addEventListener("backbutton", (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        back();
    }, true);

    /* X/back buttons use this controller instead of history.back(). */
    document.addEventListener("click", (event) => {
        const button = event.target.closest(
            ".student-internal-back,.student-page-back,[data-student-back]," +
            ".student-reel-close,.student-reel-publisher-close,.student-store-close," +
            ".student-menu-close,.student-menu-back,.panel-close,.close-panel"
        );
        if (!button) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        back();
    }, true);

    installHistoryGuard();

    window.StudentHandleAndroidBack = back;
    window.StudentNavigation = {
        version: "clean-2",
        openPage,
        back,
        closePage,
        closeTopLayer,
        showExitConfirm
    };
})();
