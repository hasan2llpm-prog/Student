/* =========================================================
   Student - Main App (Updated)
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
        
        // بناء الأشرطة المحدثة فور عرض الشاشة الرئيسية لضمان عدم التجمد
        updateTopAndBottomBars();
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
                    role
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

        if (welcomeUser && data?.full_name) {
            welcomeUser.textContent = `مرحباً ${data.full_name}`;
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
            followers: Number(stats?.followers_count || 0),
            following: Number(stats?.following_count || 0)
        };

    } catch (error) {
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

    if (session?.user) {

        currentUser =
            session.user;

        showMainScreen();

        await loadProfile(
            session.user.id
        );

    } else {

        currentUser =
            null;

        currentProfile =
            null;

        showAuthScreen();
    }
}


/* =========================================================
   تسجيل الدخول والتسجيل
========================================================= */

async function loginUser(event) {
    event.preventDefault();
    clearMessages();

    if (!supabaseClient) {
        showMessage("login-message", "خدمة تسجيل الدخول غير جاهزة حالياً.", "error");
        return;
    }

    const emailElement = document.getElementById("login-email");
    const passwordElement = document.getElementById("login-password");

    if (!emailElement || !passwordElement) return;

    const email = emailElement.value.trim();
    const password = passwordElement.value;

    if (!email || !password) {
        showMessage("login-message", "اكتب البريد الإلكتروني وكلمة المرور.", "error");
        return;
    }

    setButtonLoading("login-btn", true, "دخول");

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (!data?.session) throw new Error("لم يتم إنشاء جلسة تسجيل الدخول.");

        await handleSession(data.session);
    } catch (error) {
        showMessage("login-message", translateAuthError(error), "error");
    } finally {
        setButtonLoading("login-btn", false, "دخول");
    }
}


async function registerUser(event) {
    event.preventDefault();
    clearMessages();

    if (!supabaseClient) {
        showMessage("register-message", "خدمة التسجيل غير جاهزة حالياً.", "error");
        return;
    }

    const nameElement = document.getElementById("register-name");
    const emailElement = document.getElementById("register-email");
    const passwordElement = document.getElementById("register-password");
    const confirmPasswordElement = document.getElementById("register-password-confirm");

    if (!nameElement || !emailElement || !passwordElement || !confirmPasswordElement) return;

    const fullName = nameElement.value.trim();
    const email = emailElement.value.trim();
    const password = passwordElement.value;
    const confirmPassword = confirmPasswordElement.value;

    if (!fullName || !email) {
        showMessage("register-message", "الرجاء تعبئة الحقول المطلوبة.", "error");
        return;
    }

    if (password.length < 6) {
        showMessage("register-message", "كلمة المرور يجب أن تكون 6 أحرف على الأقل.", "error");
        return;
    }

    if (password !== confirmPassword) {
        showMessage("register-message", "كلمتا المرور غير متطابقتين.", "error");
        return;
    }

    setButtonLoading("register-btn", true, "إنشاء الحساب");

    try {
        const { data, error } = await supabaseClient.auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName } }
        });

        if (error) throw error;

        if (data?.session) {
            await handleSession(data.session);
        } else {
            showMessage("register-message", "تم إنشاء الحساب. تحقق من بريدك الإلكتروني.", "success");
        }
    } catch (error) {
        showMessage("register-message", translateAuthError(error), "error");
    } finally {
        setButtonLoading("register-btn", false, "إنشاء الحساب");
    }
}


async function logoutUser() {
    try {
        if (supabaseClient) {
            await supabaseClient.auth.signOut();
        }
        currentUser = null;
        currentProfile = null;
        closeFloatingPanel();
        showAuthScreen();
    } catch (error) {
        console.error("Logout error:", error);
    }
}


function translateAuthError(error) {
    const message = String(error?.message || "").toLowerCase();
    if (message.includes("invalid login credentials")) return "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
    if (message.includes("email not confirmed")) return "يجب تأكيد البريد الإلكتروني أولاً.";
    if (message.includes("user already registered")) return "هذا البريد الإلكتروني مسجل مسبقاً.";
    return error?.message || "حدث خطأ غير متوقع.";
}


/* =========================================================
   النوافذ العائمة مع حل مشاكل التجمد (الصفنة)
========================================================= */

function closeFloatingPanel() {
    const panel = document.getElementById("floating-panel");
    if (panel) {
        panel.remove();
    }
}


