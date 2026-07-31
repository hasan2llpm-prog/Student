/* =========================================================
   Student - Reels System
   Reels فقط
========================================================= */

(function () {

    "use strict";

    if (window.__studentReelsLoaded) {
        return;
    }

    window.__studentReelsLoaded = true;

    let overlay = null;
    let reels = [];
    let profiles = {};
    let currentIndex = 0;
    let currentUserId = null;
    let loading = false;
    let observerStarted = false;


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
       حماية
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

        #student-reels-entry-inner {
            display:flex;
            flex-direction:column;
            align-items:center;
        }

        #student-reels-entry-circle {
            width:58px;
            height:58px;
            border-radius:50%;
            background:#fff;
            border:3px solid #111;
            display:flex;
            align-items:center;
            justify-content:center;
            box-sizing:border-box;
            box-shadow:
                0 2px 8px rgba(0,0,0,.12);
        }

        #student-reels-entry-icon {
            width:30px;
            height:24px;
            border:3px solid #111;
            border-radius:7px;
            position:relative;
            box-sizing:border-box;
        }

        #student-reels-entry-icon::before {
            content:"";
            position:absolute;
            left:3px;
            top:-7px;
            width:18px;
            height:5px;
            border-top:3px solid #111;
            border-bottom:3px solid #111;
        }

        #student-reels-entry-icon::after {
            content:"";
            position:absolute;
            left:9px;
            top:5px;
            width:0;
            height:0;
            border-top:5px solid transparent;
            border-bottom:5px solid transparent;
            border-left:8px solid #111;
        }

        #student-reels-entry-name {
            margin-top:5px;
            font-size:11px;
            color:#333;
            white-space:nowrap;
        }

        #student-reels-overlay {
            position:fixed;
            inset:0;
            z-index:99999999;
            background:#000;
            display:none;
            direction:rtl;
        }

        #student-reels-overlay.show {
            display:block;
        }

        #student-reels-scroll {
            width:100%;
            height:100%;
            overflow-y:auto;
            scroll-snap-type:y mandatory;
            scrollbar-width:none;
            overscroll-behavior-y:contain;
        }

        #student-reels-scroll::-webkit-scrollbar {
            display:none;
        }

        .student-reel {
            position:relative;
            width:100%;
            height:100dvh;
            min-height:100vh;
            background:#000;
            overflow:hidden;
            scroll-snap-align:start;
            scroll-snap-stop:always;
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
            right:0;
            left:0;
            z-index:10;
            padding:15px;
            display:flex;
            align-items:center;
            gap:10px;
            background:
                linear-gradient(
                    to bottom,
                    rgba(0,0,0,.65),
                    transparent
                );
        }

        .student-reel-title {
            color:#fff;
            font-size:18px;
            font-weight:800;
        }

        .student-reel-publish {
            margin-right:auto;
            border:0;
            background:#0095f6;
            color:#fff;
            padding:9px 14px;
            border-radius:12px;
            font-size:13px;
            font-weight:700;
            cursor:pointer;
        }

        .student-reel-close {
            width:42px;
            height:42px;
            border:0;
            border-radius:50%;
            background:rgba(0,0,0,.5);
            color:#fff;
            font-size:22px;
            cursor:pointer;
        }

        .student-reel-user {
            position:absolute;
            right:15px;
            left:85px;
            bottom:25px;
            z-index:6;
            color:#fff;
            text-shadow:0 1px 6px #000;
        }

        .student-reel-name {
            font-size:16px;
            font-weight:800;
        }

        .student-reel-caption {
            margin-top:7px;
            font-size:13px;
            line-height:1.7;
            white-space:pre-wrap;
        }

        .student-reel-actions {
            position:absolute;
            left:10px;
            bottom:25px;
            z-index:12;
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
            display:flex;
            align-items:center;
            justify-content:center;
            cursor:pointer;
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
            font-size:14px;
            border-bottom:1px solid #eee;
        }

        .student-reel-menu button:last-child {
            border-bottom:0;
        }

        .student-reel-menu .danger {
            color:#d93025;
        }

        .student-reels-empty {
            width:100%;
            height:100%;
            display:flex;
            align-items:center;
            justify-content:center;
            flex-direction:column;
            gap:12px;
            color:#fff;
            text-align:center;
            padding:25px;
            box-sizing:border-box;
        }

        .student-reels-empty-icon {
            width:78px;
            height:78px;
            border:3px solid #fff;
            border-radius:50%;
            display:flex;
            align-items:center;
            justify-content:center;
        }

        .student-reels-empty-reels-icon {
            width:34px;
            height:27px;
            border:3px solid #fff;
            border-radius:8px;
            position:relative;
        }

        .student-reels-empty-reels-icon::after {
            content:"";
            position:absolute;
            left:10px;
            top:6px;
            width:0;
            height:0;
            border-top:6px solid transparent;
            border-bottom:6px solid transparent;
            border-left:10px solid #fff;
        }

        .student-reels-empty-title {
            font-size:19px;
            font-weight:800;
        }

        .student-reels-empty-text {
            color:#aaa;
            font-size:13px;
        }

        .student-reels-empty-publish {
            margin-top:8px;
            border:0;
            background:#0095f6;
            color:#fff;
            padding:13px 22px;
            border-radius:13px;
            font-size:14px;
            font-weight:700;
            cursor:pointer;
        }

        `;

        document.head.appendChild(style);
    }


    /* =====================================================
       مكان Reels بجانب Stories
    ===================================================== */

    function findStoriesContainer() {

        const story =
            document.querySelector(".story");

        if (!story) {
            return null;
        }

        return story.parentElement || null;
    }


    function createReelsEntry() {

        const container =
            findStoriesContainer();

        if (!container) {
            return false;
        }

        const story =
            container.querySelector(".story");

        if (!story) {
            return false;
        }

        let entry =
            document.getElementById(
                "student-reels-entry"
            );

        if (!entry) {

            entry =
                document.createElement("button");

            entry.id =
                "student-reels-entry";

            entry.type =
                "button";

            entry.innerHTML = `

                <span id="
                    student-reels-entry-inner
                ">

                    <span id="
                        student-reels-entry-circle
                    ">

                        <span id="
                            student-reels-entry-icon
                        "></span>

                    </span>

                    <span id="
                        student-reels-entry-name
                    ">
                        Reels
                    </span>

                </span>
            `;

            entry.addEventListener(
                "click",
                function(event) {

                    event.preventDefault();
                    event.stopPropagation();

                    openReels(0);
                }
            );
        }

        /*
           الجهة اليمنى في RTL
        */

        container.insertBefore(
            entry,
            container.firstChild
        );

        resizeEntry();

        return true;
    }


    function resizeEntry() {

        const story =
            document.querySelector(".story");

        const circle =
            document.getElementById(
                "student-reels-entry-circle"
            );

        if (
            !story ||
            !circle
        ) {
            return;
        }

        const rect =
            story.getBoundingClientRect();

        const size =
            Math.round(rect.width);

        circle.style.width =
            `${size}px`;

        circle.style.height =
            `${size}px`;
    }


    function protectEntry() {

        if (observerStarted) {
            return;
        }

        observerStarted = true;

        const observer =
            new MutationObserver(
                function() {

                    setTimeout(
                        function() {

                            createReelsEntry();
                            resizeEntry();

                        },
                        100
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
       النافذة
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
                id="student-reels-scroll"
            ></div>

        `;

        document.body.appendChild(
            overlay
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
            function() {

                scrollToReel(
                    currentIndex,
                    false
                );

            },
            80
        );
    }


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
       الأعمدة الموجودة فعلًا:
       id
       user_id
       video_url
       caption
       thumbnail_url
       created_at
       updated_at
    ===================================================== */

    async function loadReels() {

        loading = true;

        const client =
            await waitForSupabase();

        if (!client) {

            reels = [];
            loading = false;

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
                        created_at,
                        updated_at
                    `)
                    .order(
                        "created_at",
                        {
                            ascending:false
                        }
                    )
                    .limit(100);

            if (error) {
                throw error;
            }

            reels =
                data || [];

            await loadProfiles(
                client
            );

        } catch (error) {

            console.error(
                "Reels loading error:",
                error
            );

            reels = [];

            toast(
                "تعذر تحميل الـReels."
            );

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

        (data || []).forEach(
            function(profile) {

                profiles[
                    profile.id
                ] = profile;
            }
        );
    }


    /* =====================================================
       نشر Reel مباشرة
    ===================================================== */

    function openPublishReel() {

        closeReels();

        if (
            typeof window.openStudentReelCreator ===
            "function"
        ) {

            window.openStudentReelCreator();

            return;
        }

        toast(
            "تعذر فتح نشر الـReel."
        );
    }


    /* =====================================================
       الشاشة الفارغة
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

            <div
                class="
                    student-reels-empty
                "
            >

                <div
                    class="
                        student-reels-empty-icon
                    "
                >

                    <span
                        class="
                            student-reels-empty-reels-icon
                        "
                    ></span>

                </div>

                <div
                    class="
                        student-reels-empty-title
                    "
                >
                    لا توجد Reels بعد
                </div>

                <div
                    class="
                        student-reels-empty-text
                    "
                >
                    كن أول من ينشر Reel في Student
                </div>

                <button
                    type="button"
                    class="
                        student-reels-empty-publish
                    "
                    data-empty-publish
                >
                    🎬 نشر أول Reel
                </button>

            </div>
        `;

        container
            .querySelector(
                "[data-empty-publish]"
            )
            ?.addEventListener(
                "click",
                openPublishReel
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
                        profile.full_name ||
                        "مستخدم";

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
                            student-reel
                        "
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


                        <div
                            class="
                                student-reel-top
                            "
                        >

                            <div
                                class="
                                    student-reel-title
                                "
                            >
                                Reels
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
                                type="button"
                                class="
                                    student-reel-close
                                "
                                data-close
                            >
                                ×
                            </button>

                        </div>


                        <div
                            class="
                                student-reel-user
                            "
                        >

                            <div
                                class="
                                    student-reel-name
                                "
                            >
                                @${escapeHTML(
                                    username
                                )}
                            </div>


                            ${
                                reel.caption
                                    ? `
                                        <div
                                            class="
                                                student-reel-caption
                                            "
                                        >
                                            ${escapeHTML(
                                                reel.caption
                                            )}
                                        </div>
                                    `
                                    : ""
                            }

                        </div>


                        <div
                            class="
                                student-reel-actions
                            "
                        >

                            <button
                                type="button"
                                class="
                                    student-reel-action
                                "
                                data-like
                            >
                                ❤️
                            </button>


                            <button
                                type="button"
                                class="
                                    student-reel-action
                                "
                                data-comment
                            >
                                💬
                            </button>


                            <button
                                type="button"
                                class="
                                    student-reel-action
                                "
                                data-save
                            >
                                🔖
                            </button>


                            <button
                                type="button"
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
                                            type="button"
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
                                            type="button"
                                            data-edit
                                        >
                                            ✏️ تعديل
                                        </button>

                                        <button
                                            type="button"
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
    }


    /* =====================================================
       التمرير
    ===================================================== */

    let scrollTimer = null;


    function bindScroll() {

        const container =
            document.getElementById(
                "student-reels-scroll"
            );

        if (!container) {
            return;
        }

        container.addEventListener(
            "scroll",
            function() {

                clearTimeout(
                    scrollTimer
                );

                scrollTimer =
                    setTimeout(
                        function() {

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
                        100
                    );

            },
            {
                passive:true
            }
        );
    }


    function scrollToReel(
        index,
        smooth = true
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
                            true;

                        video.play()
                            .catch(
                                function(){}
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

                            openPublishReel();
                        };
                }
            );


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
                                    "المشاركة غير متاحة."
                                );
                            }
                        };
                }
            );


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


        container
            .querySelectorAll(
                "[data-delete]"
            )
            .forEach(
                function(button) {

                    button.onclick =
                        async function() {

                            const slide =
                                button.closest(
                                    ".student-reel"
                                );

                            await deleteReel(
                                slide?.dataset.id
                            );
                        };
                }
            );


        bindScroll();
    }


    /* =====================================================
       حذف
    ===================================================== */

    async function deleteReel(
        id
    ) {

        if (!id) {
            return;
        }

        if (
            !confirm(
                "هل تريد حذف هذا الـReel؟"
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
       رسالة
    ===================================================== */

    function toast(message) {

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
            "30px";

        element.style.transform =
            "translateX(-50%)";

        element.style.zIndex =
            "100000000";

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

    window.openStudentReels =
        openReels;

    window.closeStudentReels =
        closeReels;


    /* =====================================================
       التشغيل
    ===================================================== */

    function start() {

        injectStyles();

        createReelsEntry();

        protectEntry();

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
