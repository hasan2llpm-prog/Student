/* =========================================================
   Student - Settings Bundle
   يحتوي: القائمة + الإعدادات + المحفوظات
   مدمج من الملفات الأصلية دون تغيير وظائفها
========================================================= */

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
                    "settings.js?v=3.0.0";


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
                            "تعذر تحميل نظام المحفوظات من settings.js"
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

    async function goBackInsideMenu() {

        if (
            viewStack.length
        ) {

            const previous =
                viewStack.pop();


            /*
             * عند الرجوع إلى القائمة الرئيسية لا نعيد HTML محفوظًا فقط،
             * لأن innerHTML لا يحتفظ بمستمعات النقر. نعيد رسم القائمة
             * وربط جميع الأزرار حتى تستجيب من أول ضغطة كل مرة.
             */
            if (
                previous.view ===
                "menu"
            ) {

                await renderMainMenu();

            } else {

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
            }


            return;
        }


        closeMainMenu();
    }


    /* =====================================================
       إغلاق القائمة
    ===================================================== */

    function closeMainMenu() {

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

                await renderMainMenu();

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


/* =========================================================
   Student - Settings System
   إعدادات مستقلة بالكامل
========================================================= */

(function () {
    "use strict";

    if (window.__studentSettingsLoaded) return;
    window.__studentSettingsLoaded = true;

    let settingsOverlay = null;


    /* =====================================================
       أدوات
    ===================================================== */

    function getSupabase() {
        return (
            typeof supabaseClient !== "undefined" &&
            supabaseClient
        )
            ? supabaseClient
            : null;
    }


    function escapeHTML(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    /* =====================================================
       معرفة هل الإعدادات داخل القائمة الرئيسية
    ===================================================== */

    function isInsideStudentMenu() {

        const menu =
            document.getElementById(
                "student-main-menu"
            );

        return !!(
            menu &&
            menu.classList.contains(
                "is-open"
            )
        );
    }


    /* =====================================================
       فتح داخل القائمة الرئيسية
    ===================================================== */

    function openSettingsInsideMenu() {

        if (
            typeof window.StudentMenuOpenView !==
            "function"
        ) {
            return false;
        }

        window.StudentMenuOpenView(
            "الإعدادات",
            buildSettingsHomeHTML(),
            function () {

                bindSettingsHomeButtons();

            }
        );

        return true;
    }


    /* =====================================================
       الرئيسية HTML
    ===================================================== */

    function buildSettingsHomeHTML() {

        return `

            <div class="student-settings-list">

                <button
                    class="student-settings-item"
                    data-settings-page="account"
                >

                    <div class="student-settings-icon">
                        <i class="fa-regular fa-user"></i>
                    </div>

                    <div class="student-settings-item-text">

                        <div class="student-settings-item-title">
                            الحساب
                        </div>

                        <div class="student-settings-item-description">
                            البريد الإلكتروني وكلمة المرور
                        </div>

                    </div>

                    <i class="fa-solid fa-chevron-left student-settings-chevron"></i>

                </button>


                <button
                    class="student-settings-item"
                    data-settings-page="privacy"
                >

                    <div class="student-settings-icon">
                        <i class="fa-solid fa-lock"></i>
                    </div>

                    <div class="student-settings-item-text">

                        <div class="student-settings-item-title">
                            الخصوصية
                        </div>

                        <div class="student-settings-item-description">
                            خصوصية الحساب
                        </div>

                    </div>

                    <i class="fa-solid fa-chevron-left student-settings-chevron"></i>

                </button>


                <button
                    class="student-settings-item"
                    data-settings-page="notifications"
                >

                    <div class="student-settings-icon">
                        <i class="fa-regular fa-bell"></i>
                    </div>

                    <div class="student-settings-item-text">

                        <div class="student-settings-item-title">
                            الإشعارات
                        </div>

                        <div class="student-settings-item-description">
                            التحكم بتنبيهات التطبيق
                        </div>

                    </div>

                    <i class="fa-solid fa-chevron-left student-settings-chevron"></i>

                </button>


                <button
                    class="student-settings-item"
                    data-settings-page="appearance"
                >

                    <div class="student-settings-icon">
                        <i class="fa-solid fa-palette"></i>
                    </div>

                    <div class="student-settings-item-text">

                        <div class="student-settings-item-title">
                            المظهر
                        </div>

                        <div class="student-settings-item-description">
                            فاتح أو داكن أو حسب الجهاز
                        </div>

                    </div>

                    <i class="fa-solid fa-chevron-left student-settings-chevron"></i>

                </button>


                <button
                    class="student-settings-item"
                    data-settings-page="language"
                >

                    <div class="student-settings-icon">
                        <i class="fa-solid fa-language"></i>
                    </div>

                    <div class="student-settings-item-text">

                        <div class="student-settings-item-title">
                            اللغة
                        </div>

                        <div class="student-settings-item-description">
                            لغة واجهة التطبيق
                        </div>

                    </div>

                    <i class="fa-solid fa-chevron-left student-settings-chevron"></i>

                </button>


                <button
                    class="student-settings-item"
                    data-settings-page="security"
                >

                    <div class="student-settings-icon">
                        <i class="fa-solid fa-shield-halved"></i>
                    </div>

                    <div class="student-settings-item-text">

                        <div class="student-settings-item-title">
                            الأمان
                        </div>

                        <div class="student-settings-item-description">
                            إدارة جلسات تسجيل الدخول
                        </div>

                    </div>

                    <i class="fa-solid fa-chevron-left student-settings-chevron"></i>

                </button>

            </div>
        `;
    }


    /* =====================================================
       CSS
    ===================================================== */

    function injectStyles() {

        if (
            document.getElementById(
                "student-settings-style"
            )
        ) {
            return;
        }

        const style =
            document.createElement("style");

        style.id =
            "student-settings-style";

        style.textContent = `

            .student-settings-list {
                display:flex;
                flex-direction:column;
                gap:10px;
            }

            .student-settings-item {
                width:100%;
                border:none;
                background:rgba(255,255,255,.48);
                padding:14px;
                border-radius:15px;
                display:flex;
                align-items:center;
                gap:13px;
                direction:rtl;
                text-align:right;
                cursor:pointer;
                color:#222;
                box-sizing:border-box;
            }

            .student-settings-item:hover {
                background:rgba(255,255,255,.62);
            }

            .student-settings-icon {
                width:42px;
                height:42px;
                border-radius:12px;
                background:rgba(255,255,255,.60);
                color:#444;
                display:flex;
                align-items:center;
                justify-content:center;
                flex-shrink:0;
                font-size:17px;
            }

            .student-settings-item-text {
                flex:1;
            }

            .student-settings-item-title {
                font-weight:700;
                font-size:15px;
            }

            .student-settings-item-description {
                margin-top:4px;
                font-size:12px;
                color:#666;
            }

            .student-settings-chevron {
                color:#777;
                font-size:12px;
            }

            .student-settings-card {
                background:rgba(255,255,255,.48);
                border-radius:15px;
                padding:15px;
                margin-bottom:12px;
            }

            .student-settings-label {
                display:block;
                margin-bottom:7px;
                font-size:13px;
                color:#555;
                font-weight:600;
            }

            .student-settings-input,
            .student-settings-select,
            .student-settings-textarea {
                width:100%;
                box-sizing:border-box;
                padding:13px;
                border:1px solid rgba(0,0,0,.10);
                border-radius:11px;
                outline:none;
                font-size:14px;
                background:#fff;
            }

            .student-settings-input:focus,
            .student-settings-select:focus,
            .student-settings-textarea:focus {
                border-color:#777;
            }

            .student-settings-button {
                width:100%;
                border:none;
                background:#555;
                color:#fff;
                padding:13px;
                border-radius:11px;
                cursor:pointer;
                font-size:14px;
            }

            .student-settings-button:disabled {
                opacity:.6;
                cursor:not-allowed;
            }

            .student-settings-danger {
                width:100%;
                border:none;
                background:#fff2f2;
                color:#d93025;
                padding:15px;
                border-radius:14px;
                text-align:right;
                cursor:pointer;
            }

            .student-settings-message {
                min-height:20px;
                margin-top:10px;
                text-align:center;
                font-size:13px;
                line-height:1.6;
            }

            .student-theme-button,
            .student-language-button {
                width:100%;
                border-radius:14px;
                padding:15px;
                text-align:right;
                cursor:pointer;
                font-size:14px;
                background:rgba(255,255,255,.48);
                color:#222;
            }

            .student-theme-button.active,
            .student-language-button.active {
                border:2px solid #555;
            }

            .student-theme-button:not(.active),
            .student-language-button:not(.active) {
                border:2px solid transparent;
            }


            /* =========================================
               Overlay الأصلي
            ========================================= */

            #student-settings-overlay {
                position:fixed;
                inset:0;
                z-index:9999999;
                background:rgba(0,0,0,.40);
                display:none;
                align-items:center;
                justify-content:center;
                padding:15px;
                box-sizing:border-box;
                direction:rtl;
            }

            #student-settings-overlay.show {
                display:flex;
            }

            .student-settings-window {
                width:100%;
                max-width:520px;
                max-height:92vh;
                overflow:hidden;
                background:#fff;
                border-radius:22px;
                box-shadow:0 20px 60px rgba(0,0,0,.25);
                display:flex;
                flex-direction:column;
            }

            .student-settings-header {
                flex-shrink:0;
                display:flex;
                align-items:center;
                gap:12px;
                padding:16px 18px;
                border-bottom:1px solid #eee;
                background:#fff;
            }

            .student-settings-title {
                flex:1;
                font-size:20px;
                font-weight:700;
                color:#222;
            }

            .student-settings-close,
            .student-settings-back {
                width:40px;
                height:40px;
                border:none;
                border-radius:50%;
                background:#f1f3f5;
                color:#333;
                cursor:pointer;
                display:flex;
                align-items:center;
                justify-content:center;
                font-size:16px;
                flex-shrink:0;
            }

            .student-settings-back {
                display:none;
            }

            .student-settings-body {
                flex:1;
                overflow-y:auto;
                padding:15px;
                background:#fff;
            }

            @media (max-width:480px) {

                #student-settings-overlay {
                    padding:0;
                    align-items:stretch;
                }

                .student-settings-window {
                    max-width:none;
                    max-height:none;
                    height:100%;
                    border-radius:0;
                }

                .student-settings-body {
                    padding:15px;
                }
            }

        `;

        document.head.appendChild(style);
    }


    /* =====================================================
       إنشاء Overlay الأصلي
    ===================================================== */

    function createOverlay() {

        if (settingsOverlay) {
            return;
        }

        settingsOverlay =
            document.createElement("div");

        settingsOverlay.id =
            "student-settings-overlay";

        settingsOverlay.innerHTML = `

            <div
                class="student-settings-window"
                role="dialog"
                aria-modal="true"
            >

                <div class="student-settings-header">

                    <button
                        id="student-settings-back"
                        class="student-settings-back"
                        type="button"
                        aria-label="رجوع"
                    >
                        <i class="fa-solid fa-arrow-right"></i>
                    </button>

                    <div
                        id="student-settings-title"
                        class="student-settings-title"
                    >
                        الإعدادات
                    </div>

                    <button
                        id="student-settings-close"
                        class="student-settings-close"
                        type="button"
                        aria-label="إغلاق"
                    >
                        <i class="fa-solid fa-xmark"></i>
                    </button>

                </div>

                <div
                    id="student-settings-body"
                    class="student-settings-body"
                ></div>

            </div>
        `;

        document.body.appendChild(
            settingsOverlay
        );


        document
            .getElementById(
                "student-settings-close"
            )
            .addEventListener(
                "click",
                closeSettings
            );


        document
            .getElementById(
                "student-settings-back"
            )
            .addEventListener(
                "click",
                showSettingsHome
            );
    }


    /* =====================================================
       تغيير العنوان
       يدعم القائمة الرئيسية
    ===================================================== */

    function setPageTitle(
        title,
        showBack
    ) {

        const mainMenu =
            document.getElementById(
                "student-main-menu"
            );


        const insideMainMenu =
            !!(
                mainMenu &&
                mainMenu.classList.contains(
                    "is-open"
                )
            );


        if (insideMainMenu) {

            const menuTitle =
                document.getElementById(
                    "student-menu-title"
                );


            const menuBack =
                document.getElementById(
                    "student-menu-back"
                );


            if (menuTitle) {

                menuTitle.textContent =
                    title;
            }


            if (menuBack) {

                menuBack.classList.toggle(
                    "visible",
                    showBack
                );
            }


            return;
        }


        const titleElement =
            document.getElementById(
                "student-settings-title"
            );


        const backButton =
            document.getElementById(
                "student-settings-back"
            );


        if (titleElement) {

            titleElement.textContent =
                title;
        }


        if (backButton) {

            backButton.style.display =
                showBack
                    ? "flex"
                    : "none";
        }
    }


    /* =====================================================
       فتح
    ===================================================== */

    function openSettings() {

        injectStyles();


        if (
            isInsideStudentMenu()
        ) {

            if (
                openSettingsInsideMenu()
            ) {
                return;
            }
        }


        createOverlay();

        showSettingsHome();

        settingsOverlay.classList.add(
            "show"
        );
    }


    /* =====================================================
       إغلاق
    ===================================================== */

    function closeSettings() {

        if (settingsOverlay) {

            settingsOverlay.classList.remove(
                "show"
            );
        }
    }


    /* =====================================================
       محتوى الصفحة
       يدعم القائمة الرئيسية
    ===================================================== */

    function setBody(html) {

        const mainMenu =
            document.getElementById(
                "student-main-menu"
            );


        const insideMainMenu =
            !!(
                mainMenu &&
                mainMenu.classList.contains(
                    "is-open"
                )
            );


        if (insideMainMenu) {

            const menuBody =
                document.getElementById(
                    "student-menu-content"
                );


            if (menuBody) {

                menuBody.innerHTML =
                    html;

                return;
            }
        }


        const body =
            document.getElementById(
                "student-settings-body"
            );


        if (body) {

            body.innerHTML =
                html;
        }
    }


    /* =====================================================
       الرئيسية
    ===================================================== */

    function showSettingsHome() {

        setPageTitle(
            "الإعدادات",
            false
        );


        setBody(
            buildSettingsHomeHTML()
        );


        bindSettingsHomeButtons();
    }


    function bindSettingsHomeButtons() {

        document
            .querySelectorAll(
                "[data-settings-page]"
            )
            .forEach(
                function (button) {

                    if (
                        button.dataset.settingsBound ===
                        "true"
                    ) {
                        return;
                    }


                    button.dataset.settingsBound =
                        "true";


                    button.addEventListener(
                        "click",
                        function () {

                            const page =
                                button.dataset.settingsPage;


                            switch (page) {

                                case "account":
                                    showAccountPage();
                                    break;

                                case "privacy":
                                    showPrivacyPage();
                                    break;

                                case "notifications":
                                    showNotificationsPage();
                                    break;

                                case "appearance":
                                    showAppearancePage();
                                    break;

                                case "language":
                                    showLanguagePage();
                                    break;

                                case "security":
                                    showSecurityPage();
                                    break;
                            }

                        }
                    );
                }
            );
    }


    /* =====================================================
       صفحة الحساب
    ===================================================== */

    async function showAccountPage() {

        setPageTitle(
            "الحساب",
            true
        );


        let email = "";

        const client =
            getSupabase();


        if (client) {

            try {

                const result =
                    await client.auth.getUser();

                email =
                    result?.data?.user?.email ||
                    "";

            } catch (error) {

                console.error(
                    error
                );
            }
        }


        setBody(`

            <div class="student-settings-card">

                <div class="student-settings-label">
                    البريد الإلكتروني الحالي
                </div>

                <div style="
                    direction:ltr;
                    text-align:right;
                    color:#777;
                    font-size:13px;
                ">
                    ${escapeHTML(email)}
                </div>

            </div>


            <div class="student-settings-card">

                <button
                    id="settings-change-email"
                    class="student-settings-button"
                    type="button"
                >
                    تغيير البريد الإلكتروني
                </button>

            </div>


            <div class="student-settings-card">

                <button
                    id="settings-change-password"
                    class="student-settings-button"
                    type="button"
                >
                    تغيير كلمة المرور
                </button>

            </div>
        `);


        document
            .getElementById(
                "settings-change-email"
            )
            ?.addEventListener(
                "click",
                showChangeEmailPage
            );


        document
            .getElementById(
                "settings-change-password"
            )
            ?.addEventListener(
                "click",
                showChangePasswordPage
            );
    }


    /* =====================================================
       تغيير البريد
    ===================================================== */

    function showChangeEmailPage() {

        setPageTitle(
            "تغيير البريد الإلكتروني",
            true
        );


        setBody(`

            <form
                id="settings-email-form"
            >

                <div class="student-settings-card">

                    <label
                        class="student-settings-label"
                    >
                        البريد الإلكتروني الجديد
                    </label>

                    <input
                        id="settings-new-email"
                        class="student-settings-input"
                        type="email"
                        required
                        placeholder="example@email.com"
                    />

                </div>


                <button
                    id="settings-email-save"
                    class="student-settings-button"
                    type="submit"
                >
                    حفظ
                </button>


                <div
                    id="settings-email-message"
                    class="student-settings-message"
                ></div>

            </form>
        `);


        document
            .getElementById(
                "settings-email-form"
            )
            ?.addEventListener(
                "submit",
                async function (event) {

                    event.preventDefault();

                    const client =
                        getSupabase();

                    if (!client) return;


                    const email =
                        document
                            .getElementById(
                                "settings-new-email"
                            )
                            .value
                            .trim();


                    const button =
                        document.getElementById(
                            "settings-email-save"
                        );


                    const message =
                        document.getElementById(
                            "settings-email-message"
                        );


                    button.disabled = true;

                    button.textContent =
                        "جارٍ الحفظ...";


                    try {

                        const {
                            error
                        } =
                            await client.auth.updateUser({
                                email:
                                    email
                            });


                        if (error) {
                            throw error;
                        }


                        message.style.color =
                            "#16803c";

                        message.textContent =
                            "تم إرسال طلب تأكيد البريد الإلكتروني.";

                    } catch (error) {

                        message.style.color =
                            "#d93025";

                        message.textContent =
                            error?.message ||
                            "تعذر تغيير البريد.";

                    } finally {

                        button.disabled =
                            false;

                        button.textContent =
                            "حفظ";
                    }

                }
            );
    }


    /* =====================================================
       تغيير كلمة المرور
    ===================================================== */

    function showChangePasswordPage() {

        setPageTitle(
            "تغيير كلمة المرور",
            true
        );


        setBody(`

            <form
                id="settings-password-form"
            >

                <div class="student-settings-card">

                    <label
                        class="student-settings-label"
                    >
                        كلمة المرور الجديدة
                    </label>

                    <input
                        id="settings-password"
                        class="student-settings-input"
                        type="password"
                        minlength="6"
                        required
                    />

                </div>


                <div class="student-settings-card">

                    <label
                        class="student-settings-label"
                    >
                        تأكيد كلمة المرور
                    </label>

                    <input
                        id="settings-password-confirm"
                        class="student-settings-input"
                        type="password"
                        minlength="6"
                        required
                    />

                </div>


                <button
                    id="settings-password-save"
                    class="student-settings-button"
                    type="submit"
                >
                    تحديث كلمة المرور
                </button>


                <div
                    id="settings-password-message"
                    class="student-settings-message"
                ></div>

            </form>
        `);


        document
            .getElementById(
                "settings-password-form"
            )
            ?.addEventListener(
                "submit",
                async function (event) {

                    event.preventDefault();

                    const client =
                        getSupabase();

                    if (!client) return;


                    const password =
                        document.getElementById(
                            "settings-password"
                        ).value;


                    const confirm =
                        document.getElementById(
                            "settings-password-confirm"
                        ).value;


                    const button =
                        document.getElementById(
                            "settings-password-save"
                        );


                    const message =
                        document.getElementById(
                            "settings-password-message"
                        );


                    if (
                        password.length < 6
                    ) {

                        message.style.color =
                            "#d93025";

                        message.textContent =
                            "كلمة المرور يجب أن تكون 6 أحرف على الأقل.";

                        return;
                    }


                    if (
                        password !==
                        confirm
                    ) {

                        message.style.color =
                            "#d93025";

                        message.textContent =
                            "كلمتا المرور غير متطابقتين.";

                        return;
                    }


                    button.disabled = true;

                    button.textContent =
                        "جارٍ التحديث...";


                    try {

                        const {
                            error
                        } =
                            await client.auth.updateUser({
                                password:
                                    password
                            });


                        if (error) {
                            throw error;
                        }


                        message.style.color =
                            "#16803c";

                        message.textContent =
                            "تم تحديث كلمة المرور بنجاح.";

                    } catch (error) {

                        message.style.color =
                            "#d93025";

                        message.textContent =
                            error?.message ||
                            "تعذر تحديث كلمة المرور.";

                    } finally {

                        button.disabled =
                            false;

                        button.textContent =
                            "تحديث كلمة المرور";
                    }

                }
            );
    }


    /* =====================================================
       الخصوصية
    ===================================================== */

    function showPrivacyPage() {

        let status =
            "public";


        if (
            typeof currentProfile !==
            "undefined" &&
            currentProfile
        ) {

            status =
                currentProfile.account_status ||
                "public";
        }


        setPageTitle(
            "الخصوصية",
            true
        );


        setBody(`

            <div class="student-settings-card">

                <label
                    class="student-settings-label"
                >
                    خصوصية الحساب
                </label>

                <select
                    id="settings-account-status"
                    class="student-settings-select"
                >

                    <option
                        value="public"
                        ${
                            status ===
                            "public"
                                ? "selected"
                                : ""
                        }
                    >
                        حساب عام
                    </option>

                    <option
                        value="private"
                        ${
                            status ===
                            "private"
                                ? "selected"
                                : ""
                        }
                    >
                        حساب خاص
                    </option>

                </select>

            </div>


            <button
                id="settings-privacy-save"
                class="student-settings-button"
                type="button"
            >
                حفظ
            </button>


            <div
                id="settings-privacy-message"
                class="student-settings-message"
            ></div>
        `);


        document
            .getElementById(
                "settings-privacy-save"
            )
            ?.addEventListener(
                "click",
                async function () {

                    const client =
                        getSupabase();

                    if (!client) return;


                    const newStatus =
                        document.getElementById(
                            "settings-account-status"
                        ).value;


                    const message =
                        document.getElementById(
                            "settings-privacy-message"
                        );


                    try {

                        const {
                            data,
                            error
                        } =
                            await client.rpc(
                                "set_account_status",
                                {
                                    p_status:
                                        newStatus
                                }
                            );


                        if (error) {
                            throw error;
                        }


                        if (
                            data !== "public" &&
                            data !== "private"
                        ) {

                            throw new Error(
                                "تعذر تحديث الخصوصية."
                            );
                        }


                        if (
                            typeof loadProfile ===
                            "function" &&
                            currentUser
                        ) {

                            await loadProfile(
                                currentUser.id
                            );
                        }


                        message.style.color =
                            "#16803c";

                        message.textContent =
                            "تم حفظ إعدادات الخصوصية.";

                    } catch (error) {

                        message.style.color =
                            "#d93025";

                        message.textContent =
                            error?.message ||
                            "تعذر حفظ الخصوصية.";
                    }
                }
            );
    }


    /* =====================================================
       الإشعارات
    ===================================================== */

    function showNotificationsPage() {

        const stored =
            localStorage.getItem(
                "student_notifications_enabled"
            );


        const enabled =
            stored !== "false";


        setPageTitle(
            "الإشعارات",
            true
        );


        setBody(`

            <div class="student-settings-card">

                <div style="
                    display:flex;
                    align-items:center;
                    justify-content:space-between;
                    gap:10px;
                ">

                    <div>

                        <div style="
                            font-weight:700;
                        ">
                            إشعارات التطبيق
                        </div>

                        <div style="
                            margin-top:4px;
                            color:#888;
                            font-size:12px;
                        ">
                            تشغيل أو إيقاف تنبيهات التطبيق
                        </div>

                    </div>


                    <label style="
                        position:relative;
                        width:50px;
                        height:28px;
                        flex-shrink:0;
                    ">

                        <input
                            id="settings-notification-toggle"
                            type="checkbox"
                            ${
                                enabled
                                    ? "checked"
                                    : ""
                            }
                            style="
                                display:none;
                            "
                        >

                        <span
                            id="settings-notification-switch"
                            style="
                                position:absolute;
                                inset:0;
                                border-radius:30px;
                                background:${
                                    enabled
                                        ? "#555"
                                        : "#aaa"
                                };
                                cursor:pointer;
                            "
                        ></span>

                    </label>

                </div>

            </div>


            <div
                id="settings-notification-message"
                class="student-settings-message"
            ></div>
        `);


        const toggle =
            document.getElementById(
                "settings-notification-toggle"
            );


        const switchElement =
            document.getElementById(
                "settings-notification-switch"
            );


        const message =
            document.getElementById(
                "settings-notification-message"
            );


        toggle?.addEventListener(
            "change",
            function () {

                const value =
                    toggle.checked;


                localStorage.setItem(
                    "student_notifications_enabled",
                    String(value)
                );


                switchElement.style.background =
                    value
                        ? "#555"
                        : "#aaa";


                message.style.color =
                    "#16803c";

                message.textContent =
                    value
                        ? "تم تفعيل الإشعارات."
                        : "تم إيقاف الإشعارات.";
            }
        );
    }


    /* =====================================================
       المظهر
    ===================================================== */

    function applyTheme(theme) {

        if (
            theme !== "light" &&
            theme !== "dark" &&
            theme !== "system"
        ) {

            theme =
                "light";
        }


        localStorage.setItem(
            "student_theme",
            theme
        );


        document.documentElement
            .setAttribute(
                "data-student-theme",
                theme
            );


        if (
            theme ===
            "dark"
        ) {

            document.documentElement
                .style
                .colorScheme =
                "dark";

        } else if (
            theme ===
            "light"
        ) {

            document.documentElement
                .style
                .colorScheme =
                "light";

        } else {

            document.documentElement
                .style
                .colorScheme =
                "normal";
        }
    }


    function showAppearancePage() {

        const current =
            localStorage.getItem(
                "student_theme"
            ) ||
            "light";


        setPageTitle(
            "المظهر",
            true
        );


        setBody(`

            <div class="student-settings-list">

                <button
                    class="student-theme-button ${
                        current === "light"
                            ? "active"
                            : ""
                    }"
                    data-theme="light"
                >
                    ☀️ الوضع الفاتح
                </button>


                <button
                    class="student-theme-button ${
                        current === "dark"
                            ? "active"
                            : ""
                    }"
                    data-theme="dark"
                    style="
                        background:#222;
                        color:#fff;
                    "
                >
                    🌙 الوضع الداكن
                </button>


                <button
                    class="student-theme-button ${
                        current === "system"
                            ? "active"
                            : ""
                    }"
                    data-theme="system"
                >
                    📱 حسب الجهاز
                </button>

            </div>


            <div
                id="settings-theme-message"
                class="student-settings-message"
            ></div>
        `);


        document
            .querySelectorAll(
                "[data-theme]"
            )
            .forEach(
                function (button) {

                    button.addEventListener(
                        "click",
                        function () {

                            const theme =
                                button.dataset.theme;


                            applyTheme(
                                theme
                            );


                            document
                                .querySelectorAll(
                                    "[data-theme]"
                                )
                                .forEach(
                                    function (
                                        item
                                    ) {

                                        item.classList.toggle(
                                            "active",
                                            item.dataset.theme ===
                                            theme
                                        );
                                    }
                                );


                            const message =
                                document.getElementById(
                                    "settings-theme-message"
                                );


                            if (message) {

                                message.textContent =
                                    "تم حفظ المظهر.";
                            }
                        }
                    );
                }
            );
    }


    /* =====================================================
       اللغة
    ===================================================== */

    function showLanguagePage() {

        const current =
            localStorage.getItem(
                "student_language"
            ) ||
            "ar";


        setPageTitle(
            "اللغة",
            true
        );


        setBody(`

            <div class="student-settings-list">

                <button
                    class="student-language-button ${
                        current === "ar"
                            ? "active"
                            : ""
                    }"
                    data-language="ar"
                >
                    🇮🇶 العربية
                </button>


                <button
                    class="student-language-button ${
                        current === "en"
                            ? "active"
                            : ""
                    }"
                    data-language="en"
                >
                    🇬🇧 English
                </button>

            </div>


            <div
                id="settings-language-message"
                class="student-settings-message"
            ></div>
        `);


        document
            .querySelectorAll(
                "[data-language]"
            )
            .forEach(
                function (button) {

                    button.addEventListener(
                        "click",
                        function () {

                            const language =
                                button.dataset.language;


                            localStorage.setItem(
                                "student_language",
                                language
                            );


                            document.documentElement
                                .lang =
                                language;


                            document.documentElement
                                .dir =
                                language ===
                                "en"
                                    ? "ltr"
                                    : "rtl";


                            document
                                .querySelectorAll(
                                    "[data-language]"
                                )
                                .forEach(
                                    function (
                                        item
                                    ) {

                                        item.classList.toggle(
                                            "active",
                                            item.dataset.language ===
                                            language
                                        );
                                    }
                                );


                            const message =
                                document.getElementById(
                                    "settings-language-message"
                                );


                            if (message) {

                                message.textContent =
                                    language ===
                                    "ar"
                                        ? "تم اختيار العربية."
                                        : "English selected. Full translation will be added later.";
                            }

                        }
                    );
                }
            );
    }


    /* =====================================================
       الأمان
    ===================================================== */

    function showSecurityPage() {

        setPageTitle(
            "الأمان",
            true
        );


        setBody(`

            <div class="student-settings-list">

                <button
                    id="signout-others"
                    class="student-settings-item"
                    type="button"
                >

                    <div class="student-settings-icon">

                        <i
                            class="
                                fa-solid
                                fa-mobile-screen-button
                            "
                        ></i>

                    </div>

                    <div class="student-settings-item-text">

                        <div class="student-settings-item-title">
                            تسجيل الخروج من الأجهزة الأخرى
                        </div>

                        <div class="student-settings-item-description">
                            يبقى هذا الجهاز متصلًا
                        </div>

                    </div>

                </button>


                <button
                    id="signout-all"
                    class="student-settings-danger"
                    type="button"
                >
                    تسجيل الخروج من جميع الأجهزة
                </button>

            </div>


            <div
                id="settings-security-message"
                class="student-settings-message"
            ></div>
        `);


        document
            .getElementById(
                "signout-others"
            )
            ?.addEventListener(
                "click",
                async function () {

                    const client =
                        getSupabase();


                    const message =
                        document.getElementById(
                            "settings-security-message"
                        );


                    try {

                        const {
                            error
                        } =
                            await client.auth.signOut({
                                scope:
                                    "others"
                            });


                        if (error) {
                            throw error;
                        }


                        message.style.color =
                            "#16803c";


                        message.textContent =
                            "تم تسجيل الخروج من الأجهزة الأخرى.";


                    } catch (error) {

                        message.style.color =
                            "#d93025";


                        message.textContent =
                            error?.message ||
                            "تعذر تنفيذ العملية.";
                    }

                }
            );


        document
            .getElementById(
                "signout-all"
            )
            ?.addEventListener(
                "click",
                async function () {

                    const confirmed =
                        window.confirm(
                            "هل أنت متأكد أنك تريد تسجيل الخروج من جميع الأجهزة؟"
                        );


                    if (!confirmed) {
                        return;
                    }


                    const client =
                        getSupabase();


                    if (!client) {
                        return;
                    }


                    try {

                        const {
                            error
                        } =
                            await client.auth.signOut();


                        if (error) {
                            throw error;
                        }


                    } catch (error) {

                        const message =
                            document.getElementById(
                                "settings-security-message"
                            );


                        message.style.color =
                            "#d93025";


                        message.textContent =
                            error?.message ||
                            "تعذر تسجيل الخروج.";
                    }
                }
            );
    }


    /* =====================================================
       تحميل التفضيلات
    ===================================================== */

    function loadPreferences() {

        const theme =
            localStorage.getItem(
                "student_theme"
            ) ||
            "light";


        applyTheme(
            theme
        );


        const language =
            localStorage.getItem(
                "student_language"
            ) ||
            "ar";


        document.documentElement
            .lang =
            language;


        document.documentElement
            .dir =
            language ===
            "en"
                ? "ltr"
                : "rtl";
    }


    /* =====================================================
       API عامة
    ===================================================== */

    window.showSettingsPanel =
        openSettings;


    window.openStudentSettings =
        openSettings;


    window.closeStudentSettings =
        closeSettings;


    window.applyStudentTheme =
        applyTheme;


    /* =====================================================
       تشغيل
    ===================================================== */

    injectStyles();

    loadPreferences();

})();


/* =========================================================
   Student - Saved System
   نظام المحفوظات
========================================================= */

(function () {
    "use strict";

    if (window.__studentSavedLoaded) return;
    window.__studentSavedLoaded = true;


    /* =====================================================
       الاتصال
    ===================================================== */

    function getSupabase() {

        if (
            typeof supabaseClient !== "undefined" &&
            supabaseClient
        ) {
            return supabaseClient;
        }

        return null;
    }


    /* =====================================================
       أدوات
    ===================================================== */

    function escapeHTML(value) {

        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    /* =====================================================
       إنشاء واجهة مستقلة
       السلوك الأصلي خارج القائمة يبقى كما هو
    ===================================================== */

    let overlay = null;


    function injectStyles() {

        if (
            document.getElementById(
                "student-saved-style"
            )
        ) {
            return;
        }

        const style =
            document.createElement("style");

        style.id =
            "student-saved-style";

        style.textContent = `

            #student-saved-overlay {
                position:fixed;
                inset:0;
                z-index:9999998;
                background:rgba(0,0,0,.4);
                display:none;
                align-items:center;
                justify-content:center;
                padding:15px;
                box-sizing:border-box;
                direction:rtl;
            }

            #student-saved-overlay.show {
                display:flex;
            }

            .student-saved-window {
                width:100%;
                max-width:560px;
                max-height:92vh;
                overflow:hidden;
                background:#fff;
                border-radius:22px;
                box-shadow:0 20px 60px rgba(0,0,0,.25);
                display:flex;
                flex-direction:column;
            }

            .student-saved-header {
                flex-shrink:0;
                display:flex;
                align-items:center;
                gap:12px;
                padding:16px 18px;
                border-bottom:1px solid #eee;
                background:#fff;
            }

            .student-saved-title {
                flex:1;
                font-size:20px;
                font-weight:700;
                color:#222;
            }

            .student-saved-close {
                width:40px;
                height:40px;
                border:none;
                border-radius:50%;
                background:#f1f3f5;
                color:#333;
                cursor:pointer;
                font-size:17px;
            }

            .student-saved-body {
                overflow-y:auto;
                padding:15px;
            }

            .student-saved-filter {
                display:flex;
                gap:8px;
                overflow-x:auto;
                padding-bottom:10px;
                margin-bottom:5px;
            }

            .student-saved-filter button {
                flex-shrink:0;
                border:none;
                background:#f2f5f8;
                color:#555;
                padding:9px 14px;
                border-radius:20px;
                cursor:pointer;
                font-size:12px;
            }

            .student-saved-filter button.active {
                background:#0095f6;
                color:#fff;
            }

            .student-saved-item {
                display:flex;
                align-items:center;
                gap:12px;
                padding:14px;
                background:#f7f8fa;
                border-radius:15px;
                margin-bottom:10px;
            }

            .student-saved-icon {
                width:44px;
                height:44px;
                border-radius:13px;
                background:#eaf5ff;
                color:#0095f6;
                display:flex;
                align-items:center;
                justify-content:center;
                flex-shrink:0;
                font-size:17px;
            }

            .student-saved-info {
                flex:1;
                min-width:0;
            }

            .student-saved-type {
                font-size:12px;
                color:#0095f6;
                font-weight:700;
            }

            .student-saved-id {
                margin-top:4px;
                font-size:13px;
                color:#555;
                direction:ltr;
                text-align:right;
                overflow:hidden;
                text-overflow:ellipsis;
                white-space:nowrap;
            }

            .student-saved-date {
                margin-top:4px;
                font-size:11px;
                color:#999;
            }

            .student-saved-delete {
                width:38px;
                height:38px;
                border:none;
                border-radius:50%;
                background:#fff2f2;
                color:#d93025;
                cursor:pointer;
                flex-shrink:0;
            }

            .student-saved-empty {
                text-align:center;
                padding:50px 15px;
                color:#888;
            }

            .student-saved-empty-icon {
                width:75px;
                height:75px;
                margin:0 auto 15px;
                border-radius:22px;
                background:#eaf5ff;
                color:#0095f6;
                display:flex;
                align-items:center;
                justify-content:center;
                font-size:30px;
            }

            /* =========================================
               تنسيق المحفوظات داخل القائمة الرئيسية
            ========================================= */

            .student-saved-menu-container {
                color:#222;
            }

            .student-saved-menu-container
            .student-saved-filter {
                margin-top:0;
            }

            .student-saved-menu-container
            .student-saved-item {
                background:rgba(255,255,255,.72);
                border:1px solid rgba(255,255,255,.35);
            }

            .student-saved-menu-container
            .student-saved-icon {
                background:rgba(255,255,255,.75);
                color:#07518e;
            }

            .student-saved-menu-container
            .student-saved-type {
                color:#07518e;
            }

            .student-saved-menu-container
            .student-saved-empty-icon {
                background:rgba(255,255,255,.75);
                color:#07518e;
            }

            @media (max-width:480px) {

                #student-saved-overlay {
                    padding:0;
                    align-items:stretch;
                }

                .student-saved-window {
                    max-width:none;
                    max-height:none;
                    height:100%;
                    border-radius:0;
                }
            }

        `;

        document.head.appendChild(style);
    }


    /* =====================================================
       إنشاء النافذة الأصلية
    ===================================================== */

    function createOverlay() {

        if (overlay) {
            return;
        }

        overlay =
            document.createElement("div");

        overlay.id =
            "student-saved-overlay";

        overlay.innerHTML = `

            <div class="student-saved-window">

                <div class="student-saved-header">

                    <div class="student-saved-title">
                        المحفوظات
                    </div>

                    <button
                        id="student-saved-close"
                        class="student-saved-close"
                        type="button"
                        aria-label="إغلاق"
                    >
                        <i class="fa-solid fa-xmark"></i>
                    </button>

                </div>

                <div
                    id="student-saved-body"
                    class="student-saved-body"
                ></div>

            </div>
        `;

        document.body.appendChild(
            overlay
        );


        document
            .getElementById(
                "student-saved-close"
            )
            ?.addEventListener(
                "click",
                closeSaved
            );

        /* لا نغلق بالضغط على الخلفية */
    }


    /* =====================================================
       هل نحن داخل القائمة الرئيسية؟
    ===================================================== */

    function isInsideStudentMenu() {

        const menu =
            document.getElementById(
                "student-main-menu"
            );

        return !!(
            menu &&
            menu.classList.contains(
                "is-open"
            )
        );
    }


    /* =====================================================
       فتح داخل القائمة الرئيسية
    ===================================================== */

    function openSavedInsideMenu() {

        if (
            typeof window.StudentMenuOpenView !==
            "function"
        ) {
            return false;
        }


        const menuHTML = `

            <div
                id="student-saved-menu-container"
                class="student-saved-menu-container"
            >

                <div
                    id="student-saved-menu-body"
                >
                    <div style="
                        text-align:center;
                        padding:30px;
                        color:#555;
                    ">
                        جاري تحميل المحفوظات...
                    </div>
                </div>

            </div>
        `;


        window.StudentMenuOpenView(
            "المحفوظات",
            menuHTML,
            function () {

                const body =
                    document.getElementById(
                        "student-saved-menu-body"
                    );


                if (body) {

                    renderSaved(
                        "all",
                        body
                    );
                }

            }
        );


        return true;
    }


    /* =====================================================
       فتح
    ===================================================== */

    async function openSaved() {

        injectStyles();


        /*
           إذا كانت القائمة الرئيسية مفتوحة،
           نستخدمها بدل النافذة العائمة.
        */

        if (
            isInsideStudentMenu()
        ) {

            if (
                openSavedInsideMenu()
            ) {
                return;
            }
        }


        /*
           السلوك الأصلي
        */

        createOverlay();

        overlay.classList.add(
            "show"
        );

        await renderSaved(
            "all"
        );
    }


    /* =====================================================
       إغلاق
    ===================================================== */

    function closeSaved() {

        if (overlay) {

            overlay.classList.remove(
                "show"
            );
        }
    }


    /* =====================================================
       تحميل المحفوظات
    ===================================================== */

    async function loadSavedItems(
        contentType = "all"
    ) {

        const client =
            getSupabase();

        if (!client) {
            return {
                data: [],
                error: new Error(
                    "Supabase غير متاح."
                )
            };
        }


        let query =
            client
                .from("saved_items")
                .select(
                    "id, content_type, content_id, created_at"
                )
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );


        if (
            contentType !== "all"
        ) {

            query =
                query.eq(
                    "content_type",
                    contentType
                );
        }


        return await query;
    }


    /* =====================================================
       أسماء الأنواع
    ===================================================== */

    function getTypeLabel(
        type
    ) {

        const labels = {

            post: "منشور",

            story: "Story",

            lesson: "درس",

            file: "ملف",

            video: "فيديو"
        };


        return (
            labels[type] ||
            type ||
            "محتوى"
        );
    }


    /* =====================================================
       أيقونات
    ===================================================== */

    function getTypeIcon(
        type
    ) {

        const icons = {

            post:
                "fa-regular fa-image",

            story:
                "fa-regular fa-circle-play",

            lesson:
                "fa-solid fa-book-open",

            file:
                "fa-regular fa-file",

            video:
                "fa-solid fa-video"
        };


        return (
            icons[type] ||
            "fa-regular fa-bookmark"
        );
    }


    /* =====================================================
       التاريخ
    ===================================================== */

    function formatDate(
        value
    ) {

        if (!value) {
            return "";
        }


        const date =
            new Date(value);


        if (
            isNaN(
                date.getTime()
            )
        ) {
            return "";
        }


        return date.toLocaleString(
            "ar-IQ",
            {
                dateStyle:
                    "medium",
                timeStyle:
                    "short"
            }
        );
    }


    /* =====================================================
       العرض
       targetBody اختياري:
       - بدون target = النظام الأصلي
       - مع target = داخل القائمة
    ===================================================== */

    async function renderSaved(
        filter = "all",
        targetBody = null
    ) {

        const body =
            targetBody ||
            document.getElementById(
                "student-saved-body"
            );


        if (!body) {
            return;
        }


        body.innerHTML = `

            <div style="
                text-align:center;
                padding:30px;
                color:#666;
            ">
                جاري تحميل المحفوظات...
            </div>
        `;


        const result =
            await loadSavedItems(
                filter
            );


        if (result.error) {

            console.error(
                "Saved items error:",
                result.error
            );


            body.innerHTML = `

                <div class="student-saved-empty">

                    <div class="student-saved-empty-icon">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                    </div>

                    <div>
                        تعذر تحميل المحفوظات.
                    </div>

                </div>
            `;

            return;
        }


        const items =
            result.data || [];


        const filterHTML = `

            <div class="student-saved-filter">

                <button
                    data-saved-filter="all"
                    class="${
                        filter === "all"
                            ? "active"
                            : ""
                    }"
                >
                    الكل
                </button>

                <button
                    data-saved-filter="post"
                    class="${
                        filter === "post"
                            ? "active"
                            : ""
                    }"
                >
                    المنشورات
                </button>

                <button
                    data-saved-filter="story"
                    class="${
                        filter === "story"
                            ? "active"
                            : ""
                    }"
                >
                    Stories
                </button>

                <button
                    data-saved-filter="lesson"
                    class="${
                        filter === "lesson"
                            ? "active"
                            : ""
                    }"
                >
                    الدروس
                </button>

                <button
                    data-saved-filter="file"
                    class="${
                        filter === "file"
                            ? "active"
                            : ""
                    }"
                >
                    الملفات
                </button>

            </div>
        `;


        if (!items.length) {

            body.innerHTML =
                filterHTML +
                `

                <div class="student-saved-empty">

                    <div class="student-saved-empty-icon">
                        <i class="fa-regular fa-bookmark"></i>
                    </div>

                    <div style="
                        font-weight:700;
                        color:#555;
                        margin-bottom:7px;
                    ">
                        لا توجد محفوظات
                    </div>

                    <div style="
                        font-size:13px;
                        line-height:1.8;
                    ">
                        عندما تحفظ محتوى سيظهر هنا.
                    </div>

                </div>
            `;

        } else {

            body.innerHTML =
                filterHTML +
                items.map(
                    function (item) {

                        return `
                            <div
                                class="student-saved-item"
                                data-saved-id="${item.id}"
                            >

                                <div class="student-saved-icon">
                                    <i class="${getTypeIcon(
                                        item.content_type
                                    )}"></i>
                                </div>


                                <div class="student-saved-info">

                                    <div class="student-saved-type">
                                        ${escapeHTML(
                                            getTypeLabel(
                                                item.content_type
                                            )
                                        )}
                                    </div>

                                    <div class="student-saved-id">
                                        ${escapeHTML(
                                            item.content_id
                                        )}
                                    </div>

                                    <div class="student-saved-date">
                                        ${escapeHTML(
                                            formatDate(
                                                item.created_at
                                            )
                                        )}
                                    </div>

                                </div>


                                <button
                                    type="button"
                                    class="student-saved-delete"
                                    data-delete-saved="${item.id}"
                                    title="إلغاء الحفظ"
                                >
                                    <i class="fa-solid fa-trash"></i>
                                </button>

                            </div>
                        `;

                    }
                ).join("");
        }


        /* =================================================
           الفلاتر
        ================================================= */

        body
            .querySelectorAll(
                "[data-saved-filter]"
            )
            .forEach(
                function (button) {

                    button.addEventListener(
                        "click",
                        async function () {

                            await renderSaved(
                                button.dataset
                                    .savedFilter,
                                body
                            );

                        }
                    );
                }
            );


        /* =================================================
           حذف
        ================================================= */

        body
            .querySelectorAll(
                "[data-delete-saved]"
            )
            .forEach(
                function (button) {

                    button.addEventListener(
                        "click",
                        async function () {

                            await deleteSavedItem(
                                button.dataset
                                    .deleteSaved,
                                filter,
                                body
                            );

                        }
                    );
                }
            );
    }


    /* =====================================================
       حذف محفوظ
    ===================================================== */

    async function deleteSavedItem(
        id,
        currentFilter,
        targetBody = null
    ) {

        const client =
            getSupabase();

        if (!client) {
            return;
        }


        const confirmed =
            window.confirm(
                "هل تريد إزالة هذا العنصر من المحفوظات؟"
            );


        if (!confirmed) {
            return;
        }


        const {
            error
        } =
            await client
                .from("saved_items")
                .delete()
                .eq(
                    "id",
                    id
                );


        if (error) {

            console.error(
                "Delete saved error:",
                error
            );

            return;
        }


        await renderSaved(
            currentFilter,
            targetBody
        );
    }


    /* =====================================================
       حفظ عنصر
       contentType:
       post / story / lesson / file / video
    ===================================================== */

    async function saveItem(
        contentType,
        contentId
    ) {

        const client =
            getSupabase();


        if (
            !client ||
            !contentType ||
            !contentId
        ) {

            return {
                success: false,
                error:
                    "بيانات الحفظ غير مكتملة."
            };
        }


        try {

            const {
                data: {
                    user
                }
            } =
                await client.auth.getUser();


            if (!user) {

                return {
                    success: false,
                    error:
                        "يجب تسجيل الدخول أولًا."
                };
            }


            const {
                error
            } =
                await client
                    .from("saved_items")
                    .insert({
                        user_id:
                            user.id,

                        content_type:
                            contentType,

                        content_id:
                            String(
                                contentId
                            )
                    });


            if (error) {

                if (
                    error.code ===
                    "23505"
                ) {

                    return {
                        success: true,
                        alreadySaved: true
                    };
                }


                throw error;
            }


            return {
                success: true,
                alreadySaved: false
            };

        } catch (error) {

            console.error(
                "Save item error:",
                error
            );

            return {
                success: false,
                error:
                    error?.message ||
                    "تعذر حفظ العنصر."
            };
        }
    }


    /* =====================================================
       إلغاء حفظ عنصر
    ===================================================== */

    async function unsaveItem(
        contentType,
        contentId
    ) {

        const client =
            getSupabase();


        if (
            !client ||
            !contentType ||
            !contentId
        ) {

            return {
                success: false
            };
        }


        try {

            const {
                data: {
                    user
                }
            } =
                await client.auth.getUser();


            if (!user) {

                return {
                    success: false
                };
            }


            const {
                error
            } =
                await client
                    .from("saved_items")
                    .delete()
                    .eq(
                        "user_id",
                        user.id
                    )
                    .eq(
                        "content_type",
                        contentType
                    )
                    .eq(
                        "content_id",
                        String(
                            contentId
                        )
                    );


            if (error) {
                throw error;
            }


            return {
                success: true
            };

        } catch (error) {

            console.error(
                "Unsave error:",
                error
            );

            return {
                success: false,
                error:
                    error?.message
            };
        }
    }


    /* =====================================================
       التحقق من الحفظ
    ===================================================== */

    async function isSaved(
        contentType,
        contentId
    ) {

        const client =
            getSupabase();


        if (
            !client ||
            !contentType ||
            !contentId
        ) {
            return false;
        }


        try {

            const {
                data: {
                    user
                }
            } =
                await client.auth.getUser();


            if (!user) {
                return false;
            }


            const {
                data,
                error
            } =
                await client
                    .from("saved_items")
                    .select("id")
                    .eq(
                        "user_id",
                        user.id
                    )
                    .eq(
                        "content_type",
                        contentType
                    )
                    .eq(
                        "content_id",
                        String(
                            contentId
                        )
                    )
                    .maybeSingle();


            if (error) {
                return false;
            }


            return !!data;

        } catch (error) {

            console.error(
                "Is saved error:",
                error
            );

            return false;
        }
    }


    /* =====================================================
       دوال عامة
    ===================================================== */

    window.openStudentSaved =
        openSaved;

    window.closeStudentSaved =
        closeSaved;

    window.saveStudentItem =
        saveItem;

    window.unsaveStudentItem =
        unsaveItem;

    window.isStudentItemSaved =
        isSaved;


})();

