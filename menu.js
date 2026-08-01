/* =========================================================
   Student - Menu System
   ☰ القائمة الرئيسية

   التصميم:
   - من اليسار
   - سريع
   - أزرق داكن متدرج إلى الأبيض
   - الأقسام داخل نفس اللوحة قدر الإمكان
   - رجوع الهاتف للتنقل
   - لا رجوع تلقائي للصفحة الرئيسية
   - تأكيد تسجيل الخروج
========================================================= */

(function () {

    "use strict";

    if (window.__studentMenuLoaded) {
        return;
    }

    window.__studentMenuLoaded = true;

    let featureCache = {};

    let menuElement = null;

    let currentView = "menu";

    let viewStack = [];

    let originalShowFloatingPanel = null;

    let floatingPanelInterceptActive = false;

    let historyDepth = 0;

    let ignoreNextPopState = false;

    let menuOpeningPromise = null;
    let menuActionBusy = false;


    /* =====================================================
       Toast
    ===================================================== */

    function menuToast(message) {

        const old =
            document.getElementById(
                "student-menu-toast"
            );

        if (old) {
            old.remove();
        }

        const el =
            document.createElement(
                "div"
            );

        el.id =
            "student-menu-toast";

        el.textContent =
            message;

        el.style.cssText = `
            position:fixed;
            left:50%;
            bottom:28px;
            transform:translateX(-50%);
            z-index:100003000;
            background:#1f1f1f;
            color:#fff;
            padding:11px 16px;
            border-radius:13px;
            font-size:13px;
            direction:rtl;
            box-shadow:0 10px 35px rgba(0,0,0,.25);
        `;

        document.body.appendChild(
            el
        );

        setTimeout(
            function () {

                el.remove();

            },
            2200
        );
    }


    /* =====================================================
       حماية HTML
    ===================================================== */

    function escapeHTML(value) {

        return String(
            value || ""
        )
            .replace(
                /&/g,
                "&amp;"
            )
            .replace(
                /</g,
                "&lt;"
            )
            .replace(
                />/g,
                "&gt;"
            )
            .replace(
                /"/g,
                "&quot;"
            )
            .replace(
                /'/g,
                "&#039;"
            );
    }


    /* =====================================================
       تحميل ميزات القائمة
    ===================================================== */

    async function loadMenuFeatures() {

        if (
            typeof supabaseClient ===
            "undefined" ||
            !supabaseClient
        ) {

            return false;
        }


        try {

            const keys = [

                "menu",
                "profile",
                "settings",
                "notifications",
                "saved",
                "contact_us",
                "about"

            ];


            const {
                data,
                error
            } =
                await supabaseClient
                    .from(
                        "feature_flags"
                    )
                    .select(
                        "feature_key, enabled, release_at"
                    )
                    .in(
                        "feature_key",
                        keys
                    );


            if (error) {

                console.error(
                    "Menu feature loading error:",
                    error
                );

                return false;
            }


            featureCache = {};


            (data || []).forEach(
                function (feature) {

                    let enabled =
                        feature.enabled ===
                        true;


                    if (
                        enabled &&
                        feature.release_at
                    ) {

                        const releaseDate =
                            new Date(
                                feature.release_at
                            );


                        if (
                            !Number.isNaN(
                                releaseDate.getTime()
                            ) &&
                            releaseDate >
                            new Date()
                        ) {

                            enabled = false;
                        }
                    }


                    featureCache[
                        feature.feature_key
                    ] =
                        enabled;

                }
            );


            return true;

        } catch (error) {

            console.error(
                "Menu features error:",
                error
            );

            return false;
        }
    }


    /* =====================================================
       حالة الميزة
    ===================================================== */

    function isFeatureEnabled(
        featureKey
    ) {

        return (
            featureCache[
                featureKey
            ] === true
        );
    }


    /* =====================================================
       تنظيف الكاش
    ===================================================== */

    function clearMenuFeatureCache() {

        featureCache = {};
    }


    /* =====================================================
       Settings
    ===================================================== */

    let settingsSystemPromise = null;

    async function ensureSettingsSystem() {

        if (typeof window.openStudentSettings === "function") {
            return true;
        }

        if (settingsSystemPromise) {
            return settingsSystemPromise;
        }

        const existing = document.querySelector(
            'script[data-student-settings="true"]'
        );

        if (existing) {
            settingsSystemPromise = new Promise(function (resolve) {
                let attempts = 0;
                const timer = setInterval(function () {
                    attempts += 1;
                    if (typeof window.openStudentSettings === "function") {
                        clearInterval(timer);
                        resolve(true);
                    } else if (attempts >= 40) {
                        clearInterval(timer);
                        resolve(false);
                    }
                }, 100);
            });

            return settingsSystemPromise;
        }

        settingsSystemPromise = new Promise(function (resolve) {
            const script = document.createElement("script");
            script.src = "settings.js";
            script.async = true;
            script.dataset.studentSettings = "true";
            script.onload = function () {
                resolve(typeof window.openStudentSettings === "function");
            };
            script.onerror = function () {
                resolve(false);
            };
            document.body.appendChild(script);
        });

        const ready = await settingsSystemPromise;
        if (!ready) settingsSystemPromise = null;
        return ready;
    }

    /* =====================================================
       Saved
    ===================================================== */

    let savedSystemPromise = null;

    async function ensureSavedSystem() {

        if (
            typeof window.openStudentSaved ===
            "function"
        ) {

            return true;
        }

        if (savedSystemPromise) {
            return savedSystemPromise;
        }


        if (
            document.querySelector(
                'script[data-student-saved="true"]'
            )
        ) {

            return new Promise(
                function (resolve) {

                    let attempts =
                        0;


                    const timer =
                        setInterval(
                            function () {

                                attempts++;


                                if (
                                    typeof window.openStudentSaved ===
                                    "function"
                                ) {

                                    clearInterval(
                                        timer
                                    );

                                    resolve(
                                        true
                                    );

                                    return;
                                }


                                if (
                                    attempts >=
                                    30
                                ) {

                                    clearInterval(
                                        timer
                                    );

                                    resolve(
                                        false
                                    );
                                }

                            },
                            100
                        );
                }
            );
        }


        savedSystemPromise = new Promise(
            function (resolve) {

                const script =
                    document.createElement(
                        "script"
                    );


                script.src =
                    "saved.js";


                script.async =
                    true;


                script.dataset.studentSaved =
                    "true";


                script.onload =
                    function () {

                        resolve(
                            typeof window.openStudentSaved ===
                            "function"
                        );

                    };


                script.onerror =
                    function () {

                        console.error(
                            "تعذر تحميل saved.js"
                        );

                        resolve(
                            false
                        );

                    };


                document.body.appendChild(
                    script
                );

            }
        );

        try {
            return await savedSystemPromise;
        } finally {
            if (
                typeof window.openStudentSaved !==
                "function"
            ) {
                savedSystemPromise = null;
            }
        }
    }


    /* =====================================================
       CSS
    ===================================================== */

    function injectMenuStyles() {

        if (
            document.getElementById(
                "student-menu-style"
            )
        ) {

            return;
        }


        const style =
            document.createElement(
                "style"
            );


        style.id =
            "student-menu-style";


        style.textContent = `

            #student-main-menu {
                position:fixed;
                inset:0;
                z-index:100001900;
                display:none;
                direction:rtl;
            }

            #student-main-menu.is-open {
                display:block;
            }

            #student-main-menu-backdrop {
                position:absolute;
                inset:0;
                background:rgba(0,0,0,.34);
                opacity:0;
                transition:
                    opacity .16s ease;
            }

            #student-main-menu.is-open
            #student-main-menu-backdrop {
                opacity:1;
            }


            /* =========================================
               القائمة الرئيسية
            ========================================= */

            #student-main-menu-sheet {
                position:absolute;
                top:0;
                left:0;
                bottom:0;

                width:
                    min(88vw,390px);

                background:
                    linear-gradient(
                        180deg,
                        #063b73 0%,
                        #0a5ca8 38%,
                        #dcecff 72%,
                        #ffffff 100%
                    );

                box-shadow:
                    12px 0 35px
                    rgba(0,0,0,.18);

                transform:
                    translateX(-100%);

                transition:
                    transform .18s
                    cubic-bezier(
                        .22,
                        .8,
                        .24,
                        1
                    );

                display:flex;
                flex-direction:column;

                overflow:hidden;
            }

            #student-main-menu.is-open
            #student-main-menu-sheet {
                transform:
                    translateX(0);
            }


            /* =========================================
               الهيدر
            ========================================= */

            .student-menu-header {
                min-height:64px;

                display:flex;
                align-items:center;

                gap:10px;

                padding:
                    max(
                        12px,
                        env(
                            safe-area-inset-top
                        )
                    )
                    15px
                    12px;

                background:
                    linear-gradient(
                        180deg,
                        #042f5c,
                        #075a9f
                    );

                border-bottom:
                    1px solid
                    rgba(255,255,255,.20);

                flex-shrink:0;
            }


            .student-menu-back {
                width:42px;
                height:42px;

                border:0;
                border-radius:50%;

                background:
                    rgba(255,255,255,.88);

                color:#063b73;

                display:flex;
                align-items:center;
                justify-content:center;

                font-size:18px;

                cursor:pointer;

                opacity:0;
                pointer-events:none;

                transition:
                    opacity .15s ease;
            }


            .student-menu-back.visible {
                opacity:1;
                pointer-events:auto;
            }


            .student-menu-title {
                flex:1;

                color:#ffffff;

                font-size:19px;

                font-weight:800;

                text-align:right;
            }


            .student-menu-close {
                width:42px;
                height:42px;

                border:0;
                border-radius:50%;

                background:
                    rgba(255,255,255,.88);

                color:#063b73;

                display:flex;
                align-items:center;
                justify-content:center;

                font-size:20px;

                cursor:pointer;
            }


            /* =========================================
               محتوى القائمة
            ========================================= */

            .student-menu-content {
                flex:1;

                overflow-y:auto;

                padding:14px;

                -webkit-overflow-scrolling:touch;
            }


            /* =========================================
               عناصر القائمة
            ========================================= */

            .student-menu-item {
                width:100%;

                border:
                    1px solid
                    rgba(255,255,255,.75);

                background:
                    rgba(
                        255,
                        255,
                        255,
                        .92
                    );

                color:#18324a;

                padding:15px;

                border-radius:15px;

                text-align:right;

                font-size:15px;

                font-weight:700;

                cursor:pointer;

                display:flex;
                align-items:center;

                gap:13px;

                direction:rtl;

                margin-bottom:9px;

                box-shadow:
                    0 3px 10px
                    rgba(0,55,110,.10);

                transition:
                    transform .10s ease,
                    background .10s ease;
            }


            .student-menu-item:active {
                transform:
                    scale(.985);

                background:
                    #ffffff;
            }


            .student-menu-item i {
                width:23px;

                text-align:center;

                color:#0878c9;

                font-size:17px;
            }


            .student-menu-item span {
                color:#18324a;

                font-weight:700;
            }


            /* =========================================
               تسجيل الخروج
            ========================================= */

            .student-menu-item.danger {

                color:#9b2525;

                background:
                    rgba(
                        255,
                        245,
                        245,
                        .96
                    );
            }


            .student-menu-item.danger i {
                color:#c62828;
            }


            .student-menu-item.danger span {
                color:#9b2525;
            }


            /* =========================================
               التحميل
            ========================================= */

            .student-menu-loading {

                padding:35px 10px;

                text-align:center;

                color:#18324a;

                font-size:13px;

                font-weight:600;
            }


            .student-menu-empty {

                padding:35px 10px;

                text-align:center;

                color:#18324a;

                font-size:13px;

                font-weight:600;
            }


            /* =========================================
               أسفل القائمة
            ========================================= */

            .student-menu-footer {

                padding:
                    10px
                    14px
                    max(
                        12px,
                        env(
                            safe-area-inset-bottom
                        )
                    );

                color:#31546f;

                text-align:center;

                font-size:11px;

                font-weight:600;

                border-top:
                    1px solid
                    rgba(255,255,255,.55);

                background:
                    rgba(
                        255,
                        255,
                        255,
                        .55
                    );

                flex-shrink:0;
            }


            /* =========================================
               إخفاء النوافذ العائمة عند الدخول داخل
               القائمة
            ========================================= */

            body.student-menu-inner-open
            > .floating-panel,

            body.student-menu-inner-open
            > [id*="floating"],

            body.student-menu-inner-open
            > [class*="floating-panel"] {

                display:none !important;
            }

        `;


        document.head.appendChild(
            style
        );
    }


    /* =====================================================
       إنشاء القائمة
    ===================================================== */

    function ensureMenuElement() {

        if (
            document.getElementById(
                "student-main-menu"
            )
        ) {

            menuElement =
                document.getElementById(
                    "student-main-menu"
                );

            return menuElement;
        }


        menuElement =
            document.createElement(
                "div"
            );


        menuElement.id =
            "student-main-menu";


        menuElement.innerHTML = `

            <div
                id="student-main-menu-backdrop"
            ></div>


            <aside
                id="student-main-menu-sheet"
                aria-label="القائمة الرئيسية"
            >

                <div
                    class="student-menu-header"
                >

                    <button
                        id="student-menu-back"
                        type="button"
                        class="student-menu-back"
                        aria-label="رجوع"
                    >
                        <i class="
                            fa-solid
                            fa-arrow-right
                        "></i>
                    </button>


                    <div
                        id="student-menu-title"
                        class="student-menu-title"
                    >
                        القائمة
                    </div>


                    <button
                        id="student-menu-close"
                        type="button"
                        class="student-menu-close"
                        aria-label="إغلاق"
                    >
                        ×
                    </button>

                </div>


                <div
                    id="student-menu-content"
                    class="student-menu-content"
                ></div>


                <div
                    id="student-menu-footer"
                    class="student-menu-footer"
                >
                    Student
                </div>

            </aside>
        `;


        document.body.appendChild(
            menuElement
        );


        menuElement
            .querySelector(
                "#student-main-menu-backdrop"
            )
            ?.addEventListener(
                "click",
                function () {

                    closeMainMenu();

                }
            );


        menuElement
            .querySelector(
                "#student-menu-close"
            )
            ?.addEventListener(
                "click",
                function () {

                    closeMainMenu();

                }
            );


        menuElement
            .querySelector(
                "#student-menu-back"
            )
            ?.addEventListener(
                "click",
                function () {

                    goBackInsideMenu();

                }
            );


        return menuElement;
    }


    /* =====================================================
       اعتراض showFloatingPanel
    ===================================================== */

    function activateFloatingPanelInterceptor() {

        if (
            floatingPanelInterceptActive
        ) {

            return;
        }


        if (
            typeof window.showFloatingPanel !==
            "function"
        ) {

            return;
        }


        originalShowFloatingPanel =
            window.showFloatingPanel;


        window.showFloatingPanel =
            function (
                title,
                content
            ) {

                if (
                    !isMenuOpen()
                ) {

                    return originalShowFloatingPanel.apply(
                        this,
                        arguments
                    );
                }


                openInnerView(
                    title,
                    content
                );
            };


        floatingPanelInterceptActive =
            true;
    }


    /* =====================================================
       تعطيل الاعتراض
    ===================================================== */

    function deactivateFloatingPanelInterceptor() {

        if (
            !floatingPanelInterceptActive
        ) {

            return;
        }


        if (
            originalShowFloatingPanel
        ) {

            window.showFloatingPanel =
                originalShowFloatingPanel;
        }


        originalShowFloatingPanel =
            null;


        floatingPanelInterceptActive =
            false;
    }


    /* =====================================================
       فحص القائمة
    ===================================================== */

    function isMenuOpen() {

        return !!(
            menuElement &&
            menuElement.classList.contains(
                "is-open"
            )
        );
    }


    /* =====================================================
       تنسيق المحتوى الداخلي
    ===================================================== */

    function normalizeInnerContent(
        content
    ) {

        return `
            <div
                style="
                    color:#18324a;
                    font-weight:600;
                "
            >
                ${content}
            </div>
        `;
    }


    /* =====================================================
       فتح View داخلي
    ===================================================== */

    function openInnerView(
        title,
        content
    ) {

        const menu =
            ensureMenuElement();


        const contentBox =
            menu.querySelector(
                "#student-menu-content"
            );


        const titleBox =
            menu.querySelector(
                "#student-menu-title"
            );


        const backButton =
            menu.querySelector(
                "#student-menu-back"
            );


        if (!contentBox) {
            return;
        }


        viewStack.push({

            title:
                titleBox?.textContent ||
                "القائمة",

            content:
                contentBox.innerHTML,

            view:
                currentView

        });


        currentView =
            "inner";


        if (titleBox) {

            titleBox.textContent =
                title ||
                "القائمة";
        }


        if (backButton) {

            backButton.classList.add(
                "visible"
            );
        }


        contentBox.innerHTML =
            normalizeInnerContent(
                content
            );


        document.body.classList.add(
            "student-menu-inner-open"
        );


        bindInnerCloseButtons(
            contentBox
        );


        pushMenuHistoryState();
    }


    /* =====================================================
       الجسر لـ settings.js
    ===================================================== */

    window.StudentMenuOpenView =
        function (
            title,
            content,
            readyCallback
        ) {

            openInnerView(
                title,
                content
            );


            if (
                typeof readyCallback ===
                "function"
            ) {

                const contentBox =
                    menuElement?.querySelector(
                        "#student-menu-content"
                    );


                setTimeout(
                    function () {

                        readyCallback(
                            contentBox
                        );

                    },
                    0
                );
            }
        };


    /* =====================================================
       ربط إغلاق المحتوى الداخلي
    ===================================================== */

    function bindInnerCloseButtons(
        container
    ) {

        if (!container) {
            return;
        }


        container
            .querySelectorAll(
                '[data-close], [data-close-panel], .close-panel, .panel-close'
            )
            .forEach(
                function (button) {

                    if (
                        button.dataset.studentMenuBackBound ===
                        "true"
                    ) {

                        return;
                    }


                    button.dataset.studentMenuBackBound =
                        "true";


                    button.addEventListener(
                        "click",
                        function (event) {

                            event.preventDefault();
                            event.stopPropagation();

                            goBackInsideMenu();

                        },
                        true
                    );
                }
            );
    }


    /* =====================================================
       عرض القائمة الرئيسية
    ===================================================== */

    async function renderMainMenu() {

        const menu =
            ensureMenuElement();


        const contentBox =
            menu.querySelector(
                "#student-menu-content"
            );


        const titleBox =
            menu.querySelector(
                "#student-menu-title"
            );


        const backButton =
            menu.querySelector(
                "#student-menu-back"
            );


        if (titleBox) {

            titleBox.textContent =
                "القائمة";
        }


        if (backButton) {

            backButton.classList.remove(
                "visible"
            );
        }


        currentView =
            "menu";


        if (viewStack.length) {
            viewStack = [];
        }


        document.body.classList.remove(
            "student-menu-inner-open"
        );


        contentBox.innerHTML = `

            <div
                class="student-menu-loading"
            >
                جاري تحميل القائمة...
            </div>
        `;


        menu.classList.add(
            "is-open"
        );


        document.body.style.overflow =
            "hidden";


        activateFloatingPanelInterceptor();


        await loadMenuFeatures();


        if (
            !isFeatureEnabled(
                "menu"
            )
        ) {

            closeMainMenu();

            return;
        }


        const items =
            buildMenuItems();


        contentBox.innerHTML =
            items.length
                ? items
                    .map(
                        function (item) {

                            return `

                                <button
                                    type="button"
                                    class="
                                        student-menu-item
                                        ${
                                            item.danger
                                                ? "danger"
                                                : ""
                                        }
                                    "
                                    data-student-menu-id="${escapeHTML(
                                        item.id
                                    )}"
                                >

                                    <i
                                        class="${escapeHTML(
                                            item.icon
                                        )}"
                                    ></i>

                                    <span>
                                        ${escapeHTML(
                                            item.text
                                        )}
                                    </span>

                                </button>
                            `;
                        }
                    )
                    .join("")

                : `
                    <div
                        class="student-menu-empty"
                    >
                        لا توجد عناصر متاحة.
                    </div>
                `;


        items.forEach(
            function (item) {

                const button =
                    contentBox.querySelector(
                        `[data-student-menu-id="${item.id}"]`
                    );


                if (!button) {
                    return;
                }


                button.onclick =
                    async function (event) {

                        event.preventDefault();
                        event.stopPropagation();

                        try {
                            await Promise.resolve(
                                item.action()
                            );
                        } catch (error) {
                            console.error(
                                "Menu action error:",
                                error
                            );
                            menuToast(
                                "تعذر فتح هذا القسم."
                            );
                        }
                    };
            }
        );
    }


    /* =====================================================
       Stack Back
    ===================================================== */

    function goBackInsideMenu() {

        if (
            viewStack.length
        ) {

            const previous =
                viewStack.pop();


            const contentBox =
                menuElement?.querySelector(
                    "#student-menu-content"
                );


            const titleBox =
                menuElement?.querySelector(
                    "#student-menu-title"
                );


            const backButton =
                menuElement?.querySelector(
                    "#student-menu-back"
                );


            if (
                contentBox &&
                titleBox
            ) {

                contentBox.innerHTML =
                    previous.content;


                titleBox.textContent =
                    previous.title;
            }


            currentView =
                previous.view;


            if (
                !viewStack.length &&
                backButton
            ) {

                backButton.classList.remove(
                    "visible"
                );


                document.body.classList.remove(
                    "student-menu-inner-open"
                );
            }


            bindInnerCloseButtons(
                contentBox
            );


            if (
                historyDepth > 0
            ) {

                ignoreNextPopState =
                    true;

                history.back();

                historyDepth--;
            }

            return;
        }


        closeMainMenu();
    }


    /* =====================================================
       History
    ===================================================== */

    function pushMenuHistoryState() {

        try {

            history.pushState(
                {
                    studentMenu:
                        true,

                    depth:
                        historyDepth + 1
                },
                "",
                location.href
            );


            historyDepth++;

        } catch (error) {

            console.warn(
                "Menu history state error:",
                error
            );
        }
    }


    function handlePopState() {

        if (
            ignoreNextPopState
        ) {

            ignoreNextPopState =
                false;

            return;
        }


        if (
            !isMenuOpen()
        ) {

            return;
        }


        if (
            historyDepth > 0
        ) {

            historyDepth--;


            if (
                viewStack.length
            ) {

                const previous =
                    viewStack.pop();


                const contentBox =
                    menuElement?.querySelector(
                        "#student-menu-content"
                    );


                const titleBox =
                    menuElement?.querySelector(
                        "#student-menu-title"
                    );


                const backButton =
                    menuElement?.querySelector(
                        "#student-menu-back"
                    );


                if (
                    contentBox &&
                    titleBox
                ) {

                    contentBox.innerHTML =
                        previous.content;

                    titleBox.textContent =
                        previous.title;
                }


                if (
                    !viewStack.length &&
                    backButton
                ) {

                    backButton.classList.remove(
                        "visible"
                    );

                    document.body.classList.remove(
                        "student-menu-inner-open"
                    );
                }


                currentView =
                    previous.view;


                bindInnerCloseButtons(
                    contentBox
                );

            } else {

                closeMainMenu(
                    false
                );
            }

        } else {

            closeMainMenu(
                false
            );
        }
    }


    window.addEventListener(
        "popstate",
        handlePopState
    );


    /* =====================================================
       إغلاق القائمة
    ===================================================== */

    function closeMainMenu(
        changeHistory = true
    ) {

        if (!menuElement) {
            return;
        }


        menuElement.classList.remove(
            "is-open"
        );


        document.body.style.overflow =
            "";


        document.body.classList.remove(
            "student-menu-inner-open"
        );


        viewStack = [];

        currentView =
            "menu";


        deactivateFloatingPanelInterceptor();


        if (
            changeHistory &&
            historyDepth > 0
        ) {

            const amount =
                historyDepth;


            historyDepth = 0;


            ignoreNextPopState =
                true;


            try {

                history.go(
                    -amount
                );

            } catch (error) {

                console.warn(
                    "Menu history close error:",
                    error
                );
            }
        }
    }


    /* =====================================================
       تأكيد تسجيل الخروج
    ===================================================== */

    function confirmLogout() {

        const existing =
            document.getElementById(
                "student-menu-logout-confirm"
            );


        if (existing) {
            existing.remove();
        }


        const overlay =
            document.createElement(
                "div"
            );


        overlay.id =
            "student-menu-logout-confirm";


        overlay.style.cssText = `
            position:fixed;
            inset:0;
            z-index:100002100;
            display:flex;
            align-items:center;
            justify-content:center;
            padding:20px;
            background:rgba(0,0,0,.50);
            direction:rtl;
        `;


        overlay.innerHTML = `

            <div style="
                width:100%;
                max-width:390px;
                background:#fff;
                border-radius:22px;
                padding:20px;
                box-sizing:border-box;
                box-shadow:0 20px 70px rgba(0,0,0,.3);
            ">

                <div style="
                    font-size:19px;
                    font-weight:800;
                    color:#222;
                    margin-bottom:10px;
                ">
                    تسجيل الخروج
                </div>

                <div style="
                    color:#666;
                    line-height:1.8;
                    font-size:14px;
                ">
                    هل تريد تسجيل الخروج من حسابك؟
                </div>

                <div style="
                    display:flex;
                    gap:10px;
                    margin-top:18px;
                ">

                    <button
                        type="button"
                        id="student-logout-cancel"
                        style="
                            flex:1;
                            border:0;
                            padding:13px;
                            border-radius:13px;
                            background:#f1f3f5;
                            cursor:pointer;
                            font-weight:700;
                        "
                    >
                        إلغاء
                    </button>

                    <button
                        type="button"
                        id="student-logout-confirm"
                        style="
                            flex:1;
                            border:0;
                            padding:13px;
                            border-radius:13px;
                            background:#d93025;
                            color:#fff;
                            cursor:pointer;
                            font-weight:700;
                        "
                    >
                        نعم، تسجيل الخروج
                    </button>

                </div>

            </div>
        `;


        document.body.appendChild(
            overlay
        );


        overlay
            .querySelector(
                "#student-logout-cancel"
            )
            ?.addEventListener(
                "click",
                function () {

                    overlay.remove();

                }
            );


        overlay
            .querySelector(
                "#student-logout-confirm"
            )
            ?.addEventListener(
                "click",
                async function () {

                    this.disabled =
                        true;

                    this.textContent =
                        "جارٍ تسجيل الخروج...";


                    try {

                        if (
                            typeof window.logoutUser ===
                            "function"
                        ) {

                            await window.logoutUser();
                        }


                    } catch (error) {

                        console.error(
                            "Logout error:",
                            error
                        );

                        menuToast(
                            "تعذر تسجيل الخروج."
                        );

                    } finally {

                        overlay.remove();

                    }

                }
            );
    }


    /* =====================================================
       Contact
    ===================================================== */

    function openContact() {

        const whatsappURL =
            "https://wa.me/message/TSDV5JBPE2KSP1";


        if (
            typeof window.showFloatingPanel !==
            "function"
        ) {

            menuToast(
                "تعذر فتح التواصل."
            );

            return;
        }


        window.showFloatingPanel(
            "تواصل معنا",
            `
            <div style="
                text-align:center;
                padding:20px 10px;
                color:#18324a;
            ">

                <div style="
                    width:70px;
                    height:70px;
                    margin:0 auto 15px;
                    border-radius:20px;
                    background:#e8f4ff;
                    color:#0878c9;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    font-size:30px;
                ">
                    <i class="fa-brands fa-whatsapp"></i>
                </div>

                <h3 style="
                    margin:0 0 10px;
                ">
                    تواصل معنا
                </h3>

                <p style="
                    margin:0 0 20px;
                    color:#64788c;
                    line-height:1.8;
                ">
                    هل لديك مشكلة أو اقتراح؟
                    تواصل مع فريق Student مباشرة.
                </p>

                <button
                    id="student-contact-whatsapp"
                    type="button"
                    style="
                        width:100%;
                        border:none;
                        background:#25D366;
                        color:#fff;
                        padding:14px;
                        border-radius:12px;
                        font-size:15px;
                        cursor:pointer;
                    "
                >
                    فتح WhatsApp
                </button>

            </div>
            `
        );


        setTimeout(
            function () {

                const button =
                    menuElement?.querySelector(
                        "#student-contact-whatsapp"
                    );


                button?.addEventListener(
                    "click",
                    function () {

                        window.open(
                            whatsappURL,
                            "_blank",
                            "noopener,noreferrer"
                        );

                    }
                );

            },
            0
        );
    }


    /* =====================================================
       About
    ===================================================== */

    function openAbout() {

        if (
            typeof window.showFloatingPanel !==
            "function"
        ) {

            return;
        }


        window.showFloatingPanel(
            "حول Student",
            `
            <div style="
                text-align:center;
                padding:10px;
                color:#18324a;
            ">

                <div style="
                    width:82px;
                    height:82px;
                    margin:0 auto 15px;
                    border-radius:22px;
                    background:#e8f4ff;
                    color:#0878c9;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    font-size:34px;
                    font-weight:700;
                ">
                    S
                </div>

                <h2 style="
                    margin:0 0 5px;
                ">
                    Student
                </h2>

                <div style="
                    color:#64788c;
                    font-size:13px;
                    margin-bottom:18px;
                ">
                    الإصدار 1.0.0
                </div>

                <div style="
                    background:#f2f8ff;
                    border-radius:14px;
                    padding:15px;
                    text-align:right;
                    color:#34526b;
                    line-height:1.9;
                ">
                    تطبيق عراقي صُمم لتطوير الطلاب
                    وتوفير بيئة تعليمية واجتماعية
                    متكاملة.
                </div>

                <div style="
                    margin-top:15px;
                    color:#64788c;
                    font-size:12px;
                ">
                    جميع الحقوق محفوظة لـ Student
                </div>

            </div>
            `
        );
    }


    /* =====================================================
       بناء العناصر
    ===================================================== */

    function buildMenuItems() {

        const items = [];


        if (
            isFeatureEnabled(
                "profile"
            )
        ) {

            items.push({

                id:
                    "menu-profile",

                icon:
                    "fa-regular fa-user",

                text:
                    "الملف الشخصي",

                action:
                    function () {

                        if (
                            typeof window.showProfilePanel ===
                            "function"
                        ) {

                            window.showProfilePanel();

                        } else {

                            menuToast(
                                "الملف الشخصي غير متاح."
                            );
                        }

                    }

            });
        }


        if (
            isFeatureEnabled(
                "settings"
            )
        ) {

            items.push({

                id:
                    "menu-settings",

                icon:
                    "fa-solid fa-gear",

                text:
                    "الإعدادات",

                action:
                    async function () {

                        const ready =
                            await ensureSettingsSystem();

                        if (
                            ready &&
                            typeof window.openStudentSettings ===
                            "function"
                        ) {

                            window.openStudentSettings();
                            return;
                        }

                        menuToast(
                            "تعذر تحميل الإعدادات."
                        );

                    }

            });
        }


        if (
            isFeatureEnabled(
                "notifications"
            )
        ) {

            items.push({

                id:
                    "menu-notifications",

                icon:
                    "fa-regular fa-bell",

                text:
                    "الإشعارات",

                action:
                    function () {

                        if (
                            typeof window.openNotifications ===
                            "function"
                        ) {

                            window.openNotifications();

                        } else {

                            menuToast(
                                "الإشعارات غير متاحة."
                            );
                        }

                    }

            });
        }


        if (
            isFeatureEnabled(
                "saved"
            )
        ) {

            items.push({

                id:
                    "menu-saved",

                icon:
                    "fa-regular fa-bookmark",

                text:
                    "المحفوظات",

                action:
                    async function () {

                        const ready =
                            await ensureSavedSystem();


                        if (!ready) {

                            menuToast(
                                "تعذر تحميل المحفوظات."
                            );

                            return;
                        }


                        window.openStudentSaved();

                    }

            });
        }


        if (
            isFeatureEnabled(
                "contact_us"
            )
        ) {

            items.push({

                id:
                    "menu-contact",

                icon:
                    "fa-regular fa-comment",

                text:
                    "تواصل معنا",

                action:
                    openContact

            });
        }


        if (
            isFeatureEnabled(
                "about"
            )
        ) {

            items.push({

                id:
                    "menu-about",

                icon:
                    "fa-solid fa-circle-info",

                text:
                    "حول Student",

                action:
                    openAbout

            });
        }


        items.push({

            id:
                "menu-logout",

            icon:
                "fa-solid fa-right-from-bracket",

            text:
                "تسجيل الخروج",

            danger:
                true,

            action:
                confirmLogout

        });


        return items;
    }


    /* =====================================================
       فتح القائمة
    ===================================================== */

    async function openMenu() {

        if (menuOpeningPromise) {
            return menuOpeningPromise;
        }

        menuOpeningPromise = (async function () {

            injectMenuStyles();

            const menu =
                ensureMenuElement();

            if (
                !menu.classList.contains(
                    "is-open"
                )
            ) {

                viewStack = [];

                currentView =
                    "menu";

                historyDepth =
                    0;

                await renderMainMenu();

                pushMenuHistoryState();

                return;
            }

            menu.classList.add(
                "is-open"
            );

        })();

        try {
            await menuOpeningPromise;
        } finally {
            menuOpeningPromise = null;
        }
    }


    /* =====================================================
       ربط زر ☰
       منع القائمة القديمة
    ===================================================== */

    function bindMenuButton() {

        const menuIcon =
            document.getElementById(
                "menu-icon"
            );


        if (!menuIcon) {
            return;
        }


        if (
            menuIcon.dataset.studentMenuCaptureBound ===
            "true"
        ) {

            return;
        }


        menuIcon.dataset.studentMenuCaptureBound =
            "true";


        menuIcon.style.cursor =
            "pointer";


        menuIcon.addEventListener(
            "click",
            function (event) {

                event.preventDefault();

                event.stopImmediatePropagation();

                openMenu();

            },
            true
        );
    }


    /* =====================================================
       API
    ===================================================== */

    window.openStudentMenu =
        openMenu;


    window.closeStudentMenu =
        function () {

            closeMainMenu();

        };


    window.clearStudentMenuFeatureCache =
        clearMenuFeatureCache;


    /* =====================================================
       تشغيل
    ===================================================== */

    function startMenu() {

        injectMenuStyles();

        bindMenuButton();


        setTimeout(
            bindMenuButton,
            300
        );


        setTimeout(
            bindMenuButton,
            1000
        );
    }


    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            startMenu,
            {
                once:true
            }
        );

    } else {

        startMenu();
    }


})();
