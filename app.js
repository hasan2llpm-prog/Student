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

    createFloatingLogout();
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

    removeFloatingLogout();

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

    const emailElement =
        document.getElementById(
            "login-email"
        );

    const passwordElement =
        document.getElementById(
            "login-password"
        );

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

                email: email,

                password: password

            });


        if (error) {
            throw error;
        }


        if (!data?.session) {

            showMessage(
                "login-message",
                "تعذر إنشاء جلسة تسجيل الدخول.",
                "error"
            );

            return;
        }


        showMessage(
            "login-message",
            "تم تسجيل الدخول بنجاح.",
            "success"
        );


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


/* =========================================
   إنشاء حساب
========================================= */

async function registerUser(event) {

    event.preventDefault();

    clearMessages();


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
            "تعذر العثور على حقول التسجيل.",
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

                email: email,

                password: password,

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

            showMessage(
                "register-message",
                "تم إنشاء الحساب بنجاح.",
                "success"
            );

            await handleSession(
                data.session
            );

        } else {

            showMessage(
                "register-message",
                "تم إنشاء الحساب. تحقق من بريدك الإلكتروني لتأكيد الحساب ثم سجّل الدخول.",
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


/* =========================================
   تسجيل الخروج
========================================= */

async function logoutUser() {

    if (!supabaseClient) {

        console.error(
            "Supabase غير جاهز."
        );

        return;
    }


    try {

        const { error } =
            await supabaseClient.auth.signOut();


        if (error) {
            throw error;
        }


        currentUser = null;

        showAuthScreen();


        const loginForm =
            document.getElementById(
                "login-form"
            );

        const registerForm =
            document.getElementById(
                "register-form"
            );


        if (loginForm) {
            loginForm.reset();
        }


        if (registerForm) {
            registerForm.reset();
        }


        clearMessages();


    } catch (error) {

        console.error(
            "Logout error:",
            error
        );
    }
}


/* =========================================
   زر الخروج العائم
========================================= */

function createFloatingLogout() {

    if (
        document.getElementById(
            "floating-logout"
        )
    ) {
        return;
    }


    const button =
        document.createElement(
            "button"
        );


    button.id =
        "floating-logout";


    button.type =
        "button";


    button.textContent =
        "تسجيل الخروج";


    button.style.position =
        "fixed";

    button.style.bottom =
        "85px";

    button.style.left =
        "20px";

    button.style.zIndex =
        "99999";

    button.style.border =
        "none";

    button.style.borderRadius =
        "50px";

    button.style.padding =
        "12px 18px";

    button.style.background =
        "#0095f6";

    button.style.color =
        "#ffffff";

    button.style.fontSize =
        "14px";

    button.style.cursor =
        "pointer";

    button.style.boxShadow =
        "0 4px 15px rgba(0,0,0,0.15)";


    button.addEventListener(
        "click",
        logoutUser
    );


    document.body.appendChild(
        button
    );
}


function removeFloatingLogout() {

    const button =
        document.getElementById(
            "floating-logout"
        );

    if (button) {
        button.remove();
    }
}


/* =========================================
   ترجمة أخطاء Supabase
========================================= */

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
            "password should be at least"
        )
    ) {

        return (
            "كلمة المرور يجب أن تكون 6 أحرف على الأقل
