/* =========================================================
   STUDENT - STORIES SYSTEM
   ========================================================= */

(function () {
    "use strict";

    let sb = null;
    let currentUser = null;

    let storyMode = "text";
    let editStory = null;
    let currentViewingStory = null;

    /* =====================================================
       SUPABASE
       ===================================================== */

    async function initSupabase() {
        try {
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
                showToast(
                    "تعذر تحميل Supabase",
                    "error"
                );
                return false;
            }

            const response = await fetch(
                "/config.json",
                {
                    cache: "no-store"
                }
            );

            if (!response.ok) {
                throw new Error(
                    "لم يتم العثور على config.json"
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
                    "بيانات Supabase غير موجودة"
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

            showToast(
                error.message ||
                "تعذر الاتصال بـ Supabase",
                "error"
            );

            return false;
        }
    }

    /* =====================================================
       USER
       ===================================================== */

    async function loadUser() {
        if (!sb) return null;

        try {
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

        } catch (error) {

            console.error(error);

            currentUser = null;

            return null;
        }
    }

    /* =====================================================
       TOAST
       ===================================================== */

    function createToastContainer() {

        if (
            document.getElementById(
                "studentToastContainer"
            )
        ) {
            return;
        }

        const box =
            document.createElement(
                "div"
            );

        box.id =
            "studentToastContainer";

        box.style.cssText = `
            position:fixed;
            top:85px;
            left:50%;
            transform:translateX(-50%);
            z-index:200000;
            display:flex;
            flex-direction:column;
            gap:10px;
            width:min(92%,420px);
            pointer-events:none;
        `;

        document.body.appendChild(
            box
        );
    }

    function showToast(
        message,
        type = "success"
    ) {

        createToastContainer();

        const container =
            document.getElementById(
                "studentToastContainer"
            );

        const toast =
            document.createElement(
                "div"
            );

        const success =
            type === "success";

        toast.style.cssText = `
            background:${success
                ? "#16a34a"
                : "#dc2626"};
            color:#fff;
            padding:14px 18px;
            border-radius:14px;
            font-size:15px;
            font-weight:600;
            text-align:center;
            box-shadow:0 10px 30px rgba(0,0,0,.22);
            opacity:0;
            transform:translateY(-15px);
            transition:all .25s ease;
            direction:rtl;
        `;

        toast.textContent =
            message;

        container.appendChild(
            toast
        );

        requestAnimationFrame(() => {

            toast.style.opacity =
                "1";

            toast.style.transform =
                "translateY(0)";
        });

        setTimeout(() => {

            toast.style.opacity =
                "0";

            toast.style.transform =
                "translateY(-15px)";

            setTimeout(() => {
                toast.remove();
            }, 250);

        }, 2800);
    }

    /* =====================================================
       CSS
       ===================================================== */

    function addStyles() {

        if (
            document.getElementById(
                "studentStoriesStyles"
            )
        ) {
            return;
        }

        const style =
            document.createElement(
                "style"
            );

        style.id =
            "studentStoriesStyles";

        style.textContent = `

        .stories-container {
            display:flex !important;
            overflow-x:auto !important;
            gap:14px !important;
            padding:14px !important;
            scrollbar-width:none !important;
            align-items:flex-start !important;
        }

        .stories-container::-webkit-scrollbar {
            display:none !important;
        }

        .stories-container .story {
            flex:0 0 auto !important;
            width:74px !important;
            cursor:pointer !important;
            text-align:center !important;
        }

        .stories-container .story-ring {
            width:68px !important;
            height:68px !important;
            border-radius:50% !important;
            padding:3px !important;
            background:linear-gradient(
                135deg,
                #0095f6,
                #d62976,
                #feda75
            ) !important;
        }

        .stories-container .story-ring-inner {
            width:100% !important;
            height:100% !important;
            border-radius:50% !important;
            background:#fff !important;
            display:flex !important;
            align-items:center !important;
            justify-content:center !important;
            overflow:hidden !important;
        }

        .stories-container .story-name {
            display:block !important;
            margin-top:6px !important;
            font-size:11px !important;
            white-space:nowrap !important;
            overflow:hidden !important;
            text-overflow:ellipsis !important;
        }

        .stories-add-new .story-ring {
            border:2px dashed #0095f6 !important;
            background:#fff !important;
            padding:0 !important;
        }

        .stories-add-new i {
            color:#0095f6 !important;
            font-size:25px !important;
        }

        .story-preview {
            width:100%;
            height:100%;
            object-fit:cover;
            border-radius:50%;
        }

        .story-placeholder {
            width:100%;
            height:100%;
            display:flex;
            align-items:center;
            justify-content:center;
            border-radius:50%;
            color:#fff;
            font-size:20px;
            font-weight:bold;
        }

        #studentStoryCreateModal {
            position:fixed;
            inset:0;
            background:rgba(0,0,0,.60);
            display:none;
            align-items:center;
            justify-content:center;
            z-index:100000;
            padding:15px;
        }

        #studentStoryCreateModal.active {
            display:flex;
        }

        .student-story-form {
            width:min(450px,100%);
            max-height:92vh;
            overflow:auto;
            background:#fff;
            border-radius:22px;
            padding:22px;
            direction:rtl;
        }

        .student-story-form h2 {
            margin:0 0 18px;
            font-size:25px;
        }

        .student-story-types {
            display:grid;
            grid-template-columns:1fr 1fr;
            gap:10px;
            margin-bottom:14px;
        }

        .student-story-types button {
            border:1px solid #ddd;
            background:#f8f8f8;
            border-radius:13px;
            padding:14px 8px;
            font-size:16px;
            cursor:pointer;
        }

        .student-story-types button.active {
            background:#0095f6;
            color:#fff;
            border-color:#0095f6;
        }

        #studentStoryText {
            width:100%;
            min-height:135px;
            border:1px solid #ddd;
            border-radius:14px;
            padding:14px;
            resize:vertical;
            font-size:16px;
            direction:rtl;
            outline:none;
            margin-bottom:14px;
        }

        #studentStoryFile {
            width:100%;
            margin-bottom:14px;
            font-size:15px;
            display:none;
        }

        .student-color-row {
            display:flex;
            align-items:center;
            justify-content:space-between;
            margin-bottom:12px;
            padding:10px 12px;
            border:1px solid #e5e5e5;
            border-radius:13px;
        }

        .student-color-row span {
            font-size:15px;
        }

        .student-color-row input[type="color"] {
            width:48px;
            height:38px;
            padding:0;
            border:none;
            background:none;
            cursor:pointer;
        }

        .student-story-preview {
            display:none;
            width:100%;
            height:220px;
            border-radius:15px;
            overflow:hidden;
            background:#111;
            margin-bottom:12px;
            align-items:center;
            justify-content:center;
        }

        .student-story-preview img,
        .student-story-preview video {
            width:100%;
            height:100%;
            object-fit:contain;
        }

        .student-story-buttons {
            display:grid;
            grid-template-columns:1fr 1fr;
            gap:10px;
            margin-top:14px;
        }

        .student-story-buttons button {
            border:none;
            border-radius:13px;
            padding:14px;
            font-size:16px;
            cursor:pointer;
        }

        #studentStoryPublish {
            background:#0095f6;
            color:#fff;
        }

        #studentStoryCancel {
            background:#eee;
        }

        #studentStoryViewer {
            position:fixed;
            inset:0;
            display:none;
            align-items:center;
            justify-content:center;
            background:rgba(0,0,0,.90);
            z-index:100001;
            padding:10px;
        }

        #studentStoryViewer.active {
            display:flex;
        }

        .student-story-view-box {
            width:min(440px,100%);
            height:min(780px,94vh);
            background:#111;
            border-radius:20px;
            overflow:hidden;
            position:relative;
            color:#fff;
        }

        .student-story-progress {
            position:absolute;
            top:9px;
            left:10px;
            right:10px;
            height:3px;
            background:rgba(255,255,255,.30);
            z-index:10;
            border-radius:10px;
        }

        .student-story-progress span {
            display:block;
            width:100%;
            height:100%;
            background:#fff;
            border-radius:10px;
        }

        .student-story-top {
            position:absolute;
            top:18px;
            left:12px;
            right:12px;
            z-index:20;
            display:flex;
            justify-content:space-between;
        }

        .student-story-top button {
            width:40px;
            height:40px;
            border:none;
            border-radius:50%;
            background:rgba(0,0,0,.40);
            color:#fff;
            font-size:22px;
            cursor:pointer;
        }

        .student-story-view-content {
            width:100%;
            height:100%;
            display:flex;
            align-items:center;
            justify-content:center;
            overflow:hidden;
        }

        .student-story-view-content img,
        .student-story-view-content video {
            width:100%;
            height:100%;
            object-fit:contain;
        }

        .student-story-text-view {
            width:100%;
            height:100%;
            display:flex;
            align-items:center;
            justify-content:center;
            text-align:center;
            padding:35px;
            font-size:30px;
            font-weight:bold;
            line-height:1.5;
            word-break:break-word;
        }

        .student-story-view-count {
            position:absolute;
            top:68px;
            right:12px;
            z-index:20;
            padding:7px 12px;
            border-radius:20px;
            background:rgba(0,0,0,.40);
            font-size:13px;
        }

        .student-story-footer {
            position:absolute;
            left:12px;
            right:12px;
            bottom:14px;
            z-index:20;
            display:flex;
            gap:8px;
        }

        .student-story-reaction {
            flex:1;
            border:none;
            border-radius:20px;
            padding:10px;
            background:rgba(255,255,255,.15);
            color:#fff;
            cursor:pointer;
            font-size:18px;
        }

        .student-story-owner-menu {
            position:absolute;
            left:12px;
            right:12px;
            bottom:67px;
            display:none;
            gap:8px;
            z-index:30;
        }

        .student-story-owner-menu.show {
            display:flex;
        }

        .student-story-owner-menu button {
            flex:1;
            padding:10px;
            border:none;
            border-radius:12px;
            cursor:pointer;
        }
        `;

        document.head.appendChild(
            style
        );
    }

    /* =====================================================
       MODALS
       ===================================================== */

    function createModals() {

        if (
            document.getElementById(
                "studentStoryCreateModal"
            )
        ) {
            return;
        }

        const modal =
            document.createElement(
                "div"
            );

        modal.id =
            "studentStoryCreateModal";

        modal.innerHTML = `
            <div class="student-story-form">

                <h2 id="studentStoryTitle">
                    إضافة ستوري
                </h2>

                <div class="student-story-types">

                    <button
                        type="button"
                        id="studentStoryTextMode"
                        class="active"
                    >
                        نص
                    </button>

                    <button
                        type="button"
                        id="studentStoryMediaMode"
                    >
                        صورة / فيديو
                    </button>

                </div>

                <textarea
                    id="studentStoryText"
                    placeholder="اكتب شيئًا..."
                ></textarea>

                <input
                    type="file"
                    id="studentStoryFile"
                    accept="image/*,video/*"
                >

                <div
                    class="student-story-preview"
                    id="studentStoryPreview"
                ></div>

                <div class="student-color-row">
                    <span>
                        لون الخلفية
                    </span>

                    <input
                        type="color"
                        id="studentStoryBackground"
                        value="#1877f2"
                    >
                </div>

                <div class="student-color-row">
                    <span>
                        لون النص
                    </span>

                    <input
                        type="color"
                        id="studentStoryTextColor"
                        value="#ffffff"
                    >
                </div>

                <div class="student-story-buttons">

                    <button
                        type="button"
                        id="studentStoryCancel"
                    >
                        إلغاء
                    </button>

                    <button
                        type="button"
                        id="studentStoryPublish"
                    >
                        نشر
                    </button>

                </div>

            </div>
        `;

        document.body.appendChild(
            modal
        );

        const viewer =
            document.createElement(
                "div"
            );

        viewer.id =
            "studentStoryViewer";

        viewer.innerHTML = `

            <div class="student-story-view-box">

                <div class="student-story-progress">
                    <span></span>
                </div>

                <div class="student-story-top">

                    <button
                        type="button"
                        id="studentStoryClose"
                    >
                        ×
                    </button>

                    <button
                        type="button"
                        id="studentStoryMenu"
                    >
                        ⋮
                    </button>

                </div>

                <div
                    class="student-story-view-count"
                    id="studentStoryViewCount"
                >
                    👁 0
                </div>

                <div
                    class="student-story-view-content"
                    id="studentStoryViewContent"
                ></div>

                <div
                    class="student-story-owner-menu"
                    id="studentStoryOwnerMenu"
                >

                    <button
                        type="button"
                        id="studentStoryEdit"
                    >
                        تعديل
                    </button>

                    <button
                        type="button"
                        id="studentStoryDelete"
                        style="color:#c00;"
                    >
                        حذف
                    </button>

                </div>

                <div class="student-story-footer">

                    <button
                        class="student-story-reaction"
                        data-reaction="❤️"
                    >
                        ❤️
                    </button>

                    <button
                        class="student-story-reaction"
                        data-reaction="😂"
                    >
                        😂
                    </button>

                    <button
                        class="student-story-reaction"
                        data-reaction="🔥"
                    >
                        🔥
                    </button>

                    <button
                        class="student-story-reaction"
                        data-reaction="👏"
                    >
                        👏
                    </button>

                </div>

            </div>
        `;

        document.body.appendChild(
            viewer
        );
    }

    /* =====================================================
       STORY CONTAINER
       ===================================================== */

    function getStoriesContainer() {
        return document.querySelector(
            ".stories-container"
        );
    }

    function setupStoryContainer() {

        const container =
            getStoriesContainer();

        if (!container) {
            return;
        }

        container.innerHTML =
            "";

        createAddStoryButton(
            container
        );
    }

    function createAddStoryButton(
        container
    ) {

        const add =
            document.createElement(
                "div"
            );

        add.className =
            "story stories-add-new";

        add.innerHTML = `
            <div class="story-ring">
                <div class="story-ring-inner">
                    <i class="fa-solid fa-plus"></i>
                </div>
            </div>

            <span class="story-name">
                إضافة ستوري
            </span>
        `;

        add.addEventListener(
            "click",
            openCreateModal
        );

        container.appendChild(
            add
        );
    }

    /* =====================================================
       CREATE
       ===================================================== */

    async function openCreateModal() {

        await loadUser();

        if (!currentUser) {

            showToast(
                "يجب تسجيل الدخول أولًا",
                "error"
            );

            return;
        }

        editStory = null;

        document.getElementById(
            "studentStoryTitle"
        ).textContent =
            "إضافة ستوري";

        document.getElementById(
            "studentStoryText"
        ).value = "";

        document.getElementById(
            "studentStoryFile"
        ).value = "";

        document.getElementById(
            "studentStoryBackground"
        ).value =
            "#1877f2";

        document.getElementById(
            "studentStoryTextColor"
        ).value =
            "#ffffff";

        setStoryMode(
            "text"
        );

        clearPreview();

        document.getElementById(
            "studentStoryCreateModal"
        ).classList.add(
            "active"
        );
    }

    function closeCreateModal() {

        document.getElementById(
            "studentStoryCreateModal"
        ).classList.remove(
            "active"
        );
    }

    /* =====================================================
       MODES
       ===================================================== */

    function setStoryMode(
        mode
    ) {

        storyMode =
            mode;

        const textButton =
            document.getElementById(
                "studentStoryTextMode"
            );

        const mediaButton =
            document.getElementById(
                "studentStoryMediaMode"
            );

        const file =
            document.getElementById(
                "studentStoryFile"
            );

        textButton.classList.toggle(
            "active",
            mode === "text"
        );

        mediaButton.classList.toggle(
            "active",
            mode === "media"
        );

        file.style.display =
            mode === "media"
                ? "block"
                : "none";
    }

    function openFilePicker() {

        const input =
            document.getElementById(
                "studentStoryFile"
            );

        input.value =
            "";

        input.click();
    }

    /* =====================================================
       PREVIEW
       ===================================================== */

    function clearPreview() {

        const preview =
            document.getElementById(
                "studentStoryPreview"
            );

        preview.innerHTML =
            "";

        preview.style.display =
            "none";
    }

    function showFilePreview(
        file
    ) {

        const preview =
            document.getElementById(
                "studentStoryPreview"
            );

        preview.innerHTML =
            "";

        if (!file) {

            clearPreview();

            return;
        }

        const url =
            URL.createObjectURL(
                file
            );

        if (
            file.type.startsWith(
                "image/"
            )
        ) {

            const image =
                document.createElement(
                    "img"
                );

            image.src =
                url;

            preview.appendChild(
                image
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

            preview.appendChild(
                video
            );

        } else {

            showToast(
                "اختر صورة أو فيديو فقط",
                "error"
            );

            clearPreview();

            return;
        }

        preview.style.display =
            "flex";
    }

    /* =====================================================
       UPLOAD
       ===================================================== */

    async function uploadStoryFile(
        file
    ) {

        const extension =
            file.name
                .split(".")
                .pop()
                .toLowerCase();

        const random =
            Math.random()
                .toString(36)
                .substring(2,10);

        const filePath =
            `${currentUser.id}/${Date.now()}_${random}.${extension}`;

        const {
            error
        } = await sb.storage
            .from("stories")
            .upload(
                filePath,
                file,
                {
                    cacheControl:"3600",
                    contentType:file.type,
                    upsert:false
                }
            );

        if (error) {
            throw error;
        }

        const {
            data
        } = sb.storage
            .from("stories")
            .getPublicUrl(
                filePath
            );

        return data.publicUrl;
    }

    /* =====================================================
       SAVE STORY
       ===================================================== */

    async function saveStory() {

        const button =
            document.getElementById(
                "studentStoryPublish"
            );

        try {

            await loadUser();

            if (!currentUser) {

                showToast(
                    "يجب تسجيل الدخول أولًا",
                    "error"
                );

                return;
            }

            const text =
                document.getElementById(
                    "studentStoryText"
                ).value.trim();

            const background =
                document.getElementById(
                    "studentStoryBackground"
                ).value;

            const textColor =
                document.getElementById(
                    "studentStoryTextColor"
                ).value;

            const file =
                document.getElementById(
                    "studentStoryFile"
                ).files[0] || null;

            button.disabled =
                true;

            button.textContent =
                "جاري الحفظ...";

            let type =
                "text";

            let mediaUrl =
                editStory
                    ? editStory.media_url
                    : null;

            /* ==================
               MEDIA
            ================== */

            if (
                storyMode ===
                "media"
            ) {

                if (!file) {

                    showToast(
                        "اختر صورة أو فيديو أولًا",
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

                mediaUrl =
                    await uploadStoryFile(
                        file
                    );
            }

            /* ==================
               TEXT
            ================== */

            else {

                if (!text) {

                    showToast(
                        "اكتب نص الستوري أولًا",
                        "error"
                    );

                    return;
                }

                type =
                    "text";

                mediaUrl =
                    null;
            }

            /* ==================
               UPDATE
            ================== */

            if (editStory) {

                const {
                    error
                } = await sb
                    .from("stories")
                    .update({
                        type:type,
                        content:text,
                        media_url:mediaUrl,
                        background_color:background,
                        text_color:textColor
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
                    throw error;
                }

                showToast(
                    "تم تعديل الستوري بنجاح"
                );

            }

            /* ==================
               INSERT
            ================== */

            else {

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
                } = await sb
                    .from("stories")
                    .insert({
                        user_id:
                            currentUser.id,

                        type:type,

                        content:
                            text,

                        media_url:
                            mediaUrl,

                        background_color:
                            background,

                        text_color:
                            textColor,

                        created_at:
                            now.toISOString(),

                        expires_at:
                            expires.toISOString()
                    });

                if (error) {
                    throw error;
                }

                showToast(
                    "تم نشر الستوري بنجاح"
                );
            }

            editStory =
                null;

            closeCreateModal();

            await loadStories();

        } catch (error) {

            console.error(
                "STORY ERROR:",
                error
            );

            showToast(
                error.message ||
                "حدث خطأ أثناء نشر الستوري",
                "error"
            );

        } finally {

            button.disabled =
                false;

            button.textContent =
                "نشر";
        }
    }

    /* =====================================================
       LOAD STORIES
       ===================================================== */

    async function loadStories() {

        if (!sb) return;

        const container =
            getStoriesContainer();

        if (!container) return;

        await loadUser();

        container.innerHTML =
            "";

        createAddStoryButton(
            container
        );

        const {
            data,
            error
        } = await sb
            .from("stories")
            .select("*")
            .gt(
                "expires_at",
                new Date().toISOString()
            )
            .order(
                "created_at",
                {
                    ascending:false
                }
            );

        if (error) {

            console.error(
                error
            );

            showToast(
                "تعذر تحميل القصص",
                "error"
            );

            return;
        }

        if (!data || !data.length) {
            return;
        }

        const first =
            new Map();

        data.forEach(
            story => {

                if (
                    !first.has(
                        story.user_id
                    )
                ) {
                    first.set(
                        story.user_id,
                        story
                    );
                }
            }
        );

        first.forEach(
            story => {

                const item =
                    createStoryItem(
                        story,
                        data
                    );

                container.appendChild(
                    item
                );
            }
        );
    }

    /* =====================================================
       STORY ITEM
       ===================================================== */

    function createStoryItem(
        story,
        allStories
    ) {

        const item =
            document.createElement(
                "div"
            );

        item.className =
            "story";

        const ring =
            document.createElement(
                "div"
            );

        ring.className =
            "story-ring";

        const inner =
            document.createElement(
                "div"
            );

        inner.className =
            "story-ring-inner";

        if (
            story.type ===
            "image" &&
            story.media_url
        ) {

            const img =
                document.createElement(
                    "img"
                );

            img.className =
                "story-preview";

            img.src =
                story.media_url;

            inner.appendChild(
                img
            );

        } else {

            const placeholder =
                document.createElement(
                    "div"
                );

            placeholder.className =
                "story-placeholder";

            placeholder.style.background =
                story.background_color ||
                "#1877f2";

            placeholder.style.color =
                story.text_color ||
                "#ffffff";

            placeholder.textContent =
                story.user_id ===
                currentUser?.id
                    ? "أنت"
                    : "S";

            inner.appendChild(
                placeholder
            );
        }

        ring.appendChild(
            inner
        );

        item.appendChild(
            ring
        );

        const name =
            document.createElement(
                "span"
            );

        name.className =
            "story-name";

        name.textContent =
            story.user_id ===
            currentUser?.id
                ? "قصتي"
                : "ستوري";

        item.appendChild(
            name
        );

        item.addEventListener(
            "click",
            () => {

                const group =
                    allStories.filter(
                        s =>
                            s.user_id ===
                            story.user_id
                    );

                openStory(
                    group[0],
                    group
                );
            }
        );

        return item;
    }

    /* =====================================================
       OPEN STORY
       ===================================================== */

    async function openStory(
        story,
        group
    ) {

        if (!story) return;

        currentViewingStory =
            story;

        const viewer =
            document.getElementById(
                "studentStoryViewer"
            );

        const content =
            document.getElementById(
                "studentStoryViewContent"
            );

        const ownerMenu =
            document.getElementById(
                "studentStoryOwnerMenu"
            );

        viewer.classList.add(
            "active"
        );

        ownerMenu.classList.remove(
            "show"
        );

        content.innerHTML =
            "";

        if (
            story.type ===
            "text"
        ) {

            content.style.background =
                story.background_color ||
                "#1877f2";

            const text =
                document.createElement(
                    "div"
                );

            text.className =
                "student-story-text-view";

            text.style.color =
                story.text_color ||
                "#ffffff";

            text.textContent =
                story.content ||
                "";

            content.appendChild(
                text
            );

        } else if (
            story.type ===
            "image"
        ) {

            const img =
                document.createElement(
                    "img"
                );

            img.src =
                story.media_url;

            content.appendChild(
                img
            );

        } else if (
            story.type ===
            "video"
        ) {

            const video =
                document.createElement(
                    "video"
                );

            video.src =
                story.media_url;

            video.controls =
                true;

            video.autoplay =
                true;

            video.playsInline =
                true;

            content.appendChild(
                video
            );
        }

        const menu =
            document.getElementById(
                "studentStoryMenu"
            );

        menu.style.display =
            story.user_id ===
            currentUser?.id
                ? "block"
                : "none";

        await registerView(
            story.id
        );

        await loadViewCount(
            story.id
        );
    }

    /* =====================================================
       VIEWS
       ===================================================== */

    async function registerView(
        storyId
    ) {

        if (!currentUser) {
            return;
        }

        try {

            const {
                data
            } = await sb
                .from(
                    "story_views"
                )
                .select("id")
                .eq(
                    "story_id",
                    storyId
                )
                .eq(
                    "user_id",
                    currentUser.id
                )
                .maybeSingle();

            if (data) {
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

        } catch (error) {

            console.error(
                error
            );
        }
    }

    async function loadViewCount(
        storyId
    ) {

        const {
            count,
            error
        } = await sb
            .from(
                "story_views"
            )
            .select(
                "*",
                {
                    count:"exact",
                    head:true
                }
            )
            .eq(
                "story_id",
                storyId
            );

        if (error) {
            return;
        }

        document.getElementById(
            "studentStoryViewCount"
        ).textContent =
            `👁 ${count || 0}`;
    }

    /* =====================================================
       DELETE
       ===================================================== */

    async function deleteStory() {

        if (
            !currentViewingStory ||
            !currentUser
        ) {
            return;
        }

        try {

            const {
                error
            } = await sb
                .from(
                    "stories"
                )
                .delete()
                .eq(
                    "id",
                    currentViewingStory.id
                )
                .eq(
                    "user_id",
                    currentUser.id
                );

            if (error) {
                throw error;
            }

            document.getElementById(
                "studentStoryViewer"
            ).classList.remove(
                "active"
            );

            currentViewingStory =
                null;

            await loadStories();

            showToast(
                "تم حذف الستوري"
            );

        } catch (error) {

            showToast(
                error.message ||
                "تعذر حذف الستوري",
                "error"
            );
        }
    }

    /* =====================================================
       EDIT
       ===================================================== */

    function editCurrentStory() {

        if (
            !currentViewingStory ||
            !currentUser
        ) {
            return;
        }

        editStory =
            currentViewingStory;

        document.getElementById(
            "studentStoryTitle"
        ).textContent =
            "تعديل الستوري";

        document.getElementById(
            "studentStoryText"
        ).value =
            currentViewingStory.content ||
            "";

        document.getElementById(
            "studentStoryBackground"
        ).value =
            currentViewingStory.background_color ||
            "#1877f2";

        document.getElementById(
            "studentStoryTextColor"
        ).value =
            currentViewingStory.text_color ||
            "#ffffff";

        if (
            currentViewingStory.type ===
            "text"
        ) {

            setStoryMode(
                "text"
            );

        } else {

            setStoryMode(
                "media"
            );
        }

        document.getElementById(
            "studentStoryViewer"
        ).classList.remove(
            "active"
        );

        document.getElementById(
            "studentStoryCreateModal"
        ).classList.add(
            "active"
        );
    }

    /* =====================================================
       REACTIONS
       ===================================================== */

    async function reactToStory(
        reaction
    ) {

        if (
            !currentViewingStory ||
            !currentUser
        ) {
            return;
        }

        try {

            const {
                error
            } = await sb
                .from(
                    "story_reactions"
                )
                .upsert(
                    {
                        story_id:
                            currentViewingStory.id,

                        user_id:
                            currentUser.id,

                        reaction:
                            reaction
                    },
                    {
                        onConflict:
                            "story_id,user_id"
                    }
                );

            if (error) {
                throw error;
            }

            showToast(
                "تم تسجيل التفاعل"
            );

        } catch (error) {

            showToast(
                error.message ||
                "تعذر تسجيل التفاعل",
                "error"
            );
        }
    }

    /* =====================================================
       EVENTS
       ===================================================== */

    function setupEvents() {

        document
            .getElementById(
                "studentStoryTextMode"
            )
            .addEventListener(
                "click",
                () => {
                    setStoryMode(
                        "text"
                    );
                }
            );

        document
            .getElementById(
                "studentStoryMediaMode"
            )
            .addEventListener(
                "click",
                () => {
                    setStoryMode(
                        "media"
                    );

                    openFilePicker();
                }
            );

        document
            .getElementById(
                "studentStoryFile"
            )
            .addEventListener(
                "change",
                event => {

                    showFilePreview(
                        event.target.files[0]
                    );
                }
            );

        document
            .getElementById(
                "studentStoryCancel"
            )
            .addEventListener(
                "click",
                closeCreateModal
            );

        document
            .getElementById(
                "studentStoryPublish"
            )
            .addEventListener(
                "click",
                saveStory
            );

        document
            .getElementById(
                "studentStoryClose"
            )
            .addEventListener(
                "click",
                () => {

                    document
                        .getElementById(
                            "studentStoryViewer"
                        )
                        .classList.remove(
                            "active"
                        );
                }
            );

        document
            .getElementById(
                "studentStoryMenu"
            )
            .addEventListener(
                "click",
                () => {

                    document
                        .getElementById(
                            "studentStoryOwnerMenu"
                        )
                        .classList.toggle(
                            "show"
                        );
                }
            );

        document
            .getElementById(
                "studentStoryDelete"
            )
            .addEventListener(
                "click",
                deleteStory
            );

        document
            .getElementById(
                "studentStoryEdit"
            )
            .addEventListener(
                "click",
                editCurrentStory
            );

        document
            .querySelectorAll(
                ".student-story-reaction"
            )
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

    /* =====================================================
       AUTH
       ===================================================== */

    function watchAuth() {

        if (!sb) return;

        sb.auth.onAuthStateChange(
            async (
                event,
                session
            ) => {

                currentUser =
                    session?.user ||
                    null;

                if (currentUser) {
                    await loadStories();
                }
            }
        );
    }

    /* =====================================================
       INIT
       ===================================================== */

    async function initialize() {

        createToastContainer();

        const ready =
            await initSupabase();

        if (!ready) {
            return;
        }

        addStyles();

        createModals();

        setupStoryContainer();

        setupEvents();

        await loadUser();

        watchAuth();

        if (currentUser) {
            await loadStories();
        }
    }

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initialize
        );

    } else {

        initialize();
    }

})();
