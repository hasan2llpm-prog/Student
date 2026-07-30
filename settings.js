/* =========================================================
   Student - Settings System
   الإعدادات
========================================================= */

(function () {
    "use strict";

    if (window.__studentSettingsLoaded) return;
    window.__studentSettingsLoaded = true;


    /* =====================================================
       أدوات عامة
    ===================================================== */

    function openPanel(title, content) {

        if (
            typeof window.showFloatingPanel !==
            "function"
        ) {
            console.error(
                "showFloatingPanel غير متاح."
            );
            return;
        }

        window.showFloatingPanel(
            title,
            content
        );
    }


    function getSupabase() {

        if (
            typeof supabaseClient !==
            "undefined" &&
            supabaseClient
        ) {
            return supabaseClient;
        }

        return null;
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
       الإعدادات الرئيسية
    ===================================================== */

    function openSettings() {

        const items = [

            {
                id: "settings-account",
                icon: "fa-regular fa-user",
                title: "الحساب",
                text: "الاسم والبريد وكلمة المرور",
                action: openAccountSettings
            },

            {
                id: "settings-privacy",
                icon: "fa-solid fa-lock",
                title: "الخصوصية",
                text: "إعدادات خصوصية الحساب",
                action: openPrivacySettings
            },

            {
                id: "settings-notifications",
                icon: "fa-regular fa-bell",
                title: "الإشعارات",
                text: "التحكم بالإشعارات",
                action: openNotificationSettings
            },

            {
                id: "settings-appearance",
                icon: "fa-solid fa-palette",
                title: "المظهر",
                text: "الوضع الفاتح والداكن",
                action: openAppearanceSettings
            },

            {
                id: "settings-language",
                icon: "fa-solid fa-language",
                title: "اللغة",
                text: "لغة التطبيق",
                action: openLanguageSettings
            },

            {
                id: "settings-security",
                icon: "fa-solid fa-shield-halved",
                title: "الأمان",
                text: "الجلسات وتسجيل الخروج",
                action: openSecuritySettings
            }

        ];


        const html =
            items.map(function (item) {

                return `
                    <button
                        type="button"
                        data-settings-id="${item.id}"
                        style="
                            width:100%;
                            border:none;
                            background:#f7f8fa;
                            padding:15px;
                            border-radius:14px;
                            text-align:right;
                            font-size:15px;
                            cursor:pointer;
                            display:flex;
                            align-items:center;
                            gap:13px;
                            direction:rtl;
                        "
                    >

                        <div style="
                            width:40px;
                            height:40px;
                            border-radius:12px;
                            background:#eaf5ff;
                            color:#0095f6;
                            display:flex;
                            align-items:center;
                            justify-content:center;
                            flex-shrink:0;
                        ">
                            <i class="${item.icon}"></i>
                        </div>

                        <div>

                            <div style="
                                font-weight:700;
                                color:#222;
                            ">
                                ${item.title}
                            </div>

                            <div style="
                                margin-top:4px;
                                font-size:12px;
                                color:#888;
                            ">
                                ${item.text}
                            </div>

                        </div>

                        <i
                            class="fa-solid fa-chevron-left"
                            style="
                                margin-right:auto;
                                color:#aaa;
                                font-size:12px;
                            "
                        ></i>

                    </button>
                `;

            }).join("");


        openPanel(
            "الإعدادات",
            `
            <div style="
                display:flex;
                flex-direction:column;
                gap:10px;
            ">
                ${html}
            </div>
            `
        );


        items.forEach(function (item) {

            const button =
                document.querySelector(
                    `[data-settings-id="${item.id}"]`
                );

            if (button) {

                button.addEventListener(
                    "click",
                    item.action
                );
            }
        });
    }


    /* =====================================================
       الحساب
    ===================================================== */

    async function openAccountSettings() {

        const client =
            getSupabase();

        if (!client) {
            return;
        }


        let user = null;


        try {

            const result =
                await client.auth.getUser();

            user =
                result?.data?.user ||
                null;

        } catch (error) {

            console.error(
                "Get user error:",
                error
            );
        }


        const email =
            user?.email ||
            "";


        openPanel(
            "الحساب",
            `
            <div style="
                display:flex;
                flex-direction:column;
                gap:10px;
            ">

                <button
                    id="settings-email-btn"
                    type="button"
                    style="
                        width:100%;
                        border:none;
                        background:#f7f8fa;
                        padding:15px;
                        border-radius:14px;
                        text-align:right;
                        cursor:pointer;
                    "
                >
                    <strong>
                        تغيير البريد الإلكتروني
                    </strong>

                    <div style="
                        margin-top:5px;
                        color:#888;
                        font-size:12px;
                        direction:ltr;
                        text-align:right;
                    ">
                        ${escapeHTML(email)}
                    </div>
                </button>


                <button
                    id="settings-password-btn"
                    type="button"
                    style="
                        width:100%;
                        border:none;
                        background:#f7f8fa;
                        padding:15px;
                        border-radius:14px;
                        text-align:right;
                        cursor:pointer;
                    "
                >
                    <strong>
                        تغيير كلمة المرور
                    </strong>

                    <div style="
                        margin-top:5px;
                        color:#888;
                        font-size:12px;
                    ">
                        تحديث كلمة مرور الحساب
                    </div>
                </button>

            </div>
            `
        );


        document
            .getElementById(
                "settings-email-btn"
            )
            ?.addEventListener(
                "click",
                openChangeEmail
            );


        document
            .getElementById(
                "settings-password-btn"
            )
            ?.addEventListener(
                "click",
                openChangePassword
            );
    }


    /* =====================================================
       تغيير البريد
    ===================================================== */

    function openChangeEmail() {

        const client =
            getSupabase();

        if (!client) {
            return;
        }


        openPanel(
            "تغيير البريد الإلكتروني",
            `
            <form
                id="change-email-form"
                style="
                    display:flex;
                    flex-direction:column;
                    gap:12px;
                "
            >

                <input
                    id="new-email"
                    type="email"
                    placeholder="البريد الإلكتروني الجديد"
                    required
                    style="
                        width:100%;
                        box-sizing:border-box;
                        padding:13px;
                        border:1px solid #ddd;
                        border-radius:11px;
                        outline:none;
                        direction:ltr;
                    "
                >

                <button
                    type="submit"
                    id="change-email-submit"
                    style="
                        border:none;
                        background:#0095f6;
                        color:#fff;
                        padding:13px;
                        border-radius:11px;
                        cursor:pointer;
                    "
                >
                    حفظ
                </button>

                <div
                    id="change-email-message"
                    style="
                        text-align:center;
                        min-height:20px;
                        font-size:13px;
                    "
                ></div>

            </form>
            `
        );


        document
            .getElementById(
                "change-email-form"
            )
            ?.addEventListener(
                "submit",
                async function (event) {

                    event.preventDefault();

                    const email =
                        document
                            .getElementById(
                                "new-email"
                            )
                            ?.value
                            .trim();

                    const message =
                        document
                            .getElementById(
                                "change-email-message"
                            );

                    const button =
                        document
                            .getElementById(
                                "change-email-submit"
                            );


                    if (!email) {
                        return;
                    }


                    button.disabled =
                        true;

                    button.textContent =
                        "جارٍ الحفظ...";


                    try {

                        const {
                            error
                        } =
                            await client.auth.updateUser({
                                email: email
                            });


                        if (error) {
                            throw error;
                        }


                        message.style.color =
                            "#16803c";

                        message.textContent =
                            "تم الطلب. قد يطلب منك تأكيد البريد الجديد عبر رسالة بريد إلكتروني.";

                    } catch (error) {

                        console.error(
                            "Email update error:",
                            error
                        );

                        message.style.color =
                            "#d93025";

                        message.textContent =
                            error?.message ||
                            "تعذر تغيير البريد الإلكتروني.";

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

    function openChangePassword() {

        const client =
            getSupabase();

        if (!client) {
            return;
        }


        openPanel(
            "تغيير كلمة المرور",
            `
            <form
                id="change-password-form"
                style="
                    display:flex;
                    flex-direction:column;
                    gap:12px;
                "
            >

                <input
                    id="new-password"
                    type="password"
                    placeholder="كلمة المرور الجديدة"
                    minlength="6"
                    required
                    style="
                        width:100%;
                        box-sizing:border-box;
                        padding:13px;
                        border:1px solid #ddd;
                        border-radius:11px;
                        outline:none;
                    "
                >

                <input
                    id="new-password-confirm"
                    type="password"
                    placeholder="تأكيد كلمة المرور"
                    minlength="6"
                    required
                    style="
                        width:100%;
                        box-sizing:border-box;
                        padding:13px;
                        border:1px solid #ddd;
                        border-radius:11px;
                        outline:none;
                    "
                >

                <button
                    type="submit"
                    id="change-password-submit"
                    style="
                        border:none;
                        background:#0095f6;
                        color:#fff;
                        padding:13px;
                        border-radius:11px;
                        cursor:pointer;
                    "
                >
                    تحديث كلمة المرور
                </button>

                <div
                    id="change-password-message"
                    style="
                        text-align:center;
                        min-height:20px;
                        font-size:13px;
                    "
                ></div>

            </form>
            `
        );


        document
            .getElementById(
                "change-password-form"
            )
            ?.addEventListener(
                "submit",
                async function (event) {

                    event.preventDefault();


                    const password =
                        document
                            .getElementById(
                                "new-password"
                            )
                            ?.value;


                    const confirm =
                        document
                            .getElementById(
                                "new-password-confirm"
                            )
                            ?.value;


                    const message =
                        document
                            .getElementById(
                                "change-password-message"
                            );


                    const button =
                        document
                            .getElementById(
                                "change-password-submit"
                            );


                    if (
                        !password ||
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


                    button.disabled =
                        true;

                    button.textContent =
                        "جارٍ التحديث...";


                    try {

                        const {
                            error
                        } =
                            await client.auth.updateUser({
                                password: password
                            });


                        if (error) {
                            throw error;
                        }


                        message.style.color =
                            "#16803c";

                        message.textContent =
                            "تم تحديث كلمة المرور بنجاح.";

                    } catch (error) {

                        console.error(
                            "Password update error:",
                            error
                        );

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

    async function openPrivacySettings() {

        const client =
            getSupabase();

        let currentStatus =
            "public";


        if (
            typeof currentProfile !==
                "undefined" &&
            currentProfile
        ) {

            currentStatus =
                currentProfile.account_status ||
                "public";
        }


        openPanel(
            "الخصوصية",
            `
            <div style="
                display:flex;
                flex-direction:column;
                gap:12px;
            ">

                <div style="
                    background:#f7f8fa;
                    padding:15px;
                    border-radius:14px;
                ">

                    <div style="
                        font-weight:700;
                        margin-bottom:8px;
                    ">
                        خصوصية الحساب
                    </div>

                    <select
                        id="privacy-account-status"
                        style="
                            width:100%;
                            box-sizing:border-box;
                            padding:12px;
                            border:1px solid #ddd;
                            border-radius:10px;
                            background:#fff;
                            font-size:14px;
                        "
                    >

                        <option
                            value="public"
                            ${
                                currentStatus ===
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
                                currentStatus ===
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
                    id="privacy-save-button"
                    type="button"
                    style="
                        border:none;
                        background:#0095f6;
                        color:#fff;
                        padding:13px;
                        border-radius:11px;
                        cursor:pointer;
                    "
                >
                    حفظ إعدادات الخصوصية
                </button>

                <div
                    id="privacy-message"
                    style="
                        text-align:center;
                        min-height:20px;
                        font-size:13px;
                    "
                ></div>

            </div>
            `
        );


        document
            .getElementById(
                "privacy-save-button"
            )
            ?.addEventListener(
                "click",
                async function () {

                    if (!client) {
                        return;
                    }


                    const status =
                        document
                            .getElementById(
                                "privacy-account-status"
                            )
                            ?.value;


                    const message =
                        document
                            .getElementById(
                                "privacy-message"
                            );


                    try {

                        /*
                           نستخدم RPC الموجودة
                           في مشروعك لتغيير حالة الحساب.
                        */

                        const {
                            data,
                            error
                        } =
                            await client.rpc(
                                "set_account_status",
                                {
                                    p_status:
                                        status
                                }
                            );


                        if (error) {
                            throw error;
                        }


                        if (
                            data !==
                            "public" &&
                            data !==
                            "private"
                        ) {

                            throw new Error(
                                "تعذر تحديث خصوصية الحساب."
                            );
                        }


                        if (
                            typeof loadProfile ===
                            "function" &&
                            typeof currentUser !==
                            "undefined" &&
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

                        console.error(
                            "Privacy settings error:",
                            error
                        );

                        message.style.color =
                            "#d93025";

                        message.textContent =
                            error?.message ||
                            "تعذر حفظ إعدادات الخصوصية.";
                    }
                }
            );
    }


    /* =====================================================
       الإشعارات
    ===================================================== */

    function openNotificationSettings() {

        const saved =
            localStorage.getItem(
                "student_notifications_enabled"
            );


        const enabled =
            saved !== "false";


        openPanel(
            "الإشعارات",
            `
            <div style="
                display:flex;
                flex-direction:column;
                gap:10px;
            ">

                <div style="
                    display:flex;
                    align-items:center;
                    justify-content:space-between;
                    padding:15px;
                    background:#f7f8fa;
                    border-radius:14px;
                ">

                    <div>

                        <div style="
                            font-weight:700;
                        ">
                            إشعارات التطبيق
                        </div>

                        <div style="
                            margin-top:4px;
                            font-size:12px;
                            color:#888;
                        ">
                            الإشعارات والتنبيهات
                        </div>

                    </div>


                    <label style="
                        position:relative;
                        width:48px;
                        height:27px;
                    ">

                        <input
                            id="student-notifications-toggle"
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
                            id="student-notifications-slider"
                            style="
                                position:absolute;
                                inset:0;
                                border-radius:30px;
                                background:${
                                    enabled
                                        ? "#0095f6"
                                        : "#ccc"
                                };
                                cursor:pointer;
                            "
                        ></span>

                    </label>

                </div>


                <div
                    id="notifications-settings-message"
                    style="
                        text-align:center;
                        min-height:20px;
                        font-size:13px;
                    "
                ></div>

            </div>
            `
        );


        const toggle =
            document.getElementById(
                "student-notifications-toggle"
            );


        const slider =
            document.getElementById(
                "student-notifications-slider"
            );


        const message =
            document.getElementById(
                "notifications-settings-message"
            );


        if (
            toggle &&
            slider
        ) {

            toggle.addEventListener(
                "change",
                function () {

                    const isEnabled =
                        toggle.checked;


                    localStorage.setItem(
                        "student_notifications_enabled",
                        String(isEnabled)
                    );


                    slider.style.background =
                        isEnabled
                            ? "#0095f6"
                            : "#ccc";


                    if (message) {

                        message.style.color =
                            "#16803c";

                        message.textContent =
                            isEnabled
                                ? "تم تفعيل الإشعارات."
                                : "تم إيقاف الإشعارات.";
                    }
                }
            );
        }
    }


    /* =====================================================
       المظهر
    ===================================================== */

    function openAppearanceSettings() {

        const currentTheme =
            localStorage.getItem(
                "student_theme"
            ) ||
            "light";


        openPanel(
            "المظهر",
            `
            <div style="
                display:flex;
                flex-direction:column;
                gap:10px;
            ">

                <button
                    type="button"
                    data-theme="light"
                    style="
                        width:100%;
                        border:2px solid ${
                            currentTheme ===
                            "light"
                                ? "#0095f6"
                                : "transparent"
                        };
                        background:#f7f8fa;
                        padding:15px;
                        border-radius:14px;
                        text-align:right;
                        cursor:pointer;
                    "
                >
                    ☀️ الوضع الفاتح
                </button>


                <button
                    type="button"
                    data-theme="dark"
                    style="
                        width:100%;
                        border:2px solid ${
                            currentTheme ===
                            "dark"
                                ? "#0095f6"
                                : "transparent"
                        };
                        background:#222;
                        color:#fff;
                        padding:15px;
                        border-radius:14px;
                        text-align:right;
                        cursor:pointer;
                    "
                >
                    🌙 الوضع الداكن
                </button>


                <button
                    type="button"
                    data-theme="system"
                    style="
                        width:100%;
                        border:2px solid ${
                            currentTheme ===
                            "system"
                                ? "#0095f6"
                                : "transparent"
                        };
                        background:#f7f8fa;
                        padding:15px;
                        border-radius:14px;
                        text-align:right;
                        cursor:pointer;
                    "
                >
                    📱 حسب الجهاز
                </button>


                <div
                    id="theme-settings-message"
                    style="
                        text-align:center;
                        min-height:20px;
                        color:#16803c;
                        font-size:13px;
                    "
                ></div>

            </div>
            `
        );


        document
            .querySelectorAll(
                "[data-theme]"
            )
            .forEach(function (button) {

                button.addEventListener(
                    "click",
                    function () {

                        const theme =
                            button.dataset.theme;


                        localStorage.setItem(
                            "student_theme",
                            theme
                        );


                        applyTheme(
                            theme
                        );


                        const message =
                            document.getElementById(
                                "theme-settings-message"
                            );


                        if (message) {

                            message.textContent =
                                "تم حفظ المظهر.";
                        }

                    }
                );

            });
    }


    /* =====================================================
       تطبيق المظهر
    ===================================================== */

    function applyTheme(theme) {

        if (
            theme !== "dark" &&
            theme !== "light" &&
            theme !== "system"
        ) {
            theme = "light";
        }


        if (theme === "dark") {

            document.documentElement
                .setAttribute(
                    "data-student-theme",
                    "dark"
                );

            return;
        }


        if (theme === "light") {

            document.documentElement
                .setAttribute(
                    "data-student-theme",
                    "light"
                );

            return;
        }


        document.documentElement
            .setAttribute(
                "data-student-theme",
                "system"
            );
    }


    /* =====================================================
       اللغة
    ===================================================== */

    function openLanguageSettings() {

        openPanel(
            "اللغة",
            `
            <div style="
                display:flex;
                flex-direction:column;
                gap:10px;
            ">

                <button
                    id="student-language-ar"
                    type="button"
                    style="
                        width:100%;
                        border:2px solid #0095f6;
                        background:#f7f8fa;
                        padding:15px;
                        border-radius:14px;
                        text-align:right;
                        cursor:pointer;
                    "
                >
                    🇮🇶 العربية
                </button>


                <button
                    id="student-language-en"
                    type="button"
                    style="
                        width:100%;
                        border:2px solid transparent;
                        background:#f7f8fa;
                        padding:15px;
                        border-radius:14px;
                        text-align:right;
                        cursor:pointer;
                    "
                >
                    🇬🇧 English
                </button>


                <div
                    style="
                        color:#888;
                        font-size:12px;
                        text-align:center;
                        padding-top:5px;
                    "
                >
                    دعم اللغة الإنجليزية سيُستكمل
                    في مرحلة لاحقة.
                </div>

            </div>
            `
        );


        document
            .getElementById(
                "student-language-ar"
            )
            ?.addEventListener(
                "click",
                function () {

                    localStorage.setItem(
                        "student_language",
                        "ar"
                    );

                    document.documentElement
                        .lang = "ar";

                    document.documentElement
                        .dir = "rtl";

                    openSettings();
                }
            );


        document
            .getElementById(
                "student-language-en"
            )
            ?.addEventListener(
                "click",
                function () {

                    localStorage.setItem(
                        "student_language",
                        "en"
                    );

                    document.documentElement
                        .lang = "en";

                    document.documentElement
                        .dir = "ltr";

                    openPanel(
                        "English",
                        `
                        <div style="
                            text-align:center;
                            padding:25px 10px;
                        ">
                            <div style="
                                font-size:45px;
                                margin-bottom:12px;
                            ">
                                🇬🇧
                            </div>

                            <p style="
                                color:#777;
                                line-height:1.8;
                                margin:0;
                            ">
                                سيتم استكمال ترجمة
                                واجهة Student
                                إلى الإنجليزية لاحقًا.
                            </p>
                        </div>
                        `
                    );
                }
            );
    }


    /* =====================================================
       الأمان
    ===================================================== */

    function openSecuritySettings() {

        openPanel(
            "الأمان",
            `
            <div style="
                display:flex;
                flex-direction:column;
                gap:10px;
            ">

                <button
                    id="student-signout-others"
                    type="button"
                    style="
                        width:100%;
                        border:none;
                        background:#f7f8fa;
                        padding:15px;
                        border-radius:14px;
                        text-align:right;
                        cursor:pointer;
                    "
                >

                    <div style="
                        font-weight:700;
                    ">
                        تسجيل الخروج من الأجهزة الأخرى
                    </div>

                    <div style="
                        margin-top:5px;
                        color:#888;
                        font-size:12px;
                    ">
                        يبقى هذا الجهاز متصلًا
                    </div>

                </button>


                <button
                    id="student-signout-all"
                    type="button"
                    style="
                        width:100%;
                        border:none;
                        background:#fff2f2;
                        color:#d93025;
                        padding:15px;
                        border-radius:14px;
                        text-align:right;
                        cursor:pointer;
                    "
                >

                    <div style="
                        font-weight:700;
                    ">
                        تسجيل الخروج من جميع الأجهزة
                    </div>

                    <div style="
                        margin-top:5px;
                        color:#c77777;
                        font-size:12px;
                    ">
                        يشمل هذا الجهاز أيضًا
                    </div>

                </button>


                <div
                    id="security-settings-message"
                    style="
                        text-align:center;
                        min-height:20px;
                        font-size:13px;
                    "
                ></div>

            </div>
            `
        );


        document
            .getElementById(
                "student-signout-others"
            )
            ?.addEventListener(
                "click",
                signOutOtherDevices
            );


        document
            .getElementById(
                "student-signout-all"
            )
            ?.addEventListener(
                "click",
                signOutAllDevices
            );
    }


    /* =====================================================
       تسجيل الخروج من الأجهزة الأخرى
    ===================================================== */

    async function signOutOtherDevices() {

        const client =
            getSupabase();

        const message =
            document.getElementById(
                "security-settings-message"
            );


        if (!client) {
            return;
        }


        try {

            const {
                error
            } =
                await client.auth.signOut({
                    scope: "others"
                });


            if (error) {
                throw error;
            }


            if (message) {

                message.style.color =
                    "#16803c";

                message.textContent =
                    "تم تسجيل الخروج من الأجهزة الأخرى.";
            }

        } catch (error) {

            console.error(
                "Sign out others error:",
                error
            );

            if (message) {

                message.style.color =
                    "#d93025";

                message.textContent =
                    error?.message ||
                    "تعذر تسجيل الخروج من الأجهزة الأخرى.";
            }
        }
    }


    /* =====================================================
       تسجيل الخروج من جميع الأجهزة
    ===================================================== */

    async function signOutAllDevices() {

        const client =
            getSupabase();


        if (!client) {
            return;
        }


        const confirmed =
            window.confirm(
                "هل أنت متأكد أنك تريد تسجيل الخروج من جميع الأجهزة؟"
            );


        if (!confirmed) {
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

            console.error(
                "Global sign out error:",
                error
            );

            openPanel(
                "خطأ",
                `
                <div style="
                    text-align:center;
                    padding:25px 10px;
                    color:#d93025;
                ">
                    تعذر تسجيل الخروج من جميع الأجهزة.
                </div>
                `
            );
        }
    }


    /* =====================================================
       تحميل المظهر المحفوظ
    ===================================================== */

    function loadSavedSettings() {

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
            language === "en"
                ? "ltr"
                : "rtl";
    }


    /* =====================================================
       الدوال العامة
    ===================================================== */

    window.openStudentSettings =
        openSettings;

    window.showSettingsPanel =
        openSettings;

    window.applyStudentTheme =
        applyTheme;


    /* =====================================================
       بدء النظام
    ===================================================== */

    function startSettings() {

        loadSavedSettings();

    }


    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            startSettings
        );

    } else {

        startSettings();
    }

})();
