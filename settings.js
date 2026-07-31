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
