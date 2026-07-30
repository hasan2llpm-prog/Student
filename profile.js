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

    if (
        typeof closeFloatingPanel === "function"
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
        profile.account_status === "private";


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


    document
        .getElementById("profile-close-btn")
        ?.addEventListener(
            "click",
            closeFloatingPanel
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

/*
 * app.js يستخدم الاسم showProfilePanel
 * لذلك نربطه هنا بدون تعديل app.js
 */

window.showProfilePanel =
    profileOpen;


/*
 * يمكن استخدامه مستقبلًا
 * من أي ملف آخر
 */

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
