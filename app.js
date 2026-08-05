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
        script.src = "education-admin.js?v=1.0.0";
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
    script.src = "store.js?v=1.2.0";
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
        window.openStudentMessages?.();
        return;
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

function loadExternalScript(src, dataAttribute, label) {
    window.__studentScriptPromises = window.__studentScriptPromises || new Map();
    const key = String(src).split("?")[0];
    if (window.__studentScriptPromises.has(key)) {
        return window.__studentScriptPromises.get(key);
    }
    const existing = document.querySelector(`script[data-${dataAttribute}="true"]`);
    if (existing?.dataset.loaded === "true") return Promise.resolve(existing);
    const promise = new Promise(function(resolve, reject) {
        const script = existing || document.createElement("script");
        if (!existing) {
            script.src = src;
            script.async = true;
            script.setAttribute(`data-${dataAttribute}`, "true");
            document.body.appendChild(script);
        }
        script.addEventListener("load", function() {
            script.dataset.loaded = "true";
            console.log(`${label} loaded.`);
            resolve(script);
        }, { once: true });
        script.addEventListener("error", function() {
            window.__studentScriptPromises.delete(key);
            console.error(`تعذر تحميل ${src}`);
            reject(new Error(`تعذر تحميل ${src}`));
        }, { once: true });
    });
    window.__studentScriptPromises.set(key, promise);
    return promise;
}


/* =========================================================
   تحميل لوحة المشرف
========================================================= */

function loadNavigationManager() { return Promise.resolve(window.StudentNavigation);
}


function loadAdminSystem() {

    loadExternalScript(
        "education-admin.js?v=1.0.0",
        "student-admin",
        "Student Admin"
    );
}


/* =========================================================
   تحميل القائمة
========================================================= */

function loadMenuSystem() { return loadSettingsSystem();
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

function loadPostsSystem() { return Promise.resolve();
}


/* =========================================================
   تحميل البحث
========================================================= */

function loadSearchSystem() { return Promise.resolve(window.openStudentSearch);
}


/* =========================================================
   تحميل Feed
========================================================= */

function loadFeedSystem() { return Promise.resolve(window.loadStudentFeed);
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

        loadSettingsSystem();

        loadSearchSystem();

        /* المنشورات أزيلت من الواجهة الرئيسية */
        document.querySelectorAll(".student-feed-container").forEach(function (element) {
            element.remove();
        });

    }
);

