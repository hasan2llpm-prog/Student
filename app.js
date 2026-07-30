let supabaseClient = null;

const CONFIG_URL =
    "https://raw.githubusercontent.com/hasan2llpm-prog/Student/main/config.json";

let currentUser = null;


/* =========================================================
   الرسائل
========================================================= */

function showMessage(elementId, message, type = "") {
    const element = document.getElementById(elementId);

    if (!element) return;

    element.textContent = message;
    element.className = "auth-message";

    if (type) {
        element.classList.add(type);
    }
}


function clearMessages() {
    showMessage("login-message", "");
    showMessage("register-message", "");
}


/* =========================================================
   حالة الأزرار
========================================================= */

function setButtonLoading(buttonId, loading, normalText) {
    const button = document.getElementById(buttonId);

    if (!button) return;

    button.disabled = loading;
    button.textContent = loading
        ? "جارٍ التنفيذ..."
        : normalText;
}


/* =========================================================
   تسجيل الدخول / التسجيل
========================================================= */

function showLogin() {
    const loginSection =
        document.getElementById("login-section");

    const registerSection =
        document.getElementById("register-section");

    if (loginSection) {
        loginSection.classList.remove("hidden");
    }

    if (registerSection) {
        registerSection.classList.add("hidden");
    }

    clearMessages();
}


function showRegister() {
    const loginSection =
        document.getElementById("login-section");

    const registerSection =
        document.getElementById("register-section");

    if (registerSection) {
        registerSection.classList.remove("hidden");
    }

    if (loginSection) {
        loginSection.classList.add("hidden");
    }

    clearMessages();
}


/* =========================================================
   الشاشات
========================================================= */

function showMainScreen() {
    const authScreen =
        document.getElementById("auth-screen");

    const mainScreen =
        document.getElementById("main-screen");

    if (authScreen) {
        authScreen.classList.add("hidden");
    }

    if (mainScreen) {
        mainScreen.classList.remove("hidden");
    }
}


function showAuthScreen() {
    const mainScreen =
        document.getElementById("main-screen");

    const authScreen =
        document.getElementById("auth-screen");

    if (mainScreen) {
        mainScreen.classList.add("hidden");
    }

    if (authScreen) {
        authScreen.classList.remove("hidden");
    }

    showLogin();
}


/* =========================================================
   الملف الشخصي
========================================================= */

async function loadProfile(userId) {

    if (!supabaseClient || !userId) {
        return;
    }

    try {

        const { data, error } =
            await supabaseClient
                .from("profiles")
                .select("full_name, username, role")
                .eq("id", userId)
                .maybeSingle();

        if (error) {
            console.error("Profile error:", error);
            return;
        }

        const welcomeUser =
            document.getElementById("welcome-user");

        if (!welcomeUser) {
            return;
        }

        if (data?.full_name) {

            welcomeUser.textContent =
                `مرحباً ${data.full_name}`;

        } else if (data?.username) {

            welcomeUser.textContent =
                `مرحباً ${data.username}`;

        } else {

            welcomeUser.textContent =
                "مرحباً بك";
        }

    } catch (error) {

        console.error(
            "Profile error:",
            error
        );
    }
}


/* =========================================================
   الجلسة
========================================================= */

async function handleSession(session) {

    if (session?.user) {

        currentUser = session.user;

        showMainScreen();

        await loadProfile(
            session.user.id
        );

    } else {

        currentUser = null;

        showAuthScreen();
    }
}


/* =========================================================
   تسجيل الدخول
========================================================= */

