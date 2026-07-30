/* =========================================================
   Student - Menu System
   القائمة الرئيسية ☰
   جميع عناصر القائمة هنا فقط
========================================================= */

(function () {
    "use strict";

    if (window.__studentMenuLoaded) return;
    window.__studentMenuLoaded = true;

    let featureCache = {};

    /* =====================================================
       التحقق من حالة الميزة
    ===================================================== */

    async function isFeatureEnabled(featureKey) {

        if (
            typeof supabaseClient === "undefined" ||
            !supabaseClient ||
            !featureKey
        ) {
            return false;
        }

        if (
            Object.prototype.hasOwnProperty.call(
                featureCache,
                featureKey
            )
        ) {
            return featureCache[featureKey];
        }

        try {

            const { data, error } =
                await supabaseClient
                    .from("feature_flags")
                    .select("enabled, release_at")
                    .eq("feature_key", featureKey)
                    .maybeSingle();

            if (error || !data) {
                featureCache[featureKey] = false;
                return false;
            }

            let enabled =
                data.enabled === true;

            if (
                enabled &&
                data.release_at
            ) {

                const releaseDate =
                    new Date(data.release_at);

                if (
                    !isNaN(releaseDate.getTime()) &&
                    releaseDate > new Date()
                ) {
                    enabled = false;
                }
            }

            featureCache[featureKey] =
                enabled;

            return enabled;

        } catch (error) {

            console.error(
                "Menu feature error:",
                error
            );

            featureCache[featureKey] =
                false;

            return false;
        }
    }


    /* =====================================================
       تنظيف الذاكرة
    ===================================================== */

    function clearMenuFeatureCache() {
        featureCache = {};
    }


    /* =====================================================
       عناصر القائمة
    ===================================================== */

    async function buildMenuItems() {

        const items = [];


        /* الملف الشخصي */

        if (
            await isFeatureEnabled("profile")
        ) {

            items.push({
                id: "menu-profile",
                icon: "fa-regular fa-user",
                text: "الملف الشخصي",
                action: function () {

                    if (
                        typeof window.showProfilePanel ===
                        "function"
                    ) {
                        window.showProfilePanel();
                    }
                }
            });
        }


        /* الإعدادات */

        if (
            await isFeatureEnabled("settings")
        ) {

            items.push({
                id: "menu-settings",
                icon: "fa-solid fa-gear",
                text: "الإعدادات",
                action: function () {

                    if (
                        typeof window.showSettingsPanel ===
                        "function"
                    ) {
                        window.showSettingsPanel();
                    }
                }
            });
        }


        /* الإشعارات */

        if (
            await isFeatureEnabled("notifications")
        ) {

            items.push({
                id: "menu-notifications",
                icon: "fa-regular fa-bell",
                text: "الإشعارات",
                action: function () {

                    if (
                        typeof window.openNotifications ===
                        "function"
                    ) {
                        window.openNotifications();
                    }
                }
            });
        }


        /* المحفوظات */

        if (
            await isFeatureEnabled("saved")
        ) {

            items.push({
                id: "menu-saved",
                icon: "fa-regular fa-bookmark",
                text: "المحفوظات",
                action: function () {

                    openSaved();
                }
            });
        }


        /* تواصل معنا */

        if (
            await isFeatureEnabled("contact_us")
        ) {

            items.push({
                id: "menu-contact",
                icon: "fa-regular fa-comment",
                text: "تواصل معنا",
                action: function () {

                    openContact();
                }
            });
        }


        /* حول Student */

        if (
            await isFeatureEnabled("about")
        ) {

            items.push({
                id: "menu-about",
                icon: "fa-solid fa-circle-info",
                text: "حول Student",
                action: function () {

                    openAbout();
                }
            });
        }


        /* تسجيل الخروج دائمًا */

        items.push({
            id: "menu-logout",
            icon: "fa-solid fa-right-from-bracket",
            text: "تسجيل الخروج",
            danger: true,
            action: function () {

                if (
                    typeof window.logoutUser ===
                    "function"
                ) {
                    window.logoutUser();
                }
            }
        });


        return items;
    }


    /* =====================================================
       المحفوظات
    ===================================================== */

    function openSaved() {

        if (
            typeof window.showFloatingPanel !==
            "function"
        ) {
            return;
        }

        window.showFloatingPanel(
            "المحفوظات",
            `
            <div style="
                text-align:center;
                padding:30px 10px;
            ">

                <div style="
                    width:70px;
                    height:70px;
                    margin:0 auto 15px;
                    border-radius:20px;
                    background:#eaf5ff;
                    color:#0095f6;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    font-size:30px;
                ">
                    <i class="fa-regular fa-bookmark"></i>
                </div>

                <h3 style="
                    margin:0 0 10px;
                    color:#222;
                ">
                    المحفوظات
                </h3>

                <p style="
                    margin:0;
                    color:#777;
                    line-height:1.8;
                ">
                    ستظهر هنا المنشورات والدروس
                    والمحتويات التي تحفظها لاحقًا.
                </p>

            </div>
            `
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

        const button =
            document.getElementById(
                "student-contact-whatsapp"
            );

        if (button) {

            button.addEventListener(
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
    }


    /* =====================================================
       حول التطبيق
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
       إنشاء القائمة
    ===================================================== */

    async function openMenu() {

        clearMenuFeatureCache();

        if (
            !(await isFeatureEnabled("menu"))
        ) {
            return;
        }

        const items =
            await buildMenuItems();

        if (
            typeof window.showFloatingPanel !==
            "function"
        ) {
            console.error(
                "showFloatingPanel غير متاح."
            );
            return;
        }

        const buttons =
            items.map(function (item) {

                return `
                    <button
                        type="button"
                        data-student-menu-id="${item.id}"
                        style="
                            width:100%;
                            border:none;
                            background:${
                                item.danger
                                    ? "#fff2f2"
                                    : "#f7f8fa"
                            };
                            color:${
                                item.danger
                                    ? "#d93025"
                                    : "#222"
                            };
                            padding:15px;
                            border-radius:14px;
                            text-align:right;
                            font-size:15px;
                            cursor:pointer;
                            display:flex;
                            align-items:center;
                            gap:12px;
                            direction:rtl;
                        "
                    >
                        <i
                            class="${item.icon}"
                            style="
                                width:22px;
                                text-align:center;
                                color:${
                                    item.danger
                                        ? "#d93025"
                                        : "#0095f6"
                                };
                            "
                        ></i>

                        <span>
                            ${item.text}
                        </span>
                    </button>
                `;
            })
            .join("");


        window.showFloatingPanel(
            "القائمة",
            `
            <div style="
                display:flex;
                flex-direction:column;
                gap:10px;
            ">
                ${buttons}
            </div>
            `
        );


        items.forEach(function (item) {

            const button =
                document.querySelector(
                    `[data-student-menu-id="${item.id}"]`
                );

            if (button) {

                button.addEventListener(
                    "click",
                    function () {

                        item.action();

                    }
                );
            }
        });
    }


    /* =====================================================
       ربط زر الثلاثة خطوط
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
       الانتظار حتى تكون واجهة التطبيق جاهزة
    ===================================================== */

    function startMenu() {

        bindMenuButton();

        setTimeout(
            bindMenuButton,
            500
        );

        setTimeout(
            bindMenuButton,
            1500
        );
    }


    /* =====================================================
       دوال عامة
    ===================================================== */

    window.openStudentMenu =
        openMenu;

    window.clearStudentMenuFeatureCache =
        clearMenuFeatureCache;


    /* =====================================================
       تشغيل
    ===================================================== */

    if (
        document.readyState === "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            startMenu
        );

    } else {

        startMenu();
    }

})();
