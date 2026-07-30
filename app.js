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
   تسجيل الدخول / إنشاء الحساب
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
   الشاشات
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
    const authScreen =
        document.getElementById("auth-screen");

    const mainScreen =
        document.getElementById("main-screen");

    if (mainScreen) {
        mainScreen.classList.add("hidden");
    }

    if (authScreen) {
        authScreen.classList.remove("hidden");
    }

    showLogin();
}


/* =========================================
   الملف الشخصي
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
            console.error("Profile error:", error);
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
        console.error("Profile error:", error);
    }
}


/* =========================================
   الجلسة
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
        document.getElementById(
            "login-password"
        ).value;


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

            showMessage(
                "login-message",
                "تعذر إنشاء جلسة تسجيل الدخول.",
                "error"
            );

            return;
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


/* =========================================
   إنشاء حساب
========================================= */

async function registerUser(event) {

    event.preventDefault();

    clearMessages();


    const fullName =
        document
            .getElementById("register-name")
            .value
            .trim();

    const email =
        document
            .getElementById("register-email")
            .value
            .trim();

    const password =
        document.getElementById(
            "register-password"
        ).value;

    const confirmPassword =
        document.getElementById(
            "register-password-confirm"
        ).value;


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


/* =========================================
   تسجيل الخروج
========================================= */

async function logoutUser() {

    if (!supabaseClient) {
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
   رسائل الأخطاء
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


    return (
        error?.message ||
        "حدث خطأ غير متوقع."
    );
}


/* =========================================
   فتح المرحلة
========================================= */

function openStage(stageName) {

    console.log(
        "فتح المرحلة:",
        stageName
    );
}


/* =========================================
   تهيئة التطبيق
========================================= */

async function initApp() {

    try {

        const response =
            await fetch(
                CONFIG_URL,
                {
                    cache: "no-store"
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


        if (!window.supabase) {

            throw new Error(
                "مكتبة Supabase غير محملة."
            );
        }


        supabaseClient =
            window.supabase.createClient(
                config.supabase_url,
                config.supabase_key
            );


        /* تسجيل الدخول */

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


        /* إنشاء الحساب */

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


        /* الانتقال لإنشاء حساب */

        const showRegisterButton =
            document.getElementById(
                "show-register"
            );

        if (showRegisterButton) {

            showRegisterButton.addEventListener(
                "click",
                function () {
                    showRegister();
                }
            );
        }


        /* العودة لتسجيل الدخول */

        const showLoginButton =
            document.getElementById(
                "show-login"
            );

        if (showLoginButton) {

            showLoginButton.addEventListener(
                "click",
                function () {
                    showLogin();
                }
            );
        }


        /* الجلسة الحالية */

        const sessionResult =
            await supabaseClient.auth.getSession();


        const session =
            sessionResult?.data?.session ||
            null;


        await handleSession(
            session
        );


        /* مراقبة الجلسة */

        supabaseClient.auth.onAuthStateChange(
            async function (
                event,
                session
            ) {

                if (
                    event === "SIGNED_IN" ||
                    event === "SIGNED_OUT" ||
                    event === "INITIAL_SESSION" ||
                    event === "TOKEN_REFRESHED"
                ) {

                    await handleSession(
                        session
                    );
                }

            }
        );


        console.log(
            "Student App جاهز."
        );


    } catch (error) {

        console.error(
            "Init error:",
            error
        );


        showMessage(
            "login-message",
            "تعذر تشغيل التطبيق. " +
            (
                error?.message ||
                ""
            ),
            "error"
        );
    }
}


/* =========================================
   تشغيل التطبيق
========================================= */

initApp();
