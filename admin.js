/* =========================================================
   Student - Admin Control Center
   لوحة تحكم المشرف

   لا تظهر إلا للحساب الذي لديه role = admin
========================================================= */

(function () {
    "use strict";

    if (window.__studentAdminLoaded) return;
    window.__studentAdminLoaded = true;

    let client = null;
    let features = [];

    /* =====================================================
       إنشاء اتصال Supabase مستقل
       باستخدام config.json
    ===================================================== */

    async function initSupabase() {
        try {
            if (
                window.supabaseClient &&
                window.supabaseClient.auth
            ) {
                client = window.supabaseClient;
                return true;
            }

            const response = await fetch("config.json", {
                cache: "no-store"
            });

            if (!response.ok) {
                throw new Error("تعذر تحميل config.json");
            }

            const config = await response.json();

            if (
                !config.supabase_url ||
                !config.supabase_key
            ) {
                throw new Error("إعدادات Supabase غير موجودة");
            }

            client = window.supabase.createClient(
                config.supabase_url,
                config.supabase_key,
                {
                    auth: {
                        persistSession: true,
                        autoRefreshToken: true,
                        detectSessionInUrl: true
                    }
                }
            );

            return true;

        } catch (error) {
            console.error(
                "Student Admin Supabase Error:",
                error
            );

            return false;
        }
    }


    /* =====================================================
       التحقق من المشرف
    ===================================================== */

    async function checkAdmin() {

        if (!client) return false;

        try {

            const {
                data: sessionData,
                error: sessionError
            } = await client.auth.getSession();

            if (
                sessionError ||
                !sessionData ||
                !sessionData.session ||
                !sessionData.session.user
            ) {
                return false;
            }

            const user =
                sessionData.session.user;

            const {
                data,
                error
            } = await client
                .from("admin_users")
                .select("role")
                .eq("user_id", user.id)
                .eq("role", "admin")
                .maybeSingle();

            if (error) {
                console.error(
                    "Admin verification error:",
                    error
                );

                return false;
            }

            return !!data;

        } catch (error) {

            console.error(
                "Admin check error:",
                error
            );

            return false;
        }
    }


    /* =====================================================
       التنسيق
    ===================================================== */

    const style = document.createElement("style");

    style.textContent = `
        .student-admin-open {
            position: fixed;
            right: 18px;
            bottom: 85px;
            width: 52px;
            height: 52px;
            border: none;
            border-radius: 50%;
            background: #0095f6;
            color: #fff;
            font-size: 19px;
            cursor: pointer;
            z-index: 99990;
            box-shadow: 0 6px 20px rgba(0,0,0,.18);
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .student-admin-overlay {
            position: fixed;
            inset: 0;
            background: #fff;
            z-index: 99991;
            display: none;
            padding: 0;
            direction: rtl;
        }

        .student-admin-overlay.show { display: block; }

        .student-admin-panel {
            width: 100%;
            height: 100%;
            max-width: none;
            max-height: none;
            overflow: hidden;
            background: #fff;
            border-radius: 0;
            direction: rtl;
            box-shadow: none;
            display: flex;
            flex-direction: column;
        }

        .student-admin-header {
            position: sticky;
            top: 0;
            background: #fff;
            padding: 18px;
            border-bottom: 1px solid #eee;
            display: flex;
            align-items: center;
            justify-content: space-between;
            z-index: 2;
        }

        .student-admin-title {
            font-size: 20px;
            font-weight: 700;
            color: #222;
        }

        .student-admin-subtitle {
            margin-top: 4px;
            font-size: 12px;
            color: #888;
        }

        .student-admin-close {
            width: 38px;
            height: 38px;
            border: none;
            border-radius: 50%;
            background: #f2f2f2;
            cursor: pointer;
            color: #555;
            font-size: 16px;
        }

        .student-admin-content {
            padding: 15px;
            overflow-y: auto;
            flex: 1;
            -webkit-overflow-scrolling: touch;
        }

        .student-admin-status {
            margin-bottom: 15px;
            padding: 12px 14px;
            border-radius: 12px;
            background: #f5f9ff;
            color: #555;
            font-size: 13px;
        }

        .student-feature-card {
            border: 1px solid #e8e8e8;
            border-radius: 15px;
            padding: 14px;
            margin-bottom: 10px;
            background: #fff;
        }

        .student-feature-top {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
        }

        .student-feature-name {
            font-size: 15px;
            font-weight: 700;
            color: #222;
        }

        .student-feature-key {
            margin-top: 3px;
            font-size: 10px;
            color: #aaa;
            direction: ltr;
            text-align: right;
        }

        .student-feature-description {
            margin-top: 7px;
            font-size: 12px;
            color: #777;
            line-height: 1.6;
        }

        .student-feature-bottom {
            margin-top: 12px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            flex-wrap: wrap;
        }

        .student-feature-release {
            flex: 1;
            min-width: 180px;
        }

        .student-feature-release label {
            display: block;
            font-size: 11px;
            color: #888;
            margin-bottom: 5px;
        }

        .student-feature-date {
            width: 100%;
            box-sizing: border-box;
            border: 1px solid #ddd;
            border-radius: 9px;
            padding: 8px;
            font-size: 12px;
            background: #fff;
        }

        .student-toggle {
            position: relative;
            width: 48px;
            height: 27px;
            flex-shrink: 0;
        }

        .student-toggle input {
            display: none;
        }

        .student-slider {
            position: absolute;
            inset: 0;
            background: #ccc;
            border-radius: 30px;
            cursor: pointer;
            transition: .2s;
        }

        .student-slider:before {
            content: "";
            position: absolute;
            width: 21px;
            height: 21px;
            left: 3px;
            top: 3px;
            background: #fff;
            border-radius: 50%;
            transition: .2s;
            box-shadow: 0 1px 3px rgba(0,0,0,.2);
        }

        .student-toggle input:checked + .student-slider {
            background: #0095f6;
        }

        .student-toggle input:checked + .student-slider:before {
            transform: translateX(21px);
        }

        .student-save-button {
            width: 100%;
            border: none;
            background: #0095f6;
            color: #fff;
            padding: 12px;
            border-radius: 11px;
            font-size: 14px;
            cursor: pointer;
            margin-top: 6px;
        }

        .student-save-button:disabled {
            opacity: .6;
            cursor: not-allowed;
        }

        .student-feature-state {
            font-size: 11px;
            font-weight: 700;
        }

        .student-feature-state.on {
            color: #16803c;
        }

        .student-feature-state.off {
            color: #d93025;
        }

        .student-admin-tools {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 10px;
            margin-bottom: 15px;
        }

        .student-admin-tool-button {
            border: 1px solid #dcecff;
            background: #f5f9ff;
            color: #0878c9;
            padding: 13px 12px;
            border-radius: 13px;
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }

        .student-admin-tool-button:disabled {
            opacity: .6;
            cursor: wait;
        }

        .student-admin-empty {
            text-align: center;
            color: #888;
            padding: 30px 10px;
        }
    `;

    document.head.appendChild(style);


    /* =====================================================
       إنشاء زر المشرف
    ===================================================== */

    const adminButton =
        document.createElement("button");

    adminButton.className =
        "student-admin-open";

    adminButton.title =
        "لوحة تحكم المشرف";

    adminButton.innerHTML =
        '<i class="fa-solid fa-shield-halved"></i>';

    adminButton.style.display = "none";

    document.body.appendChild(adminButton);


    /* =====================================================
       إنشاء لوحة المشرف
    ===================================================== */

    const overlay =
        document.createElement("div");

    overlay.className =
        "student-admin-overlay student-fullscreen-page";

    overlay.innerHTML = `
        <div class="student-admin-panel">

            <div class="student-admin-header">

                <div>
                    <div class="student-admin-title">
                        لوحة تحكم Student
                    </div>

                    <div class="student-admin-subtitle">
                        إدارة جميع ميزات التطبيق
                    </div>
                </div>

                <button
                    class="student-admin-close"
                    id="student-admin-close"
                >
                    <i class="fa-solid fa-xmark"></i>
                </button>

            </div>

            <div class="student-admin-content">

                <div class="student-admin-tools">
                    <button
                        class="student-admin-tool-button"
                        id="student-open-education-management"
                    >
                        <i class="fa-solid fa-graduation-cap"></i>
                        إدارة التعليم
                    </button>

                    <button
                        class="student-admin-tool-button"
                        id="student-open-teachers-management"
                    >
                        <i class="fa-solid fa-chalkboard-user"></i>
                        طلبات المدرسين
                    </button>
                </div>

                <div
                    class="student-admin-status"
                    id="student-admin-status"
                >
                    جاري تحميل الميزات...
                </div>

                <div id="student-features-list"></div>

            </div>

        </div>
    `;

    document.body.appendChild(overlay);


    /* =====================================================
       العناصر
    ===================================================== */

    const closeButton =
        document.getElementById(
            "student-admin-close"
        );

    const status =
        document.getElementById(
            "student-admin-status"
        );

    const list =
        document.getElementById(
            "student-features-list"
        );


    const educationButton =
        document.getElementById(
            "student-open-education-management"
        );

    const teachersButton =
        document.getElementById(
            "student-open-teachers-management"
        );


    /* =====================================================
       تحميل الميزات
    ===================================================== */

    async function loadFeatures() {

        if (!client) return;

        status.textContent =
            "جاري تحميل الميزات...";

        const {
            data,
            error
        } = await client
            .from("feature_flags")
            .select("*")
            .order("id", {
                ascending: true
            });

        if (error) {

            console.error(
                "Feature flags error:",
                error
            );

            status.textContent =
                "حدث خطأ أثناء تحميل الميزات.";

            return;
        }

        features = data || [];

        renderFeatures();

        status.textContent =
            `تم تحميل ${features.length} ميزة.`;
    }


    /* =====================================================
       عرض الميزات
    ===================================================== */

    function renderFeatures() {

        list.innerHTML = "";

        if (!features.length) {

            list.innerHTML = `
                <div class="student-admin-empty">
                    لا توجد ميزات.
                </div>
            `;

            return;
        }

        features.forEach(function (feature) {

            const card =
                document.createElement("div");

            card.className =
                "student-feature-card";

            let dateValue = "";

            if (feature.release_at) {

                const date =
                    new Date(feature.release_at);

                if (!isNaN(date.getTime())) {

                    dateValue =
                        date.toISOString()
                            .slice(0, 16);
                }
            }


            card.innerHTML = `

                <div class="student-feature-top">

                    <div>

                        <div class="student-feature-name">
                            ${escapeHTML(feature.name)}
                        </div>

                        <div class="student-feature-key">
                            ${escapeHTML(feature.feature_key)}
                        </div>

                    </div>

                    <div
                        class="student-feature-state ${
                            feature.enabled
                                ? "on"
                                : "off"
                        }"
                        data-state
                    >
                        ${
                            feature.enabled
                                ? "ON"
                                : "OFF"
                        }
                    </div>

                </div>

                <div class="student-feature-description">
                    ${
                        escapeHTML(
                            feature.description || ""
                        )
                    }
                </div>

                <div class="student-feature-bottom">

                    <label class="student-toggle">

                        <input
                            type="checkbox"
                            data-feature-toggle
                            data-id="${feature.id}"
                            ${feature.enabled ? "checked" : ""}
                        >

                        <span class="student-slider"></span>

                    </label>

                    <div class="student-feature-release">

                        <label>
                            موعد الإطلاق
                        </label>

                        <input
                            type="datetime-local"
                            class="student-feature-date"
                            data-release
                            data-id="${feature.id}"
                            value="${dateValue}"
                        >

                    </div>

                    <button
                        class="student-save-button"
                        data-save
                        data-id="${feature.id}"
                    >
                        حفظ
                    </button>

                </div>
            `;

            list.appendChild(card);
        });


        /* تحديث الحالة */

        document
            .querySelectorAll(
                "[data-feature-toggle]"
            )
            .forEach(function (toggle) {

                toggle.addEventListener(
                    "change",
                    function () {

                        const card =
                            toggle.closest(
                                ".student-feature-card"
                            );

                        const state =
                            card.querySelector(
                                "[data-state]"
                            );

                        if (toggle.checked) {

                            state.textContent =
                                "ON";

                            state.classList
                                .remove("off");

                            state.classList
                                .add("on");

                        } else {

                            state.textContent =
                                "OFF";

                            state.classList
                                .remove("on");

                            state.classList
                                .add("off");
                        }
                    }
                );
            });


        /* أزرار الحفظ */

        document
            .querySelectorAll(
                "[data-save]"
            )
            .forEach(function (button) {

                button.addEventListener(
                    "click",
                    async function () {

                        await saveFeature(
                            button.dataset.id,
                            button
                        );
                    }
                );
            });
    }


    /* =====================================================
       حفظ الميزة
    ===================================================== */

    async function saveFeature(
        id,
        button
    ) {

        const card =
            button.closest(
                ".student-feature-card"
            );

        const toggle =
            card.querySelector(
                "[data-feature-toggle]"
            );

        const releaseInput =
            card.querySelector(
                "[data-release]"
            );

        const enabled =
            toggle.checked;

        let release_at = null;

        if (releaseInput.value) {

            const date =
                new Date(
                    releaseInput.value
                );

            if (!isNaN(date.getTime())) {
                release_at =
                    date.toISOString();
            }
        }

        button.disabled = true;
        button.textContent =
            "جارٍ الحفظ...";

        try {

            const {
                error
            } = await client
                .from("feature_flags")
                .update({
                    enabled: enabled,
                    release_at: release_at,
                    updated_at: new Date().toISOString()
                })
                .eq("id", id);

            if (error) {
                throw error;
            }

            button.textContent =
                "تم الحفظ ✓";

            setTimeout(function () {
                button.textContent =
                    "حفظ";
                button.disabled = false;
            }, 1200);

        } catch (error) {

            console.error(
                "Save feature error:",
                error
            );

            button.textContent =
                "فشل الحفظ";

            setTimeout(function () {
                button.textContent =
                    "حفظ";
                button.disabled = false;
            }, 1500);
        }
    }


    /* =====================================================
       أدوات
    ===================================================== */

    function escapeHTML(value) {

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    /* =====================================================
       إدارة التعليم
    ===================================================== */

    function loadEducationManagement() {
        return new Promise(function (resolve, reject) {

            if (window.StudentEducationManagement) {
                resolve();
                return;
            }

            const existing = document.querySelector(
                'script[data-student-education-management="true"]'
            );

            if (existing) {
                existing.addEventListener("load", resolve, { once: true });
                existing.addEventListener("error", reject, { once: true });
                return;
            }

            const script = document.createElement("script");
            script.src = "education-management.js";
            script.async = true;
            script.dataset.studentEducationManagement = "true";
            script.onload = resolve;
            script.onerror = function () {
                reject(new Error("تعذر تحميل education-management.js"));
            };

            document.body.appendChild(script);
        });
    }

    async function openEducationManagement() {
        if (!educationButton) return;

        educationButton.disabled = true;

        try {
            await loadEducationManagement();

            if (
                !window.StudentEducationManagement ||
                typeof window.StudentEducationManagement.open !== "function"
            ) {
                throw new Error("ملف إدارة التعليم غير صالح");
            }

            overlay.classList.remove("show");
            await window.StudentEducationManagement.open(client);
            if (window.StudentNavigation?.registerReturn) {
                window.StudentNavigation.registerReturn("education-management", function(){ overlay.classList.add("show"); });
            }

        } catch (error) {
            console.error("Education management error:", error);
            status.textContent = error.message || "تعذر فتح إدارة التعليم.";
        } finally {
            educationButton.disabled = false;
        }
    }

    if (educationButton) {
        educationButton.addEventListener(
            "click",
            openEducationManagement
        );
    }



    /* =====================================================
       إدارة طلبات المدرسين
    ===================================================== */

    function loadTeachersEducation() {
        return new Promise(function (resolve, reject) {
            if (window.StudentTeachersEducation) {
                resolve();
                return;
            }

            const existing = document.querySelector(
                'script[data-student-teachers-education="true"]'
            );

            if (existing) {
                existing.addEventListener("load", resolve, { once: true });
                existing.addEventListener("error", reject, { once: true });
                return;
            }

            const script = document.createElement("script");
            script.src = "teachers-education.js";
            script.async = true;
            script.dataset.studentTeachersEducation = "true";
            script.onload = resolve;
            script.onerror = function () {
                reject(new Error("تعذر تحميل teachers-education.js"));
            };

            document.body.appendChild(script);
        });
    }

    async function openTeachersManagement() {
        if (!teachersButton) return;
        teachersButton.disabled = true;

        try {
            await loadTeachersEducation();

            if (
                !window.StudentTeachersEducation ||
                typeof window.StudentTeachersEducation.openAdmin !== "function"
            ) {
                throw new Error("ملف إدارة المدرسين غير صالح");
            }

            await window.StudentTeachersEducation.openAdmin(client, {
                onClose: function () { overlay.classList.add("show"); }
            });

        } catch (error) {
            console.error("Teachers management error:", error);
            status.textContent = error.message || "تعذر فتح طلبات المدرسين.";
        } finally {
            teachersButton.disabled = false;
        }
    }

    if (teachersButton) {
        teachersButton.addEventListener("click", openTeachersManagement);
    }

    /* =====================================================
       فتح اللوحة
    ===================================================== */

    async function openAdminPanel() {
        overlay.classList.add("show");
        document.body.classList.add("student-admin-page-open");
        try { history.pushState({ studentPage: "admin" }, "", location.href); } catch (_) {}
        await loadFeatures();
    }


    /* =====================================================
       إغلاق اللوحة
    ===================================================== */

    function closeAdminPanel() {
        overlay.classList.remove("show");
        document.body.classList.remove("student-admin-page-open");
        return true;
    }

    window.closeStudentAdminPanel = closeAdminPanel;


    adminButton.addEventListener(
        "click",
        openAdminPanel
    );


    closeButton.addEventListener(
        "click",
        closeAdminPanel
    );


    overlay.addEventListener(
        "click",
        function (event) {

            if (
                event.target === overlay
            ) {
                closeAdminPanel();
            }
        }
    );


    /* =====================================================
       بدء النظام
    ===================================================== */

    async function start() {

        const ready =
            await initSupabase();

        if (!ready) {
            console.warn(
                "Student Admin: Supabase غير جاهز."
            );
            return;
        }

        const admin =
            await checkAdmin();

        if (!admin) {

            /* لا يظهر أي شيء للمستخدم العادي */

            adminButton.remove();
            overlay.remove();

            return;
        }

        /* المشرف فقط */

        adminButton.style.display =
            "flex";

        console.log(
            "Student Admin: تم التحقق من المشرف."
        );
    }


    /* انتظار تحميل الصفحة */

    if (
        document.readyState === "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            start
        );

    } else {

        start();
    }

})();

