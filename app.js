/* =========================================================
   Student - Client Security Utilities
   XSS hardening + safe URL handling + lightweight a11y runtime
========================================================= */
(function () {
    "use strict";

    if (window.StudentSecurity) return;

    const SAFE_PROTOCOLS = new Set(["http:", "https:", "blob:"]);
    const SAFE_IMAGE_PROTOCOLS = new Set(["http:", "https:", "blob:", "data:"]);

    function escapeHTML(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function safeURL(value, options = {}) {
        const raw = String(value ?? "").trim();
        if (!raw) return "";

        // Local app paths are allowed.
        if (/^(?:\.?\.?\/|\/)(?!\/)/.test(raw) || raw.startsWith("#")) {
            return raw;
        }

        try {
            const url = new URL(raw, window.location.origin);
            const allowed = options.allowData ? SAFE_IMAGE_PROTOCOLS : SAFE_PROTOCOLS;
            return allowed.has(url.protocol) ? url.href : "";
        } catch (_) {
            return "";
        }
    }

    function sanitizeSearchTerm(value) {
        return String(value ?? "")
            .normalize("NFKC")
            .replace(/[,%()]/g, " ")
            .replace(/[\u0000-\u001F\u007F]/g, "")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 80);
    }

    function sanitizeHTML(html) {
        const template = document.createElement("template");
        template.innerHTML = String(html ?? "");

        template.content.querySelectorAll("script,object,embed,base,meta").forEach((node) => node.remove());

        const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_ELEMENT);
        let node = walker.nextNode();
        while (node) {
            for (const attr of Array.from(node.attributes)) {
                const name = attr.name.toLowerCase();
                const value = attr.value;

                if (name.startsWith("on") || name === "srcdoc") {
                    node.removeAttribute(attr.name);
                    continue;
                }

                if (["href", "src", "action", "formaction", "poster"].includes(name)) {
                    const isImageLike = name === "src" && ["IMG", "SOURCE"].includes(node.tagName);
                    const cleaned = safeURL(value, { allowData: isImageLike });
                    if (cleaned) node.setAttribute(attr.name, cleaned);
                    else node.removeAttribute(attr.name);
                }
            }

            if (node.tagName === "A" && node.getAttribute("target") === "_blank") {
                const rel = new Set((node.getAttribute("rel") || "").split(/\s+/).filter(Boolean));
                rel.add("noopener");
                rel.add("noreferrer");
                node.setAttribute("rel", Array.from(rel).join(" "));
            }
            node = walker.nextNode();
        }
        return template.innerHTML;
    }

    function setHTML(element, html) {
        if (!element) return;
        element.innerHTML = sanitizeHTML(html);
    }

    function enhanceAccessibility(root = document) {
        root.querySelectorAll("img:not([alt])").forEach((img) => img.setAttribute("alt", ""));
        root.querySelectorAll("button:not([type])").forEach((button) => button.setAttribute("type", "button"));

        root.querySelectorAll("[role='dialog']").forEach((dialog) => {
            if (!dialog.hasAttribute("aria-modal")) dialog.setAttribute("aria-modal", "true");
        });

        root.querySelectorAll("button, a[href], input, select, textarea, [tabindex]").forEach((el) => {
            if (!el.hasAttribute("aria-label") && !String(el.textContent || "").trim() && el.getAttribute("title")) {
                el.setAttribute("aria-label", el.getAttribute("title"));
            }
        });
    }

    let a11yQueued = false;
    function queueA11y() {
        if (a11yQueued) return;
        a11yQueued = true;
        requestAnimationFrame(() => {
            a11yQueued = false;
            enhanceAccessibility(document);
        });
    }

    document.addEventListener("DOMContentLoaded", () => {
        enhanceAccessibility(document);
        const observer = new MutationObserver(queueA11y);
        observer.observe(document.body, { childList: true, subtree: true });
    }, { once: true });

    window.StudentSecurity = Object.freeze({
        escapeHTML,
        safeURL,
        sanitizeSearchTerm,
        sanitizeHTML,
        setHTML,
        enhanceAccessibility
    });
})();

/* =========================================================
   Student - Main App
========================================================= */

let supabaseClient = null;

const CONFIG_URL =
    "https://raw.githubusercontent.com/hasan2llpm-prog/Student/main/config.json";

let currentUser = null;
let currentProfile = null;


/* =========================================================
   الرسائل
========================================================= */

function showMessage(elementId, message, type = "") {

    const element =
        document.getElementById(elementId);

    if (!element) return;

    element.textContent =
        message;

    element.className =
        "auth-message";

    if (type) {
        element.classList.add(type);
    }
}


function clearMessages() {

    showMessage(
        "login-message",
        ""
    );

    showMessage(
        "register-message",
        ""
    );
}


/* =========================================================
   حالة الأزرار
========================================================= */

function setButtonLoading(
    buttonId,
    loading,
    normalText
) {

    const button =
        document.getElementById(buttonId);

    if (!button) return;

    button.disabled =
        loading;

    button.textContent =
        loading
            ? "جارٍ التنفيذ..."
            : normalText;
}


/* =========================================================
   تسجيل الدخول / التسجيل
========================================================= */

function showLogin() {

    const loginSection =
        document.getElementById(
            "login-section"
        );

    const registerSection =
        document.getElementById(
            "register-section"
        );

    if (loginSection) {

        loginSection.classList.remove(
            "hidden"
        );
    }

    if (registerSection) {

        registerSection.classList.add(
            "hidden"
        );
    }

    clearMessages();
}


function showRegister() {

    const loginSection =
        document.getElementById(
            "login-section"
        );

    const registerSection =
        document.getElementById(
            "register-section"
        );

    if (registerSection) {

        registerSection.classList.remove(
            "hidden"
        );
    }

    if (loginSection) {

        loginSection.classList.add(
            "hidden"
        );
    }

    clearMessages();
}


/* =========================================================
   الشاشات
========================================================= */

function showMainScreen() {

    const authScreen =
        document.getElementById(
            "auth-screen"
        );

    const mainScreen =
        document.getElementById(
            "main-screen"
        );

    if (authScreen) {

        authScreen.classList.add(
            "hidden"
        );
    }

    if (mainScreen) {

        mainScreen.classList.remove(
            "hidden"
        );
    }
}


function showAuthScreen() {

    const mainScreen =
        document.getElementById(
            "main-screen"
        );

    const authScreen =
        document.getElementById(
            "auth-screen"
        );

    if (mainScreen) {

        mainScreen.classList.add(
            "hidden"
        );
    }

    if (authScreen) {

        authScreen.classList.remove(
            "hidden"
        );
    }

    showLogin();
}


/* =========================================================
   تحميل الملف الشخصي
========================================================= */

async function loadProfile(userId) {

    if (
        !supabaseClient ||
        !userId
    ) {
        return null;
    }

    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("profiles")
                .select(`
                    id,
                    full_name,
                    username,
                    email,
                    bio,
                    avatar_url,
                    account_status,
                    role,
                    account_type_selected,
                    role_selected_at
                `)
                .eq(
                    "id",
                    userId
                )
                .maybeSingle();

        if (error) {

            console.error(
                "Profile error:",
                error
            );

            return null;
        }

        currentProfile =
            data || null;

        const welcomeUser =
            document.getElementById(
                "welcome-user"
            );

        if (!welcomeUser) {

            return data;
        }

        if (data?.full_name) {

            welcomeUser.textContent =
                `مرحباً ${data.full_name}`;

        } else if (data?.username) {

            welcomeUser.textContent =
                `مرحباً @${data.username}`;

        } else {

            welcomeUser.textContent =
                "مرحباً بك";
        }

        return data;

    } catch (error) {

        console.error(
            "Profile error:",
            error
        );

        return null;
    }
}


/* =========================================================
   إحصائيات الملف الشخصي
========================================================= */

async function getProfileStats(userId) {

    if (
        !supabaseClient ||
        !userId
    ) {

        return {
            followers: 0,
            following: 0
        };
    }

    try {

        const {
            data,
            error
        } =
            await supabaseClient.rpc(
                "get_profile_stats",
                {
                    p_user_id:
                        userId
                }
            );

        if (error) {

            console.error(
                "Profile stats error:",
                error
            );

            return {
                followers: 0,
                following: 0
            };
        }

        const stats =
            Array.isArray(data)
                ? data[0]
                : data;

        return {

            followers:
                Number(
                    stats?.followers_count ||
                    0
                ),

            following:
                Number(
                    stats?.following_count ||
                    0
                )
        };

    } catch (error) {

        console.error(
            "Stats error:",
            error
        );

        return {
            followers: 0,
            following: 0
        };
    }
}


/* =========================================================
   الجلسة
========================================================= */

async function handleSession(
    session
) {

    document.body.classList.add("student-session-resolved");

    if (session?.user) {

        currentUser =
            session.user;

        showMainScreen();

        await loadProfile(
            session.user.id
        );

        await openAccountRoleOnboarding();

    } else {

        currentUser =
            null;

        currentProfile =
            null;

        showAuthScreen();

        await openAccountRoleOnboarding();
    }
}


/* =========================================================
   تسجيل الدخول
========================================================= */

async function loginUser(
    event
) {

    event.preventDefault();

    clearMessages();

    if (!supabaseClient) {

        showMessage(
            "login-message",
            "خدمة تسجيل الدخول غير جاهزة حالياً.",
            "error"
        );

        return;
    }

    const emailElement =
        document.getElementById(
            "login-email"
        );

    const passwordElement =
        document.getElementById(
            "login-password"
        );

    if (
        !emailElement ||
        !passwordElement
    ) {
        return;
    }

    const email =
        emailElement.value.trim();

    const password =
        passwordElement.value;

    if (
        !email ||
        !password
    ) {

        showMessage(
            "login-message",
            "اكتب البريد الإلكتروني وكلمة المرور.",
            "error"
        );

        return;
    }

    setButtonLoading(
        "login-btn",
        true,
        "دخول"
    );

    try {

        const {
            data,
            error
        } =
            await supabaseClient.auth
                .signInWithPassword({
                    email,
                    password
                });

        if (error) {
            throw error;
        }

        if (!data?.session) {

            throw new Error(
                "لم يتم إنشاء جلسة تسجيل الدخول."
            );
        }

        await handleSession(
            data.session
        );

    } catch (error) {

        console.error(
            "Login error:",
            error
        );

        showMessage(
            "login-message",
            translateAuthError(
                error
            ),
            "error"
        );

    } finally {

        setButtonLoading(
            "login-btn",
            false,
            "دخول"
        );
    }
}


/* =========================================================
   إنشاء الحساب
========================================================= */

async function registerUser(
    event
) {

    event.preventDefault();

    clearMessages();

    if (!supabaseClient) {

        showMessage(
            "register-message",
            "خدمة التسجيل غير جاهزة حالياً.",
            "error"
        );

        return;
    }

    const nameElement =
        document.getElementById(
            "register-name"
        );

    const emailElement =
        document.getElementById(
            "register-email"
        );

    const passwordElement =
        document.getElementById(
            "register-password"
        );

    const confirmPasswordElement =
        document.getElementById(
            "register-password-confirm"
        );

    if (
        !nameElement ||
        !emailElement ||
        !passwordElement ||
        !confirmPasswordElement
    ) {

        showMessage(
            "register-message",
            "حقول التسجيل غير مكتملة.",
            "error"
        );

        return;
    }

    const fullName =
        nameElement.value.trim();

    const email =
        emailElement.value.trim();

    const password =
        passwordElement.value;

    const confirmPassword =
        confirmPasswordElement.value;

    if (!fullName) {

        showMessage(
            "register-message",
            "اكتب الاسم الكامل.",
            "error"
        );

        return;
    }

    if (!email) {

        showMessage(
            "register-message",
            "اكتب البريد الإلكتروني.",
            "error"
        );

        return;
    }

    if (
        password.length < 6
    ) {

        showMessage(
            "register-message",
            "كلمة المرور يجب أن تكون 6 أحرف على الأقل.",
            "error"
        );

        return;
    }

    if (
        password !==
        confirmPassword
    ) {

        showMessage(
            "register-message",
            "كلمتا المرور غير متطابقتين.",
            "error"
        );

        return;
    }

    setButtonLoading(
        "register-btn",
        true,
        "إنشاء الحساب"
    );

    try {

        const {
            data,
            error
        } =
            await supabaseClient.auth
                .signUp({

                    email,

                    password,

                    options: {

                        data: {

                            full_name:
                                fullName
                        }
                    }
                });

        if (error) {
            throw error;
        }

        if (data?.session) {

            await handleSession(
                data.session
            );

        } else {

            showMessage(
                "register-message",
                "تم إنشاء الحساب. تحقق من بريدك الإلكتروني لتأكيد الحساب.",
                "success"
            );
        }

    } catch (error) {

        console.error(
            "Register error:",
            error
        );

        showMessage(
            "register-message",
            translateAuthError(
                error
            ),
            "error"
        );

    } finally {

        setButtonLoading(
            "register-btn",
            false,
            "إنشاء الحساب"
        );
    }
}


/* =========================================================
   تسجيل الخروج
========================================================= */

async function logoutUser() {

    try {

        if (supabaseClient) {

            const {
                error
            } =
                await supabaseClient.auth
                    .signOut();

            if (error) {
                throw error;
            }
        }

        currentUser =
            null;

        currentProfile =
            null;

        closeFloatingPanel();

        showAuthScreen();

    } catch (error) {

        console.error(
            "Logout error:",
            error
        );

        showFloatingPanel(
            "تسجيل الخروج",
            `
            <div style="
                text-align:center;
                color:#666;
                padding:20px;
            ">
                تعذر تسجيل الخروج حالياً.
            </div>
            `
        );
    }
}


/* =========================================================
   ترجمة أخطاء Supabase
========================================================= */

function translateAuthError(
    error
) {

    const message =
        String(
            error?.message ||
            ""
        ).toLowerCase();

    if (
        message.includes(
            "invalid login credentials"
        )
    ) {

        return (
            "البريد الإلكتروني أو كلمة المرور غير صحيحة."
        );
    }

    if (
        message.includes(
            "email not confirmed"
        )
    ) {

        return (
            "يجب تأكيد البريد الإلكتروني أولاً."
        );
    }

    if (
        message.includes(
            "user already registered"
        )
    ) {

        return (
            "هذا البريد الإلكتروني مسجل مسبقاً."
        );
    }

    if (
        message.includes(
            "invalid email"
        )
    ) {

        return (
            "البريد الإلكتروني غير صالح."
        );
    }

    if (
        message.includes(
            "rate limit"
        )
    ) {

        return (
            "تم تجاوز عدد المحاولات. حاول لاحقاً."
        );
    }

    return (
        error?.message ||
        "حدث خطأ غير متوقع."
    );
}


/* =========================================================
   النوافذ العائمة
========================================================= */

function closeFloatingPanel() {
    const panel = document.getElementById("floating-panel");
    if (panel) panel.remove();
    if (window.StudentNavigation?.closeById) {
        window.StudentNavigation.closeById("legacy-floating-page");
    }
}

