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
            background:linear-gradient(
                135deg,
                #0095f6,
                #d62976,
                #feda75
            )!important;
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
            border:2px dashed #0095f6!important;
            background:#fff!important;
            padding:0!important;
        }

        .stories-add-new i{
            color:#0095f6!important;
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
                إضافة ستوري
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
       INIT
    ========================================================= */

    async function init() {

        addStyles();

        ensureUI();

        const ready =
            await initSupabase();

        if (
            !ready
        ) {
            return;
        }

        await loadUser();

        setupStoriesContainer();

        setupEvents();

        watchAuth();

        if (
            currentUser
        ) {

            await loadStories();
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
