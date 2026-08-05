(function(){
"use strict";
/* =========================================================
   STUDENT - PROFILE SYSTEM
   ملف مستقل عن app.js
========================================================= */


/* =========================================================
   أدوات مساعدة
========================================================= */

function profileEscapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function profileEscapeAttribute(value) {
    return profileEscapeHTML(value);
}


/* =========================================================
   تحميل بيانات الملف
========================================================= */

async function profileLoad(userId) {

    if (!supabaseClient || !userId) {
        return null;
    }

    const { data, error } =
        await supabaseClient
            .from("profiles")
            .select(`
                id,
                full_name,
                username,
                email,
                bio,
                avatar_url,
                account_status
            `)
            .eq("id", userId)
            .maybeSingle();

    if (error) {
        console.error(
            "Profile load error:",
            error
        );

        return null;
    }

    if (typeof currentProfile !== "undefined") {
        currentProfile = data;
    }

    return data;
}


/* =========================================================
   إحصائيات المتابعة
========================================================= */

async function profileGetStats(userId) {

    const emptyStats = {
        followers: 0,
        following: 0
    };

    if (!supabaseClient || !userId) {
        return emptyStats;
    }

    const { data, error } =
        await supabaseClient.rpc(
            "get_profile_stats",
            {
                p_user_id: userId
            }
        );

    if (error) {

        console.error(
            "Profile stats error:",
            error
        );

        return emptyStats;
    }

    const row =
        Array.isArray(data)
            ? data[0]
            : data;

    return {
        followers:
            Number(row?.followers_count || 0),

        following:
            Number(row?.following_count || 0)
    };
}


/* =========================================================
   الصورة الافتراضية
========================================================= */

function profileAvatarHTML(profile) {

    if (profile?.avatar_url) {

        return `
            <img
                src="${profileEscapeAttribute(profile.avatar_url)}"
                alt="الصورة الشخصية"
                style="
                    width:100px;
                    height:100px;
                    border-radius:50%;
                    object-fit:cover;
                    display:block;
                    margin:auto;
                "
            >
        `;
    }

    return `
        <div style="
            width:100px;
            height:100px;
            border-radius:50%;
            background:#eaf5ff;
            display:flex;
            align-items:center;
            justify-content:center;
            margin:auto;
            color:#0095f6;
            font-size:42px;
        ">
            <i class="fa-solid fa-user"></i>
        </div>
    `;
}


/* =========================================================
   الصفحة الشخصية
========================================================= */

async function profileOpen() {

    if (
        typeof currentUser === "undefined" ||
        !currentUser
    ) {
        return;
    }


    /* =====================================================
       إذا كان الملف الشخصي مفتوحًا من داخل القائمة
       الرئيسية، لا نغلق القائمة.
    ===================================================== */

    const mainMenu =
        document.getElementById(
            "student-main-menu"
        );


    const openedInsideMainMenu =
        !!(
            mainMenu &&
            mainMenu.classList.contains(
                "is-open"
            )
        );


    if (
        !openedInsideMainMenu &&
        typeof closeFloatingPanel ===
        "function"
    ) {

        closeFloatingPanel();
    }


    const profile =
        await profileLoad(
            currentUser.id
        );


    if (!profile) {

        showFloatingPanel(
            "الملف الشخصي",
            `
            <div style="
                text-align:center;
                padding:30px 10px;
                color:#d93025;
            ">
                تعذر تحميل الملف الشخصي.
            </div>
            `
        );

        return;
    }


    const stats =
        await profileGetStats(
            currentUser.id
        );


    const fullName =
        profile.full_name ||
        "بدون اسم";


    const username =
        profile.username ||
        "username";


    const bio =
        profile.bio ||
        "لا توجد نبذة بعد.";


    const email =
        profile.email ||
        currentUser.email ||
        "";


    const isPrivate =
        profile.account_status ===
        "private";


    showFloatingPanel(
        "الملف الشخصي",

        `
        <div style="
            padding-bottom:5px;
        ">

            <!-- الصورة -->

            <div style="
                text-align:center;
                margin-bottom:14px;
            ">

                ${profileAvatarHTML(profile)}

            </div>


            <!-- الاسم -->

            <div style="
                text-align:center;
                font-size:21px;
                font-weight:700;
                color:#222;
            ">
                ${profileEscapeHTML(fullName)}
            </div>


            <!-- username -->

            <div style="
                text-align:center;
                color:#777;
                font-size:14px;
                margin-top:5px;
                direction:ltr;
            ">
                @${profileEscapeHTML(username)}
            </div>


            <!-- الإحصائيات -->

            <div style="
                display:flex;
                justify-content:space-around;
                text-align:center;
                border-top:1px solid #eee;
                border-bottom:1px solid #eee;
                margin:20px 0;
                padding:15px 5px;
            ">

                <div>

                    <strong style="
                        display:block;
                        font-size:20px;
                        color:#222;
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
                        font-size:20px;
                        color:#222;
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
                        font-size:20px;
                        color:#222;
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


            <!-- Bio -->

            <div style="
                background:#f7f8fa;
                border-radius:14px;
                padding:14px;
                margin-bottom:10px;
            ">

                <div style="
                    font-weight:700;
                    margin-bottom:6px;
                ">
                    النبذة
                </div>

                <div style="
                    color:#666;
                    line-height:1.7;
                ">
                    ${profileEscapeHTML(bio)}
                </div>

            </div>


            <!-- البريد -->

            <div style="
                background:#f7f8fa;
                border-radius:14px;
                padding:14px;
                margin-bottom:10px;
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
                    ${profileEscapeHTML(email)}
                </div>

            </div>


            <!-- الخصوصية -->

            <div style="
                display:flex;
                align-items:center;
                justify-content:space-between;
                gap:12px;
                background:#f7f8fa;
                border-radius:14px;
                padding:14px;
                margin-bottom:14px;
            ">

                <div>

                    <div style="
                        font-weight:700;
                    ">
                        خصوصية الحساب
                    </div>

                    <div
                        id="profile-privacy-text"
                        style="
                            color:#777;
                            font-size:13px;
                            margin-top:4px;
                        "
                    >
                        ${isPrivate ? "حساب خاص" : "حساب عام"}
                    </div>

                </div>


                <button
                    id="profile-privacy-btn"
                    type="button"
                    style="
                        border:none;
                        background:#0095f6;
                        color:#fff;
                        padding:9px 13px;
                        border-radius:10px;
                        cursor:pointer;
                    "
                >
                    ${isPrivate ? "جعله عامًا" : "جعله خاصًا"}
                </button>

            </div>


            <!-- الأزرار -->

            <div style="
                display:grid;
                grid-template-columns:1fr;
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
                    <i class="fa-solid fa-pen"></i>
                    تعديل الملف الشخصي
                </button>


                <button
                    id="profile-close-btn"
                    type="button"
                    style="
                        border:none;
                        background:#f1f3f5;
                        color:#333;
                        padding:13px;
                        border-radius:12px;
                        font-size:15px;
                        cursor:pointer;
                        display:none;
                    "
                >
                    إغلاق
                </button>

            </div>

        </div>
        `
    );


    document
        .getElementById("profile-edit-btn")
        ?.addEventListener(
            "click",
            function() {

                profileOpenEdit(
                    profile
                );

            }
        );


    /*
       زر الإغلاق مخفي داخل القائمة،
       لذلك لا نستخدمه للتنقل.
    */

    document
        .getElementById("profile-close-btn")
        ?.addEventListener(
            "click",
            function () {

                if (
                    openedInsideMainMenu
                ) {

                    if (
                        typeof window.goBackInsideMenu ===
                        "function"
                    ) {

                        window.goBackInsideMenu();
                    }

                    return;
                }


                if (
                    typeof closeFloatingPanel ===
                    "function"
                ) {

                    closeFloatingPanel();
                }

            }
        );


    document
        .getElementById("profile-privacy-btn")
        ?.addEventListener(
            "click",
            function() {

                profileTogglePrivacy(
                    profile.account_status
                );

            }
        );
}


/* =========================================================
   تعديل الملف
========================================================= */

function profileOpenEdit(profile) {

    const fullName =
        profile?.full_name || "";

    const username =
        profile?.username || "";

    const bio =
        profile?.bio || "";

    const avatar =
        profile?.avatar_url || "";


    showFloatingPanel(
        "تعديل الملف الشخصي",

        `
        <form
            id="profile-edit-form"
            style="
                display:flex;
                flex-direction:column;
                gap:11px;
            "
        >

            <!-- الصورة -->

            <div style="
                text-align:center;
                margin-bottom:5px;
            ">

                <div
                    id="profile-edit-avatar"
                    style="
                        width:100px;
                        height:100px;
                        margin:auto;
                    "
                >
                    ${
                        avatar
                            ? `
                                <img
                                    src="${profileEscapeAttribute(avatar)}"
                                    style="
                                        width:100px;
                                        height:100px;
                                        border-radius:50%;
                                        object-fit:cover;
                                    "
                                >
                              `
                            : `
                                <div style="
                                    width:100px;
                                    height:100px;
                                    border-radius:50%;
                                    background:#eaf5ff;
                                    display:flex;
                                    align-items:center;
                                    justify-content:center;
                                    color:#0095f6;
                                    font-size:40px;
                                ">
                                    <i class="fa-solid fa-user"></i>
                                </div>
                              `
                    }
                </div>

                <label
                    for="profile-image-input"
                    style="
                        display:inline-block;
                        margin-top:10px;
                        color:#0095f6;
                        font-weight:600;
                        cursor:pointer;
                    "
                >
                    <i class="fa-solid fa-camera"></i>
                    تغيير الصورة
                </label>

                <input
                    id="profile-image-input"
                    type="file"
                    accept="image/*"
                    style="display:none;"
                >

            </div>


            <label>
                الاسم
            </label>

            <input
                id="profile-name-input"
                type="text"
                value="${profileEscapeAttribute(fullName)}"
                required
                style="
                    padding:13px;
                    border:1px solid #ddd;
                    border-radius:10px;
                    font-size:15px;
                "
            >


            <label>
                اسم المستخدم
            </label>

            <input
                id="profile-username-input"
                type="text"
                value="${profileEscapeAttribute(username)}"
                minlength="3"
                required
                style="
                    padding:13px;
                    border:1px solid #ddd;
                    border-radius:10px;
                    font-size:15px;
                    direction:ltr;
                "
            >


            <label>
                النبذة
            </label>

            <textarea
                id="profile-bio-input"
                maxlength="200"
                placeholder="اكتب نبذة عنك..."
                style="
                    min-height:90px;
                    resize:none;
                    padding:13px;
                    border:1px solid #ddd;
                    border-radius:10px;
                    font-size:15px;
                "
            >${profileEscapeHTML(bio)}</textarea>


            <button
                id="profile-save-btn"
                type="submit"
                style="
                    border:none;
                    background:#0095f6;
                    color:#fff;
                    padding:13px;
                    border-radius:12px;
                    font-size:16px;
                    cursor:pointer;
                "
            >
                حفظ التغييرات
            </button>


            <div
                id="profile-edit-message"
                style="
                    min-height:22px;
                    text-align:center;
                    font-size:14px;
                "
            ></div>

        </form>
        `
    );


    document
        .getElementById("profile-image-input")
        ?.addEventListener(
            "change",
            profilePreviewImage
        );


    document
        .getElementById("profile-edit-form")
        ?.addEventListener(
            "submit",
            profileSave
        );
}


/* =========================================================
   معاينة الصورة
========================================================= */

function profilePreviewImage(event) {

    const file =
        event.target.files?.[0];

    if (!file) {
        return;
    }

    if (!file.type.startsWith("image/")) {

        event.target.value = "";

        return;
    }

    if (file.size > 5 * 1024 * 1024) {

        event.target.value = "";

        showFloatingPanel(
            "الصورة",
            `
            <div style="
                text-align:center;
                padding:25px;
                color:#d93025;
            ">
                يجب أن يكون حجم الصورة أقل من 5MB.
            </div>
            `
        );

        return;
    }

    const reader =
        new FileReader();

    reader.onload =
        function(loadEvent) {

            const container =
                document.getElementById(
                    "profile-edit-avatar"
                );

            if (!container) {
                return;
            }

            container.innerHTML = `
                <img
                    src="${loadEvent.target.result}"
                    style="
                        width:100px;
                        height:100px;
                        border-radius:50%;
                        object-fit:cover;
                    "
                >
            `;
        };

    reader.readAsDataURL(file);
}


/* =========================================================
   حفظ الملف
========================================================= */

async function profileSave(event) {

    event.preventDefault();

    if (
        !supabaseClient ||
        !currentUser
    ) {
        return;
    }

    const message =
        document.getElementById(
            "profile-edit-message"
        );

    const button =
        document.getElementById(
            "profile-save-btn"
        );

    const fullName =
        document.getElementById(
            "profile-name-input"
        )?.value.trim();

    const username =
        document.getElementById(
            "profile-username-input"
        )?.value.trim()
        .toLowerCase();

    const bio =
        document.getElementById(
            "profile-bio-input"
        )?.value.trim();

    const image =
        document.getElementById(
            "profile-image-input"
        )?.files?.[0];


    if (!fullName || !username) {

        if (message) {
            message.style.color =
                "#d93025";

            message.textContent =
                "الاسم واسم المستخدم مطلوبان.";
        }

        return;
    }


    try {

        if (button) {
            button.disabled = true;
            button.textContent =
                "جارٍ الحفظ...";
        }


        let avatarURL =
            (
                typeof currentProfile !== "undefined"
                ? currentProfile?.avatar_url
                : null
            ) || null;


        /* رفع الصورة */

        if (image) {

            const extension =
                image.name
                    .split(".")
                    .pop()
                    .toLowerCase();

            const filePath =
                `${currentUser.id}/${Date.now()}.${extension}`;


            const { error: uploadError } =
                await supabaseClient
                    .storage
                    .from("avatars")
                    .upload(
                        filePath,
                        image,
                        {
                            cacheControl: "3600",
                            upsert: false,
                            contentType: image.type
                        }
                    );


            if (uploadError) {
                throw uploadError;
            }


            const { data: publicURL } =
                supabaseClient
                    .storage
                    .from("avatars")
                    .getPublicUrl(
                        filePath
                    );


            avatarURL =
                publicURL?.publicUrl ||
                avatarURL;
        }


        /* تحديث بيانات الملف */

        const { data, error } =
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
                        avatarURL
                }
            );


        if (error) {
            throw error;
        }


        if (data !== "updated") {

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
                    "اسم المستخدم غير صالح."
                );
            }

            throw new Error(
                "تعذر تحديث الملف الشخصي."
            );
        }


        /* تحديث بيانات الذاكرة */

        const newProfile =
            await profileLoad(
                currentUser.id
            );


        if (
            typeof currentProfile !==
            "undefined"
        ) {
            currentProfile =
                newProfile;
        }


        if (message) {

            message.style.color =
                "#16803c";

            message.textContent =
                "تم حفظ التغييرات بنجاح.";
        }


        setTimeout(
            profileOpen,
            700
        );


    } catch (error) {

        console.error(
            "Profile save error:",
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

            button.disabled = false;

            button.textContent =
                "حفظ التغييرات";
        }
    }
}


/* =========================================================
   الخصوصية
========================================================= */

async function profileTogglePrivacy(
    currentStatus
) {

    if (
        !supabaseClient ||
        !currentUser
    ) {
        return;
    }

    const newStatus =
        currentStatus === "private"
            ? "public"
            : "private";


    try {

        const { data, error } =
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
            data !== "public" &&
            data !== "private"
        ) {
            throw new Error(
                "تعذر تغيير الخصوصية."
            );
        }


        await profileLoad(
            currentUser.id
        );


        profileOpen();


    } catch (error) {

        console.error(
            "Privacy error:",
            error
        );

        showFloatingPanel(
            "الخصوصية",
            `
            <div style="
                text-align:center;
                padding:25px;
                color:#d93025;
            ">
                تعذر تغيير خصوصية الحساب.
            </div>
            `
        );
    }
}


/* =========================================================
   ربط الملف الشخصي بالتطبيق
========================================================= */

window.showProfilePanel =
    profileOpen;


window.StudentProfile = {

    open:
        profileOpen,

    edit:
        profileOpenEdit,

    refresh:
        async function() {

            if (
                typeof currentUser !==
                "undefined" &&
                currentUser
            ) {

                return profileLoad(
                    currentUser.id
                );
            }

            return null;
        }

};

})();