/* =========================================================
   Student Admin - Home Ads Management
========================================================= */
(function () {
    "use strict";

    let client = null;
    let currentAdmin = null;
    let editingId = null;
    let editingImagePath = null;
    let adsCache = null;
    let adsCacheAt = 0;
    let adsLoadingPromise = null;

    function escapeHtml(value) {
        return String(value ?? "").replace(/[&<>'"]/g, ch => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
        }[ch]));
    }

    function ensureStyles() {
        if (document.getElementById("student-ads-admin-style")) return;
        const style = document.createElement("style");
        style.id = "student-ads-admin-style";
        style.textContent = `
            .student-ads-admin-page{position:fixed;inset:0;z-index:10080;background:#fff;display:none;flex-direction:column;direction:rtl}
            .student-ads-admin-page.show{display:flex}
            .student-ads-admin-head{height:68px;padding:0 16px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e5e7eb;background:#fff}
            .student-ads-admin-head h2{margin:0;font-size:21px;color:#171717}
            .student-ads-admin-back,.student-ads-primary,.student-ads-secondary,.student-ads-danger{border:0;border-radius:12px;padding:11px 15px;font-size:15px;cursor:pointer}
            .student-ads-admin-back,.student-ads-secondary{background:#f0f2f5;color:#222}
            .student-ads-primary{background:#0095f6;color:#fff}
            .student-ads-danger{background:#fff0f0;color:#d93025}
            .student-ads-admin-body{flex:1;overflow:auto;padding:16px;max-width:900px;width:100%;margin:auto}
            .student-ads-form{display:grid;gap:12px;padding:15px;border:1px solid #e4e7eb;border-radius:16px;margin-bottom:18px;background:#fafbfc}
            .student-ads-form label{display:grid;gap:7px;font-weight:700;color:#333}
            .student-ads-form input{width:100%;padding:12px;border:1px solid #d9dde3;border-radius:11px;font-size:15px;background:#fff}
            .student-ads-form-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
            .student-ads-form-actions{display:flex;gap:9px;flex-wrap:wrap}
            .student-ads-list{display:grid;gap:12px}
            .student-ad-admin-card{display:grid;grid-template-columns:145px 1fr;gap:13px;padding:12px;border:1px solid #e1e4e8;border-radius:16px;background:#fff}
            .student-ad-admin-card img{width:145px;height:88px;object-fit:cover;border-radius:12px;background:#eee}
            .student-ad-admin-info{min-width:0}.student-ad-admin-title{font-size:17px;font-weight:800;margin-bottom:5px}.student-ad-admin-meta{font-size:13px;color:#6b7280;word-break:break-word}
            .student-ad-admin-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
            .student-ads-empty{text-align:center;color:#777;padding:38px 10px}
            .student-ads-status{min-height:22px;color:#555;font-size:14px}.student-ads-status.error{color:#c62828}.student-ads-status.success{color:#12833b}
            @media(max-width:600px){.student-ads-form-row{grid-template-columns:1fr}.student-ad-admin-card{grid-template-columns:105px 1fr}.student-ad-admin-card img{width:105px;height:82px}}
        `;
        document.head.appendChild(style);
    }

    function buildPage() {
        if (document.getElementById("student-ads-admin-page")) return;
        const page = document.createElement("section");
        page.id = "student-ads-admin-page";
        page.className = "student-ads-admin-page";
        page.innerHTML = `
            <header class="student-ads-admin-head">
                <button type="button" class="student-ads-admin-back" id="student-ads-admin-back"><i class="fa-solid fa-arrow-right"></i></button>
                <h2>إدارة إعلانات الرئيسية</h2>
                <span></span>
            </header>
            <div class="student-ads-admin-body">
                <form class="student-ads-form" id="student-ads-form">
                    <label>صورة الإعلان
                        <input type="file" id="student-ad-image" accept="image/jpeg,image/png,image/webp">
                    </label>
                    <label>العنوان (اختياري)
                        <input type="text" id="student-ad-title" maxlength="100" placeholder="عنوان قصير">
                    </label>
                    <label>الرابط (اختياري)
                        <input type="url" id="student-ad-link" maxlength="500" placeholder="https://example.com">
                    </label>
                    <div class="student-ads-form-row">
                        <label>الترتيب
                            <input type="number" id="student-ad-order" value="0" min="0" max="9999">
                        </label>
                        <label>الحالة
                            <select id="student-ad-active" style="padding:12px;border:1px solid #d9dde3;border-radius:11px;background:#fff;font-size:15px">
                                <option value="true">ظاهر</option><option value="false">مخفي</option>
                            </select>
                        </label>
                    </div>
                    <div class="student-ads-form-row">
                        <label>يبدأ في (اختياري)<input type="datetime-local" id="student-ad-start"></label>
                        <label>ينتهي في (اختياري)<input type="datetime-local" id="student-ad-end"></label>
                    </div>
                    <div class="student-ads-form-actions">
                        <button type="submit" class="student-ads-primary" id="student-ad-save">إضافة الإعلان</button>
                        <button type="button" class="student-ads-secondary" id="student-ad-cancel" style="display:none">إلغاء التعديل</button>
                    </div>
                    <div class="student-ads-status" id="student-ads-status"></div>
                </form>
                <div class="student-ads-list" id="student-ads-list"></div>
            </div>`;
        document.body.appendChild(page);

        document.getElementById("student-ads-admin-back").addEventListener("click", closePage);
        document.getElementById("student-ad-cancel").addEventListener("click", resetForm);
        document.getElementById("student-ads-form").addEventListener("submit", saveAd);
    }

    function setStatus(text, type = "") {
        const el = document.getElementById("student-ads-status");
        if (!el) return;
        el.textContent = text || "";
        el.className = `student-ads-status ${type}`.trim();
    }

    function closePage() {
        document.getElementById("student-ads-admin-page")?.classList.remove("show");
        resetForm();
        document.querySelector(".student-admin-overlay")?.classList.add("show");
        return true;
    }

    async function openPage() {
        buildPage();
        document.querySelector(".student-admin-overlay")?.classList.remove("show");
        const page = document.getElementById("student-ads-admin-page");
        page.classList.add("show");
        try { history.pushState({ studentPage: "ads-admin" }, "", location.href); } catch (_) {}
        if (adsCache && Date.now() - adsCacheAt < 60000) renderAdsRows(adsCache);
        loadAds();
    }

    window.closeStudentAdsAdmin = closePage;

    function resetForm() {
        editingId = null;
        editingImagePath = null;
        document.getElementById("student-ads-form")?.reset();
        const order = document.getElementById("student-ad-order");
        if (order) order.value = "0";
        const save = document.getElementById("student-ad-save");
        if (save) save.textContent = "إضافة الإعلان";
        const cancel = document.getElementById("student-ad-cancel");
        if (cancel) cancel.style.display = "none";
        setStatus("");
    }

    function renderAdsRows(data) {
        const list = document.getElementById("student-ads-list");
        if (!list) return;
        if (!data?.length) { list.innerHTML = '<div class="student-ads-empty">لا توجد إعلانات بعد.</div>'; return; }
        list.innerHTML = data.map(ad => `
            <article class="student-ad-admin-card" data-id="${ad.id}">
                <img src="${escapeHtml(ad.image_url)}" alt="إعلان">
                <div class="student-ad-admin-info">
                    <div class="student-ad-admin-title">${escapeHtml(ad.title || "إعلان بدون عنوان")}</div>
                    <div class="student-ad-admin-meta">${ad.is_active ? "ظاهر" : "مخفي"} • ترتيب ${ad.sort_order || 0}</div>
                    ${ad.link_url ? `<div class="student-ad-admin-meta">${escapeHtml(ad.link_url)}</div>` : ""}
                    <div class="student-ad-admin-actions">
                        <button class="student-ads-secondary" data-action="edit" type="button">تعديل</button>
                        <button class="student-ads-danger" data-action="delete" type="button">حذف</button>
                    </div>
                </div>
            </article>`).join("");
        list.querySelectorAll("[data-action=edit]").forEach((btn, i) => btn.addEventListener("click", () => editAd(data[i])));
        list.querySelectorAll("[data-action=delete]").forEach((btn, i) => btn.addEventListener("click", () => deleteAd(data[i])));
    }

    async function loadAds(force = false) {
        const list = document.getElementById("student-ads-list");
        if (!list || !client) return;
        if (!force && adsCache && Date.now() - adsCacheAt < 60000) {
            renderAdsRows(adsCache);
            return;
        }
        if (adsLoadingPromise) return adsLoadingPromise;
        if (!adsCache) list.innerHTML = '<div class="student-ads-empty">جاري التحميل...</div>';
        adsLoadingPromise = (async function () {
            const { data, error } = await client.from("home_ads").select("*")
                .order("sort_order", {ascending:true})
                .order("created_at", {ascending:false});
            if (error) {
                if (!adsCache) list.innerHTML = `<div class="student-ads-empty">${escapeHtml(error.message)}</div>`;
                return;
            }
            adsCache = data || [];
            adsCacheAt = Date.now();
            renderAdsRows(adsCache);
        })().finally(() => { adsLoadingPromise = null; });
        return adsLoadingPromise;
    }

    function localDateValue(value) {
        if (!value) return "";
        const d = new Date(value);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().slice(0,16);
    }

    function editAd(ad) {
        editingId = ad.id;
        editingImagePath = ad.image_path || null;
        document.getElementById("student-ad-title").value = ad.title || "";
        document.getElementById("student-ad-link").value = ad.link_url || "";
        document.getElementById("student-ad-order").value = ad.sort_order || 0;
        document.getElementById("student-ad-active").value = String(Boolean(ad.is_active));
        document.getElementById("student-ad-start").value = localDateValue(ad.starts_at);
        document.getElementById("student-ad-end").value = localDateValue(ad.ends_at);
        document.getElementById("student-ad-save").textContent = "حفظ التعديل";
        document.getElementById("student-ad-cancel").style.display = "inline-block";
        window.scrollTo({top:0,behavior:"smooth"});
    }

    async function uploadImage(file) {
        if (!file) return null;
        if (file.size > 5 * 1024 * 1024) throw new Error("حجم الصورة يجب ألا يتجاوز 5MB.");
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
        const path = `${currentAdmin.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
        const { error } = await client.storage.from("home-ads").upload(path, file, {cacheControl:"3600", upsert:false});
        if (error) throw error;
        const { data } = client.storage.from("home-ads").getPublicUrl(path);
        return { path, url: data.publicUrl };
    }

    async function saveAd(event) {
        event.preventDefault();
        const saveButton = document.getElementById("student-ad-save");
        saveButton.disabled = true;
        setStatus("جاري الحفظ...");
        try {
            const file = document.getElementById("student-ad-image").files[0];
            if (!editingId && !file) throw new Error("اختر صورة الإعلان.");
            const uploaded = file ? await uploadImage(file) : null;
            const payload = {
                title: document.getElementById("student-ad-title").value.trim() || null,
                link_url: document.getElementById("student-ad-link").value.trim() || null,
                sort_order: Number(document.getElementById("student-ad-order").value || 0),
                is_active: document.getElementById("student-ad-active").value === "true",
                starts_at: document.getElementById("student-ad-start").value ? new Date(document.getElementById("student-ad-start").value).toISOString() : null,
                ends_at: document.getElementById("student-ad-end").value ? new Date(document.getElementById("student-ad-end").value).toISOString() : null,
                updated_at: new Date().toISOString()
            };
            if (uploaded) {
                payload.image_path = uploaded.path;
                payload.image_url = uploaded.url;
            }
            let result;
            if (editingId) result = await client.from("home_ads").update(payload).eq("id", editingId);
            else result = await client.from("home_ads").insert({...payload, created_by: currentAdmin.id});
            if (result.error) {
                if (uploaded) await client.storage.from("home-ads").remove([uploaded.path]);
                throw result.error;
            }
            if (uploaded && editingImagePath) await client.storage.from("home-ads").remove([editingImagePath]);
            setStatus("تم الحفظ بنجاح.", "success");
            resetForm();
            await loadAds(true);
            window.StudentHomeAds?.reload?.();
        } catch (error) {
            setStatus(error.message || "تعذر حفظ الإعلان.", "error");
        } finally {
            saveButton.disabled = false;
        }
    }

    async function deleteAd(ad) {
        const card = document.querySelector(`.student-ad-admin-card[data-id="${ad.id}"]`);
        const button = card?.querySelector('[data-action="delete"]');
        if (button && button.dataset.confirmDelete !== "1") {
            button.dataset.confirmDelete = "1";
            button.textContent = "اضغط مرة ثانية للتأكيد";
            setTimeout(() => {
                if (button.isConnected) {
                    button.dataset.confirmDelete = "0";
                    button.textContent = "حذف";
                }
            }, 5000);
            return;
        }
        if (button) button.disabled = true;
        const { error } = await client.from("home_ads").delete().eq("id", ad.id);
        if (error) {
            setStatus(error.message, "error");
            return;
        }
        if (ad.image_path) await client.storage.from("home-ads").remove([ad.image_path]);
        await loadAds(true);
        window.StudentHomeAds?.reload?.();
    }

    async function initialize(attempt = 0) {
        client = typeof supabaseClient !== "undefined" ? supabaseClient : null;
        if (!client) {
            if (attempt < 40) setTimeout(() => initialize(attempt + 1), 250);
            return;
        }
        const { data: { user } } = await client.auth.getUser();
        if (!user) return;
        const { data } = await client.from("profiles").select("role").eq("id", user.id).maybeSingle();
        if (String(data?.role || "").toLowerCase() !== "admin") return;
        currentAdmin = user;
        ensureStyles();
        buildPage();
        const tools = document.querySelector(".student-admin-tools");
        if (tools && !document.getElementById("student-open-ads-management")) {
            const button = document.createElement("button");
            button.type = "button";
            button.id = "student-open-ads-management";
            button.className = "student-admin-tool-button";
            button.innerHTML = '<i class="fa-solid fa-images"></i> إدارة الإعلانات';
            button.addEventListener("click", openPage);
            tools.appendChild(button);
        }
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => initialize());
    else initialize();
})();