function showFloatingPanel(title, content) {
    // منع تداخل النوافذ أو تجمدها بإزالة أي لوحة سابقة فوراً
    closeFloatingPanel();

    const panel = document.createElement("div");
    panel.id = "floating-panel";
    panel.style.position = "fixed";
    panel.style.inset = "0";
    panel.style.zIndex = "999999";
    panel.style.background = "rgba(0,0,0,0.35)";
    panel.style.display = "flex";
    panel.style.alignItems = "center";
    panel.style.justifyContent = "center";
    panel.style.padding = "20px";
    panel.style.boxSizing = "border-box";
    panel.style.direction = "rtl";

    panel.innerHTML = `
        <div style="
            width:100%;
            max-width:450px;
            max-height:88vh;
            overflow:auto;
            background:#fff;
            border-radius:22px;
            padding:22px;
            box-sizing:border-box;
            box-shadow:0 15px 50px rgba(0,0,0,0.22);
        ">
            <div style="
                display:flex;
                align-items:center;
                justify-content:space-between;
                gap:15px;
                margin-bottom:18px;
            ">
                <h2 style="margin:0; font-size:21px; color:#222;">${title}</h2>
                <button id="floating-close" type="button" style="
                    width:40px; height:40px; border:none; border-radius:50%;
                    background:#f1f3f5; color:#333; font-size:22px; cursor:pointer;
                ">×</button>
            </div>
            ${content}
        </div>
    `;

    document.body.appendChild(panel);

    document.getElementById("floating-close")?.addEventListener("click", closeFloatingPanel);
    panel.addEventListener("click", function(event) {
        if (event.target === panel) {
            closeFloatingPanel();
        }
    });
}


/* =========================================================
   الملف الشخصي والإعدادات
========================================================= */

async function showProfilePanel() {
    if (!currentUser) return;
    closeFloatingPanel();

    const profile = currentProfile || await loadProfile(currentUser.id);
    const stats = await getProfileStats(currentUser.id);

    showFloatingPanel(
        "الملف الشخصي",
        `
        <div>
            <div style="text-align:center; margin-bottom:20px;">
                <div style="font-size:20px; font-weight:700; color:#222;">${escapeHTML(profile?.full_name || "بدون اسم")}</div>
                <div style="color:#777; font-size:14px;">@${escapeHTML(profile?.username || "username")}</div>
            </div>
            <div style="display:flex; justify-content:space-around; text-align:center; border-top:1px solid #eee; border-bottom:1px solid #eee; padding:15px 5px; margin-bottom:18px;">
                <div><strong style="display:block; font-size:19px;">${stats.followers}</strong><span style="color:#777; font-size:13px;">المتابعون</span></div>
                <div><strong style="display:block; font-size:19px;">${stats.following}</strong><span style="color:#777; font-size:13px;">يتابعهم</span></div>
            </div>
            <div style="display:grid; grid-template-columns:1fr; gap:10px;">
                <button id="profile-logout-btn" type="button" style="border:none; background:#fff2f2; color:#d93025; padding:13px; border-radius:12px; font-size:15px; cursor:pointer;">تسجيل الخروج</button>
            </div>
        </div>
        `
    );

    document.getElementById("profile-logout-btn")?.addEventListener("click", logoutUser);
}


function showSettingsPanel() {
    closeFloatingPanel();
    showFloatingPanel(
        "الإعدادات",
        `
        <div style="display:flex; flex-direction:column; gap:10px;">
            <button id="settings-profile-btn" type="button" style="width:100%; border:none; background:#f7f8fa; padding:15px; border-radius:14px; text-align:right; font-size:15px; cursor:pointer;">
                👤 الملف الشخصي
            </button>
            <div style="display:flex; justify-content:space-between; padding:15px; background:#f7f8fa; border-radius:14px;">
                <span>اللغة</span><strong>العربية</strong>
            </div>
            <div style="display:flex; justify-content:space-between; padding:15px; background:#f7f8fa; border-radius:14px;">
                <span>الإشعارات</span><strong>مفعلة</strong>
            </div>
        </div>
        `
    );

    document.getElementById("settings-profile-btn")?.addEventListener("click", showProfilePanel);
}


function openMenu() {
    closeFloatingPanel();
    showFloatingPanel(
        "القائمة",
        `
        <div style="display:flex; flex-direction:column; gap:10px;">
            <button id="menu-settings-btn" type="button" style="width:100%; border:none; background:#f7f8fa; padding:15px; border-radius:14px; text-align:right; font-size:15px; cursor:pointer;">
                ⚙️ الإعدادات
            </button>
            <button id="menu-logout-btn" type="button" style="width:100%; border:none; background:#fff2f2; color:#d93025; padding:15px; border-radius:14px; text-align:right; font-size:15px; cursor:pointer;">
                🚪 تسجيل الخروج
            </button>
        </div>
        `
    );

    document.getElementById("menu-settings-btn")?.addEventListener("click", showSettingsPanel);
    document.getElementById("menu-logout-btn")?.addEventListener("click", logoutUser);
}