/* ===== MERGED MODULE: stories.js ===== */
(function () {
    "use strict";

    let sb = null;
    let currentUser = null;

    let stories = [];
    let currentGroup = [];
    let currentIndex = 0;
    let currentStory = null;
    let editStory = null;
    let storyMode = "text";

    let storyTimer = null;
    let videoTimer = null;

    const REACTIONS = ["❤️", "😂", "🔥", "👏"];

    const $ = (s, r = document) => r.querySelector(s);
    const $$ = (s, r = document) => [...r.querySelectorAll(s)];

    /* =========================================================
       HELPERS
    ========================================================= */

    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function timeAgo(dateString) {
        const diff = Math.max(
            0,
            Date.now() - new Date(dateString).getTime()
        );

        const min = 60 * 1000;
        const hour = 60 * min;

        if (diff < min) return "الآن";
        if (diff < hour) {
            return `${Math.floor(diff / min)} د`;
        }

        if (diff < 24 * hour) {
            return `${Math.floor(diff / hour)} س`;
        }

        return new Date(dateString).toLocaleDateString(
            "ar-IQ",
            {
                day: "numeric",
                month: "short"
            }
        );
    }

    function toast(message, type = "success") {
        let box = $("#studentToastContainer");

        if (!box) {
            box = document.createElement("div");
            box.id = "studentToastContainer";

            box.style.cssText = `
                position:fixed;
                top:80px;
                left:50%;
                transform:translateX(-50%);
                z-index:300000;
                width:min(92%,420px);
                display:flex;
                flex-direction:column;
                gap:8px;
                pointer-events:none;
            `;

            document.body.appendChild(box);
        }

        const item = document.createElement("div");

        item.textContent = message;

        item.style.cssText = `
            background:${type === "error" ? "#dc2626" : "#16a34a"};
            color:#fff;
            padding:13px 16px;
            border-radius:14px;
            text-align:center;
            font-weight:600;
            direction:rtl;
            box-shadow:0 10px 30px rgba(0,0,0,.25);
            opacity:0;
            transform:translateY(-10px);
            transition:.2s ease;
        `;

        box.appendChild(item);

        requestAnimationFrame(() => {
            item.style.opacity = "1";
            item.style.transform = "translateY(0)";
        });

        setTimeout(() => {
            item.style.opacity = "0";
            item.style.transform = "translateY(-10px)";

            setTimeout(() => {
                item.remove();
            }, 220);
        }, 2500);
    }

    /* =========================================================
       SUPABASE
    ========================================================= */

    async function initSupabase() {
        if (window.studentSupabase) {
            sb = window.studentSupabase;
            return true;
        }

        if (window.supabaseClient) {
            sb = window.supabaseClient;
            return true;
        }

        if (
            !window.supabase ||
            !window.supabase.createClient
        ) {
            toast(
                "تعذر تحميل Supabase",
                "error"
            );

            return false;
        }

        try {
            const response = await fetch(
                "/config.json",
                {
                    cache: "no-store"
                }
            );

            if (!response.ok) {
                throw new Error(
                    "تعذر قراءة config.json"
                );
            }

            const config =
                await response.json();

            const url =
                config.supabase_url ||
                config.url ||
                config.SUPABASE_URL;

            const key =
                config.supabase_key ||
                config.anon_key ||
                config.SUPABASE_ANON_KEY;

            if (!url || !key) {
                throw new Error(
                    "بيانات Supabase ناقصة"
                );
            }

            sb =
                window.supabase.createClient(
                    url,
                    key
                );

            window.studentSupabase = sb;

            return true;

        } catch (error) {
            console.error(error);

            toast(
                error.message ||
                "تعذر الاتصال بـ Supabase",
                "error"
            );

            return false;
        }
    }

    async function loadUser() {
        if (!sb) return null;

        const {
            data,
            error
        } = await sb.auth.getUser();

        if (error) {
            currentUser = null;
            return null;
        }

        currentUser =
            data.user || null;

        return currentUser;
    }

    /* =========================================================
       PROFILES
    ========================================================= */

    async function getProfiles(ids) {
        ids = [
            ...new Set(
                (ids || []).filter(Boolean)
            )
        ];

        if (!ids.length) {
            return new Map();
        }

        const {
            data,
            error
        } = await sb
            .from("profiles")
            .select(
                "id,display_name,avatar_url"
            )
            .in("id", ids);

        if (error) {
            console.error(error);
            return new Map();
        }

        return new Map(
            (data || []).map(
                row => [
                    row.id,
                    row
                ]
            )
        );
    }

    function getProfileName(
        profile,
        fallback = "مستخدم"
    ) {
        return (
            profile?.display_name?.trim() ||
            fallback
        );
    }

    function avatar(
        profile,
        fallback = "S"
    ) {
        if (profile?.avatar_url) {
            return `
                <img
                    class="student-story-avatar"
                    src="${escapeHtml(
                        profile.avatar_url
                    )}"
                    alt=""
                >
            `;
        }

        return `
            <div
                class="
                    student-story-avatar
                    student-story-avatar-fallback
                "
            >
                ${escapeHtml(
                    getProfileName(
                        profile,
                        fallback
                    ).charAt(0) || fallback
                )}
            </div>
        `;
    }

    /* =========================================================
       STYLES
    ========================================================= */

    function addStyles() {
        if ($("#studentStoriesStyles")) {
            return;
        }

        const style =
            document.createElement("style");

        style.id =
            "studentStoriesStyles";

        style.textContent = `

        .stories-container{
            display:flex!important;
            overflow-x:auto!important;
            gap:14px!important;
            padding:14px!important;
            scrollbar-width:none!important;
        }

        .stories-container::-webkit-scrollbar{
            display:none!important;
        }

        .stories-container .story{
            flex:0 0 auto!important;
            width:74px!important;
            text-align:center!important;
            cursor:pointer!important;
        }

        .stories-container .story-ring{
            width:68px!important;
            height:68px!important;
            padding:3px!important;
            border-radius:50%!important;
            background:#ed1c24!important;
        }

        .stories-container .story-ring.seen{
            background:
                linear-gradient(
                    135deg,
                    #999,
                    #777
                )!important;
        }

        .stories-container
        .story-ring.seen
        .student-story-preview{
            filter:saturate(.35);
            opacity:.85;
        }

        .stories-container .story-ring-inner{
            width:100%!important;
            height:100%!important;
            border-radius:50%!important;
            background:#fff!important;
            overflow:hidden!important;
            display:flex!important;
            align-items:center!important;
            justify-content:center!important;
        }

        .stories-container .story-name{
            display:block!important;
            margin-top:6px!important;
            font-size:11px!important;
            white-space:nowrap!important;
            overflow:hidden!important;
            text-overflow:ellipsis!important;
        }

        .stories-add-new .story-ring{
            border:2px dashed #ed1c24!important;
            background:#fff!important;
            padding:0!important;
        }

        .stories-add-new i{
            color:#ed1c24!important;
            font-size:25px!important;
        }

        .student-story-preview{
            width:100%;
            height:100%;
            object-fit:cover;
            border-radius:50%;
        }

        .student-story-placeholder{
            width:100%;
            height:100%;
            display:flex;
            align-items:center;
            justify-content:center;
            border-radius:50%;
            color:#fff;
            font-size:20px;
            font-weight:700;
        }

        #studentStoryCreateModal,
        #studentStoryViewer,
        #studentStoryDeleteConfirm,
        #studentStoryViewersModal{
            position:fixed;
            inset:0;
            z-index:100000;
            display:none;
        }

        #studentStoryCreateModal.active,
        #studentStoryViewer.active,
        #studentStoryDeleteConfirm.active,
        #studentStoryViewersModal.active{
            display:flex;
        }

        #studentStoryCreateModal{
            align-items:center;
            justify-content:center;
            padding:16px;
            background:rgba(0,0,0,.65);
        }

        .student-story-form{
            width:min(460px,100%);
            max-height:92vh;
            overflow:auto;
            background:#fff;
            border-radius:22px;
            padding:22px;
            direction:rtl;
        }

        .student-story-form h2{
            margin:0 0 18px;
            font-size:24px;
        }

        .student-story-types{
            display:grid;
            grid-template-columns:1fr 1fr;
            gap:10px;
            margin-bottom:12px;
        }

        .student-story-types button{
            border:1px solid #ddd;
            background:#f7f7f7;
            border-radius:13px;
            padding:13px;
            font-size:15px;
            cursor:pointer;
        }

        .student-story-types button.active{
            background:#0095f6;
            color:#fff;
            border-color:#0095f6;
        }

        #studentStoryText{
            width:100%;
            min-height:130px;
            resize:vertical;
            border:1px solid #ddd;
            border-radius:14px;
            padding:13px;
            font-size:16px;
            direction:rtl;
            outline:none;
            margin-bottom:10px;
        }

        #studentStoryFile{
            width:100%;
            display:none;
            margin-bottom:12px;
        }

        .student-story-field{
            margin-bottom:10px;
        }

        .student-story-field label{
            display:block;
            font-size:13px;
            color:#666;
            margin-bottom:6px;
        }

        .student-story-field select{
            width:100%;
            border:1px solid #ddd;
            border-radius:12px;
            padding:12px;
            font-size:14px;
            background:#fff;
        }

        .student-story-color-row{
            display:flex;
            align-items:center;
            justify-content:space-between;
            border:1px solid #e5e5e5;
            border-radius:12px;
            padding:10px 12px;
            margin-bottom:10px;
        }

        .student-story-color-row input{
            width:48px;
            height:38px;
            border:none;
            background:none;
            padding:0;
        }

        .student-story-switch{
            display:flex;
            justify-content:space-between;
            align-items:center;
            border:1px solid #e5e5e5;
            border-radius:12px;
            padding:12px;
            margin-bottom:10px;
        }

        .student-story-switch input{
            width:20px;
            height:20px;
        }

        .student-story-preview-box{
            display:none;
            width:100%;
            height:220px;
            background:#111;
            border-radius:14px;
            overflow:hidden;
            align-items:center;
            justify-content:center;
            margin-bottom:10px;
        }

        .student-story-preview-box img,
        .student-story-preview-box video{
            width:100%;
            height:100%;
            object-fit:contain;
        }

        .student-story-actions{
            display:grid;
            grid-template-columns:1fr 1fr;
            gap:10px;
            margin-top:12px;
        }

        .student-story-actions button{
            border:none;
            border-radius:13px;
            padding:13px;
            cursor:pointer;
        }

        #studentStoryPublish{
            background:#0095f6;
            color:#fff;
        }

        #studentStoryCancel{
            background:#eee;
        }

        #studentStoryViewer{
            align-items:center;
            justify-content:center;
            background:rgba(0,0,0,.92);
            padding:8px;
        }

        .student-story-viewer-box{
            width:min(440px,100%);
            height:min(790px,96vh);
            background:#111;
            border-radius:20px;
            overflow:hidden;
            position:relative;
            color:#fff;
        }

        .student-story-progress-list{
            position:absolute;
            top:8px;
            left:9px;
            right:9px;
            z-index:30;
            display:flex;
            gap:4px;
        }

        .student-story-progress-item{
            flex:1;
            height:3px;
            background:rgba(255,255,255,.25);
            border-radius:9px;
            overflow:hidden;
        }

        .student-story-progress-item span{
            display:block;
            width:0;
            height:100%;
            background:#fff;
        }

        .student-story-top{
            position:absolute;
            top:18px;
            left:12px;
            right:12px;
            z-index:50;
            display:flex;
            justify-content:space-between;
        }

        .student-story-top button{
            width:40px;
            height:40px;
            border:none;
            border-radius:50%;
            background:rgba(0,0,0,.35);
            color:#fff;
            font-size:22px;
            cursor:pointer;
        }

        .student-story-user{
            position:absolute;
            top:20px;
            left:60px;
            right:60px;
            z-index:50;
            display:flex;
            align-items:center;
            gap:9px;
            direction:rtl;
        }

        .student-story-user-name{
            font-size:14px;
            font-weight:700;
            text-shadow:0 1px 4px rgba(0,0,0,.55);
        }

        .student-story-user-time{
            font-size:11px;
            opacity:.85;
        }

        .student-story-avatar{
            width:36px;
            height:36px;
            border-radius:50%;
            object-fit:cover;
            background:#fff;
        }

        .student-story-avatar-fallback{
            display:flex;
            align-items:center;
            justify-content:center;
            background:#0095f6;
            color:#fff;
            font-weight:700;
        }

        .student-story-content{
            width:100%;
            height:100%;
            display:flex;
            align-items:center;
            justify-content:center;
            overflow:hidden;
        }

        .student-story-content img,
        .student-story-content video{
            width:100%;
            height:100%;
            object-fit:contain;
        }

        .student-story-text-view{
            width:100%;
            height:100%;
            display:flex;
            align-items:center;
            justify-content:center;
            text-align:center;
            padding:38px;
            font-size:30px;
            font-weight:700;
            line-height:1.5;
            word-break:break-word;
        }

        .student-story-nav{
            position:absolute;
            inset:0;
            z-index:35;
            display:grid;
            grid-template-columns:1fr 1fr;
        }

        .student-story-nav button{
            border:none;
            background:transparent;
            cursor:pointer;
        }

        .student-story-bottom{
            position:absolute;
            left:12px;
            right:12px;
            bottom:13px;
            z-index:50;
        }

        .student-story-reactions{
            display:flex;
            gap:6px;
            margin-bottom:8px;
        }

        .student-story-reaction{
            flex:1;
            border:none;
            border-radius:20px;
            padding:9px 7px;
            background:rgba(255,255,255,.17);
            color:#fff;
            cursor:pointer;
            font-size:15px;
            display:flex;
            align-items:center;
            justify-content:center;
            gap:3px;
        }

        .student-story-reaction.active{
            background:rgba(255,255,255,.34);
        }

        .student-story-reaction .reaction-count{
            font-size:11px;
        }

        .student-story-reply-row{
            display:flex;
            gap:7px;
            align-items:center;
        }

        .student-story-reply-input{
            flex:1;
            border:none;
            outline:none;
            border-radius:20px;
            padding:10px 14px;
            background:rgba(255,255,255,.14);
            color:#fff;
        }

        .student-story-reply-input::placeholder{
            color:rgba(255,255,255,.8);
        }

        .student-story-reply-send,
        .student-story-viewers-btn{
            border:none;
            cursor:pointer;
            color:#fff;
            background:transparent;
            padding:8px;
            text-shadow:0 1px 4px rgba(0,0,0,.7);
        }

        .student-story-owner-menu{
            position:absolute;
            top:65px;
            left:12px;
            width:180px;
            z-index:70;
            background:rgba(20,20,20,.96);
            border-radius:14px;
            padding:7px;
            display:none;
        }

        .student-story-owner-menu.show{
            display:block;
        }

        .student-story-owner-menu button{
            width:100%;
            border:none;
            background:transparent;
            color:#fff;
            text-align:right;
            padding:11px;
            border-radius:10px;
            cursor:pointer;
        }

        .student-story-owner-menu button:hover{
            background:rgba(255,255,255,.08);
        }

        .student-story-side{
            position:absolute;
            right:10px;
            bottom:111px;
            z-index:55;
            display:flex;
            flex-direction:column;
            gap:6px;
        }

        .student-story-side button{
            width:38px;
            height:38px;
            border:none;
            border-radius:50%;
            background:transparent;
            color:#fff;
            cursor:pointer;
            text-shadow:0 1px 5px rgba(0,0,0,.7);
        }

        #studentStoryDeleteConfirm,
        #studentStoryViewersModal{
            align-items:center;
            justify-content:center;
            background:rgba(0,0,0,.66);
            padding:16px;
        }

        .student-story-confirm-card,
        .student-story-viewers-card{
            width:min(390px,100%);
            max-height:82vh;
            overflow:auto;
            background:#fff;
            color:#222;
            border-radius:22px;
            padding:20px;
            direction:rtl;
        }

        .student-story-confirm-card{
            text-align:center;
        }

        .student-story-confirm-icon{
            font-size:38px;
        }

        .student-story-confirm-card h3{
            margin:8px 0 10px;
        }

        .student-story-confirm-card p{
            color:#666;
            line-height:1.7;
        }

        .student-story-confirm-actions{
            display:grid;
            grid-template-columns:1fr 1fr;
            gap:9px;
            margin-top:16px;
        }

        .student-story-confirm-actions button{
            border:none;
            border-radius:12px;
            padding:13px;
            cursor:pointer;
        }

        #studentStoryDeleteConfirmBtn{
            background:#dc2626;
            color:#fff;
        }

        #studentStoryDeleteCancel{
            background:#eee;
        }

        .student-story-viewers-head{
            display:flex;
            justify-content:space-between;
            align-items:center;
            margin-bottom:10px;
        }

        .student-story-viewers-head button{
            border:none;
            background:#eee;
            width:34px;
            height:34px;
            border-radius:50%;
            cursor:pointer;
        }

        .student-story-viewer-row{
            display:flex;
            align-items:center;
            gap:10px;
            padding:10px 0;
            border-bottom:1px solid #eee;
        }

        .student-story-viewer-meta{
            flex:1;
        }

        .student-story-viewer-name{
            font-weight:700;
        }

        .student-story-viewer-time{
            font-size:11px;
            color:#777;
            margin-top:3px;
        }

        .student-story-empty{
            text-align:center;
            color:#777;
            padding:25px 10px;
        }
        `;

        document.head.appendChild(style);
    }

    /* =========================================================
       UI
    ========================================================= */

    function ensureUI() {

        if (!$("#studentStoryCreateModal")) {

            const modal =
                document.createElement("div");

            modal.id =
                "studentStoryCreateModal";

            modal.innerHTML = `
                <div
                    class="student-story-form"
                >

                    <h2
                        id="studentStoryTitle"
                    >
                        إضافة ستوري
                    </h2>

                    <div
                        class="student-story-types"
                    >

                        <button
                            id="studentStoryTextMode"
                            class="active"
                            type="button"
                        >
                            نص
                        </button>

                        <button
                            id="studentStoryMediaMode"
                            type="button"
                        >
                            صورة / فيديو
                        </button>

                    </div>

                    <textarea
                        id="studentStoryText"
                        placeholder="اكتب شيئًا..."
                    ></textarea>

                    <input
                        id="studentStoryFile"
                        type="file"
                        accept="image/*,video/*"
                    >

                    <div
                        id="studentStoryPreview"
                        class="student-story-preview-box"
                    ></div>

                    <div
                        class="student-story-color-row"
                    >

                        <span>
                            لون الخلفية
                        </span>

                        <input
                            id="studentStoryBackground"
                            type="color"
                            value="#1877f2"
                        >

                    </div>

                    <div
                        class="student-story-color-row"
                    >

                        <span>
                            لون النص
                        </span>

                        <input
                            id="studentStoryTextColor"
                            type="color"
                            value="#ffffff"
                        >

                    </div>

                    <div
                        class="student-story-field"
                    >

                        <label>
                            الخصوصية
                        </label>

                        <select
                            id="studentStoryVisibility"
                        >

                            <option
                                value="public"
                            >
                                الجميع
                            </option>

                            <option
                                value="private"
                            >
                                أنا فقط
                            </option>

                        </select>

                    </div>

                    <div
                        class="student-story-switch"
                    >

                        <span>
                            السماح بالرد على الستوري
                        </span>

                        <input
                            id="studentStoryReplyEnabled"
                            type="checkbox"
                            checked
                        >

                    </div>

                    <div
                        class="student-story-actions"
                    >

                        <button
                            id="studentStoryCancel"
                            type="button"
                        >
                            إلغاء
                        </button>

                        <button
                            id="studentStoryPublish"
                            type="button"
                        >
                            نشر
                        </button>

                    </div>

                </div>
            `;

            document.body.appendChild(
                modal
            );
        }

        if (!$("#studentStoryViewer")) {

            const viewer =
                document.createElement("div");

            viewer.id =
                "studentStoryViewer";

            viewer.innerHTML = `
                <div
                    class="student-story-viewer-box"
                >

                    <div
                        id="studentStoryProgressList"
                        class="student-story-progress-list"
                    ></div>

                    <div
                        class="student-story-top"
                    >

                        <button
                            id="studentStoryClose"
                            type="button"
                        >
                            ×
                        </button>

                        <button
                            id="studentStoryMenu"
                            type="button"
                        >
                            ⋮
                        </button>

                    </div>

                    <div
                        id="studentStoryUser"
                        class="student-story-user"
                    ></div>

                    <div
                        id="studentStoryContent"
                        class="student-story-content"
                    ></div>

                    <div
                        class="student-story-nav"
                    >

                        <button
                            id="studentStoryPrev"
                            type="button"
                        ></button>

                        <button
                            id="studentStoryNext"
                            type="button"
                        ></button>

                    </div>

                    <div
                        id="studentStoryOwnerMenu"
                        class="student-story-owner-menu"
                    ></div>

                    <div
                        class="student-story-side"
                    >

                        <button
                            id="studentStoryViewsBtn"
                            type="button"
                            title="المشاهدون"
                        >

                            <i
                                class="fa-regular fa-eye"
                            ></i>

                            <span
                                id="studentStoryViewNumber"
                            >
                                0
                            </span>

                        </button>

                    </div>

                    <div
                        class="student-story-bottom"
                    >

                        <div
                            id="studentStoryReactions"
                            class="student-story-reactions"
                        ></div>

                        <div
                            id="studentStoryReplyRow"
                            class="student-story-reply-row"
                        >

                            <input
                                id="studentStoryReplyInput"
                                class="student-story-reply-input"
                                type="text"
                                maxlength="500"
                                placeholder="إرسال رد..."
                            >

                            <button
                                id="studentStoryReplySend"
                                class="student-story-reply-send"
                                type="button"
                            >
                                إرسال
                            </button>

                        </div>

                    </div>

                </div>
            `;

            document.body.appendChild(
                viewer
            );
        }

        if (!$("#studentStoryDeleteConfirm")) {

            const confirmBox =
                document.createElement(
                    "div"
                );

            confirmBox.id =
                "studentStoryDeleteConfirm";

            confirmBox.innerHTML = `
                <div
                    class="student-story-confirm-card"
                >

                    <div
                        class="student-story-confirm-icon"
                    >
                        🗑️
                    </div>

                    <h3>
                        حذف الستوري
                    </h3>

                    <p>
                        هل أنت متأكد أنك تريد حذف هذه الستوري؟
                    </p>

                    <div
                        class="student-story-confirm-actions"
                    >

                        <button
                            id="studentStoryDeleteCancel"
                            type="button"
                        >
                            إلغاء
                        </button>

                        <button
                            id="studentStoryDeleteConfirmBtn"
                            type="button"
                        >
                            حذف
                        </button>

                    </div>

                </div>
            `;

            document.body.appendChild(
                confirmBox
            );
        }

        if (!$("#studentStoryViewersModal")) {

            const modal =
                document.createElement(
                    "div"
                );

            modal.id =
                "studentStoryViewersModal";

            modal.innerHTML = `
                <div
                    class="student-story-viewers-card"
                >

                    <div
                        class="student-story-viewers-head"
                    >

                        <strong>
                            المشاهدون
                        </strong>

                        <button
                            id="studentStoryViewersClose"
                            type="button"
                        >
                            ×
                        </button>

                    </div>

                    <div
                        id="studentStoryViewersList"
                    ></div>

                </div>
            `;

            document.body.appendChild(
                modal
            );
        }
    }

    /* =========================================================
       STORIES STRIP
    ========================================================= */

    function setupStoriesContainer() {

        const container =
            $(".stories-container");

        if (!container) {
            return;
        }

        container.innerHTML =
            "";

        createAddButton(
            container
        );
    }

    function createAddButton(
        container
    ) {

        const item =
            document.createElement(
                "div"
            );

        item.className =
            "story stories-add-new";

        item.innerHTML = `
            <div
                class="story-ring"
            >

                <div
                    class="story-ring-inner"
                >

                    <i
                        class="fa-solid fa-plus"
                    ></i>

                </div>

            </div>

            <span
                class="story-name"
            >
                ستوري
            </span>
        `;

        item.addEventListener(
            "click",
            () => openCreateModal()
        );

        container.appendChild(
            item
        );
    }

    /* =========================================================
       LOAD STORIES
    ========================================================= */

    async function cleanupOwnExpiredStories() {

        if (!currentUser) {
            return;
        }

        const {
            data,
            error
        } =
            await sb
                .from("stories")
                .select(
                    "id,media_path"
                )
                .eq(
                    "user_id",
                    currentUser.id
                )
                .lte(
                    "expires_at",
                    new Date().toISOString()
                );

        if (
            error ||
            !data?.length
        ) {
            return;
        }

        for (
            const story of data
        ) {

            if (
                story.media_path
            ) {

                await removeStorageFile(
                    story.media_path
                );
            }

            await sb
                .from("stories")
                .delete()
                .eq(
                    "id",
                    story.id
                )
                .eq(
                    "user_id",
                    currentUser.id
                );
        }
    }

    async function loadStories() {

        if (!currentUser) {
            return;
        }

        await cleanupOwnExpiredStories();

        const {
            data,
            error
        } =
            await sb
                .from("stories")
                .select("*")
                .gt(
                    "expires_at",
                    new Date().toISOString()
                )
                .order(
                    "created_at",
                    {
                        ascending:
                            true
                    }
                );

        if (error) {

            console.error(
                error
            );

            toast(
                "تعذر تحميل القصص",
                "error"
            );

            return;
        }

        stories =
            data || [];

        const ids =
            stories.map(
                story =>
                    story.user_id
            );

        const profiles =
            await getProfiles(
                ids
            );

        const storyIds =
            stories.map(
                story =>
                    story.id
            );

        let viewed =
            new Set();

        if (
            storyIds.length
        ) {

            const {
                data:
                    rows
            } =
                await sb
                    .from(
                        "story_views"
                    )
                    .select(
                        "story_id"
                    )
                    .eq(
                        "user_id",
                        currentUser.id
                    )
                    .in(
                        "story_id",
                        storyIds
                    );

            viewed =
                new Set(
                    (
                        rows ||
                        []
                    ).map(
                        row =>
                            row.story_id
                    )
                );
        }

        renderStories(
            profiles,
            viewed
        );
    }

    function renderStories(
        profiles,
        viewed
    ) {

        const container =
            $(".stories-container");

        if (!container) {
            return;
        }

        container.innerHTML =
            "";

        createAddButton(
            container
        );

        const groups =
            new Map();

        for (
            const story of stories
        ) {

            if (
                !groups.has(
                    story.user_id
                )
            ) {

                groups.set(
                    story.user_id,
                    []
                );
            }

            groups
                .get(
                    story.user_id
                )
                .push(
                    story
                );
        }

        for (
            const [
                userId,
                group
            ] of groups
        ) {

            const profile =
                profiles.get(
                    userId
                );

            const latest =
                group[
                    group.length - 1
                ];

            const item =
                document.createElement(
                    "div"
                );

            item.className =
                "story";

            const allSeen =
                group.every(
                    story =>
                        viewed.has(
                            story.id
                        )
                );

            let preview = "";

            if (
                latest.type === "image" &&
                latest.media_url
            ) {

                preview = `
                    <img
                        class="student-story-preview"
                        src="${escapeHtml(
                            latest.media_url
                        )}"
                        alt=""
                    >
                `;

            } else {

                preview = `
                    <div
                        class="student-story-placeholder"
                        style="
                            background:${
                                escapeHtml(
                                    latest.background_color ||
                                    "#1877f2"
                                )
                            };
                            color:${
                                escapeHtml(
                                    latest.text_color ||
                                    "#fff"
                                )
                            };
                        "
                    >
                        ${
                            escapeHtml(
                                getProfileName(
                                    profile,
                                    userId === currentUser.id
                                        ? "أنت"
                                        : "S"
                                ).charAt(0)
                            ) || "S"
                        }
                    </div>
                `;
            }

            item.innerHTML = `
                <div
                    class="
                        story-ring
                        ${allSeen ? "seen" : ""}
                    "
                >

                    <div
                        class="story-ring-inner"
                    >
                        ${preview}
                    </div>

                </div>

                <span
                    class="story-name"
                >
                    ${escapeHtml(
                        userId === currentUser.id
                            ? "قصتي"
                            : getProfileName(
                                profile,
                                "ستوري"
                            )
                    )}
                </span>
            `;

            item.addEventListener(
                "click",
                () => {
                    openStoryGroup(
                        group,
                        0
                    );
                }
            );

            container.appendChild(
                item
            );
        }
    }

    /* =========================================================
       CREATE / EDIT
    ========================================================= */

    function setStoryMode(
        mode
    ) {

        storyMode =
            mode;

        $("#studentStoryTextMode")
            .classList
            .toggle(
                "active",
                mode === "text"
            );

        $("#studentStoryMediaMode")
            .classList
            .toggle(
                "active",
                mode === "media"
            );

        $("#studentStoryFile")
            .style.display =
            mode === "media"
                ? "block"
                : "none";
    }

    function clearPreview() {

        const box =
            $("#studentStoryPreview");

        box.innerHTML =
            "";

        box.style.display =
            "none";
    }

    function previewFile(
        file
    ) {

        const box =
            $("#studentStoryPreview");

        if (!file) {

            clearPreview();

            return;
        }

        const url =
            URL.createObjectURL(
                file
            );

        box.innerHTML =
            "";

        if (
            file.type.startsWith(
                "image/"
            )
        ) {

            const img =
                document.createElement(
                    "img"
                );

            img.src =
                url;

            box.appendChild(
                img
            );

        } else if (
            file.type.startsWith(
                "video/"
            )
        ) {

            const video =
                document.createElement(
                    "video"
                );

            video.src =
                url;

            video.controls =
                true;

            video.playsInline =
                true;

            box.appendChild(
                video
            );

        } else {

            toast(
                "اختر صورة أو فيديو فقط",
                "error"
            );

            clearPreview();

            return;
        }

        box.style.display =
            "flex";
    }

    function openCreateModal(
        story = null
    ) {

        if (!currentUser) {

            toast(
                "يجب تسجيل الدخول أولًا",
                "error"
            );

            return;
        }

        editStory =
            story;

        $("#studentStoryTitle")
            .textContent =
            story
                ? "تعديل الستوري"
                : "إضافة ستوري";

        $("#studentStoryText")
            .value =
            story?.content || "";

        $("#studentStoryBackground")
            .value =
            story?.background_color ||
            "#1877f2";

        $("#studentStoryTextColor")
            .value =
            story?.text_color ||
            "#ffffff";

        $("#studentStoryVisibility")
            .value =
            story?.visibility ||
            "public";

        $("#studentStoryReplyEnabled")
            .checked =
            story?.reply_enabled ??
            true;

        $("#studentStoryFile")
            .value =
            "";

        clearPreview();

        setStoryMode(
            story &&
            (
                story.type === "image" ||
                story.type === "video"
            )
                ? "media"
                : "text"
        );

        $("#studentStoryCreateModal")
            .classList
            .add(
                "active"
            );
    }

    function closeCreateModal() {

        $("#studentStoryCreateModal")
            .classList
            .remove(
                "active"
            );

        editStory =
            null;
    }

    async function uploadStorageFile(
        file
    ) {

        const extension =
            file.name
                .split(".")
                .pop()
                .toLowerCase();

        const path =
            `${currentUser.id}/${Date.now()}_${Math.random()
                .toString(36)
                .slice(2,10)}.${extension}`;

        const {
            error
        } =
            await sb.storage
                .from("stories")
                .upload(
                    path,
                    file,
                    {
                        cacheControl:
                            "3600",
                        contentType:
                            file.type,
                        upsert:
                            false
                    }
                );

        if (error) {
            throw error;
        }

        const {
            data
        } =
            sb.storage
                .from("stories")
                .getPublicUrl(
                    path
                );

        return {
            path,
            url:
                data.publicUrl
        };
    }

    async function removeStorageFile(
        path
    ) {

        if (!path) {
            return;
        }

        const {
            error
        } =
            await sb.storage
                .from("stories")
                .remove([
                    path
                ]);

        if (error) {
            console.warn(
                "Storage cleanup:",
                error
            );
        }
    }

    async function saveStory() {

        if (!currentUser) {
            toast(
                "يجب تسجيل الدخول أولًا",
                "error"
            );
            return;
        }

        const button =
            $("#studentStoryPublish");

        let newPath =
            null;

        try {

            button.disabled =
                true;

            button.textContent =
                "جاري الحفظ...";

            const text =
                $("#studentStoryText")
                    .value
                    .trim();

            const background =
                $("#studentStoryBackground")
                    .value;

            const textColor =
                $("#studentStoryTextColor")
                    .value;

            const visibility =
                $("#studentStoryVisibility")
                    .value;

            const replyEnabled =
                $("#studentStoryReplyEnabled")
                    .checked;

            const file =
                $("#studentStoryFile")
                    .files[0] ||
                null;

            let type =
                "text";

            let mediaUrl =
                editStory
                    ? editStory.media_url
                    : null;

            let mediaPath =
                editStory
                    ? editStory.media_path
                    : null;

            if (
                storyMode === "text"
            ) {

                if (!text) {
                    toast(
                        "اكتب نص الستوري أولًا",
                        "error"
                    );
                    return;
                }

                type =
                    "text";

                mediaUrl =
                    null;

                mediaPath =
                    null;

            } else {

                if (
                    !file &&
                    !editStory?.media_url
                ) {

                    toast(
                        "اختر صورة أو فيديو أولًا",
                        "error"
                    );

                    return;
                }

                if (file) {

                    if (
                        !file.type.startsWith(
                            "image/"
                        ) &&
                        !file.type.startsWith(
                            "video/"
                        )
                    ) {

                        toast(
                            "نوع الملف غير مدعوم",
                            "error"
                        );

                        return;
                    }

                    const max =
                        50 *
                        1024 *
                        1024;

                    if (
                        file.size >
                        max
                    ) {

                        toast(
                            "حجم الملف يجب ألا يتجاوز 50 MB",
                            "error"
                        );

                        return;
                    }

                    type =
                        file.type.startsWith(
                            "video/"
                        )
                            ? "video"
                            : "image";

                    const uploaded =
                        await uploadStorageFile(
                            file
                        );

                    newPath =
                        uploaded.path;

                    mediaPath =
                        uploaded.path;

                    mediaUrl =
                        uploaded.url;

                } else {

                    type =
                        editStory.type;
                }
            }

            if (
                editStory
            ) {

                const {
                    error
                } =
                    await sb
                        .from(
                            "stories"
                        )
                        .update({
                            type,
                            content:
                                text,
                            media_url:
                                mediaUrl,
                            media_path:
                                mediaPath,
                            background_color:
                                background,
                            text_color:
                                textColor,
                            visibility,
                            reply_enabled:
                                replyEnabled
                        })
                        .eq(
                            "id",
                            editStory.id
                        )
                        .eq(
                            "user_id",
                            currentUser.id
                        );

                if (error) {

                    if (
                        newPath
                    ) {

                        await removeStorageFile(
                            newPath
                        );
                    }

                    throw error;
                }

                if (
                    newPath &&
                    editStory.media_path &&
                    editStory.media_path !==
                        newPath
                ) {

                    await removeStorageFile(
                        editStory.media_path
                    );
                }

                toast(
                    "تم تعديل الستوري بنجاح"
                );

            } else {

                const now =
                    new Date();

                const expires =
                    new Date(
                        now.getTime() +
                        24 *
                        60 *
                        60 *
                        1000
                    );

                const {
                    error
                } =
                    await sb
                        .from(
                            "stories"
                        )
                        .insert({
                            user_id:
                                currentUser.id,
                            type,
                            content:
                                text,
                            media_url:
                                mediaUrl,
                            media_path:
                                mediaPath,
                            background_color:
                                background,
                            text_color:
                                textColor,
                            visibility,
                            reply_enabled:
                                replyEnabled,
                            created_at:
                                now.toISOString(),
                            expires_at:
                                expires.toISOString()
                        });

                if (error) {

                    if (
                        newPath
                    ) {

                        await removeStorageFile(
                            newPath
                        );
                    }

                    throw error;
                }

                toast(
                    "تم نشر الستوري بنجاح"
                );
            }

            closeCreateModal();

            await loadStories();

        } catch (error) {

            console.error(
                "SAVE STORY:",
                error
            );

            toast(
                error.message ||
                "حدث خطأ أثناء حفظ الستوري",
                "error"
            );

        } finally {

            button.disabled =
                false;

            button.textContent =
                "نشر";
        }
    }

    /* =========================================================
       VIEWER
    ========================================================= */

    async function openStoryGroup(
        group,
        index = 0
    ) {

        if (
            !group?.length
        ) {
            return;
        }

        currentGroup =
            group;

        currentIndex =
            Math.max(
                0,
                Math.min(
                    index,
                    group.length - 1
                )
            );

        $("#studentStoryViewer")
            .classList
            .add(
                "active"
            );

        await renderCurrentStory();
    }

    async function renderCurrentStory() {

        clearTimers();

        currentStory =
            currentGroup[
                currentIndex
            ];

        if (!currentStory) {
            closeViewer();
            return;
        }

        renderProgress();

        const profileMap =
            await getProfiles([
                currentStory.user_id
            ]);

        const profile =
            profileMap.get(
                currentStory.user_id
            );

        $("#studentStoryUser")
            .innerHTML = `
                ${avatar(profile,"S")}

                <div>

                    <div
                        class="student-story-user-name"
                    >
                        ${escapeHtml(
                            currentStory.user_id ===
                                currentUser.id
                                ? "قصتي"
                                : getProfileName(
                                    profile,
                                    "مستخدم"
                                )
                        )}
                    </div>

                    <div
                        class="student-story-user-time"
                    >
                        ${escapeHtml(
                            timeAgo(
                                currentStory.created_at
                            )
                        )}
                    </div>

                </div>
            `;

        renderContent();

        renderOwnerMenu();

        $("#studentStoryReplyRow")
            .style.display =
                currentStory.reply_enabled &&
                currentStory.user_id !==
                    currentUser.id
                    ? "flex"
                    : "none";

        await registerView(
            currentStory.id
        );

        await updateViewCount();

        await loadReactionCounts();

        startTimer();
    }

    function renderProgress() {

        const box =
            $("#studentStoryProgressList");

        box.innerHTML =
            "";

        currentGroup.forEach(
            (_, index) => {

                const item =
                    document.createElement(
                        "div"
                    );

                item.className =
                    "student-story-progress-item";

                const span =
                    document.createElement(
                        "span"
                    );

                if (
                    index <
                    currentIndex
                ) {

                    span.style.width =
                        "100%";
                }

                item.appendChild(
                    span
                );

                box.appendChild(
                    item
                );
            }
        );
    }

    function updateProgress(
        percent
    ) {

        const spans =
            $$(".student-story-progress-item span");

        if (
            spans[currentIndex]
        ) {

            spans[
                currentIndex
            ].style.width =
                `${Math.max(
                    0,
                    Math.min(
                        100,
                        percent
                    )
                )}%`;
        }
    }

    function renderContent() {

        const box =
            $("#studentStoryContent");

        box.innerHTML =
            "";

        if (
            currentStory.type ===
            "text"
        ) {

            box.style.background =
                currentStory.background_color ||
                "#1877f2";

            const text =
                document.createElement(
                    "div"
                );

            text.className =
                "student-story-text-view";

            text.style.color =
                currentStory.text_color ||
                "#fff";

            text.textContent =
                currentStory.content ||
                "";

            box.appendChild(
                text
            );

            return;
        }

        box.style.background =
            "#000";

        if (
            currentStory.type ===
            "image"
        ) {

            const img =
                document.createElement(
                    "img"
                );

            img.src =
                currentStory.media_url;

            img.alt =
                "Story";

            box.appendChild(
                img
            );

            return;
        }

        if (
            currentStory.type ===
            "video"
        ) {

            const video =
                document.createElement(
                    "video"
                );

            video.src =
                currentStory.media_url;

            video.controls =
                true;

            video.autoplay =
                true;

            video.playsInline =
                true;

            box.appendChild(
                video
            );

            video.addEventListener(
                "loadedmetadata",
                () => {

                    startVideoTimer(
                        video.duration ||
                        5
                    );
                },
                {
                    once:
                        true
                }
            );
        }
    }

    function startTimer() {

        if (
            currentStory.type ===
            "video"
        ) {
            return;
        }

        let elapsed =
            0;

        const duration =
            5000;

        storyTimer =
            setInterval(
                () => {

                    elapsed +=
                        100;

                    updateProgress(
                        elapsed /
                        duration *
                        100
                    );

                    if (
                        elapsed >=
                        duration
                    ) {

                        clearTimers();

                        nextStory();
                    }

                },
                100
            );
    }

    function startVideoTimer(
        seconds
    ) {

        clearTimers();

        const duration =
            Math.max(
                3000,
                seconds * 1000
            );

        const started =
            Date.now();

        storyTimer =
            setInterval(
                () => {

                    const elapsed =
                        Date.now() -
                        started;

                    updateProgress(
                        elapsed /
                        duration *
                        100
                    );

                    if (
                        elapsed >=
                        duration
                    ) {

                        clearTimers();

                        nextStory();
                    }

                },
                100
            );
    }

    function clearTimers() {

        if (
            storyTimer
        ) {

            clearInterval(
                storyTimer
            );

            storyTimer =
                null;
        }

        if (
            videoTimer
        ) {

            clearTimeout(
                videoTimer
            );

            videoTimer =
                null;
        }
    }

    async function nextStory() {

        if (
            currentIndex <
            currentGroup.length -
                1
        ) {

            currentIndex +=
                1;

            await renderCurrentStory();

        } else {

            closeViewer();
        }
    }

    async function previousStory() {

        if (
            currentIndex >
            0
        ) {

            currentIndex -=
                1;

            await renderCurrentStory();

        } else {

            updateProgress(
                0
            );
        }
    }

    function closeViewer() {

        clearTimers();

        $("#studentStoryViewer")
            .classList
            .remove(
                "active"
            );

        $("#studentStoryContent")
            .innerHTML =
            "";

        currentStory =
            null;

        currentGroup =
            [];

        currentIndex =
            0;
    }

    /* =========================================================
       MENU
    ========================================================= */

    function renderOwnerMenu() {

        const menu =
            $("#studentStoryOwnerMenu");

        if (
            currentStory.user_id ===
            currentUser.id
        ) {

            menu.innerHTML = `

                <button
                    id="storyMenuEdit"
                    type="button"
                >
                    تعديل
                </button>

                <button
                    id="storyMenuDelete"
                    type="button"
                >
                    حذف
                </button>
            `;

        } else {

            menu.innerHTML = `

                <button
                    id="storyMenuMute"
                    type="button"
                >
                    كتم قصص هذا المستخدم
                </button>
            `;
        }

        menu.classList.remove(
            "show"
        );

        $("#storyMenuEdit")?.addEventListener(
            "click",
            () => {

                const story =
                    currentStory;

                menu.classList.remove(
                    "show"
                );

                closeViewer();

                openCreateModal(
                    story
                );
            }
        );

        $("#storyMenuDelete")?.addEventListener(
            "click",
            () => {

                menu.classList.remove(
                    "show"
                );

                openDeleteConfirm();
            }
        );

        $("#storyMenuMute")?.addEventListener(
            "click",
            toggleMute
        );
    }

    /* =========================================================
       VIEWS
    ========================================================= */

    async function registerView(
        storyId
    ) {

        if (
            !currentUser
        ) {
            return;
        }

        const {
            data
        } =
            await sb
                .from(
                    "story_views"
                )
                .select(
                    "id"
                )
                .eq(
                    "story_id",
                    storyId
                )
                .eq(
                    "user_id",
                    currentUser.id
                )
                .maybeSingle();

        if (
            data
        ) {
            return;
        }

        await sb
            .from(
                "story_views"
            )
            .insert({
                story_id:
                    storyId,
                user_id:
                    currentUser.id
            });
    }

    async function updateViewCount() {

        const {
            count
        } =
            await sb
                .from(
                    "story_views"
                )
                .select(
                    "*",
                    {
                        count:
                            "exact",
                        head:
                            true
                    }
                )
                .eq(
                    "story_id",
                    currentStory.id
                );

        $("#studentStoryViewNumber")
            .textContent =
            count ||
            0;
    }

    async function openViewers() {

        if (
            !currentStory ||
            currentStory.user_id !==
                currentUser.id
        ) {
            return;
        }

        const {
            data,
            error
        } =
            await sb
                .from(
                    "story_views"
                )
                .select(
                    "user_id,viewed_at"
                )
                .eq(
                    "story_id",
                    currentStory.id
                )
                .order(
                    "viewed_at",
                    {
                        ascending:
                            false
                    }
                );

        if (
            error
        ) {

            toast(
                "تعذر تحميل المشاهدين",
                "error"
            );

            return;
        }

        const profiles =
            await getProfiles(
                (
                    data ||
                    []
                ).map(
                    row =>
                        row.user_id
                )
            );

        const list =
            $("#studentStoryViewersList");

        if (
            !data?.length
        ) {

            list.innerHTML = `
                <div
                    class="student-story-empty"
                >
                    لا توجد مشاهدات بعد
                </div>
            `;

        } else {

            list.innerHTML =
                data.map(
                    row => {

                        const profile =
                            profiles.get(
                                row.user_id
                            );

                        return `
                            <div
                                class="
                                    student-story-viewer-row
                                "
                            >

                                ${avatar(
                                    profile,
                                    "U"
                                )}

                                <div
                                    class="
                                        student-story-viewer-meta
                                    "
                                >

                                    <div
                                        class="
                                            student-story-viewer-name
                                        "
                                    >
                                        ${escapeHtml(
                                            getProfileName(
                                                profile,
                                                "مستخدم"
                                            )
                                        )}
                                    </div>

                                    <div
                                        class="
                                            student-story-viewer-time
                                        "
                                    >
                                        ${escapeHtml(
                                            timeAgo(
                                                row.viewed_at
                                            )
                                        )}
                                    </div>

                                </div>

                            </div>
                        `;
                    }
                ).join("");
        }

        $("#studentStoryViewersModal")
            .classList
            .add(
                "active"
            );
    }

    /* =========================================================
       REACTIONS
    ========================================================= */

    async function loadReactionCounts() {

        const {
            data,
            error
        } =
            await sb
                .from(
                    "story_reactions"
                )
                .select(
                    "reaction,user_id"
                )
                .eq(
                    "story_id",
                    currentStory.id
                );

        if (
            error
        ) {
            return;
        }

        const counts = {
            "❤️": 0,
            "😂": 0,
            "🔥": 0,
            "👏": 0
        };

        let myReaction =
            null;

        for (
            const row of
            data || []
        ) {

            if (
                counts[
                    row.reaction
                ] !==
                    undefined
            ) {

                counts[
                    row.reaction
                ] +=
                    1;
            }

            if (
                row.user_id ===
                currentUser.id
            ) {

                myReaction =
                    row.reaction;
            }
        }

        const box =
            $("#studentStoryReactions");

        box.innerHTML =
            REACTIONS.map(
                reaction => `
                    <button
                        type="button"
                        class="
                            student-story-reaction
                            ${
                                reaction ===
                                myReaction
                                    ? "active"
                                    : ""
                            }
                        "
                        data-reaction="${reaction}"
                    >
                        ${reaction}

                        <span
                            class="reaction-count"
                        >
                            ${
                                counts[
                                    reaction
                                ] || 0
                            }
                        </span>

                    </button>
                `
            ).join("");

        $$(".student-story-reaction")
            .forEach(
                button => {

                    button.addEventListener(
                        "click",
                        () => {

                            reactToStory(
                                button.dataset
                                    .reaction
                            );
                        }
                    );
                }
            );
    }

    async function reactToStory(
        reaction
    ) {

        if (
            !currentStory ||
            !currentUser
        ) {
            return;
        }

        const {
            data:
                existing
        } =
            await sb
                .from(
                    "story_reactions"
                )
                .select(
                    "id,reaction"
                )
                .eq(
                    "story_id",
                    currentStory.id
                )
                .eq(
                    "user_id",
                    currentUser.id
                )
                .maybeSingle();

        try {

            if (
                existing &&
                existing.reaction ===
                    reaction
            ) {

                const {
                    error
                } =
                    await sb
                        .from(
                            "story_reactions"
                        )
                        .delete()
                        .eq(
                            "id",
                            existing.id
                        );

                if (
                    error
                ) {
                    throw error;
                }

                toast(
                    "تم إلغاء التفاعل"
                );

            } else {

                const {
                    error
                } =
                    await sb
                        .from(
                            "story_reactions"
                        )
                        .upsert(
                            {
                                story_id:
                                    currentStory.id,
                                user_id:
                                    currentUser.id,
                                reaction
                            },
                            {
                                onConflict:
                                    "story_id,user_id"
                            }
                        );

                if (
                    error
                ) {
                    throw error;
                }

                toast(
                    "تم تسجيل التفاعل"
                );
            }

            await loadReactionCounts();

        } catch (error) {

            console.error(
                error
            );

            toast(
                error.message ||
                "تعذر تسجيل التفاعل",
                "error"
            );
        }
    }

    /* =========================================================
       REPLY
    ========================================================= */

    async function sendReply() {

        if (
            !currentStory ||
            !currentUser
        ) {
            return;
        }

        const input =
            $("#studentStoryReplyInput");

        const message =
            input.value.trim();

        if (
            !message
        ) {
            return;
        }

        if (
            !currentStory.reply_enabled
        ) {

            toast(
                "الردود مغلقة",
                "error"
            );

            return;
        }

        const {
            error
        } =
            await sb
                .from(
                    "story_replies"
                )
                .insert({
                    story_id:
                        currentStory.id,
                    user_id:
                        currentUser.id,
                    message
                });

        if (
            error
        ) {

            toast(
                error.message ||
                "تعذر إرسال الرد",
                "error"
            );

            return;
        }

        input.value =
            "";

        toast(
            "تم إرسال الرد"
        );
    }

    /* =========================================================
       MUTE
    ========================================================= */

    async function toggleMute() {

        if (
            !currentStory ||
            currentStory.user_id ===
                currentUser.id
        ) {
            return;
        }

        const {
            data:
                existing
        } =
            await sb
                .from(
                    "story_mutes"
                )
                .select(
                    "id"
                )
                .eq(
                    "user_id",
                    currentUser.id
                )
                .eq(
                    "muted_user_id",
                    currentStory.user_id
                )
                .maybeSingle();

        if (
            existing
        ) {

            await sb
                .from(
                    "story_mutes"
                )
                .delete()
                .eq(
                    "id",
                    existing.id
                );

            toast(
                "تم إلغاء الكتم"
            );

        } else {

            await sb
                .from(
                    "story_mutes"
                )
                .insert({
                    user_id:
                        currentUser.id,

                    muted_user_id:
                        currentStory.user_id
                });

            toast(
                "تم كتم قصص هذا المستخدم"
            );
        }

        $("#studentStoryOwnerMenu")
            .classList
            .remove(
                "show"
            );

        closeViewer();

        await loadStories();
    }

    /* =========================================================
       DELETE
    ========================================================= */

    function openDeleteConfirm() {

        if (
            !currentStory ||
            currentStory.user_id !==
                currentUser.id
        ) {
            return;
        }

        $("#studentStoryDeleteConfirm")
            .classList
            .add(
                "active"
            );
    }

    function closeDeleteConfirm() {

        $("#studentStoryDeleteConfirm")
            .classList
            .remove(
                "active"
            );
    }

    async function deleteCurrentStory() {

        if (
            !currentStory ||
            currentStory.user_id !==
                currentUser.id
        ) {
            return;
        }

        try {

            if (
                currentStory.media_path
            ) {

                await removeStorageFile(
                    currentStory.media_path
                );
            }

            const {
                error
            } =
                await sb
                    .from(
                        "stories"
                    )
                    .delete()
                    .eq(
                        "id",
                        currentStory.id
                    )
                    .eq(
                        "user_id",
                        currentUser.id
                    );

            if (
                error
            ) {
                throw error;
            }

            closeDeleteConfirm();

            closeViewer();

            toast(
                "تم حذف الستوري"
            );

            await loadStories();

        } catch (error) {

            console.error(
                error
            );

            toast(
                error.message ||
                "تعذر حذف الستوري",
                "error"
            );
        }
    }

    /* =========================================================
       EVENTS
    ========================================================= */

    function setupEvents() {

        $("#studentStoryTextMode")
            .addEventListener(
                "click",
                () => {

                    setStoryMode(
                        "text"
                    );
                }
            );

        $("#studentStoryMediaMode")
            .addEventListener(
                "click",
                () => {

                    setStoryMode(
                        "media"
                    );

                    const input =
                        $("#studentStoryFile");

                    input.value =
                        "";

                    input.click();
                }
            );

        $("#studentStoryFile")
            .addEventListener(
                "change",
                event => {

                    previewFile(
                        event.target.files[0]
                    );
                }
            );

        $("#studentStoryCancel")
            .addEventListener(
                "click",
                closeCreateModal
            );

        $("#studentStoryPublish")
            .addEventListener(
                "click",
                saveStory
            );

        $("#studentStoryClose")
            .addEventListener(
                "click",
                closeViewer
            );

        $("#studentStoryPrev")
            .addEventListener(
                "click",
                previousStory
            );

        $("#studentStoryNext")
            .addEventListener(
                "click",
                nextStory
            );

        $("#studentStoryMenu")
            .addEventListener(
                "click",
                () => {

                    $("#studentStoryOwnerMenu")
                        .classList
                        .toggle(
                            "show"
                        );
                }
            );

        $("#studentStoryDeleteCancel")
            .addEventListener(
                "click",
                closeDeleteConfirm
            );

        $("#studentStoryDeleteConfirmBtn")
            .addEventListener(
                "click",
                deleteCurrentStory
            );

        $("#studentStoryViewsBtn")
            .addEventListener(
                "click",
                openViewers
            );

        $("#studentStoryViewersClose")
            .addEventListener(
                "click",
                () => {

                    $("#studentStoryViewersModal")
                        .classList
                        .remove(
                            "active"
                        );
                }
            );

        $("#studentStoryReplySend")
            .addEventListener(
                "click",
                sendReply
            );

        $("#studentStoryReplyInput")
            .addEventListener(
                "keydown",
                event => {

                    if (
                        event.key ===
                        "Enter"
                    ) {

                        event.preventDefault();

                        sendReply();
                    }
                }
            );

        $("#studentStoryViewer")
            .addEventListener(
                "click",
                event => {

                    if (
                        event.target.id ===
                        "studentStoryViewer"
                    ) {

                        closeViewer();
                    }
                }
            );

        $("#studentStoryDeleteConfirm")
            .addEventListener(
                "click",
                event => {

                    if (
                        event.target.id ===
                        "studentStoryDeleteConfirm"
                    ) {

                        closeDeleteConfirm();
                    }
                }
            );

        $("#studentStoryViewersModal")
            .addEventListener(
                "click",
                event => {

                    if (
                        event.target.id ===
                        "studentStoryViewersModal"
                    ) {

                        $("#studentStoryViewersModal")
                            .classList
                            .remove(
                                "active"
                            );
                    }
                }
            );
    }

    /* =========================================================
       AUTH
    ========================================================= */

    function watchAuth() {

        if (
            !sb
        ) {
            return;
        }

        sb.auth.onAuthStateChange(
            async (
                _event,
                session
            ) => {

                currentUser =
                    session?.user ||
                    null;

                if (
                    currentUser
                ) {

                    await loadStories();
                }
            }
        );
    }

    /* =========================================================
       PUBLIC API
    ========================================================= */

    window.openStudentStoryCreator =
        function() {

            openCreateModal();
        };

    window.StudentOpenStoryCreator =
        window.openStudentStoryCreator;


    /* =========================================================
       INIT
    ========================================================= */

    async function init() {

        addStyles();

        ensureUI();

        /*
         * Render the permanent Add Story entry immediately.
         * It must not depend on Supabase/session initialization, otherwise
         * a slow or failed connection leaves the stories strip empty.
         */
        setupStoriesContainer();
        document.body.classList.add("student-stories-ready");

        const ready =
            await initSupabase();

        if (
            !ready
        ) {
            return;
        }

        await loadUser();

        setupEvents();

        watchAuth();

        if (
            currentUser
        ) {

            await loadStories();
        } else {
            document.body.classList.add("student-stories-ready");
        }
    }

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            init
        );

    } else {

        init();
    }

})();


