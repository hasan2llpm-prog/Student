/* =========================================================
   Student - Reels Users

   👤 متابعة / إلغاء متابعة
   🔔 إشعارات المتابعة
   📤 إرسال Reel داخل Student
   👤 معلومات صاحب الـReel
   ↗️ مشاركة داخلية / خارجية
========================================================= */

(function () {

    "use strict";

    if (window.__studentReelsUsersLoaded) {
        return;
    }

    window.__studentReelsUsersLoaded = true;

    let currentUserId = null;
    let usersCache = {};
    let profileCache = {};


    /* =====================================================
       Supabase
    ===================================================== */

    function getSupabase() {

        if (
            typeof supabaseClient !== "undefined" &&
            supabaseClient
        ) {
            return supabaseClient;
        }

        return null;
    }


    async function loadCurrentUser() {

        const client = getSupabase();

        if (!client) {
            currentUserId = null;
            return null;
        }

        try {

            const {
                data: {
                    user
                }
            } = await client.auth.getUser();

            currentUserId =
                user?.id || null;

            return user || null;

        } catch (error) {

            console.error(
                "Users auth error:",
                error
            );

            currentUserId = null;

            return null;
        }
    }


    /* =====================================================
       حماية HTML
    ===================================================== */

    function escapeHTML(value) {

        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    /* =====================================================
       Toast
    ===================================================== */

    function toast(message) {

        const old =
            document.getElementById(
                "student-users-toast"
            );

        if (old) {
            old.remove();
        }

        const element =
            document.createElement("div");

        element.id =
            "student-users-toast";

        element.textContent =
            message;

        element.style.cssText = `
            position:fixed;
            left:50%;
            bottom:30px;
            transform:translateX(-50%);
            z-index:100001100;
            background:#111;
            color:#fff;
            padding:11px 16px;
            border-radius:13px;
            font-size:13px;
            direction:rtl;
            box-shadow:0 10px 35px rgba(0,0,0,.28);
        `;

        document.body.appendChild(
            element
        );

        setTimeout(
            function () {
                element.remove();
            },
            2200
        );
    }


    /* =====================================================
       Reel Helpers
    ===================================================== */

    function getReelFromButton(button) {

        return button?.closest(
            ".student-reel"
        );
    }


    function getReelId(reel) {

        return reel?.dataset?.id || "";
    }


    /* =====================================================
       جلب Reel
    ===================================================== */

    async function getReel(
        reelId
    ) {

        const client =
            getSupabase();

        if (
            !client ||
            !reelId
        ) {
            return null;
        }

        if (
            usersCache[String(reelId)]
        ) {
            return usersCache[
                String(reelId)
            ];
        }

        try {

            const {
                data,
                error
            } =
                await client
                    .from("reels")
                    .select(`
                        id,
                        user_id,
                        video_url,
                        caption,
                        thumbnail_url,
                        created_at
                    `)
                    .eq(
                        "id",
                        reelId
                    )
                    .maybeSingle();

            if (error) {
                throw error;
            }

            if (data) {

                usersCache[
                    String(data.id)
                ] = data;
            }

            return data || null;

        } catch (error) {

            console.error(
                "Get Reel error:",
                error
            );

            return null;
        }
    }


    /* =====================================================
       Profile
    ===================================================== */

    async function getProfile(
        userId
    ) {

        const client =
            getSupabase();

        if (
            !client ||
            !userId
        ) {
            return {};
        }

        if (
            profileCache[userId]
        ) {
            return profileCache[userId];
        }

        try {

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
                    .eq(
                        "id",
                        userId
                    )
                    .maybeSingle();

            if (error) {
                throw error;
            }

            profileCache[userId] =
                data || {};

            return data || {};

        } catch (error) {

            console.error(
                "Profile error:",
                error
            );

            return {};
        }
    }


    /* =====================================================
       Follow State
    ===================================================== */

    async function isFollowing(
        targetUserId
    ) {

        const client =
            getSupabase();

        if (
            !client ||
            !currentUserId ||
            !targetUserId
        ) {
            return false;
        }

        try {

            const {
                data,
                error
            } =
                await client
                    .from("follows")
                    .select(`
                        follower_id,
                        following_id
                    `)
                    .eq(
                        "follower_id",
                        currentUserId
                    )
                    .eq(
                        "following_id",
                        targetUserId
                    )
                    .maybeSingle();

            if (error) {
                throw error;
            }

            return !!data;

        } catch (error) {

            console.error(
                "Follow state error:",
                error
            );

            return false;
        }
    }


    /* =====================================================
       Follow / Unfollow
    ===================================================== */

    async function toggleFollow(
        targetUserId,
        button
    ) {

        const client =
            getSupabase();

        if (!client) {
            return;
        }

        if (!currentUserId) {
            await loadCurrentUser();
        }

        if (!currentUserId) {

            toast(
                "يجب تسجيل الدخول أولًا."
            );

            return;
        }

        if (
            String(currentUserId) ===
            String(targetUserId)
        ) {
            return;
        }

        button.disabled = true;

        try {

            const following =
                await isFollowing(
                    targetUserId
                );

            if (following) {

                const {
                    error
                } =
                    await client
                        .from("follows")
                        .delete()
                        .eq(
                            "follower_id",
                            currentUserId
                        )
                        .eq(
                            "following_id",
                            targetUserId
                        );

                if (error) {
                    throw error;
                }

                button.textContent =
                    "متابعة";

                button.style.background =
                    "#0095f6";

                button.style.color =
                    "#fff";

                toast(
                    "تم إلغاء المتابعة."
                );

            } else {

                const {
                    error
                } =
                    await client
                        .from("follows")
                        .insert({

                            follower_id:
                                currentUserId,

                            following_id:
                                targetUserId
                        });

                if (error) {
                    throw error;
                }

                button.textContent =
                    "متابَع";

                button.style.background =
                    "#f1f3f5";

                button.style.color =
                    "#222";

                await createFollowNotification(
                    targetUserId
                );

                toast(
                    "تمت المتابعة."
                );
            }

        } catch (error) {

            console.error(
                "Follow error:",
                error
            );

            toast(
                error?.message ||
                "تعذر تحديث المتابعة."
            );

        } finally {

            button.disabled = false;
        }
    }


    /* =====================================================
       Follow Notification
    ===================================================== */

    async function createFollowNotification(
        targetUserId
    ) {

        const client =
            getSupabase();

        if (
            !client ||
            !currentUserId
        ) {
            return;
        }

        try {

            await client
                .from("notifications")
                .insert({

                    user_id:
                        targetUserId,

                    actor_id:
                        currentUserId,

                    type:
                        "follow",

                    title:
                        "متابعة جديدة",

                    body:
                        "بدأ شخص ما بمتابعتك.",

                    reference_type:
                        "user",

                    reference_id:
                        currentUserId,

                    is_read:
                        false
                });

        } catch (error) {

            console.warn(
                "Follow notification skipped:",
                error
            );
        }
    }


    /* =====================================================
       نافذة الإرسال الداخلي
    ===================================================== */

    function closeSendDialog() {

        const dialog =
            document.getElementById(
                "student-reel-send-dialog"
            );

        if (dialog) {
            dialog.remove();
        }

        document.body.style.overflow = "";
    }


    function openSendDialog(
        reelId
    ) {

        closeSendDialog();

        const dialog =
            document.createElement(
                "div"
            );

        dialog.id =
            "student-reel-send-dialog";

        dialog.style.cssText = `
            position:fixed;
            inset:0;
            z-index:100001200;
            display:flex;
            align-items:center;
            justify-content:center;
            padding:20px;
            background:rgba(0,0,0,.55);
            direction:rtl;
        `;

        dialog.innerHTML = `

            <div style="
                width:100%;
                max-width:440px;
                max-height:88vh;
                overflow:hidden;
                background:#fff;
                border-radius:24px;
                box-shadow:0 20px 70px rgba(0,0,0,.3);
                display:flex;
                flex-direction:column;
            ">

                <div style="
                    display:flex;
                    align-items:center;
                    padding:16px;
                    border-bottom:1px solid #eee;
                ">

                    <strong style="
                        flex:1;
                        font-size:18px;
                    ">
                        إرسال Reel
                    </strong>

                    <button
                        id="student-send-close"
                        type="button"
                        style="
                            width:40px;
                            height:40px;
                            border:0;
                            border-radius:50%;
                            background:#f1f3f5;
                            font-size:20px;
                            cursor:pointer;
                        "
                    >
                        ×
                    </button>

                </div>

                <div style="
                    padding:14px;
                    border-bottom:1px solid #eee;
                ">

                    <input
                        id="student-send-search"
                        type="text"
                        placeholder="ابحث عن مستخدم..."
                        style="
                            width:100%;
                            box-sizing:border-box;
                            padding:12px 14px;
                            border:1px solid #ddd;
                            border-radius:14px;
                            outline:none;
                            font-size:14px;
                        "
                    >

                </div>

                <div
                    id="student-send-list"
                    style="
                        flex:1;
                        overflow-y:auto;
                        padding:8px;
                    "
                >

                    <div style="
                        text-align:center;
                        padding:30px;
                        color:#999;
                    ">
                        جاري تحميل المستخدمين...
                    </div>

                </div>

            </div>
        `;

        document.body.appendChild(
            dialog
        );

        dialog
            .querySelector(
                "#student-send-close"
            )
            ?.addEventListener(
                "click",
                closeSendDialog
            );

        dialog.addEventListener(
            "click",
            function(event) {

                if (
                    event.target ===
                    dialog
                ) {
                    closeSendDialog();
                }

            }
        );

        dialog
            .querySelector(
                "#student-send-search"
            )
            ?.addEventListener(
                "input",
                function() {

                    loadSendUsers(
                        reelId,
                        this.value
                    );

                }
            );

        loadSendUsers(
            reelId,
            ""
        );
    }


    /* =====================================================
       Users Search
    ===================================================== */

    async function loadSendUsers(
        reelId,
        searchTerm
    ) {

        const client =
            getSupabase();

        const list =
            document.getElementById(
                "student-send-list"
            );

        if (
            !client ||
            !list
        ) {
            return;
        }

        list.innerHTML = `
            <div style="
                text-align:center;
                padding:30px;
                color:#999;
            ">
                جاري التحميل...
            </div>
        `;

        try {

            let query =
                client
                    .from("profiles")
                    .select(`
                        id,
                        full_name,
                        username,
                        avatar_url
                    `)
                    .neq(
                        "id",
                        currentUserId
                    )
                    .limit(30);

            const clean =
                String(
                    searchTerm || ""
                )
                    .trim()
                    .replace(
                        /[%_]/g,
                        ""
                    );

            if (clean) {

                query =
                    query.or(
                        `username.ilike.%${clean}%,full_name.ilike.%${clean}%`
                    );
            }

            const {
                data,
                error
            } =
                await query;

            if (error) {
                throw error;
            }

            const users =
                data || [];

            if (!users.length) {

                list.innerHTML = `
                    <div style="
                        text-align:center;
                        padding:35px;
                        color:#999;
                    ">
                        لا يوجد مستخدمون.
                    </div>
                `;

                return;
            }

            list.innerHTML =
                users
                    .map(
                        function(user) {

                            return `

                                <button
                                    type="button"
                                    data-send-user="${escapeHTML(
                                        user.id
                                    )}"
                                    style="
                                        width:100%;
                                        display:flex;
                                        align-items:center;
                                        gap:11px;
                                        border:0;
                                        background:#fff;
                                        padding:10px;
                                        border-radius:14px;
                                        cursor:pointer;
                                        text-align:right;
                                    "
                                >

                                    ${
                                        user.avatar_url
                                            ? `
                                                <img
                                                    src="${escapeHTML(
                                                        user.avatar_url
                                                    )}"
                                                    alt=""
                                                    style="
                                                        width:46px;
                                                        height:46px;
                                                        border-radius:50%;
                                                        object-fit:cover;
                                                        flex-shrink:0;
                                                    "
                                                >
                                              `
                                            : `
                                                <div style="
                                                    width:46px;
                                                    height:46px;
                                                    border-radius:50%;
                                                    background:#eaf5ff;
                                                    color:#0095f6;
                                                    display:flex;
                                                    align-items:center;
                                                    justify-content:center;
                                                    flex-shrink:0;
                                                ">
                                                    <i class="
                                                        fa-solid
                                                        fa-user
                                                    "></i>
                                                </div>
                                              `
                                    }

                                    <div style="
                                        flex:1;
                                        min-width:0;
                                    ">

                                        <div style="
                                            font-weight:800;
                                            font-size:13px;
                                        ">
                                            ${escapeHTML(
                                                user.full_name ||
                                                user.username ||
                                                "مستخدم"
                                            )}
                                        </div>

                                        <div style="
                                            color:#999;
                                            font-size:11px;
                                            margin-top:3px;
                                        ">
                                            @${escapeHTML(
                                                user.username ||
                                                ""
                                            )}
                                        </div>

                                    </div>

                                    <span style="
                                        width:36px;
                                        height:36px;
                                        border-radius:50%;
                                        display:flex;
                                        align-items:center;
                                        justify-content:center;
                                        background:#f1f3f5;
                                        color:#0095f6;
                                    ">
                                        <i class="
                                            fa-solid
                                            fa-paper-plane
                                        "></i>
                                    </span>

                                </button>
                            `;
                        }
                    )
                    .join("");

            list
                .querySelectorAll(
                    "[data-send-user]"
                )
                .forEach(
                    function(button) {

                        button.addEventListener(
                            "click",
                            function() {

                                sendReelToUser(
                                    reelId,
                                    this.dataset.sendUser
                                );

                            }
                        );

                    }
                );

        } catch (error) {

            console.error(
                "Send users error:",
                error
            );

            list.innerHTML = `
                <div style="
                    text-align:center;
                    padding:30px;
                    color:#d93025;
                ">
                    تعذر تحميل المستخدمين.
                </div>
            `;
        }
    }


    /* =====================================================
       إرسال Reel داخل Student
    ===================================================== */

    async function sendReelToUser(
        reelId,
        recipientId
    ) {

        const client =
            getSupabase();

        if (
            !client ||
            !currentUserId
        ) {

            toast(
                "يجب تسجيل الدخول أولًا."
            );

            return;
        }

        try {

            const reel =
                await getReel(
                    reelId
                );

            if (!reel) {

                throw new Error(
                    "تعذر العثور على الـReel."
                );
            }

            const {
                error
            } =
                await client
                    .from("messages")
                    .insert({

                        sender_id:
                            currentUserId,

                        recipient_id:
                            recipientId,

                        content:
                            `🎬 Reel من Student\n#reel=${reelId}\n${reel.caption || ""}`
                    });

            if (error) {
                throw error;
            }

            try {

                await client
                    .from("notifications")
                    .insert({

                        user_id:
                            recipientId,

                        actor_id:
                            currentUserId,

                        type:
                            "reel_share",

                        title:
                            "تم إرسال Reel إليك",

                        body:
                            "أرسل لك أحد المستخدمين Reel.",

                        reference_type:
                            "reel",

                        reference_id:
                            reelId,

                        is_read:
                            false
                    });

            } catch (notificationError) {

                console.warn(
                    "Share notification skipped:",
                    notificationError
                );
            }

            closeSendDialog();

            toast(
                "تم إرسال الـReel بنجاح."
            );

        } catch (error) {

            console.error(
                "Send Reel error:",
                error
            );

            toast(
                error?.message ||
                "تعذر إرسال الـReel."
            );
        }
    }


    /* =====================================================
       نافذة المشاركة
    ===================================================== */

    function closeShareMenu() {

        const dialog =
            document.getElementById(
                "student-reel-share-menu"
            );

        if (dialog) {
            dialog.remove();
        }
    }


    async function openShareMenu(
        reelId
    ) {

        closeShareMenu();

        const dialog =
            document.createElement(
                "div"
            );

        dialog.id =
            "student-reel-share-menu";

        dialog.style.cssText = `
            position:fixed;
            inset:0;
            z-index:100001250;
            display:flex;
            align-items:center;
            justify-content:center;
            padding:20px;
            background:rgba(0,0,0,.55);
            direction:rtl;
        `;

        dialog.innerHTML = `

            <div style="
                width:100%;
                max-width:390px;
                background:#fff;
                border-radius:24px;
                padding:20px;
                box-sizing:border-box;
                box-shadow:0 20px 70px rgba(0,0,0,.3);
            ">

                <div style="
                    display:flex;
                    align-items:center;
                    margin-bottom:16px;
                ">

                    <strong style="
                        flex:1;
                        font-size:19px;
                    ">
                        مشاركة Reel
                    </strong>

                    <button
                        id="student-share-menu-close"
                        type="button"
                        style="
                            width:40px;
                            height:40px;
                            border:0;
                            border-radius:50%;
                            background:#f1f3f5;
                            font-size:20px;
                            cursor:pointer;
                        "
                    >
                        ×
                    </button>

                </div>


                <button
                    id="student-share-internal"
                    type="button"
                    style="
                        width:100%;
                        border:0;
                        background:#f7f8fa;
                        padding:16px;
                        border-radius:15px;
                        text-align:right;
                        cursor:pointer;
                        margin-bottom:10px;
                        font-size:14px;
                        font-weight:700;
                    "
                >
                    📤 إرسال إلى مستخدم داخل Student
                </button>


                <button
                    id="student-share-external"
                    type="button"
                    style="
                        width:100%;
                        border:0;
                        background:#f7f8fa;
                        padding:16px;
                        border-radius:15px;
                        text-align:right;
                        cursor:pointer;
                        font-size:14px;
                        font-weight:700;
                    "
                >
                    🔗 مشاركة خارجية / نسخ الرابط
                </button>

            </div>
        `;

        document.body.appendChild(
            dialog
        );


        dialog
            .querySelector(
                "#student-share-menu-close"
            )
            ?.addEventListener(
                "click",
                closeShareMenu
            );


        dialog.addEventListener(
            "click",
            function(event) {

                if (
                    event.target ===
                    dialog
                ) {
                    closeShareMenu();
                }

            }
        );


        dialog
            .querySelector(
                "#student-share-internal"
            )
            ?.addEventListener(
                "click",
                function() {

                    closeShareMenu();

                    openSendDialog(
                        reelId
                    );

                }
            );


        dialog
            .querySelector(
                "#student-share-external"
            )
            ?.addEventListener(
                "click",
                async function() {

                    closeShareMenu();

                    const url =
                        `${location.origin}${location.pathname}#reel=${reelId}`;

                    try {

                        if (
                            navigator.share
                        ) {

                            await navigator.share({

                                title:
                                    "Student Reel",

                                text:
                                    "شاهد هذا الـReel",

                                url:
                                    url
                            });

                        } else {

                            await navigator.clipboard.writeText(
                                url
                            );

                            toast(
                                "تم نسخ رابط الـReel."
                            );
                        }

                    } catch (error) {

                        try {

                            await navigator.clipboard.writeText(
                                url
                            );

                            toast(
                                "تم نسخ الرابط."
                            );

                        } catch (
                            copyError
                        ) {

                            toast(
                                "تعذر مشاركة الرابط."
                            );
                        }
                    }

                }
            );
    }


    /* =====================================================
       معلومات صاحب الـReel
    ===================================================== */

    async function openOwnerProfile(
        reelId
    ) {

        const reel =
            await getReel(
                reelId
            );

        if (!reel) {

            toast(
                "تعذر تحميل بيانات المستخدم."
            );

            return;
        }

        const profile =
            await getProfile(
                reel.user_id
            );

        await showUserDialog(
            reel.user_id,
            profile
        );
    }


    async function openProfileByUserId(userId) {

        if (!userId) {
            toast("تعذر تحديد حساب المستخدم.");
            return;
        }

        const profile = await getProfile(userId);

        if (!profile) {
            toast("تعذر تحميل حساب المستخدم.");
            return;
        }

        let followers = 0;
        let following = 0;

        try {
            const { data } = await getSupabase().rpc(
                "get_profile_stats",
                { p_user_id: userId }
            );

            const stats = Array.isArray(data) ? data[0] : data;
            followers = Number(stats?.followers_count || 0);
            following = Number(stats?.following_count || 0);
        } catch (error) {
            console.error("Public profile stats error:", error);
        }

        const isOwner = String(userId) === String(currentUserId);
        const followingState = isOwner ? false : await isFollowing(userId);

        const avatar = profile.avatar_url
            ? `<img src="${escapeHTML(profile.avatar_url)}" alt="" style="width:96px;height:96px;border-radius:50%;object-fit:cover;">`
            : `<div style="width:96px;height:96px;border-radius:50%;background:#eef4f8;display:flex;align-items:center;justify-content:center;font-size:36px;margin:auto;"><i class="fa-solid fa-user"></i></div>`;

        const content = `
            <div style="padding:8px 4px 18px;text-align:center;">
                <div style="margin-bottom:12px;">${avatar}</div>
                <div style="font-size:21px;font-weight:800;color:#222;">
                    ${escapeHTML(profile.full_name || profile.username || "مستخدم")}
                </div>
                <div style="margin-top:5px;color:#777;direction:ltr;">
                    @${escapeHTML(profile.username || "user")}
                </div>

                <div style="display:flex;justify-content:space-around;border-top:1px solid #eee;border-bottom:1px solid #eee;margin:18px 0;padding:14px 4px;">
                    <div><strong style="display:block;font-size:19px;">${followers}</strong><span style="font-size:12px;color:#777;">المتابعون</span></div>
                    <div><strong style="display:block;font-size:19px;">${following}</strong><span style="font-size:12px;color:#777;">يتابع</span></div>
                </div>

                ${profile.bio ? `<div style="text-align:right;background:#f7f8fa;border-radius:14px;padding:14px;line-height:1.8;color:#555;">${escapeHTML(profile.bio)}</div>` : ""}

                ${isOwner ? "" : `
                    <button
                        type="button"
                        data-public-profile-follow="${escapeHTML(userId)}"
                        style="width:100%;margin-top:18px;border:0;border-radius:13px;padding:13px;font-weight:800;background:${followingState ? "#eef1f4" : "#0095f6"};color:${followingState ? "#222" : "#fff"};"
                    >${followingState ? "متابَع" : "متابعة"}</button>
                `}
            </div>
        `;

        if (typeof window.showFloatingPanel === "function") {
            window.showFloatingPanel("الملف الشخصي", content);
        } else if (typeof showFloatingPanel === "function") {
            showFloatingPanel("الملف الشخصي", content);
        } else {
            await showUserDialog(userId, profile);
        }
    }


    function closeUserDialog() {

        const dialog =
            document.getElementById(
                "student-reel-user-dialog"
            );

        if (dialog) {
            dialog.remove();
        }
    }


    async function showUserDialog(
        userId,
        profile
    ) {

        closeUserDialog();

        const dialog =
            document.createElement(
                "section"
            );

        dialog.id =
            "student-reel-user-dialog";

        dialog.setAttribute(
            "role",
            "dialog"
        );

        dialog.setAttribute(
            "aria-modal",
            "true"
        );

        dialog.style.cssText = `
            position:fixed;
            inset:0;
            z-index:100001150;
            background:#fff;
            color:#111;
            overflow-y:auto;
            direction:rtl;
        `;

        dialog.innerHTML = `
            <header style="
                position:sticky;
                top:0;
                z-index:2;
                min-height:58px;
                display:flex;
                align-items:center;
                justify-content:center;
                padding:8px 58px;
                border-bottom:1px solid #ececec;
                background:rgba(255,255,255,.96);
                backdrop-filter:blur(12px);
                box-sizing:border-box;
            ">
                <button
                    id="student-user-dialog-close"
                    type="button"
                    aria-label="رجوع"
                    style="
                        position:absolute;
                        right:10px;
                        top:9px;
                        width:40px;
                        height:40px;
                        border:0;
                        background:transparent;
                        cursor:pointer;
                        font-size:25px;
                        line-height:1;
                    "
                >
                    <i class="fa-solid fa-arrow-right"></i>
                </button>

                <strong style="
                    max-width:100%;
                    overflow:hidden;
                    text-overflow:ellipsis;
                    white-space:nowrap;
                    font-size:17px;
                ">
                    @${escapeHTML(profile.username || "user")}
                </strong>
            </header>

            <main style="
                width:min(100%, 560px);
                margin:0 auto;
                padding:28px 20px 40px;
                box-sizing:border-box;
            ">
                <section style="
                    display:flex;
                    align-items:center;
                    gap:18px;
                ">
                    ${
                        profile.avatar_url
                            ? `
                                <img
                                    src="${escapeHTML(profile.avatar_url)}"
                                    alt=""
                                    style="
                                        width:92px;
                                        height:92px;
                                        border-radius:50%;
                                        object-fit:cover;
                                        flex-shrink:0;
                                    "
                                >
                              `
                            : `
                                <div style="
                                    width:92px;
                                    height:92px;
                                    border-radius:50%;
                                    background:#f1f3f5;
                                    color:#666;
                                    display:flex;
                                    align-items:center;
                                    justify-content:center;
                                    font-size:34px;
                                    flex-shrink:0;
                                ">
                                    <i class="fa-solid fa-user"></i>
                                </div>
                              `
                    }

                    <div style="
                        flex:1;
                        min-width:0;
                    ">
                        <h2 style="
                            margin:0;
                            font-size:21px;
                            line-height:1.4;
                            overflow-wrap:anywhere;
                        ">
                            ${escapeHTML(
                                profile.full_name ||
                                profile.username ||
                                "مستخدم"
                            )}
                        </h2>

                        <div style="
                            margin-top:5px;
                            color:#777;
                            font-size:14px;
                            overflow-wrap:anywhere;
                        ">
                            @${escapeHTML(profile.username || "")}
                        </div>
                    </div>
                </section>

                ${
                    profile.bio
                        ? `
                            <p style="
                                margin:22px 0 0;
                                font-size:15px;
                                line-height:1.8;
                                white-space:pre-wrap;
                                overflow-wrap:anywhere;
                            ">
                                ${escapeHTML(profile.bio)}
                            </p>
                          `
                        : ""
                }

                <div
                    id="student-user-follow-area"
                    style="margin-top:24px;"
                ></div>
            </main>
        `;

        document.body.appendChild(
            dialog
        );

        document.body.style.overflow =
            "hidden";

        const closeProfile = function() {
            document.body.style.overflow = "";
            closeUserDialog();
        };

        dialog
            .querySelector(
                "#student-user-dialog-close"
            )
            ?.addEventListener(
                "click",
                closeProfile
            );

        const area =
            dialog.querySelector(
                "#student-user-follow-area"
            );

        if (
            String(userId) ===
            String(currentUserId)
        ) {
            area.innerHTML = `
                <div style="
                    padding:12px;
                    border-radius:12px;
                    background:#f1f3f5;
                    color:#666;
                    text-align:center;
                    font-weight:700;
                ">
                    هذا حسابك
                </div>
            `;

            return;
        }

        const following =
            await isFollowing(
                userId
            );

        const button =
            document.createElement(
                "button"
            );

        button.type =
            "button";

        button.textContent =
            following
                ? "إلغاء المتابعة"
                : "متابعة";

        button.style.cssText = `
            width:100%;
            border:0;
            padding:13px;
            border-radius:12px;
            cursor:pointer;
            font-weight:800;
            font-size:15px;
            background:${following ? "#f1f3f5" : "#0095f6"};
            color:${following ? "#222" : "#fff"};
        `;

        button.addEventListener(
            "click",
            function() {
                toggleFollow(
                    userId,
                    button
                );
            }
        );

        area.appendChild(
            button
        );
    }


    /* =====================================================
       تحسين الـReels
    ===================================================== */

    async function enhanceReels() {

        await loadCurrentUser();

        const reels =
            document.querySelectorAll(
                ".student-reel"
            );


        for (
            const reel of reels
        ) {

            const reelId =
                getReelId(
                    reel
                );


            if (!reelId) {
                continue;
            }


            const data =
                await getReel(
                    reelId
                );


            if (!data) {
                continue;
            }


            usersCache[
                String(reelId)
            ] = data;


            profileCache[
                String(data.user_id)
            ] =
                profileCache[
                    String(data.user_id)
                ] ||
                await getProfile(
                    data.user_id
                );


            reel.dataset.userId =
                data.user_id;


            const owner =
                String(
                    data.user_id
                ) ===
                String(
                    currentUserId
                );


            /* =============================================
               فتح حساب المستخدم من الصورة أو اليوزر
            ============================================= */

            reel
                .querySelectorAll("[data-user-profile], .student-reel-name")
                .forEach(function(element) {

                    if (element.dataset.userBound) return;

                    element.dataset.userBound = "true";
                    element.style.cursor = "pointer";

                    element.addEventListener("click", function(event) {
                        event.preventDefault();
                        event.stopPropagation();
                        openProfileByUserId(data.user_id);
                    });
                });


            /* =============================================
               زر المتابعة
            ============================================= */

            if (!owner) {

                const followSlot =
                    reel.querySelector("[data-follow-slot]") ||
                    reel.querySelector(".student-reel-user-row") ||
                    reel.querySelector(".student-reel-top");

                const existingFollowButtons = Array.from(
                    reel.querySelectorAll("[data-user-follow]")
                );

                existingFollowButtons.slice(1).forEach(function(existing) {
                    existing.remove();
                });

                if (
                    followSlot &&
                    followSlot.dataset.followLoading !== "true"
                ) {

                    followSlot.dataset.followLoading = "true";

                    let follow = followSlot.querySelector("[data-user-follow]");

                    if (!follow) {
                        follow = document.createElement("button");
                        follow.type = "button";
                        follow.dataset.userFollow = "true";
                        followSlot.replaceChildren(follow);
                    }

                    follow.dataset.realFollowButton = "true";

                    const following = await isFollowing(data.user_id);

                    follow.textContent = following ? "متابَع" : "متابعة";
                    follow.classList.toggle("is-following", following);


                    follow.style.cssText = `
                        min-width:76px;
                        height:38px;
                        border:1.5px solid rgba(255,255,255,.95);
                        padding:0 15px;
                        border-radius:11px;
                        cursor:pointer;
                        font-size:14px;
                        font-weight:900;
                        font-family:inherit;
                        line-height:1;
                        background:${following ? "rgba(255,255,255,.18)" : "rgba(0,0,0,.18)"};
                        color:#fff;
                        text-shadow:0 1px 4px rgba(0,0,0,.8);
                        backdrop-filter:blur(5px);
                        -webkit-backdrop-filter:blur(5px);
                        box-shadow:0 1px 4px rgba(0,0,0,.25);
                        transition:transform .15s ease, background .15s ease;
                    `;


                    followSlot.dataset.followLoading = "false";
                }
            }


            /* =============================================
               تحويل زر المشاركة الأصلي
            ============================================= */

            const shareButton =
                reel.querySelector(
                    "[data-share]"
                );


            if (
                shareButton &&
                !shareButton.dataset.studentShareConverted
            ) {

                shareButton.removeAttribute(
                    "data-share"
                );


                shareButton.dataset.studentShare =
                    "true";


                shareButton.dataset.studentShareConverted =
                    "true";
            }

        }
    }


    /* =====================================================
       أزرار المستخدمين والمشاركة
    ===================================================== */

    function bindUserButtons() {

        /* ---------------------------------------------
           زر المشاركة
        --------------------------------------------- */

        document.addEventListener(
            "click",
            function(event) {

                const shareButton =
                    event.target.closest(
                        ".student-reel [data-student-share]"
                    );


                if (shareButton) {

                    event.preventDefault();
                    event.stopImmediatePropagation();


                    const reel =
                        getReelFromButton(
                            shareButton
                        );


                    const reelId =
                        getReelId(
                            reel
                        );


                    if (reelId) {

                        openShareMenu(
                            reelId
                        );
                    }


                    return;
                }

            },
            true
        );


        /* ---------------------------------------------
           فتح الحساب مباشرة من الصورة أو اليوزر
        --------------------------------------------- */

        document.addEventListener(
            "click",
            function(event) {
                const target = event.target.closest(
                    ".student-reel [data-user-profile], .student-reel .student-reel-name"
                );

                if (!target) return;

                const reel = target.closest(".student-reel");
                const userId =
                    target.dataset.userId ||
                    reel?.dataset?.userId ||
                    reel?.getAttribute("data-user-id");

                if (!userId) {
                    console.warn("Reel profile click: missing user id");
                    return;
                }

                event.preventDefault();
                event.stopImmediatePropagation();
                void openProfileByUserId(userId);
            },
            true
        );

        /* ---------------------------------------------
           متابعة
        --------------------------------------------- */

        document.addEventListener(
            "click",
            async function(event) {

                const follow = event.target.closest(
                    ".student-reel [data-user-follow]"
                );

                if (!follow) return;

                const reel = follow.closest(".student-reel");
                const userId = reel?.dataset?.userId;

                if (!userId || follow.dataset.busy === "true") return;

                event.preventDefault();
                event.stopImmediatePropagation();

                follow.dataset.busy = "true";
                try {
                    await toggleFollow(userId, follow);
                    follow.classList.toggle(
                        "is-following",
                        follow.textContent.trim() === "متابَع"
                    );
                } finally {
                    follow.dataset.busy = "false";
                }
            },
            true
        );

        document.addEventListener(
            "click",
            async function(event) {
                const button = event.target.closest("[data-public-profile-follow]");
                if (!button || button.dataset.busy === "true") return;

                event.preventDefault();
                const userId = button.dataset.publicProfileFollow;
                button.dataset.busy = "true";

                try {
                    await toggleFollow(userId, button);
                } finally {
                    button.dataset.busy = "false";
                }
            }
        );
    }


    /* =====================================================
       مراقبة DOM
    ===================================================== */

    function observeDOM() {

        const observer =
            new MutationObserver(
                function() {

                    enhanceReels();

                }
            );


        observer.observe(
            document.body,
            {
                childList:true,
                subtree:true
            }
        );
    }


    /* =====================================================
       API
    ===================================================== */

    window.StudentReelsUsers =
        window.StudentReelsUsers ||
        {};


    window.StudentReelsUsers.openSend =
        openSendDialog;


    window.StudentReelsUsers.openShare =
        openShareMenu;


    window.StudentReelsUsers.toggleFollow =
        toggleFollow;

    window.StudentReelsUsers.openProfileByUserId =
        openProfileByUserId;


    /* =====================================================
       Start
    ===================================================== */

    async function start() {

        /*
         * اربط النقرات فورًا قبل أي طلب شبكة.
         * انتظار Supabase هنا كان يجعل الصورة واليوزر والمتابعة
         * غير مستجيبة عندما يتأخر تحميل الجلسة.
         */
        bindUserButtons();
        observeDOM();

        try {
            await loadCurrentUser();
        } catch (error) {
            console.error("Reels users session error:", error);
        }

        try {
            await enhanceReels();
        } catch (error) {
            console.error("Reels users enhance error:", error);
        }
    }


    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            start,
            {
                once:true
            }
        );

    } else {

        start();
    }


})();
