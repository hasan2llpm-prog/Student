let supabaseClient = null;

const CONFIG_URL =
    "https://raw.githubusercontent.com/hasan2llpm-prog/Student/main/config.json";

let currentUser = null;


/* =========================================
   الرسائل
========================================= */

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


/* =========================================
   حالة الأزرار
========================================= */

function setButtonLoading(buttonId, loading, normalText) {
    const button = document.getElementById(buttonId);

    if (!button) return;

    button.disabled = loading;
    button.textContent = loading
        ? "جارٍ التنفيذ..."
        : normalText;
}


/* =========================================
   الانتقال بين تسجيل الدخول والتسجيل
========================================= */

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


/* =========================================
   عرض شاشة التطبيق
========================================= */

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


/* =========================================
   تحميل الملف الشخصي
========================================= */

async function loadProfile(userId) {
    try {
        const { data, error } =
            await supabaseClient
                .from("profiles")
                .select("full_name, username, role")
                .eq("id", userId)
                .maybeSingle();

        if (error) {
            console.error(
                "خطأ في تحميل profile:",
                error
            );
            return;
        }

        const welcomeUser =
            document.getElementById("welcome-user");

        if (!welcomeUser) return;

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
            "خطأ غير متوقع في profile:",
            error
        );
    }
}


/* =========================================
   التعامل مع الجلسة
========================================= */

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


/* =========================================
   تسجيل الدخول
========================================= */

async function loginUser(event) {
    event.preventDefault();

    clearMessages();

    const email =
        document
            .getElementById("login-email")
            .value
            .trim();

    const password =
        document
            .getElementById("login-password")
            .value;

    setButtonLoading(
        "login-btn",
        true,
        "دخول"
    );

    try {

        const { data, error } =
