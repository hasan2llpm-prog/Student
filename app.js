let supabaseClient = null;

const CONFIG_URL =
    "https://raw.githubusercontent.com/hasan2llpm-prog/Student/main/config.json";

let currentUser = null;


/* =========================================
   أدوات الرسائل
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
   حالة التحميل للأزرار
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
   تبديل Login / Register
========================================= */

function showLogin() {

    document
        .getElementById("login-section")
        .classList.remove("hidden");

    document
        .getElementById("register-section")
        .classList.add("hidden");

    clearMessages();
}


function showRegister() {

    document
        .getElementById("register-section")
        .classList.remove("hidden");

    document
        .getElementById("login-section")
        .classList.add("hidden");

    clearMessages();
}


/* =========================================
   إظهار / إخفاء التطبيق
========================================= */

function showMainScreen() {

    document
        .getElementById("auth-screen")
        .classList.add("hidden");

    document
        .getElementById("main-screen")
        .classList.remove("hidden");
}


function showAuthScreen() {

    document
        .getElementById("main-screen")
        .classList.add("hidden");

    document
        .getElementById("auth-screen")
        .classList.remove("hidden");

    showLogin();
}


/* =========================================
   تحميل بيانات الملف الشخصي
========================================= */

async function loadProfile(userId) {

    try {

        const { data, error } = await supabaseClient
            .from("profiles")
            .select("full_name, username, role")
            .eq("id", userId)
            .maybeSingle();

        if (error) {
            console.error("خطأ في تحميل profile:", error);
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
   التعامل مع جلسة المستخدم
========================================= */

async function handleSession(session) {

    if (session?.user) {

        currentUser = session.user;

        showMainScreen();

        await loadProfile(session.user.id);

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
            await supabaseClient.auth.signInWithPassword({
                email,
                password
            });

        if (error) {
            throw error;
        }

        if (!data.session) {

            showMessage(
                "login-message",
                "تم تسجيل الدخول لكن لم يتم إنشاء جلسة.",
                "error"
            );

            return;
        }

        showMessage(
            "login-message",
            "تم تسجيل الدخول بنجاح.",
            "success"
        );

        await handleSession(data.session);

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
   إنشاء الحساب
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
        document
            .getElementById("register-password")
            .value;

    const confirmPassword =
        document
            .getElementById("register-password-confirm")
            .value;


    if (password !== confirmPassword) {

        showMessage(
            "register-message",
            "كلمتا المرور غير متطابقتين.",
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


        /*
         * عند تفعيل Confirm Email قد لا تكون هناك
         * session مباشرة بعد التسجيل.
         */

        if (!data.session) {

            showMessage(
                "register-message",
                "تم إنشاء الحساب. افتح بريدك الإلكتروني واضغط رابط التأكيد، ثم ارجع وسجّل الدخول.",
                "success"
            );

        } else {

            showMessage(
                "register-message",
                "تم إنشاء الحساب بنجاح.",
                "success"
            );

            await handleSession(data.session);
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

    try {

        const { error } =
            await supabaseClient.auth.signOut();

        if (error) {
            throw error;
        }

        currentUser = null;

        showAuthScreen();

        document
            .getElementById("login-form")
            .reset();

    } catch (error) {

        console.error(
            "Logout error:",
            error
        );

        alert(
            "تعذر تسجيل الخروج. حاول مرة أخرى."
        );
    }
}


/* =========================================
   ترجمة أخطاء Supabase
========================================= */

function translateAuthError(error) {

    const message =
        (error?.message || "")
        .toLowerCase();


    if (message.includes("invalid login credentials")) {
        return "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
    }


    if (message.includes("email not confirmed")) {
        return "يجب تأكيد البريد الإلكتروني أولاً.";
    }


    if (message.includes("user already registered")) {
        return "هذا البريد الإلكتروني مسجل مسبقاً.";
    }


    if (message.includes("password should be at least")) {
        return "كلمة المرور ضعيفة.";
    }


    if (message.includes("invalid email")) {
        return "البريد الإلكتروني غير صالح.";
    }


    if (message.includes("rate limit")) {
        return "تم تجاوز عدد المحاولات. حاول لاحقاً.";
    }


    return error?.message ||
        "حدث خطأ غير متوقع.";
}


/* =========================================
   فتح المرحلة
========================================= */

function openStage(stageName) {

    const names = {

        primary: "الابتدائي",

        middle: "الإعدادي",

        secondary: "الثانوي",

        university: "الجامعة"

    };


    const name =
        names[stageName] || stageName;


    alert(
        `سيتم فتح قسم ${name} في الخطوة القادمة.`
    );
}


/* =========================================
   تهيئة التطبيق
========================================= */

async function initApp() {

    try {

        /*
         * تحميل config من GitHub Raw
         */

        const response =
            await fetch(
                CONFIG_URL,
                {
                    cache: "no-store"
                }
            );


        if (!response.ok) {

            throw new Error(
                "تعذر تحميل config.json من GitHub."
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


        /*
         * إنشاء عميل Supabase
         */

        supabaseClient =
            window.supabase.createClient(

                config.supabase_url,

                config.supabase_key
            );


        console.log(
            "تم تشغيل Supabase بنجاح"
        );

        console.log(
            "رابط التطبيق:",
            config.app_url
        );

        console.log(
            "الإصدار:",
            config.version
        );


        /*
         * ربط الأحداث
         */

        document
            .getElementById("login-form")
            .addEventListener(
                "submit",
                loginUser
            );


        document
            .getElementById("register-form")
            .addEventListener(
                "submit",
                registerUser
            );


        document
            .getElementById("show-register")
            .addEventListener(
                "click",
                showRegister
            );


        document
            .getElementById("show-login")
            .addEventListener(
                "click",
                showLogin
            );


        /*
         * زر تسجيل الخروج
         */

        const logoutButton =
            document.getElementById(
                "menu-icon"
            );


        if (logoutButton) {

            logoutButton.addEventListener(
                "click",
                async () => {

                    const confirmed =
                        confirm(
                            "هل تريد تسجيل الخروج؟"
                        );

                    if (confirmed) {
                        await logoutUser();
                    }

                }
            );
        }


        /*
         * الحصول على الجلسة الحالية
         */

        const {
            data: {
                session
            }
        } =
            await supabaseClient.auth.getSession();


        await handleSession(session);


        /*
         * مراقبة تغير حالة المصادقة
         */

        supabaseClient.auth.onAuthStateChange(
            async (event, session) => {

                console.log(
                    "Auth event:",
                    event
                );

                await handleSession(session);

            }
        );


    } catch (error) {

        console.error(
            "خطأ في تهيئة التطبيق:",
            error
        );


        showMessage(
            "login-message",
            "تعذر تشغيل التطبيق. تأكد من اتصال الإنترنت وإعدادات Supabase.",
            "error"
        );
    }
}


/* =========================================
   تشغيل التطبيق
========================================= */

initApp();
