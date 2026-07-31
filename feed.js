/* =========================================================
   Student - Feed System
   عرض المنشورات والصور وReels
========================================================= */

(function () {
    "use strict";

    if (window.__studentFeedLoaded) return;
    window.__studentFeedLoaded = true;

    let feedContainer = null;
    let loading = false;

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
            document.createElement("style");

        style.id =
            "student-feed-style";

        style.textContent = `

            .student-feed-container {
                width:100%;
                max-width:680px;
                margin:0 auto;
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
                    studentFeedSpin .7s linear infinite;
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
            }

            .student-feed-username {
                margin-top:3px;
                font-size:11px;
                color:#0095f6;
                direction:ltr;
                text-align:right;
            }

            .student-feed-time {
                font-size:11px;
                color:#999;
                white-space:nowrap;
            }

            .student-feed-text {
                padding:
                    0 14px 14px;
                color:#333;
                line-height:1.8;
                white-space:pre-wrap;
                word-break:break-word;
            }

            .student-feed-image {
                width:100%;
                max-height:650px;
                display:block;
                object-fit:cover;
                background:#f3f4f6;
            }

            .student-feed-caption {
                padding:13px 14px;
                color:#444;
                line-height:1.7;
            }

            .student-feed-reel {
                position:relative;
                width:100%;
                background:#000;
            }

            .student-feed-reel video {
                width:100%;
                max-height:650px;
                display:block;
                background:#000;
                object-fit:cover;
            }

            .student-feed-reel-label {
                position:absolute;
                top:12px;
                right:12px;
                padding:6px 9px;
                border-radius:10px;
                background:rgba(0,0,0,.6);
                color:#fff;
                font-size:11px;
                font-weight:700;
            }

            .student-feed-actions {
                display:flex;
                align-items:center;
                gap:5px;
                padding:10px 12px;
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
            }

            .student-feed-action:hover {
                background:#f3f5f7;
            }

            .student-feed-action.save {
                margin-right:auto;
            }

            .student-feed-type {
                margin-right:3px;
                padding:5px 8px;
                border-radius:8px;
                background:#f1f3f5;
                color:#777;
                font-size:10px;
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
                margin-bottom:8px;
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

        document.head.appendChild(style);
    }


    /* =====================================================
       الوقت
    ===================================================== */

    function formatDate(value) {

        if (!value) return "";

        const date = new Date(value);

        if (isNaN(date.getTime())) {
            return "";
        }

        return date.toLocaleString(
            "ar-IQ",
            {
                dateStyle:"medium",
                timeStyle:"short"
            }
        );
    }


    /* =====================================================
       إنشاء Feed
    ===================================================== */

    function createFeedContainer() {

        if (feedContainer) {
            return feedContainer;
        }

        const mainContent =
            document.querySelector(
                ".main-content"
            );

        if (!mainContent) {
            return null;
        }

        /*
           نضع الـFeed أسفل البطاقات الحالية
        */

        feedContainer =
            document.createElement("div");

        feedContainer.id =
            "student-feed-container";

        feedContainer.className =
            "student-feed-container";

        mainContent.appendChild(
            feedContainer
        );

        return feedContainer;
    }


    /* =====================================================
       حالة التحميل
    ===================================================== */

    function showLoading() {

        if (!feedContainer) return;

        feedContainer.innerHTML = `

            <div class="
                student-feed-loading
            ">

                <div class="
                    student-feed-spinner
                "></div>

                جاري تحميل المنشورات...

            </div>
        `;
    }


    /* =====================================================
       تحميل Posts
    ===================================================== */

    async function loadPosts() {

        const client =
            getSupabase();

        if (!client) {
            return [];
        }

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
                .order(
                    "created_at",
                    {
                        ascending:false
                    }
                )
                .limit(30);

        if (error) {
            throw error;
        }

        return data || [];
    }


    /* =====================================================
       تحميل Reels
    ===================================================== */

    async function loadReels() {

        const client =
            getSupabase();

        if (!client) {
            return [];
        }

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
                    created_at,
                    updated_at
                `)
                .order(
                    "created_at",
                    {
                        ascending:false
                    }
                )
                .limit(30);

        if (error) {
            throw error;
        }

        return data || [];
    }


    /* =====================================================
       تحميل Profiles
    ===================================================== */

    async function loadProfiles(
        userIds
    ) {

        const client =
            getSupabase();

        if (
            !client ||
            !userIds.length
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
                    userIds
                );

        if (error) {
            console.error(
                "Profiles feed error:",
                error
            );

            return {};
        }

        const map = {};

        (data || []).forEach(
            function(profile) {

                map[
                    profile.id
                ] = profile;
            }
        );

        return map;
    }


    /* =====================================================
       دمج المحتوى
    ===================================================== */

    function combineContent(
        posts,
        reels
    ) {

        const postItems =
            posts.map(
                function(post) {

                    return {
                        kind:"post",
                        sortDate:
                            post.created_at,
                        data:post
                    };
                }
            );


        const reelItems =
            reels.map(
                function(reel) {

                    return {
                        kind:"reel",
                        sortDate:
                            reel.created_at,
                        data:reel
                    };
                }
            );


        return [
            ...postItems,
            ...reelItems
        ].sort(
            function(a,b) {

                return (
                    new Date(
                        b.sortDate
                    ) -
                    new Date(
                        a.sortDate
                    )
                );
            }
        );
    }


    /* =====================================================
       صورة المستخدم
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
       بطاقة المحتوى
    ===================================================== */

    function renderCard(
        item,
        profiles
    ) {

        const data =
            item.data;

        const profile =
            profiles[
                data.user_id
            ] || {};

        const name =
            profile.full_name ||
            profile.username ||
            "مستخدم";

        const username =
            profile.username ||
            "username";


        let body = "";


        if (
            item.kind ===
            "post"
        ) {

            if (
                data.post_type ===
                "image" &&
                data.media_url
            ) {

                body = `

                    <img
                        class="
                            student-feed-image
                        "
                        src="${escapeHTML(
                            data.media_url
                        )}"
                        alt=""
                        loading="lazy"
                    >

                    ${
                        data.content
                            ? `
                                <div class="
                                    student-feed-caption
                                ">
                                    ${escapeHTML(
                                        data.content
                                    )}
                                </div>
                              `
                            : ""
                    }
                `;

            } else {

                body = `

                    <div class="
                        student-feed-text
                    ">
                        ${escapeHTML(
                            data.content ||
                            ""
                        )}
                    </div>
                `;
            }

        } else {

            body = `

                <div class="
                    student-feed-reel
                ">

                    <video
                        src="${escapeHTML(
                            data.video_url
                        )}"
                        controls
                        playsinline
                        preload="metadata"
                    ></video>

                    <div class="
                        student-feed-reel-label
                    ">
                        🎬 Reels
                    </div>

                </div>


                ${
                    data.caption
                        ? `
                            <div class="
                                student-feed-caption
                            ">
                                ${escapeHTML(
                                    data.caption
                                )}
                            </div>
                          `
                        : ""
                }
            `;
        }


        const typeLabel =
            item.kind ===
            "reel"
                ? "Reels"
                : data.post_type ===
                  "image"
                    ? "صورة"
                    : "نص";


        return `

            <article
                class="
                    student-feed-card
                "
                data-feed-kind="${item.kind}"
                data-feed-id="${escapeHTML(
                    data.id
                )}"
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
                                data.created_at
                            )
                        )}
                    </div>

                </div>


                ${body}


                <div class="
                    student-feed-actions
                ">

                    <span class="
                        student-feed-type
                    ">
                        ${typeLabel}
                    </span>


                    <button
                        class="
                            student-feed-action
                        "
                        type="button"
                        title="إعجاب"
                        data-feed-like
                    >
                        <i class="
                            fa-regular
                            fa-heart
                        "></i>
                    </button>


                    <button
                        class="
                            student-feed-action
                        "
                        type="button"
                        title="تعليق"
                        data-feed-comment
                    >
                        <i class="
                            fa-regular
                            fa-comment
                        "></i>
                    </button>


                    <button
                        class="
                            student-feed-action
                        "
                        type="button"
                        title="مشاركة"
                        data-feed-share
                    >
                        <i class="
                            fa-solid
                            fa-share
                        "></i>
                    </button>


                    <button
                        class="
                            student-feed-action
                            save
                        "
                        type="button"
                        title="حفظ"
                        data-feed-save
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
       العرض
    ===================================================== */

    async function loadFeed() {

        if (loading) {
            return;
        }

        loading = true;


        try {

            if (!feedContainer) {
                createFeedContainer();
            }


            if (!feedContainer) {
                return;
            }


            showLoading();


            const [
                posts,
                reels
            ] =
                await Promise.all([
                    loadPosts(),
                    loadReels()
                ]);


            const allItems =
                combineContent(
                    posts,
                    reels
                );


            if (!allItems.length) {

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
                            كن أول من ينشر شيئًا في Student.
                        </div>

                    </div>
                `;

                return;
            }


            const ids =
                Array.from(
                    new Set(
                        allItems.map(
                            function(item) {
                                return item.data.user_id;
                            }
                        )
                    )
                );


            const profiles =
                await loadProfiles(
                    ids
                );


            feedContainer.innerHTML = `

                <button
                    id="student-feed-refresh"
                    class="student-feed-refresh"
                    type="button"
                >
                    <i class="
                        fa-solid
                        fa-rotate
                    "></i>
                    تحديث المنشورات
                </button>


                ${allItems.map(
                    function(item) {

                        return renderCard(
                            item,
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
                        student-feed-empty
                    ">

                        <div class="
                            student-feed-empty-icon
                        ">
                            ⚠️
                        </div>

                        <div style="
                            font-weight:800;
                            color:#555;
                            margin-bottom:7px;
                        ">
                            تعذر تحميل المنشورات
                        </div>

                        <div style="
                            font-size:12px;
                            line-height:1.8;
                        ">
                            تحقق من اتصال التطبيق
                            وقواعد الوصول إلى البيانات.
                        </div>

                    </div>
                `;
            }

        } finally {

            loading = false;
        }
    }


    /* =====================================================
       إجراءات الواجهة
       لا ننفذ الإعجاب والتعليق والحفظ الآن
       حتى نبني جداولها بالشكل الصحيح.
    ===================================================== */

    function bindFeedActions() {

        if (!feedContainer) {
            return;
        }


        feedContainer
            .querySelectorAll(
                "[data-feed-like]"
            )
            .forEach(
                function(button) {

                    button.addEventListener(
                        "click",
                        function() {

                            showTemporaryMessage(
                                "سيتم تفعيل الإعجاب قريبًا."
                            );
                        }
                    );
                }
            );


        feedContainer
            .querySelectorAll(
                "[data-feed-comment]"
            )
            .forEach(
                function(button) {

                    button.addEventListener(
                        "click",
                        function() {

                            showTemporaryMessage(
                                "سيتم تفعيل التعليقات قريبًا."
                            );
                        }
                    );
                }
            );


        feedContainer
            .querySelectorAll(
                "[data-feed-share]"
            )
            .forEach(
                function(button) {

                    button.addEventListener(
                        "click",
                        async function() {

                            const card =
                                button.closest(
                                    "[data-feed-id]"
                                );

                            const id =
                                card?.dataset.feedId;

                            if (
                                navigator.share
                            ) {

                                try {

                                    await navigator.share({
                                        title:
                                            "Student",
                                        text:
                                            "شاهد هذا المحتوى في Student",
                                        url:
                                            window.location.href +
                                            "#content-" +
                                            id
                                    });

                                } catch (error) {

                                    if (
                                        error?.name !==
                                        "AbortError"
                                    ) {

                                        showTemporaryMessage(
                                            "تعذر المشاركة."
                                        );
                                    }
                                }

                            } else {

                                showTemporaryMessage(
                                    "المشاركة ستتوفر قريبًا."
                                );
                            }
                        }
                    );
                }
            );


        feedContainer
            .querySelectorAll(
                "[data-feed-save]"
            )
            .forEach(
                function(button) {

                    button.addEventListener(
                        "click",
                        async function() {

                            const card =
                                button.closest(
                                    "[data-feed-id]"
                                );

                            const kind =
                                card?.dataset.feedKind;

                            const id =
                                card?.dataset.feedId;


                            if (
                                typeof window.saveStudentItem ===
                                "function"
                            ) {

                                const result =
                                    await window.saveStudentItem(
                                        kind ===
                                            "reel"
                                            ? "reel"
                                            : "post",
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

                                    showTemporaryMessage(
                                        "تم حفظ المحتوى."
                                    );

                                    return;
                                }
                            }


                            showTemporaryMessage(
                                "تعذر حفظ المحتوى حاليًا."
                            );
                        }
                    );
                }
            );
    }


    /* =====================================================
       رسالة مؤقتة
    ===================================================== */

    function showTemporaryMessage(
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

        element.style.boxShadow =
            "0 8px 30px rgba(0,0,0,.2)";

        element.style.direction =
            "rtl";


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
       إعادة تحميل تلقائية عند العودة للرئيسية
    ===================================================== */

    function startFeed() {

        injectStyles();

        createFeedContainer();

        /*
           ننتظر قليلًا حتى تكون
           واجهة التطبيق جاهزة.
        */

        setTimeout(
            loadFeed,
            700
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
