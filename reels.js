/* =========================================================
   Student - Reels
   Reels بجانب Stories + تصفح عمودي مثل TikTok
========================================================= */

(function () {

    "use strict";

    if (window.__studentReelsLoaded) return;

    window.__studentReelsLoaded = true;


    let overlay = null;
    let reels = [];
    let profiles = {};
    let currentIndex = 0;
    let currentUserId = null;
    let loading = false;


    /* =====================================================
       Supabase
    ===================================================== */

    function getSupabase() {

        return (
            typeof supabaseClient !== "undefined"
                ? supabaseClient
                : null
        );
    }


    async function waitForSupabase() {

        for (let i = 0; i < 50; i++) {

            if (getSupabase()) {
                return getSupabase();
            }

            await new Promise(function (resolve) {
                setTimeout(resolve, 200);
            });
        }

        return null;
    }


    /* =====================================================
       حماية النص
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

    function styles() {

        if (
            document.getElementById(
                "student-reels-style"
            )
        ) {
            return;
        }

        const style =
            document.createElement("style");

        style.id =
            "student-reels-style";

        style.textContent = `

        #student-reels-overlay {
            position:fixed;
            inset:0;
            background:#000;
            z-index:99999999;
            display:none;
            direction:rtl;
        }

        #student-reels-overlay.show {
            display:block;
        }

        .student-reels-scroll {
            width:100%;
            height:100%;
            overflow-y:auto;
            scroll-snap-type:y mandatory;
            scrollbar-width:none;
        }

        .student-reels-scroll::-webkit-scrollbar {
            display:none;
        }

        .student-reel {
            position:relative;
            width:100%;
            height:100dvh;
            min-height:100vh;
            background:#000;
            scroll-snap-align:start;
            scroll-snap-stop:always;
            overflow:hidden;
        }

        .student-reel video {
            width:100%;
            height:100%;
            object-fit:cover;
            display:block;
            background:#000;
        }

        .student-reel-top {
            position:absolute;
            top:0;
            left:0;
            right:0;
            z-index:5;
            padding:15px;
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:10px;
            background:
                linear-gradient(
                    to bottom,
                    rgba(0,0,0,.6),
                    transparent
                );
        }

        .student-reel-title {
            color:#fff;
            font-size:18px;
            font-weight:800;
        }

        .student-reel-publish {
            border:none;
            background:#0095f6;
            color:#fff;
            padding:9px 13px;
            border-radius:12px;
            font-weight:700;
            cursor:pointer;
            font-size:13px;
            margin-right:auto;
        }

        .student-reel-close {
            width:42px;
            height:42px;
            border:0;
            border-radius:50%;
            background:rgba(0,0,0,.5);
            color:#fff;
            font-size:20px;
            cursor:pointer;
        }

        .student-reel-user {
            position:absolute;
            right:15px;
            bottom:25px;
            left:85px;
            z-index:5;
            color:#fff;
            text-shadow:0 1px 5px #000;
        }

        .student-reel-name {
            font-size:16px;
            font-weight:800;
            margin-bottom:4px;
        }

        .student-reel-caption {
            font-size:13px;
            line-height:1.7;
            margin-top:8px;
            white-space:pre-wrap;
        }

        .student-reel-actions {
            position:absolute;
            left:10px;
            bottom:25px;
            z-index:6;
            display:flex;
            flex-direction:column;
            gap:12px;
        }

        .student-reel-action {
            width:48px;
            height:48px;
            border:0;
            border-radius:50%;
            background:rgba(0,0,0,.5);
            color:#fff;
            font-size:20px;
            cursor:pointer;
            display:flex;
            align-items:center;
            justify-content:center;
        }

        .student-reel-action.active {
            color:#ff3040;
        }

        .student-reel-action.saved {
            color:#ffd400;
        }

        .student-reel-menu {
            position:absolute;
            left:70px;
            bottom:20px;
            width:210px;
            background:#fff;
            border-radius:15px;
            overflow:hidden;
            display:none;
            z-index:20;
            box-shadow:
                0 15px 40px
                rgba(0,0,0,.35);
        }

        .student-reel-menu.show {
            display:block;
        }

        .student-reel-menu button {
            width:100%;
            border:0;
            background:#fff;
            padding:14px;
            text-align:right;
            cursor:pointer;
            border-bottom:1px solid #eee;
            font-size:14px;
        }

        .student-reel-menu button:last-child {
            border-bottom:0;
        }

        .student-reel-menu .danger {
            color:#d93025;
        }

        /* زر Reels بجانب Stories */

        #student-reels-entry {
            flex:0 0 auto !important;
            width:auto !important;
            height:auto !important;
            margin:0 !important;
            padding:0 !important;
            border:0 !important;
            background:transparent !important;
            cursor:pointer !important;
            text-align:center !important;
        }

        #student-reels-entry .student-reels-entry-inner {
            display:flex;
            flex-direction:column;
            align-items:center;
            justify-content:flex-start;
        }

        #student-reels-entry .student-reels-entry-circle {
            display:flex;
            align-items:center;
            justify-content:center;
            overflow:hidden;
            background:
                linear-gradient(
                    135deg,
                    #111,
                    #444
                );
            color:#fff;
            border:3px solid #fff;
            box-sizing:border-box;
            box-shadow:
                0 2px 8px
                rgba(0,0,0,.12);
            font-size:22px;
        }

        #student-reels-entry .student-reels-entry-name {
            margin-top:5px;
            font-size:11px;
            color:#333;
            line-height:1.2;
            white-space:nowrap;
        }

        `;

        document.head.appendChild(style);
    }


    /* =====================================================
       إضافة زر Reels بحجم Story نفسه
    ===================================================== */

    function addReelsEntry() {

        const storiesContainer =
            findStoriesContainer();

        if (!storiesContainer) {
            return false;
        }

        const old =
            document.getElementById(
                "student-reels-entry"
            );

        if (old) {

            storiesContainer.appendChild(old);

            return true;
        }

        const story =
            storiesContainer.querySelector(
                ".story"
            );

        if (!story) {
            return false;
        }

        const rect =
            story.getBoundingClientRect();

        const entry =
            document.createElement("button");

        entry.id =
            "student-reels-entry";

        entry.type =
            "button";

        entry.innerHTML = `

            <span class="
                student-reels-entry-inner
            ">

                <span
                    class="
                        student-reels-entry-circle
                    "
                    style="
                        width:${rect.width}px;
                        height:${rect.width}px;
                    "
                >
                    🎬
                </span>

                <span
                    class="
                        student-reels-entry-name
                    "
                >
                    Reels
                </span>

            </span>
        `;

        entry.addEventListener(
            "click",
            function (event) {

                event.preventDefault();
                event.stopPropagation();

                openReels(0);
            }
        );

        storiesContainer.appendChild(
            entry
        );

        resizeEntry();

        return true;
    }


    /* =====================================================
       العثور على حاوية Stories
    ===================================================== */

    function findStoriesContainer() {

        const story =
            document.querySelector(
                ".story"
            );

        if (!story) {
            return null;
        }

        return story.parentElement || null;
    }


    /* =====================================================
       ضبط حجم Reels مثل Story
    ===================================================== */

    function resizeEntry() {

        const entry =
            document.getElementById(
                "student-reels-entry"
            );

        const story =
            document.querySelector(
                ".story"
            );

        if (
            !entry ||
            !story
        ) {
            return;
        }

        const circle =
            entry.querySelector(
                ".student-reels-entry-circle"
            );

        if (!circle) {
            return;
        }

        const rect =
            story.getBoundingClientRect();

        circle.style.width =
            `${rect.width}px`;

        circle.style.height =
            `${rect.width}px`;
    }


    /* =====================================================
       مراقبة Stories حتى لا يختفي الزر
    ===================================================== */

    function protectReelsEntry() {

        const observer =
            new MutationObserver(
                function () {

                    setTimeout(
                        function () {

                            addReelsEntry();
                            resizeEntry();

                        },
                        50
                    );
                }
            );

        observer.observe(
            document.body,
            {
                childList:true,
                subtree:true
            }
        );

        window.addEventListener(
            "resize",
            resizeEntry
        );
    }


    /* =====================================================
       إنشاء شاشة Reels
    ===================================================== */

    function createOverlay() {

        if (overlay) {
            return;
        }

        overlay =
            document.createElement(
                "div"
            );

        overlay.id =
            "student-reels-overlay";

        overlay.innerHTML = `

            <div
                id="student-reels-scroll"
                class="student-reels-scroll"
            ></div>
        `;

        document.body.appendChild(
            overlay
        );
    }


    /* =====================================================
       فتح Reels
    ===================================================== */

    async function openReels(
        start = 0
    ) {

        if (loading) {
            return;
        }

        styles();
        createOverlay();

        overlay.classList.add(
            "show"
        );

        await loadReels();

        if (!reels.length) {

            showEmpty();

            return;
        }

        currentIndex =
            Math.max(
                0,
                Math.min(
                    start,
                    reels.length - 1
                )
            );

        renderReels();

        setTimeout(
            function () {

                scrollToReel(
                    currentIndex,
                    false
                );

            },
            50
        );
    }


    /* =====================================================
       إغلاق
    ===================================================== */

    function closeReels() {

        if (!overlay) {
            return;
        }

        overlay
            .querySelectorAll("video")
            .forEach(
                function(video) {

                    video.pause();

                }
            );

        overlay.classList.remove(
            "show"
        );
    }


    /* =====================================================
       تحميل Reels
    ===================================================== */

    async function loadReels() {

        loading = true;

        const client =
            await waitForSupabase();

        if (!client) {

            loading = false;
            reels = [];

            return;
        }

        try {

            const {
                data:{
                    user
                }
            } =
                await client.auth.getUser();

            currentUserId =
                user?.id || null;

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
                        visibility,
                        is_archived,
                        created_at
                    `)
                    .eq(
                        "visibility",
                        "public"
                    )
                    .eq(
                        "is_archived",
                        false
                    )
                    .order(
                        "created_at",
                        {
                            ascending:false
                        }
                    )
                    .limit(50);

            if (error) {
                throw error;
            }

            reels =
                data || [];

            if (currentUserId) {

                const {
                    data:mine
                } =
                    await client
                        .from("reels")
                        .select(`
                            id,
                            user_id,
                            video_url,
                            caption,
                            thumbnail_url,
                            visibility,
                            is_archived,
                            created_at
                        `)
                        .eq(
                            "user_id",
                            currentUserId
                        )
                        .neq(
                            "visibility",
                            "public"
                        )
                        .eq(
                            "is_archived",
                            false
                        );

                (mine || [])
                    .forEach(
                        function(item) {

                            if (
                                !reels.some(
                                    function(r) {

                                        return (
                                            String(r.id) ===
                                            String(item.id)
                                        );
                                    }
                                )
                            ) {

                                reels.push(
                                    item
                                );
                            }
                        }
                    );
            }

            reels.sort(
                function(a,b) {

                    return (
                        new Date(
                            b.created_at
                        ) -
                        new Date(
                            a.created_at
                        )
                    );
                }
            );

            await loadProfiles(
                client
            );

        } catch (error) {

            console.error(
                "Reels error:",
                error
            );

            reels = [];

        } finally {

            loading = false;
        }
    }


    /* =====================================================
       Profiles
    ===================================================== */

    async function loadProfiles(
        client
    ) {

        profiles = {};

        const ids =
            Array.from(
                new Set(
                    reels.map(
                        function(item) {
                            return item.user_id;
                        }
                    )
                )
            );

        if (!ids.length) {
            return;
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
            return;
        }

        (data || [])
            .forEach(
                function(profile) {

                    profiles[
                        profile.id
                    ] =
                        profile;
                }
            );
    }


    /* =====================================================
       عرض Reels
    ===================================================== */

    function renderReels() {

        const container =
            document.getElementById(
                "student-reels-scroll"
            );

        if (!container) {
            return;
        }

        container.innerHTML =
            reels.map(
                function(reel,index) {

                    const profile =
                        profiles[
                            reel.user_id
                        ] || {};

                    const username =
                        profile.username ||
                        "username";

                    const owner =
                        String(
                            reel.user_id
                        ) ===
                        String(
                            currentUserId
                        );

                    return `

                    <section
                        class="student-reel"
                        data-index="${index}"
                        data-id="${escapeHTML(
                            reel.id
                        )}"
                    >

                        <video
                            src="${escapeHTML(
                                reel.video_url
                            )}"
                            ${
                                reel.thumbnail_url
                                    ? `poster="${escapeHTML(
                                        reel.thumbnail_url
                                    )}"`
                                    : ""
                            }
                            playsinline
                            loop
                            preload="metadata"
                        ></video>


                        <div class="
                            student-reel-top
                        ">

                            <div class="
                                student-reel-title
                            ">
                                🎬 Reels
                            </div>


                            <button
                                type="button"
                                class="
                                    student-reel-publish
                                "
                                data-reel-publish
                            >
                                🎬 نشر Reel
                            </button>


                            <button
                                class="
                                    student-reel-close
                                "
                                data-close
                            >
                                ×
                            </button>

                        </div>


                        <div class="
                            student-reel-user
                        ">

                            <div class="
                                student-reel-name
                            ">
                                @${escapeHTML(
                                    username
                                )}
                            </div>


                            ${
                                reel.caption
                                    ? `
                                        <div class="
                                            student-reel-caption
                                        ">
                                            ${escapeHTML(
                                                reel.caption
                                            )}
                                        </div>
                                      `
                                    : ""
                            }

                        </div>


                        <div class="
                            student-reel-actions
                        ">

                            <button
                                class="
                                    student-reel-action
                                "
                                data-like
                            >
                                ❤️
                            </button>


                            <button
                                class="
                                    student-reel-action
                                "
                                data-comment
                            >
                                💬
                            </button>


                            <button
                                class="
                                    student-reel-action
                                "
                                data-save
                            >
                                🔖
                            </button>


                            <button
                                class="
                                    student-reel-action
                                "
                                data-share
                            >
                                ↗️
                            </button>


                            ${
                                owner
                                    ? `
                                        <button
                                            class="
                                                student-reel-action
                                            "
                                            data-more
                                        >
                                            ⋯
                                        </button>
                                      `
                                    : ""
                            }

                        </div>


                        ${
                            owner
                                ? `
                                    <div
                                        class="
                                            student-reel-menu
                                        "
                                        data-menu
                                    >

                                        <button
                                            data-edit
                                        >
                                            ✏️ تعديل
                                        </button>

                                        <button
                                            data-visibility
                                        >
                                            🔒 الخصوصية
                                        </button>

                                        <button
                                            data-archive
                                        >
                                            📦 أرشفة
                                        </button>

                                        <button
                                            class="danger"
                                            data-delete
                                        >
                                            🗑️ حذف
                                        </button>

                                    </div>
                                  `
                                : ""
                        }

                    </section>
                    `;
                }
            )
            .join("");

        bindButtons();

        const container2 =
            document.getElementById(
                "student-reels-scroll"
            );

        container2?.addEventListener(
            "scroll",
            handleScroll,
            {
                passive:true
            }
        );
    }


    /* =====================================================
       Scroll
    ===================================================== */

    let scrollTimer = null;


    function handleScroll() {

        clearTimeout(
            scrollTimer
        );

        scrollTimer =
            setTimeout(
                function() {

                    const container =
                        document.getElementById(
                            "student-reels-scroll"
                        );

                    if (!container) {
                        return;
                    }

                    const index =
                        Math.round(
                            container.scrollTop /
                            window.innerHeight
                        );

                    if (
                        index !==
                        currentIndex
                    ) {

                        currentIndex =
                            index;

                        playCurrent();
                    }

                },
                120
            );
    }


    function scrollToReel(
        index,
        smooth=true
    ) {

        const container =
            document.getElementById(
                "student-reels-scroll"
            );

        if (!container) {
            return;
        }

        container.scrollTo({

            top:
                index *
                window.innerHeight,

            behavior:
                smooth
                    ? "smooth"
                    : "auto"
        });

        currentIndex =
            index;

        setTimeout(
            playCurrent,
            150
        );
    }


    function playCurrent() {

        if (!overlay) {
            return;
        }

        overlay
            .querySelectorAll("video")
            .forEach(
                function(video,index) {

                    if (
                        index ===
                        currentIndex
                    ) {

                        video.muted =
                            false;

                        video.play()
                            .catch(
                                function() {

                                    video.muted =
                                        true;

                                    video.play()
                                        .catch(
                                            function(){}
                                        );
                                }
                            );

                    } else {

                        video.pause();

                        video.currentTime =
                            0;
                    }
                }
            );
    }


    /* =====================================================
       الأزرار
    ===================================================== */

    function bindButtons() {

        const container =
            document.getElementById(
                "student-reels-scroll"
            );

        if (!container) {
            return;
        }


        /* نشر Reel */

        container
            .querySelectorAll(
                "[data-reel-publish]"
            )
            .forEach(
                function(button) {

                    button.onclick =
                        function(event) {

                            event.preventDefault();
                            event.stopPropagation();

                            closeReels();

                            if (
                                typeof window.openStudentPostCreator ===
                                "function"
                            ) {

                                window.openStudentPostCreator();

                            } else {

                                toast(
                                    "نظام النشر غير جاهز."
                                );
                            }
                        };
                }
            );


        /* إغلاق */

        container
            .querySelectorAll(
                "[data-close]"
            )
            .forEach(
                function(button) {

                    button.onclick =
                        closeReels;
                }
            );


        /* إعجاب */

        container
            .querySelectorAll(
                "[data-like]"
            )
            .forEach(
                function(button) {

                    button.onclick =
                        function() {

                            button.classList.toggle(
                                "active"
                            );
                        };
                }
            );


        /* تعليق */

        container
            .querySelectorAll(
                "[data-comment]"
            )
            .forEach(
                function(button) {

                    button.onclick =
                        function() {

                            toast(
                                "التعليقات ستُفعّل قريبًا."
                            );
                        };
                }
            );


        /* حفظ */

        container
            .querySelectorAll(
                "[data-save]"
            )
            .forEach(
                function(button) {

                    button.onclick =
                        async function() {

                            if (
                                typeof window.saveStudentItem !==
                                "function"
                            ) {

                                toast(
                                    "المحفوظات غير جاهزة."
                                );

                                return;
                            }

                            const slide =
                                button.closest(
                                    ".student-reel"
                                );

                            const id =
                                slide?.dataset.id;

                            const result =
                                await window.saveStudentItem(
                                    "reel",
                                    id
                                );

                            if (
                                result?.success
                            ) {

                                button.classList.add(
                                    "saved"
                                );

                                toast(
                                    "تم الحفظ."
                                );

                            } else {

                                toast(
                                    result?.error ||
                                    "تعذر الحفظ."
                                );
                            }
                        };
                }
            );


        /* مشاركة */

        container
            .querySelectorAll(
                "[data-share]"
            )
            .forEach(
                function(button) {

                    button.onclick =
                        async function() {

                            if (
                                navigator.share
                            ) {

                                try {

                                    await navigator.share({

                                        title:
                                            "Student Reels",

                                        text:
                                            "شاهد هذا الـReel",

                                        url:
                                            location.href
                                    });

                                } catch (error) {}

                            } else {

                                toast(
                                    "المشاركة غير متاحة في هذا المتصفح."
                                );
                            }
                        };
                }
            );


        /* قائمة المالك */

        container
            .querySelectorAll(
                "[data-more]"
            )
            .forEach(
                function(button) {

                    button.onclick =
                        function() {

                            const slide =
                                button.closest(
                                    ".student-reel"
                                );

                            const menu =
                                slide?.querySelector(
                                    "[data-menu]"
                                );

                            menu?.classList.toggle(
                                "show"
                            );
                        };
                }
            );


        /* حذف */

        container
            .querySelectorAll(
                "[data-delete]"
            )
            .forEach(
                function(button) {

                    button.onclick =
                        function() {

                            deleteReel(
                                button
                                    .closest(
                                        ".student-reel"
                                    )
                                    ?.dataset.id
                            );
                        };
                }
            );


        /* أرشفة */

        container
            .querySelectorAll(
                "[data-archive]"
            )
            .forEach(
                function(button) {

                    button.onclick =
                        function() {

                            archiveReel(
                                button
                                    .closest(
                                        ".student-reel"
                                    )
                                    ?.dataset.id
                            );
                        };
                }
            );


        /* تعديل */

        container
            .querySelectorAll(
                "[data-edit]"
            )
            .forEach(
                function(button) {

                    button.onclick =
                        function() {

                            toast(
                                "التعديل سيُفعّل مع محرر الـReels."
                            );
                        };
                }
            );


        /* الخصوصية */

        container
            .querySelectorAll(
                "[data-visibility]"
            )
            .forEach(
                function(button) {

                    button.onclick =
                        function() {

                            toast(
                                "اختيار الخصوصية سيُفتح هنا."
                            );
                        };
                }
            );
    }


    /* =====================================================
       حذف Reel
    ===================================================== */

    async function deleteReel(
        id
    ) {

        if (
            !confirm(
                "هل تريد حذف هذا الـReel نهائيًا؟"
            )
        ) {
            return;
        }

        const client =
            getSupabase();

        if (!client) {
            return;
        }

        const {
            error
        } =
            await client
                .from("reels")
                .delete()
                .eq(
                    "id",
                    id
                )
                .eq(
                    "user_id",
                    currentUserId
                );

        if (error) {

            toast(
                error.message ||
                "تعذر حذف الـReel."
            );

            return;
        }

        toast(
            "تم حذف الـReel."
        );

        await openReels(
            Math.max(
                0,
                currentIndex - 1
            )
        );
    }


    /* =====================================================
       أرشفة Reel
    ===================================================== */

    async function archiveReel(
        id
    ) {

        const client =
            getSupabase();

        if (!client) {
            return;
        }

        const {
            error
        } =
            await client
                .from("reels")
                .update({
                    is_archived:true
                })
                .eq(
                    "id",
                    id
                )
                .eq(
                    "user_id",
                    currentUserId
                );

        if (error) {

            toast(
                error.message ||
                "تعذر الأرشفة."
            );

            return;
        }

        toast(
            "تمت أرشفة الـReel."
        );

        await openReels(0);
    }


    /* =====================================================
       شاشة فارغة
    ===================================================== */

    function showEmpty() {

        const container =
            document.getElementById(
                "student-reels-scroll"
            );

        if (!container) {
            return;
        }

        container.innerHTML = `

            <div style="
                height:100%;
                display:flex;
                flex-direction:column;
                align-items:center;
                justify-content:center;
                color:#fff;
                text-align:center;
                gap:12px;
            ">

                <div style="
                    font-size:55px;
                ">
                    🎬
                </div>

                <strong>
                    لا توجد Reels بعد
                </strong>

                <span style="
                    color:#aaa;
                    font-size:13px;
                ">
                    كن أول من ينشر Reel.
                </span>

                <button
                    onclick="closeStudentReels()"
                    style="
                        margin-top:10px;
                        border:0;
                        padding:11px 20px;
                        border-radius:12px;
                        cursor:pointer;
                    "
                >
                    إغلاق
                </button>

            </div>
        `;
    }


    /* =====================================================
       رسالة
    ===================================================== */

    function toast(
        message
    ) {

        const el =
            document.createElement(
                "div"
            );

        el.textContent =
            message;

        el.style.position =
            "fixed";

        el.style.left =
            "50%";

        el.style.bottom =
            "30px";

        el.style.transform =
            "translateX(-50%)";

        el.style.zIndex =
            "100000000";

        el.style.background =
            "#fff";

        el.style.color =
            "#222";

        el.style.padding =
            "11px 16px";

        el.style.borderRadius =
            "12px";

        el.style.fontSize =
            "13px";

        el.style.direction =
            "rtl";

        document.body.appendChild(
            el
        );

        setTimeout(
            function () {
                el.remove();
            },
            2000
        );
    }


    /* =====================================================
       API
    ===================================================== */

    window.openStudentReels =
        openReels;

    window.closeStudentReels =
        closeReels;


    /* =====================================================
       تشغيل
    ===================================================== */

    function start() {

        styles();

        addReelsEntry();

        protectReelsEntry();
    }


    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            start
        );

    } else {

        start();
    }

})();
