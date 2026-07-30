let supabaseClient = null;

const CONFIG_URL =
    "https://raw.githubusercontent.com/hasan2llpm-prog/Student/main/config.json";

let currentUser = null;


/* =========================================================
   الرسائل
========================================================= */

function showMessage(elementId, message, type = "") {

    const element =
        document.getElementById(elementId);

    if (!element) return;

    element.textContent = message;

    element.className = "auth-message";

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
   Login / Register
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
   الشاشات الرئيسية
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

    const authScreen =
        document.getElementById(
            "auth-screen"
        );

    const mainScreen =
        document.getElementById(
            "main-screen"
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
   الملف الشخصي
========================================================= */

async function loadProfile(userId) {

    if (!supabaseClient) {
        return;
    }

    if (!userId) {
        return;
    }

    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("profiles")
                .select(
                    "full_name, username, role"
                )
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

            return;
        }

        const welcomeUser =
            document.getElementById(
                "welcome-user"
            );

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
   جلسة المستخدم
========================================================= */

async function handleSession(session) {

    if (session?.user) {

        currentUser =
            session.user;

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

        const {
            data,
            error
        } =
            await supabaseClient.auth.signInWithPassword({

                email: email,

                password: password

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