/* ===== MERGED MODULE: feed.js ===== */
/* =========================================================
   Student - Feed System
   Text Posts + Images ONLY
   Lightweight text and image feed
========================================================= */

(function () {

    "use strict";


    if (
        window.__studentFeedLoaded
    ) {
        return;
    }


    window.__studentFeedLoaded =
        true;


    let feedContainer = null;
    let loading = false;
    let started = false;


    /* =====================================================
       Supabase
    ===================================================== */

    function getSupabase() {

        if (
            typeof supabaseClient !==
                "undefined" &&
            supabaseClient
        ) {

            return supabaseClient;
        }

        return null;
    }


    async function waitForSupabase(
        maxAttempts = 50
    ) {

        for (
            let i = 0;
            i < maxAttempts;
            i++
        ) {

            if (
                getSupabase()
            ) {

                return getSupabase();
            }

            await new Promise(
                function(resolve) {

                    setTimeout(
                        resolve,
                        200
                    );

                }
            );
        }

        return null;
    }


    /* =====================================================
       حماية HTML
    ===================================================== */

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


    /* =====================================================
       CSS
    ===================================================== */

    function injectStyles() {

        if (
            document.getElementById(
                "student-feed-style"
            )
        ) {

            return;
        }


        const style =
            document.createElement(
                "style"
            );


        style.id =
            "student-feed-style";


        style.textContent = `

            .student-feed-container {
                width:100%;
                max-width:680px;
                margin:18px auto 0;
                padding:0 10px 100px;
                box-sizing:border-box;
            }


            .student-feed-loading {
                text-align:center;
                padding:35px 15px;
                color:#888;
            }


            .student-feed-spinner {
                width:32px;
                height:32px;
                border:3px solid #e5e7eb;
                border-top-color:#0095f6;
                border-radius:50%;
                margin:0 auto 12px;
                animation:
                    studentFeedSpin
                    .7s linear infinite;
            }


            @keyframes studentFeedSpin {

                to {
                    transform:rotate(360deg);
                }

            }


            .student-feed-empty {
                text-align:center;
                padding:45px 15px;
                color:#888;
            }


            .student-feed-empty-icon {
                width:75px;
                height:75px;
                margin:0 auto 15px;
                border-radius:22px;
                background:#eaf5ff;
                color:#0095f6;
                display:flex;
                align-items:center;
                justify-content:center;
                font-size:30px;
            }


            .student-feed-error {
                text-align:center;
                padding:30px 15px;
                color:#d93025;
                line-height:1.8;
            }


            .student-feed-refresh {
                width:100%;
                border:none;
                background:#f7f8fa;
                color:#0095f6;
                padding:11px;
                border-radius:12px;
                cursor:pointer;
                font-size:13px;
                margin-bottom:10px;
            }


            .student-feed-card {
                background:#fff;
                border:1px solid #eee;
                border-radius:18px;
                margin:12px 0;
                overflow:hidden;
                box-shadow:
                    0 3px 15px
                    rgba(0,0,0,.04);
            }


            .student-feed-header {
                display:flex;
                align-items:center;
                gap:10px;
                padding:13px;
            }


            .student-feed-avatar {
                width:42px;
                height:42px;
                border-radius:50%;
                object-fit:cover;
                background:#eaf5ff;
                flex-shrink:0;
            }


            .student-feed-avatar-placeholder {
                width:42px;
                height:42px;
                border-radius:50%;
                background:#eaf5ff;
                color:#0095f6;
                display:flex;
                align-items:center;
                justify-content:center;
                flex-shrink:0;
            }


            .student-feed-user {
                flex:1;
                min-width:0;
            }


            .student-feed-name {
                font-size:14px;
                font-weight:800;
                color:#222;
                overflow:hidden;
                text-overflow:ellipsis;
                white-space:nowrap;
            }


            .student-feed-username {
                margin-top:3px;
                font-size:11px;
                color:#0095f6;
                direction:ltr;
                text-align:right;
            }


            .student-feed-time {
                font-size:10px;
                color:#999;
                white-space:nowrap;
            }


            .student-feed-text {
                padding:
                    0 14px 15px;
                color:#333;
                line-height:1.9;
                white-space:pre-wrap;
                word-break:break-word;
                font-size:15px;
            }


            .student-feed-image {
                width:100%;
                max-height:680px;
                display:block;
                object-fit:cover;
                background:#f3f4f6;
            }


            .student-feed-caption {
                padding:13px 14px;
                color:#444;
                line-height:1.8;
                font-size:14px;
                white-space:pre-wrap;
                word-break:break-word;
            }


            .student-feed-actions {
                display:flex;
                align-items:center;
                gap:4px;
                padding:9px 10px;
                border-top:1px solid #f0f0f0;
            }


            .student-feed-action {
                width:42px;
                height:42px;
                border:none;
                border-radius:50%;
                background:transparent;
                color:#444;
                cursor:pointer;
                font-size:17px;
                display:flex;
                align-items:center;
                justify-content:center;
            }


            .student-feed-action:hover {
                background:#f3f5f7;
            }


            .student-feed-action.save {
                margin-right:auto;
            }


            .student-feed-type {
                padding:5px 8px;
                border-radius:8px;
                background:#f1f3f5;
                color:#777;
                font-size:10px;
            }


            @media (max-width:680px) {

                .student-feed-container {
                    padding-left:5px;
                    padding-right:5px;
                }


                .student-feed-card {
                    border-radius:14px;
                }

            }

        `;


        document.head.appendChild(
            style
        );
    }


    /* =====================================================
       إنشاء مكان Feed
    ===================================================== */

    function createFeedContainer() {

        if (
            feedContainer &&
            document.body.contains(
                feedContainer
            )
        ) {

            return feedContainer;
        }


        const host =
            document.querySelector(
                ".main-content"
            ) ||
            document.querySelector(
                "#main-screen"
            ) ||
            document.querySelector(
                "main"
            );


        if (!host) {

            console.warn(
                "Feed host not found."
            );

            return null;
        }


        feedContainer =
            document.createElement(
                "div"
            );


        feedContainer.id =
            "student-feed-container";


        feedContainer.className =
            "student-feed-container";


        host.appendChild(
            feedContainer
        );


        return feedContainer;
    }


    /* =====================================================
       تحميل المنشورات فقط
       مهم:
       لا نحمل جدول reels هنا
    ===================================================== */

    async function loadPosts(
        client
    ) {

        const {
            data,
            error
        } =
            await client
                .from("posts")
                .select(`
                    id,
                    user_id,
                    post_type,
                    content,
                    media_url,
                    created_at,
                    updated_at
                `)

                .in(
                    "post_type",
                    [
                        "text",
                        "image"
                    ]
                )

                .order(
                    "created_at",
                    {
                        ascending:false
                    }
                )

                .limit(
                    50
                );


        if (error) {
            throw error;
        }


        return data || [];
    }


    /* =====================================================
       Profiles
    ===================================================== */

    async function loadProfiles(
        client,
        ids
    ) {

        if (
            !ids.length
        ) {

            return {};
        }


        const {
            data,
            error
        } =
            await client
                .from("profiles")
                .select(`
                    id,
                    full_name,
                    username,
                    avatar_url
                `)
                .in(
                    "id",
                    ids
                );


        if (error) {

            console.error(
                "Feed profiles error:",
                error
            );

            return {};
        }


        const result = {};


        (data || [])
            .forEach(
                function(profile) {

                    result[
                        profile.id
                    ] =
                        profile;
                }
            );


        return result;
    }


    /* =====================================================
       Avatar
    ===================================================== */

    function avatarHTML(
        profile
    ) {

        if (
            profile?.avatar_url
        ) {

            return `

                <img
                    class="
                        student-feed-avatar
                    "
                    src="${escapeHTML(
                        profile.avatar_url
                    )}"
                    alt=""
                    loading="lazy"
                >

            `;
        }


        return `

            <div class="
                student-feed-avatar-placeholder
            ">

                <i class="
                    fa-solid
                    fa-user
                "></i>

            </div>

        `;
    }


    /* =====================================================
       التاريخ
    ===================================================== */

    function formatDate(
        value
    ) {

        if (!value) {
            return "";
        }


        const date =
            new Date(
                value
            );


        if (
            isNaN(
                date.getTime()
            )
        ) {

            return "";
        }


        return date.toLocaleString(
            "ar-IQ",
            {
                dateStyle:
                    "medium",

                timeStyle:
                    "short"
            }
        );
    }


    /* =====================================================
       بطاقة المنشور
    ===================================================== */

    function renderCard(
        post,
        profiles
    ) {

        const profile =
            profiles[
                post.user_id
            ] || {};


        const name =
            profile.full_name ||
            profile.username ||
            "مستخدم";


        const username =
            profile.username ||
            "username";


        let contentHTML =
            "";


        let typeLabel =
            "نص";


        if (
            post.post_type ===
            "image"
        ) {

            typeLabel =
                "صورة";


            contentHTML = `

                ${
                    post.media_url
                        ? `

                            <img
                                class="
                                    student-feed-image
                                "
                                src="${escapeHTML(
                                    post.media_url
                                )}"
                                alt=""
                                loading="lazy"
                            >

                        `
                        : ""
                }


                ${
                    post.content
                        ? `

                            <div class="
                                student-feed-caption
                            ">

                                ${escapeHTML(
                                    post.content
                                )}

                            </div>

                        `
                        : ""
                }

            `;

        } else {

            typeLabel =
                "نص";


            contentHTML = `

                <div class="
                    student-feed-text
                ">

                    ${escapeHTML(
                        post.content ||
                        ""
                    )}

                </div>

            `;
        }


        return `

            <article
                class="
                    student-feed-card
                "
                data-feed-id="${escapeHTML(
                    post.id
                )}"
                data-feed-kind="post"
            >

                <div class="
                    student-feed-header
                ">

                    ${avatarHTML(
                        profile
                    )}


                    <div class="
                        student-feed-user
                    ">

                        <div class="
                            student-feed-name
                        ">

                            ${escapeHTML(
                                name
                            )}

                        </div>


                        <div class="
                            student-feed-username
                        ">

                            @${escapeHTML(
                                username
                            )}

                        </div>

                    </div>


                    <div class="
                        student-feed-time
                    ">

                        ${escapeHTML(
                            formatDate(
                                post.created_at
                            )
                        )}

                    </div>

                </div>


                ${contentHTML}


                <div class="
                    student-feed-actions
                ">

                    <span class="
                        student-feed-type
                    ">
                        ${typeLabel}
                    </span>


                    <button
                        type="button"
                        class="
                            student-feed-action
                        "
                        data-feed-like
                        title="إعجاب"
                    >

                        <i class="
                            fa-regular
                            fa-heart
                        "></i>

                    </button>


                    <button
                        type="button"
                        class="
                            student-feed-action
                        "
                        data-feed-comment
                        title="تعليق"
                    >

                        <i class="
                            fa-regular
                            fa-comment
                        "></i>

                    </button>


                    <button
                        type="button"
                        class="
                            student-feed-action
                        "
                        data-feed-share
                        title="مشاركة"
                    >

                        <i class="
                            fa-solid
                            fa-share
                        "></i>

                    </button>


                    <button
                        type="button"
                        class="
                            student-feed-action
                            save
                        "
                        data-feed-save
                        title="حفظ"
                    >

                        <i class="
                            fa-regular
                            fa-bookmark
                        "></i>

                    </button>

                </div>

            </article>

        `;
    }


    /* =====================================================
       حالة فارغة
    ===================================================== */

    function renderEmpty() {

        if (!feedContainer) {
            return;
        }


        feedContainer.innerHTML = `

            <div class="
                student-feed-empty
            ">

                <div class="
                    student-feed-empty-icon
                ">

                    <i class="
                        fa-regular
                        fa-newspaper
                    "></i>

                </div>


                <div style="
                    font-weight:800;
                    color:#555;
                    margin-bottom:7px;
                ">

                    لا توجد منشورات بعد

                </div>


                <div style="
                    font-size:13px;
                    line-height:1.8;
                ">

                    كن أول من ينشر شيئًا
                    في Student.

                </div>

            </div>

        `;
    }


    /* =====================================================
       تحميل Feed
    ===================================================== */

    async function loadFeed() {

        if (loading) {
            return;
        }


        loading =
            true;


        try {

            const client =
                await waitForSupabase();


            if (!client) {

                throw new Error(
                    "Supabase لم يجهز بعد."
                );
            }


            const container =
                createFeedContainer();


            if (!container) {

                throw new Error(
                    "لم يتم العثور على مكان Feed."
                );
            }


            container.innerHTML = `

                <div class="
                    student-feed-loading
                ">

                    <div class="
                        student-feed-spinner
                    "></div>

                    جاري تحميل المنشورات...

                </div>

            `;


            /*
               مهم جدًا:
               هنا نحمل posts فقط.
               لا يوجد loadReels().
            */

            const posts =
                await loadPosts(
                    client
                );


            if (
                !posts.length
            ) {

                renderEmpty();

                return;
            }


            const userIds =
                Array.from(
                    new Set(
                        posts.map(
                            function(post) {

                                return post.user_id;
                            }
                        )
                    )
                );


            const profiles =
                await loadProfiles(
                    client,
                    userIds
                );


            feedContainer.innerHTML = `

                <button
                    id="student-feed-refresh"
                    class="
                        student-feed-refresh
                    "
                    type="button"
                >

                    <i class="
                        fa-solid
                        fa-rotate
                    "></i>

                    تحديث المنشورات

                </button>


                ${posts.map(
                    function(post) {

                        return renderCard(
                            post,
                            profiles
                        );

                    }
                ).join("")}

            `;


            bindFeedActions();


            document
                .getElementById(
                    "student-feed-refresh"
                )
                ?.addEventListener(
                    "click",
                    loadFeed
                );


        } catch (error) {

            console.error(
                "Feed error:",
                error
            );


            if (feedContainer) {

                feedContainer.innerHTML = `

                    <div class="
                        student-feed-error
                    ">

                        ⚠️

                        <div>
                            تعذر تحميل المنشورات حاليًا.
                        </div>


                        <div style="
                            color:#999;
                            font-size:11px;
                            margin-top:8px;
                        ">

                            ${escapeHTML(
                                error?.message ||
                                ""
                            )}

                        </div>


                        <button
                            id="student-feed-retry"
                            style="
                                margin-top:12px;
                                border:none;
                                background:#0095f6;
                                color:white;
                                padding:10px 18px;
                                border-radius:10px;
                                cursor:pointer;
                            "
                        >
                            إعادة المحاولة
                        </button>

                    </div>

                `;


                document
                    .getElementById(
                        "student-feed-retry"
                    )
                    ?.addEventListener(
                        "click",
                        loadFeed
                    );
            }

        } finally {

            loading =
                false;
        }
    }


    /* =====================================================
       المحفوظات
    ===================================================== */

    async function ensureSavedSystem() {

        if (
            typeof window.saveStudentItem ===
            "function"
        ) {

            return true;
        }


        return new Promise(
            function(resolve) {

                const existing =
                    document.querySelector(
                        'script[data-student-saved="true"]'
                    );


                if (existing) {

                    let attempts =
                        0;


                    const timer =
                        setInterval(
                            function() {

                                attempts++;


                                if (
                                    typeof window.saveStudentItem ===
                                    "function"
                                ) {

                                    clearInterval(
                                        timer
                                    );

                                    resolve(
                                        true
                                    );

                                    return;
                                }


                                if (
                                    attempts >=
                                    30
                                ) {

                                    clearInterval(
                                        timer
                                    );

                                    resolve(
                                        false
                                    );
                                }

                            },
                            100
                        );


                    return;
                }


                const script =
                    document.createElement(
                        "script"
                    );


                script.src =
                    "settings.js?v=3.0.0";


                script.async =
                    true;


                script.dataset.studentSaved =
                    "true";


                script.onload =
                    function() {

                        resolve(
                            typeof window.saveStudentItem ===
                            "function"
                        );
                    };


                script.onerror =
                    function() {

                        resolve(
                            false
                        );
                    };


                document.body.appendChild(
                    script
                );

            }
        );
    }


    /* =====================================================
       إجراءات Feed
    ===================================================== */

    function bindFeedActions() {

        if (!feedContainer) {
            return;
        }


        /* إعجاب */

        feedContainer
            .querySelectorAll(
                "[data-feed-like]"
            )
            .forEach(
                function(button) {

                    button.addEventListener(
                        "click",
                        function() {

                            button.classList.toggle(
                                "active"
                            );

                            toast(
                                button.classList.contains(
                                    "active"
                                )
                                    ? "❤️ تمت الإعجاب"
                                    : "تم إلغاء الإعجاب"
                            );
                        }
                    );
                }
            );


        /* تعليق */

        feedContainer
            .querySelectorAll(
                "[data-feed-comment]"
            )
            .forEach(
                function(button) {

                    button.addEventListener(
                        "click",
                        function() {

                            toast(
                                "التعليقات ستُفعّل قريبًا."
                            );

                        }
                    );
                }
            );


        /* مشاركة */

        feedContainer
            .querySelectorAll(
                "[data-feed-share]"
            )
            .forEach(
                function(button) {

                    button.addEventListener(
                        "click",
                        async function() {

                            if (
                                navigator.share
                            ) {

                                try {

                                    await navigator.share({

                                        title:
                                            "Student",

                                        text:
                                            "شاهد هذا المنشور في Student",

                                        url:
                                            window.location.href

                                    });

                                } catch (error) {

                                    if (
                                        error?.name !==
                                        "AbortError"
                                    ) {

                                        toast(
                                            "تعذر المشاركة."
                                        );
                                    }

                                }

                            } else {

                                toast(
                                    "المشاركة غير متاحة."
                                );
                            }
                        }
                    );
                }
            );


        /* حفظ */

        feedContainer
            .querySelectorAll(
                "[data-feed-save]"
            )
            .forEach(
                function(button) {

                    button.addEventListener(
                        "click",
                        async function() {

                            const ready =
                                await ensureSavedSystem();


                            if (!ready) {

                                toast(
                                    "تعذر تحميل المحفوظات."
                                );

                                return;
                            }


                            const card =
                                button.closest(
                                    "[data-feed-id]"
                                );


                            const id =
                                card?.dataset.feedId;


                            const result =
                                await window.saveStudentItem(
                                    "post",
                                    id
                                );


                            if (
                                result?.success
                            ) {

                                button.innerHTML =
                                    `
                                    <i class="
                                        fa-solid
                                        fa-bookmark
                                    "></i>
                                    `;


                                toast(
                                    result.alreadySaved
                                        ? "المحتوى محفوظ مسبقًا."
                                        : "تم حفظ المنشور."
                                );

                            } else {

                                toast(
                                    result?.error ||
                                    "تعذر الحفظ."
                                );
                            }

                        }
                    );
                }
            );
    }


    /* =====================================================
       رسالة مؤقتة
    ===================================================== */

    function toast(
        message
    ) {

        const element =
            document.createElement(
                "div"
            );


        element.textContent =
            message;


        element.style.position =
            "fixed";

        element.style.left =
            "50%";

        element.style.bottom =
            "90px";

        element.style.transform =
            "translateX(-50%)";

        element.style.zIndex =
            "10000000";

        element.style.background =
            "#222";

        element.style.color =
            "#fff";

        element.style.padding =
            "11px 16px";

        element.style.borderRadius =
            "12px";

        element.style.fontSize =
            "13px";

        element.style.direction =
            "rtl";

        element.style.boxShadow =
            "0 8px 30px rgba(0,0,0,.2)";


        document.body.appendChild(
            element
        );


        setTimeout(
            function() {

                element.remove();

            },
            2200
        );
    }


    /* =====================================================
       API
    ===================================================== */

    window.loadStudentFeed =
        loadFeed;


    /* =====================================================
       تشغيل
    ===================================================== */

    function startFeed() {

        if (started) {
            return;
        }


        started =
            true;


        injectStyles();


        createFeedContainer();


        setTimeout(
            loadFeed,
            1000
        );
    }


    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            startFeed
        );

    } else {

        startFeed();
    }


})();


