let supabaseClient = null;

const CONFIG_URL =
    "https://raw.githubusercontent.com/hasan2llpm-pro0entUser = null;


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
   الشاشة الرئيسية
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
   الملف الشخصي
========================================= */

async function loadProfile(userId) {

    if (!supabaseClient || !userId) return;

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

        await handleSession(
            data?.session || null
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
        document.createElement("button");

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
   أخطاء المصادقة
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


/* =========================================
   فتح المرحلة الدراسية
========================================= */

function openStage(stageName) {

    const names = {
        primary: "المرحلة الابتدائية",
        middle: "المرحلة الإعدادية",
        secondary: "المرحلة الثانوية",
        university: "الجامعة"
    };

    const title =
        names[stageName] || "المرحلة الدراسية";

    showStageModal(title);
}


/* مهم لأن index.html يستخدم onclick */
window.openStage = openStage;


/* =========================================
   نافذة المرحلة
========================================= */

function showStageModal(title) {

    const oldModal =
        document.getElementById(
            "stage-modal"
        );

    if (oldModal) {
        oldModal.remove();
    }

    const modal =
        document.createElement("div");

    modal.id =
        "stage-modal";

    modal.style.position =
        "fixed";

    modal.style.inset =
        "0";

    modal.style.zIndex =
        "100000";

    modal.style.background =
        "rgba(0,0,0,0.45)";

    modal.style.display =
        "flex";

    modal.style.alignItems =
        "center";

    modal.style.justifyContent =
        "center";

    modal.style.padding =
        "20px";

    modal.innerHTML = `
        <div style="
            width:100%;
            max-width:420px;
            background:#fff;
            border-radius:20px;
            padding:25px;
            text-align:center;
            box-sizing:border-box;
            box-shadow:0 15px 40px rgba(0,0,0,.2);
            direction:rtl;
        ">

            <div style="
                font-size:24px;
                font-weight:bold;
                color:#0095f6;
                margin-bottom:12px;
            ">
                ${title}
            </div>

            <p style="
                color:#666;
                line-height:1.8;
                margin:0 0 20px;
            ">
                سيتم إضافة محتوى هذه المرحلة هنا.
            </p>

            <button
                id="close-stage-modal"
                style="
                    border:none;
                    background:#0095f6;
                    color:#fff;
                    padding:12px 28px;
                    border-radius:12px;
                    font-size:15px;
                    cursor:pointer;
                "
            >
                إغلاق
            </button>

        </div>
    `;

    document.body.appendChild(
        modal
    );

    document
        .getElementById(
            "close-stage-modal"
        )
        .addEventListener(
            "click",
            function () {
                modal.remove();
            }
        );

    modal.addEventListener(
        "click",
        function(event) {

            if (event.target === modal) {
                modal.remove();
            }

        }
    );
}


/* =========================================
   أزرار الهيدر والستوريات
========================================= */

function bindHeaderButtons() {

    const menuIcon =
        document.getElementById(
            "menu-icon"
        );

    if (menuIcon) {

        menuIcon.addEventListener(
            "click",
            function () {

                showSimpleNotice(
                    "القائمة",
                    "قائمة التطبيق ستُضاف هنا."
                );

            }
        );
    }


    const bell =
        document.querySelector(
            ".fa-bell"
        );

    if (bell) {

        bell.addEventListener(
            "click",
            function () {

                showSimpleNotice(
                    "الإشعارات",
                    "لا توجد إشعارات جديدة."
                );

            }
        );
    }


    const addStory =
        document.querySelector(
            ".add-story"
        );

    if (addStory) {

        addStory.addEventListener(
            "click",
            function () {

                showSimpleNotice(
                    "إضافة ستوري",
                    "سيتم إضافة نشر الستوري هنا."
                );

            }
        );
    }
}


/* =========================================
   أزرار شريط التنقل السفلي
========================================= */

function bindBottomNavigation() {

    const navLinks =
        document.querySelectorAll(
            "nav a"
        );

    navLinks.forEach(
        function(link, index) {

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


                    const titles = [
                        "الرئيسية",
                        "البحث",
                        "إضافة",
                        "الرسائل",
                        "الملف الشخصي"
                    ];


                    showSimpleNotice(
                        titles[index] ||
                        "القسم",
                        "سيتم تفعيل هذا القسم لاحقًا."
                    );

                }
            );

        }
    );
}


/* =========================================
   رسالة بسيطة داخل التطبيق
========================================= */

function showSimpleNotice(title, message) {

    const old =
        document.getElementById(
            "simple-notice"
        );

    if (old) {
        old.remove();
    }

    const notice =
        document.createElement(
            "div"
        );

    notice.id =
        "simple-notice";

    notice.style.position =
        "fixed";

    notice.style.top =
        "20px";

    notice.style.left =
        "20px";

    notice.style.right =
        "20px";

    notice.style.zIndex =
        "100001";

    notice.style.background =
        "#ffffff";

    notice.style.border =
        "1px solid #ddd";

    notice.style.borderRadius =
        "15px";

    notice.style.padding =
        "16px";

    notice.style.boxShadow =
        "0 8px 25px rgba(0,0,0,.15)";

    notice.style.direction =
        "rtl";

    notice.innerHTML = `
        <strong style="
            display:block;
            color:#0095f6;
            margin-bottom:5px;
        ">
            ${title}
        </strong>

        <span style="
            color:#555;
        ">
            ${message}
        </span>
    `;

    document.body.appendChild(
        notice
    );

    setTimeout(
        function () {

            if (notice) {
                notice.remove();
            }

        },
        2500
    );
}


/* =========================================
   تهيئة أزرار التطبيق
========================================= */

function bindAppButtons() {

    bindHeaderButtons();

    bindBottomNavigation();
}


/* =========================================
   تشغيل Supabase
========================================= */

async function initSupabase() {

    try {

        if (!window.supabase) {

            console.warn(
                "Supabase library unavailable."
            );

            return;
        }


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
            await supabaseClient.auth.getSession();


        await handleSession(
            session
        );


        supabaseClient.auth.onAuthStateChange(
            async function (
                event,
                session
            ) {

                console.log(
                    "Auth event:",
                    event
                );

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

    } catch (error) {

        console.error(
            "Supabase initialization error:",
            error
        );

        /*
         * حتى لو فشل Supabase،
         * التطبيق نفسه يبقى مفتوحًا.
         */

        showMainScreen();
    }
}


/* =========================================
   بدء التطبيق
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        bindAppButtons();

        initSupabase();

    }
);