/* =========================================================
   تعديل الأشرطة (العلوي والسفلي) بحسب متطلباتك
   11- الشريط العلوي: زر + في اليمين، اسم التطبيق في الوسط، القائمة على اليسار.
   12- الشريط السفلي: رئيسية، ريلز، مراسلة، بحث، إشعارات (بدون ملف شخصي).
========================================================= */

function updateTopAndBottomBars() {
    // تحديث الشريط العلوي
    const topBar = document.querySelector(".top-bar") || document.querySelector("header");
    if (topBar) {
        topBar.style.display = "flex";
        topBar.style.justifyContent = "space-between";
        topBar.style.alignItems = "center";
        topBar.style.padding = "10px 15px";
        topBar.innerHTML = `
            <button id="top-menu-btn" style="background:none; border:none; font-size:20px; cursor:pointer;">☰</button>
            <span style="font-weight:bold; font-size:18px;">Student</span>
            <button id="top-add-btn" style="background:none; border:none; font-size:22px; cursor:pointer; color:#0095f6;">+</button>
        `;

        document.getElementById("top-menu-btn")?.addEventListener("click", openMenu);
        document.getElementById("top-add-btn")?.addEventListener("click", addStory);
    }

    // تحديث الشريط السفلي (إلغاء زر الملف الشخصي تماماً)
    const bottomNav = document.querySelector("nav") || document.querySelector(".bottom-nav");
    if (bottomNav) {
        bottomNav.style.display = "flex";
        bottomNav.style.justifyContent = "space-around";
        bottomNav.style.padding = "10px 0";
        bottomNav.innerHTML = `
            <a href="#" data-section="home" style="text-decoration:none; color:#333; text-align:center;">🏠<br><small>الرئيسية</small></a>
            <a href="#" data-section="reels" style="text-decoration:none; color:#333; text-align:center;">🎬<br><small>ريلز</small></a>
            <a href="#" data-section="messages" style="text-decoration:none; color:#333; text-align:center;">💬<br><small>مراسلة</small></a>
            <a href="#" data-section="search" style="text-decoration:none; color:#333; text-align:center;">🔎<br><small>بحث</small></a>
            <a href="#" data-section="notifications" style="text-decoration:none; color:#333; text-align:center;">🔔<br><small>إشعارات</small></a>
        `;

        bottomNav.querySelectorAll("a").forEach(link => {
            link.addEventListener("click", (e) => {
                e.preventDefault();
                const section = link.getAttribute("data-section");
                if (section === "reels") {
                    // الانتقال لقسم الريلز
                } else if (section === "notifications") {
                    openNotifications();
                } else if (section === "messages") {
                    openBottomSection("messages");
                } else if (section === "search") {
                    openBottomSection("search");
                } else {
                    openBottomSection("home");
                }
            });
        });
    }
}


function openNotifications() {
    closeFloatingPanel();
    showFloatingPanel(
        "الإشعارات",
        `<div style="text-align:center; padding:30px 10px;"><p style="color:#666; margin:0;">لا توجد إشعارات جديدة.</p></div>`
    );
}

function openStory(name) {
    closeFloatingPanel();
    showFloatingPanel(name || "الستوري", `<div style="height:350px; background:#0095f6; display:flex; align-items:center; justify-content:center; color:white;">${escapeHTML(name)}</div>`);
}

function addStory() {
    closeFloatingPanel();
    showFloatingPanel("إضافة ستوري", `<div style="text-align:center; padding:25px;"><p>اختر صورة أو فيديو لإضافة ستوري.</p></div>`);
}

function openBottomSection(section) {
    closeFloatingPanel();
    showFloatingPanel(section, `<div style="text-align:center; padding:25px;"><p>محتوى قسم ${section}</p></div>`);
}

function escapeHTML(value) {
    return String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}


/* =========================================================
   تشغيل التطبيق
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function() {
        const loginForm = document.getElementById("login-form");
        if (loginForm) loginForm.addEventListener("submit", loginUser);

        const registerForm = document.getElementById("register-form");
        if (registerForm) registerForm.addEventListener("submit", registerUser);

        document.getElementById("show-register")?.addEventListener("click", (e) => { e.preventDefault(); showRegister(); });
        document.getElementById("show-login")?.addEventListener("click", (e) => { e.preventDefault(); showLogin(); });

        initSupabase();
    }
);
