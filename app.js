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

    const panel =
        document.getElementById(
            "floating-panel"
        );

    if (panel) {
        panel.remove();
    }
}


function showFloatingPanel(
    title,
    content
) {

    closeFloatingPanel();

    const panel =
        document.createElement(
            "div"
        );

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
            max-width:450px;
            max-height:88vh;
            overflow:auto;
            background:#fff;
            border-radius:22px;
            padding:22px;
            box-sizing:border-box;
            box-shadow:
                0 15px 50px
                rgba(0,0,0,0.22);
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

    document
        .getElementById(
            "floating-close"
        )
        ?.addEventListener(
            "click",
            closeFloatingPanel
        );

    panel.addEventListener(
        "click",
        function(event) {

            if (
                event.target ===
                panel
            ) {

                closeFloatingPanel();
            }
        }
    );
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

    if (window.StudentAccountRoleOnboarding) {
        return Promise.resolve();
    }

    if (window.__studentAccountRoleLoading) {
        return window.__studentAccountRoleLoading;
    }

    window.__studentAccountRoleLoading = new Promise(function(resolve, reject) {

        const existing = document.querySelector(
            'script[data-student-account-role="true"]'
        );

        if (existing) {
            existing.addEventListener("load", resolve, { once: true });
            existing.addEventListener("error", reject, { once: true });
            return;
        }

        const script = document.createElement("script");
        script.src = "account-role-onboarding.js";
        script.async = true;
        script.dataset.studentAccountRole = "true";
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });

    return window.__studentAccountRoleLoading;
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
        script.src = "education.js";
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
    script.src = "store.js";
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

    if (section === "reels") {
        if (typeof window.openStudentReels === "function") {
            window.openStudentReels(0);
            return;
        }

        loadExternalScript(
            "reels.js",
            "student-reels",
            "Student Reels"
        );

        setTimeout(function () {
            if (typeof window.openStudentReels === "function") {
                window.openStudentReels(0);
            }
        }, 250);
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
        if (typeof window.openStudentMessages === "function") {
            window.openStudentMessages();
            return;
        }
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

function loadExternalScript(
    src,
    dataAttribute,
    label
) {

    if (
        document.querySelector(
            `script[data-${dataAttribute}="true"]`
        )
    ) {
        return;
    }


    const script =
        document.createElement(
            "script"
        );


    script.src =
        src;


    script.async =
        true;


    script.setAttribute(
        `data-${dataAttribute}`,
        "true"
    );


    script.onload =
        function() {

            console.log(
                `${label} loaded.`
            );
        };


    script.onerror =
        function() {

            console.error(
                `تعذر تحميل ${src}`
            );
        };


    document.body.appendChild(
        script
    );
}


/* =========================================================
   تحميل لوحة المشرف
========================================================= */

function loadNavigationManager() {

    loadExternalScript(
        "navigation-manager.js",
        "student-navigation-manager",
        "Student Navigation Manager"
    );
}


function loadAdminSystem() {

    loadExternalScript(
        "admin.js",
        "student-admin",
        "Student Admin"
    );
}


/* =========================================================
   تحميل القائمة
========================================================= */

function loadMenuSystem() {

    loadExternalScript(
        "menu.js",
        "student-menu",
        "Student Menu"
    );
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

function loadPostsSystem() {

    loadExternalScript(
        "posts.js",
        "student-posts",
        "Student Posts"
    );
}


/* =========================================================
   تحميل البحث
========================================================= */

function loadSearchSystem() {

    loadExternalScript(
        "search.js",
        "student-search",
        "Student Search"
    );
}


/* =========================================================
   تحميل Feed
========================================================= */

function loadFeedSystem() {

    loadExternalScript(
        "feed.js",
        "student-feed",
        "Student Feed"
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

        loadMenuSystem();

        loadSettingsSystem();

        loadSearchSystem();

        /* المنشورات أزيلت من الواجهة الرئيسية */
        document.querySelectorAll(".student-feed-container").forEach(function (element) {
            element.remove();
        });

    }
);
