/* =========================================================
   Student - Menu System
   ☰ القائمة الرئيسية
========================================================= */

(function () {

    "use strict";

    if (window.__studentMenuLoaded) {
        return;
    }

    window.__studentMenuLoaded = true;

    let featureCache = {};


    /* =====================================================
       تحميل ميزات القائمة
    ===================================================== */

    async function loadMenuFeatures() {

        if (
            typeof supabaseClient === "undefined" ||
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
                    .from("feature_flags")
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
                        feature.enabled === true;

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
                            releaseDate > new Date()
                        ) {

                            enabled = false;
                        }
                    }

                    featureCache[
                        feature.feature_key
                    ] = enabled;
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
            featureCache[featureKey] === true
        );
    }


    /* =====================================================
       تنظيف الكاش
    ===================================================== */

    function clearMenuFeatureCache() {

        featureCache = {};
    }


    /* =====================================================
       تحميل saved.js عند الحاجة
    ===================================================== */

    async function ensureSavedSystem() {

        if (
            typeof window.openStudentSaved ===
            "function"
        ) {
            return true;
        }

        if (
            document.querySelector(
                'script[data-student-saved="true"]'
            )
        ) {

            return new Promise(
                function (resolve) {

                    let attempts = 0;

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

                                    resolve(true);
                                    return;
                                }

                                if (
                                    attempts >= 30
                                ) {

                                    clearInterval(
                                        timer
                                    );

                                    resolve(false);
                                }

                            },
                            100
                        );
                }
            );
        }

        return new Promise(
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

                        resolve(false);
                    };


                document.body.appendChild(
                    script
                );

            }
        );
    }


    /* =====================================================
       تواصل معنا
    ===================================================== */

    function openContact() {

        const whatsappURL =
            "https://wa.me/message/TSDV5JBPE2KSP1";


        if (
            typeof window.showFloatingPanel !==
            "function"
        ) {
            return;
        }


        window.showFloatingPanel(
            "تواصل معنا",
            `
            <div style="
                text-align:center;
                padding:20px 10px;
            ">

                <div style="
                    width:70px;
                    height:70px;
                    margin:0 auto 15px;
                    border-radius:20px;
                    background:#eafff0;
                    color:#25D366;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    font-size:30px;
                ">
                    <i class="fa-brands fa-whatsapp"></i>
                </div>

                <h3 style="
                    margin:0 0 10px;
                    color:#222;
                ">
                    تواصل معنا
                </h3>

                <p style="
                    margin:0 0 20px;
                    color:#777;
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


        document
            .getElementById(
                "student-contact-whatsapp"
            )
            ?.addEventListener(
                "click",
                function () {

                    window.open(
                        whatsappURL,
                        "_blank",
                        "noopener,noreferrer"
                    );

                }
            );
    }


    /* =====================================================
       حول Student
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
            ">

                <div style="
                    width:82px;
                    height:82px;
                    margin:0 auto 15px;
                    border-radius:22px;
                    background:#eaf5ff;
                    color:#0095f6;
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
                    color:#222;
                ">
                    Student
                </h2>

                <div style="
                    color:#888;
                    font-size:13px;
                    margin-bottom:18px;
                ">
                    الإصدار 1.0.0
                </div>

                <div style="
                    background:#f7f8fa;
                    border-radius:14px;
                    padding:15px;
                    text-align:right;
                    color:#666;
                    line-height:1.9;
                ">
                    تطبيق عراقي صُمم لتطوير الطلاب
                    وتوفير بيئة تعليمية واجتماعية
                    متكاملة.
                </div>

                <div style="
                    margin-top:15px;
                    color:#999;
                    font-size:12px;
                ">
                    جميع الحقوق محفوظة لـ Student
                </div>

            </div>
            `
        );
    }


    /* =====================================================
       تأكيد تسجيل الخروج
    ===================================================== */

    function confirmLogout() {

        let existing =
            document.getElementById(
                "student-menu-confirm"
            );

        if (existing) {
            existing.remove();
        }


        const overlay =
            document.createElement(
                "div"
            );


        overlay.id =
            "student-menu-confirm";


        overlay.style.cssText = `
            position:fixed;
            inset:0;
            z-index:100002000;
            display:flex;
            align-items:center;
            justify-content:center;
            padding:20px;
            background:rgba(0,0,0,.5);
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
                        id="student-menu-logout-cancel"
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
                        id="student-menu-logout-confirm"
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
                "#student-menu-logout-cancel"
            )
            ?.addEventListener(
                "click",
                function () {

                    overlay.remove();

                }
            );


        overlay
            .querySelector(
                "#student-menu-logout-confirm"
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

                    } finally {

                        overlay.remove();
                    }

                }
            );
    }


    /* =====================================================
       بناء عناصر القائمة
    ===================================================== */

    function buildMenuItems() {

        const items = [];


        if (
            isFeatureEnabled("profile")
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
                        }

                    }

            });

        }


        if (
            isFeatureEnabled("settings")
        ) {

            items.push({

                id:
                    "menu-settings",

                icon:
                    "fa-solid fa-gear",

                text:
                    "الإعدادات",

                action:
                    function () {

                        if (
                            typeof window.showSettingsPanel ===
                            "function"
                        ) {

                            window.showSettingsPanel();
                        }

                    }

            });

        }


        if (
            isFeatureEnabled("notifications")
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
                        }

                    }

            });

        }


        if (
            isFeatureEnabled("saved")
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

                            console.error(
                                "Saved system is not available."
                            );

                            return;
                        }

                        window.openStudentSaved();

                    }

            });

        }


        if (
            isFeatureEnabled("contact_us")
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
            isFeatureEnabled("about")
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
       CSS للقائمة الجانبية
    ===================================================== */

    function injectMenuStyles() {

        if (
            document.getElementById(
                "student-main-menu-style"
            )
        ) {
            return;
        }


        const style =
            document.createElement(
                "style"
            );


        style.id =
            "student-main-menu-style";


        style.textContent = `

            #student-main-menu {
                position:fixed;
                inset:0;
                z-index:100001900;
                display:none;
                direction:rtl;
            }

            #student-main-menu.open {
                display:block;
            }

            #student-main-menu-backdrop {
                position:absolute;
                inset:0;
                background:rgba(0,0,0,.38);
                opacity:0;
                transition:opacity .18s ease;
            }

            #student-main-menu.open
            #student-main-menu-backdrop {
                opacity:1;
            }

            #student-main-menu-sheet {
                position:absolute;
                top:0;
                right:0;
                bottom:0;
                width:min(88vw,380px);
                background:#fff;
                box-shadow:
                    -12px 0 40px
                    rgba(0,0,0,.16);
                transform:translateX(100%);
                transition:
                    transform .20s
                    cubic-bezier(.22,.8,.25,1);
                display:flex;
                flex-direction:column;
                overflow:hidden;
            }

            #student-main-menu.open
            #student-main-menu-sheet {
                transform:translateX(0);
            }

            .student-main-menu-header {
                padding:
                    max(18px, env(safe-area-inset-top))
                    18px
                    16px;
                border-bottom:1px solid #eee;
                display:flex;
                align-items:center;
                gap:12px;
                flex-shrink:0;
            }

            .student-main-menu-title {
                flex:1;
                font-size:20px;
                font-weight:800;
                color:#111;
            }

            .student-main-menu-close {
                width:40px;
                height:40px;
                border:0;
                border-radius:50%;
                background:#f1f3f5;
                font-size:20px;
                cursor:pointer;
            }

            .student-main-menu-content {
                flex:1;
                overflow-y:auto;
                padding:14px;
            }

            .student-main-menu-button {
                width:100%;
                border:0;
                background:#f7f8fa;
                color:#222;
                padding:15px;
                border-radius:14px;
                text-align:right;
                font-size:15px;
                cursor:pointer;
                display:flex;
                align-items:center;
                gap:12px;
                direction:rtl;
                margin-bottom:9px;
                transition:
                    transform .12s ease,
                    background .12s ease;
            }

            .student-main-menu-button:active {
                transform:scale(.985);
            }

            .student-main-menu-button i {
                width:22px;
                text-align:center;
                color:#0095f6;
            }

            .student-main-menu-button.danger {
                background:#fff2f2;
                color:#d93025;
            }

            .student-main-menu-button.danger i {
                color:#d93025;
            }

            .student-main-menu-footer {
                padding:
                    10px
                    14px
                    max(14px, env(safe-area-inset-bottom));
                border-top:1px solid #eee;
                color:#aaa;
                text-align:center;
                font-size:11px;
                flex-shrink:0;
            }

            @media (max-width:480px) {

                #student-main-menu-sheet {
                    width:90vw;
                }

            }
        `;


        document.head.appendChild(
            style
        );
    }


    /* =====================================================
       بناء القائمة
    ===================================================== */

    function ensureMenuElement() {

        let menu =
            document.getElementById(
                "student-main-menu"
            );


        if (menu) {
            return menu;
        }


        menu =
            document.createElement(
                "div"
            );


        menu.id =
            "student-main-menu";


        menu.innerHTML = `

            <div
                id="student-main-menu-backdrop"
            ></div>

            <aside
                id="student-main-menu-sheet"
                aria-label="القائمة الرئيسية"
            >

                <div
                    class="student-main-menu-header"
                >

                    <div
                        class="student-main-menu-title"
                    >
                        القائمة
                    </div>

                    <button
                        type="button"
                        class="student-main-menu-close"
                        id="student-main-menu-close"
                    >
                        ×
                    </button>

                </div>

                <div
                    class="student-main-menu-content"
                    id="student-main-menu-content"
                ></div>

                <div
                    class="student-main-menu-footer"
                >
                    Student
                </div>

            </aside>
        `;


        document.body.appendChild(
            menu
        );


        menu
            .querySelector(
                "#student-main-menu-close"
            )
            ?.addEventListener(
                "click",
                closeMainMenu
            );


        menu
            .querySelector(
                "#student-main-menu-backdrop"
            )
            ?.addEventListener(
                "click",
                closeMainMenu
            );


        return menu;
    }


    /* =====================================================
       إغلاق القائمة
    ===================================================== */

    function closeMainMenu() {

        const menu =
            document.getElementById(
                "student-main-menu"
            );

        if (!menu) {
            return;
        }


        menu.classList.remove(
            "open"
        );


        document.body.style.overflow = "";
    }


    /* =====================================================
       فتح القائمة
    ===================================================== */

    async function openMenu() {

        /*
           نفتح الواجهة فورًا.
           لا ننتظر Supabase قبل إظهارها.
        */

        injectMenuStyles();

        const menu =
            ensureMenuElement();

        const content =
            menu.querySelector(
                "#student-main-menu-content"
            );


        content.innerHTML = `
            <div style="
                padding:25px 10px;
                text-align:center;
                color:#999;
            ">
                جاري تحميل القائمة...
            </div>
        `;


        menu.classList.add(
            "open"
        );


        /*
           لا نعيد الصفحة الرئيسية
           ولا نستخدم history.
        */

        document.body.style.overflow =
            "hidden";


        /*
           نحمل البيانات بعد ظهور القائمة.
        */

        await loadMenuFeatures();


        if (
            !isFeatureEnabled("menu")
        ) {

            closeMainMenu();
            return;
        }


        const items =
            buildMenuItems();


        content.innerHTML =
            items
                .map(
                    function (item) {

                        return `

                            <button
                                type="button"
                                class="
                                    student-main-menu-button
                                    ${
                                        item.danger
                                            ? "danger"
                                            : ""
                                    }
                                "
                                data-student-menu-id="${item.id}"
                            >

                                <i
                                    class="${item.icon}"
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
                .join("");


        items.forEach(
            function (item) {

                const button =
                    content.querySelector(
                        `[data-student-menu-id="${item.id}"]`
                    );


                if (!button) {
                    return;
                }


                button.addEventListener(
                    "click",
                    async function () {

                        /*
                           لا نغلق القائمة بالقوة
                           قبل تنفيذ الإجراء.
                           بعض الصفحات/النوافذ تبقى
                           ضمن نفس الصفحة.
                        */

                        await item.action();

                    }
                );
            }
        );
    }


    /* =====================================================
       ربط زر ☰
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
            menuIcon.dataset.studentMenuBound ===
            "true"
        ) {
            return;
        }


        menuIcon.dataset.studentMenuBound =
            "true";


        menuIcon.style.cursor =
            "pointer";


        menuIcon.addEventListener(
            "click",
            function (event) {

                event.preventDefault();
                event.stopPropagation();


                openMenu();

            }
        );
    }


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


    /* =====================================================
       API
    ===================================================== */

    window.openStudentMenu =
        openMenu;


    window.closeStudentMenu =
        closeMainMenu;


    window.clearStudentMenuFeatureCache =
        clearMenuFeatureCache;


    /* =====================================================
       Start
    ===================================================== */

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
