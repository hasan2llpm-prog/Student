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


/* =========================================================
   تسجيل الخروج
   لا يوجد confirm ولا alert
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
   النوافذ العائمة
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
                        font-size:22px;
                        cursor:pointer;
                    "
                >
                    ×
                </button>

            </div>

            ${content}

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

            if (
                event.target === panel
            ) {
                closeFloatingPanel();
            }

        }
    );
}


/* =========================================================
   المراحل الدراسية
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
            text: "اختر الصف الذي تريد الدخول إليه."
        },

        secondary: {
            title: "المرحلة الثانوية",
            icon: "📚",
            text: "اختر الصف الذي تريد الدخول إليه."
        },

        university: {
            title: "المرحلة الجامعية",
            icon: "🎓",
            text: "اختر الكلية أو القسم."
        }

    };

    const stage =
        stages[stageName];

    if (!stage) {
        return;
    }

    showFloatingPanel(
        stage.title,
        `
        <div style="
            text-align:center;
            padding:10px 0 5px;
        ">

            <div style="
                font-size:52px;
                margin-bottom:12px;
            ">
                ${stage.icon}
            </div>

            <p style="
                color:#666;
                line-height:1.8;
                margin:0 0 20px;
            ">
                ${stage.text}
            </p>

            <button
                id="stage-enter-btn"
                type="button"
                style="
                    border:none;
                    background:#0095f6;
                    color:#fff;
                    padding:13px 28px;
                    border-radius:12px;
                    font-size:15px;
                    cursor:pointer;
                "
            >
                الدخول
            </button>

        </div>
        `
    );

    const enterButton =
        document.getElementById(
            "stage-enter-btn"
        );

    if (enterButton) {

        enterButton.addEventListener(
            "click",
            function() {

                showFloatingPanel(
                    stage.title,
                    `
                    <div style="
                        text-align:center;
                        padding:25px 10px;
                    ">

                        <div style="
                            font-size:50px;
                        ">
                            📚
                        </div>

                        <p style="
                            color:#666;
                            line-height:1.8;
                        ">
                            سيتم إضافة محتوى
                            هذه المرحلة هنا.
                        </p>

                    </div>
                    `
                );

            }
        );
    }
}


/*
 * index.html يستعمل:
 * onclick="openStage(...)"
 */
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

    const profileButton =
        document.getElementById(
            "menu-profile-btn"
        );

    if (profileButton) {

        profileButton.addEventListener(
            "click",
            showProfilePanel
        );
    }

    const settingsButton =
        document.getElementById(
            "menu-settings-btn"
        );

    if (settingsButton) {

        settingsButton.addEventListener(
            "click",
            showSettingsPanel
        );
    }

    const logoutButton =
        document.getElementById(
            "menu-logout-btn"
        );

    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            logoutUser
        );
    }
}


/* =========================================================
   الملف الشخصي العائم
========================================================= */

function showProfilePanel() {

    showFloatingPanel(
        "الملف الشخصي",
        `
        <div style="
            text-align:center;
            padding:15px;
        ">

            <div style="
                width:85px;
                height:85px;
                margin:0 auto 15px;
                border-radius:50%;
                background:#eaf5ff;
                display:flex;
                align-items:center;
                justify-content:center;
                font-size:38px;
            ">
                👤
            </div>

            <div style="
                font-size:17px;
                font-weight:bold;
                color:#222;
                margin-bottom:8px;
            ">
                ${currentUser?.email || "المستخدم"}
            </div>

            <div style="
                color:#777;
                font-size:14px;
            ">
                حساب Student
            </div>

        </div>
        `
    );
}


/* =========================================================
   الإعدادات العائمة
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
                <span>اللغة</span>
                <strong>العربية</strong>
            </div>

            <div style="
                display:flex;
                justify-content:space-between;
                padding:15px;
                background:#f7f8fa;
                border-radius:14px;
            ">
                <span>الإشعارات</span>
                <strong>مفعلة</strong>
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
   الستوري
========================================================= */

function openStory(name) {

    showFloatingPanel(
        name || "الستوري",
        `
        <div style="
            height:350px;
            border-radius:18px;
            background:
                linear-gradient(
                    135deg,
                    #0095f6,
                    #7c4dff
                );
            display:flex;
            align-items:center;
            justify-content:center;
            color:white;
            font-size:23px;
            font-weight:bold;
        ">
            ${name || "Story"}
        </div>
        `
    );
}