function showFloatingPanel(title, content) {
    if (window.StudentNavigation?.openPage) {
        return window.StudentNavigation.openPage({
            id: "legacy-floating-page",
            title: String(title || ""),
            html: String(content || ""),
            reuse: true
        });
    }
    closeFloatingPanel();
    const panel = document.createElement("section");
    panel.id = "floating-panel";
    panel.className = "student-internal-page";
    const safeTitle = window.StudentSecurity?.escapeHTML?.(title || "") ?? String(title || "").replace(/[&<>"\']/g, "");
    const panelHTML = `<header class="student-internal-header"><button id="floating-close" class="student-internal-back" type="button" aria-label="رجوع"><i class="fa-solid fa-arrow-right"></i></button><div class="student-internal-title">${safeTitle}</div></header><div class="student-internal-body">${String(content || "")}</div>`;
    panel.innerHTML = window.StudentSecurity?.sanitizeHTML?.(panelHTML) ?? panelHTML;
    document.body.appendChild(panel);
    panel.querySelector("#floating-close")?.addEventListener("click", closeFloatingPanel);
    return panel;
}

/* =========================================================
   الملف الشخصي
========================================================= */

async function showProfilePanel() {

    if (!currentUser) {
        return;
    }

    closeFloatingPanel();

    const profile =
        currentProfile ||
        await loadProfile(
            currentUser.id
        );

    const stats =
        await getProfileStats(
            currentUser.id
        );

    const fullName =
        profile?.full_name ||
        "بدون اسم";

    const username =
        profile?.username ||
        "username";

    const email =
        profile?.email ||
        currentUser.email ||
        "";

    const bio =
        profile?.bio ||
        "لا توجد نبذة بعد.";

    const status =
        profile?.account_status ||
        "public";

    const avatar =
        profile?.avatar_url;

    const avatarHTML =
        avatar
            ? `
                <img
                    src="${escapeHTML(
                        avatar
                    )}"
                    alt=""
                    style="
                        width:96px;
                        height:96px;
                        border-radius:50%;
                        object-fit:cover;
                        display:block;
                    "
                >
              `
            : `
                <div style="
                    width:96px;
                    height:96px;
                    border-radius:50%;
                    background:#eaf5ff;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    font-size:42px;
                    color:#0095f6;
                ">
                    <i class="
                        fa-solid
                        fa-user
                    "></i>
                </div>
              `;

    showFloatingPanel(
        "الملف الشخصي",
        `
        <div>

            <div style="
                text-align:center;
                margin-bottom:20px;
            ">

                <div style="
                    width:96px;
                    height:96px;
                    margin:0 auto 12px;
                ">
                    ${avatarHTML}
                </div>

                <div style="
                    font-size:20px;
                    font-weight:700;
                    color:#222;
                ">
                    ${escapeHTML(
                        fullName
                    )}
                </div>

                <div style="
                    color:#777;
                    margin-top:4px;
                    font-size:14px;
                ">
                    @${escapeHTML(
                        username
                    )}
                </div>

            </div>


            <div style="
                display:flex;
                justify-content:space-around;
                text-align:center;
                border-top:1px solid #eee;
                border-bottom:1px solid #eee;
                padding:15px 5px;
                margin-bottom:18px;
            ">

                <div>

                    <strong style="
                        display:block;
                        font-size:19px;
                    ">
                        0
                    </strong>

                    <span style="
                        color:#777;
                        font-size:13px;
                    ">
                        المنشورات
                    </span>

                </div>


                <div>

                    <strong style="
                        display:block;
                        font-size:19px;
                    ">
                        ${stats.followers}
                    </strong>

                    <span style="
                        color:#777;
                        font-size:13px;
                    ">
                        المتابعون
                    </span>

                </div>


                <div>

                    <strong style="
                        display:block;
                        font-size:19px;
                    ">
                        ${stats.following}
                    </strong>

                    <span style="
                        color:#777;
                        font-size:13px;
                    ">
                        يتابعهم
                    </span>

                </div>

            </div>


            <div style="
                background:#f7f8fa;
                border-radius:14px;
                padding:14px;
                margin-bottom:12px;
            ">

                <div style="
                    font-weight:700;
                    margin-bottom:6px;
                ">
                    نبذة
                </div>

                <div style="
                    color:#666;
                    line-height:1.7;
                ">
                    ${escapeHTML(
                        bio
                    )}
                </div>

            </div>


            <div style="
                background:#f7f8fa;
                border-radius:14px;
                padding:14px;
                margin-bottom:12px;
            ">

                <div style="
                    font-weight:700;
                    margin-bottom:6px;
                ">
                    البريد الإلكتروني
                </div>

                <div style="
                    color:#666;
                    direction:ltr;
                    text-align:right;
                ">
                    ${escapeHTML(
                        email
                    )}
                </div>

            </div>


            <div style="
                display:flex;
                align-items:center;
                justify-content:space-between;
                background:#f7f8fa;
                border-radius:14px;
                padding:14px;
                margin-bottom:15px;
            ">

                <div>

                    <div style="
                        font-weight:700;
                    ">
                        خصوصية الحساب
                    </div>

                    <div id="profile-status-text"
                        style="
                            color:#777;
                            font-size:13px;
                            margin-top:4px;
                        ">
                        ${
                            status ===
                            "private"
                                ? "حساب خاص"
                                : "حساب عام"
                        }
                    </div>

                </div>


                <button
                    id="profile-toggle-status"
                    type="button"
                    style="
                        border:none;
                        background:#0095f6;
                        color:#fff;
                        padding:9px 14px;
                        border-radius:10px;
                        cursor:pointer;
                    "
                >
                    ${
                        status ===
                        "private"
                            ? "جعله عامًا"
                            : "جعله خاصًا"
                    }
                </button>

            </div>


            <div style="
                display:grid;
                grid-template-columns:1fr 1fr;
                gap:10px;
            ">

                <button
                    id="profile-edit-btn"
                    type="button"
                    style="
                        border:none;
                        background:#0095f6;
                        color:#fff;
                        padding:13px;
                        border-radius:12px;
                        font-size:15px;
                        cursor:pointer;
                    "
                >
                    <i class="
                        fa-solid
                        fa-pen
                    "></i>
                    تعديل الملف
                </button>


                <button
                    id="profile-logout-btn"
                    type="button"
                    style="
                        border:none;
                        background:#fff2f2;
                        color:#d93025;
                        padding:13px;
                        border-radius:12px;
                        font-size:15px;
                        cursor:pointer;
                    "
                >
                    تسجيل الخروج
                </button>

            </div>

        </div>
        `
    );


    const editButton =
        document.getElementById(
            "profile-edit-btn"
        );

    if (editButton) {

        editButton.addEventListener(
            "click",
            function() {

                showEditProfilePanel(
                    profile
                );
            }
        );
    }


    const logoutButton =
        document.getElementById(
            "profile-logout-btn"
        );

    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            logoutUser
        );
    }


    const privacyButton =
        document.getElementById(
            "profile-toggle-status"
        );

    if (privacyButton) {

        privacyButton.addEventListener(
            "click",
            toggleAccountStatus
        );
    }
}


/* =========================================================
   تعديل الملف الشخصي
========================================================= */

function showEditProfilePanel(
    profile
) {

    const fullName =
        profile?.full_name ||
        "";

    const username =
        profile?.username ||
        "";

    const bio =
        profile?.bio ||
        "";

    const avatarURL =
        profile?.avatar_url ||
        "";

    showFloatingPanel(
        "تعديل الملف الشخصي",
        `
        <form
            id="edit-profile-form"
            style="
                display:flex;
                flex-direction:column;
                gap:12px;
            "
        >

            <label>
                الاسم
            </label>

            <input
                id="edit-full-name"
                type="text"
                value="${escapeAttribute(
                    fullName
                )}"
                required
                style="
                    padding:13px;
                    border:1px solid #ddd;
                    border-radius:10px;
                "
            >


            <label>
                اسم المستخدم
            </label>

            <input
                id="edit-username"
                type="text"
                value="${escapeAttribute(
                    username
                )}"
                minlength="3"
                required
                style="
                    padding:13px;
                    border:1px solid #ddd;
                    border-radius:10px;
                    direction:ltr;
                "
            >


            <label>
                النبذة
            </label>

            <textarea
                id="edit-bio"
                maxlength="200"
                style="
                    min-height:90px;
                    resize:none;
                    padding:13px;
                    border:1px solid #ddd;
                    border-radius:10px;
                "
            >${escapeHTML(
                bio
            )}</textarea>


            <label>
                رابط الصورة الشخصية
            </label>

            <input
                id="edit-avatar-url"
                type="url"
                value="${escapeAttribute(
                    avatarURL
                )}"
                style="
                    padding:13px;
                    border:1px solid #ddd;
                    border-radius:10px;
                    direction:ltr;
                "
            >


            <button
                id="save-profile-btn"
                type="submit"
                style="
                    border:none;
                    background:#0095f6;
                    color:#fff;
                    padding:13px;
                    border-radius:12px;
                    cursor:pointer;
                "
            >
                حفظ التغييرات
            </button>


            <div
                id="profile-edit-message"
                style="
                    text-align:center;
                    min-height:20px;
                "
            ></div>

        </form>
        `
    );


    const form =
        document.getElementById(
            "edit-profile-form"
        );

    if (form) {

        form.addEventListener(
            "submit",
            saveProfileChanges
        );
    }
}


/* =========================================================
   حفظ تعديل الملف
========================================================= */

async function saveProfileChanges(
    event
) {

    event.preventDefault();


    const fullName =
        document.getElementById(
            "edit-full-name"
        )?.value.trim();


    const username =
        document.getElementById(
            "edit-username"
        )?.value.trim();


    const bio =
        document.getElementById(
            "edit-bio"
        )?.value.trim();


    const avatarURL =
        document.getElementById(
            "edit-avatar-url"
        )?.value.trim();


    const message =
        document.getElementById(
            "profile-edit-message"
        );


    if (
        !fullName ||
        !username
    ) {

        if (message) {

            message.style.color =
                "#d93025";

            message.textContent =
                "الاسم واسم المستخدم مطلوبان.";
        }

        return;
    }


    const button =
        document.getElementById(
            "save-profile-btn"
        );


    if (button) {

        button.disabled =
            true;

        button.textContent =
            "جارٍ الحفظ...";
    }


    try {

        const {
            data,
            error
        } =
            await supabaseClient.rpc(
                "update_profile",
                {
                    p_full_name:
                        fullName,

                    p_username:
                        username,

                    p_bio:
                        bio || "",

                    p_avatar_url:
                        avatarURL || null
                }
            );


        if (error) {
            throw error;
        }


        if (
            data !==
            "updated"
        ) {

            if (
                data ===
                "username_taken"
            ) {

                throw new Error(
                    "اسم المستخدم مستخدم بالفعل."
                );
            }


            if (
                data ===
                "invalid_username"
            ) {

                throw new Error(
                    "اسم المستخدم يجب أن يحتوي على 3 أحرف على الأقل."
                );
            }


            throw new Error(
                "تعذر تحديث الملف الشخصي."
            );
        }


        await loadProfile(
            currentUser.id
        );


        if (message) {

            message.style.color =
                "#16803c";

            message.textContent =
                "تم حفظ التغييرات بنجاح.";
        }


        setTimeout(
            function() {

                showProfilePanel();

            },
            700
        );


    } catch (error) {

        console.error(
            "Update profile error:",
            error
        );


        if (message) {

            message.style.color =
                "#d93025";

            message.textContent =
                error?.message ||
                "تعذر حفظ التغييرات.";
        }


    } finally {

        if (button) {

            button.disabled =
                false;

            button.textContent =
                "حفظ التغييرات";
        }
    }
}


/* =========================================================
   تبديل الخصوصية
========================================================= */

async function toggleAccountStatus() {

    if (!currentProfile) {
        return;
    }


    const newStatus =
        currentProfile.account_status ===
        "private"
            ? "public"
            : "private";


    try {

        const {
            data,
            error
        } =
            await supabaseClient.rpc(
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
            data !==
                "public" &&
            data !==
                "private"
        ) {

            throw new Error(
                "تعذر تغيير خصوصية الحساب."
            );
        }


        await loadProfile(
            currentUser.id
        );


        showProfilePanel();


    } catch (error) {

        console.error(
            "Privacy error:",
            error
        );


        showFloatingPanel(
            "خطأ",
            `
            <div style="
                text-align:center;
                padding:25px 10px;
                color:#d93025;
            ">
                تعذر تغيير خصوصية الحساب حالياً.
            </div>
            `
        );
    }
}


/* =========================================================
   حماية HTML
========================================================= */

