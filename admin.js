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
            background: rgba(0,0,0,.45);
            z-index: 99991;
            display: none;
            align-items: center;
            justify-content: center;
            padding: 15px;
        }

        .student-admin-overlay.show {
            display: flex;
        }

        .student-admin-panel {
            width: 100%;
            max-width: 650px;
            max-height: 90vh;
            overflow-y: auto;
            background: #fff;
            border-radius: 22px;
            direction: rtl;
            box-shadow: 0 15px 50px rgba(0,0,0,.2);
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
        "student-admin-overlay";

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
       فتح اللوحة
    ===================================================== */

    async function openAdminPanel() {

        overlay.classList.add("show");

        await loadFeatures();
    }


    /* =====================================================
       إغلاق اللوحة
    ===================================================== */

    function closeAdminPanel() {

        overlay.classList.remove("show");
    }


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