/* =========================================================
   Student - Home Ads Slider
========================================================= */
(function () {
    "use strict";

    let ads = [];
    let currentIndex = 0;
    let timer = null;
    let startX = 0;

    function getClient() {
        return typeof supabaseClient !== "undefined" ? supabaseClient : null;
    }

    function getElements() {
        return {
            section: document.getElementById("student-home-ads"),
            track: document.getElementById("student-home-ads-track"),
            dots: document.getElementById("student-home-ads-dots")
        };
    }

    function normalizeUrl(url) {
        if (!url) return "";
        try {
            const parsed = new URL(url, window.location.origin);
            if (!["http:", "https:"].includes(parsed.protocol)) return "";
            return parsed.href;
        } catch (_) {
            return "";
        }
    }

    function goTo(index) {
        const { track, dots } = getElements();
        if (!track || !ads.length) return;
        currentIndex = (index + ads.length) % ads.length;
        track.style.transform = `translateX(-${currentIndex * 100}%)`;
        if (dots) {
            [...dots.children].forEach((dot, i) => {
                dot.classList.toggle("active", i === currentIndex);
            });
        }
    }

    function startAutoPlay() {
        clearInterval(timer);
        if (ads.length < 2) return;
        timer = setInterval(() => goTo(currentIndex + 1), 4500);
    }

    function render() {
        const { section, track, dots } = getElements();
        if (!section || !track || !dots) return;

        track.innerHTML = "";
        dots.innerHTML = "";

        if (!ads.length) {
            section.classList.remove("show");
            return;
        }

        ads.forEach((ad, index) => {
            const slide = document.createElement("article");
            slide.className = "student-home-ad-slide";
            slide.setAttribute("role", ad.link_url ? "link" : "img");
            slide.innerHTML = `
                <img src="${String(ad.image_url || "").replace(/"/g, "&quot;")}" alt="${String(ad.title || "إعلان").replace(/"/g, "&quot;")}" loading="lazy">
                ${ad.title ? `<div class="student-home-ad-caption">${String(ad.title).replace(/[&<>]/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;"}[m]))}</div>` : ""}
            `;
            const target = normalizeUrl(ad.link_url);
            if (target) {
                slide.addEventListener("click", () => window.open(target, "_blank", "noopener"));
            }
            track.appendChild(slide);

            const dot = document.createElement("button");
            dot.type = "button";
            dot.className = "student-home-ads-dot";
            dot.setAttribute("aria-label", `الإعلان ${index + 1}`);
            dot.addEventListener("click", () => {
                goTo(index);
                startAutoPlay();
            });
            dots.appendChild(dot);
        });

        section.classList.add("show");
        currentIndex = 0;
        goTo(0);
        startAutoPlay();

        const viewport = section.querySelector(".student-home-ads-viewport");
        if (viewport && !viewport.dataset.studentSwipeReady) {
            viewport.dataset.studentSwipeReady = "1";
            viewport.addEventListener("touchstart", e => {
                startX = e.changedTouches[0].clientX;
                clearInterval(timer);
            }, { passive: true });
            viewport.addEventListener("touchend", e => {
                const diff = e.changedTouches[0].clientX - startX;
                if (Math.abs(diff) > 45) goTo(currentIndex + (diff < 0 ? 1 : -1));
                startAutoPlay();
            }, { passive: true });
        }
    }

    async function loadAds() {
        const client = getClient();
        if (!client) return false;
        const now = new Date().toISOString();
        const { data, error } = await client
            .from("home_ads")
            .select("id,title,image_url,link_url,sort_order")
            .eq("is_active", true)
            .or(`starts_at.is.null,starts_at.lte.${now}`)
            .or(`ends_at.is.null,ends_at.gte.${now}`)
            .order("sort_order", { ascending: true })
            .order("created_at", { ascending: false });

        if (error) {
            console.warn("Home ads load error:", error.message);
            return false;
        }
        ads = data || [];
        render();
        return true;
    }

    function waitForClient(attempt = 0) {
        if (getClient()) {
            loadAds();
            return;
        }
        if (attempt < 40) setTimeout(() => waitForClient(attempt + 1), 250);
    }

    window.StudentHomeAds = { reload: loadAds };
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => waitForClient());
    } else {
        waitForClient();
    }
})();


/* ===== MERGED MODULE: navigation-manager.js ===== */
/* =========================================================
   Student — Clean Central Navigation
   one back controller; no old profile/feed observers or timers
========================================================= */
(function () {
    "use strict";

    if (window.StudentNavigation?.version === "clean-2") return;

    const pageStack = [];
    let exitDialog = null;
    let handlingBack = false;
    const GUARD_KEY = "studentBackGuard";

    const visible = (el) => {
        if (!el || !el.isConnected) return false;
        const style = getComputedStyle(el);
        return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
    };

    const hide = (el) => {
        if (!el) return false;
        el.classList.remove("active", "show", "open", "is-open", "visible");
        if (el.hasAttribute("aria-hidden")) el.setAttribute("aria-hidden", "true");
        if (visible(el)) el.style.display = "none";
        return true;
    };

    function safeCall(name, ...args) {
        const fn = window[name];
        if (typeof fn !== "function") return false;
        try {
            const result = fn(...args);
            return result !== false;
        } catch (_) {
            return false;
        }
    }

    function closeTopLayer() {
        /* deepest/temporary layers first */
        const directClosers = [
            ["#studentStoryDeleteConfirm.active", null],
            ["#studentStoryViewersModal.active", null],
            ["#student-reel-comments.show, #student-reel-comments.active", null],
            [".student-store-modal.show, .student-store-modal.active", null],
            ["#student-reel-publisher.show, #student-reel-publisher.active", "closeStudentReelPublisher"],
            ["#student-story-form-modal.show, #student-story-form-modal.active", "closeStoryForm"],
            ["#studentStoryViewer.show, #studentStoryViewer.active", "closeStoryViewer"],
            ["#student-ads-admin-page.show", "closeStudentAdsAdmin"],
            ["#student-teachers-education-overlay.show", "closeStudentTeachersEducation"],
            [".student-admin-overlay.show", "closeStudentAdminPanel"],
            ["#student-store-overlay.show, #student-store-overlay.active", "closeStudentStore"],
            ["#student-education-overlay.show, #student-education-overlay.active", "closeEducationPanel"],
            ["#floating-panel.show", "closeFloatingPanel"],
            ["#student-main-menu.is-open", "closeStudentMenu"]
        ];

        for (const [selector, fnName] of directClosers) {
            const el = document.querySelector(selector);
            if (!el || !visible(el)) continue;
            if (fnName && safeCall(fnName)) return true;
            return hide(el);
        }

        const generic = [...document.querySelectorAll(
            ".student-internal-page,.student-fullscreen-page.show,.student-page-overlay.show,.student-page-overlay.active,.student-overlay.show,.student-overlay.active,.student-modal.show,.student-modal.active"
        )].filter(visible).pop();
        if (generic) return hide(generic);

        return false;
    }

    function openPage({ id = "page", title = "", html = "", onClose = null } = {}) {
        const current = pageStack.at(-1);
        if (current?.element) current.element.hidden = true;

        const page = document.createElement("section");
        page.className = "student-internal-page";
        page.dataset.studentNavPage = id;
        page.innerHTML = `
            <header class="student-internal-header">
                <button class="student-internal-back" type="button" aria-label="رجوع">
                    <i class="fa-solid fa-arrow-right"></i>
                </button>
                <div class="student-internal-title"></div>
            </header>
            <div class="student-internal-body"></div>`;
        page.querySelector(".student-internal-title").textContent = title;
        page.querySelector(".student-internal-body").innerHTML = html;
        page.querySelector(".student-internal-back").addEventListener("click", () => back());
        document.body.appendChild(page);
        pageStack.push({ id, element: page, onClose });
        return page;
    }

    function closePage() {
        const entry = pageStack.pop();
        if (!entry) return false;
        entry.element?.remove();
        try { entry.onClose?.(); } catch (_) {}
        const previous = pageStack.at(-1);
        if (previous?.element) previous.element.hidden = false;
        return true;
    }

    function back() {
        if (handlingBack) return true;
        handlingBack = true;
        try {
            if (exitDialog) {
                exitDialog.remove();
                exitDialog = null;
                return true;
            }
            if (closePage()) return true;
            if (closeTopLayer()) return true;
            showExitConfirm();
            return false;
        } finally {
            setTimeout(() => { handlingBack = false; }, 0);
        }
    }

    function showExitConfirm() {
        if (exitDialog) return;
        exitDialog = document.createElement("div");
        exitDialog.className = "student-exit-confirm";
        exitDialog.innerHTML = `
            <div class="student-exit-card" role="dialog" aria-modal="true">
                <h3>الخروج من التطبيق</h3>
                <p style="margin-top:8px;color:#6f7782">هل تريد مغادرة التطبيق؟</p>
                <div style="display:flex;gap:10px;margin-top:18px">
                    <button type="button" data-cancel style="flex:1;padding:12px;border:0;border-radius:12px">إلغاء</button>
                    <button type="button" data-exit style="flex:1;padding:12px;border:0;border-radius:12px;background:#d93025;color:#fff">خروج</button>
                </div>
            </div>`;
        document.body.appendChild(exitDialog);
        exitDialog.querySelector("[data-cancel]").onclick = () => {
            exitDialog.remove();
            exitDialog = null;
        };
        exitDialog.querySelector("[data-exit]").onclick = () => {
            exitDialog.remove();
            exitDialog = null;
            try { window.close(); } catch (_) {}
        };
    }

    /* One permanent browser-history guard. No feature is allowed to own exit logic. */
    function installHistoryGuard() {
        try {
            history.replaceState({ ...(history.state || {}), [GUARD_KEY]: "root" }, "", location.href);
            history.pushState({ [GUARD_KEY]: "guard" }, "", location.href);
        } catch (_) {}
    }

    function onPopState(event) {
        event.stopImmediatePropagation();
        event.stopPropagation();
        const handled = back();
        try { history.pushState({ [GUARD_KEY]: "guard" }, "", location.href); } catch (_) {}
        return handled;
    }

    /* capture phase runs before old bubble listeners still present in feature files */
    window.addEventListener("popstate", onPopState, true);
    document.addEventListener("backbutton", (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        back();
    }, true);

    /* X/back buttons use this controller instead of history.back(). */
    document.addEventListener("click", (event) => {
        const button = event.target.closest(
            ".student-internal-back,.student-page-back,[data-student-back]," +
            ".student-reel-close,.student-reel-publisher-close,.student-store-close," +
            ".student-menu-close,.student-menu-back,.panel-close,.close-panel"
        );
        if (!button) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        back();
    }, true);

    installHistoryGuard();

    window.StudentHandleAndroidBack = back;
    window.StudentNavigation = {
        version: "clean-2",
        openPage,
        back,
        closePage,
        closeTopLayer,
        showExitConfirm
    };
})();


/* ===== MERGED MODULE: notifications.js ===== */
/* =========================================================
   Student - Notifications
   In-app realtime + Web Push subscription + admin broadcast
========================================================= */
(function () {
    "use strict";

    if (window.StudentNotifications) return;

    const VAPID_PUBLIC_KEY = "BDzANVHrkwSN1O6cIyREd5yYgjo7pxiGiizwdOGw2nHIxciXm5Fs5jxmCGh9NjOMX3Xo0t2sd949fLrRfJwTCQI";
    const SW_URL = "./sw.js?v=1.0.1";

    const state = {
        user: null,
        isAdmin: false,
        items: [],
        channel: null,
        overlay: null,
        loading: false,
        initializedFor: null
    };

    function sb() {
        return typeof supabaseClient !== "undefined" ? supabaseClient : null;
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function ensureStyles() {
        if (document.getElementById("student-notifications-style")) return;
        const style = document.createElement("style");
        style.id = "student-notifications-style";
        style.textContent = `
            #student-notifications-page{position:fixed;inset:0;z-index:10050;background:#fff;display:none;overflow:auto;direction:rtl;color:#172033}
            #student-notifications-page.is-open{display:block}
            .sn-head{position:sticky;top:0;z-index:3;background:#fff;border-bottom:1px solid #e9edf3;padding:14px 16px;display:flex;align-items:center;gap:12px}
            .sn-back,.sn-action,.sn-btn{border:0;cursor:pointer;font:inherit}
            .sn-back{width:42px;height:42px;border-radius:50%;background:#f1f4f8;font-size:21px}
            .sn-title{font-size:19px;font-weight:800;flex:1;margin:0}
            .sn-action{background:#087cff;color:#fff;border-radius:12px;padding:10px 13px;font-weight:700}
            .sn-body{max-width:720px;margin:0 auto;padding:14px 14px 90px}
            .sn-permission{border:1px solid #dce8ff;background:#f4f8ff;border-radius:16px;padding:14px;margin-bottom:14px}
            .sn-permission strong{display:block;margin-bottom:5px}.sn-permission p{margin:0 0 12px;color:#566171;line-height:1.7}
            .sn-btn{background:#087cff;color:#fff;border-radius:12px;padding:11px 15px;font-weight:750}.sn-btn.secondary{background:#eef2f7;color:#223047}.sn-btn.danger{background:#e93d4f}
            .sn-list{display:grid;gap:10px}.sn-item{border:1px solid #e8ebf0;border-radius:16px;padding:13px;background:#fff;display:flex;gap:11px;align-items:flex-start}
            .sn-item.unread{background:#f4f8ff;border-color:#cfe0ff}.sn-icon{width:42px;height:42px;border-radius:50%;background:#eef4ff;display:grid;place-items:center;flex:0 0 42px;font-size:19px}
            .sn-content{min-width:0;flex:1}.sn-item-title{font-weight:800;margin-bottom:4px}.sn-item-text{color:#4e5969;line-height:1.65;white-space:pre-wrap;overflow-wrap:anywhere}.sn-meta{font-size:12px;color:#8a94a3;margin-top:7px}.sn-item-admin{display:flex;gap:8px;margin-top:10px}.sn-mini{border:0;border-radius:9px;padding:7px 10px;font:inherit;font-size:12px;font-weight:700;cursor:pointer;background:#eef2f7;color:#223047}.sn-mini.danger{background:#fff0f2;color:#c9293b}
            .sn-empty{text-align:center;padding:60px 20px;color:#788393}.sn-empty .bell{font-size:48px;margin-bottom:12px}
            .sn-modal{position:fixed;inset:0;z-index:10070;background:rgba(10,20,35,.48);display:flex;align-items:flex-end;justify-content:center;padding:14px}
            .sn-sheet{width:min(620px,100%);background:#fff;border-radius:22px;padding:18px;max-height:90vh;overflow:auto}.sn-sheet h3{margin:0 0 15px}
            .sn-field{margin-bottom:12px}.sn-field label{display:block;font-weight:700;margin-bottom:6px}.sn-field input,.sn-field textarea,.sn-field select{width:100%;border:1px solid #dbe1ea;border-radius:12px;padding:12px;font:inherit;outline:none}.sn-field textarea{min-height:110px;resize:vertical}
            .sn-actions{display:flex;gap:9px;justify-content:flex-end;margin-top:15px}.sn-toast{position:fixed;left:50%;bottom:86px;transform:translateX(-50%);z-index:10100;background:#172033;color:#fff;border-radius:12px;padding:11px 16px;max-width:88%;text-align:center}
            .sn-badge{position:absolute;min-width:18px;height:18px;border-radius:9px;background:#ef3340;color:#fff;font-size:11px;font-weight:800;display:grid;place-items:center;padding:0 5px;transform:translate(45%,-45%)}
        `;
        document.head.appendChild(style);
    }

    function toast(message) {
        document.querySelector(".sn-toast")?.remove();
        const el = document.createElement("div");
        el.className = "sn-toast";
        el.textContent = message;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 2800);
    }

    function ensurePage() {
        ensureStyles();
        let page = document.getElementById("student-notifications-page");
        if (page) return page;
        page = document.createElement("section");
        page.id = "student-notifications-page";
        page.innerHTML = `
            <header class="sn-head">
                <button class="sn-back" type="button" aria-label="رجوع">‹</button>
                <h2 class="sn-title">الإشعارات</h2>
                <button class="sn-action" id="sn-broadcast" type="button" hidden>نشر للجميع</button>
            </header>
            <main class="sn-body">
                <div id="sn-permission-box"></div>
                <div id="sn-list" class="sn-list"></div>
            </main>`;
        document.body.appendChild(page);
        page.querySelector(".sn-back").addEventListener("click", close);
        page.querySelector("#sn-broadcast").addEventListener("click", openBroadcast);
        state.overlay = page;
        return page;
    }

    async function getUser() {
        const client = sb();
        if (!client) return null;
        const { data } = await client.auth.getUser();
        return data?.user || null;
    }

    async function checkAdmin() {
        const client = sb();
        if (!client || !state.user) return false;
        try {
            const { data, error } = await client.rpc("current_user_is_admin");
            if (!error) return data === true;
        } catch (_) {}
        try {
            const { data } = await client.from("profiles").select("role").eq("id", state.user.id).maybeSingle();
            return data?.role === "admin";
        } catch (_) {
            return false;
        }
    }

    function dateText(value) {
        if (!value) return "";
        try {
            return new Intl.DateTimeFormat("ar-IQ", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
        } catch (_) {
            return "";
        }
    }

    function renderPermission() {
        const box = document.getElementById("sn-permission-box");
        if (!box) return;
        if (!("Notification" in window) || !("serviceWorker" in navigator)) {
            box.innerHTML = `<div class="sn-permission"><strong>الإشعارات الخارجية غير مدعومة</strong><p>هذا المتصفح لا يدعم إشعارات الهاتف الخارجية.</p></div>`;
            return;
        }
        if (Notification.permission === "granted") {
            box.innerHTML = `<div class="sn-permission"><strong>إشعارات الهاتف مفعلة</strong><p>ستصلك التنبيهات الخارجية حسب إعدادات جهازك.</p></div>`;
            return;
        }
        if (Notification.permission === "denied") {
            box.innerHTML = `<div class="sn-permission"><strong>تم رفض الإذن</strong><p>افتح إعدادات الموقع في المتصفح واسمح بالإشعارات، ثم أعد فتح التطبيق.</p></div>`;
            return;
        }
        box.innerHTML = `<div class="sn-permission"><strong>فعّل إشعارات الهاتف</strong><p>اسمح للتطبيق بإرسال الإشعارات إلى لوحة إشعارات جهازك حتى عند مغادرة الصفحة.</p><button class="sn-btn" id="sn-enable-push" type="button">تفعيل الإشعارات</button></div>`;
        box.querySelector("#sn-enable-push")?.addEventListener("click", enablePush);
    }

    function render() {
        const page = ensurePage();
        page.querySelector("#sn-broadcast").hidden = !state.isAdmin;
        renderPermission();
        const list = page.querySelector("#sn-list");
        if (state.loading) {
            list.innerHTML = `<div class="sn-empty">جارٍ تحميل الإشعارات...</div>`;
            return;
        }
        if (!state.items.length) {
            list.innerHTML = `<div class="sn-empty"><div class="bell">🔔</div><div>لا توجد إشعارات حتى الآن.</div></div>`;
            return;
        }
        list.innerHTML = state.items.map(item => {
            const canManage = state.isAdmin && item.is_broadcast === true && item.kind === "admin_broadcast";
            return `
            <article class="sn-item ${item.is_read ? "" : "unread"}" data-id="${escapeHtml(item.id)}">
                <div class="sn-icon">${escapeHtml(item.icon || "🔔")}</div>
                <div class="sn-content">
                    <div class="sn-item-title">${escapeHtml(item.title || "إشعار جديد")}</div>
                    <div class="sn-item-text">${escapeHtml(item.body || "")}</div>
                    <div class="sn-meta">${escapeHtml(dateText(item.created_at))}</div>
                    ${canManage ? `<div class="sn-item-admin"><button class="sn-mini" data-edit-broadcast type="button">تعديل</button><button class="sn-mini danger" data-delete-broadcast type="button">حذف</button></div>` : ""}
                </div>
            </article>`;
        }).join("");
        list.querySelectorAll(".sn-item").forEach(el => {
            el.addEventListener("click", async event => {
                if (event.target.closest("button")) return;
                const item = state.items.find(x => String(x.id) === String(el.dataset.id));
                if (!item) return;
                if (!item.is_read) await markRead(item.id);
                await openNotificationTarget(item);
            });
        });
        list.querySelectorAll("[data-edit-broadcast]").forEach(btn => {
            btn.addEventListener("click", () => openEditBroadcast(btn.closest(".sn-item").dataset.id));
        });
        list.querySelectorAll("[data-delete-broadcast]").forEach(btn => {
            btn.addEventListener("click", () => confirmDeleteBroadcast(btn.closest(".sn-item").dataset.id));
        });
        updateBadge();
    }

    async function openNotificationTarget(item) {
        const meta = item?.metadata || {};
        const kind = String(item?.kind || item?.type || "");
        const link = String(item?.link || "");

        close();

        if (kind.startsWith("story_") || link === "stories" || meta.story_id) {
            if (typeof window.openStoriesSection === "function") {
                window.openStoriesSection();
                return;
            }
        }

        if (kind.startsWith("store_") || link === "store" || meta.order_id) {
            if (typeof window.openStudentStoreSection === "function") {
                window.openStudentStoreSection();
                return;
            }
        }

        if (kind === "follow" || link === "profile") {
            if (typeof window.openStudentProfile === "function") {
                window.openStudentProfile(item.actor_id || meta.actor_id || null);
                return;
            }
        }

        if (link && /^(https?:\/\/|\.\/|\/)/i.test(link)) {
            location.href = link;
        }
    }

    async function load() {
        const client = sb();
        if (!client || !state.user) return;
        state.loading = true;
        render();
        const { data, error } = await client
            .from("notifications")
            .select("id,title,body,icon,kind,link,is_read,created_at,actor_id,metadata,is_broadcast,audience,user_id")
            .or(`user_id.eq.${state.user.id},and(user_id.is.null,is_broadcast.eq.true)`)
            .order("created_at", { ascending: false })
            .limit(150);
        state.loading = false;
        if (error) {
            console.error("Notifications load error:", error);
            state.items = [];
            render();
            toast("تعذر تحميل الإشعارات. شغّل كود SQL أولًا.");
            return;
        }
        const rows = data || [];
        const broadcastIds = rows.filter(x => x.is_broadcast === true).map(x => x.id);
        let readBroadcasts = new Set();
        if (broadcastIds.length) {
            const { data: reads } = await client
                .from("notification_reads")
                .select("notification_id")
                .eq("user_id", state.user.id)
                .in("notification_id", broadcastIds);
            readBroadcasts = new Set((reads || []).map(x => String(x.notification_id)));
        }
        state.items = rows.map(item => ({
            ...item,
            is_read: item.is_broadcast === true ? readBroadcasts.has(String(item.id)) : item.is_read === true
        }));
        render();
        await markAllDelivered();
    }

    async function markRead(id) {
        const client = sb();
        if (!client || !id) return;
        const item = state.items.find(x => String(x.id) === String(id));
        if (!item) return;
        item.is_read = true;
        render();
        if (item.is_broadcast === true) {
            await client.from("notification_reads").upsert({
                notification_id: id,
                user_id: state.user.id,
                read_at: new Date().toISOString()
            }, { onConflict: "notification_id,user_id" });
        } else {
            await client.from("notifications")
                .update({ is_read: true, read_at: new Date().toISOString() })
                .eq("id", id)
                .eq("user_id", state.user.id);
        }
    }

    async function markAllRead() {
        const client = sb();
        if (!client || !state.user) return;
        const unread = state.items.filter(x => !x.is_read);
        if (!unread.length) return;
        const personalIds = unread.filter(x => x.is_broadcast !== true).map(x => x.id);
        const broadcastRows = unread.filter(x => x.is_broadcast === true).map(x => ({
            notification_id: x.id,
            user_id: state.user.id,
            read_at: new Date().toISOString()
        }));
        state.items.forEach(x => { x.is_read = true; });
        render();
        if (personalIds.length) {
            await client.from("notifications")
                .update({ is_read: true, read_at: new Date().toISOString() })
                .in("id", personalIds)
                .eq("user_id", state.user.id);
        }
        if (broadcastRows.length) {
            await client.from("notification_reads").upsert(broadcastRows, { onConflict: "notification_id,user_id" });
        }
    }

    async function markAllDelivered() {
        const client = sb();
        if (!client || !state.user) return;
        await client.from("notifications").update({ delivered_at: new Date().toISOString() }).eq("user_id", state.user.id).is("delivered_at", null);
    }

    function updateBadge() {
        const unread = state.items.filter(x => !x.is_read).length;
        const bells = document.querySelectorAll(".fa-bell");
        bells.forEach(bell => {
            const host = bell.parentElement || bell;
            host.style.position = host.style.position || "relative";
            host.querySelector(".sn-badge")?.remove();
            if (unread > 0) {
                const badge = document.createElement("span");
                badge.className = "sn-badge";
                badge.textContent = unread > 99 ? "99+" : String(unread);
                host.appendChild(badge);
            }
        });
    }

    async function subscribeRealtime() {
        const client = sb();
        if (!client || !state.user) return;
        if (state.channel) await client.removeChannel(state.channel);
        state.channel = client.channel(`student-notifications-${state.user.id}`)
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, payload => {
                const item = payload.new;
                const belongs = item.user_id === state.user.id || item.is_broadcast === true || (state.isAdmin && item.audience === "admin");
                if (!belongs) return;
                state.items.unshift({ ...item, is_read: false });
                render();
                showForeground(item);
            })
            .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications" }, payload => {
                const index = state.items.findIndex(x => String(x.id) === String(payload.new.id));
                if (index < 0) return;
                state.items[index] = { ...state.items[index], ...payload.new };
                render();
            })
            .on("postgres_changes", { event: "DELETE", schema: "public", table: "notifications" }, payload => {
                state.items = state.items.filter(x => String(x.id) !== String(payload.old.id));
                render();
            })
            .subscribe();
    }

    async function showForeground(item) {
        if (document.visibilityState === "visible") {
            toast(item.title || "إشعار جديد");
            return;
        }
        if (Notification.permission !== "granted") return;
        const registration = await navigator.serviceWorker.ready;
        registration.showNotification(item.title || "Student", {
            body: item.body || "لديك إشعار جديد",
            icon: "./apple-touch-icon.png",
            badge: "./apple-touch-icon.png",
            data: { url: item.link || "./index.html", notification_id: item.id }
        });
    }

    function urlBase64ToUint8Array(base64String) {
        const padding = "=".repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
        const rawData = atob(base64);
        return Uint8Array.from([...rawData].map(ch => ch.charCodeAt(0)));
    }

    async function registerServiceWorker() {
        if (!("serviceWorker" in navigator)) throw new Error("SERVICE_WORKER_UNSUPPORTED");
        return navigator.serviceWorker.register(SW_URL, { scope: "./" });
    }

    async function enablePush() {
        const client = sb();
        if (!client || !state.user) return;
        try {
            const permission = await Notification.requestPermission();
            if (permission !== "granted") {
                renderPermission();
                return;
            }
            const registration = await registerServiceWorker();
            let subscription = await registration.pushManager.getSubscription();
            if (!subscription) {
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
                });
            }
            const json = subscription.toJSON();
            const { error } = await client.from("push_subscriptions").upsert({
                user_id: state.user.id,
                endpoint: json.endpoint,
                p256dh: json.keys?.p256dh || "",
                auth: json.keys?.auth || "",
                user_agent: navigator.userAgent,
                is_active: true,
                updated_at: new Date().toISOString()
            }, { onConflict: "user_id,endpoint" });
            if (error) throw error;
            localStorage.setItem(`student-push-asked:${state.user.id}`, "yes");
            renderPermission();
            toast("تم تفعيل إشعارات الهاتف.");
        } catch (error) {
            console.error("Push enable error:", error);
            toast("تعذر تفعيل الإشعارات الخارجية. تأكد من تشغيل SQL ورفع sw.js.");
        }
    }

    function showFirstLoginPrompt() {
        if (!state.user || !("Notification" in window)) return;

        const permission = Notification.permission;
        if (permission === "granted") return;

        const key = `student-push-reminder:${state.user.id}`;
        const lastShown = Number(localStorage.getItem(key) || 0);
        const remindAfter = 24 * 60 * 60 * 1000;

        if (Date.now() - lastShown < remindAfter) return;

        setTimeout(() => {
            if (document.querySelector(".sn-modal[data-push-reminder]")) return;

            const modal = document.createElement("div");
            modal.className = "sn-modal";
            modal.dataset.pushReminder = "1";

            if (permission === "denied") {
                modal.innerHTML = `<div class="sn-sheet"><h3>الإشعارات متوقفة</h3><p style="line-height:1.8;color:#566171">سبق أن تم رفض إذن الإشعارات. افتح إعدادات هذا الموقع في Chrome، ثم غيّر الإشعارات إلى سماح، وبعدها أعد فتح التطبيق.</p><div class="sn-actions"><button class="sn-btn secondary" data-close type="button">حسنًا</button></div></div>`;
            } else {
                modal.innerHTML = `<div class="sn-sheet"><h3>تفعيل الإشعارات</h3><p style="line-height:1.8;color:#566171">فعّل الإشعارات لتصلك تنبيهات Student في لوحة إشعارات الهاتف.</p><div class="sn-actions"><button class="sn-btn secondary" data-close type="button">لاحقًا</button><button class="sn-btn" data-enable type="button">تفعيل الآن</button></div></div>`;
            }

            document.body.appendChild(modal);
            localStorage.setItem(key, String(Date.now()));

            modal.querySelector("[data-close]").onclick = () => modal.remove();
            modal.querySelector("[data-enable]")?.addEventListener("click", async () => {
                modal.remove();
                await enablePush();
            });
        }, 1200);
    }

    function openEditBroadcast(id) {
        const item = state.items.find(x => String(x.id) === String(id));
        if (!state.isAdmin || !item) return;
        const modal = document.createElement("div");
        modal.className = "sn-modal";
        modal.innerHTML = `<form class="sn-sheet"><h3>تعديل الإشعار</h3>
            <div class="sn-field"><label>العنوان</label><input name="title" maxlength="100" required value="${escapeHtml(item.title || "")}"></div>
            <div class="sn-field"><label>النص</label><textarea name="body" maxlength="500" required>${escapeHtml(item.body || "")}</textarea></div>
            <div class="sn-field"><label>الرابط (اختياري)</label><input name="link" maxlength="300" value="${escapeHtml(item.link || "")}"></div>
            <div class="sn-actions"><button class="sn-btn secondary" data-close type="button">إلغاء</button><button class="sn-btn" type="submit">حفظ</button></div></form>`;
        document.body.appendChild(modal);
        modal.querySelector("[data-close]").onclick = () => modal.remove();
        modal.querySelector("form").onsubmit = async event => {
            event.preventDefault();
            const button = event.submitter;
            button.disabled = true;
            const form = new FormData(event.currentTarget);
            const { error } = await sb().rpc("student_admin_update_broadcast", {
                p_notification_id: id,
                p_title: String(form.get("title") || "").trim(),
                p_body: String(form.get("body") || "").trim(),
                p_link: String(form.get("link") || "").trim() || null
            });
            if (error) {
                button.disabled = false;
                toast(`تعذر التعديل: ${error.message}`);
                return;
            }
            modal.remove();
            await load();
            toast("تم تعديل الإشعار.");
        };
    }

    function confirmDeleteBroadcast(id) {
        if (!state.isAdmin) return;
        const modal = document.createElement("div");
        modal.className = "sn-modal";
        modal.innerHTML = `<div class="sn-sheet"><h3>حذف الإشعار؟</h3><p style="line-height:1.8;color:#566171">سيُحذف هذا الإشعار من جميع الحسابات نهائيًا.</p><div class="sn-actions"><button class="sn-btn secondary" data-close type="button">إلغاء</button><button class="sn-btn danger" data-delete type="button">حذف</button></div></div>`;
        document.body.appendChild(modal);
        modal.querySelector("[data-close]").onclick = () => modal.remove();
        modal.querySelector("[data-delete]").onclick = async event => {
            event.currentTarget.disabled = true;
            const { error } = await sb().rpc("student_admin_delete_broadcast", { p_notification_id: id });
            if (error) {
                event.currentTarget.disabled = false;
                toast(`تعذر الحذف: ${error.message}`);
                return;
            }
            modal.remove();
            state.items = state.items.filter(x => String(x.id) !== String(id));
            render();
            toast("تم حذف الإشعار.");
        };
    }

    function openBroadcast() {
        if (!state.isAdmin) return;
        const modal = document.createElement("div");
        modal.className = "sn-modal";
        modal.innerHTML = `<form class="sn-sheet" id="sn-broadcast-form"><h3>نشر إشعار للجميع</h3>
            <div class="sn-field"><label>عنوان الإشعار</label><input name="title" maxlength="100" required></div>
            <div class="sn-field"><label>نص الإشعار</label><textarea name="body" maxlength="500" required></textarea></div>
            <div class="sn-field"><label>الرابط أو القسم (اختياري)</label><input name="link" maxlength="300" placeholder="مثال: ./index.html"></div>
            <div class="sn-actions"><button class="sn-btn secondary" data-close type="button">إلغاء</button><button class="sn-btn" type="submit">نشر الآن</button></div></form>`;
        document.body.appendChild(modal);
        modal.querySelector("[data-close]").onclick = () => modal.remove();
        modal.querySelector("form").onsubmit = async event => {
            event.preventDefault();
            const button = event.submitter;
            button.disabled = true;
            button.textContent = "جارٍ النشر...";
            const form = new FormData(event.currentTarget);
            const client = sb();
            const title = String(form.get("title") || "").trim();
            const body = String(form.get("body") || "").trim();
            const link = String(form.get("link") || "").trim() || null;

            let notificationId = null;

            // مسار واحد ثابت: دالة V2 الآمنة في Supabase.
            // لا نستخدم الإدخال المباشر لأنه يخضع لسياسات RLS وقد يفشل حتى للأدمن.
            const rpcResult = await client.rpc("student_admin_broadcast_v2", {
                p_title: title,
                p_body: body,
                p_link: link
            });

            if (rpcResult.error) {
                console.error("Broadcast V2 RPC error:", rpcResult.error);
                button.disabled = false;
                button.textContent = "نشر الآن";
                const details = [
                    rpcResult.error.message,
                    rpcResult.error.details,
                    rpcResult.error.hint,
                    rpcResult.error.code
                ].filter(Boolean).join(" | ") || "خطأ غير معروف";
                toast(`فشل النشر: ${details}`);
                return;
            }

            notificationId = rpcResult.data || null;

            // الإشعار الداخلي تم نشره. فشل Push الخارجي لا يلغي نجاح النشر الداخلي.
            if (notificationId) {
                try {
                    const pushResult = await client.functions.invoke("send-push", {
                        body: { notification_id: notificationId, broadcast: true }
                    });
                    if (pushResult?.error) console.warn("External push invoke failed:", pushResult.error);
                } catch (error2) {
                    console.warn("External push invoke failed:", error2);
                }
            }

            modal.remove();
            await load();
            toast("تم نشر الإشعار للجميع داخل التطبيق.");
        };
    }

    async function init() {
        const client = sb();
        if (!client) return;
        const user = await getUser();
        if (!user) return;
        if (state.initializedFor === user.id) return;
        state.initializedFor = user.id;
        state.user = user;
        state.isAdmin = await checkAdmin();
        await registerServiceWorker().catch(() => null);
        await load();
        await subscribeRealtime();
        showFirstLoginPrompt();
    }

    async function open() {
        await init();
        const page = ensurePage();
        page.classList.add("is-open");
        document.body.style.overflow = "hidden";
        await load();
        await markAllRead();
    }

    function close() {
        const page = document.getElementById("student-notifications-page");
        page?.classList.remove("is-open");
        document.body.style.overflow = "";
    }

    window.StudentNotifications = { init, open, close, enablePush };
    window.openNotifications = open;

    const wait = setInterval(() => {
        if (sb()) {
            clearInterval(wait);
            init().catch(console.error);
        }
    }, 500);
    setTimeout(() => clearInterval(wait), 30000);
})();


/* ===== MERGED MODULE: account-role-onboarding.js ===== */
/* =========================================================
   Student - Account Role Onboarding
   اختيار حساب طالب أو مدرس
========================================================= */

(function () {
    "use strict";

    if (window.StudentAccountRoleOnboarding) return;

    const STORAGE_KEY = "student_pending_account_role";
    const GUEST_DONE_KEY = "student_guest_role_selected";
    let overlay = null;
    let busy = false;

    function escapeHTML(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function close() {
        overlay?.remove();
        overlay = null;
        document.body.style.overflow = "";
    }

    function setMessage(message, type) {
        const el = document.getElementById("student-role-message");
        if (!el) return;
        el.textContent = message || "";
        el.style.color = type === "error" ? "#b42318" : "#18794e";
    }

    function setBusy(value) {
        busy = value;
        document.querySelectorAll("[data-student-role]").forEach((button) => {
            button.disabled = value;
            button.style.opacity = value ? "0.65" : "1";
        });
    }

    async function isAdmin(client) {
        if (!client) return false;
        const { data, error } = await client.rpc("current_user_is_admin");
        if (error) {
            console.warn("Admin role check failed:", error);
            return false;
        }
        return data === true;
    }

    async function openTeacherPortal() {
        try {
            if (!window.StudentTeachersEducation) {
                await new Promise((resolve, reject) => {
                    const old = document.querySelector('script[data-student-teachers="true"]');
                    if (old) {
                        old.addEventListener("load", resolve, { once: true });
                        old.addEventListener("error", reject, { once: true });
                        return;
                    }
                    const script = document.createElement("script");
                    script.src = "teachers-education.js";
                    script.async = true;
                    script.dataset.studentTeachers = "true";
                    script.onload = resolve;
                    script.onerror = reject;
                    document.head.appendChild(script);
                });
            }
            window.StudentTeachersEducation?.openTeacherPortal?.();
        } catch (error) {
            console.error("Teacher portal loading failed:", error);
        }
    }

    async function chooseRole(role, options) {
        if (busy || !["student", "teacher"].includes(role)) return;

        const { supabaseClient, user, onSelected } = options;

        if (!user) {
            localStorage.setItem(STORAGE_KEY, role);
            localStorage.setItem(GUEST_DONE_KEY, "1");
            close();
            return;
        }

        setBusy(true);
        setMessage("جارٍ حفظ اختيارك...", "success");

        try {
            const { data, error } = await supabaseClient.rpc(
                "choose_account_role",
                { selected_role: role }
            );

            if (error) throw error;

            localStorage.removeItem(STORAGE_KEY);
            localStorage.setItem(GUEST_DONE_KEY, "1");
            await onSelected?.(data || null);
            close();

            if (role === "teacher") {
                await openTeacherPortal();
            }
        } catch (error) {
            console.error("Choose account role error:", error);
            setMessage(error?.message || "تعذر حفظ نوع الحساب.", "error");
            setBusy(false);
        }
    }

    function render(options, pendingRole) {
        close();
        document.body.style.overflow = "hidden";

        overlay = document.createElement("div");
        overlay.id = "student-account-role-onboarding";
        overlay.setAttribute("role", "dialog");
        overlay.setAttribute("aria-modal", "true");
        overlay.style.cssText = `
            position:fixed;inset:0;z-index:2147483000;background:rgba(8,18,35,.72);
            display:flex;align-items:center;justify-content:center;padding:16px;direction:rtl;
            font-family:Tahoma,Arial,sans-serif;box-sizing:border-box;
        `;

        overlay.innerHTML = `
            <section style="width:100%;max-width:560px;max-height:94vh;overflow:auto;background:#fff;border-radius:24px;padding:22px;box-sizing:border-box;box-shadow:0 24px 70px rgba(0,0,0,.3);">
                <div style="text-align:center;margin-bottom:18px;">
                    <div style="width:58px;height:58px;border-radius:18px;background:#eaf4ff;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-size:28px;">🎓</div>
                    <h2 style="margin:0 0 8px;color:#14213d;font-size:23px;">اختر طريقة استخدام Student</h2>
                    <p style="margin:0;color:#667085;line-height:1.75;font-size:14px;">يمكنك إكمال الاستخدام كطالب، أو اختيار حساب مدرس وإرسال طلب اعتماد.</p>
                </div>

                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;">
                    <button type="button" data-student-role="student" style="text-align:right;border:2px solid ${pendingRole === "student" ? "#1877f2" : "#e4e7ec"};background:#fff;border-radius:18px;padding:17px;cursor:pointer;">
                        <strong style="display:block;color:#101828;font-size:18px;margin-bottom:9px;">👨‍🎓 الاستمرار كطالب</strong>
                        <span style="display:block;color:#475467;font-size:13px;line-height:1.8;">تصفح المراحل والمواد والمدرسين، والاستفادة من الملفات والشروحات المنشورة.</span>
                        <span style="display:block;color:#b42318;font-size:12px;line-height:1.7;margin-top:8px;">لا يجوز نشر محتوى تعليمي أو الظهور باسم مدرس.</span>
                    </button>

                    <button type="button" data-student-role="teacher" style="text-align:right;border:2px solid ${pendingRole === "teacher" ? "#d92d20" : "#e4e7ec"};background:#fff;border-radius:18px;padding:17px;cursor:pointer;">
                        <strong style="display:block;color:#101828;font-size:18px;margin-bottom:9px;">👨‍🏫 اختيار حساب مدرس</strong>
                        <span style="display:block;color:#475467;font-size:13px;line-height:1.8;">إنشاء صفحة مدرس، اختيار التخصص والمواد، ورفع الشروحات بعد اعتماد الطلب.</span>
                        <span style="display:block;color:#b42318;font-size:12px;line-height:1.7;margin-top:8px;">يلزم تقديم معلومات صحيحة والالتزام بجودة المحتوى وسياسات التطبيق.</span>
                    </button>
                </div>

                <div style="margin-top:14px;padding:13px 14px;background:#fff4f2;border:1px solid #fecdca;border-radius:14px;color:#912018;font-size:13px;line-height:1.8;">
                    🔴 يحصل المدرس المقبول على <strong>علامة توثيق حمراء مجانية</strong>. اختيار حساب مدرس لا يمنح التوثيق أو صلاحية النشر مباشرة؛ يبدأ ذلك بعد مراجعة الأدمن والموافقة.
                </div>

                <div id="student-role-message" style="min-height:22px;margin-top:10px;text-align:center;font-size:13px;"></div>
            </section>
        `;

        document.body.appendChild(overlay);

        overlay.querySelectorAll("[data-student-role]").forEach((button) => {
            button.addEventListener("click", () => {
                chooseRole(button.dataset.studentRole, options);
            });
        });
    }

    async function open(options = {}) {
        const profile = options.profile || null;
        const user = options.user || null;
        const client = options.supabaseClient || window.supabaseClient || null;

        if (user) {
            if (profile?.account_type_selected === true) return;
            if (await isAdmin(client)) return;
        } else if (localStorage.getItem(GUEST_DONE_KEY) === "1") {
            return;
        }

        const pendingRole = localStorage.getItem(STORAGE_KEY) || "";
        render({ ...options, supabaseClient: client }, pendingRole);
    }

    window.StudentAccountRoleOnboarding = { open, close };
})();