/* ===== MERGED MODULE: search.js optimized ===== */

(function(){
"use strict";
if(window.__studentSearchLoaded) return;
window.__studentSearchLoaded=true;
let page=null,timer=null,controller=null;
const db=()=>typeof supabaseClient!=="undefined"?supabaseClient:null;
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
function ensure(){
 if(page) return page;
 page=document.createElement("section"); page.id="student-search-page";
 page.style.cssText="position:fixed;inset:0;z-index:2147482400;background:#f7f8fb;display:none;flex-direction:column;direction:rtl";
 page.innerHTML=`<header style="height:62px;background:#fff;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;gap:10px;padding:0 14px"><button data-search-back style="border:0;background:#eef2f6;width:40px;height:40px;border-radius:50%;font-size:22px">‹</button><strong style="font-size:19px">البحث</strong></header><div style="padding:12px"><input id="student-search-input" placeholder="ابحث بالاسم أو اسم المستخدم" style="width:100%;box-sizing:border-box;border:1px solid #dfe3e8;border-radius:14px;padding:13px;font:inherit;background:#fff"></div><div id="student-search-results" style="padding:0 12px 90px;overflow:auto;display:grid;gap:8px"></div>`;
 document.body.appendChild(page);
 page.addEventListener("click",e=>{const b=e.target.closest("[data-search-back]");if(b){close();return;}const r=e.target.closest("[data-profile-id]");if(r){window.StudentProfile?.open?.(r.dataset.profileId);window.showProfilePanel?.(r.dataset.profileId);}});
 page.querySelector("#student-search-input").addEventListener("input",e=>{clearTimeout(timer);timer=setTimeout(()=>run(e.target.value),300);});
 return page;
}
async function run(value){
 const q=String(value||"").trim(); const box=page.querySelector("#student-search-results");
 if(q.length<2){box.innerHTML='<div style="text-align:center;color:#7b8491;padding:45px 12px">اكتب حرفين على الأقل</div>';return;}
 controller?.abort(); controller=new AbortController(); box.innerHTML='<div style="text-align:center;padding:35px;color:#777">جارٍ البحث...</div>';
 try{const client=db(); if(!client) throw new Error("Supabase غير جاهز"); const safe=q.replace(/[,%()]/g,""); const {data,error}=await client.from("profiles").select("id,full_name,username,avatar_url,role,is_verified,verification_color").or(`full_name.ilike.%${safe}%,username.ilike.%${safe}%`).limit(30); if(error) throw error; box.innerHTML=(data||[]).map(x=>`<button data-profile-id="${esc(x.id)}" style="border:1px solid #e5e7eb;background:#fff;border-radius:14px;padding:10px;display:grid;grid-template-columns:48px 1fr;gap:10px;text-align:right;align-items:center"><img src="${esc(x.avatar_url||'')}" onerror="this.style.visibility='hidden'" style="width:48px;height:48px;border-radius:50%;object-fit:cover;background:#edf1f5"><span><strong>${esc(x.full_name||x.username||'مستخدم')}</strong><small style="display:block;color:#7b8491;margin-top:3px">@${esc(x.username||'')}</small></span></button>`).join('')||'<div style="text-align:center;color:#7b8491;padding:45px 12px">لا توجد نتائج</div>';
 }catch(err){if(err.name!=="AbortError") box.innerHTML='<div style="text-align:center;color:#b3261e;padding:35px">تعذر البحث حاليًا</div>';}
}
function open(){ensure();page.style.display="flex";history.pushState({studentPage:"search"},"","#search");setTimeout(()=>page.querySelector("#student-search-input")?.focus(),50);}
function close(){if(!page)return;page.style.display="none";controller?.abort();}
window.openStudentSearch=open; window.closeStudentSearch=close;
})();


