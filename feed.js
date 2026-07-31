/* =========================================================
   Student - Feed System
   Text Posts + Images ONLY
   Reels are displayed in reels.js
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
                    "saved.js";


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
