/* =========================================================
   Student - Settings System
========================================================= */

(function () {
    "use strict";

    if (window.__studentSettingsLoaded) return;
    window.__studentSettingsLoaded = true;


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


    function esc(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    /* =====================================================
       فتح نافذة إعدادات ثابتة
    ===================================================== */

    function openSettingsPanel(title, content) {

        if (
            typeof window.showFloatingPanel !==
            "function"
        ) {
            return;
        }

        window.showFloatingPanel(
            title,
            content
        );

        /*
           منع إغلاق الإعدادات عند الضغط على
           الخلفية، لكن السماح بزر × بالعمل.
        */

        const panel =
            document.getElementById(
                "floating-panel"
            );

        if (!panel) return;

        panel.addEventListener(
            "click",
            function (event) {

                if (
                    event.target === panel
                ) {
                    event.stopPropagation();
                }

            },
            true
        );
    }


    /* =====================================================
       زر الرجوع
    ===================================================== */

    function backToSettings() {
        openSettings();
    }


    function closeSettings() {

        if (
            typeof window.closeFloatingPanel ===
            "function"
        ) {
            window.closeFloatingPanel();
            return;
        }

        const panel =
            document.getElementById(
                "floating-panel"
            );

        if (panel) {
            panel.remove();
        }
    }


    /* =====================================================
       الرئيسية
    ===================================================== */

    function openSettings() {

        const sections = [

            {
                id: "account",
                icon: "fa-regular fa-user",
                title: "الحساب",
                text: "البريد الإلكتروني وكلمة المرور",
                action: openAccountSettings
            },

            {
                id: "privacy",
                icon: "fa-solid fa-lock",
                title: "الخصوصية",
                text: "خصوصية الحساب",
                action: openPrivacySettings
            },

            {
                id: "notifications",
                icon: "fa-regular fa-bell",
                title: "الإشعارات",
                text: "التحكم بالإشعارات",
                action: openNotificationSettings
            },

            {
                id: "appearance",
                icon: "fa-solid fa-palette",
                title: "المظهر",
                text: "فاتح أو داكن أو حسب الجهاز",
                action: openAppearanceSettings
            },

            {
                id: "language",
                icon: "fa-solid fa-language",
                title: "اللغة",
                text: "لغة واجهة التطبيق",
                action: openLanguageSettings
            },

            {
                id: "security",
                icon: "fa-solid fa-shield-halved",
                title: "الأمان",
                text: "إدارة جلسات تسجيل الدخول",
                action: openSecuritySettings
            }

        ];


        const html =
            sections.map(function (item) {

                return `
                    <button
                        type="button"
                        data-setting="${item.id}"
                        style="
                            width:100%;
                            border:none;
                            background:#f7f8fa;
                            padding:14px;
                            border-radius:15px;
                            text-align:right;
                            display:flex;
                            align-items:center;
                            gap:13px;
                            direction:rtl;
                            cursor:pointer;
                        "
                    >

                        <div style="
                            width:42px;
                            height:42px;
                            border-radius:12px;
                            background:#eaf5ff;
                            color:#0095f6;
                            display:flex;
                            align-items:center;
                            justify-content:center;
                            flex-shrink:0;
                            font-size:17px;
                        ">
                            <i class="${item.icon}"></i>
                        </div>

                        <div>

                            <div style="
                                font-weight:700;
                                color:#222;
                                font-size:15px;
                            ">
                                ${item.title}
                            </div>

                            <div style="
                                margin-top:4px;
                                color:#888;
                                font-size:12px;
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


        openSettingsPanel(
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


        sections.forEach(function (item) {

            document
                .querySelector(
                    `[data-setting="${item.id}"]`
                )
                ?.addEventListener(
                    "click",
                    item.action
                );

        });
    }


    /* =====================================================
       رأس الصفحات الداخلية
    ===================================================== */

    function pageHeader(title) {

        return `
            <button
                id="settings-back"
                type="button"
                style="
                    border:none;
                    background:#f1f3f5;
                    width:40px;
                    height:40px;
                    border-radius:50%;
                    cursor:pointer;
                    font-size:17px;
                    color:#333;
                "
            >
                <i class="fa-solid fa-arrow-right"></i>
            </button>

            <div style="
                font-size:19px;
                font-weight:700;
                color:#222;
            ">
                ${title}
            </div>
        `;
    }


    function bindBackButton() {

        document
            .getElementById(
                "settings-back"
            )
            ?.addEventListener(
                "click",
                backToSettings
            );
    }


    /* =====================================================
       الحساب
    ===================================================== */

    async function openAccountSettings() {

        const client =
            getSupabase();

        let email = "";

        if (client) {

            try {

                const result =
                    await client.auth.getUser();

                email =
                    result?.data?.user?.email ||
                    "";

            } catch (error) {

                console.error(
                    "User error:",
                    error
                );
            }
        }


        openSettingsPanel(
            "الحساب",
            `
            <div>

                <div style="
                    display:flex;
                    align-items:center;
                    gap:10px;
                    margin-bottom:18px;
                ">
                    ${pageHeader("الحساب")}
                </div>


                <div style="
                    display:flex;
                    flex-direction:column;
                    gap:10px;
                ">

                    <button
                        id="change-email"
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
                            font-size:12px;
                            color:#888;
                            direction:ltr;
                            text-align:right;
                        ">
                            ${esc(email)}
                        </div>

                    </button>


                    <button
                        id="change-password"
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
                            font-size:12px;
                            color:#888;
                        ">
                            تحديث كلمة مرور الحساب
                        </div>

                    </button>

                </div>

            </div>
            `
        );

        bindBackButton();


        document
            .getElementById(
                "change-email"
            )
            ?.addEventListener(
                "click",
                openChangeEmail
            );


        document
            .getElementById(
                "change-password"
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

        if (!client) return;


        openSettingsPanel(
            "تغيير البريد",
            `
            <div>

                <div style="
                    display:flex;
                    align-items:center;
                    gap:10px;
                    margin-bottom:18px;
                ">
                    ${pageHeader(
                        "تغيير البريد الإلكتروني"
                    )}
                </div>


                <form
                    id="email-form"
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
                            direction:ltr;
                        "
                    >


                    <button
                        type="submit"
                        id="email-save"
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
                        id="email-message"
                        style="
                            min-height:20px;
                            text-align:center;
                            font-size:13px;
                        "
                    ></div>

                </form>

            </div>
            `
        );

        bindBackButton();


        document
            .getElementById(
                "email-form"
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
                            .value
                            .trim();

                    const message =
                        document.getElementById(
                            "email-message"
                        );

                    const button =
                        document.getElementById(
                            "email-save"
                        );


                    button.disabled = true;
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
                            "تم إرسال طلب تأكيد البريد الإلكتروني.";

                    } catch (error) {

                        message.style.color =
                            "#d93025";

                        message.textContent =
                            error?.message ||
                            "تعذر تغيير البريد.";

                    } finally {

                        button.disabled = false;
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

        if (!client) return;


        openSettingsPanel(
            "كلمة المرور",
            `
            <div>

                <div style="
                    display:flex;
                    align-items:center;
                    gap:10px;
                    margin-bottom:18px;
                ">
                    ${pageHeader(
                        "تغيير كلمة المرور"
                    )}
                </div>


                <form
                    id="password-form"
                    style="
                        display:flex;
                        flex-direction:column;
                        gap:12px;
                    "
                >

                    <input
                        id="password-new"
                        type="password"
                        minlength="6"
                        placeholder="كلمة المرور الجديدة"
                        required
                        style="
                            padding:13px;
                            border:1px solid #ddd;
                            border-radius:11px;
                        "
                    >


                    <input
                        id="password-confirm"
                        type="password"
                        minlength="6"
                        placeholder="تأكيد كلمة المرور"
                        required
                        style="
                            padding:13px;
                            border:1px solid #ddd;
                            border-radius:11px;
                        "
                    >


                    <button
                        type="submit"
                        id="password-save"
                        style="
                            border:none;
                            background:#0095f6;
                            color:white;
                            padding:13px;
                            border-radius:11px;
                        "
                    >
                        تحديث
                    </button>


                    <div
                        id="password-message"
                        style="
                            min-height:20px;
                            text-align:center;
                            font-size:13px;
                        "
                    ></div>

                </form>

            </div>
            `
        );

        bindBackButton();


        document
            .getElementById(
                "password-form"
            )
            ?.addEventListener(
                "submit",
                async function (event) {

                    event.preventDefault();

                    const password =
                        document.getElementById(
                            "password-new"
                        ).value;

                    const confirm =
                        document.getElementById(
                            "password-confirm"
                        ).value;

                    const message =
                        document.getElementById(
                            "password-message"
                        );

                    const button =
                        document.getElementById(
                            "password-save"
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

                        button.disabled = false;
                        button.textContent =
                            "تحديث";
                    }

                }
            );
    }


    /* =====================================================
       الخصوصية
    ===================================================== */

    function openPrivacySettings() {

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


        openSettingsPanel(
            "الخصوصية",
            `
            <div>

                <div style="
                    display:flex;
                    align-items:center;
                    gap:10px;
                    margin-bottom:18px;
                ">
                    ${pageHeader("الخصوصية")}
                </div>


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
                        id="account-privacy"
                        style="
                            width:100%;
                            padding:12px;
                            border:1px solid #ddd;
                            border-radius:10px;
                        "
                    >

                        <option
                            value="public"
                            ${status === "public" ? "selected" : ""}
                        >
                            حساب عام
                        </option>

                        <option
                            value="private"
                            ${status === "private" ? "selected" : ""}
                        >
                            حساب خاص
                        </option>

                    </select>

                </div>


                <button
                    id="privacy-save"
                    type="button"
                    style="
                        width:100%;
                        border:none;
                        background:#0095f6;
                        color:white;
                        padding:13px;
                        border-radius:11px;
                        margin-top:12px;
                    "
                >
                    حفظ
                </button>


                <div
                    id="privacy-message"
                    style="
                        min-height:20px;
                        text-align:center;
                        margin-top:10px;
                        font-size:13px;
                    "
                ></div>

            </div>
            `
        );

        bindBackButton();


        document
            .getElementById(
                "privacy-save"
            )
            ?.addEventListener(
                "click",
                async function () {

                    const client =
                        getSupabase();

                    const newStatus =
                        document.getElementById(
                            "account-privacy"
                        ).value;

                    const message =
                        document.getElementById(
                            "privacy-message"
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
                            "تم حفظ الخصوصية.";

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

    function openNotificationSettings() {

        const stored =
            localStorage.getItem(
                "student_notifications_enabled"
            );

        const enabled =
            stored !== "false";


        openSettingsPanel(
            "الإشعارات",
            `
            <div>

                <div style="
                    display:flex;
                    align-items:center;
                    gap:10px;
                    margin-bottom:18px;
                ">
                    ${pageHeader("الإشعارات")}
                </div>


                <div style="
                    background:#f7f8fa;
                    padding:16px;
                    border-radius:14px;
                    display:flex;
                    align-items:center;
                    justify-content:space-between;
                ">

                    <div>

                        <strong>
                            إشعارات التطبيق
                        </strong>

                        <div style="
                            color:#888;
                            font-size:12px;
                            margin-top:4px;
                        ">
                            تشغيل أو إيقاف تنبيهات التطبيق
                        </div>

                    </div>


                    <label style="
                        position:relative;
                        width:50px;
                        height:28px;
                    ">

                        <input
                            id="notification-toggle"
                            type="checkbox"
                            ${enabled ? "checked" : ""}
                            style="
                                display:none;
                            "
                        >

                        <span
                            id="notification-switch"
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
                    id="notification-message"
                    style="
                        text-align:center;
                        min-height:20px;
                        margin-top:10px;
                        font-size:13px;
                    "
                ></div>

            </div>
            `
        );

        bindBackButton();


        const toggle =
            document.getElementById(
                "notification-toggle"
            );

        const switchElement =
            document.getElementById(
                "notification-switch"
            );

        const message =
            document.getElementById(
                "notification-message"
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
                        ? "#0095f6"
                        : "#ccc";

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
            theme = "light";
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


        if (theme === "dark") {

            document.documentElement
                .style
                .colorScheme =
                "dark";

        } else if (
            theme === "light"
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


    function openAppearanceSettings() {

        const current =
            localStorage.getItem(
                "student_theme"
            ) ||
            "light";


        openSettingsPanel(
            "المظهر",
            `
            <div>

                <div style="
                    display:flex;
                    align-items:center;
                    gap:10px;
                    margin-bottom:18px;
                ">
                    ${pageHeader("المظهر")}
                </div>


                <div style="
                    display:flex;
                    flex-direction:column;
                    gap:10px;
                ">

                    <button
                        data-theme="light"
                        style="
                            border:2px solid ${
                                current === "light"
                                    ? "#0095f6"
                                    : "transparent"
                            };
                            background:#f7f8fa;
                            padding:16px;
                            border-radius:14px;
                            text-align:right;
                            cursor:pointer;
                        "
                    >
                        ☀️ الوضع الفاتح
                    </button>


                    <button
                        data-theme="dark"
                        style="
                            border:2px solid ${
                                current === "dark"
                                    ? "#0095f6"
                                    : "transparent"
                            };
                            background:#222;
                            color:white;
                            padding:16px;
                            border-radius:14px;
                            text-align:right;
                            cursor:pointer;
                        "
                    >
                        🌙 الوضع الداكن
                    </button>


                    <button
                        data-theme="system"
                        style="
                            border:2px solid ${
                                current === "system"
                                    ? "#0095f6"
                                    : "transparent"
                            };
                            background:#f7f8fa;
                            padding:16px;
                            border-radius:14px;
                            text-align:right;
                            cursor:pointer;
                        "
                    >
                        📱 حسب الجهاز
                    </button>

                </div>


                <div
                    id="theme-message"
                    style="
                        text-align:center;
                        min-height:20px;
                        margin-top:10px;
                        color:#16803c;
                        font-size:13px;
                    "
                ></div>

            </div>
            `
        );

        bindBackButton();


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

                        applyTheme(theme);

                        document
                            .querySelectorAll(
                                "[data-theme]"
                            )
                            .forEach(
                                function (item) {
                                    item.style.borderColor =
                                        item.dataset.theme ===
                                        theme
                                            ? "#0095f6"
                                            : "transparent";
                                }
                            );

                        document
                            .getElementById(
                                "theme-message"
                            )
                            .textContent =
                            "تم حفظ المظهر.";
                    }
                );
            });
    }


    /* =====================================================
       اللغة
    ===================================================== */

    function openLanguageSettings() {

        const current =
            localStorage.getItem(
                "student_language"
            ) ||
            "ar";


        openSettingsPanel(
            "اللغة",
            `
            <div>

                <div style="
                    display:flex;
                    align-items:center;
                    gap:10px;
                    margin-bottom:18px;
                ">
                    ${pageHeader("اللغة")}
                </div>


                <div style="
                    display:flex;
                    flex-direction:column;
                    gap:10px;
                ">

                    <button
                        data-language="ar"
                        style="
                            border:2px solid ${
                                current === "ar"
                                    ? "#0095f6"
                                    : "transparent"
                            };
                            background:#f7f8fa;
                            padding:16px;
                            border-radius:14px;
                            text-align:right;
                        "
                    >
                        🇮🇶 العربية
                    </button>


                    <button
                        data-language="en"
                        style="
                            border:2px solid ${
                                current === "en"
                                    ? "#0095f6"
                                    : "transparent"
                            };
                            background:#f7f8fa;
                            padding:16px;
                            border-radius:14px;
                            text-align:right;
                        "
                    >
                        🇬🇧 English
                    </button>

                </div>


                <div style="
                    color:#888;
                    text-align:center;
                    font-size:12px;
                    margin-top:12px;
                ">
                    الترجمة الإنجليزية الكاملة
                    ستُستكمل مع دعم اللغات.
                </div>

            </div>
            `
        );

        bindBackButton();


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
                                language === "en"
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

                                        item.style.borderColor =
                                            item.dataset.language ===
                                            language
                                                ? "#0095f6"
                                                : "transparent";
                                    }
                                );
                        }
                    );

                }
            );
    }


    /* =====================================================
       الأمان
    ===================================================== */

    function openSecuritySettings() {

        openSettingsPanel(
            "الأمان",
            `
            <div>

                <div style="
                    display:flex;
                    align-items:center;
                    gap:10px;
                    margin-bottom:18px;
                ">
                    ${pageHeader("الأمان")}
                </div>


                <div style="
                    display:flex;
                    flex-direction:column;
                    gap:10px;
                ">

                    <button
                        id="signout-others"
                        type="button"
                        style="
                            border:none;
                            background:#f7f8fa;
                            padding:16px;
                            border-radius:14px;
                            text-align:right;
                            cursor:pointer;
                        "
                    >

                        <strong>
                            تسجيل الخروج من الأجهزة الأخرى
                        </strong>

                        <div style="
                            color:#888;
                            font-size:12px;
                            margin-top:5px;
                        ">
                            يبقى هذا الجهاز متصلًا
                        </div>

                    </button>


                    <button
                        id="signout-all"
                        type="button"
                        style="
                            border:none;
                            background:#fff2f2;
                            color:#d93025;
                            padding:16px;
                            border-radius:14px;
                            text-align:right;
                            cursor:pointer;
                        "
                    >

                        <strong>
                            تسجيل الخروج من جميع الأجهزة
                        </strong>

                        <div style="
                            color:#c77777;
                            font-size:12px;
                            margin-top:5px;
                        ">
                            يشمل هذا الجهاز أيضًا
                        </div>

                    </button>

                </div>


                <div
                    id="security-message"
                    style="
                        text-align:center;
                        min-height:20px;
                        margin-top:10px;
                        font-size:13px;
                    "
                ></div>

            </div>
            `
        );

        bindBackButton();


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
                            "security-message"
                        );


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


                    const {
                        error
                    } =
                        await client.auth.signOut();


                    if (error) {

                        console.error(
                            error
                        );

                        return;
                    }

                }
            );
    }


    /* =====================================================
       تحميل المظهر واللغة المحفوظين
    ===================================================== */

    function loadStoredPreferences() {

        const theme =
            localStorage.getItem(
                "student_theme"
            ) ||
            "light";

        applyTheme(theme);


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

    window.showSettingsPanel =
        openSettings;

    window.openStudentSettings =
        openSettings;


    /* =====================================================
       تشغيل
    ===================================================== */

    loadStoredPreferences();

})();