/* ===== MERGED MODULE: messages.js ===== */
/* =========================================================
   Student Messages 2.0 - Telegram-inspired full page
   Single mount, delegated events, cleanup, cache, pagination
========================================================= */
(function () {
    "use strict";

    if (window.StudentMessages?.version === "2.0.0") return;

    const state = {
        user: null,
        page: null,
        view: "list",
        filter: "all",
        conversations: [],
        current: null,
        messages: [],
        members: [],
        reply: null,
        editing: null,
        chatChannel: null,
        globalChannel: null,
        controller: null,
        searchTimer: null,
        reloadTimer: null,
        cacheAt: 0,
        before: null,
        hasMore: true,
        loading: false,
        recording: null,
        recorder: null,
        chunks: [],
        historyOpen: false,
        objectUrls: new Set()
    };

    const sb = () => (typeof supabaseClient !== "undefined" ? supabaseClient : null);
    const esc = (value) => String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    function formatTime(value) {
        if (!value) return "";
        try {
            const date = new Date(value);
            const today = new Date();
            if (date.toDateString() === today.toDateString()) {
                return new Intl.DateTimeFormat("ar-IQ", { hour: "2-digit", minute: "2-digit" }).format(date);
            }
            return new Intl.DateTimeFormat("ar-IQ", { month: "short", day: "numeric" }).format(date);
        } catch {
            return "";
        }
    }

    function injectCss() {
        if (document.getElementById("student-messages-v2-style")) return;
        const style = document.createElement("style");
        style.id = "student-messages-v2-style";
        style.textContent = `
        #student-messages-page{position:fixed;inset:0;z-index:2147482500;background:#fff;display:none;direction:rtl;color:#17212b;font-family:inherit}
        #student-messages-page.sm-open{display:flex;flex-direction:column}
        #student-messages-page *{box-sizing:border-box}
        .tg-head{height:58px;padding:0 10px;display:flex;align-items:center;gap:8px;background:#fff;border-bottom:1px solid #e5e9ee;flex:0 0 auto}
        .tg-btn{border:0;background:transparent;color:inherit;font:inherit;cursor:pointer;display:grid;place-items:center}
        .tg-round{width:42px;height:42px;border-radius:50%;font-size:20px}
        .tg-round:active{background:#edf3f7}
        .tg-title{min-width:0;flex:1}
        .tg-title strong{display:block;font-size:18px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .tg-title small{display:block;color:#74808b;font-size:12px;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .tg-tabs{height:43px;display:flex;background:#fff;border-bottom:1px solid #e5e9ee;padding:0 8px;flex:0 0 auto}
        .tg-tab{flex:1;border:0;background:transparent;font:inherit;font-weight:700;color:#6d7882;position:relative;cursor:pointer}
        .tg-tab.active{color:#168acd}.tg-tab.active:after{content:"";position:absolute;right:15%;left:15%;bottom:0;height:3px;border-radius:3px;background:#168acd}
        .tg-search-wrap{padding:8px 10px;background:#fff;flex:0 0 auto}
        .tg-search{height:42px;border-radius:22px;background:#f1f3f5;display:flex;align-items:center;gap:8px;padding:0 14px}
        .tg-search input{width:100%;border:0;outline:0;background:transparent;font:inherit;color:#17212b}
        .tg-body{flex:1;min-height:0;overflow:auto;background:#fff;overscroll-behavior:contain}
        .tg-list{max-width:760px;margin:auto}
        .tg-row{height:72px;padding:8px 12px;display:flex;align-items:center;gap:11px;cursor:pointer;border-bottom:1px solid #eef1f3;background:#fff}
        .tg-row:active{background:#f3f6f8}
        .tg-avatar{width:54px;height:54px;flex:0 0 54px;border-radius:50%;object-fit:cover;background:linear-gradient(145deg,#42a5e8,#168acd);color:#fff;display:grid;place-items:center;font-size:20px;font-weight:800}
        .tg-row-main{min-width:0;flex:1}.tg-row-line{display:flex;gap:8px;align-items:center}.tg-name{font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1}.tg-time{font-size:11px;color:#8a949d}
        .tg-preview{font-size:13px;color:#75808a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:5px;display:flex;align-items:center;gap:5px}.tg-unread{min-width:22px;height:22px;padding:0 6px;border-radius:12px;background:#37aee2;color:#fff;font-size:11px;font-weight:800;display:grid;place-items:center;margin-inline-start:auto}
        .tg-empty{text-align:center;color:#77838e;padding:70px 20px}.tg-empty i{font-size:52px;display:block;margin-bottom:12px;color:#a8c8da}
        .tg-fab{position:absolute;left:18px;bottom:22px;width:58px;height:58px;border-radius:50%;border:0;background:#168acd;color:#fff;font-size:24px;box-shadow:0 8px 22px rgba(22,138,205,.32);cursor:pointer}
        .tg-chat{height:100%;display:flex;flex-direction:column;background:#dfe7eb}
        .tg-msgs{flex:1;min-height:0;overflow:auto;padding:12px 9px 16px;background-color:#dfe7eb;background-image:radial-gradient(rgba(255,255,255,.45) 1px,transparent 1px);background-size:18px 18px;overscroll-behavior:contain}
        .tg-load-old{display:block;margin:4px auto 12px;border:0;border-radius:18px;background:rgba(255,255,255,.9);padding:7px 15px;font:inherit;color:#168acd;cursor:pointer}
        .tg-msg{max-width:min(78%,560px);width:max-content;min-width:82px;margin:4px auto 4px 0;padding:7px 9px 5px;border-radius:13px 13px 4px 13px;background:#fff;box-shadow:0 1px 1px rgba(0,0,0,.12);position:relative}
        .tg-msg.mine{margin-left:0;margin-right:auto;background:#e5f7d8;border-radius:13px 13px 13px 4px}.tg-msg.system{margin:9px auto;background:rgba(67,86,100,.72);color:#fff;text-align:center;border-radius:15px;max-width:90%}
        .tg-author{font-size:12px;font-weight:800;color:#168acd;margin-bottom:3px}.tg-text{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.5}.tg-reply{border-right:3px solid #168acd;background:rgba(22,138,205,.08);padding:5px 7px;border-radius:7px;margin-bottom:5px;font-size:12px;max-width:100%;overflow:hidden;text-overflow:ellipsis}
        .tg-media{display:block;max-width:100%;max-height:340px;border-radius:10px;margin:2px 0 5px}.tg-audio{width:250px;max-width:100%}.tg-file{display:flex;align-items:center;gap:9px;text-decoration:none;color:inherit;background:rgba(0,0,0,.045);padding:9px;border-radius:10px}.tg-file-icon{width:38px;height:38px;border-radius:50%;background:#37aee2;color:#fff;display:grid;place-items:center}
        .tg-meta{display:flex;justify-content:flex-end;align-items:center;gap:4px;font-size:10px;color:#75808a;margin-top:2px}.tg-check{color:#36a7e0;font-weight:900}
        .tg-compose-wrap{background:#fff;border-top:1px solid #d5dce1;padding:7px 8px calc(7px + env(safe-area-inset-bottom));flex:0 0 auto}.tg-replybar{display:none;align-items:center;gap:8px;border-right:3px solid #168acd;background:#f5f7f8;padding:7px 9px;border-radius:8px;margin-bottom:6px}.tg-replybar.show{display:flex}.tg-replybar span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .tg-compose{display:flex;align-items:flex-end;gap:5px}.tg-compose textarea{flex:1;min-height:42px;max-height:120px;border:0;outline:0;background:#f1f3f5;border-radius:22px;padding:11px 14px;font:inherit;resize:none}.tg-send{width:44px;height:44px;border-radius:50%;border:0;background:#168acd;color:#fff;font-size:18px;cursor:pointer}.tg-attach{width:40px;height:40px;border-radius:50%;font-size:19px}.tg-recording{background:#e95b64!important;animation:tgPulse 1s infinite alternate}@keyframes tgPulse{to{transform:scale(1.08)}}
        .tg-overlay{position:fixed;inset:0;z-index:2147482600;background:rgba(0,0,0,.42);display:flex;align-items:flex-end;justify-content:center;padding:10px}.tg-sheet{width:min(620px,100%);max-height:88vh;overflow:auto;background:#fff;border-radius:18px 18px 8px 8px;padding:14px}.tg-sheet h3{margin:4px 0 14px}.tg-sheet-list{display:grid;gap:4px}.tg-action{width:100%;border:0;background:#fff;padding:12px;border-radius:10px;text-align:right;font:inherit;cursor:pointer}.tg-action:active{background:#edf3f7}.tg-action.danger{color:#d93445}.tg-field{margin-bottom:11px}.tg-field label{display:block;font-weight:700;margin-bottom:5px}.tg-field input,.tg-field textarea,.tg-field select{width:100%;border:1px solid #d8dfe5;border-radius:11px;padding:11px;font:inherit}.tg-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:12px}.tg-primary,.tg-secondary,.tg-danger{border:0;border-radius:10px;padding:10px 14px;font:inherit;font-weight:800;cursor:pointer}.tg-primary{background:#168acd;color:#fff}.tg-secondary{background:#edf2f5;color:#27343e}.tg-danger{background:#e24a57;color:#fff}
        .tg-user{display:flex;align-items:center;gap:10px;padding:9px;border-bottom:1px solid #eef1f3;cursor:pointer}.tg-user:active{background:#f2f6f8}.tg-badge{position:absolute;min-width:18px;height:18px;border-radius:10px;background:#e53945;color:#fff;font-size:10px;font-weight:900;display:grid;place-items:center;padding:0 5px;transform:translate(45%,-45%)}
        .tg-toast{position:fixed;z-index:2147482700;left:50%;bottom:86px;transform:translateX(-50%);background:#24333d;color:#fff;padding:10px 15px;border-radius:12px;max-width:88%;text-align:center}
        @media(min-width:900px){#student-messages-page{left:50%;transform:translateX(-50%);max-width:900px;border-inline:1px solid #e2e6e9}.tg-fab{left:28px}}
        `;
        document.head.appendChild(style);
    }

    function ensurePage() {
        injectCss();
        let page = document.getElementById("student-messages-page");
        if (!page) {
            page = document.createElement("section");
            page.id = "student-messages-page";
            document.body.appendChild(page);
        }
        state.page = page;
        return page;
    }

    function toast(message) {
        document.querySelector(".tg-toast")?.remove();
        const el = document.createElement("div");
        el.className = "tg-toast";
        el.textContent = message;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 2400);
    }

    async function getUser() {
        const client = sb();
        if (!client) return null;
        const { data } = await client.auth.getUser();
        return data?.user || null;
    }

    function avatar(item) {
        const name = item?.title || item?.full_name || item?.username || "م";
        const url = item?.avatar_url || item?.photo_url || "";
        return url
            ? `<img class="tg-avatar" loading="lazy" decoding="async" src="${esc(url)}" alt="">`
            : `<span class="tg-avatar">${esc(name.trim().charAt(0).toUpperCase() || "م")}</span>`;
    }

    function kindIcon(kind) {
        if (kind === "channel") return "📢";
        if (kind === "group") return "👥";
        return "";
    }

    function mountEvents() {
        state.controller?.abort();
        state.controller = new AbortController();
        const signal = state.controller.signal;
        state.page.addEventListener("click", onClick, { signal });
        state.page.addEventListener("input", onInput, { signal });
        state.page.addEventListener("change", onChange, { signal });
        state.page.addEventListener("keydown", onKeyDown, { signal });
    }

    function onClick(event) {
        const target = event.target.closest("[data-tg-action]");
        if (!target) return;
        const action = target.dataset.tgAction;
        if (action === "back") return handleBack();
        if (action === "new") return openNewSheet();
        if (action === "filter") return setFilter(target.dataset.filter);
        if (action === "open-chat") return openChat(target.dataset.id);
        if (action === "send") return sendMessage();
        if (action === "attach") return document.getElementById("tg-file")?.click();
        if (action === "record") return toggleRecord(target);
        if (action === "cancel-reply") return clearReply();
        if (action === "info") return openInfo();
        if (action === "load-old") return loadOlder();
        if (action === "message-menu") return openMessageMenu(target.dataset.id);
        if (action === "close-overlay") return target.closest(".tg-overlay")?.remove();
    }

    function onInput(event) {
        if (event.target.id === "tg-search") {
            clearTimeout(state.searchTimer);
            state.searchTimer = setTimeout(() => renderConversationList(event.target.value), 180);
        }
        if (event.target.id === "tg-message-search") {
            clearTimeout(state.searchTimer);
            state.searchTimer = setTimeout(() => renderMessages(event.target.value), 160);
        }
        if (event.target.id === "tg-input") autoGrow(event.target);
    }

    function onChange(event) {
        if (event.target.id === "tg-file" && event.target.files?.[0]) {
            uploadFile(event.target.files[0]);
            event.target.value = "";
        }
    }

    function onKeyDown(event) {
        if (event.target.id === "tg-input" && event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    }

    function autoGrow(el) {
        el.style.height = "42px";
        el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    }

    function renderListShell() {
        state.view = "list";
        state.current = null;
        state.page.innerHTML = `
            <header class="tg-head">
                <button class="tg-btn tg-round" data-tg-action="back" aria-label="رجوع">←</button>
                <div class="tg-title"><strong>الرسائل</strong><small>محادثاتك ومجموعاتك وقنواتك</small></div>
                <button class="tg-btn tg-round" data-tg-action="new" aria-label="جديد">✎</button>
            </header>
            <div class="tg-tabs">
                <button class="tg-tab active" data-tg-action="filter" data-filter="all">الكل</button>
                <button class="tg-tab" data-tg-action="filter" data-filter="direct">الخاص</button>
                <button class="tg-tab" data-tg-action="filter" data-filter="group">المجموعات</button>
                <button class="tg-tab" data-tg-action="filter" data-filter="channel">القنوات</button>
            </div>
            <div class="tg-search-wrap"><label class="tg-search">⌕<input id="tg-search" placeholder="البحث في المحادثات أو بدء محادثة"></label></div>
            <main class="tg-body"><div id="tg-list" class="tg-list"></div></main>
            <button class="tg-fab" data-tg-action="new" aria-label="رسالة جديدة">✎</button>`;
        renderConversationList("");
    }

    function setFilter(filter) {
        state.filter = filter || "all";
        state.page.querySelectorAll(".tg-tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.filter === state.filter));
        renderConversationList(document.getElementById("tg-search")?.value || "");
    }

    function renderConversationList(query = "") {
        const box = document.getElementById("tg-list");
        if (!box) return;
        const q = query.trim().toLowerCase();
        let rows = state.conversations.filter((item) => {
            const kindOk = state.filter === "all" || item.kind === state.filter;
            const text = `${item.title || ""} ${item.username || ""} ${item.last_message || ""}`.toLowerCase();
            return kindOk && (!q || text.includes(q));
        });
        box.innerHTML = rows.map((item) => `
            <article class="tg-row" data-tg-action="open-chat" data-id="${esc(item.id)}">
                ${avatar(item)}
                <div class="tg-row-main">
                    <div class="tg-row-line"><div class="tg-name">${kindIcon(item.kind)} ${esc(item.title || "محادثة")}</div><time class="tg-time">${esc(formatTime(item.last_message_at || item.updated_at))}</time></div>
                    <div class="tg-preview"><span>${item.last_message_type === "image" ? "🖼 صورة" : item.last_message_type === "video" ? "🎥 فيديو" : item.last_message_type === "audio" ? "🎤 رسالة صوتية" : item.last_message_type === "file" ? "📎 ملف" : esc(item.last_message || "ابدأ المحادثة")}</span>${Number(item.unread_count || 0) > 0 ? `<b class="tg-unread">${Math.min(99, Number(item.unread_count))}${Number(item.unread_count) > 99 ? "+" : ""}</b>` : ""}</div>
                </div>
            </article>`).join("") || `<div class="tg-empty"><i>✉</i>${q ? "لا توجد نتائج" : "لا توجد محادثات بعد"}</div>`;
    }

    async function loadConversations(force = false) {
        if (state.loading) return;
        if (!force && Date.now() - state.cacheAt < 30000 && state.conversations.length) {
            renderConversationList(document.getElementById("tg-search")?.value || "");
            return;
        }
        state.loading = true;
        try {
            const { data, error } = await sb().rpc("student_get_conversations");
            if (error) throw error;
            state.conversations = Array.isArray(data) ? data : [];
            state.cacheAt = Date.now();
            renderConversationList(document.getElementById("tg-search")?.value || "");
        } catch (error) {
            toast(error.message || "تعذر تحميل المحادثات");
        } finally {
            state.loading = false;
        }
    }

    async function openChat(id) {
        if (!id || state.loading) return;
        state.loading = true;
        try {
            const [conversationResult, memberResult, messageResult] = await Promise.all([
                sb().rpc("student_get_conversation", { p_conversation: id }),
                sb().rpc("student_get_conversation_members", { p_conversation: id }),
                sb().rpc("student_get_messages", { p_conversation: id, p_before: null, p_limit: 50 })
            ]);
            if (conversationResult.error) throw conversationResult.error;
            if (messageResult.error) throw messageResult.error;
            state.current = Array.isArray(conversationResult.data) ? conversationResult.data[0] : conversationResult.data;
            state.members = memberResult.data || [];
            state.messages = (messageResult.data || []).reverse();
            state.before = state.messages[0]?.created_at || null;
            state.hasMore = (messageResult.data || []).length === 50;
            state.view = "chat";
            renderChatShell();
            subscribeChat(id);
            markRead();
        } catch (error) {
            toast(error.message || "تعذر فتح المحادثة");
        } finally {
            state.loading = false;
        }
    }

    function renderChatShell() {
        const current = state.current || {};
        state.page.innerHTML = `
            <section class="tg-chat">
                <header class="tg-head">
                    <button class="tg-btn tg-round" data-tg-action="back">←</button>
                    ${avatar(current)}
                    <button class="tg-btn tg-title" data-tg-action="info"><strong>${esc(current.title || "محادثة")}</strong><small>${current.kind === "direct" ? "متصل عبر Student" : `${state.members.length} عضو`}</small></button>
                    <button class="tg-btn tg-round" data-tg-action="info">⋮</button>
                </header>
                <div class="tg-search-wrap"><label class="tg-search">⌕<input id="tg-message-search" placeholder="البحث داخل المحادثة"></label></div>
                <main id="tg-msgs" class="tg-msgs"></main>
                <div class="tg-compose-wrap">
                    <div id="tg-replybar" class="tg-replybar"><span></span><button class="tg-btn" data-tg-action="cancel-reply">✕</button></div>
                    <div class="tg-compose">
                        <button class="tg-btn tg-attach" data-tg-action="attach">📎</button>
                        <input id="tg-file" type="file" hidden accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.txt">
                        <textarea id="tg-input" rows="1" placeholder="اكتب رسالة"></textarea>
                        <button class="tg-btn tg-attach" data-tg-action="record" aria-label="تسجيل صوتي">🎤</button>
                        <button class="tg-send" data-tg-action="send">➤</button>
                    </div>
                </div>
            </section>`;
        renderMessages();
        requestAnimationFrame(scrollBottom);
    }

    function mediaHtml(message) {
        if (!message.media_url) return "";
        const url = esc(message.media_url);
        if (message.message_type === "image") return `<img class="tg-media" loading="lazy" decoding="async" src="${url}" alt="صورة">`;
        if (message.message_type === "video") return `<video class="tg-media" controls preload="metadata" playsinline src="${url}"></video>`;
        if (message.message_type === "audio") return `<audio class="tg-audio" controls preload="metadata" src="${url}"></audio>`;
        return `<a class="tg-file" href="${url}" target="_blank" rel="noopener"><span class="tg-file-icon">⬇</span><span>${esc(message.file_name || "تحميل الملف")}</span></a>`;
    }

    function renderMessages(query = "") {
        const box = document.getElementById("tg-msgs");
        if (!box) return;
        const q = query.trim().toLowerCase();
        const rows = q ? state.messages.filter((m) => `${m.body || ""} ${m.file_name || ""}`.toLowerCase().includes(q)) : state.messages;
        box.innerHTML = `${state.hasMore && !q ? `<button class="tg-load-old" data-tg-action="load-old">تحميل رسائل أقدم</button>` : ""}${rows.map(messageHtml).join("") || `<div class="tg-empty">${q ? "لا توجد نتائج" : "ابدأ المحادثة الآن"}</div>`}`;
        if (!q) requestAnimationFrame(scrollBottom);
    }

    function messageHtml(message) {
        const mine = String(message.sender_id) === String(state.user?.id);
        if (message.message_type === "system") return `<div class="tg-msg system">${esc(message.body || "")}</div>`;
        const reply = message.reply_body || message.reply_preview ? `<div class="tg-reply">${esc(message.reply_body || message.reply_preview)}</div>` : "";
        return `<article class="tg-msg ${mine ? "mine" : ""}" data-message-id="${esc(message.id)}">
            ${!mine && state.current?.kind !== "direct" ? `<div class="tg-author">${esc(message.sender_name || message.username || "عضو")}</div>` : ""}
            ${reply}${message.deleted_at ? `<div class="tg-text">تم حذف الرسالة</div>` : `${message.body ? `<div class="tg-text">${esc(message.body)}</div>` : ""}${mediaHtml(message)}`}
            <div class="tg-meta"><time>${esc(formatTime(message.created_at))}</time>${message.edited_at ? "· معدلة" : ""}${mine ? `<span class="tg-check">${Number(message.read_count || 0) > 0 ? "✓✓" : "✓"}</span>` : ""}<button class="tg-btn" data-tg-action="message-menu" data-id="${esc(message.id)}">⋮</button></div>
        </article>`;
    }

    function scrollBottom() {
        const box = document.getElementById("tg-msgs");
        if (box) box.scrollTop = box.scrollHeight;
    }

    async function loadOlder() {
        if (!state.hasMore || state.loading || !state.current) return;
        state.loading = true;
        try {
            const { data, error } = await sb().rpc("student_get_messages", { p_conversation: state.current.id, p_before: state.before, p_limit: 50 });
            if (error) throw error;
            const older = (data || []).reverse();
            state.messages = [...older, ...state.messages];
            state.before = state.messages[0]?.created_at || state.before;
            state.hasMore = (data || []).length === 50;
            renderMessages(document.getElementById("tg-message-search")?.value || "");
        } catch (error) {
            toast(error.message || "تعذر تحميل الرسائل القديمة");
        } finally {
            state.loading = false;
        }
    }

    function setReply(message, editing = false) {
        state.reply = editing ? null : message;
        state.editing = editing ? message : null;
        const bar = document.getElementById("tg-replybar");
        if (!bar) return;
        bar.classList.add("show");
        bar.querySelector("span").textContent = editing ? "تعديل الرسالة" : `رد على: ${message.body || message.file_name || "رسالة"}`;
        const input = document.getElementById("tg-input");
        if (editing) input.value = message.body || "";
        input?.focus();
    }

    function clearReply() {
        state.reply = null;
        state.editing = null;
        document.getElementById("tg-replybar")?.classList.remove("show");
        const input = document.getElementById("tg-input");
        if (input) input.value = "";
    }

    async function sendMessage() {
        const input = document.getElementById("tg-input");
        const body = input?.value.trim();
        if (!body || !state.current) return;
        input.disabled = true;
        try {
            const result = state.editing
                ? await sb().rpc("student_edit_message", { p_message: state.editing.id, p_body: body })
                : await sb().rpc("student_send_message", { p_conversation: state.current.id, p_body: body, p_reply_to: state.reply?.id || null, p_message_type: "text", p_media_url: null, p_file_name: null, p_file_size: null });
            if (result.error) throw result.error;
            clearReply();
            input.value = "";
            await refreshCurrent(false);
        } catch (error) {
            toast(error.message || "تعذر إرسال الرسالة");
        } finally {
            input.disabled = false;
            input.focus();
        }
    }

    async function uploadFile(file) {
        if (!file || !state.current) return;
        if (file.size > 25 * 1024 * 1024) return toast("الحد الأقصى 25MB");
        const client = sb();
        const ext = (file.name.split(".").pop() || "bin").replace(/[^a-zA-Z0-9]/g, "");
        const path = `${state.user.id}/${Date.now()}-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}.${ext}`;
        toast("جارٍ رفع الملف...");
        try {
            const { error } = await client.storage.from("chat-media").upload(path, file, { cacheControl: "3600", upsert: false });
            if (error) throw error;
            const { data } = client.storage.from("chat-media").getPublicUrl(path);
            const type = file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : file.type.startsWith("audio/") ? "audio" : "file";
            const result = await client.rpc("student_send_message", { p_conversation: state.current.id, p_body: "", p_reply_to: state.reply?.id || null, p_message_type: type, p_media_url: data.publicUrl, p_file_name: file.name, p_file_size: file.size });
            if (result.error) throw result.error;
            clearReply();
            await refreshCurrent(false);
        } catch (error) {
            toast(error.message || "فشل رفع الملف");
        }
    }

    async function toggleRecord(button) {
        if (state.recorder?.state === "recording") {
            state.recorder.stop();
            button.classList.remove("tg-recording");
            return;
        }
        if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) return toast("التسجيل الصوتي غير مدعوم على هذا الجهاز");
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            state.chunks = [];
            state.recording = stream;
            state.recorder = new MediaRecorder(stream);
            state.recorder.ondataavailable = (event) => event.data.size && state.chunks.push(event.data);
            state.recorder.onstop = async () => {
                stream.getTracks().forEach((track) => track.stop());
                const blob = new Blob(state.chunks, { type: state.recorder.mimeType || "audio/webm" });
                const file = new File([blob], `voice-${Date.now()}.webm`, { type: blob.type });
                state.recorder = null;
                state.recording = null;
                await uploadFile(file);
            };
            state.recorder.start();
            button.classList.add("tg-recording");
            toast("بدأ التسجيل — اضغط مرة ثانية للإرسال");
        } catch {
            toast("تعذر الوصول إلى الميكروفون");
        }
    }

    function overlay(content) {
        const root = document.createElement("div");
        root.className = "tg-overlay";
        root.innerHTML = `<section class="tg-sheet">${content}</section>`;
        document.body.appendChild(root);
        root.addEventListener("click", (event) => { if (event.target === root) root.remove(); });
        return root;
    }

    function openMessageMenu(id) {
        const message = state.messages.find((item) => String(item.id) === String(id));
        if (!message) return;
        const mine = String(message.sender_id) === String(state.user.id);
        const admin = ["owner", "admin"].includes(state.current?.my_role);
        const root = overlay(`<div class="tg-sheet-list">
            <button class="tg-action" data-menu="reply">↩ الرد</button>
            ${mine && !message.deleted_at ? `<button class="tg-action" data-menu="edit">✎ تعديل</button><button class="tg-action danger" data-menu="delete">🗑 حذف</button>` : ""}
            ${admin ? `<button class="tg-action" data-menu="pin">📌 تثبيت</button>` : ""}
            <button class="tg-action" data-menu="copy">⧉ نسخ النص</button>
            <button class="tg-action" data-menu="close">إغلاق</button>
        </div>`);
        root.addEventListener("click", async (event) => {
            const action = event.target.closest("[data-menu]")?.dataset.menu;
            if (!action) return;
            if (action === "reply") setReply(message, false);
            if (action === "edit") setReply(message, true);
            if (action === "copy") navigator.clipboard?.writeText(message.body || message.media_url || "");
            if (action === "pin") await runRpc("student_pin_message", { p_conversation: state.current.id, p_message: message.id }, "تم تثبيت الرسالة");
            if (action === "delete") return confirmDelete(message.id, root);
            root.remove();
        });
    }

    function confirmDelete(id, oldRoot) {
        oldRoot.remove();
        const root = overlay(`<h3>حذف الرسالة؟</h3><p>لن يتمكن الآخرون من قراءة محتواها بعد الحذف.</p><div class="tg-actions"><button class="tg-secondary" data-no>إلغاء</button><button class="tg-danger" data-yes>حذف</button></div>`);
        root.querySelector("[data-no]").onclick = () => root.remove();
        root.querySelector("[data-yes]").onclick = async () => {
            const { error } = await sb().rpc("student_delete_message", { p_message: id });
            if (error) return toast(error.message);
            root.remove();
            await refreshCurrent(false);
        };
    }

    async function runRpc(name, args, success) {
        const { error } = await sb().rpc(name, args);
        if (error) return toast(error.message);
        if (success) toast(success);
        if (state.view === "chat") refreshCurrent(false);
    }

    function openNewSheet() {
        const root = overlay(`<h3>إنشاء جديد</h3><div class="tg-sheet-list"><button class="tg-action" data-new="direct">👤 محادثة خاصة</button><button class="tg-action" data-new="group">👥 مجموعة جديدة</button><button class="tg-action" data-new="channel">📢 قناة جديدة</button><button class="tg-action" data-new="close">إغلاق</button></div>`);
        root.addEventListener("click", (event) => {
            const action = event.target.closest("[data-new]")?.dataset.new;
            if (!action) return;
            root.remove();
            if (action === "direct") openUserSearch();
            if (action === "group" || action === "channel") openCommunityForm(action);
        });
    }

    function openUserSearch() {
        const root = overlay(`<h3>محادثة جديدة</h3><div class="tg-field"><input id="tg-user-query" placeholder="الاسم أو اسم المستخدم"></div><div id="tg-user-results"></div><div class="tg-actions"><button class="tg-secondary" data-close>إغلاق</button></div>`);
        root.querySelector("[data-close]").onclick = () => root.remove();
        let timer;
        root.querySelector("#tg-user-query").addEventListener("input", (event) => {
            clearTimeout(timer);
            timer = setTimeout(async () => {
                const q = event.target.value.trim().replace(/[,%()]/g, "");
                const box = root.querySelector("#tg-user-results");
                if (q.length < 2) return box.innerHTML = "";
                const { data, error } = await sb().from("profiles").select("id,full_name,username,avatar_url,is_verified,verification_color").or(`full_name.ilike.%${q}%,username.ilike.%${q}%`).neq("id", state.user.id).limit(25);
                if (error) return toast(error.message);
                box.innerHTML = (data || []).map((person) => `<div class="tg-user" data-user="${esc(person.id)}">${avatar(person)}<div><strong>${esc(person.full_name || person.username || "مستخدم")}</strong><small style="display:block;color:#75808a">@${esc(person.username || "")}</small></div></div>`).join("") || `<div class="tg-empty">لا توجد نتائج</div>`;
                box.querySelectorAll("[data-user]").forEach((item) => item.onclick = async () => {
                    const { data: id, error: startError } = await sb().rpc("student_start_direct_chat", { p_other_user: item.dataset.user });
                    if (startError) return toast(startError.message);
                    root.remove();
                    openChat(id);
                });
            }, 280);
        });
        setTimeout(() => root.querySelector("#tg-user-query")?.focus(), 30);
    }

    function openCommunityForm(kind) {
        const label = kind === "group" ? "مجموعة" : "قناة";
        const root = overlay(`<h3>إنشاء ${label}</h3><div class="tg-field"><label>الاسم</label><input id="tg-community-name"></div><div class="tg-field"><label>الوصف</label><textarea id="tg-community-desc"></textarea></div><div class="tg-field"><label>الخصوصية</label><select id="tg-community-public"><option value="false">خاصة</option><option value="true">عامة</option></select></div><div class="tg-actions"><button class="tg-secondary" data-close>إلغاء</button><button class="tg-primary" data-save>إنشاء</button></div>`);
        root.querySelector("[data-close]").onclick = () => root.remove();
        root.querySelector("[data-save]").onclick = async () => {
            const title = root.querySelector("#tg-community-name").value.trim();
            if (!title) return toast("اكتب الاسم");
            const { data: id, error } = await sb().rpc("student_create_community", { p_kind: kind, p_title: title, p_description: root.querySelector("#tg-community-desc").value.trim(), p_is_public: root.querySelector("#tg-community-public").value === "true" });
            if (error) return toast(error.message);
            root.remove();
            openChat(id);
        };
    }

    function openInfo() {
        const current = state.current || {};
        const admin = ["owner", "admin"].includes(current.my_role);
        const root = overlay(`<div style="text-align:center">${avatar(current)}<h3>${esc(current.title || "محادثة")}</h3><p style="color:#74808b">${esc(current.description || "")}</p></div>${current.kind !== "direct" ? `<h4>الأعضاء (${state.members.length})</h4><div>${state.members.map((member) => `<div class="tg-user">${avatar(member)}<div style="flex:1"><strong>${esc(member.full_name || member.username || "عضو")}</strong><small style="display:block;color:#75808a">${esc(member.role || "member")}</small></div>${admin && member.user_id !== state.user.id ? `<button class="tg-btn" data-remove="${esc(member.user_id)}">حذف</button>` : ""}</div>`).join("")}</div>${admin ? `<button class="tg-primary" data-add style="width:100%;margin-top:10px">إضافة عضو</button>` : ""}<button class="tg-danger" data-leave style="width:100%;margin-top:8px">مغادرة</button>` : ""}<div class="tg-actions"><button class="tg-secondary" data-close>إغلاق</button></div>`);
        root.querySelector("[data-close]").onclick = () => root.remove();
        root.querySelector("[data-add]")?.addEventListener("click", () => { root.remove(); openAddMember(); });
        root.querySelector("[data-leave]")?.addEventListener("click", async () => {
            const { error } = await sb().rpc("student_leave_conversation", { p_conversation: current.id });
            if (error) return toast(error.message);
            root.remove();
            showList();
            loadConversations(true);
        });
        root.querySelectorAll("[data-remove]").forEach((button) => button.onclick = async () => {
            const { error } = await sb().rpc("student_remove_member", { p_conversation: current.id, p_user: button.dataset.remove });
            if (error) return toast(error.message);
            root.remove();
            openChat(current.id);
        });
    }

    function openAddMember() {
        const root = overlay(`<h3>إضافة عضو</h3><div class="tg-field"><input id="tg-add-query" placeholder="الاسم أو اليوزر"></div><div id="tg-add-results"></div><div class="tg-actions"><button class="tg-secondary" data-close>إغلاق</button></div>`);
        root.querySelector("[data-close]").onclick = () => root.remove();
        let timer;
        root.querySelector("#tg-add-query").oninput = (event) => {
            clearTimeout(timer);
            timer = setTimeout(async () => {
                const q = event.target.value.trim().replace(/[,%()]/g, "");
                if (q.length < 2) return;
                const { data } = await sb().from("profiles").select("id,full_name,username,avatar_url").or(`full_name.ilike.%${q}%,username.ilike.%${q}%`).limit(20);
                const box = root.querySelector("#tg-add-results");
                box.innerHTML = (data || []).map((person) => `<div class="tg-user" data-user="${esc(person.id)}">${avatar(person)}<strong>${esc(person.full_name || person.username)}</strong></div>`).join("");
                box.querySelectorAll("[data-user]").forEach((item) => item.onclick = async () => {
                    const { error } = await sb().rpc("student_add_member", { p_conversation: state.current.id, p_user: item.dataset.user });
                    if (error) return toast(error.message);
                    root.remove();
                    openChat(state.current.id);
                });
            }, 260);
        };
    }

    async function refreshCurrent(scroll = true) {
        if (!state.current) return;
        const { data, error } = await sb().rpc("student_get_messages", { p_conversation: state.current.id, p_before: null, p_limit: 50 });
        if (error) return;
        state.messages = (data || []).reverse();
        state.before = state.messages[0]?.created_at || null;
        state.hasMore = (data || []).length === 50;
        renderMessages(document.getElementById("tg-message-search")?.value || "");
        if (scroll) requestAnimationFrame(scrollBottom);
        markRead();
    }

    function subscribeChat(id) {
        unsubscribeChat();
        state.chatChannel = sb().channel(`student-chat-${id}-${Date.now()}`).on("postgres_changes", { event: "*", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${id}` }, () => {
            clearTimeout(state.reloadTimer);
            state.reloadTimer = setTimeout(() => refreshCurrent(true), 180);
        }).subscribe();
    }

    function unsubscribeChat() {
        if (state.chatChannel) {
            sb()?.removeChannel(state.chatChannel);
            state.chatChannel = null;
        }
    }

    function subscribeGlobal() {
        if (state.globalChannel) return;
        state.globalChannel = sb().channel(`student-messages-global-${state.user.id}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, () => {
            state.cacheAt = 0;
            updateBadge();
            if (state.view === "list") loadConversations(true);
        }).subscribe();
    }

    function unsubscribeGlobal() {
        if (state.globalChannel) {
            sb()?.removeChannel(state.globalChannel);
            state.globalChannel = null;
        }
    }

    async function markRead() {
        if (!state.current) return;
        await sb().rpc("student_mark_conversation_read", { p_conversation: state.current.id });
        updateBadge();
    }

    async function updateBadge() {
        if (!state.user) state.user = await getUser();
        if (!state.user) return;
        const { data } = await sb().rpc("student_unread_messages_count");
        const count = Number(data || 0);
        document.querySelectorAll('[data-section="messages"]').forEach((button) => {
            button.style.position = "relative";
            button.querySelector(".tg-badge")?.remove();
            if (count > 0) {
                const badge = document.createElement("span");
                badge.className = "tg-badge";
                badge.textContent = count > 99 ? "99+" : String(count);
                button.appendChild(badge);
            }
        });
    }

    async function open() {
        ensurePage();
        state.user = await getUser();
        if (!state.user) return toast("سجّل الدخول أولًا");
        state.page.classList.add("sm-open");
        document.body.style.overflow = "hidden";
        state.historyOpen = true;
        if (!history.state?.studentPage || history.state.studentPage !== "messages") history.pushState({ studentPage: "messages" }, "", "#messages");
        mountEvents();
        renderListShell();
        await loadConversations(false);
        subscribeGlobal();
        updateBadge();
    }

    function showList() {
        unsubscribeChat();
        clearReply();
        renderListShell();
        loadConversations(false);
    }

    function handleBack() {
        if (document.querySelector(".tg-overlay")) return document.querySelector(".tg-overlay").remove();
        if (state.view === "chat") return showList();
        close();
    }

    function close() {
        cleanupPage();
        state.page?.classList.remove("sm-open");
        document.body.style.overflow = "";
        state.historyOpen = false;
        state.view = "list";
        state.current = null;
        if (location.hash === "#messages") history.replaceState({ studentPage: "home" }, "", "#home");
    }

    function cleanupPage() {
        state.controller?.abort();
        state.controller = null;
        clearTimeout(state.searchTimer);
        clearTimeout(state.reloadTimer);
        unsubscribeChat();
        unsubscribeGlobal();
        if (state.recorder?.state === "recording") state.recorder.stop();
        state.recording?.getTracks?.().forEach((track) => track.stop());
        state.recorder = null;
        state.recording = null;
        state.objectUrls.forEach((url) => URL.revokeObjectURL(url));
        state.objectUrls.clear();
        document.querySelectorAll(".tg-overlay").forEach((el) => el.remove());
        state.page?.querySelectorAll("video,audio").forEach((media) => {
            try { media.pause(); media.removeAttribute("src"); media.load(); } catch {}
        });
    }

    window.addEventListener("popstate", () => {
        if (!state.historyOpen) return;
        if (state.view === "chat") showList();
        else close();
    });

    window.StudentMessages = { version: "2.0.0", open, close, updateBadge, cleanup: cleanupPage };
    window.openStudentMessages = open;
    document.addEventListener("DOMContentLoaded", () => setTimeout(updateBadge, 1500), { once: true });
})();

