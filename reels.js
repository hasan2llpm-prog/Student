/* =========================================================
   Student - Reels Core
   Likes + Comments + Share + Save + Views
   Sound + Edit + Privacy + Report + Delete
========================================================= */

(function () {

    "use strict";

    if (window.__studentReelsLoaded) return;

    window.__studentReelsLoaded = true;

    let overlay = null;
    let reels = [];
    let profiles = {};
    let currentUserId = null;
    let currentIndex = 0;
    let loading = false;
    let observerStarted = false;
    let scrollTimer = null;

    /* =====================================================
       Supabase
    ===================================================== */

    function getSupabase() {
        return (
            typeof supabaseClient !== "undefined" &&
            supabaseClient
        ) ? supabaseClient : null;
    }

    async function waitForSupabase() {
        for (let i = 0; i < 50; i++) {
            const client = getSupabase();

            if (client) {
                return client;
            }

            await new Promise(resolve =>
                setTimeout(resolve, 200)
            );
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
            box-shadow:0 2px 8px rgba(0,0,0,.12);
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
            cursor:pointer;
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
            background:linear-gradient(
                to bottom,
                rgba(0,0,0,.7),
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
            right:18px;
            left:100px;
            bottom:28px;
            z-index:8;
            color:#fff;
            text-shadow:0 1px 7px #000;
        }

        .student-reel-name {
            font-size:15px;
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
            right:12px;
            bottom:105px;
            z-index:20;
            display:flex;
            flex-direction:column;
            align-items:center;
            gap:15px;
        }

        .student-reel-action-wrap {
            display:flex;
            flex-direction:column;
            align-items:center;
            gap:3px;
        }

        .student-reel-action {
            width:48px;
            height:48px;
            padding:0;
            border:0;
            border-radius:50%;
            background:rgba(0,0,0,.38);
            color:#fff;
            font-size:21px;
            display:flex;
            align-items:center;
            justify-content:center;
            cursor:pointer;
            backdrop-filter:blur(6px);
        }

        .student-reel-action.active {
            color:#ff3040;
        }

        .student-reel-action.saved {
            color:#ffd400;
        }

        .student-reel-count,
        .student-reel-label {
            color:#fff;
            font-size:10px;
            text-shadow:0 1px 5px #000;
        }

        .student-reel-menu {
            position:absolute;
            right:74px;
            bottom:95px;
            width:220px;
            background:#fff;
            border-radius:16px;
            overflow:hidden;
            display:none;
            z-index:50;
            box-shadow:0 15px 40px rgba(0,0,0,.35);
        }

        .student-reel-menu.show {
            display:block;
        }

        .student-reel-menu button {
            width:100%;
            border:0;
            background:#fff;
            padding:15px;
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

        #student-reel-comments {
            position:fixed;
            inset:0;
            z-index:100000001;
            display:none;
            align-items:flex-end;
            justify-content:center;
            background:rgba(0,0,0,.45);
            direction:rtl;
        }

        #student-reel-comments.show {
            display:flex;
        }

        .student-reel-comments-box {
            width:100%;
            max-width:620px;
            height:min(78vh,650px);
            background:#fff;
            border-radius:24px 24px 0 0;
            display:flex;
            flex-direction:column;
            overflow:hidden;
        }

        .student-reel-comments-header {
            display:flex;
            align-items:center;
            gap:10px;
            padding:15px;
            border-bottom:1px solid #eee;
        }

        .student-reel-comments-title {
            flex:1;
            font-size:17px;
            font-weight:800;
        }

        .student-reel-comments-close {
            width:40px;
            height:40px;
            border:0;
            border-radius:50%;
            background:#f1f3f5;
            cursor:pointer;
        }

        .student-reel-comments-list {
            flex:1;
            overflow-y:auto;
            padding:12px;
        }

        .student-reel-comment {
            display:flex;
            gap:9px;
            padding:10px 3px;
        }

        .student-reel-comment-avatar,
        .student-reel-comment-avatar-placeholder {
            width:38px;
            height:38px;
            border-radius:50%;
            flex-shrink:0;
        }

        .student-reel-comment-avatar {
            object-fit:cover;
            background:#eee;
        }

        .student-reel-comment-avatar-placeholder {
            background:#eaf5ff;
            color:#0095f6;
            display:flex;
            align-items:center;
            justify-content:center;
        }

        .student-reel-comment-body {
            flex:1;
        }

        .student-reel-comment-name {
            font-size:13px;
            font-weight:800;
        }

        .student-reel-comment-text {
            margin-top:4px;
            font-size:13px;
            line-height:1.7;
            white-space:pre-wrap;
        }

        .student-reel-comment-time {
            margin-top:4px;
            color:#999;
            font-size:10px;
        }

        .student-reel-comment-delete {
            border:0;
            background:transparent;
            color:#d93025;
            cursor:pointer;
        }

        .student-reel-comments-form {
            display:flex;
            gap:8px;
            padding:10px;
            border-top:1px solid #eee;
        }

        .student-reel-comments-input {
            flex:1;
            height:44px;
            resize:none;
            border:1px solid #ddd;
            border-radius:13px;
            padding:11px;
            outline:none;
        }

        .student-reel-comments-send {
            width:48px;
            height:44px;
            border:0;
            border-radius:13px;
            background:#0095f6;
            color:#fff;
            cursor:pointer;
        }

        #student-reels-dialog {
            position:fixed;
            inset:0;
            z-index:100000010;
            display:none;
            align-items:center;
            justify-content:center;
            background:rgba(0,0,0,.5);
            padding:20px;
        }

        #student-reels-dialog.show {
            display:flex;
        }

        .student-reels-dialog-box {
            width:100%;
            max-width:430px;
            background:#fff;
            border-radius:22px;
            padding:20px;
            direction:rtl;
        }

        .student-reels-dialog-title {
            font-size:20px;
            font-weight:800;
            margin-bottom:15px;
        }

        .student-reels-dialog-input {
            width:100%;
            min-height:120px;
            box-sizing:border-box;
            border:1px solid #ddd;
            border-radius:14px;
            padding:13px;
        }

        .student-reels-dialog-buttons {
            display:flex;
            gap:10px;
            margin-top:15px;
        }

        .student-reels-dialog-btn {
            flex:1;
            border:0;
            padding:13px;
            border-radius:12px;
            cursor:pointer;
            font-weight:700;
        }

        .student-reels-dialog-cancel {
            background:#f1f3f5;
        }

        .student-reels-dialog-save {
            background:#0095f6;
            color:#fff;
        }

        .student-reels-dialog-delete {
            background:#d93025;
            color:#fff;
        }

        .student-reels-dialog-message {
            min-height:20px;
            margin-top:10px;
            text-align:center;
            font-size:13px;
        }

        .student-reels-share-list {
            max-height:300px;
            overflow-y:auto;
            margin-top:12px;
        }

        .student-reels-user {
            display:flex;
            align-items:center;
            gap:10px;
            padding:10px;
            border-radius:12px;
            cursor:pointer;
        }

        .student-reels-user:hover {
            background:#f5f6f7;
        }

        .student-reels-user-avatar {
            width:42px;
            height:42px;
            border-radius:50%;
            object-fit:cover;
            background:#eaf5ff;
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
        }

        .student-reels-empty-publish {
            margin-top:8px;
            border:0;
            background:#0095f6;
            color:#fff;
            padding:13px 22px;
            border-radius:13px;
            cursor:pointer;
        }
        `;

        document.head.appendChild(style);
    }

    /* =====================================================
       Reels Entry
    ===================================================== */

    function findStoriesContainer() {
        const story = document.querySelector(".story");
        return story ? story.parentElement : null;
    }

    function createReelsEntry() {

        const container = findStoriesContainer();
        if (!container) return false;

        const story = container.querySelector(".story");
        if (!story) return false;

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
                <span id="student-reels-entry-inner">
                    <span id="student-reels-entry-circle">
                        <span id="student-reels-entry-icon"></span>
                    </span>
                    <span id="student-reels-entry-name">
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
        }

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

        if (!story || !circle) return;

        const size =
            Math.round(
                story.getBoundingClientRect().width
            );

        circle.style.width =
            `${size}px`;

        circle.style.height =
            `${size}px`;
    }

    function protectEntry() {

        if (observerStarted) return;

        observerStarted = true;

        const observer =
            new MutationObserver(
                function () {

                    if (
                        !document.getElementById(
                            "student-reels-entry"
                        )
                    ) {
                        setTimeout(
                            createReelsEntry,
                            100
                        );
                    }

                    resizeEntry();
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
       Main Overlay
    ===================================================== */

    function createOverlay() {

        if (overlay) return;

        overlay =
            document.createElement("div");

        overlay.id =
            "student-reels-overlay";

        overlay.innerHTML = `
            <div id="student-reels-scroll"></div>
        `;

        document.body.appendChild(
            overlay
        );
    }

    /* =====================================================
       Edit / Delete Dialog
    ===================================================== */

    function createDialog() {

        if (
            document.getElementById(
                "student-reels-dialog"
            )
        ) return;

        const dialog =
            document.createElement("div");

        dialog.id =
            "student-reels-dialog";

        dialog.innerHTML = `
            <div class="student-reels-dialog-box">

                <div
                    id="student-reels-dialog-title"
                    class="student-reels-dialog-title"
                ></div>

                <textarea
                    id="student-reels-dialog-input"
                    class="student-reels-dialog-input"
                ></textarea>

                <div
                    id="student-reels-dialog-message"
                    class="student-reels-dialog-message"
                ></div>

                <div
                    class="student-reels-dialog-buttons"
                >

                    <button
                        id="student-reels-dialog-cancel"
                        class="
                            student-reels-dialog-btn
                            student-reels-dialog-cancel
                        "
                        type="button"
                    >
                        إلغاء
                    </button>

                    <button
                        id="student-reels-dialog-action"
                        class="student-reels-dialog-btn"
                        type="button"
                    ></button>

                </div>
            </div>
        `;

        document.body.appendChild(
            dialog
        );

        dialog.addEventListener(
            "click",
            function (event) {

                if (
                    event.target ===
                    dialog
                ) {
                    closeDialog();
                }
            }
        );

        document
            .getElementById(
                "student-reels-dialog-cancel"
            )
            ?.addEventListener(
                "click",
                closeDialog
            );
    }

    function closeDialog() {

        const dialog =
            document.getElementById(
                "student-reels-dialog"
            );

        dialog?.classList.remove(
            "show"
        );
    }

    /* =====================================================
       Comments Dialog
    ===================================================== */

    function createCommentsDialog() {

        if (
            document.getElementById(
                "student-reel-comments"
            )
        ) return;

        const dialog =
            document.createElement(
                "div"
            );

        dialog.id =
            "student-reel-comments";

        dialog.innerHTML = `
            <div class="student-reel-comments-box">

                <div class="student-reel-comments-header">

                    <div
                        class="student-reel-comments-title"
                    >
                        التعليقات
                    </div>

                    <button
                        id="student-reel-comments-close"
                        class="student-reel-comments-close"
                        type="button"
                    >
                        ×
                    </button>
                </div>

                <div
                    id="student-reel-comments-list"
                    class="student-reel-comments-list"
                ></div>

                <form
                    id="student-reel-comments-form"
                    class="student-reel-comments-form"
                >

                    <textarea
                        id="student-reel-comments-input"
                        class="student-reel-comments-input"
                        maxlength="1000"
                        placeholder="اكتب تعليقًا..."
                        required
                    ></textarea>

                    <button
                        type="submit"
                        class="student-reel-comments-send"
                    >
                        <i class="fa-solid fa-paper-plane"></i>
                    </button>

                </form>

            </div>
        `;

        document.body.appendChild(
            dialog
        );

        dialog.addEventListener(
            "click",
            function (event) {

                if (
                    event.target ===
                    dialog
                ) {
                    closeComments();
                }
            }
        );

        document
            .getElementById(
                "student-reel-comments-close"
            )
            ?.addEventListener(
                "click",
                closeComments
            );

        document
            .getElementById(
                "student-reel-comments-form"
            )
            ?.addEventListener(
                "submit",
                submitComment
            );
    }

    function closeComments() {

        document
            .getElementById(
                "student-reel-comments"
            )
            ?.classList.remove(
                "show"
            );
    }

    /* =====================================================
       Share Dialog
    ===================================================== */

    function createShareDialog() {

        if (
            document.getElementById(
                "student-reel-share-dialog"
            )
        ) return;

        const dialog =
            document.createElement("div");

        dialog.id =
            "student-reel-share-dialog";

        dialog.style.cssText = `
            position:fixed;
            inset:0;
            z-index:100000020;
            display:none;
            align-items:center;
            justify-content:center;
            background:rgba(0,0,0,.5);
            padding:20px;
        `;

        dialog.innerHTML = `
            <div
                style="
                    width:100%;
                    max-width:430px;
                    background:#fff;
                    border-radius:22px;
                    padding:20px;
                    direction:rtl;
                "
            >

                <div
                    id="student-reel-share-title"
                    style="
                        font-size:20px;
                        font-weight:800;
                        margin-bottom:12px;
                    "
                >
                    مشاركة Reel
                </div>

                <input
                    id="student-reel-share-search"
                    type="text"
                    placeholder="ابحث عن مستخدم..."
                    style="
                        width:100%;
                        box-sizing:border-box;
                        border:1px solid #ddd;
                        border-radius:12px;
                        padding:12px;
                        outline:none;
                    "
                >

                <div
                    id="student-reel-share-list"
                    class="student-reels-share-list"
                ></div>

                <button
                    id="student-reel-share-close"
                    type="button"
                    style="
                        width:100%;
                        margin-top:10px;
                        border:0;
                        border-radius:12px;
                        padding:12px;
                        background:#f1f3f5;
                        cursor:pointer;
                    "
                >
                    إغلاق
                </button>

            </div>
        `;

        document.body.appendChild(
            dialog
        );

        document
            .getElementById(
                "student-reel-share-close"
            )
            ?.addEventListener(
                "click",
                closeShareDialog
            );

        document
            .getElementById(
                "student-reel-share-search"
            )
            ?.addEventListener(
                "input",
                function () {

                    const reelId =
                        dialog.dataset.reelId;

                    searchShareUsers(
                        this.value,
                        reelId
                    );
                }
            );
    }

    function openShareDialog(
        reelId
    ) {

        createShareDialog();

        const dialog =
            document.getElementById(
                "student-reel-share-dialog"
            );

        dialog.dataset.reelId =
            String(reelId);

        dialog.style.display =
            "flex";

        document
            .getElementById(
                "student-reel-share-search"
            )
            .value =
            "";

        searchShareUsers(
            "",
            reelId
        );
    }

    function closeShareDialog() {

        const dialog =
            document.getElementById(
                "student-reel-share-dialog"
            );

        if (dialog) {
            dialog.style.display =
                "none";
        }
    }

    async function searchShareUsers(
        term,
        reelId
    ) {

        const client =
            getSupabase();

        const list =
            document.getElementById(
                "student-reel-share-list"
            );

        if (!client || !list) return;

        list.innerHTML =
            `<div style="
                padding:20px;
                text-align:center;
                color:#999;
            ">
                جاري التحميل...
            </div>`;

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

            if (term.trim()) {

                const safe =
                    term
                        .trim()
                        .replace(
                            /[%_]/g,
                            ""
                        );

                query =
                    query.or(
                        `username.ilike.%${safe}%,full_name.ilike.%${safe}%`
                    );
            }

            const {
                data,
                error
            } =
                await query;

            if (error) throw error;

            if (!data?.length) {

                list.innerHTML =
                    `<div style="
                        padding:20px;
                        text-align:center;
                        color:#999;
                    ">
                        لا يوجد مستخدمون.
                    </div>`;

                return;
            }

            list.innerHTML =
                data.map(
                    user => `

                        <div
                            class="student-reels-user"
                            data-share-user="${escapeHTML(
                                user.id
                            )}"
                        >

                            ${
                                user.avatar_url
                                    ? `
                                        <img
                                            class="
                                                student-reels-user-avatar
                                            "
                                            src="${escapeHTML(
                                                user.avatar_url
                                            )}"
                                            alt=""
                                        >
                                      `
                                    : `
                                        <div
                                            class="
                                                student-reels-user-avatar
                                            "
                                            style="
                                                display:flex;
                                                align-items:center;
                                                justify-content:center;
                                                color:#0095f6;
                                                background:#eaf5ff;
                                            "
                                        >
                                            <i class="
                                                fa-solid
                                                fa-user
                                            "></i>
                                        </div>
                                      `
                            }

                            <div>

                                <div
                                    style="
                                        font-weight:800;
                                    "
                                >
                                    ${escapeHTML(
                                        user.full_name ||
                                        user.username ||
                                        "مستخدم"
                                    )}
                                </div>

                                <div
                                    style="
                                        color:#888;
                                        font-size:12px;
                                        margin-top:3px;
                                    "
                                >
                                    @${escapeHTML(
                                        user.username ||
                                        ""
                                    )}
                                </div>

                            </div>

                        </div>
                    `
                ).join("");

            list
                .querySelectorAll(
                    "[data-share-user]"
                )
                .forEach(
                    item => {

                        item.addEventListener(
                            "click",
                            function () {

                                sendReelMessage(
                                    reelId,
                                    this.dataset.shareUser
                                );

                            }
                        );
                    }
                );

        } catch (error) {

            console.error(
                "Share users error:",
                error
            );

            list.innerHTML =
                `<div style="
                    padding:20px;
                    text-align:center;
                    color:#d93025;
                ">
                    تعذر تحميل المستخدمين.
                </div>`;
        }
    }

    async function sendReelMessage(
        reelId,
        recipientId
    ) {

        const client =
            getSupabase();

        if (!client) return;

        try {

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
                            `🎬 تم إرسال Reel إليك\n#reel=${reelId}`
                    });

            if (error) throw error;

            closeShareDialog();

            toast(
                "تم إرسال الـReel."
            );

        } catch (error) {

            console.error(
                "Send reel error:",
                error
            );

            toast(
                "تعذر إرسال الـReel."
            );
        }
    }

    /* =====================================================
       Open Reels
    ===================================================== */

    async function openReels(
        startIndex = 0
    ) {

        if (loading) return;

        injectStyles();
        createOverlay();
        createCommentsDialog();

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
            100
        );
    }

    function closeReels() {

        overlay
            ?.querySelectorAll("video")
            .forEach(
                video => video.pause()
            );

        overlay?.classList.remove(
            "show"
        );

        closeComments();
        closeShareDialog();
        closeDialog();
    }

    /* =====================================================
       Load Reels
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
                        visibility,
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

            if (error) throw error;

            reels =
                data || [];

            await loadProfiles(
                client
            );

            await loadStats(
                client
            );

        } catch (error) {

            console.error(
                "Reels loading error:",
                error
            );

            /*
               حتى لو كانت visibility
               غير موجودة لأي سبب،
               نحاول تحميل النسخة القديمة.
            */

            try {

                const {
                    data
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

                reels =
                    data || [];

                await loadProfiles(
                    client
                );

                await loadStats(
                    client
                );

            } catch (fallbackError) {

                console.error(
                    fallbackError
                );

                reels = [];

                toast(
                    "تعذر تحميل الـReels."
                );
            }

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
                        item =>
                            item.user_id
                    )
                )
            );

        if (!ids.length) return;

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

        if (error) return;

        (data || []).forEach(
            profile => {
                profiles[
                    profile.id
                ] = profile;
            }
        );
    }

    /* =====================================================
       Stats
    ===================================================== */

    async function loadStats(
        client
    ) {

        await Promise.all(
            reels.map(
                async function (reel) {

                    try {

                        const {
                            count:likes
                        } =
                            await client
                                .from(
                                    "reel_likes"
                                )
                                .select(
                                    "reel_id",
                                    {
                                        count:"exact",
                                        head:true
                                    }
                                )
                                .eq(
                                    "reel_id",
                                    reel.id
                                );

                        const {
                            count:comments
                        } =
                            await client
                                .from(
                                    "reel_comments"
                                )
                                .select(
                                    "id",
                                    {
                                        count:"exact",
                                        head:true
                                    }
                                )
                                .eq(
                                    "reel_id",
                                    reel.id
                                );

                        const {
                            count:views
                        } =
                            await client
                                .from(
                                    "reel_views"
                                )
                                .select(
                                    "reel_id",
                                    {
                                        count:"exact",
                                        head:true
                                    }
                                )
                                .eq(
                                    "reel_id",
                                    reel.id
                                );

                        reel.likeCount =
                            likes || 0;

                        reel.commentCount =
                            comments || 0;

                        reel.viewCount =
                            views || 0;

                        reel.liked =
                            false;

                        if (currentUserId) {

                            const {
                                data:liked
                            } =
                                await client
                                    .from(
                                        "reel_likes"
                                    )
                                    .select(
                                        "reel_id"
                                    )
                                    .eq(
                                        "reel_id",
                                        reel.id
                                    )
                                    .eq(
                                        "user_id",
                                        currentUserId
                                    )
                                    .maybeSingle();

                            reel.liked =
                                !!liked;
                        }

                    } catch (error) {

                        console.error(
                            "Stats error:",
                            error
                        );

                        reel.likeCount = 0;
                        reel.commentCount = 0;
                        reel.viewCount = 0;
                        reel.liked = false;
                    }
                }
            )
        );
    }

    /* =====================================================
       Publish
    ===================================================== */

    function openPublishReel() {

        closeReels();

        if (
            typeof window.openStudentReelCreator ===
            "function"
        ) {

            window.openStudentReelCreator();

        } else {

            toast(
                "نظام نشر الـReel غير جاهز."
            );
        }
    }

    /* =====================================================
       Render
    ===================================================== */

    function renderReels() {

        const container =
            document.getElementById(
                "student-reels-scroll"
            );

        if (!container) return;

        container.innerHTML =
            reels.map(
                function (reel,index) {

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
                        class="student-reel"
                        data-id="${escapeHTML(
                            reel.id
                        )}"
                        data-index="${index}"
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


                        <div class="student-reel-top">

                            <div class="student-reel-title">
                                Reels
                            </div>


                            <button
                                type="button"
                                class="student-reel-publish"
                                data-publish
                            >
                                🎬 نشر Reel
                            </button>


                            <button
                                type="button"
                                class="student-reel-close"
                                data-close
                            >
                                ×
                            </button>

                        </div>


                        <div class="student-reel-user">

                            <div class="student-reel-name">
                                @${escapeHTML(
                                    username
                                )}
                            </div>

                            ${
                                reel.caption
                                    ? `
                                        <div
                                            class="student-reel-caption"
                                        >
                                            ${escapeHTML(
                                                reel.caption
                                            )}
                                        </div>
                                      `
                                    : ""
                            }

                        </div>


                        <div class="student-reel-actions">

                            <div class="student-reel-action-wrap">

                                <button
                                    type="button"
                                    class="
                                        student-reel-action
                                        ${reel.liked ? "active" : ""}
                                    "
                                    data-like
                                >
                                    <i class="
                                        ${
                                            reel.liked
                                                ? "fa-solid"
                                                : "fa-regular"
                                        }
                                        fa-heart
                                    "></i>
                                </button>

                                <span
                                    class="student-reel-count"
                                    data-like-count
                                >
                                    ${reel.likeCount || 0}
                                </span>

                            </div>


                            <div class="student-reel-action-wrap">

                                <button
                                    type="button"
                                    class="student-reel-action"
                                    data-comments
                                >
                                    <i class="
                                        fa-regular
                                        fa-comment
                                    "></i>
                                </button>

                                <span
                                    class="student-reel-count"
                                    data-comment-count
                                >
                                    ${reel.commentCount || 0}
                                </span>

                            </div>


                            <div class="student-reel-action-wrap">

                                <button
                                    type="button"
                                    class="student-reel-action"
                                    data-share
                                >
                                    <i class="
                                        fa-solid
                                        fa-paper-plane
                                    "></i>
                                </button>

                                <span class="student-reel-label">
                                    مشاركة
                                </span>

                            </div>


                            <div class="student-reel-action-wrap">

                                <button
                                    type="button"
                                    class="student-reel-action"
                                    data-save
                                >
                                    <i class="
                                        fa-regular
                                        fa-bookmark
                                    "></i>
                                </button>

                                <span class="student-reel-label">
                                    حفظ
                                </span>

                            </div>


                            <div class="student-reel-action-wrap">

                                <button
                                    type="button"
                                    class="student-reel-action"
                                    data-volume
                                >
                                    <i class="
                                        fa-solid
                                        fa-volume-high
                                    "></i>
                                </button>

                                <span class="student-reel-label">
                                    صوت
                                </span>

                            </div>


                            <div class="student-reel-action-wrap">

                                <button
                                    type="button"
                                    class="student-reel-action"
                                    data-views
                                >
                                    <i class="
                                        fa-regular
                                        fa-eye
                                    "></i>
                                </button>

                                <span
                                    class="student-reel-count"
                                >
                                    ${reel.viewCount || 0}
                                </span>

                            </div>


                            ${
                                owner
                                    ? `
                                        <div class="student-reel-action-wrap">

                                            <button
                                                type="button"
                                                class="student-reel-action"
                                                data-more
                                            >
                                                <i class="
                                                    fa-solid
                                                    fa-ellipsis
                                                "></i>
                                            </button>

                                            <span class="student-reel-label">
                                                المزيد
                                            </span>

                                        </div>
                                      `
                                    : ""
                            }

                        </div>


                        ${
                            owner
                                ? `
                                    <div
                                        class="student-reel-menu"
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
                                            data-privacy
                                        >
                                            🔒 الخصوصية
                                        </button>

                                        <button
                                            type="button"
                                            data-delete
                                            class="danger"
                                        >
                                            🗑️ حذف
                                        </button>

                                    </div>
                                  `
                                : `
                                    <div
                                        class="student-reel-menu"
                                        data-menu
                                    >

                                        <button
                                            type="button"
                                            data-report
                                        >
                                            🚩 إبلاغ
                                        </button>

                                        <button
                                            type="button"
                                            data-hide
                                        >
                                            🚫 إخفاء Reel
                                        </button>

                                    </div>
                                  `
                        }

                    </section>
                    `;
                }
            )
            .join("");

        bindButtons();
        bindScroll();
    }

    /* =====================================================
       Like
    ===================================================== */

    async function toggleLike(
        reelId,
        button,
        counter
    ) {

        const client =
            getSupabase();

        if (!client) return;

        if (!currentUserId) {
            toast(
                "يجب تسجيل الدخول أولًا."
            );
            return;
        }

        button.disabled = true;

        try {

            const {
                data:existing
            } =
                await client
                    .from("reel_likes")
                    .select(
                        "reel_id"
                    )
                    .eq(
                        "reel_id",
                        reelId
                    )
                    .eq(
                        "user_id",
                        currentUserId
                    )
                    .maybeSingle();

            let liked = false;

            if (existing) {

                const {
                    error
                } =
                    await client
                        .from("reel_likes")
                        .delete()
                        .eq(
                            "reel_id",
                            reelId
                        )
                        .eq(
                            "user_id",
                            currentUserId
                        );

                if (error) throw error;

            } else {

                const {
                    error
                } =
                    await client
                        .from("reel_likes")
                        .insert({
                            reel_id:
                                reelId,
                            user_id:
                                currentUserId
                        });

                if (error) throw error;

                liked = true;
            }

            const {
                count
            } =
                await client
                    .from("reel_likes")
                    .select(
                        "reel_id",
                        {
                            count:"exact",
                            head:true
                        }
                    )
                    .eq(
                        "reel_id",
                        reelId
                    );

            button.classList.toggle(
                "active",
                liked
            );

            const icon =
                button.querySelector("i");

            if (icon) {

                icon.classList.toggle(
                    "fa-solid",
                    liked
                );

                icon.classList.toggle(
                    "fa-regular",
                    !liked
                );
            }

            if (counter) {
                counter.textContent =
                    count || 0;
            }

        } catch (error) {

            console.error(
                "Like error:",
                error
            );

            toast(
                "تعذر تحديث الإعجاب."
            );

        } finally {

            button.disabled = false;
        }
    }

    /* =====================================================
       Comments
    ===================================================== */

    async function openComments(
        reelId
    ) {

        createCommentsDialog();

        const dialog =
            document.getElementById(
                "student-reel-comments"
            );

        dialog.dataset.reelId =
            String(reelId);

        dialog.classList.add(
            "show"
        );

        await loadComments(
            reelId
        );
    }

    async function loadComments(
        reelId
    ) {

        const client =
            getSupabase();

        const list =
            document.getElementById(
                "student-reel-comments-list"
            );

        if (!client || !list) return;

        list.innerHTML =
            `
            <div style="
                padding:30px;
                text-align:center;
                color:#999;
            ">
                جاري التحميل...
            </div>
            `;

        try {

            const {
                data,
                error
            } =
                await client
                    .from(
                        "reel_comments"
                    )
                    .select(`
                        id,
                        reel_id,
                        user_id,
                        content,
                        created_at
                    `)
                    .eq(
                        "reel_id",
                        reelId
                    )
                    .order(
                        "created_at",
                        {
                            ascending:true
                        }
                    );

            if (error) throw error;

            const comments =
                data || [];

            if (!comments.length) {

                list.innerHTML =
                    `
                    <div style="
                        padding:50px 15px;
                        text-align:center;
                        color:#999;
                    ">
                        لا توجد تعليقات بعد.
                    </div>
                    `;

                return;
            }

            const ids =
                Array.from(
                    new Set(
                        comments.map(
                            comment =>
                                comment.user_id
                        )
                    )
                );

            let commentProfiles = {};

            if (ids.length) {

                const {
                    data:profileData
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

                (profileData || [])
                    .forEach(
                        profile => {

                            commentProfiles[
                                profile.id
                            ] =
                                profile;
                        }
                    );
            }

            list.innerHTML =
                comments.map(
                    comment => {

                        const profile =
                            commentProfiles[
                                comment.user_id
                            ] || {};

                        const name =
                            profile.username ||
                            profile.full_name ||
                            "مستخدم";

                        return `
                            <div
                                class="student-reel-comment"
                            >

                                ${
                                    profile.avatar_url
                                        ? `
                                            <img
                                                class="
                                                    student-reel-comment-avatar
                                                "
                                                src="${escapeHTML(
                                                    profile.avatar_url
                                                )}"
                                                alt=""
                                            >
                                          `
                                        : `
                                            <div
                                                class="
                                                    student-reel-comment-avatar-placeholder
                                                "
                                            >
                                                <i class="
                                                    fa-solid
                                                    fa-user
                                                "></i>
                                            </div>
                                          `
                                }

                                <div
                                    class="
                                        student-reel-comment-body
                                    "
                                >

                                    <div
                                        class="
                                            student-reel-comment-name
                                        "
                                    >
                                        @${escapeHTML(
                                            name
                                        )}
                                    </div>

                                    <div
                                        class="
                                            student-reel-comment-text
                                        "
                                    >
                                        ${escapeHTML(
                                            comment.content
                                        )}
                                    </div>

                                    <div
                                        class="
                                            student-reel-comment-time
                                        "
                                    >
                                        ${formatDate(
                                            comment.created_at
                                        )}
                                    </div>

                                </div>

                                ${
                                    String(
                                        comment.user_id
                                    ) ===
                                    String(
                                        currentUserId
                                    )
                                        ? `
                                            <button
                                                type="button"
                                                class="
                                                    student-reel-comment-delete
                                                "
                                                data-comment-delete="${escapeHTML(
                                                    comment.id
                                                )}"
                                            >
                                                حذف
                                            </button>
                                          `
                                        : ""
                                }

                            </div>
                        `;
                    }
                )
                .join("");

            list
                .querySelectorAll(
                    "[data-comment-delete]"
                )
                .forEach(
                    button => {

                        button.onclick =
                            function () {

                                deleteComment(
                                    this.dataset.commentDelete,
                                    reelId
                                );

                            };
                    }
                );

        } catch (error) {

            console.error(
                "Comments error:",
                error
            );

            list.innerHTML =
                `
                <div style="
                    padding:30px;
                    text-align:center;
                    color:#d93025;
                ">
                    تعذر تحميل التعليقات.
                </div>
                `;
        }
    }

    async function submitComment(
        event
    ) {

        event.preventDefault();

        const client =
            getSupabase();

        if (!client || !currentUserId) {
            toast(
                "يجب تسجيل الدخول أولًا."
            );
            return;
        }

        const dialog =
            document.getElementById(
                "student-reel-comments"
            );

        const reelId =
            dialog?.dataset.reelId;

        const input =
            document.getElementById(
                "student-reel-comments-input"
            );

        const content =
            input?.value.trim();

        if (!reelId || !content) {
            return;
        }

        try {

            const {
                error
            } =
                await client
                    .from(
                        "reel_comments"
                    )
                    .insert({
                        reel_id:
                            reelId,
                        user_id:
                            currentUserId,
                        content:
                            content
                    });

            if (error) throw error;

            input.value = "";

            await loadComments(
                reelId
            );

            await refreshCommentCount(
                reelId
            );

        } catch (error) {

            console.error(
                "Comment error:",
                error
            );

            toast(
                "تعذر نشر التعليق."
            );
        }
    }

    async function deleteComment(
        commentId,
        reelId
    ) {

        const client =
            getSupabase();

        if (!client) return;

        try {

            const {
                error
            } =
                await client
                    .from(
                        "reel_comments"
                    )
                    .delete()
                    .eq(
                        "id",
                        commentId
                    )
                    .eq(
                        "user_id",
                        currentUserId
                    );

            if (error) throw error;

            await loadComments(
                reelId
            );

            await refreshCommentCount(
                reelId
            );

        } catch (error) {

            console.error(
                "Delete comment error:",
                error
            );

            toast(
                "تعذر حذف التعليق."
            );
        }
    }

    async function refreshCommentCount(
        reelId
    ) {

        const client =
            getSupabase();

        if (!client) return;

        const {
            count
        } =
            await client
                .from(
                    "reel_comments"
                )
                .select(
                    "id",
                    {
                        count:"exact",
                        head:true
                    }
                )
                .eq(
                    "reel_id",
                    reelId
                );

        const slide =
            document.querySelector(
                `.student-reel[data-id="${CSS.escape(
                    String(reelId)
                )}"]`
            );

        slide
            ?.querySelector(
                "[data-comment-count]"
            )
            ?.replaceChildren(
                document.createTextNode(
                    String(count || 0)
                )
            );
    }

    /* =====================================================
       Share
    ===================================================== */

    async function shareReel(
        reelId
    ) {

        const url =
            `${location.origin}${location.pathname}#reel=${reelId}`;

        if (
            navigator.share
        ) {

            try {

                await navigator.share({
                    title:
                        "Student Reel",
                    text:
                        "شاهد هذا الـReel",
                    url:
                        url
                });

                return;

            } catch (error) {}
        }

        try {

            await navigator.clipboard.writeText(
                url
            );

            toast(
                "تم نسخ رابط الـReel."
            );

        } catch (error) {

            toast(
                "تعذر نسخ الرابط."
            );
        }
    }

    /* =====================================================
       Save
    ===================================================== */

    async function toggleSave(
        reelId,
        button
    ) {

        const client =
            getSupabase();

        if (!client || !currentUserId) {
            toast(
                "يجب تسجيل الدخول أولًا."
            );
            return;
        }

        try {

            const {
                data:existing
            } =
                await client
                    .from("saved_items")
                    .select("id")
                    .eq(
                        "user_id",
                        currentUserId
                    )
                    .eq(
                        "content_type",
                        "reel"
                    )
                    .eq(
                        "content_id",
                        String(reelId)
                    )
                    .maybeSingle();

            const icon =
                button.querySelector("i");

            if (existing) {

                const {
                    error
                } =
                    await client
                        .from("saved_items")
                        .delete()
                        .eq(
                            "id",
                            existing.id
                        );

                if (error) throw error;

                button.classList.remove(
                    "saved"
                );

                icon?.classList.remove(
                    "fa-solid"
                );

                icon?.classList.add(
                    "fa-regular"
                );

                toast(
                    "تم إلغاء الحفظ."
                );

            } else {

                const {
                    error
                } =
                    await client
                        .from("saved_items")
                        .insert({

                            user_id:
                                currentUserId,

                            content_type:
                                "reel",

                            content_id:
                                String(reelId)
                        });

                if (error) throw error;

                button.classList.add(
                    "saved"
                );

                icon?.classList.remove(
                    "fa-regular"
                );

                icon?.classList.add(
                    "fa-solid"
                );

                toast(
                    "تم حفظ الـReel."
                );
            }

        } catch (error) {

            console.error(
                "Save error:",
                error
            );

            toast(
                "تعذر تحديث المحفوظات."
            );
        }
    }

    /* =====================================================
       Views
    ===================================================== */

    async function registerView(
        reelId
    ) {

        const client =
            getSupabase();

        if (!client || !currentUserId) {
            return;
        }

        try {

            await client
                .from("reel_views")
                .upsert(
                    {
                        reel_id:
                            reelId,
                        user_id:
                            currentUserId,
                        viewed_at:
                            new Date().toISOString()
                    },
                    {
                        onConflict:
                            "reel_id,user_id"
                    }
                );

            const reel =
                reels.find(
                    item =>
                        String(item.id) ===
                        String(reelId)
                );

            if (reel) {

                reel.viewCount =
                    Math.max(
                        Number(
                            reel.viewCount ||
                            0
                        ),
                        1
                    );
            }

        } catch (error) {

            console.error(
                "View error:",
                error
            );
        }
    }

    /* =====================================================
       Privacy
    ===================================================== */

    function showPrivacyDialog(
        reelId
    ) {

        const reel =
            reels.find(
                item =>
                    String(item.id) ===
                    String(reelId)
            );

        const current =
            reel?.visibility ||
            "public";

        createDialog();

        const dialog =
            document.getElementById(
                "student-reels-dialog"
            );

        dialog.innerHTML = `
            <div class="student-reels-dialog-box">

                <div class="student-reels-dialog-title">
                    خصوصية الـReel
                </div>

                <select
                    id="student-reel-privacy-select"
                    style="
                        width:100%;
                        padding:12px;
                        border:1px solid #ddd;
                        border-radius:12px;
                    "
                >

                    <option
                        value="public"
                        ${current === "public" ? "selected" : ""}
                    >
                        عام
                    </option>

                    <option
                        value="followers"
                        ${current === "followers" ? "selected" : ""}
                    >
                        المتابعون
                    </option>

                    <option
                        value="private"
                        ${current === "private" ? "selected" : ""}
                    >
                        خاص
                    </option>

                </select>

                <div
                    id="student-reels-dialog-message"
                    class="
                        student-reels-dialog-message
                    "
                ></div>

                <div
                    class="
                        student-reels-dialog-buttons
                    "
                >

                    <button
                        id="privacy-cancel"
                        class="
                            student-reels-dialog-btn
                            student-reels-dialog-cancel
                        "
                    >
                        إلغاء
                    </button>

                    <button
                        id="privacy-save"
                        class="
                            student-reels-dialog-btn
                            student-reels-dialog-save
                        "
                    >
                        حفظ
                    </button>

                </div>
            </div>
        `;

        document
            .getElementById(
                "privacy-cancel"
            )
            ?.addEventListener(
                "click",
                closeDialog
            );

        document
            .getElementById(
                "privacy-save"
            )
            ?.addEventListener(
                "click",
                function () {

                    updatePrivacy(
                        reelId
                    );

                }
            );

        dialog.classList.add(
            "show"
        );
    }

    async function updatePrivacy(
        reelId
    ) {

        const client =
            getSupabase();

        const select =
            document.getElementById(
                "student-reel-privacy-select"
            );

        const message =
            document.getElementById(
                "student-reels-dialog-message"
            );

        if (!client || !select) return;

        try {

            const {
                error
            } =
                await client
                    .from("reels")
                    .update({
                        visibility:
                            select.value,

                        updated_at:
                            new Date().toISOString()
                    })
                    .eq(
                        "id",
                        reelId
                    )
                    .eq(
                        "user_id",
                        currentUserId
                    );

            if (error) throw error;

            message.style.color =
                "#16803c";

            message.textContent =
                "تم حفظ الخصوصية.";

            setTimeout(
                async function () {

                    closeDialog();

                    await openReels(
                        currentIndex
                    );

                },
                500
            );

        } catch (error) {

            console.error(
                "Privacy error:",
                error
            );

            message.style.color =
                "#d93025";

            message.textContent =
                error?.message ||
                "تعذر حفظ الخصوصية.";
        }
    }

    /* =====================================================
       Report
    ===================================================== */

    async function reportReel(
        reelId
    ) {

        const reason =
            prompt(
                "سبب الإبلاغ:"
            );

        if (!reason) return;

        const client =
            getSupabase();

        if (!client || !currentUserId) return;

        try {

            const {
                error
            } =
                await client
                    .from(
                        "reel_reports"
                    )
                    .insert({

                        reel_id:
                            reelId,

                        user_id:
                            currentUserId,

                        reason:
                            reason.trim()
                    });

            if (error) throw error;

            toast(
                "تم إرسال البلاغ."
            );

        } catch (error) {

            console.error(
                "Report error:",
                error
            );

            toast(
                "تعذر إرسال البلاغ."
            );
        }
    }

    /* =====================================================
       Edit
    ===================================================== */

    function showEditDialog(
        reelId
    ) {

        const reel =
            reels.find(
                item =>
                    String(item.id) ===
                    String(reelId)
            );

        createDialog();

        const dialog =
            document.getElementById(
                "student-reels-dialog"
            );

        dialog.innerHTML = `
            <div class="student-reels-dialog-box">

                <div
                    class="student-reels-dialog-title"
                >
                    تعديل Reel
                </div>

                <textarea
                    id="edit-reel-caption"
                    class="
                        student-reels-dialog-input
                    "
                >${escapeHTML(
                    reel?.caption || ""
                )}</textarea>

                <div
                    id="student-reels-dialog-message"
                    class="
                        student-reels-dialog-message
                    "
                ></div>

                <div
                    class="
                        student-reels-dialog-buttons
                    "
                >

                    <button
                        id="edit-cancel"
                        class="
                            student-reels-dialog-btn
                            student-reels-dialog-cancel
                        "
                    >
                        إلغاء
                    </button>

                    <button
                        id="edit-save"
                        class="
                            student-reels-dialog-btn
                            student-reels-dialog-save
                        "
                    >
                        حفظ
                    </button>

                </div>

            </div>
        `;

        document
            .getElementById(
                "edit-cancel"
            )
            ?.addEventListener(
                "click",
                closeDialog
            );

        document
            .getElementById(
                "edit-save"
            )
            ?.addEventListener(
                "click",
                function () {

                    updateCaption(
                        reelId
                    );
                }
            );

        dialog.classList.add(
            "show"
        );
    }

    async function updateCaption(
        reelId
    ) {

        const client =
            getSupabase();

        const input =
            document.getElementById(
                "edit-reel-caption"
            );

        const message =
            document.getElementById(
                "student-reels-dialog-message"
            );

        if (!client || !input) return;

        try {

            const {
                error
            } =
                await client
                    .from("reels")
                    .update({

                        caption:
                            input.value.trim() ||
                            null,

                        updated_at:
                            new Date().toISOString()

                    })
                    .eq(
                        "id",
                        reelId
                    )
                    .eq(
                        "user_id",
                        currentUserId
                    );

            if (error) throw error;

            message.style.color =
                "#16803c";

            message.textContent =
                "تم تعديل الـReel.";

            setTimeout(
                async function () {

                    closeDialog();

                    await openReels(
                        currentIndex
                    );

                },
                500
            );

        } catch (error) {

            console.error(
                "Edit error:",
                error
            );

            message.style.color =
                "#d93025";

            message.textContent =
                error?.message ||
                "تعذر تعديل الـReel.";
        }
    }

    /* =====================================================
       Delete
    ===================================================== */

    function showDeleteDialog(
        reelId
    ) {

        createDialog();

        const dialog =
            document.getElementById(
                "student-reels-dialog"
            );

        dialog.innerHTML = `
            <div class="student-reels-dialog-box">

                <div
                    class="student-reels-dialog-title"
                >
                    حذف Reel
                </div>

                <div
                    style="
                        line-height:1.8;
                        color:#666;
                    "
                >
                    هل أنت متأكد من حذف هذا الـReel؟
                </div>

                <div
                    id="student-reels-dialog-message"
                    class="
                        student-reels-dialog-message
                    "
                ></div>

                <div
                    class="
                        student-reels-dialog-buttons
                    "
                >

                    <button
                        id="delete-cancel"
                        class="
                            student-reels-dialog-btn
                            student-reels-dialog-cancel
                        "
                    >
                        إلغاء
                    </button>

                    <button
                        id="delete-confirm"
                        class="
                            student-reels-dialog-btn
                            student-reels-dialog-delete
                        "
                    >
                        حذف
                    </button>

                </div>
            </div>
        `;

        document
            .getElementById(
                "delete-cancel"
            )
            ?.addEventListener(
                "click",
                closeDialog
            );

        document
            .getElementById(
                "delete-confirm"
            )
            ?.addEventListener(
                "click",
                function () {

                    deleteReel(
                        reelId
                    );
                }
            );

        dialog.classList.add(
            "show"
        );
    }

    async function deleteReel(
        reelId
    ) {

        const client =
            getSupabase();

        const message =
            document.getElementById(
                "student-reels-dialog-message"
            );

        if (!client) return;

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

            if (error) throw error;

            message.style.color =
                "#16803c";

            message.textContent =
                "تم حذف الـReel.";

            setTimeout(
                async function () {

                    closeDialog();

                    await openReels(
                        Math.max(
                            0,
                            currentIndex - 1
                        )
                    );

                },
                500
            );

        } catch (error) {

            console.error(
                "Delete error:",
                error
            );

            message.style.color =
                "#d93025";

            message.textContent =
                error?.message ||
                "تعذر حذف الـReel.";
        }
    }

    /* =====================================================
       Scroll
    ===================================================== */

    function bindScroll() {

        const container =
            document.getElementById(
                "student-reels-scroll"
            );

        if (!container) return;

        container.addEventListener(
            "scroll",
            function () {

                clearTimeout(
                    scrollTimer
                );

                scrollTimer =
                    setTimeout(
                        function () {

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

                                const reel =
                                    reels[
                                        currentIndex
                                    ];

                                if (reel) {

                                    registerView(
                                        reel.id
                                    );
                                }
                            }

                        },
                        120
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

        if (!container) return;

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
            function () {

                playCurrent();

                const reel =
                    reels[
                        currentIndex
                    ];

                if (reel) {
                    registerView(
                        reel.id
                    );
                }

            },
            250
        );
    }

    function playCurrent() {

        if (!overlay) return;

        overlay
            .querySelectorAll(
                "video"
            )
            .forEach(
                function (
                    video,
                    index
                ) {

                    if (
                        index ===
                        currentIndex
                    ) {

                        video.play()
                            .catch(
                                function () {}
                            );

                    } else {

                        video.pause();

                    }
                }
            );
    }

    /* =====================================================
       Buttons
    ===================================================== */

    function bindButtons() {

        const container =
            document.getElementById(
                "student-reels-scroll"
            );

        if (!container) return;

        /* Publish */

        container
            .querySelectorAll(
                "[data-publish]"
            )
            .forEach(
                button => {

                    button.onclick =
                        openPublishReel;
                }
            );

        /* Close */

        container
            .querySelectorAll(
                "[data-close]"
            )
            .forEach(
                button => {

                    button.onclick =
                        closeReels;
                }
            );

        /* Video sound */

        container
            .querySelectorAll(
                "video"
            )
            .forEach(
                video => {

                    video.addEventListener(
                        "click",
                        function () {

                            video.muted =
                                !video.muted;

                            if (
                                video.paused
                            ) {

                                video.play()
                                    .catch(
                                        function () {}
                                    );
                            }
                        }
                    );
                }
            );

        /* Like */

        container
            .querySelectorAll(
                "[data-like]"
            )
            .forEach(
                button => {

                    button.onclick =
                        function () {

                            const reel =
                                button.closest(
                                    ".student-reel"
                                );

                            const id =
                                reel?.dataset.id;

                            const counter =
                                reel?.querySelector(
                                    "[data-like-count]"
                                );

                            toggleLike(
                                id,
                                button,
                                counter
                            );

                        };
                }
            );

        /* Comments */

        container
            .querySelectorAll(
                "[data-comments]"
            )
            .forEach(
                button => {

                    button.onclick =
                        function () {

                            const reel =
                                button.closest(
                                    ".student-reel"
                                );

                            const id =
                                reel?.dataset.id;

                            openComments(
                                id
                            );
                        };
                }
            );

        /* Share */

        container
            .querySelectorAll(
                "[data-share]"
            )
            .forEach(
                button => {

                    button.onclick =
                        function () {

                            const reel =
                                button.closest(
                                    ".student-reel"
                                );

                            const id =
                                reel?.dataset.id;

                            openShareDialog(
                                id
                            );
                        };
                }
            );

        /* Save */

        container
            .querySelectorAll(
                "[data-save]"
            )
            .forEach(
                button => {

                    button.onclick =
                        function () {

                            const reel =
                                button.closest(
                                    ".student-reel"
                                );

                            const id =
                                reel?.dataset.id;

                            toggleSave(
                                id,
                                button
                            );
                        };
                }
            );

        /* Volume */

        container
            .querySelectorAll(
                "[data-volume]"
            )
            .forEach(
                button => {

                    button.onclick =
                        function () {

                            const reel =
                                button.closest(
                                    ".student-reel"
                                );

                            const video =
                                reel?.querySelector(
                                    "video"
                                );

                            if (!video) return;

                            video.muted =
                                !video.muted;

                            const icon =
                                button.querySelector(
                                    "i"
                                );

                            if (
                                video.muted
                            ) {

                                icon?.classList.remove(
                                    "fa-volume-high"
                                );

                                icon?.classList.add(
                                    "fa-volume-xmark"
                                );

                            } else {

                                icon?.classList.remove(
                                    "fa-volume-xmark"
                                );

                                icon?.classList.add(
                                    "fa-volume-high"
                                );
                            }
                        };
                }
            );

        /* More */

        container
            .querySelectorAll(
                "[data-more]"
            )
            .forEach(
                button => {

                    button.onclick =
                        function () {

                            const reel =
                                button.closest(
                                    ".student-reel"
                                );

                            reel
                                ?.querySelector(
                                    "[data-menu]"
                                )
                                ?.classList.toggle(
                                    "show"
                                );
                        };
                }
            );

        /* Edit */

        container
            .querySelectorAll(
                "[data-edit]"
            )
            .forEach(
                button => {

                    button.onclick =
                        function () {

                            const reel =
                                button.closest(
                                    ".student-reel"
                                );

                            const id =
                                reel?.dataset.id;

                            showEditDialog(
                                id
                            );
                        };
                }
            );

        /* Privacy */

        container
            .querySelectorAll(
                "[data-privacy]"
            )
            .forEach(
                button => {

                    button.onclick =
                        function () {

                            const reel =
                                button.closest(
                                    ".student-reel"
                                );

                            showPrivacyDialog(
                                reel?.dataset.id
                            );
                        };
                }
            );

        /* Delete */

        container
            .querySelectorAll(
                "[data-delete]"
            )
            .forEach(
                button => {

                    button.onclick =
                        function () {

                            const reel =
                                button.closest(
                                    ".student-reel"
                                );

                            showDeleteDialog(
                                reel?.dataset.id
                            );
                        };
                }
            );

        /* Report */

        container
            .querySelectorAll(
                "[data-report]"
            )
            .forEach(
                button => {

                    button.onclick =
                        function () {

                            const reel =
                                button.closest(
                                    ".student-reel"
                                );

                            reportReel(
                                reel?.dataset.id
                            );
                        };
                }
            );

        /* Hide */

        container
            .querySelectorAll(
                "[data-hide]"
            )
            .forEach(
                button => {

                    button.onclick =
                        function () {

                            const reel =
                                button.closest(
                                    ".student-reel"
                                );

                            reel.style.display =
                                "none";

                            toast(
                                "تم إخفاء الـReel."
                            );
                        };
                }
            );
    }

    /* =====================================================
       Empty
    ===================================================== */

    function showEmpty() {

        const container =
            document.getElementById(
                "student-reels-scroll"
            );

        if (!container) return;

        container.innerHTML = `

            <div
                class="student-reels-empty"
            >

                <div
                    style="
                        font-size:65px;
                    "
                >
                    🎬
                </div>

                <div
                    style="
                        font-size:19px;
                        font-weight:800;
                    "
                >
                    لا توجد Reels بعد
                </div>

                <div
                    style="
                        color:#aaa;
                        font-size:13px;
                    "
                >
                    كن أول من ينشر Reel
                </div>

                <button
                    type="button"
                    class="
                        student-reels-empty-publish
                    "
                    onclick="
                        window.openStudentReelCreator &&
                        window.openStudentReelCreator()
                    "
                >
                    🎬 نشر أول Reel
                </button>

            </div>
        `;
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

        element.style.direction =
            "rtl";

        element.style.boxShadow =
            "0 8px 30px rgba(0,0,0,.25)";

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
       API
    ===================================================== */

    window.openStudentReels =
        openReels;

    window.closeStudentReels =
        closeReels;

    /* =====================================================
       Start
    ===================================================== */

    function start() {

        injectStyles();
        createOverlay();
        createCommentsDialog();
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
(function () {

    "use strict";

    const files = [
        "reels-core.js",
        "reels-social.js",
        "reels-media.js",
        "reels-manage.js",
        "reels-safety.js"
 ];

    files.forEach(function (src) {

        if (
            document.querySelector(
                'script[data-student-reels-module="' +
                src +
                '"]'
            )
        ) {
            return;
        }

        const script =
            document.createElement("script");

        script.src = src;
        script.async = true;

        script.dataset.studentReelsModule =
            src;

        document.body.appendChild(script);

    });

})();
(function () {

    "use strict";

    function loadStatsModule() {

        if (
            document.querySelector(
                'script[data-student-reels-stats="true"]'
            )
        ) {
            return;
        }

        const script =
            document.createElement("script");

        script.src = "reels-stats.js";
        script.async = true;

        script.dataset.studentReelsStats =
            "true";

        script.onload = function () {

            console.log(
                "Student Reels Stats loaded."
            );

        };

        script.onerror = function () {

            console.warn(
                "reels-stats.js failed to load. Reels Core remains active."
            );

        };

        document.body.appendChild(
            script
        );
    }


    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            function () {

                setTimeout(
                    loadStatsModule,
                    800
                );

            },
            {
                once:true
            }
        );

    } else {

        setTimeout(
            loadStatsModule,
            800
        );
    }

})();
