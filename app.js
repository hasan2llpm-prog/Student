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

function showMessage(
    elementId,
    message,
    type = ""
) {

    const element =
        document.getElementById(
            elementId
        );

    if (!element) return;

    element.textContent =
        message;

    element.className =
        "auth-message";

    if (type) {
        element.classList.add(
            type
        );
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
        document.getElementById(
            buttonId
        );

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
   الملف الشخصي
========================================================= */

async function loadProfile(
    userId
) {

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
                    role
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
   إحصائيات
========================================================= */

async function getProfileStats(
    userId
) {

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

    if (session?.user) {

        currentUser =
            session.user;

        showMainScreen();

        await loadProfile(
            session.user.id
        );

    } else {

        currentUser =
            null;

        currentProfile =
            null;

        showAuthScreen();
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
   التسجيل
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


        currentUser = null;

        currentProfile = null;


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
   أخطاء المصادقة
========================================================= */

function translateAuthError(
    error
) {

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
        "rgba(0,0,0,.35)";

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
                rgba(0,0,0,.22);
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
                event.target === panel
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
                    src="${escapeAttribute(
                        avatar
                    )}"
                    alt=""
                    style="
                        width:96px;
                        height:96px;
                        border-radius:50%;
                        object-fit:cover;
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
        <div style="
            text-align:center;
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


            <div style="
                display:flex;
                justify-content:space-around;
                text-align:center;
                border-top:1px solid #eee;
                border-bottom:1px solid #eee;
                padding:15px 5px;
                margin:18px 0;
            ">

                <div>

                    <strong>
                        0
                    </strong>

                    <span style="
                        display:block;
                        color:#777;
                        font-size:13px;
                    ">
                        المنشورات
                    </span>

                </div>


                <div>

                    <strong>
                        ${stats.followers}
                    </strong>

                    <span style="
                        display:block;
                        color:#777;
                        font-size:13px;
                    ">
                        المتابعون
                    </span>

                </div>


                <div>

                    <strong>
                        ${stats.following}
                    </strong>

                    <span style="
                        display:block;
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
                text-align:right;
            ">

                <strong>
                    نبذة
                </strong>

                <div style="
                    color:#666;
                    margin-top:6px;
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
                text-align:right;
            ">

                <strong>
                    البريد الإلكتروني
                </strong>

                <div style="
                    color:#666;
                    direction:ltr;
                    margin-top:6px;
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
                text-align:right;
            ">

                <div>

                    <strong>
                        خصوصية الحساب
                    </strong>

                    <div style="
                        color:#777;
                        font-size:13px;
                        margin-top:4px;
                    ">
                        ${
                            status === "private"
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
                        status === "private"
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
                        cursor:pointer;
                    "
                >
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
                        cursor:pointer;
                    "
                >
                    تسجيل الخروج
                </button>

            </div>

        </div>
        `
    );


    document
        .getElementById(
            "profile-edit-btn"
        )
        ?.addEventListener(
            "click",
            function() {
                showEditProfilePanel(
                    profile
                );
            }
        );


    document
        .getElementById(
            "profile-logout-btn"
        )
        ?.addEventListener(
            "click",
            logoutUser
        );


    document
        .getElementById(
            "profile-toggle-status"
        )
        ?.addEventListener(
            "click",
            toggleAccountStatus
        );
}


/* =========================================================
   تعديل الملف
========================================================= */

function showEditProfilePanel(
    profile
) {

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
                    profile?.full_name || ""
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
                    profile?.username || ""
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
                profile?.bio || ""
            )}</textarea>


            <label>
                رابط الصورة الشخصية
            </label>

            <input
                id="edit-avatar-url"
                type="url"
                value="${escapeAttribute(
                    profile?.avatar_url || ""
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


    document
        .getElementById(
            "edit-profile-form"
        )
        ?.addEventListener(
            "submit",
            saveProfileChanges
        );
}


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


    button.disabled =
        true;

    button.textContent =
        "جارٍ الحفظ...";


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
            data !== "updated"
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


        message.style.color =
            "#16803c";

        message.textContent =
            "تم حفظ التغييرات بنجاح.";


        setTimeout(
            showProfilePanel,
            700
        );


    } catch (error) {

        console.error(
            "Profile update error:",
            error
        );


        message.style.color =
            "#d93025";

        message.textContent =
            error?.message ||
            "تعذر حفظ التغييرات.";


    } finally {

        button.disabled =
            false;

        button.textContent =
            "حفظ التغييرات";
    }
}


/* =========================================================
   الخصوصية
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
                padding:25px;
                color:#d93025;
            ">
                تعذر تغيير خصوصية الحساب حاليًا.
            </div>
            `
        );
    }
}


/* =========================================================
   المراحل الحالية
========================================================= */

function openStage(
    stageName
) {

    const stages = {

        primary: {
            title:
                "المرحلة الابتدائية",
            icon:
                "🎓"
        },

        middle: {
            title:
                "المرحلة الإعدادية",
            icon:
                "🏫"
        },

        secondary: {
            title:
                "المرحلة الثانوية",
            icon:
                "📚"
        },

        university: {
            title:
                "المرحلة الجامعية",
            icon:
                "🎓"
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
            padding:20px;
        ">

            <div style="
                font-size:50px;
            ">
                ${stage.icon}
            </div>

            <p style="
                color:#666;
                line-height:1.8;
            ">
                سيتم بناء محتوى هذه المرحلة
                ضمن نظام المراحل والمواد.
            </p>

        </div>
        `
    );
}


window.openStage =
    openStage;


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
   الإشعارات الحالية
========================================================= */

function openNotifications() {

    showFloatingPanel(
        "الإشعارات",
        `
        <div style="
            text-align:center;
            padding:30px;
        ">

            <div style="
                font-size:50px;
            ">
                🔔
            </div>

            <p style="
                color:#666;
            ">
                لا توجد إشعارات جديدة.
            </p>

        </div>
        `
    );
}


window.openNotifications =
    openNotifications;


/* =========================================================
   Stories الحالية
========================================================= */

function openStory(
    name
) {

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
            color:#fff;
            font-size:23px;
            font-weight:bold;
        ">
            ${escapeHTML(
                name || "Story"
            )}
        </div>
        `
    );
}


window.openStory =
    openStory;


/* =========================================================
   إضافة ستوري الحالية
========================================================= */

function addStory() {

    showFloatingPanel(
        "إضافة ستوري",
        `
        <div style="
            text-align:center;
            padding:25px;
        ">

            <div style="
                border:2px dashed #0095f6;
                border-radius:18px;
                padding:35px 15px;
                color:#777;
            ">

                <div style="
                    font-size:45px;
                ">
                    📷
                </div>

                اختر صورة أو فيديو
                لإضافة ستوري.

            </div>

        </div>
        `
    );
}


window.addStory =
    addStory;


/* =========================================================
   الشريط السفلي الاحتياطي
========================================================= */

function openBottomSection(
    section
) {

    if (
        section === "profile"
    ) {

        showProfilePanel();

        return;
    }


    const map = {

        home: [
            "الرئيسية",
            "🏠",
            "أنت الآن في الصفحة الرئيسية."
        ],

        search: [
            "البحث",
            "🔎",
            "سيتم تشغيل البحث من search.js."
        ],

        add: [
            "إضافة",
            "➕",
            "سيتم تشغيل النشر من posts.js."
        ],

        messages: [
            "الرسائل",
            "💬",
            "سيتم بناء نظام الرسائل لاحقًا."
        ]

    };


    const item =
        map[section] ||
        map.home;


    showFloatingPanel(
        item[0],
        `
        <div style="
            text-align:center;
            padding:25px;
        ">

            <div style="
                font-size:50px;
            ">
                ${item[1]}
            </div>

            <p style="
                color:#666;
                line-height:1.8;
            ">
                ${item[2]}
            </p>

        </div>
        `
    );
}


/* =========================================================
   ربط الواجهة الأساسية
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
                        nameElement
                            ?.textContent
                            ?.trim() ||
                        "الستوري";


                    openStory(
                        name
                    );
                }
            );
        }
    );


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


    const registerButton =
        document.getElementById(
            "show-register"
        );


    if (registerButton) {

        registerButton.addEventListener(
            "click",
            function(event) {

                event.preventDefault();

                showRegister();
            }
        );
    }


    const loginButton =
        document.getElementById(
            "show-login"
        );


    if (loginButton) {

        loginButton.addEventListener(
            "click",
            function(event) {

                event.preventDefault();

                showLogin();
            }
        );
    }
}


/* =========================================================
   تحميل نظام خارجي
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
   تحميل الأنظمة
========================================================= */

function loadAdminSystem() {

    loadExternalScript(
        "admin.js",
        "student-admin",
        "Student Admin"
    );
}


function loadMenuSystem() {

    loadExternalScript(
        "menu.js",
        "student-menu",
        "Student Menu"
    );
}


function loadSettingsSystem() {

    loadExternalScript(
        "settings.js",
        "student-settings",
        "Student Settings"
    );
}


function loadPostsSystem() {

    loadExternalScript(
        "posts.js",
        "student-posts",
        "Student Posts"
    );
}


function loadSearchSystem() {

    loadExternalScript(
        "search.js",
        "student-search",
        "Student Search"
    );
}


function loadFeedSystem() {

    loadExternalScript(
        "feed.js",
        "student-feed",
        "Student Feed"
    );
}


/* =========================================================
   Supabase
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
   التشغيل
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function() {

        bindInterfaceButtons();

        initSupabase();

        loadAdminSystem();

        loadMenuSystem();

        loadSettingsSystem();

        loadPostsSystem();

        loadSearchSystem();

        loadFeedSystem();

    }
);
