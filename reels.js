/* =========================================================
   Student - Reels System
   تجربة Reels عمودية مثل TikTok
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
    let touchStartY = 0;
    let touchEndY = 0;
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


    async function waitForSupabase(maxAttempts = 50) {

        for (let i = 0; i < maxAttempts; i++) {

            const client = getSupabase();

            if (client) {
                return client;
            }

            await new Promise(function (resolve) {
                setTimeout(resolve, 200);
            });
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
       التاريخ
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
                dateStyle: "medium",
                timeStyle: "short"
            }
        );
    }


    /* =====================================================
       CSS
    ===================================================== */

    function injectStyles() {

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
                z-index:9999999;
                background:#000;
                display:none;
                direction:rtl;
                overflow:hidden;
            }

            #student-reels-overlay.show {
                display:block;
            }

            .student-reels-container {
                width:100%;
                height:100%;
                overflow-y:auto;
                scroll-snap-type:y mandatory;
                overscroll-behavior-y:contain;
                scrollbar-width:none;
                background:#000;
            }

            .student-reels-container::-webkit-scrollbar {
                display:none;
            }

            .student-reel-slide {
                position:relative;
                width:100%;
                height:100dvh;
                min-height:100vh;
                scroll-snap-align:start;
                scroll-snap-stop:always;
                background:#000;
                overflow:hidden;
            }

            .student-reel-video {
                position:absolute;
                inset:0;
                width:100%;
                height:100%;
                object-fit:cover;
                background:#000;
            }

            .student-reel-top {
                position:absolute;
                top:0;
                right:0;
                left:0;
                padding:
                    max(16px, env(safe-area-inset-top))
                    15px
                    15px;
                display:flex;
                align-items:center;
                gap:10px;
                z-index:5;
                background:
                    linear-gradient(
                        to bottom,
                        rgba(0,0,0,.55),
                        transparent
                    );
            }

            .student-reel-title {
                flex:1;
                color:#fff;
                font-size:17px;
                font-weight:800;
            }

            .student-reel-close {
                width:42px;
                height:42px;
                border:none;
                border-radius:50%;
                background:rgba(0,0,0,.45);
                color:#fff;
                cursor:pointer;
                font-size:18px;
                display:flex;
                align-items:center;
                justify-content:center;
            }

            .student-reel-owner {
                position:absolute;
                right:15px;
                bottom:
                    calc(
                        22px +
                        env(safe-area-inset-bottom)
                    );
                left:88px;
                z-index:5;
                color:#fff;
                text-shadow:
                    0 1px 4px rgba(0,0,0,.7);
            }

            .student-reel-owner-name {
                font-size:16px;
                font-weight:800;
                margin-bottom:5px;
            }

            .student-reel-owner-username {
                font-size:12px;
                opacity:.92;
                direction:ltr;
                text-align:right;
                margin-bottom:8px;
            }

            .student-reel-caption {
                font-size:13px;
                line-height:1.7;
                max-width:90%;
                white-space:pre-wrap;
                word-break:break-word;
            }

            .student-reel-actions {
                position:absolute;
                left:10px;
                bottom:
                    calc(
                        25px +
                        env(safe-area-inset-bottom)
                    );
                z-index:6;
                display:flex;
                flex-direction:column;
                align-items:center;
                gap:13px;
            }

            .student-reel-action {
                width:48px;
                height:48px;
                border:none;
                border-radius:50%;
                background:rgba(0,0,0,.42);
                color:#fff;
                cursor:pointer;
                font-size:20px;
                display:flex;
                align-items:center;
                justify-content:center;
                box-shadow:
                    0 5px 15px rgba(0,0,0,.18);
            }

            .student-reel-action.active {
                color:#ff3040;
            }

            .student-reel-action.saved {
                color:#ffd400;
            }

            .student-reel-more-menu {
                position:absolute;
                left:70px;
                bottom:22px;
                z-index:10;
                width:210px;
                background:#fff;
                border-radius:17px;
                overflow:hidden;
                box-shadow:
                    0 15px 45px rgba(0,0,0,.35);
                display:none;
            }

            .student-reel-more-menu.show {
                display:block;
            }

            .student-reel-menu-button {
                width:100%;
                border:none;
                background:#fff;
                padding:14px;
                text-align:right;
                cursor:pointer;
                font-size:14px;
                color:#222;
                border-bottom:1px solid #eee;
            }

            .student-reel-menu-button:last-child {
                border-bottom:none;
            }

            .student-reel-menu-button.danger {
                color:#d93025;
            }

            .student-reel-progress {
                position:absolute;
                right:15px;
                left:15px;
                bottom:8px;
                height:3px;
                background:rgba(255,255,255,.3);
                border-radius:10px;
                overflow:hidden;
                z-index:7;
            }

            .student-reel-progress-inner {
                height:100%;
                width:0%;
                background:#fff;
                transition:width .2s linear;
            }

            .student-reels-loading {
                position:absolute;
                inset:0;
                display:flex;
                align-items:center;
                justify-content:center;
                color:#fff;
                background:#000;
                z-index:20;
            }

            .student-reels-spinner {
                width:38px;
                height:38px;
                border:3px solid #444;
                border-top-color:#fff;
                border-radius:50%;
                animation:
                    studentReelsSpin .7s linear infinite;
            }

            @keyframes studentReelsSpin {
                to {
                    transform:rotate(360deg);
                }
            }

            .student-reels-empty {
                position:absolute;
                inset:0;
                display:flex;
                align-items:center;
                justify-content:center;
                flex-direction:column;
                gap:10px;
                color:#fff;
                background:#000;
                text-align:center;
                padding:25px;
            }

            .student-reels-empty-icon {
                font-size:55px;
            }

            .student-reels-next-hint {
                position:absolute;
                top:50%;
                left:50%;
                transform:translate(-50%,-50%);
                color:#fff;
                font-size:12px;
                opacity:.65;
                pointer-events:none;
                z-index:5;
            }

            @media (min-width:800px) {

                .student-reel-slide {
                    max-width:520px;
                    margin:0 auto;
                }

                .student-reels-container {
                    background:#080808;
                }

            }

        `;

        document.head.appendChild(style);
    }


    /* =====================================================
       إنشاء Overlay
    ===================================================== */

    function createOverlay() {

        if (overlay) {
            return;
        }

        overlay =
            document.createElement("div");

        overlay.id =
            "student-reels-overlay";

        overlay.innerHTML = `

            <div
                id="student-reels-container"
                class="student-reels-container"
            ></div>

        `;

        document.body.appendChild(
            overlay
        );


        overlay.addEventListener(
            "touchstart",
            handleTouchStart,
            {
                passive:true
            }
        );


        overlay.addEventListener(
            "touchend",
            handleTouchEnd,
            {
                passive:true
            }
        );


        overlay.addEventListener(
            "keydown",
            handleKeyboard
        );
    }


    /* =====================================================
       فتح
    ===================================================== */

    async function openReels(
        startIndex = 0
    ) {

        if (loading) {
            return;
        }

        injectStyles();
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
                    startIndex,
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

        const videos =
            overlay.querySelectorAll(
                "video"
            );

        videos.forEach(
            function (video) {

                try {
                    video.pause();
                } catch (error) {}
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
                data: {
                    user
                }
            } =
                await client.auth.getUser();


            currentUserId =
                user?.id || null;


            /*
               نعرض:
               - المنشورات العامة
               - منشورات المستخدم الخاصة
               - منشورات المتابعين تحتاج نظام follows لاحقًا
            */

            const queries = [];

            queries.push(
                client
                    .from("reels")
                    .select(`
                        id,
                        user_id,
                        video_url,
                        caption,
                        thumbnail_url,
                        visibility,
                        created_at,
                        updated_at
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
                    .limit(50)
            );


            if (currentUserId) {

                queries.push(
                    client
                        .from("reels")
                        .select(`
                            id,
                            user_id,
                            video_url,
                            caption,
                            thumbnail_url,
                            visibility,
                            created_at,
                            updated_at
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
                        )
                        .order(
                            "created_at",
                            {
                                ascending:false
                            }
                        )
                        .limit(50)
                );
            }


            const results =
                await Promise.all(
                    queries
                );


            const all = [];


            results.forEach(
                function (result) {

                    if (
                        result?.error
                    ) {

                        console.error(
                            "Reels query error:",
                            result.error
                        );

                        return;
                    }


                    all.push(
                        ...(result.data || [])
                    );
                }
            );


            const unique =
                [];

            const seen =
                new Set();


            all.forEach(
                function (item) {

                    if (
                        !seen.has(
                            item.id
                        )
                    ) {

                        seen.add(
                            item.id
                        );

                        unique.push(
                            item
                        );
                    }
                }
            );


            unique.sort(
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


            reels =
                unique;


            await loadProfiles(
                client
            );


        } catch (error) {

            console.error(
                "Load reels error:",
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
                        function (reel) {
                            return reel.user_id;
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

            console.error(
                "Reels profiles error:",
                error
            );

            return;
        }


        (data || []).forEach(
            function(profile) {

                profiles[
                    profile.id
                ] = profile;
            }
        );
    }


    /* =====================================================
       عرض فارغ
    ===================================================== */

    function showEmpty() {

        const container =
            document.getElementById(
                "student-reels-container"
            );

        if (!container) {
            return;
        }


        container.innerHTML = `

            <div class="
                student-reels-empty
            ">

                <div class="
                    student-reels-empty-icon
                ">
                    🎬
                </div>

                <div style="
                    font-size:18px;
                    font-weight:800;
                ">
                    لا توجد Reels بعد
                </div>

                <div style="
                    font-size:13px;
                    color:#bbb;
                ">
                    كن أول من ينشر Reel في Student.
                </div>


                <button
                    id="student-reels-empty-close"
                    type="button"
                    style="
                        margin-top:15px;
                        border:none;
                        background:#fff;
                        color:#222;
                        padding:11px 18px;
                        border-radius:12px;
                        cursor:pointer;
                    "
                >
                    إغلاق
                </button>

            </div>
        `;


        document
            .getElementById(
                "student-reels-empty-close"
            )
            ?.addEventListener(
                "click",
                closeReels
            );
    }


    /* =====================================================
       بناء الشرائح
    ===================================================== */

    function renderReels() {

        const container =
            document.getElementById(
                "student-reels-container"
            );

        if (!container) {
            return;
        }


        container.innerHTML =
            reels.map(
                function(reel, index) {

                    const profile =
                        profiles[
                            reel.user_id
                        ] || {};


                    const name =
                        profile.full_name ||
                        profile.username ||
                        "مستخدم";


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
                            class="
                                student-reel-slide
                            "
                            data-reel-index="${index}"
                            data-reel-id="${escapeHTML(
                                reel.id
                            )}"
                        >

                            <video
                                class="
                                    student-reel-video
                                "
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
                                    class="
                                        student-reel-close
                                    "
                                    type="button"
                                    data-reel-close
                                >
                                    <i class="
                                        fa-solid
                                        fa-xmark
                                    "></i>
                                </button>

                            </div>


                            <div class="
                                student-reel-owner
                            ">

                                <div class="
                                    student-reel-owner-name
                                ">
                                    ${escapeHTML(
                                        name
                                    )}
                                </div>


                                <div class="
                                    student-reel-owner-username
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
                                    type="button"
                                    data-reel-like
                                >
                                    <i class="
                                        fa-regular
                                        fa-heart
                                    "></i>
                                </button>


                                <button
                                    class="
                                        student-reel-action
                                    "
                                    type="button"
                                    data-reel-comment
                                >
                                    <i class="
                                        fa-regular
                                        fa-comment
                                    "></i>
                                </button>


                                <button
                                    class="
                                        student-reel-action
                                    "
                                    type="button"
                                    data-reel-save
                                >
                                    <i class="
                                        fa-regular
                                        fa-bookmark
                                    "></i>
                                </button>


                                <button
                                    class="
                                        student-reel-action
                                    "
                                    type="button"
                                    data-reel-share
                                >
                                    <i class="
                                        fa-solid
                                        fa-share
                                    "></i>
                                </button>


                                ${
                                    owner
                                        ? `
                                            <button
                                                class="
                                                    student-reel-action
                                                "
                                                type="button"
                                                data-reel-more
                                            >
                                                <i class="
                                                    fa-solid
                                                    fa-ellipsis
                                                "></i>
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
                                                student-reel-more-menu
                                            "
                                            data-reel-menu
                                        >

                                            <button
                                                class="
                                                    student-reel-menu-button
                                                "
                                                type="button"
                                                data-reel-edit
                                            >
                                                ✏️ تعديل
                                            </button>

                                            <button
                                                class="
                                                    student-reel-menu-button
                                                "
                                                type="button"
                                                data-reel-visibility
                                            >
                                                🔒 الخصوصية
                                            </button>

                                            <button
                                                class="
                                                    student-reel-menu-button
                                                "
                                                type="button"
                                                data-reel-archive
                                            >
                                                📦 أرشفة
                                            </button>

                                            <button
                                                class="
                                                    student-reel-menu-button
                                                    danger
                                                "
                                                type="button"
                                                data-reel-delete
                                            >
                                                🗑️ حذف
                                            </button>

                                        </div>
                                      `
                                    : ""
                            }


                            <div class="
                                student-reel-progress
                            ">

                                <div class="
                                    student-reel-progress-inner
                                "></div>

                            </div>

                        </section>
                    `;
                }
            )
            .join("");


        bindReelButtons();
    }


    /* =====================================================
       ربط الأزرار
    ===================================================== */

    function bindReelButtons() {

        const container =
            document.getElementById(
                "student-reels-container"
            );

        if (!container) {
            return;
        }


        container
            .querySelectorAll(
                "[data-reel-close]"
            )
            .forEach(
                function(button) {

                    button.addEventListener(
                        "click",
                        closeReels
                    );
                }
            );


        container
            .querySelectorAll(
                "[data-reel-more]"
            )
            .forEach(
                function(button) {

                    button.addEventListener(
                        "click",
                        function(event) {

                            event.stopPropagation();

                            const slide =
                                button.closest(
                                    ".student-reel-slide"
                                );

                            const menu =
                                slide?.querySelector(
                                    "[data-reel-menu]"
                                );

                            if (menu) {

                                menu.classList.toggle(
                                    "show"
                                );
                            }
                        }
                    );
                }
            );


        container
            .querySelectorAll(
                "[data-reel-like]"
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


        container
            .querySelectorAll(
                "[data-reel-comment]"
            )
            .forEach(
                function(button) {

                    button.addEventListener(
                        "click",
                        function() {

                            toast(
                                "التعليقات ستُفعّل مع نظام التفاعلات."
                            );
                        }
                    );
                }
            );


        container
            .querySelectorAll(
                "[data-reel-save]"
            )
            .forEach(
                function(button) {

                    button.addEventListener(
                        "click",
                        async function() {

                            const slide =
                                button.closest(
                                    ".student-reel-slide"
                                );

                            const id =
                                slide?.dataset.reelId;


                            const ready =
                                await ensureSavedSystem();


                            if (!ready) {

                                toast(
                                    "تعذر تحميل المحفوظات."
                                );

                                return;
                            }


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
                                    result.alreadySaved
                                        ? "الـReel محفوظ مسبقًا."
                                        : "تم حفظ الـReel."
                                );

                            } else {

                                toast(
                                    result?.error ||
                                    "تعذر حفظ الـReel."
                                );
                            }
                        }
                    );
                }
            );


        container
            .querySelectorAll(
                "[data-reel-share]"
            )
            .forEach(
                function(button) {

                    button.addEventListener(
                        "click",
                        async function() {

                            const slide =
                                button.closest(
                                    ".student-reel-slide"
                                );

                            const id =
                                slide?.dataset.reelId;


                            if (
                                navigator.share
                            ) {

                                try {

                                    await navigator.share({

                                        title:
                                            "Student Reels",

                                        text:
                                            "شاهد هذا الـReel في Student",

                                        url:
                                            window.location.origin +
                                            window.location.pathname +
                                            "#reel-" +
                                            id
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
                                    "المشاركة ستتوفر قريبًا."
                                );
                            }
                        }
                    );
                }
            );


        container
            .querySelectorAll(
                "[data-reel-edit]"
            )
            .forEach(
                function(button) {

                    button.addEventListener(
                        "click",
                        function() {

                            const slide =
                                button.closest(
                                    ".student-reel-slide"
                                );

                            const id =
                                slide?.dataset.reelId;


                            const reel =
                                reels.find(
                                    function(item) {

                                        return String(
                                            item.id
                                        ) ===
                                        String(id);
                                    }
                                );


                            if (reel) {

                                showEditPanel(
                                    reel
                                );
                            }
                        }
                    );
                }
            );


        container
            .querySelectorAll(
                "[data-reel-visibility]"
            )
            .forEach(
                function(button) {

                    button.addEventListener(
                        "click",
                        function() {

                            const slide =
                                button.closest(
                                    ".student-reel-slide"
                                );

                            const id =
                                slide?.dataset.reelId;


                            showVisibilityPanel(
                                id
                            );
                        }
                    );
                }
            );


        container
            .querySelectorAll(
                "[data-reel-archive]"
            )
            .forEach(
                function(button) {

                    button.addEventListener(
                        "click",
                        async function() {

                            const slide =
                                button.closest(
                                    ".student-reel-slide"
                                );

                            const id =
                                slide?.dataset.reelId;


                            await archiveReel(
                                id
                            );
                        }
                    );
                }
            );


        container
            .querySelectorAll(
                "[data-reel-delete]"
            )
            .forEach(
                function(button) {

                    button.addEventListener(
                        "click",
                        async function() {

                            const slide =
                                button.closest(
                                    ".student-reel-slide"
                                );

                            const id =
                                slide?.dataset.reelId;


                            await deleteReel(
                                id
                            );
                        }
                    );
                }
            );
    }


    /* =====================================================
       التمرير
    ===================================================== */

    function scrollToReel(
        index,
        smooth = true
    ) {

        const container =
            document.getElementById(
                "student-reels-container"
            );

        if (!container) {
            return;
        }


        const slide =
            container.querySelector(
                `[data-reel-index="${index}"]`
            );


        if (!slide) {
            return;
        }


        slide.scrollIntoView({
            behavior:
                smooth
                    ? "smooth"
                    : "auto",
            block:
                "start"
        });


        currentIndex =
            index;


        playCurrentReel();
    }


    function nextReel() {

        if (
            currentIndex >=
            reels.length - 1
        ) {

            toast(
                "وصلت إلى آخر Reels."
            );

            return;
        }


        scrollToReel(
            currentIndex + 1
        );
    }


    function previousReel() {

        if (
            currentIndex <= 0
        ) {

            return;
        }


        scrollToReel(
            currentIndex - 1
        );
    }


    function handleTouchStart(
        event
    ) {

        touchStartY =
            event.changedTouches?.[0]
                ?.screenY || 0;
    }


    function handleTouchEnd(
        event
    ) {

        touchEndY =
            event.changedTouches?.[0]
                ?.screenY || 0;


        const difference =
            touchStartY -
            touchEndY;


        if (
            Math.abs(difference)
            < 55
        ) {

            return;
        }


        if (
            difference > 0
        ) {

            nextReel();

        } else {

            previousReel();
        }
    }


    /* =====================================================
       لوحة المفاتيح
    ===================================================== */

    function handleKeyboard(
        event
    ) {

        if (
            !overlay ||
            !overlay.classList.contains(
                "show"
            )
        ) {
            return;
        }


        if (
            event.key ===
            "Escape"
        ) {

            closeReels();

        } else if (
            event.key ===
            "ArrowUp"
        ) {

            previousReel();

        } else if (
            event.key ===
            "ArrowDown"
        ) {

            nextReel();
        }
    }


    /* =====================================================
       تشغيل الحالي وإيقاف البقية
    ===================================================== */

    function playCurrentReel() {

        if (!overlay) {
            return;
        }


        const slides =
            overlay.querySelectorAll(
                ".student-reel-slide"
            );


        slides.forEach(
            function(slide, index) {

                const video =
                    slide.querySelector(
                        "video"
                    );


                if (!video) {
                    return;
                }


                if (
                    index ===
                    currentIndex
                ) {

                    video.muted =
                        false;


                    const playPromise =
                        video.play();


                    if (
                        playPromise &&
                        typeof playPromise.catch ===
                            "function"
                    ) {

                        playPromise.catch(
                            function() {

                                /*
                                   بعض المتصفحات تمنع
                                   autoplay مع الصوت.
                                */

                                video.muted =
                                    true;

                                video.play()
                                    .catch(
                                        function() {}
                                    );
                            }
                        );
                    }


                    observeVideoProgress(
                        video,
                        slide
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
       شريط التقدم
    ===================================================== */

    function observeVideoProgress(
        video,
        slide
    ) {

        const progress =
            slide.querySelector(
                ".student-reel-progress-inner"
            );


        if (!progress) {
            return;
        }


        const update =
            function() {

                if (
                    !video.duration ||
                    !isFinite(
                        video.duration
                    )
                ) {

                    return;
                }


                const percent =
                    (
                        video.currentTime /
                        video.duration
                    ) * 100;


                progress.style.width =
                    `${percent}%`;
            };


        video.ontimeupdate =
            update;
    }


    /* =====================================================
       تعديل
    ===================================================== */

    function showEditPanel(
        reel
    ) {

        closeMenus();


        const old =
            document.getElementById(
                "student-reel-edit-overlay"
            );


        if (old) {
            old.remove();
        }


        const panel =
            document.createElement(
                "div"
            );


        panel.id =
            "student-reel-edit-overlay";


        panel.style.position =
            "fixed";

        panel.style.inset =
            "0";

        panel.style.zIndex =
            "10000001";

        panel.style.background =
            "rgba(0,0,0,.5)";

        panel.style.display =
            "flex";

        panel.style.alignItems =
            "center";

        panel.style.justifyContent =
            "center";

        panel.style.padding =
            "20px";

        panel.style.direction =
            "rtl";


        panel.innerHTML = `

            <div style="
                width:100%;
                max-width:440px;
                background:#fff;
                border-radius:20px;
                padding:20px;
                box-sizing:border-box;
            ">

                <div style="
                    display:flex;
                    align-items:center;
                    justify-content:space-between;
                    margin-bottom:15px;
                ">

                    <strong style="
                        font-size:18px;
                    ">
                        تعديل الـReel
                    </strong>


                    <button
                        type="button"
                        id="reel-edit-close"
                        style="
                            width:40px;
                            height:40px;
                            border:none;
                            border-radius:50%;
                            background:#f1f3f5;
                            cursor:pointer;
                        "
                    >
                        ×
                    </button>

                </div>


                <textarea
                    id="reel-edit-caption"
                    maxlength="2000"
                    style="
                        width:100%;
                        min-height:120px;
                        box-sizing:border-box;
                        padding:13px;
                        border:1px solid #ddd;
                        border-radius:12px;
                        resize:none;
                        outline:none;
                    "
                >${escapeHTML(
                    reel.caption || ""
                )}</textarea>


                <button
                    id="reel-edit-save"
                    type="button"
                    style="
                        margin-top:12px;
                        width:100%;
                        border:none;
                        background:#0095f6;
                        color:#fff;
                        padding:13px;
                        border-radius:12px;
                        cursor:pointer;
                        font-weight:700;
                    "
                >
                    حفظ التعديل
                </button>


                <div
                    id="reel-edit-message"
                    style="
                        text-align:center;
                        margin-top:10px;
                        min-height:20px;
                        font-size:13px;
                    "
                ></div>

            </div>
        `;


        document.body.appendChild(
            panel
        );


        document
            .getElementById(
                "reel-edit-close"
            )
            ?.addEventListener(
                "click",
                function() {

                    panel.remove();
                }
            );


        document
            .getElementById(
                "reel-edit-save"
            )
            ?.addEventListener(
                "click",
                async function() {

                    const caption =
                        document
                            .getElementById(
                                "reel-edit-caption"
                            )
                            ?.value
                            .trim();


                    const button =
                        document
                            .getElementById(
                                "reel-edit-save"
                            );


                    const message =
                        document
                            .getElementById(
                                "reel-edit-message"
                            );


                    button.disabled =
                        true;

                    button.textContent =
                        "جارٍ الحفظ...";


                    try {

                        const client =
                            getSupabase();


                        const {
                            error
                        } =
                            await client
                                .from("reels")
                                .update({
                                    caption:
                                        caption ||
                                        null
                                })
                                .eq(
                                    "id",
                                    reel.id
                                )
                                .eq(
                                    "user_id",
                                    currentUserId
                                );


                        if (error) {
                            throw error;
                        }


                        message.style.color =
                            "#16803c";

                        message.textContent =
                            "تم تعديل الـReel.";


                        setTimeout(
                            async function() {

                                panel.remove();

                                await loadReels();

                                renderReels();

                                scrollToReel(
                                    currentIndex,
                                    false
                                );

                            },
                            600
                        );


                    } catch (error) {

                        console.error(
                            "Edit reel error:",
                            error
                        );


                        message.style.color =
                            "#d93025";

                        message.textContent =
                            error?.message ||
                            "تعذر تعديل الـReel.";


                    } finally {

                        button.disabled =
                            false;

                        button.textContent =
                            "حفظ التعديل";
                    }
                }
            );
    }


    /* =====================================================
       الخصوصية
    ===================================================== */

    function showVisibilityPanel(
        reelId
    ) {

        closeMenus();


        const panel =
            document.createElement(
                "div"
            );


        panel.id =
            "student-reel-visibility-panel";


        panel.style.position =
            "fixed";

        panel.style.inset =
            "0";

        panel.style.zIndex =
            "10000001";

        panel.style.background =
            "rgba(0,0,0,.5)";

        panel.style.display =
            "flex";

        panel.style.alignItems =
            "center";

        panel.style.justifyContent =
            "center";

        panel.style.padding =
            "20px";

        panel.style.direction =
            "rtl";


        panel.innerHTML = `

            <div style="
                width:100%;
                max-width:400px;
                background:#fff;
                border-radius:20px;
                padding:20px;
            ">

                <div style="
                    font-size:19px;
                    font-weight:800;
                    margin-bottom:15px;
                ">
                    خصوصية الـReel
                </div>


                <button
                    data-visibility="public"
                    style="
                        width:100%;
                        border:none;
                        background:#f7f8fa;
                        padding:15px;
                        border-radius:12px;
                        text-align:right;
                        cursor:pointer;
                        margin-bottom:8px;
                    "
                >
                    🌎 عام
                </button>


                <button
                    data-visibility="followers"
                    style="
                        width:100%;
                        border:none;
                        background:#f7f8fa;
                        padding:15px;
                        border-radius:12px;
                        text-align:right;
                        cursor:pointer;
                        margin-bottom:8px;
                    "
                >
                    👥 المتابعون
                </button>


                <button
                    data-visibility="private"
                    style="
                        width:100%;
                        border:none;
                        background:#f7f8fa;
                        padding:15px;
                        border-radius:12px;
                        text-align:right;
                        cursor:pointer;
                        margin-bottom:8px;
                    "
                >
                    🔒 أنا فقط
                </button>


                <button
                    id="visibility-close"
                    style="
                        width:100%;
                        border:none;
                        background:#fff2f2;
                        color:#d93025;
                        padding:13px;
                        border-radius:12px;
                        cursor:pointer;
                    "
                >
                    إلغاء
                </button>


                <div
                    id="visibility-message"
                    style="
                        text-align:center;
                        min-height:20px;
                        margin-top:10px;
                        font-size:13px;
                    "
                ></div>

            </div>
        `;


        document.body.appendChild(
            panel
        );


        panel
            .querySelectorAll(
                "[data-visibility]"
            )
            .forEach(
                function(button) {

                    button.addEventListener(
                        "click",
                        async function() {

                            await updateVisibility(
                                reelId,
                                button.dataset.visibility,
                                panel
                            );
                        }
                    );
                }
            );


        panel
            .querySelector(
                "#visibility-close"
            )
            ?.addEventListener(
                "click",
                function() {

                    panel.remove();
                }
            );
    }


    async function updateVisibility(
        reelId,
        visibility,
        panel
    ) {

        const client =
            getSupabase();


        const message =
            panel.querySelector(
                "#visibility-message"
            );


        try {

            const {
                error
            } =
                await client
                    .from("reels")
                    .update({
                        visibility:
                            visibility
                    })
                    .eq(
                        "id",
                        reelId
                    )
                    .eq(
                        "user_id",
                        currentUserId
                    );


            if (error) {
                throw error;
            }


            message.style.color =
                "#16803c";

            message.textContent =
                "تم حفظ الخصوصية.";


            setTimeout(
                async function() {

                    panel.remove();

                    await loadReels();

                    renderReels();

                    scrollToReel(
                        currentIndex,
                        false
                    );

                },
                500
            );


        } catch (error) {

            console.error(
                "Visibility error:",
                error
            );


            message.style.color =
                "#d93025";

            message.textContent =
                error?.message ||
                "تعذر تغيير الخصوصية.";
        }
    }


    /* =====================================================
       أرشفة
    ===================================================== */

    async function archiveReel(
        reelId
    ) {

        closeMenus();


        const confirmed =
            window.confirm(
                "هل تريد أرشفة هذا الـReel؟"
            );


        if (!confirmed) {
            return;
        }


        const client =
            getSupabase();


        try {

            const {
                error
            } =
                await client
                    .from("reels")
                    .update({
                        is_archived:
                            true
                    })
                    .eq(
                        "id",
                        reelId
                    )
                    .eq(
                        "user_id",
                        currentUserId
                    );


            if (error) {
                throw error;
            }


            toast(
                "تمت أرشفة الـReel."
            );


            await loadReels();

            renderReels();

            if (reels.length) {

                currentIndex =
                    Math.min(
                        currentIndex,
                        reels.length - 1
                    );

                scrollToReel(
                    currentIndex,
                    false
                );

            } else {

                showEmpty();
            }


        } catch (error) {

            console.error(
                "Archive reel error:",
                error
            );


            toast(
                error?.message ||
                "تعذر أرشفة الـReel."
            );
        }
    }


    /* =====================================================
       حذف
    ===================================================== */

    async function deleteReel(
        reelId
    ) {

        closeMenus();


        const confirmed =
            window.confirm(
                "هل أنت متأكد من حذف هذا الـReel نهائيًا؟"
            );


        if (!confirmed) {
            return;
        }


        const client =
            getSupabase();


        try {

            const {
                error
            } =
                await client
                    .from("reels")
                    .delete()
                    .eq(
                        "id",
                        reelId
                    )
                    .eq(
                        "user_id",
                        currentUserId
                    );


            if (error) {
                throw error;
            }


            toast(
                "تم حذف الـReel."
            );


            await loadReels();


            if (!reels.length) {

                showEmpty();

                return;
            }


            currentIndex =
                Math.min(
                    currentIndex,
                    reels.length - 1
                );


            renderReels();


            setTimeout(
                function() {

                    scrollToReel(
                        currentIndex,
                        false
                    );

                },
                30
            );


        } catch (error) {

            console.error(
                "Delete reel error:",
                error
            );


            toast(
                error?.message ||
                "تعذر حذف الـReel."
            );
        }
    }


    /* =====================================================
       إغلاق القوائم
    ===================================================== */

    function closeMenus() {

        if (!overlay) {
            return;
        }


        overlay
            .querySelectorAll(
                ".student-reel-more-menu"
            )
            .forEach(
                function(menu) {

                    menu.classList.remove(
                        "show"
                    );
                }
            );
    }


    /* =====================================================
       Toast
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
            "35px";

        element.style.transform =
            "translateX(-50%)";

        element.style.zIndex =
            "10000002";

        element.style.background =
            "#fff";

        element.style.color =
            "#222";

        element.style.padding =
            "11px 16px";

        element.style.borderRadius =
            "12px";

        element.style.fontSize =
            "13px";

        element.style.direction =
            "rtl";

        element.style.boxShadow =
            "0 10px 35px rgba(0,0,0,.3)";


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
       تحميل المحفوظات عند الحاجة
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
       إضافة Reels بجانب Stories
    ===================================================== */

    function createReelsEntry() {

        if (
            document.getElementById(
                "student-reels-entry"
            )
        ) {
            return;
        }


        const story =
            document.querySelector(
                ".story"
            );


        const storiesContainer =
            story?.parentElement;


        if (!storiesContainer) {
            return;
        }


        const entry =
            document.createElement(
                "button"
            );


        entry.id =
            "student-reels-entry";


        entry.type =
            "button";


        entry.innerHTML = `

            <span style="
                width:58px;
                height:58px;
                border-radius:50%;
                display:flex;
                align-items:center;
                justify-content:center;
                background:
                    linear-gradient(
                        135deg,
                        #111,
                        #444
                    );
                color:#fff;
                border:3px solid #fff;
                box-shadow:
                    0 2px 8px
                    rgba(0,0,0,.12);
                font-size:22px;
            ">
                🎬
            </span>

            <span style="
                display:block;
                margin-top:5px;
                font-size:11px;
                color:#333;
                white-space:nowrap;
            ">
                Reels
            </span>
        `;


        entry.style.border =
            "none";

        entry.style.background =
            "transparent";

        entry.style.padding =
            "0";

        entry.style.cursor =
            "pointer";

        entry.style.textAlign =
            "center";

        entry.style.flex =
            "0 0 auto";


        entry.addEventListener(
            "click",
            function() {

                openReels(
                    0
                );
            }
        );


        /*
           يوضع في البداية بجانب Stories
        */

        storiesContainer.insertBefore(
            entry,
            storiesContainer.firstChild
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

    function startReels() {

        injectStyles();

        setTimeout(
            createReelsEntry,
            900
        );
    }


    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            startReels
        );

    } else {

        startReels();
    }

})();