/* =========================================================
   إضافة ستوري
========================================================= */

function addStory() {

    showFloatingPanel(
        "إضافة ستوري",
        `
        <div style="
            text-align:center;
            padding:25px 10px;
        ">

            <div style="
                border:2px dashed #0095f6;
                border-radius:18px;
                padding:35px 15px;
                color:#777;
            ">

                <div style="
                    font-size:45px;
                    margin-bottom:10px;
                ">
                    📷
                </div>

                اختر صورة أو فيديو لإضافة ستوري.

            </div>

        </div>
        `
    );
}


/* =========================================================
   الشريط السفلي
========================================================= */

function openBottomSection(section) {

    const sections = {

        home: {
            title: "الرئيسية",
            icon: "🏠",
            text: "أنت الآن في الصفحة الرئيسية."
        },

        search: {
            title: "البحث",
            icon: "🔎",
            text: "سيتم إضافة البحث هنا."
        },

        add: {
            title: "إضافة",
            icon: "➕",
            text: "سيتم إضافة النشر هنا."
        },

        messages: {
            title: "الرسائل",
            icon: "💬",
            text: "ستظهر المحادثات هنا."
        },

        profile: {
            title: "الملف الشخصي",
            icon: "👤",
            text: currentUser?.email || "المستخدم"
        }

    };

    const item =
        sections[section] ||
        sections.home;

    showFloatingPanel(
        item.title,
        `
        <div style="
            text-align:center;
            padding:25px;
        ">

            <div style="
                font-size:50px;
                margin-bottom:15px;
            ">
                ${item.icon}
            </div>

            <p style="
                color:#666;
                line-height:1.8;
                margin:0;
            ">
                ${item.text}
            </p>

        </div>
        `
    );
}


/* =========================================================
   ربط عناصر الواجهة
========================================================= */

function bindInterfaceButtons() {

    /* الجرس */

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


    /* القائمة */

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


    /* إضافة ستوري */

    const addStoryElement =
        document.querySelector(
            ".add-story"
        );

    if (addStoryElement) {

        addStoryElement.style.cursor =
            "pointer";

        addStoryElement.addEventListener(
            "click",
            function(event) {

                event.preventDefault();

                addStory();
            }
        );
    }


    /* القصص */

    const stories =
        document.querySelectorAll(
            ".story:not(.add-story)"
        );

    stories.forEach(
        function(story) {

            story.style.cursor =
                "pointer";

            story.addEventListener(
                "click",
                function(event) {

                    event.preventDefault();

                    const nameElement =
                        story.querySelector(
                            ".story-name"
                        );

                    const name =
                        nameElement?.textContent?.trim()
                        || "الستوري";

                    openStory(name);
                }
            );
        }
    );


    /* الشريط السفلي */

    const navLinks =
        document.querySelectorAll(
            "nav a"
        );

    const sections = [
        "home",
        "search",
        "add",
        "messages",
        "profile"
    ];

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

                    openBottomSection(
                        sections[index] ||
                        "home"
                    );
                }
            );
        }
    );
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


        /* استعادة الجلسة المحفوظة */

        const {
            data: {
                session
            }
        } =
            await supabaseClient.auth.getSession();


        await handleSession(
            session
        );


        /* مراقبة الجلسة */

        supabaseClient.auth.onAuthStateChange(
            async function(
                event,
                session
            ) {

                console.log(
                    "Auth event:",
                    event
                );

                /*
                 * لا نعمل شيئًا عشوائيًا عند الأحداث
                 * غير المهمة للواجهة.
                 */

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
         * لا نحول التطبيق إلى شاشة بيضاء.
         */
    }
}


/* =========================================================
   تهيئة واجهة التطبيق
========================================================= */

function initInterface() {

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


    /* الانتقال إلى التسجيل */

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


    /* العودة لتسجيل الدخول */

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


    /* جميع أزرار الواجهة */

    bindInterfaceButtons();
}


/* =========================================================
   بدء التطبيق
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function() {

        initInterface();

        initSupabase();

    }
);