async function loginUser(event) {

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
        document.getElementById("login-email");

    const passwordElement =
        document.getElementById("login-password");

    if (!emailElement || !passwordElement) {
        return;
    }

    const email =
        emailElement.value.trim();

    const password =
        passwordElement.value;

    if (!email || !password) {

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

        const { data, error } =
            await supabaseClient.auth.signInWithPassword({
                email,
                password
            });

        if (error) {
            throw error;
        }

        if (!data?.session) {
            throw new Error(
                "لم يتم إنشاء جلسة."
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
            translateAuthError(error),
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
   إنشاء حساب
========================================================= */

async function registerUser(event) {

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
        document.getElementById("register-name");

    const emailElement =
        document.getElementById("register-email");

    const passwordElement =
        document.getElementById("register-password");

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

    if (password.length < 6) {

        showMessage(
            "register-message",
            "كلمة المرور يجب أن تكون 6 أحرف على الأقل.",
            "error"
        );

        return;
    }

    if (password !== confirmPassword) {

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

        const { data, error } =
            await supabaseClient.auth.signUp({

                email,
                password,

                options: {
                    data: {
                        full_name: fullName
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
            translateAuthError(error),
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

            const { error } =
                await supabaseClient.auth.signOut();

            if (error) {
                throw error;
            }
        }

        currentUser = null;

        showAuthScreen();

    } catch (error) {

        console.error(
            "Logout error:",
            error
        );

        showFloatingPanel(
            "تسجيل الخروج",
            `
                <p style="margin:0;color:#666;">
                    تعذر تسجيل الخروج حالياً.
                </p>
            `
        );
    }
}


/* =========================================================
   ترجمة أخطاء Supabase
========================================================= */

function translateAuthError(error) {

    const message =
        String(
            error?.message || ""
        ).toLowerCase();

    if (
        message.includes(
            "invalid login credentials"
        )
    ) {
        return "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
    }

    if (
        message.includes(
            "email not confirmed"
        )
    ) {
        return "يجب تأكيد البريد الإلكتروني أولاً.";
    }

    if (
        message.includes(
            "user already registered"
        )
    ) {
        return "هذا البريد الإلكتروني مسجل مسبقاً.";
    }

    if (
        message.includes(
            "invalid email"
        )
    ) {
        return "البريد الإلكتروني غير صالح.";
    }

    if (
        message.includes(
            "rate limit"
        )
    ) {
        return "تم تجاوز عدد المحاولات. حاول لاحقاً.";
    }

    if (
        message.includes(
            "password should be at least"
        )
    ) {
        return "كلمة المرور يجب أن تكون 6 أحرف على الأقل.";
    }

    return (
        error?.message ||
        "حدث خطأ غير متوقع."
    );
}


/* =========================================================
   نظام النوافذ العائمة
========================================================= */

function closeFloatingPanel() {

    const panel =
        document.getElementById(
            "floating-panel"
        );

    if (panel) {
        panel.remove();
    }
}


function showFloatingPanel(title, content) {

    closeFloatingPanel();

    const panel =
        document.createElement("div");

    panel.id =
        "floating-panel";

    panel.style.position =
        "fixed";

    panel.style.inset =
        "0";

    panel.style.zIndex =
        "999999";

    panel.style.background =
        "rgba(0,0,0,0.35)";

    panel.style.display =
        "flex";

    panel.style.alignItems =
        "center";

    panel.style.justifyContent =
        "center";

    panel.style.padding =
        "20px";

    panel.style.boxSizing =
        "border-box";

    panel.style.direction =
        "rtl";

    panel.innerHTML = `

        <div style="
            width:100%;
            max-width:430px;
            max-height:80vh;
            overflow:auto;
            background:#ffffff;
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

                <h2 style="
                    margin:0;
                    font-size:21px;
                    color:#222;
                ">
                    ${title}
                </h2>

                <button
                    id="floating-close"
                    type="button"
                    style="
                        width:40px;
                        height:40px;
                        border:none;
                        border-radius:50%;
                        background:#f1f3f5;
                        color:#333;
                        font-size:20px;
                        cursor:pointer;
                    "
                >
                    ×
                </button>

            </div>

            <div>
                ${content}
            </div>

        </div>
    `;

    document.body.appendChild(
        panel
    );

    const closeButton =
        document.getElementById(
            "floating-close"
        );

    if (closeButton) {

        closeButton.addEventListener(
            "click",
            closeFloatingPanel
        );
    }

    panel.addEventListener(
        "click",
        function(event) {

            if (event.target === panel) {
                closeFloatingPanel();
            }

        }
    );
}


/* =========================================================
   المرحلة الدراسية
========================================================= */

function openStage(stageName) {

    const stages = {

        primary: {
            title: "المرحلة الابتدائية",
            icon: "🎓",
            text: "اختر الصف الذي تريد الدخول إليه."
        },

        middle: {
            title: "المرحلة الإعدادية",
            icon: "🏫",