function escapeHTML(
    value
) {

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


function escapeAttribute(
    value
) {

    return escapeHTML(
        value
    );
}


/* =========================================================
   اختيار نوع الحساب
========================================================= */

function loadAccountRoleOnboardingModule() {
    // الوحدة مدمجة داخل app.js؛ لا تنشئ طلب شبكة لملف غير موجود.
    return window.StudentAccountRoleOnboarding
        ? Promise.resolve()
        : Promise.reject(new Error("وحدة اختيار نوع الحساب غير جاهزة"));
}


async function openAccountRoleOnboarding() {

    try {
        await loadAccountRoleOnboardingModule();

        if (!window.StudentAccountRoleOnboarding?.open) {
            return;
        }

        await window.StudentAccountRoleOnboarding.open({
            supabaseClient: supabaseClient,
            user: currentUser,
            profile: currentProfile,
            onSelected: async function(profile) {
                if (profile) {
                    currentProfile = profile;
                }
            }
        });

    } catch (error) {
        console.error("Account role onboarding error:", error);
    }
}


/* =========================================================
   المراحل الدراسية
========================================================= */

function loadEducationModule() {

    if (window.StudentEducationOpenStage) {
        return Promise.resolve();
    }

    if (window.__studentEducationLoading) {
        return window.__studentEducationLoading;
    }

    window.__studentEducationLoading = new Promise(function(resolve, reject) {

        const existing = document.querySelector('script[data-student-education="true"]');

        if (existing) {
            existing.addEventListener("load", resolve, { once: true });
            existing.addEventListener("error", reject, { once: true });
            return;
        }

        const script = document.createElement("script");
        script.src = "education-admin.js?v=1.1.0";
        script.async = true;
        script.dataset.studentEducation = "true";
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });

    return window.__studentEducationLoading;
}


async function openStage(
    stageName
) {

    showFloatingPanel(
        "التعليم",
        `<div style="padding:30px 12px;text-align:center;color:#666;">جارٍ التحميل...</div>`
    );

    try {
        await loadEducationModule();

        if (typeof window.StudentEducationOpenStage !== "function") {
            throw new Error("Education module did not initialize");
        }

        window.StudentEducationOpenStage(stageName);

    } catch (error) {
        console.error("Education module:", error);

        showFloatingPanel(
            "التعليم",
            `<div style="padding:28px 12px;text-align:center;color:#d93025;line-height:1.8;">تعذر فتح قسم التعليم حاليًا.</div>`
        );
    }
}


window.openStage =
    openStage;


/* =========================================================
   القائمة العائمة
========================================================= */

function openMenu() {

    showFloatingPanel(
        "القائمة",
        `
        <div style="
            display:flex;
            flex-direction:column;
            gap:10px;
        ">

            <button
                id="menu-profile-btn"
                type="button"
                style="
                    width:100%;
                    border:none;
                    background:#f7f8fa;
                    padding:15px;
                    border-radius:14px;
                    text-align:right;
                    font-size:15px;
                    cursor:pointer;
                "
            >
                👤 الملف الشخصي
            </button>


            <button
                id="menu-settings-btn"
                type="button"
                style="
                    width:100%;
                    border:none;
                    background:#f7f8fa;
                    padding:15px;
                    border-radius:14px;
                    text-align:right;
                    font-size:15px;
                    cursor:pointer;
                "
            >
                ⚙️ الإعدادات
            </button>


            <button
                id="menu-logout-btn"
                type="button"
                style="
                    width:100%;
                    border:none;
                    background:#fff2f2;
                    color:#d93025;
                    padding:15px;
                    border-radius:14px;
                    text-align:right;
                    font-size:15px;
                    cursor:pointer;
                "
            >
                🚪 تسجيل الخروج
            </button>

        </div>
        `
    );


    document
        .getElementById(
            "menu-profile-btn"
        )
        ?.addEventListener(
            "click",
            showProfilePanel
        );


    document
        .getElementById(
            "menu-settings-btn"
        )
        ?.addEventListener(
            "click",
            showSettingsPanel
        );


    document
        .getElementById(
            "menu-logout-btn"
        )
        ?.addEventListener(
            "click",
            logoutUser
        );
}


/* =========================================================
   الإعدادات
========================================================= */

function showSettingsPanel() {

    showFloatingPanel(
        "الإعدادات",
        `
        <div style="
            display:flex;
            flex-direction:column;
            gap:10px;
        ">

            <div style="
                display:flex;
                justify-content:space-between;
                padding:15px;
                background:#f7f8fa;
                border-radius:14px;
            ">

                <span>
                    اللغة
                </span>

                <strong>
                    العربية
                </strong>

            </div>


            <div style="
                display:flex;
                justify-content:space-between;
                padding:15px;
                background:#f7f8fa;
                border-radius:14px;
            ">

                <span>
                    الإشعارات
                </span>

                <strong>
                    مفعلة
                </strong>

            </div>

        </div>
        `
    );
}


/* =========================================================
   الإشعارات
========================================================= */

function openNotifications() {

    showFloatingPanel(
        "الإشعارات",
        `
        <div style="
            text-align:center;
            padding:30px 10px;
        ">

            <div style="
                font-size:50px;
                margin-bottom:15px;
            ">
                🔔
            </div>

            <p style="
                color:#666;
                margin:0;
            ">
                لا توجد إشعارات جديدة.
            </p>

        </div>
        `
    );
}


/* =========================================================
   تحميل المتجر المستقل عند الحاجة فقط
========================================================= */
function openStudentStoreSection() {

    if (window.StudentStore?.open) {
        window.StudentStore.open();
        return;
    }

    const existing = document.querySelector(
        'script[data-student-store="true"]'
    );

    if (existing) {
        existing.addEventListener(
            "load",
            function () {
                window.StudentStore?.open?.();
            },
            { once: true }
        );
        return;
    }

    const script = document.createElement("script");
    script.src = "store.js?v=1.2.0";
    script.async = true;
    script.dataset.studentStore = "true";

    script.onload = function () {
        window.StudentStore?.open?.();
    };

    script.onerror = function () {
        showFloatingPanel(
            "المتجر",
            `<div style="padding:35px 15px;text-align:center;color:#777;line-height:1.8;">تعذر فتح المتجر حاليًا.</div>`
        );
    };

    document.body.appendChild(script);
}

/* =========================================================
   الشريط السفلي
========================================================= */

function openBottomSection(section) {

    if (section === "home") {
        if (typeof closeFloatingPanel === "function") {
            closeFloatingPanel();
        }
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
    }

    if (section === "store") {
        openStudentStoreSection();
        return;
    }

    if (section === "search") {
        if (typeof window.openStudentSearch === "function") {
            window.openStudentSearch();
            return;
        }
    }
    if (section === "messages") {
        window.openStudentMessages?.();
        return;
    }

    const sections = {
        search: {
            title: "البحث",
            icon: "🔎",
            text: "سيتم إضافة البحث هنا."
        },
        messages: {
            title: "الرسائل",
            icon: "💬",
            text: "ستظهر المحادثات هنا."
        }
    };

    const item = sections[section] || sections.search;

    showFloatingPanel(
        item.title,
        `
        <div style="text-align:center;padding:25px;">
            <div style="font-size:50px;margin-bottom:15px;">${item.icon}</div>
            <p style="color:#666;line-height:1.8;margin:0;">${item.text}</p>
        </div>
        `
    );
}

/* =========================================================
   ربط الواجهة
========================================================= */

function bindInterfaceButtons() {

    const bell =
        document.querySelector(
            ".fa-bell"
        );


    if (bell) {

        bell.style.cursor =
            "pointer";


        bell.addEventListener(
            "click",
            function(event) {

                event.preventDefault();

                openNotifications();
            }
        );
    }


    const menuIcon =
        document.getElementById(
            "menu-icon"
        );


    if (menuIcon) {

        menuIcon.style.cursor =
            "pointer";


        menuIcon.addEventListener(
            "click",
            function(event) {

                event.preventDefault();

                openMenu();
            }
        );
    }


    const navLinks =
        document.querySelectorAll(
            "nav a"
        );




    navLinks.forEach(
        function(
            link,
            index
        ) {

            link.addEventListener(
                "click",
                function(event) {

                    event.preventDefault();


                    navLinks.forEach(
                        function(item) {

                            item.classList.remove(
                                "active"
                            );
                        }
                    );


                    link.classList.add(
                        "active"
                    );


                    openBottomSection(
                        link.dataset.section || "home"
                    );
                }
            );
        }
    );
}


/* =========================================================
   تحميل ملف خارجي
========================================================= */

function loadExternalScript(src, dataAttribute, label) {
    window.__studentScriptPromises = window.__studentScriptPromises || new Map();
    const key = String(src).split("?")[0];
    if (window.__studentScriptPromises.has(key)) {
        return window.__studentScriptPromises.get(key);
    }
    const existing = document.querySelector(`script[data-${dataAttribute}="true"]`);
    if (existing?.dataset.loaded === "true") return Promise.resolve(existing);
    const promise = new Promise(function(resolve, reject) {
        const script = existing || document.createElement("script");
        if (!existing) {
            script.src = src;
            script.async = true;
            script.setAttribute(`data-${dataAttribute}`, "true");
            document.body.appendChild(script);
        }
        script.addEventListener("load", function() {
            script.dataset.loaded = "true";
            console.log(`${label} loaded.`);
            resolve(script);
        }, { once: true });
        script.addEventListener("error", function() {
            window.__studentScriptPromises.delete(key);
            console.error(`تعذر تحميل ${src}`);
            reject(new Error(`تعذر تحميل ${src}`));
        }, { once: true });
    });
    window.__studentScriptPromises.set(key, promise);
    return promise;
}


/* =========================================================
   تحميل لوحة المشرف
========================================================= */

function loadNavigationManager() { return Promise.resolve(window.StudentNavigation);
}


function loadAdminSystem() {

    loadExternalScript(
        "education-admin.js?v=1.1.0",
        "student-admin",
        "Student Admin"
    );
}


/* =========================================================
   تحميل القائمة
========================================================= */

function loadMenuSystem() { return loadSettingsSystem();
}


/* =========================================================
   تحميل الإعدادات
========================================================= */

function loadSettingsSystem() {

    loadExternalScript(
        "settings.js",
        "student-settings",
        "Student Settings"
    );
}


/* =========================================================
   تحميل المنشورات
========================================================= */

function loadPostsSystem() { return Promise.resolve();
}


/* =========================================================
   تحميل البحث
========================================================= */

function loadSearchSystem() { return Promise.resolve(window.openStudentSearch);
}


/* =========================================================
   تحميل Feed
========================================================= */

function loadFeedSystem() { return Promise.resolve(window.loadStudentFeed);
}


/* =========================================================
   تهيئة Supabase
========================================================= */

async function initSupabase() {

    if (!window.supabase) {

        console.error(
            "مكتبة Supabase غير محملة."
        );

        return;
    }


    try {

        const response =
            await fetch(
                CONFIG_URL,
                {
                    cache:
                        "no-store"
                }
            );


        if (!response.ok) {

            throw new Error(
                "تعذر تحميل config.json."
            );
        }


        const config =
            await response.json();


        if (
            !config.supabase_url ||
            !config.supabase_key
        ) {

            throw new Error(
                "بيانات Supabase ناقصة."
            );
        }


        supabaseClient =
            window.supabase.createClient(
                config.supabase_url,
                config.supabase_key
            );


        console.log(
            "Supabase connected."
        );


        const {
            data: {
                session
            }
        } =
            await supabaseClient.auth
                .getSession();


        await handleSession(
            session
        );


        supabaseClient.auth
            .onAuthStateChange(
                async function(
                    event,
                    session
                ) {

                    console.log(
                        "Auth event:",
                        event
                    );


                    if (

                        event ===
                            "SIGNED_IN" ||

                        event ===
                            "SIGNED_OUT" ||

                        event ===
                            "INITIAL_SESSION" ||

                        event ===
                            "TOKEN_REFRESHED"

                    ) {

                        await handleSession(
                            session
                        );
                    }
                }
            );


    } catch (error) {

        console.error(
            "Supabase initialization error:",
            error
        );
    }
}


/* =========================================================
   تهيئة التطبيق
========================================================= */

function initInterface() {

    const loginForm =
        document.getElementById(
            "login-form"
        );


    if (loginForm) {

        loginForm.addEventListener(
            "submit",
            loginUser
        );
    }


    const registerForm =
        document.getElementById(
            "register-form"
        );


    if (registerForm) {

        registerForm.addEventListener(
            "submit",
            registerUser
        );
    }


    const showRegisterButton =
        document.getElementById(
            "show-register"
        );


    if (showRegisterButton) {

        showRegisterButton.addEventListener(
            "click",
            function(event) {

                event.preventDefault();

                showRegister();
            }
        );
    }


    const showLoginButton =
        document.getElementById(
            "show-login"
        );


    if (showLoginButton) {

        showLoginButton.addEventListener(
            "click",
            function(event) {

                event.preventDefault();

                showLogin();
            }
        );
    }


    bindInterfaceButtons();
}


/* =========================================================
   تشغيل التطبيق
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function() {

        loadNavigationManager();

        initInterface();

        initSupabase();

        loadAdminSystem();

        loadSettingsSystem();

        loadSearchSystem();

        /* المنشورات أزيلت من الواجهة الرئيسية */
        document.querySelectorAll(".student-feed-container").forEach(function (element) {
            element.remove();
        });

    }
);

/* =========================================================
   Student - Home Ads Slider
========================================================= */
(function () {
    "use strict";

    let ads = [];
    let currentIndex = 0;
    let timer = null;
    let startX = 0;

    function getClient() {
        return typeof supabaseClient !== "undefined" ? supabaseClient : null;
    }

    function getElements() {
        return {
            section: document.getElementById("student-home-ads"),
            track: document.getElementById("student-home-ads-track"),
            dots: document.getElementById("student-home-ads-dots")
        };
    }

    function normalizeUrl(url) {
        if (!url) return "";
        try {
            const parsed = new URL(url, window.location.origin);
            if (!["http:", "https:"].includes(parsed.protocol)) return "";
            return parsed.href;
        } catch (_) {
            return "";
        }
    }

    function goTo(index) {
        const { track, dots } = getElements();
        if (!track || !ads.length) return;
        currentIndex = (index + ads.length) % ads.length;
        track.style.transform = `translateX(-${currentIndex * 100}%)`;
        if (dots) {
            [...dots.children].forEach((dot, i) => {
                dot.classList.toggle("active", i === currentIndex);
            });
        }
    }

    function startAutoPlay() {
        clearInterval(timer);
        if (ads.length < 2) return;
        timer = setInterval(() => goTo(currentIndex + 1), 4500);
    }

    function render() {
        const { section, track, dots } = getElements();
        if (!section || !track || !dots) return;

        track.innerHTML = "";
        dots.innerHTML = "";

        if (!ads.length) {
            section.classList.remove("show");
            return;
        }

        ads.forEach((ad, index) => {
            const slide = document.createElement("article");
            slide.className = "student-home-ad-slide";
            slide.setAttribute("role", ad.link_url ? "link" : "img");
            slide.innerHTML = `
                <img src="${window.StudentSecurity?.escapeHTML?.(window.StudentSecurity?.safeURL?.(ad.image_url, {allowData:true}) || "") || ""}" alt="${window.StudentSecurity?.escapeHTML?.(ad.title || "إعلان") || "إعلان"}" loading="lazy" decoding="async">
                ${ad.title ? `<div class="student-home-ad-caption">${String(ad.title).replace(/[&<>]/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;"}[m]))}</div>` : ""}
            `;
            const target = normalizeUrl(ad.link_url);
            if (target) {
                slide.addEventListener("click", () => window.open(target, "_blank", "noopener"));
            }
            track.appendChild(slide);

            const dot = document.createElement("button");
            dot.type = "button";
            dot.className = "student-home-ads-dot";
            dot.setAttribute("aria-label", `الإعلان ${index + 1}`);
            dot.addEventListener("click", () => {
                goTo(index);
                startAutoPlay();
            });
            dots.appendChild(dot);
        });

        section.classList.add("show");
        currentIndex = 0;
        goTo(0);
        startAutoPlay();

        const viewport = section.querySelector(".student-home-ads-viewport");
        if (viewport && !viewport.dataset.studentSwipeReady) {
            viewport.dataset.studentSwipeReady = "1";
            viewport.addEventListener("touchstart", e => {
                startX = e.changedTouches[0].clientX;
                clearInterval(timer);
            }, { passive: true });
            viewport.addEventListener("touchend", e => {
                const diff = e.changedTouches[0].clientX - startX;
                if (Math.abs(diff) > 45) goTo(currentIndex + (diff < 0 ? 1 : -1));
                startAutoPlay();
            }, { passive: true });
        }
    }

    async function loadAds() {
        const client = getClient();
        if (!client) return false;
        const now = new Date().toISOString();
        const { data, error } = await client
            .from("home_ads")
            .select("id,title,image_url,link_url,sort_order")
            .eq("is_active", true)
            .or(`starts_at.is.null,starts_at.lte.${now}`)
            .or(`ends_at.is.null,ends_at.gte.${now}`)
            .order("sort_order", { ascending: true })
            .order("created_at", { ascending: false });

        if (error) {
            console.warn("Home ads load error:", error.message);
            return false;
        }
        ads = data || [];
        render();
        return true;
    }

    function waitForClient(attempt = 0) {
        if (getClient()) {
            loadAds();
            return;
        }
        if (attempt < 40) setTimeout(() => waitForClient(attempt + 1), 250);
    }

    window.StudentHomeAds = { reload: loadAds };
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => waitForClient());
    } else {
        waitForClient();
    }
})();


/* ===== MERGED MODULE: navigation-manager.js ===== */
/* =========================================================
   Student — Clean Central Navigation
   one back controller; no old profile/feed observers or timers
========================================================= */
(function () {
    "use strict";

    if (window.StudentNavigation?.version === "clean-4") return;

    const navStyle = document.createElement("style");
    navStyle.id = "student-navigation-core-style";
    navStyle.textContent = `
        .student-internal-page{
            position:fixed !important;
            inset:0 !important;
            width:100% !important;
            height:100dvh !important;
            min-height:100vh !important;
            z-index:2147482000 !important;
            background:#f7f9fb !important;
            display:flex !important;
            flex-direction:column !important;
            overflow:hidden !important;
            box-sizing:border-box !important;
        }
        .student-internal-page[hidden]{display:none !important;}
        .student-internal-header{
            flex:0 0 auto !important;
            min-height:60px !important;
            display:flex !important;
            align-items:center !important;
            gap:10px !important;
            padding:0 12px !important;
            background:#fff !important;
            border-bottom:1px solid #e5e9ed !important;
            box-sizing:border-box !important;
            z-index:2 !important;
        }
        .student-internal-back{
            width:40px !important;
            height:40px !important;
            border:0 !important;
            border-radius:50% !important;
            background:#eef2f5 !important;
            color:#1f2937 !important;
            display:grid !important;
            place-items:center !important;
            flex:0 0 auto !important;
        }
        .student-internal-title{
            font-weight:900 !important;
            font-size:18px !important;
            color:#172033 !important;
        }
        .student-internal-body{
            flex:1 1 auto !important;
            min-height:0 !important;
            overflow-y:auto !important;
            overflow-x:hidden !important;
            -webkit-overflow-scrolling:touch !important;
            background:#f7f9fb !important;
            box-sizing:border-box !important;
        }
        body.student-internal-page-open{overflow:hidden !important;}
    `;
    if (!document.getElementById(navStyle.id)) document.head.appendChild(navStyle);

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
            [".student-store-modal.show, .student-store-modal.active", null],
            ["#student-reel-publisher.show, #student-reel-publisher.active", "closeStudentReelPublisher"],
            ["#student-story-form-modal.show, #student-story-form-modal.active", "closeStoryForm"],
            ["#studentStoryViewer.show, #studentStoryViewer.active", "closeStoryViewer"],
            ["#student-ads-admin-page.show", "closeStudentAdsAdmin"],
            ["#student-teachers-education-overlay.show", "closeStudentTeachersEducation"],
            [".student-admin-overlay.show", "closeStudentAdminPanel"],
            ["#student-store-overlay.show, #student-store-overlay.active", "closeStudentStore"],
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

    function openPage({ id = "page", title = "", html = "", onClose = null, reuse = true } = {}) {
        const existingIndex = reuse ? pageStack.findIndex((entry) => entry.id === id && entry.element?.isConnected) : -1;
        if (existingIndex >= 0) {
            while (pageStack.length - 1 > existingIndex) {
                const removed = pageStack.pop();
                removed?.element?.remove();
                try { removed?.onClose?.(); } catch (_) {}
            }
            const entry = pageStack[existingIndex];
            const page = entry.element;
            page.hidden = false;
            page.querySelector(".student-internal-title").textContent = title;
            page.querySelector(".student-internal-body").innerHTML = window.StudentSecurity?.sanitizeHTML?.(html) ?? html;
            entry.onClose = onClose || entry.onClose;
            document.body.classList.add("student-internal-page-open");
            return page;
        }
        const current = pageStack.at(-1);
        if (current?.element) current.element.hidden = true;
        ["#floating-panel","#student-education-overlay","#student-teachers-education-overlay"].forEach((selector) => {
            const layer = document.querySelector(selector);
            if (layer && !layer.closest(".student-internal-page")) layer.remove();
        });
        const page = document.createElement("section");
        page.className = "student-internal-page";
        page.dataset.studentNavPage = id;
        page.innerHTML = `<header class="student-internal-header"><button class="student-internal-back" type="button" aria-label="رجوع"><i class="fa-solid fa-arrow-right"></i></button><div class="student-internal-title"></div></header><div class="student-internal-body"></div>`;
        page.querySelector(".student-internal-title").textContent = title;
        page.querySelector(".student-internal-body").innerHTML = window.StudentSecurity?.sanitizeHTML?.(html) ?? html;
        page.querySelector(".student-internal-back").addEventListener("click", () => back());
        document.body.appendChild(page);
        pageStack.push({ id, element: page, onClose });
        document.body.classList.add("student-internal-page-open");
        return page;
    }

    function closeById(id) {
        const index = pageStack.findIndex((entry) => entry.id === id);
        if (index < 0) return false;
        const wasTop = index === pageStack.length - 1;
        const [entry] = pageStack.splice(index,1);
        entry?.element?.remove();
        try { entry?.onClose?.(); } catch (_) {}
        if (wasTop) { const prev=pageStack.at(-1); if(prev?.element) prev.element.hidden=false; }
        if (!pageStack.length) document.body.classList.remove("student-internal-page-open");
        return true;
    }

    function closePage() {
        const entry = pageStack.pop();
        if (!entry) return false;
        entry.element?.remove();
        try { entry.onClose?.(); } catch (_) {}
        const previous = pageStack.at(-1);
        if (previous?.element) previous.element.hidden = false;
        if (!previous) document.body.classList.remove("student-internal-page-open");
        return true;
    }

    function clearPages() {
        let changed = false;
        while (pageStack.length) {
            const entry = pageStack.pop();
            entry?.element?.remove();
            try { entry?.onClose?.(); } catch (_) {}
            changed = true;
        }
        document.body.classList.remove("student-internal-page-open");
        return changed;
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

            if (window.StudentNotifications?.isOpen?.()) {
                window.StudentNotifications.close({ clearReturn:true });
                return true;
            }

            const messagesPage = document.getElementById("student-messages-page");
            if (messagesPage?.classList.contains("sm-open") && typeof window.StudentMessages?.handleBack === "function") {
                const fromNotification = window.StudentNotifications?.hasPendingReturn?.() === true;
                const handled = window.StudentMessages.handleBack();
                if (handled) {
                    if (fromNotification && messagesPage.classList.contains("sm-open")) {
                        window.StudentMessages.handleBack();
                    }
                    const stillOpen = messagesPage.classList.contains("sm-open");
                    if (fromNotification && !stillOpen) window.StudentNotifications?.restoreAfterBack?.();
                    return true;
                }
            }

            if (closePage()) {
                window.StudentNotifications?.restoreAfterBack?.();
                return true;
            }
            if (closeTopLayer()) {
                const hasRootLayer = !!document.querySelector(
                    "#studentStoryViewer.show,#studentStoryViewer.active,#student-store-overlay.show,#student-store-overlay.active,#student-education-overlay.show,#student-education-overlay.active,.student-admin-overlay.show"
                );
                if (!hasRootLayer) window.StudentNotifications?.restoreAfterBack?.();
                return true;
            }
            if (window.StudentNotifications?.restoreAfterBack?.()) return true;
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
        version: "clean-4",
        openPage,
        back,
        closePage,
        closeById,
        clearPages,
        closeTopLayer,
        showExitConfirm
    };
})();


/* ===== MERGED MODULE: notifications.js ===== */
/* =========================================================
   Student - Notifications
   In-app realtime + Web Push subscription + admin broadcast
========================================================= */
(function () {
    "use strict";

    if (window.StudentNotifications) return;

    const FIREBASE_CONFIG = {
        apiKey: "AIzaSyCWhbGfLtUymIO3O5itIC9054FOgE0aYi0",
        authDomain: "student-1fcba.firebaseapp.com",
        projectId: "student-1fcba",
        storageBucket: "student-1fcba.firebasestorage.app",
        messagingSenderId: "898081758778",
        appId: "1:898081758778:web:7c7f0fa6b2cb52387e5f03"
    };
    const FIREBASE_VAPID_KEY = "BEfbopLOdfBaj07M5LVNzV6TcJNGHcthLWLIBSu_lDrgIdIcLWB6fk3VIr1XQwSkk7ikrBPKeunTxrntWd9CKHQ";
    const FIREBASE_SDK_VERSION = "12.17.1";
    const SW_URL = "./sw.js?v=8.2.0";
    let firebaseMessagingPromise = null;

    const state = {
        user: null,
        isAdmin: false,
        items: [],
        channel: null,
        overlay: null,
        loading: false,
        initializedFor: null,
        returnPending: false,
        returnTargetId: null,
        filter: "all",
        profiles: {},
        lastLoadedAt: 0,
        loadPromise: null
    };

    function sb() {
        return typeof supabaseClient !== "undefined" ? supabaseClient : null;
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function ensureStyles() {
        if (document.getElementById("student-notifications-style")) return;
        const style = document.createElement("style");
        style.id = "student-notifications-style";
        style.textContent = `
            #student-notifications-page{position:fixed;inset:0;z-index:2147482100;background:#f4f7fb;display:none;overflow:hidden;direction:rtl;color:#172033}
            #student-notifications-page.is-open{display:flex;flex-direction:column}
            .sn-head{position:relative;z-index:3;background:rgba(255,255,255,.96);backdrop-filter:blur(14px);border-bottom:1px solid #e8edf4;padding:12px 14px;display:flex;align-items:center;gap:10px;min-height:64px;box-sizing:border-box}
            .sn-back,.sn-action,.sn-btn,.sn-head-icon{border:0;cursor:pointer;font:inherit}
            .sn-back{width:42px;height:42px;border-radius:14px;background:#edf2f7;color:#172033;font-size:24px;display:grid;place-items:center;flex:0 0 42px}
            .sn-heading{min-width:0;flex:1}.sn-title{font-size:20px;font-weight:900;margin:0;line-height:1.25}.sn-subtitle{font-size:11px;color:#8490a0;margin-top:3px}
            .sn-head-actions{display:flex;gap:8px;align-items:center}.sn-head-icon{height:38px;border-radius:12px;padding:0 11px;background:#eef4ff;color:#087cff;font-weight:800}.sn-action{background:#087cff;color:#fff;border-radius:12px;padding:10px 12px;font-weight:800}
            .sn-body{width:100%;max-width:760px;margin:0 auto;padding:14px 14px 96px;min-height:0;flex:1;overflow:auto;box-sizing:border-box;background:linear-gradient(180deg,#f8fbff 0,#f4f7fb 52%,#f7f9fc 100%);-webkit-overflow-scrolling:touch}
            .sn-summary{display:flex;align-items:center;justify-content:space-between;gap:12px;background:linear-gradient(135deg,#087cff,#4da6ff);color:#fff;border-radius:22px;padding:16px 17px;margin-bottom:12px;box-shadow:0 14px 32px rgba(8,124,255,.18)}
            .sn-summary strong{font-size:16px}.sn-summary span{display:block;font-size:12px;opacity:.88;margin-top:3px}.sn-summary-count{min-width:46px;height:46px;border-radius:15px;background:rgba(255,255,255,.18);display:grid;place-items:center;font-size:17px;font-weight:900}
            .sn-permission{border:1px solid #dbe8fb;background:#fff;border-radius:18px;padding:13px 14px;margin-bottom:12px;box-shadow:0 5px 18px rgba(23,32,51,.035)}
            .sn-permission strong{display:block;margin-bottom:4px;font-size:13px}.sn-permission p{margin:0 0 10px;color:#667385;line-height:1.65;font-size:12px}
            .sn-btn{background:#087cff;color:#fff;border-radius:12px;padding:10px 14px;font-weight:800}.sn-btn.secondary{background:#eef2f7;color:#223047}.sn-btn.danger{background:#e93d4f}
            .sn-filterbar{display:flex;gap:8px;align-items:center;overflow:auto;margin:2px 0 12px;padding-bottom:2px}.sn-filter{border:1px solid #e1e7ef;background:#fff;color:#536072;border-radius:999px;padding:8px 12px;font:inherit;font-size:12px;font-weight:800;white-space:nowrap}.sn-filter.active{background:#172033;color:#fff;border-color:#172033}
            .sn-list{display:grid;gap:9px}.sn-item{position:relative;border:1px solid #e8edf3;border-radius:19px;padding:13px;background:#fff;display:flex;gap:12px;align-items:flex-start;box-shadow:0 5px 16px rgba(25,39,58,.04);transition:transform .14s ease,box-shadow .14s ease,border-color .14s ease;cursor:pointer;overflow:hidden}.sn-item:active{transform:scale(.994)}
            .sn-item.unread{background:linear-gradient(135deg,#f5f9ff,#fff);border-color:#cfe0fb}.sn-item.unread:before{content:"";position:absolute;right:0;top:12px;bottom:12px;width:3px;border-radius:3px;background:#087cff}.sn-icon{width:48px;height:48px;border-radius:16px;display:grid;place-items:center;flex:0 0 48px;font-size:21px;background:var(--sn-icon-bg,#eef4ff);color:var(--sn-icon-color,#087cff);box-shadow:inset 0 0 0 1px rgba(0,0,0,.025)}
            .sn-content{min-width:0;flex:1}.sn-actor{display:flex;align-items:center;gap:3px;font-size:12px;font-weight:900;color:#243247;margin-bottom:3px}.sn-item-title{font-weight:900;margin-bottom:4px;font-size:14px;line-height:1.45}.sn-item-text{color:#566274;line-height:1.6;font-size:13px;white-space:pre-wrap;overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}.sn-meta{font-size:10px;color:#929baa;margin-top:7px;display:flex;align-items:center;gap:6px}.sn-dot{width:5px;height:5px;border-radius:50%;background:#087cff}.sn-chevron{align-self:center;color:#b1bac7;font-size:22px;line-height:1}.sn-item-admin{display:flex;gap:8px;margin-top:10px}.sn-mini{border:0;border-radius:9px;padding:7px 10px;font:inherit;font-size:11px;font-weight:800;cursor:pointer;background:#eef2f7;color:#223047}.sn-mini.danger{background:#fff0f2;color:#c9293b}
            .sn-empty{text-align:center;padding:70px 20px;color:#788393}.sn-empty .bell{width:74px;height:74px;border-radius:24px;background:#fff;display:grid;place-items:center;font-size:34px;margin:0 auto 14px;box-shadow:0 10px 28px rgba(20,40,70,.08)}
            .sn-modal{position:fixed;inset:0;z-index:2147482300;background:rgba(10,20,35,.48);display:flex;align-items:flex-end;justify-content:center;padding:14px}.sn-sheet{width:min(620px,100%);background:#fff;border-radius:24px;padding:18px;max-height:90vh;overflow:auto}.sn-sheet h3{margin:0 0 15px}
            .sn-field{margin-bottom:12px}.sn-field label{display:block;font-weight:700;margin-bottom:6px}.sn-field input,.sn-field textarea,.sn-field select{width:100%;box-sizing:border-box;border:1px solid #dbe1ea;border-radius:12px;padding:12px;font:inherit;outline:none}.sn-field textarea{min-height:110px;resize:vertical}
            .sn-actions{display:flex;gap:9px;justify-content:flex-end;margin-top:15px}.sn-toast{position:fixed;left:50%;bottom:86px;transform:translateX(-50%);z-index:2147482400;background:#172033;color:#fff;border-radius:12px;padding:11px 16px;max-width:88%;text-align:center}
            .sn-badge{position:absolute;min-width:18px;height:18px;border-radius:9px;background:#ef3340;color:#fff;font-size:11px;font-weight:800;display:grid;place-items:center;padding:0 5px;transform:translate(45%,-45%)}
        `;
        document.head.appendChild(style);
    }

    function toast(message) {
        document.querySelector(".sn-toast")?.remove();
        const el = document.createElement("div");
        el.className = "sn-toast";
        el.textContent = message;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 2800);
    }

    function ensurePage() {
        ensureStyles();
        let page = document.getElementById("student-notifications-page");
        if (page) return page;
        page = document.createElement("section");
        page.id = "student-notifications-page";
        page.setAttribute("aria-label", "الإشعارات");
        page.innerHTML = `
            <header class="sn-head">
                <button class="sn-back" type="button" aria-label="رجوع"><i class="fa-solid fa-arrow-right"></i></button>
                <div class="sn-heading"><h2 class="sn-title">الإشعارات</h2><div class="sn-subtitle">كل جديد في Student بمكان واحد</div></div>
                <div class="sn-head-actions">
                    <button class="sn-head-icon" id="sn-mark-all" type="button" title="تحديد الكل كمقروء">✓ الكل</button>
                    <button class="sn-action" id="sn-broadcast" type="button" hidden>نشر</button>
                </div>
            </header>
            <main class="sn-body">
                <div id="sn-summary"></div>
                <div id="sn-permission-box"></div>
                <div class="sn-filterbar" id="sn-filterbar">
                    <button class="sn-filter active" type="button" data-filter="all">الكل</button>
                    <button class="sn-filter" type="button" data-filter="unread">غير المقروء</button>
                </div>
                <div id="sn-list" class="sn-list"></div>
            </main>`;
        document.body.appendChild(page);
        page.querySelector(".sn-back").addEventListener("click", () => close({ clearReturn:true }));
        page.querySelector("#sn-broadcast").addEventListener("click", openBroadcast);
        page.querySelector("#sn-mark-all").addEventListener("click", markAllRead);
        page.querySelectorAll("[data-filter]").forEach(button => {
            button.addEventListener("click", () => {
                state.filter = button.dataset.filter || "all";
                page.querySelectorAll("[data-filter]").forEach(x => x.classList.toggle("active", x === button));
                render();
            });
        });
        state.overlay = page;
        return page;
    }

    async function getUser() {
        const client = sb();
        if (!client) return null;
        const { data } = await client.auth.getUser();
        return data?.user || null;
    }

    async function checkAdmin() {
        const client = sb();
        if (!client || !state.user) return false;
        try {
            const { data, error } = await client.rpc("current_user_is_admin");
            if (!error) return data === true;
        } catch (_) {}
        try {
            const { data } = await client.from("profiles").select("role").eq("id", state.user.id).maybeSingle();
            return data?.role === "admin";
        } catch (_) {
            return false;
        }
    }

    function dateText(value) {
        if (!value) return "";
        try {
            return new Intl.DateTimeFormat("ar-IQ", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
        } catch (_) {
            return "";
        }
    }

    function renderPermission() {
        const box = document.getElementById("sn-permission-box");
        if (!box) return;
        if (!("Notification" in window) || !("serviceWorker" in navigator)) {
            box.innerHTML = `<div class="sn-permission"><strong>الإشعارات الخارجية غير مدعومة</strong><p>هذا المتصفح لا يدعم إشعارات الهاتف الخارجية.</p></div>`;
            return;
        }
        if (Notification.permission === "granted") {
            box.innerHTML = `<div class="sn-permission"><strong>إشعارات الهاتف مفعلة</strong><p>ستصلك التنبيهات الخارجية حسب إعدادات جهازك.</p></div>`;
            return;
        }
        if (Notification.permission === "denied") {
            box.innerHTML = `<div class="sn-permission"><strong>تم رفض الإذن</strong><p>افتح إعدادات الموقع في المتصفح واسمح بالإشعارات، ثم أعد فتح التطبيق.</p></div>`;
            return;
        }
        box.innerHTML = `<div class="sn-permission"><strong>فعّل إشعارات الهاتف</strong><p>اسمح للتطبيق بإرسال الإشعارات إلى لوحة إشعارات جهازك حتى عند مغادرة الصفحة.</p><button class="sn-btn" id="sn-enable-push" type="button">تفعيل الإشعارات</button></div>`;
        box.querySelector("#sn-enable-push")?.addEventListener("click", enablePush);
    }

    function verificationBadgeHTML(profile, size = 12) {
        if (!profile) return "";
        if (typeof window.studentVerificationBadge === "function") return window.studentVerificationBadge(profile, size);
        let html = "";
        if (profile.is_verified === true) {
            const colorName = String(profile.verification_color || "").toLowerCase();
            const color = colorName === "orange" ? "#ff8a00" : colorName === "red" ? "#e53935" : "#0095f6";
            html += `<span aria-label="حساب موثق" title="حساب موثق" style="display:inline-grid;place-items:center;width:${Math.max(11, Number(size)||12)}px;height:${Math.max(11, Number(size)||12)}px;border-radius:50%;background:${color};color:#fff;font-size:8px;font-weight:900;margin-inline-start:3px;vertical-align:1px">✓</span>`;
        }
        const icon = String(profile.custom_badge_icon || "").trim().slice(0,8);
        if (icon) {
            const color = /^#[0-9a-f]{6}$/i.test(String(profile.custom_badge_color || "")) ? profile.custom_badge_color : "#7c3aed";
            html += `<span title="${escapeHtml(profile.custom_badge_label || "علامة مميزة")}" style="display:inline-grid;place-items:center;min-width:14px;height:14px;padding:0 2px;border-radius:999px;background:${escapeHtml(color)};color:#fff;font-size:9px;margin-inline-start:3px">${escapeHtml(icon)}</span>`;
        }
        return html;
    }

    async function hydrateNotificationProfiles(items = state.items) {
        const client = sb();
        if (!client) return;
        const ids = [...new Set((items || []).map(x => x.actor_id || x?.metadata?.actor_id || x?.metadata?.user_id).filter(Boolean).map(String))]
            .filter(id => !state.profiles[id]);
        if (!ids.length) return;
        const { data, error } = await client.from("profiles")
            .select("id,full_name,username,is_verified,verification_color,custom_badge_icon,custom_badge_label,custom_badge_color")
            .in("id", ids);
        if (error) return;
        (data || []).forEach(profile => { state.profiles[String(profile.id)] = profile; });
        if (isOpen()) render();
    }

    function actorProfile(item) {
        const id = item?.actor_id || item?.metadata?.actor_id || item?.metadata?.user_id || null;
        return id ? state.profiles[String(id)] || null : null;
    }

    function notificationVisual(item) {
        const kind = String(item?.kind || "").toLowerCase();
        if (kind.includes("message") || kind.includes("chat")) return { icon:"💬", bg:"#edf8ff", color:"#087cff" };
        if (kind.includes("follow") || kind.includes("profile")) return { icon:"👤", bg:"#f1f0ff", color:"#6f55d9" };
        if (kind.includes("story")) return { icon:"◉", bg:"#fff0f4", color:"#e83265" };
        if (kind.includes("reel")) return { icon:"▶", bg:"#fff2ed", color:"#e4662b" };
        if (kind.includes("post") || kind.includes("comment") || kind.includes("like")) return { icon:"♥", bg:"#fff1f3", color:"#e13b52" };
        if (kind.includes("store") || kind.includes("order") || kind.includes("diamond")) return { icon:"◆", bg:"#eefaff", color:"#00a1c9" };
        if (kind.includes("teacher") || kind.includes("verification")) return { icon:"✓", bg:"#fff3ef", color:"#e45c35" };
        if (kind.includes("admin") || item?.is_broadcast === true) return { icon:"✦", bg:"#f0f5ff", color:"#3667d6" };
        return { icon:String(item?.icon || "🔔"), bg:"#eef4ff", color:"#087cff" };
    }

    function unreadCount() {
        return state.items.filter(x => !x.is_read).length;
    }

    function renderSummary() {
        const box = document.getElementById("sn-summary");
        if (!box) return;
        const unread = unreadCount();
        box.innerHTML = `<div class="sn-summary"><div><strong>${unread ? "لديك إشعارات جديدة" : "أنت مطّلع على كل شيء"}</strong><span>${unread ? `باقي ${unread} إشعار غير مقروء` : "لا توجد إشعارات غير مقروءة حاليًا"}</span></div><div class="sn-summary-count">${unread > 99 ? "99+" : unread}</div></div>`;
    }

    function render() {
        const page = ensurePage();
        page.querySelector("#sn-broadcast").hidden = !state.isAdmin;
        page.querySelector("#sn-mark-all").hidden = unreadCount() === 0;
        renderSummary();
        renderPermission();
        const list = page.querySelector("#sn-list");
        if (state.loading) {
            list.innerHTML = `<div class="sn-empty">جارٍ تحميل الإشعارات...</div>`;
            return;
        }
        const shown = state.filter === "unread" ? state.items.filter(x => !x.is_read) : state.items;
        if (!shown.length) {
            list.innerHTML = `<div class="sn-empty"><div class="bell">🔔</div><div>${state.filter === "unread" ? "لا توجد إشعارات غير مقروءة." : "لا توجد إشعارات حتى الآن."}</div></div>`;
            return;
        }
        list.innerHTML = shown.map(item => {
            const canManage = state.isAdmin && item.is_broadcast === true && item.kind === "admin_broadcast";
            const visual = notificationVisual(item);
            const actor = actorProfile(item);
            return `
            <article class="sn-item ${item.is_read ? "" : "unread"}" data-id="${escapeHtml(item.id)}">
                <div class="sn-icon" style="--sn-icon-bg:${escapeHtml(visual.bg)};--sn-icon-color:${escapeHtml(visual.color)}">${escapeHtml(visual.icon)}</div>
                <div class="sn-content">
                    ${actor ? `<div class="sn-actor">${escapeHtml(actor.full_name || actor.username || "مستخدم")}${verificationBadgeHTML(actor,12)}</div>` : ""}
                    <div class="sn-item-title">${escapeHtml(item.title || "إشعار جديد")}</div>
                    <div class="sn-item-text">${escapeHtml(item.body || "")}</div>
                    <div class="sn-meta">${item.is_read ? "" : `<span class="sn-dot"></span>`}<span>${escapeHtml(dateText(item.created_at))}</span></div>
                    ${canManage ? `<div class="sn-item-admin"><button class="sn-mini" data-edit-broadcast type="button">تعديل</button><button class="sn-mini danger" data-delete-broadcast type="button">حذف</button></div>` : ""}
                </div>
                <div class="sn-chevron" aria-hidden="true">‹</div>
            </article>`;
        }).join("");
        list.querySelectorAll(".sn-item").forEach(el => {
            el.addEventListener("click", async event => {
                if (event.target.closest("button")) return;
                const item = state.items.find(x => String(x.id) === String(el.dataset.id));
                if (!item) return;
                if (!item.is_read) await markRead(item.id);
                await openNotificationTarget(item);
            });
        });
        list.querySelectorAll("[data-edit-broadcast]").forEach(btn => {
            btn.addEventListener("click", () => openEditBroadcast(btn.closest(".sn-item").dataset.id));
        });
        list.querySelectorAll("[data-delete-broadcast]").forEach(btn => {
            btn.addEventListener("click", () => confirmDeleteBroadcast(btn.closest(".sn-item").dataset.id));
        });
        updateBadge();
    }

    function hideForTarget(item) {
        const page = document.getElementById("student-notifications-page");
        page?.classList.remove("is-open");
        state.returnPending = true;
        state.returnTargetId = item?.id || null;
        document.body.style.overflow = "";
    }

    function hasPendingReturn() {
        return state.returnPending === true;
    }

    function restoreAfterBack() {
        if (!state.returnPending) return false;
        state.returnPending = false;
        state.returnTargetId = null;
        window.StudentNavigation?.clearPages?.();
        open({ fromReturn:true }).catch(console.error);
        return true;
    }

    async function openNotificationTarget(item) {
        const meta = item?.metadata || {};
        const kind = String(item?.kind || item?.type || "").toLowerCase();
        const link = String(item?.link || "").toLowerCase();
        const actorId = item?.actor_id || meta.actor_id || meta.user_id || null;
        const storyId = meta.story_id || null;
        const postId = meta.post_id || null;
        const conversationId = meta.conversation_id || meta.chat_id || null;
        const orderId = meta.order_id || null;

        hideForTarget(item);

        if (conversationId || kind === "message" || kind.includes("chat") || link.startsWith("messages")) {
            if (window.StudentMessages?.openTarget) {
                await window.StudentMessages.openTarget(conversationId);
                return;
            }
            if (typeof window.openStudentMessages === "function") {
                await window.openStudentMessages();
                return;
            }
        }

        if (storyId || kind.startsWith("story_") || link === "stories") {
            if (storyId && window.StudentStories?.openById) {
                const opened = await window.StudentStories.openById(storyId);
                if (opened) return;
            }
            if (typeof window.openStoriesSection === "function") {
                window.openStoriesSection();
                return;
            }
        }

        if (postId || kind.startsWith("post_") || link === "home" || link === "posts") {
            if (typeof window.StudentOpenPostById === "function" && postId) {
                await window.StudentOpenPostById(postId);
                return;
            }
            document.dispatchEvent(new CustomEvent("student:open-post", { detail: { postId } }));
            if (typeof window.showHome === "function") {
                window.showHome();
                return;
            }
        }

        if (orderId || kind.startsWith("store_") || link === "store") {
            if (typeof window.openStudentStoreSection === "function") {
                window.openStudentStoreSection();
                document.dispatchEvent(new CustomEvent("student:open-store-order", { detail: { orderId } }));
                return;
            }
        }

        if (kind === "follow" || kind.includes("profile") || link === "profile" || actorId) {
            if (window.StudentProfile?.open && actorId) {
                window.StudentProfile.open(actorId);
                return;
            }
            if (typeof window.openStudentProfile === "function" && actorId) {
                window.openStudentProfile(actorId);
                return;
            }
        }

        if (item?.link && /^(https?:\/\/|\.\/|\/)/i.test(String(item.link))) {
            location.href = item.link;
            return;
        }

        restoreAfterBack();
        toast("تعذر تحديد وجهة هذا الإشعار.");
    }

    async function load(options = {}) {
        const client = sb();
        if (!client || !state.user) return;
        if (state.loadPromise) return state.loadPromise;
        state.loadPromise = (async () => {
        state.loading = true;
        if (!options.silent || !state.items.length) render();
        const { data, error } = await client
            .from("notifications")
            .select("id,title,body,icon,kind,link,is_read,created_at,actor_id,metadata,is_broadcast,audience,user_id")
            .or(`user_id.eq.${state.user.id},and(user_id.is.null,is_broadcast.eq.true)`)
            .order("created_at", { ascending: false })
            .limit(150);
        state.loading = false;
        if (error) {
            console.error("Notifications load error:", error);
            render();
            if (!state.items.length) toast("تعذر تحميل الإشعارات.");
            return;
        }
        const rows = data || [];
        const broadcastIds = rows.filter(x => x.is_broadcast === true).map(x => x.id);
        let readBroadcasts = new Set();
        if (broadcastIds.length) {
            const { data: reads } = await client
                .from("notification_reads")
                .select("notification_id")
                .eq("user_id", state.user.id)
                .in("notification_id", broadcastIds);
            readBroadcasts = new Set((reads || []).map(x => String(x.notification_id)));
        }
        state.items = rows.map(item => ({
            ...item,
            is_read: item.is_broadcast === true ? readBroadcasts.has(String(item.id)) : item.is_read === true
        }));
        state.lastLoadedAt = Date.now();
        render();
        hydrateNotificationProfiles(state.items).catch(() => {});
        markAllDelivered().catch(() => {});
        })();
        try { return await state.loadPromise; } finally { state.loading = false; state.loadPromise = null; }
    }

    async function markRead(id) {
        const client = sb();
        if (!client || !id) return;
        const item = state.items.find(x => String(x.id) === String(id));
        if (!item) return;
        item.is_read = true;
        render();
        if (item.is_broadcast === true) {
            await client.from("notification_reads").upsert({
                notification_id: id,
                user_id: state.user.id,
                read_at: new Date().toISOString()
            }, { onConflict: "notification_id,user_id" });
        } else {
            await client.from("notifications")
                .update({ is_read: true, read_at: new Date().toISOString() })
                .eq("id", id)
                .eq("user_id", state.user.id);
        }
    }

    async function markAllRead() {
        const client = sb();
        if (!client || !state.user) return;
        const unread = state.items.filter(x => !x.is_read);
        if (!unread.length) return;
        const personalIds = unread.filter(x => x.is_broadcast !== true).map(x => x.id);
        const broadcastRows = unread.filter(x => x.is_broadcast === true).map(x => ({
            notification_id: x.id,
            user_id: state.user.id,
            read_at: new Date().toISOString()
        }));
        state.items.forEach(x => { x.is_read = true; });
        render();
        if (personalIds.length) {
            await client.from("notifications")
                .update({ is_read: true, read_at: new Date().toISOString() })
                .in("id", personalIds)
                .eq("user_id", state.user.id);
        }
        if (broadcastRows.length) {
            await client.from("notification_reads").upsert(broadcastRows, { onConflict: "notification_id,user_id" });
        }
    }

    async function markAllDelivered() {
        const client = sb();
        if (!client || !state.user) return;
        await client.from("notifications").update({ delivered_at: new Date().toISOString() }).eq("user_id", state.user.id).is("delivered_at", null);
    }

    function updateBadge() {
        const unread = state.items.filter(x => !x.is_read).length;
        const bells = document.querySelectorAll(".fa-bell");
        bells.forEach(bell => {
            const host = bell.parentElement || bell;
            host.style.position = host.style.position || "relative";
            host.querySelector(".sn-badge")?.remove();
            if (unread > 0) {
                const badge = document.createElement("span");
                badge.className = "sn-badge";
                badge.textContent = unread > 99 ? "99+" : String(unread);
                host.appendChild(badge);
            }
        });
    }

    async function subscribeRealtime() {
        const client = sb();
        if (!client || !state.user) return;
        if (state.channel) await client.removeChannel(state.channel);
        state.channel = client.channel(`student-notifications-${state.user.id}`)
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, payload => {
                const item = payload.new;
                const belongs = item.user_id === state.user.id || item.is_broadcast === true || (state.isAdmin && item.audience === "admin");
                if (!belongs) return;
                state.items.unshift({ ...item, is_read: false });
                render();
                hydrateNotificationProfiles([item]).catch(() => {});
                showForeground(item);
            })
            .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications" }, payload => {
                const index = state.items.findIndex(x => String(x.id) === String(payload.new.id));
                if (index < 0) return;
                state.items[index] = { ...state.items[index], ...payload.new };
                render();
            })
            .on("postgres_changes", { event: "DELETE", schema: "public", table: "notifications" }, payload => {
                state.items = state.items.filter(x => String(x.id) !== String(payload.old.id));
                render();
            })
            .subscribe();
    }

    async function showForeground(item) {
        if (document.visibilityState === "visible") {
            toast(item.title || "إشعار جديد");
            return;
        }
        if (Notification.permission !== "granted") return;
        const registration = await navigator.serviceWorker.ready;
        registration.showNotification(item.title || "Student", {
            body: item.body || "لديك إشعار جديد",
            icon: "./apple-touch-icon.png",
            badge: "./apple-touch-icon.png",
            data: { url: item.link || "./index.html", notification_id: item.id }
        });
    }

    async function getFirebaseMessagingClient() {
        if (firebaseMessagingPromise) return firebaseMessagingPromise;
        firebaseMessagingPromise = (async () => {
            const appSdk = await import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app.js`);
            const messagingSdk = await import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-messaging.js`);
            if (typeof messagingSdk.isSupported === "function" && !(await messagingSdk.isSupported())) {
                throw new Error("FCM_UNSUPPORTED");
            }

            const firebaseApp = appSdk.getApps().length
                ? appSdk.getApp()
                : appSdk.initializeApp(FIREBASE_CONFIG);

            return {
                messaging: messagingSdk.getMessaging(firebaseApp),
                register: messagingSdk.register,
                onRegistered: messagingSdk.onRegistered,
                onMessage: messagingSdk.onMessage
            };
        })();
        return firebaseMessagingPromise;
    }

    async function registerServiceWorker() {
        if (!("serviceWorker" in navigator)) throw new Error("SERVICE_WORKER_UNSUPPORTED");

        const registration = await navigator.serviceWorker.register(SW_URL, {
            scope: "./",
            updateViaCache: "none"
        });

        try {
            await registration.update();
        } catch (_) {}

        const candidate = registration.installing || registration.waiting;
        if (candidate && candidate.state !== "activated") {
            await new Promise((resolve) => {
                const timeout = setTimeout(resolve, 8000);
                candidate.addEventListener("statechange", function onStateChange() {
                    if (candidate.state === "activated" || candidate.state === "redundant") {
                        clearTimeout(timeout);
                        candidate.removeEventListener("statechange", onStateChange);
                        resolve();
                    }
                });
            });
        }

        const readyRegistration = await navigator.serviceWorker.ready;
        if (!readyRegistration.active) {
            throw new Error("SERVICE_WORKER_NOT_ACTIVE");
        }

        return readyRegistration;
    }

    async function syncFirebasePushToken({ requestPermission = false, silent = false } = {}) {
        const client = sb();
        if (!client || !state.user || !("Notification" in window)) return false;

        if (Notification.permission !== "granted") {
            if (!requestPermission) return false;
            const permission = await Notification.requestPermission();
            if (permission !== "granted") {
                renderPermission();
                return false;
            }
        }

        const registration = await registerServiceWorker();
        const {
            messaging,
            register: registerMessaging,
            onRegistered
        } = await getFirebaseMessagingClient();

        if (typeof registerMessaging !== "function" || typeof onRegistered !== "function") {
            throw new Error("FCM_FID_API_UNAVAILABLE");
        }

        /*
         * Firebase JS SDK 12.14+ uses Firebase Installation ID (FID)
         * registration. The same Student service worker and VAPID key are
         * passed explicitly so Firebase never creates a second default scope.
         */
        const fid = await new Promise(async (resolve, reject) => {
            let finished = false;
            let unsubscribe = () => {};

            const finish = (value, error = null) => {
                if (finished) return;
                finished = true;
                clearTimeout(timeout);
                try { unsubscribe(); } catch (_) {}
                if (error) reject(error);
                else resolve(value);
            };

            const timeout = setTimeout(() => {
                finish(null, new Error("FCM_FID_TIMEOUT"));
            }, 15000);

            try {
                unsubscribe = onRegistered(messaging, (installationId) => {
                    const value = String(installationId || "").trim();
                    if (value) finish(value);
                });

                await registerMessaging(messaging, {
                    vapidKey: FIREBASE_VAPID_KEY,
                    serviceWorkerRegistration: registration
                });
            } catch (error) {
                finish(null, error);
            }
        });

        if (!fid) throw new Error("FCM_FID_EMPTY");

        /*
         * Keep the existing database/RPC contract for now. During Firebase's
         * migration period the backend send target accepts an FID where the
         * legacy registration token was used.
         */
        const { error } = await client.rpc("student_register_push_token", {
            p_token: fid,
            p_user_agent: navigator.userAgent || null,
            p_platform: "web-fid"
        });
        if (error) throw error;

        localStorage.removeItem(`student-fcm-token:${state.user.id}`);
        localStorage.setItem(`student-fcm-fid:${state.user.id}`, fid);
        localStorage.setItem(`student-push-asked:${state.user.id}`, "yes");
        renderPermission();
        if (!silent) toast("تم تفعيل الإشعارات الخارجية.");
        return true;
    }

    async function enablePush() {
        try {
            await syncFirebasePushToken({ requestPermission: true, silent: false });
        } catch (error) {
            console.error("FCM enable error:", error);
            toast("تعذر تفعيل الإشعارات الخارجية. شغّل كود Push SQL ثم أعد المحاولة.");
        }
    }

    function showFirstLoginPrompt() {
        if (!state.user || !("Notification" in window)) return;

        const permission = Notification.permission;
        if (permission === "granted") return;

        const key = `student-push-reminder:${state.user.id}`;
        const lastShown = Number(localStorage.getItem(key) || 0);
        const remindAfter = 24 * 60 * 60 * 1000;

        if (Date.now() - lastShown < remindAfter) return;

        setTimeout(() => {
            if (document.querySelector(".sn-modal[data-push-reminder]")) return;

            const modal = document.createElement("div");
            modal.className = "sn-modal";
            modal.dataset.pushReminder = "1";

            if (permission === "denied") {
                modal.innerHTML = `<div class="sn-sheet"><h3>الإشعارات متوقفة</h3><p style="line-height:1.8;color:#566171">سبق أن تم رفض إذن الإشعارات. افتح إعدادات هذا الموقع في Chrome، ثم غيّر الإشعارات إلى سماح، وبعدها أعد فتح التطبيق.</p><div class="sn-actions"><button class="sn-btn secondary" data-close type="button">حسنًا</button></div></div>`;
            } else {
                modal.innerHTML = `<div class="sn-sheet"><h3>تفعيل الإشعارات</h3><p style="line-height:1.8;color:#566171">فعّل الإشعارات لتصلك تنبيهات Student في لوحة إشعارات الهاتف.</p><div class="sn-actions"><button class="sn-btn secondary" data-close type="button">لاحقًا</button><button class="sn-btn" data-enable type="button">تفعيل الآن</button></div></div>`;
            }

            document.body.appendChild(modal);
            localStorage.setItem(key, String(Date.now()));

            modal.querySelector("[data-close]").onclick = () => modal.remove();
            modal.querySelector("[data-enable]")?.addEventListener("click", async () => {
                modal.remove();
                await enablePush();
            });
        }, 1200);
    }

    function openEditBroadcast(id) {
        const item = state.items.find(x => String(x.id) === String(id));
        if (!state.isAdmin || !item) return;
        const modal = document.createElement("div");
        modal.className = "sn-modal";
        modal.innerHTML = `<form class="sn-sheet"><h3>تعديل الإشعار</h3>
            <div class="sn-field"><label>العنوان</label><input name="title" maxlength="100" required value="${escapeHtml(item.title || "")}"></div>
            <div class="sn-field"><label>النص</label><textarea name="body" maxlength="500" required>${escapeHtml(item.body || "")}</textarea></div>
            <div class="sn-field"><label>الرابط (اختياري)</label><input name="link" maxlength="300" value="${escapeHtml(item.link || "")}"></div>
            <div class="sn-actions"><button class="sn-btn secondary" data-close type="button">إلغاء</button><button class="sn-btn" type="submit">حفظ</button></div></form>`;
        document.body.appendChild(modal);
        modal.querySelector("[data-close]").onclick = () => modal.remove();
        modal.querySelector("form").onsubmit = async event => {
            event.preventDefault();
            const button = event.submitter;
            button.disabled = true;
            const form = new FormData(event.currentTarget);
            const { error } = await sb().rpc("student_admin_update_broadcast", {
                p_notification_id: id,
                p_title: String(form.get("title") || "").trim(),
                p_body: String(form.get("body") || "").trim(),
                p_link: String(form.get("link") || "").trim() || null
            });
            if (error) {
                button.disabled = false;
                toast(`تعذر التعديل: ${error.message}`);
                return;
            }
            modal.remove();
            await load();
            toast("تم تعديل الإشعار.");
        };
    }

    function confirmDeleteBroadcast(id) {
        if (!state.isAdmin) return;
        const modal = document.createElement("div");
        modal.className = "sn-modal";
        modal.innerHTML = `<div class="sn-sheet"><h3>حذف الإشعار؟</h3><p style="line-height:1.8;color:#566171">سيُحذف هذا الإشعار من جميع الحسابات نهائيًا.</p><div class="sn-actions"><button class="sn-btn secondary" data-close type="button">إلغاء</button><button class="sn-btn danger" data-delete type="button">حذف</button></div></div>`;
        document.body.appendChild(modal);
        modal.querySelector("[data-close]").onclick = () => modal.remove();
        modal.querySelector("[data-delete]").onclick = async event => {
            event.currentTarget.disabled = true;
            const { error } = await sb().rpc("student_admin_delete_broadcast", { p_notification_id: id });
            if (error) {
                event.currentTarget.disabled = false;
                toast(`تعذر الحذف: ${error.message}`);
                return;
            }
            modal.remove();
            state.items = state.items.filter(x => String(x.id) !== String(id));
            render();
            toast("تم حذف الإشعار.");
        };
    }

    function openBroadcast() {
        if (!state.isAdmin) return;
        const modal = document.createElement("div");
        modal.className = "sn-modal";
        modal.innerHTML = `<form class="sn-sheet" id="sn-broadcast-form"><h3>نشر إشعار للجميع</h3>
            <div class="sn-field"><label>عنوان الإشعار</label><input name="title" maxlength="100" required></div>
            <div class="sn-field"><label>نص الإشعار</label><textarea name="body" maxlength="500" required></textarea></div>
            <div class="sn-field"><label>الرابط أو القسم (اختياري)</label><input name="link" maxlength="300" placeholder="مثال: ./index.html"></div>
            <div class="sn-actions"><button class="sn-btn secondary" data-close type="button">إلغاء</button><button class="sn-btn" type="submit">نشر الآن</button></div></form>`;
        document.body.appendChild(modal);
        modal.querySelector("[data-close]").onclick = () => modal.remove();
        modal.querySelector("form").onsubmit = async event => {
            event.preventDefault();
            const button = event.submitter;
            button.disabled = true;
            button.textContent = "جارٍ النشر...";
            const form = new FormData(event.currentTarget);
            const client = sb();
            const title = String(form.get("title") || "").trim();
            const body = String(form.get("body") || "").trim();
            const link = String(form.get("link") || "").trim() || null;

            let notificationId = null;

            // مسار واحد ثابت: دالة V2 الآمنة في Supabase.
            // لا نستخدم الإدخال المباشر لأنه يخضع لسياسات RLS وقد يفشل حتى للأدمن.
            const rpcResult = await client.rpc("student_admin_broadcast_v2", {
                p_title: title,
                p_body: body,
                p_link: link
            });

            if (rpcResult.error) {
                console.error("Broadcast V2 RPC error:", rpcResult.error);
                button.disabled = false;
                button.textContent = "نشر الآن";
                const details = [
                    rpcResult.error.message,
                    rpcResult.error.details,
                    rpcResult.error.hint,
                    rpcResult.error.code
                ].filter(Boolean).join(" | ") || "خطأ غير معروف";
                toast(`فشل النشر: ${details}`);
                return;
            }

            notificationId = rpcResult.data || null;

            // الإشعار الداخلي تم نشره. فشل Push الخارجي لا يلغي نجاح النشر الداخلي.

            modal.remove();
            await load();
            toast("تم نشر الإشعار للجميع داخل التطبيق.");
        };
    }

    async function openExternalNotificationIfNeeded() {
        let notificationId = null;
        try {
            const url = new URL(location.href);
            notificationId = url.searchParams.get("student_notification");
            if (!notificationId) return false;
            url.searchParams.delete("student_notification");
            history.replaceState(history.state, "", url.pathname + url.search + url.hash);
        } catch (_) {
            return false;
        }

        const existing = state.items.find(x => String(x.id) === String(notificationId));
        let item = existing || null;
        if (!item) {
            const client = sb();
            const { data } = await client
                .from("notifications")
                .select("id,title,body,icon,kind,link,is_read,created_at,actor_id,metadata,is_broadcast,audience,user_id")
                .eq("id", notificationId)
                .maybeSingle();
            item = data || null;
        }
        if (!item) return false;
        if (!item.is_read) await markRead(item.id);
        await openNotificationTarget(item);
        return true;
    }

    async function init() {
        const client = sb();
        if (!client) return;
        const user = await getUser();
        if (!user) return;
        if (state.initializedFor === user.id) return;
        state.initializedFor = user.id;
        state.user = user;
        state.isAdmin = await checkAdmin();
        registerServiceWorker().catch(() => null);
        await load({ silent: state.items.length > 0 });
        subscribeRealtime().catch(console.error);
        if (Notification.permission === "granted") {
            syncFirebasePushToken({ requestPermission:false, silent:true }).catch(error => console.warn("FCM FID sync failed:", error));

            getFirebaseMessagingClient().then(({ messaging, onMessage }) => {
                if (typeof onMessage !== "function" || window.__studentFcmForegroundBound) return;
                window.__studentFcmForegroundBound = true;
                onMessage(messaging, (payload) => {
                    const title = payload?.notification?.title || payload?.data?.title || "Student";
                    const body = payload?.notification?.body || payload?.data?.body || "لديك إشعار جديد";
                    toast(`${title}: ${body}`);
                });
            }).catch(() => {});
        }
        const openedExternal = await openExternalNotificationIfNeeded().catch(() => false);
        if (!openedExternal) showFirstLoginPrompt();
    }

    async function open(options = {}) {
        const page = ensurePage();
        if (!options.fromReturn) {
            state.returnPending = false;
            state.returnTargetId = null;
        }
        page.classList.add("is-open");
        document.body.style.overflow = "hidden";
        render();
        await init();
        if (state.user && Date.now() - state.lastLoadedAt > 8000) {
            load({ silent: state.items.length > 0 }).catch(console.error);
        }
    }

    function close(options = {}) {
        const page = document.getElementById("student-notifications-page");
        page?.classList.remove("is-open");
        if (options.clearReturn !== false) {
            state.returnPending = false;
            state.returnTargetId = null;
        }
        document.body.style.overflow = "";
        return true;
    }

    function isOpen() {
        return document.getElementById("student-notifications-page")?.classList.contains("is-open") === true;
    }

    window.StudentNotifications = { init, open, close, enablePush, isOpen, hasPendingReturn, restoreAfterBack };
    window.openNotifications = open;

    const wait = setInterval(() => {
        if (sb()) {
            clearInterval(wait);
            init().catch(console.error);
        }
    }, 500);
    setTimeout(() => clearInterval(wait), 30000);
})();


/* ===== MERGED MODULE: account-role-onboarding.js ===== */
/* =========================================================
   Student - Account Role Onboarding
   اختيار حساب طالب أو مدرس
========================================================= */

(function () {
    "use strict";

    if (window.StudentAccountRoleOnboarding) return;

    const STORAGE_KEY = "student_pending_account_role";
    const GUEST_DONE_KEY = "student_guest_role_selected";
    let overlay = null;
    let busy = false;

    function escapeHTML(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function close() {
        overlay?.remove();
        overlay = null;
        document.body.style.overflow = "";
    }

    function setMessage(message, type) {
        const el = document.getElementById("student-role-message");
        if (!el) return;
        el.textContent = message || "";
        el.style.color = type === "error" ? "#b42318" : "#18794e";
    }

    function setBusy(value) {
        busy = value;
        document.querySelectorAll("[data-student-role]").forEach((button) => {
            button.disabled = value;
            button.style.opacity = value ? "0.65" : "1";
        });
    }

    async function isAdmin(client) {
        if (!client) return false;
        const { data, error } = await client.rpc("current_user_is_admin");
        if (error) {
            console.warn("Admin role check failed:", error);
            return false;
        }
        return data === true;
    }

    async function openTeacherPortal() {
        try {
            // StudentTeachersEducation مدمج داخل education-admin.js المحمّل مسبقًا.
            if (!window.StudentTeachersEducation?.openTeacherPortal) {
                throw new Error("واجهة المدرسين غير جاهزة");
            }
            window.StudentTeachersEducation.openTeacherPortal();
        } catch (error) {
            console.error("Teacher portal loading failed:", error);
        }
    }

    async function chooseRole(role, options) {
        if (busy || !["student", "teacher"].includes(role)) return;

        const { supabaseClient, user, onSelected } = options;

        if (!user) {
            localStorage.setItem(STORAGE_KEY, role);
            localStorage.setItem(GUEST_DONE_KEY, "1");
            close();
            return;
        }

        setBusy(true);
        setMessage("جارٍ حفظ اختيارك...", "success");

        try {
            const { data, error } = await supabaseClient.rpc(
                "choose_account_role",
                { selected_role: role }
            );

            if (error) throw error;

            localStorage.removeItem(STORAGE_KEY);
            localStorage.setItem(GUEST_DONE_KEY, "1");
            await onSelected?.(data || null);
            close();

            if (role === "teacher") {
                await openTeacherPortal();
            }
        } catch (error) {
            console.error("Choose account role error:", error);
            setMessage(error?.message || "تعذر حفظ نوع الحساب.", "error");
            setBusy(false);
        }
    }

    function render(options, pendingRole) {
        close();
        document.body.style.overflow = "hidden";

        overlay = document.createElement("div");
        overlay.id = "student-account-role-onboarding";
        overlay.setAttribute("role", "dialog");
        overlay.setAttribute("aria-modal", "true");
        overlay.style.cssText = `
            position:fixed;inset:0;z-index:2147483000;background:rgba(8,18,35,.72);
            display:flex;align-items:center;justify-content:center;padding:16px;direction:rtl;
            font-family:Tahoma,Arial,sans-serif;box-sizing:border-box;
        `;

        overlay.innerHTML = `
            <section style="width:100%;max-width:560px;max-height:94vh;overflow:auto;background:#fff;border-radius:24px;padding:22px;box-sizing:border-box;box-shadow:0 24px 70px rgba(0,0,0,.3);">
                <div style="text-align:center;margin-bottom:18px;">
                    <div style="width:58px;height:58px;border-radius:18px;background:#eaf4ff;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-size:28px;">🎓</div>
                    <h2 style="margin:0 0 8px;color:#14213d;font-size:23px;">اختر طريقة استخدام Student</h2>
                    <p style="margin:0;color:#667085;line-height:1.75;font-size:14px;">يمكنك إكمال الاستخدام كطالب، أو اختيار حساب مدرس وإرسال طلب اعتماد.</p>
                </div>

                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;">
                    <button type="button" data-student-role="student" style="text-align:right;border:2px solid ${pendingRole === "student" ? "#1877f2" : "#e4e7ec"};background:#fff;border-radius:18px;padding:17px;cursor:pointer;">
                        <strong style="display:block;color:#101828;font-size:18px;margin-bottom:9px;">👨‍🎓 الاستمرار كطالب</strong>
                        <span style="display:block;color:#475467;font-size:13px;line-height:1.8;">تصفح المراحل والمواد والمدرسين، والاستفادة من الملفات والشروحات المنشورة.</span>
                        <span style="display:block;color:#b42318;font-size:12px;line-height:1.7;margin-top:8px;">لا يجوز نشر محتوى تعليمي أو الظهور باسم مدرس.</span>
                    </button>

                    <button type="button" data-student-role="teacher" style="text-align:right;border:2px solid ${pendingRole === "teacher" ? "#d92d20" : "#e4e7ec"};background:#fff;border-radius:18px;padding:17px;cursor:pointer;">
                        <strong style="display:block;color:#101828;font-size:18px;margin-bottom:9px;">👨‍🏫 اختيار حساب مدرس</strong>
                        <span style="display:block;color:#475467;font-size:13px;line-height:1.8;">إنشاء صفحة مدرس، اختيار التخصص والمواد، ورفع الشروحات بعد اعتماد الطلب.</span>
                        <span style="display:block;color:#b42318;font-size:12px;line-height:1.7;margin-top:8px;">يلزم تقديم معلومات صحيحة والالتزام بجودة المحتوى وسياسات التطبيق.</span>
                    </button>
                </div>

                <div style="margin-top:14px;padding:13px 14px;background:#fff4f2;border:1px solid #fecdca;border-radius:14px;color:#912018;font-size:13px;line-height:1.8;">
                    🔴 يحصل المدرس المقبول على <strong>علامة توثيق حمراء مجانية</strong>. اختيار حساب مدرس لا يمنح التوثيق أو صلاحية النشر مباشرة؛ يبدأ ذلك بعد مراجعة الأدمن والموافقة.
                </div>

                <div id="student-role-message" style="min-height:22px;margin-top:10px;text-align:center;font-size:13px;"></div>
            </section>
        `;

        document.body.appendChild(overlay);

        overlay.querySelectorAll("[data-student-role]").forEach((button) => {
            button.addEventListener("click", () => {
                chooseRole(button.dataset.studentRole, options);
            });
        });
    }

    async function open(options = {}) {
        const profile = options.profile || null;
        const user = options.user || null;
        const client = options.supabaseClient || window.supabaseClient || null;

        if (user) {
            if (profile?.account_type_selected === true) return;
            if (await isAdmin(client)) return;
        } else if (localStorage.getItem(GUEST_DONE_KEY) === "1") {
            return;
        }

        const pendingRole = localStorage.getItem(STORAGE_KEY) || "";
        render({ ...options, supabaseClient: client }, pendingRole);
    }

    window.StudentAccountRoleOnboarding = { open, close };
})();


/* ===== MODULE: Learn English ===== */
(function () {
    "use strict";

    if (window.StudentLearnEnglish) return;

    const state = {
        user: null,
        stats: { xp: 0, level: 1, next_level_xp: 100, progress_percent: 0 },
        dailyVocabulary: [],
        dailyGrammar: [],
        currentQuestion: null,
        isAdmin: false
    };

    function sb() {
        return typeof supabaseClient !== "undefined" ? supabaseClient : null;
    }

    function esc(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function todayLocal() {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, "0");
        const d = String(now.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
    }

    async function processEnglishDiamondTasks(eventType) {
        const client = sb();
        if (!client || !eventType) return;
        try {
            await client.rpc("student_process_english_auto_tasks", {
                p_event_type: String(eventType)
            });
        } catch (error) {
            console.warn("English auto tasks:", error);
        }
    }

    async function getUser() {
        if (state.user) return state.user;
        if (typeof currentUser !== "undefined" && currentUser) {
            state.user = currentUser;
            return state.user;
        }
        const client = sb();
        if (!client) return null;
        const { data } = await client.auth.getUser();
        state.user = data?.user || null;
        return state.user;
    }

    function ensureStyles() {
        if (document.getElementById("student-learn-english-style")) return;

        const style = document.createElement("style");
        style.id = "student-learn-english-style";
        style.textContent = `
            .sle-wrap{width:min(900px,100%);margin:0 auto;padding:14px 14px 90px;direction:rtl;color:#172033}
            .sle-hero{background:#fff;border:1px solid #e5e9ed;border-radius:18px;padding:16px;margin-bottom:12px}
            .sle-hero-top{display:flex;align-items:center;justify-content:space-between;gap:12px}
            .sle-brand{display:flex;align-items:center;gap:11px}
            .sle-logo{width:48px;height:48px;border-radius:15px;background:#eef7ff;color:#0878c9;display:grid;place-items:center;font-size:22px}
            .sle-title{font-size:20px;font-weight:900}
            .sle-sub{font-size:12px;color:#7a8490;margin-top:3px}
            .sle-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:14px}
            .sle-stat{background:#f7f9fb;border:1px solid #edf0f3;border-radius:13px;padding:10px;text-align:center}
            .sle-stat strong{display:block;font-size:17px}.sle-stat span{font-size:10px;color:#808a95}
            .sle-progress{height:8px;background:#e8edf2;border-radius:999px;overflow:hidden;margin-top:12px}
            .sle-progress>span{display:block;height:100%;background:#0095f6;border-radius:999px}
            .sle-tabs{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px}
            .sle-tab{border:1px solid #e4e8ec;background:#fff;color:#263442;border-radius:13px;padding:12px;font:inherit;font-weight:900;cursor:pointer}
            .sle-tab.active{background:#0095f6;color:#fff;border-color:#0095f6}
            .sle-section{background:#fff;border:1px solid #e5e9ed;border-radius:18px;padding:15px;margin-bottom:12px}
            .sle-section-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}
            .sle-section-title{font-weight:900;font-size:16px}.sle-date{font-size:11px;color:#7a8490}
            .sle-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
            .sle-card{border:1px solid #e8ecef;background:#fff;border-radius:15px;padding:13px;min-width:0}
            .sle-word{font-size:18px;font-weight:900;direction:ltr;text-align:right}.sle-meaning{font-size:13px;color:#44515f;margin-top:5px}
            .sle-example{font-size:12px;color:#697581;background:#f8fafb;border-radius:10px;padding:9px;margin-top:8px;line-height:1.7}
            .sle-chip{display:inline-flex;padding:5px 8px;border-radius:8px;background:#eef7ff;color:#0878c9;font-size:10px;font-weight:800;margin-top:7px}
            .sle-btn{border:0;border-radius:11px;background:#0095f6;color:#fff;padding:10px 12px;font:inherit;font-weight:900;cursor:pointer}
            .sle-btn.secondary{background:#eef2f5;color:#263442}.sle-btn.danger{background:#fff0f1;color:#c62828}
            .sle-btn:disabled{opacity:.55;cursor:not-allowed}
            .sle-empty{text-align:center;color:#7c8792;padding:28px 14px;line-height:1.8}
            .sle-question{font-size:17px;font-weight:900;line-height:1.8;margin-bottom:13px}
            .sle-options{display:grid;gap:9px}.sle-option{border:1px solid #dfe5ea;background:#fff;border-radius:13px;padding:12px;text-align:right;font:inherit;cursor:pointer}
            .sle-option.correct{border-color:#2e9f5b;background:#eefaf2}.sle-option.wrong{border-color:#d84040;background:#fff1f1}
            .sle-result{margin-top:12px;border-radius:12px;padding:11px;line-height:1.7;font-size:13px}
            .sle-result.ok{background:#eefaf2;color:#1f7841}.sle-result.bad{background:#fff1f1;color:#ad3030}
            .sle-admin-row{display:flex;gap:8px;flex-wrap:wrap}.sle-admin-link{border:0;background:#eef2f5;color:#263442;border-radius:10px;padding:9px 11px;font:inherit;font-weight:800}
            .sle-admin-tabs{display:flex;gap:8px;overflow:auto;margin-bottom:12px}.sle-admin-tab{white-space:nowrap;border:1px solid #e4e8ec;background:#fff;border-radius:11px;padding:9px 12px;font:inherit;font-weight:800}
            .sle-admin-tab.active{background:#0095f6;color:#fff;border-color:#0095f6}
            .sle-form{display:grid;gap:10px}.sle-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}
            .sle-field label{display:block;font-size:11px;font-weight:800;margin-bottom:5px}.sle-field input,.sle-field textarea,.sle-field select{width:100%;box-sizing:border-box;border:1px solid #dce2e8;border-radius:11px;padding:10px 11px;background:#fff;font:inherit}
            .sle-field textarea{min-height:78px;resize:vertical}.sle-list{display:grid;gap:8px}.sle-list-item{border:1px solid #e7ebef;border-radius:13px;padding:11px;background:#fff;display:flex;justify-content:space-between;gap:10px;align-items:center}
            .sle-list-main{min-width:0}.sle-list-title{font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sle-list-meta{font-size:10px;color:#7b8590;margin-top:3px}
            @media(max-width:560px){.sle-wrap{padding:10px 10px 82px}.sle-grid{grid-template-columns:1fr}.sle-form-grid{grid-template-columns:1fr}.sle-stats{gap:6px}.sle-stat{padding:9px 6px}}
        `;
        document.head.appendChild(style);
    }

    function page(title, id, html = "") {
        ensureStyles();
        if (!window.StudentNavigation?.openPage) return null;
        const el = window.StudentNavigation.openPage({ id, title, html, reuse: true });
        return el?.querySelector(".student-internal-body") || null;
    }

    async function loadStats() {
        const client = sb();
        if (!client) return state.stats;
        const { data, error } = await client.rpc("student_english_get_stats");
        if (!error && data) {
            const row = Array.isArray(data) ? data[0] : data;
            state.stats = {
                xp: Number(row?.xp || 0),
                level: Number(row?.level || 1),
                next_level_xp: Number(row?.next_level_xp || 100),
                progress_percent: Number(row?.progress_percent || 0)
            };
        }
        return state.stats;
    }

    async function loadIsAdmin() {
        const client = sb();
        if (!client) return false;
        const { data } = await client.from("profiles").select("role").eq("id", (await getUser())?.id).maybeSingle();
        state.isAdmin = String(data?.role || "").toLowerCase() === "admin";
        return state.isAdmin;
    }

    function heroHTML() {
        const s = state.stats;
        return `
            <section class="sle-hero">
                <div class="sle-hero-top">
                    <div class="sle-brand">
                        <div class="sle-logo"><i class="fa-solid fa-language"></i></div>
                        <div>
                            <div class="sle-title">Learn English</div>
                            <div class="sle-sub">تعلّم يوميًا وتقدّم بمستواك خطوة بخطوة</div>
                        </div>
                    </div>
                    ${state.isAdmin ? `<button class="sle-admin-link" type="button" data-sle-admin><i class="fa-solid fa-gear"></i> إدارة</button>` : ""}
                </div>
                <div class="sle-stats">
                    <div class="sle-stat"><strong>${s.level}</strong><span>Level</span></div>
                    <div class="sle-stat"><strong>${s.xp}</strong><span>XP</span></div>
                    <div class="sle-stat"><strong>${Math.round(s.progress_percent)}%</strong><span>التقدم للمستوى التالي</span></div>
                </div>
                <div class="sle-progress"><span style="width:${Math.max(0, Math.min(100, s.progress_percent))}%"></span></div>
            </section>
        `;
    }

    async function open(defaultTab = "daily") {
        const user = await getUser();
        if (!user) return;

        await Promise.all([loadStats(), loadIsAdmin()]);
        const body = page("Learn English", "learn-english", "");
        if (!body) return;

        body.dataset.sleTab = defaultTab;
        await renderMain(body, defaultTab);
    }

    async function renderMain(body, activeTab = "daily") {
        body.innerHTML = `
            <div class="sle-wrap">
                ${heroHTML()}
                <div class="sle-tabs">
                    <button class="sle-tab ${activeTab === "daily" ? "active" : ""}" data-sle-tab="daily" type="button">Daily English</button>
                    <button class="sle-tab ${activeTab === "challenge" ? "active" : ""}" data-sle-tab="challenge" type="button">English Challenge</button>
                </div>
                <div id="sle-main-content"></div>
            </div>
        `;

        body.querySelector("[data-sle-admin]")?.addEventListener("click", openAdmin);
        body.querySelectorAll("[data-sle-tab]").forEach(btn => {
            btn.addEventListener("click", async () => {
                const tab = btn.dataset.sleTab;
                body.dataset.sleTab = tab;
                await renderMain(body, tab);
            });
        });

        const target = body.querySelector("#sle-main-content");
        if (activeTab === "challenge") {
            await processEnglishDiamondTasks("english_open_challenge");
            await renderChallenge(target, body);
        } else {
            await processEnglishDiamondTasks("english_open_daily");
            await renderDaily(target, body);
        }
    }

    async function renderDaily(target, mainBody) {
        target.innerHTML = `<section class="sle-section"><div class="sle-empty">جارٍ تحميل درس اليوم...</div></section>`;
        const client = sb();
        if (!client) return;

        const date = todayLocal();
        const [vocabRes, grammarRes] = await Promise.all([
            client.rpc("student_english_get_daily_vocabulary", { p_day: date }),
            client.rpc("student_english_get_daily_grammar", { p_day: date })
        ]);

        state.dailyVocabulary = vocabRes.error ? [] : (vocabRes.data || []);
        state.dailyGrammar = grammarRes.error ? [] : (grammarRes.data || []);

        target.innerHTML = `
            <section class="sle-section">
                <div class="sle-section-head">
                    <div class="sle-section-title">مفردات اليوم</div>
                    <div class="sle-date">${esc(date)}</div>
                </div>
                <div class="sle-grid" id="sle-vocab-grid">
                    ${state.dailyVocabulary.length ? state.dailyVocabulary.map(v => `
                        <article class="sle-card" data-vocab-card="${esc(v.id)}">
                            <div class="sle-word">${esc(v.word)}</div>
                            <div class="sle-meaning">${esc(v.meaning_ar || "")}</div>
                            ${v.pronunciation ? `<span class="sle-chip">${esc(v.pronunciation)}</span>` : ""}
                            ${v.example_sentence ? `<div class="sle-example" dir="ltr">${esc(v.example_sentence)}</div>` : ""}
                            <button class="sle-btn" style="width:100%;margin-top:10px" data-learn-vocab="${esc(v.id)}" type="button">تعلمتها</button>
                        </article>
                    `).join("") : `<div class="sle-empty">أكملت مفردات اليوم، أو لم يضف الأدمن مفردات لهذا اليوم بعد.</div>`}
                </div>
            </section>

            <section class="sle-section">
                <div class="sle-section-head">
                    <div class="sle-section-title">قاعدة اليوم</div>
                    <div class="sle-date">${esc(date)}</div>
                </div>
                <div class="sle-grid" id="sle-grammar-grid">
                    ${state.dailyGrammar.length ? state.dailyGrammar.map(g => `
                        <article class="sle-card" data-grammar-card="${esc(g.id)}">
                            <div style="font-weight:900;font-size:16px">${esc(g.title)}</div>
                            <div style="line-height:1.8;color:#44515f;margin-top:8px;white-space:pre-wrap">${esc(g.explanation || "")}</div>
                            ${g.example_sentence ? `<div class="sle-example" dir="ltr">${esc(g.example_sentence)}</div>` : ""}
                            <button class="sle-btn" style="width:100%;margin-top:10px" data-read-grammar="${esc(g.id)}" type="button">فهمت القاعدة</button>
                        </article>
                    `).join("") : `<div class="sle-empty">أكملت قاعدة اليوم، أو لم يضف الأدمن قاعدة لهذا اليوم بعد.</div>`}
                </div>
            </section>
        `;

        target.querySelectorAll("[data-learn-vocab]").forEach(btn => {
            btn.addEventListener("click", async () => {
                btn.disabled = true;
                const { error } = await client.rpc("student_english_complete_item", {
                    p_item_type: "vocabulary",
                    p_item_id: btn.dataset.learnVocab
                });
                if (!error) {
                    btn.closest("[data-vocab-card]")?.remove();
                    await loadStats();
                    await processEnglishDiamondTasks("english_vocabulary");
                    await processEnglishDiamondTasks("english_daily_complete");
                    refreshHero(mainBody);
                } else btn.disabled = false;
            });
        });

        target.querySelectorAll("[data-read-grammar]").forEach(btn => {
            btn.addEventListener("click", async () => {
                btn.disabled = true;
                const { error } = await client.rpc("student_english_complete_item", {
                    p_item_type: "grammar",
                    p_item_id: btn.dataset.readGrammar
                });
                if (!error) {
                    btn.closest("[data-grammar-card]")?.remove();
                    await loadStats();
                    await processEnglishDiamondTasks("english_grammar");
                    await processEnglishDiamondTasks("english_daily_complete");
                    refreshHero(mainBody);
                } else btn.disabled = false;
            });
        });
    }

    function refreshHero(body) {
        const oldHero = body.querySelector(".sle-hero");
        if (!oldHero) return;
        const temp = document.createElement("div");
        temp.innerHTML = heroHTML();
        const fresh = temp.firstElementChild;
        oldHero.replaceWith(fresh);
        fresh.querySelector("[data-sle-admin]")?.addEventListener("click", openAdmin);
    }

    async function renderChallenge(target, mainBody) {
        target.innerHTML = `<section class="sle-section"><div class="sle-empty">جارٍ تحميل السؤال...</div></section>`;
        const client = sb();
        if (!client) return;

        const { data, error } = await client.rpc("student_english_get_next_question");
        const q = !error && data ? (Array.isArray(data) ? data[0] : data) : null;
        state.currentQuestion = q || null;

        if (!q?.id) {
            target.innerHTML = `
                <section class="sle-section">
                    <div class="sle-section-title">English Challenge</div>
                    <div class="sle-empty">لا توجد أسئلة متاحة لمستواك حاليًا.<br>عند إضافة الأدمن أسئلة جديدة ستظهر لك، والأسئلة التي حللتها لن تتكرر.</div>
                </section>`;
            return;
        }

        target.innerHTML = `
            <section class="sle-section">
                <div class="sle-section-head">
                    <div class="sle-section-title">Level ${Number(q.level || 1)}</div>
                    <span class="sle-chip">+${Number(q.xp_reward || 10)} XP عند الإجابة الصحيحة</span>
                </div>
                <div class="sle-question">${esc(q.question_text)}</div>
                <div class="sle-options">
                    ${["A","B","C","D"].map(letter => `
                        <button class="sle-option" type="button" data-answer="${letter}">
                            <strong>${letter}.</strong>
                            ${esc(q[`option_${letter.toLowerCase()}`] || "")}
                        </button>
                    `).join("")}
                </div>
                <div id="sle-answer-result"></div>
            </section>
        `;

        target.querySelectorAll("[data-answer]").forEach(btn => {
            btn.addEventListener("click", async () => {
                const buttons = [...target.querySelectorAll("[data-answer]")];
                buttons.forEach(x => x.disabled = true);

                const { data: answerData, error: answerError } = await client.rpc("student_english_answer_question", {
                    p_question_id: q.id,
                    p_answer: btn.dataset.answer
                });

                if (answerError) {
                    buttons.forEach(x => x.disabled = false);
                    return;
                }

                const result = Array.isArray(answerData) ? answerData[0] : answerData;
                const correct = !!result?.is_correct;
                const correctOption = String(result?.correct_option || "").toUpperCase();

                buttons.forEach(x => {
                    if (x.dataset.answer === correctOption) x.classList.add("correct");
                    else if (x === btn && !correct) x.classList.add("wrong");
                });

                const box = target.querySelector("#sle-answer-result");
                box.innerHTML = `
                    <div class="sle-result ${correct ? "ok" : "bad"}">
                        <strong>${correct ? "إجابة صحيحة" : "إجابة غير صحيحة"}</strong>
                        ${result?.explanation ? `<div style="margin-top:5px">${esc(result.explanation)}</div>` : ""}
                    </div>
                    <button class="sle-btn" id="sle-next-question" style="width:100%;margin-top:10px" type="button">السؤال التالي</button>
                `;

                await loadStats();
                await processEnglishDiamondTasks("english_mcq_answered");
                if (correct) await processEnglishDiamondTasks("english_mcq_correct");
                await processEnglishDiamondTasks("english_level_reached");
                refreshHero(mainBody);
                box.querySelector("#sle-next-question")?.addEventListener("click", () => renderChallenge(target, mainBody));
            });
        });
    }

    async function openAdmin() {
        if (!(await loadIsAdmin())) return;
        const body = page("إدارة Learn English", "learn-english-admin", "");
        if (!body) return;
        await renderAdmin(body, "vocabulary");
    }

    async function renderAdmin(body, tab = "vocabulary") {
        body.innerHTML = `
            <div class="sle-wrap">
                <section class="sle-hero">
                    <div class="sle-title">إدارة Learn English</div>
                    <div class="sle-sub">إضافة وحذف المحتوى. هذه الصفحة متاحة للأدمن فقط.</div>
                </section>
                <div class="sle-admin-tabs">
                    <button class="sle-admin-tab ${tab==="vocabulary"?"active":""}" data-admin-tab="vocabulary" type="button">المفردات</button>
                    <button class="sle-admin-tab ${tab==="grammar"?"active":""}" data-admin-tab="grammar" type="button">القواعد</button>
                    <button class="sle-admin-tab ${tab==="questions"?"active":""}" data-admin-tab="questions" type="button">MCQ</button>
                </div>
                <div id="sle-admin-content"></div>
            </div>`;

        body.querySelectorAll("[data-admin-tab]").forEach(btn => {
            btn.addEventListener("click", () => renderAdmin(body, btn.dataset.adminTab));
        });

        const target = body.querySelector("#sle-admin-content");
        if (tab === "grammar") await renderGrammarAdmin(target, body);
        else if (tab === "questions") await renderQuestionsAdmin(target, body);
        else await renderVocabularyAdmin(target, body);
    }

    async function adminList(type) {
        const client = sb();
        if (!client) return [];
        const { data, error } = await client.rpc("student_english_admin_list", { p_type: type });
        return error ? [] : (data || []);
    }

    async function renderVocabularyAdmin(target, body) {
        const rows = await adminList("vocabulary");
        target.innerHTML = `
            <section class="sle-section">
                <div class="sle-section-title" style="margin-bottom:12px">إضافة مفردة</div>
                <form class="sle-form" id="sle-vocab-form">
                    <div class="sle-form-grid">
                        <div class="sle-field"><label>الكلمة</label><input name="word" required maxlength="80"></div>
                        <div class="sle-field"><label>المعنى بالعربي</label><input name="meaning" required maxlength="180"></div>
                    </div>
                    <div class="sle-form-grid">
                        <div class="sle-field"><label>النطق (اختياري)</label><input name="pronunciation" maxlength="80"></div>
                        <div class="sle-field"><label>تاريخ الظهور</label><input name="day" type="date" value="${todayLocal()}" required></div>
                    </div>
                    <div class="sle-field"><label>مثال</label><textarea name="example" maxlength="400"></textarea></div>
                    <button class="sle-btn" type="submit">إضافة المفردة</button>
                </form>
            </section>
            ${adminItemsSection(rows, "vocabulary")}
        `;
        bindAdminDelete(target, body, "vocabulary");
        target.querySelector("#sle-vocab-form")?.addEventListener("submit", async e => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const client = sb();
            const { error } = await client.rpc("student_english_admin_add_vocabulary", {
                p_word: String(f.get("word")||"").trim(),
                p_meaning_ar: String(f.get("meaning")||"").trim(),
                p_example_sentence: String(f.get("example")||"").trim(),
                p_pronunciation: String(f.get("pronunciation")||"").trim(),
                p_available_date: String(f.get("day")||todayLocal())
            });
            if (!error) await renderAdmin(body, "vocabulary");
        });
    }

    async function renderGrammarAdmin(target, body) {
        const rows = await adminList("grammar");
        target.innerHTML = `
            <section class="sle-section">
                <div class="sle-section-title" style="margin-bottom:12px">إضافة قاعدة</div>
                <form class="sle-form" id="sle-grammar-form">
                    <div class="sle-form-grid">
                        <div class="sle-field"><label>عنوان القاعدة</label><input name="title" required maxlength="120"></div>
                        <div class="sle-field"><label>تاريخ الظهور</label><input name="day" type="date" value="${todayLocal()}" required></div>
                    </div>
                    <div class="sle-field"><label>الشرح</label><textarea name="explanation" required maxlength="2000"></textarea></div>
                    <div class="sle-field"><label>مثال</label><textarea name="example" maxlength="400"></textarea></div>
                    <button class="sle-btn" type="submit">إضافة القاعدة</button>
                </form>
            </section>
            ${adminItemsSection(rows, "grammar")}
        `;
        bindAdminDelete(target, body, "grammar");
        target.querySelector("#sle-grammar-form")?.addEventListener("submit", async e => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const client = sb();
            const { error } = await client.rpc("student_english_admin_add_grammar", {
                p_title: String(f.get("title")||"").trim(),
                p_explanation: String(f.get("explanation")||"").trim(),
                p_example_sentence: String(f.get("example")||"").trim(),
                p_available_date: String(f.get("day")||todayLocal())
            });
            if (!error) await renderAdmin(body, "grammar");
        });
    }

    async function renderQuestionsAdmin(target, body) {
        const rows = await adminList("questions");
        target.innerHTML = `
            <section class="sle-section">
                <div class="sle-section-title" style="margin-bottom:12px">إضافة سؤال MCQ</div>
                <form class="sle-form" id="sle-question-form">
                    <div class="sle-form-grid">
                        <div class="sle-field"><label>Level</label><select name="level">${[1,2,3,4,5].map(x=>`<option value="${x}">${x}</option>`).join("")}</select></div>
                        <div class="sle-field"><label>XP</label><input name="xp" type="number" min="1" max="100" value="10"></div>
                    </div>
                    <div class="sle-field"><label>السؤال</label><textarea name="question" required maxlength="1000"></textarea></div>
                    <div class="sle-form-grid">
                        <div class="sle-field"><label>A</label><input name="a" required maxlength="400"></div>
                        <div class="sle-field"><label>B</label><input name="b" required maxlength="400"></div>
                        <div class="sle-field"><label>C</label><input name="c" required maxlength="400"></div>
                        <div class="sle-field"><label>D</label><input name="d" required maxlength="400"></div>
                    </div>
                    <div class="sle-form-grid">
                        <div class="sle-field"><label>الإجابة الصحيحة</label><select name="correct"><option>A</option><option>B</option><option>C</option><option>D</option></select></div>
                        <div class="sle-field"><label>التفسير بعد الحل</label><input name="explanation" maxlength="600"></div>
                    </div>
                    <button class="sle-btn" type="submit">إضافة السؤال</button>
                </form>
            </section>
            ${adminItemsSection(rows, "questions")}
        `;
        bindAdminDelete(target, body, "questions");
        target.querySelector("#sle-question-form")?.addEventListener("submit", async e => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const client = sb();
            const { error } = await client.rpc("student_english_admin_add_question", {
                p_level: Number(f.get("level")||1),
                p_question_text: String(f.get("question")||"").trim(),
                p_option_a: String(f.get("a")||"").trim(),
                p_option_b: String(f.get("b")||"").trim(),
                p_option_c: String(f.get("c")||"").trim(),
                p_option_d: String(f.get("d")||"").trim(),
                p_correct_option: String(f.get("correct")||"A"),
                p_explanation: String(f.get("explanation")||"").trim(),
                p_xp_reward: Number(f.get("xp")||10)
            });
            if (!error) await renderAdmin(body, "questions");
        });
    }

    function adminItemsSection(rows, type) {
        return `
            <section class="sle-section">
                <div class="sle-section-head">
                    <div class="sle-section-title">المحتوى الحالي</div>
                    <span class="sle-date">${rows.length} عنصر</span>
                </div>
                <div class="sle-list">
                    ${rows.length ? rows.map(row => `
                        <div class="sle-list-item">
                            <div class="sle-list-main">
                                <div class="sle-list-title">${esc(row.title)}</div>
                                <div class="sle-list-meta">${esc(row.meta || "")}</div>
                            </div>
                            <button class="sle-btn danger" type="button" data-admin-delete="${esc(row.id)}" data-admin-delete-type="${esc(type)}">حذف</button>
                        </div>
                    `).join("") : `<div class="sle-empty">لا يوجد محتوى بعد.</div>`}
                </div>
            </section>
        `;
    }

    function bindAdminDelete(target, body, tab) {
        target.querySelectorAll("[data-admin-delete]").forEach(btn => {
            btn.addEventListener("click", async () => {
                btn.disabled = true;
                const client = sb();
                const { error } = await client.rpc("student_english_admin_delete", {
                    p_type: btn.dataset.adminDeleteType,
                    p_id: btn.dataset.adminDelete
                });
                if (!error) await renderAdmin(body, tab);
                else btn.disabled = false;
            });
        });
    }

    function attachAdminDashboardButton() {
        const tryAttach = () => {
            const tools = document.querySelector(".student-admin-tools");
            if (!tools || document.getElementById("student-open-english-management")) return false;

            const btn = document.createElement("button");
            btn.className = "student-admin-tool-button";
            btn.id = "student-open-english-management";
            btn.type = "button";
            btn.innerHTML = `<i class="fa-solid fa-language"></i> إدارة Learn English`;
            btn.addEventListener("click", openAdmin);
            tools.appendChild(btn);
            return true;
        };

        if (tryAttach()) return;
        const observer = new MutationObserver(() => {
            if (tryAttach()) observer.disconnect();
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });
        setTimeout(() => observer.disconnect(), 60000);
    }

    attachAdminDashboardButton();

    window.StudentLearnEnglish = { open, openAdmin };
})();
