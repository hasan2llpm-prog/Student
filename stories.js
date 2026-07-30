/* =========================================================
   STUDENT - STORIES SYSTEM
   Text + Image + Video
   Publish + View + Delete + Edit + Views + Reactions
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

            if (
                window.studentSupabase
            ) {
                sb = window.studentSupabase;
                return true;
            }

            if (
                window.supabaseClient
            ) {
                sb = window.supabaseClient;
                return true;
            }

            if (
                !window.supabase ||
                !window.supabase.createClient
            ) {
                console.error(
                    "Supabase library غير موجودة."
                );
                return false;
            }

            const response =
                await fetch(
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
                    "بيانات Supabase غير موجودة في config.json"
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

            console.error(
                "Supabase error:",
                error
            );

            return false;
        }
    }

    /* =====================================================
       USER
       ===================================================== */

    async function loadUser() {

        if (!sb) {
            return null;
        }

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

        /* ===============================
           Story Container
        =============================== */

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
            display:flex !important;
            align-items:center !important;
            justify-content:center !important;
        }

        .stories-container .story-ring-inner {
            width:100% !important;
            height:100% !important;
            background:#fff !important;
            border-radius:50% !important;
            display:flex !important;
            align-items:center !important;
            justify-content:center !important;
            overflow:hidden !important;
        }

        .stories-container .story-placeholder {
            width:100% !important;
            height:100% !important;
            display:flex !important;
            align-items:center !important;
            justify-content:center !important;
            background:#0095f6 !important;
            color:#fff !important;
            font-size:22px !important;
            font-weight:bold !important;
        }

        .stories-container .story-preview {
            width:100% !important;
            height:100% !important;
            object-fit:cover !important;
            border-radius:50% !important;
        }

        .stories-container .story-name {
            display:block !important;
            margin-top:6px !important;
            font-size:11px !important;
            white-space:nowrap !important;
            overflow:hidden !important;
            text-overflow:ellipsis !important;
        }

        /* ===============================
           Add Story
        =============================== */

        .stories-add-new .story-ring {
            background:transparent !important;
            border:2px dashed #0095f6 !important;
            padding:0 !important;
        }

        .stories-add-new .story-ring-inner {
            color:#0095f6 !important;
            background:#fff !important;
        }

        .stories-add-new i {
            color:#0095f6 !important;
            font-size:25px !important;
        }

        /* ===============================
           Create Modal
        =============================== */

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
            border-radius:20px;
            padding:20px;
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
            margin-bottom:12px;
        }

        .student-story-types button {
            border:1px solid #ddd;
            background:#f8f8f8;
            border-radius:12px;
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
            min-height:130px;
            border:1px solid #ddd;
            border-radius:14px;
            padding:14px;
            resize:vertical;
            font-size:16px;
            direction:rtl;
            outline:none;
            margin-bottom:12px;
        }

        #studentStoryFile {
            width:100%;
            margin-bottom:12px;
            font-size:15px;
            display:none;
        }

        .student-story-color {
            width:100%;
            margin-bottom:10px;
        }

        .student-story-color input {
            width:100%;
            border:1px solid #ddd;
            border-radius:12px;
            padding:13px;
            font-size:15px;
            outline:none;
            direction:ltr;
            text-align:left;
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
            border-radius:12px;
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

        /* ===============================
           Viewer
        =============================== */

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
            align-items:center;
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
            line-height:1.5;
            font-size:30px;
            font-weight:bold;
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
       CREATE HTML
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
            document.createElement("div");

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

                <div class="student-story-color">

                    <input
                        type="text"
                        id="studentStoryBackground"
                        value="#1877f2"
                        placeholder="#1877f2"
                    >

                </div>

                <div class="student-story-color">

                    <input
                        type="text"
                        id="studentStoryTextColor"
                        value="#ffffff"
                        placeholder="#ffffff"
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
            document.createElement("div");

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
       MAIN STORY CONTAINER
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
            console.error(
                "لم يتم العثور على .stories-container"
            );
            return;
        }

        container.innerHTML = "";

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
       CREATE MODAL
       ===================================================== */

    function openCreateModal() {

        loadUser().then(() => {

            if (!currentUser) {

                alert(
                    "يجب تسجيل الدخول أولًا."
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

        });
    }

    function closeCreateModal() {

        document.getElementById(
            "studentStoryCreateModal"
        ).classList.remove(
            "active"
        );
    }

    /* =====================================================
       STORY MODE
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

        if (mode === "text") {

            file.style.display =
                "none";

        } else {

            file.style.display =
                "block";
        }
    }

    /* =====================================================
       FILE PICKER
       ===================================================== */

    function openFilePicker() {

        const input =
            document.getElementById(
                "studentStoryFile"
            );

        input.value = "";

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

        preview.innerHTML = "";

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

        preview.innerHTML = "";

        if (!file) {

            preview.style.display =
                "none";

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

            const img =
                document.createElement(
                    "img"
                );

            img.src =
                url;

            preview.appendChild(
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

            preview.appendChild(
                video
            );

        } else {

            alert(
                "يرجى اختيار صورة أو فيديو فقط."
            );

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

        if (!currentUser) {
            throw new Error(
                "المستخدم غير مسجل الدخول."
            );
        }

        const extension =
            file.name
                .split(".")
                .pop()
                .toLowerCase();

        const random =
            Math.random()
                .toString(36)
                .substring(2, 10);

        const fileName =
            `${Date.now()}_${random}.${extension}`;

        const path =
            `${currentUser.id}/${fileName}`;

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
                        upsert:false
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

        if (
            !data ||
            !data.publicUrl
        ) {
            throw new Error(
                "تعذر إنشاء رابط الملف."
            );
        }

        return {
            url:
                data.publicUrl,
            path
        };
    }

    /* =====================================================
       PUBLISH
       ===================================================== */

    async function saveStory() {

        try {

            await loadUser();

            if (!currentUser) {

                alert(
                    "يجب تسجيل الدخول أولًا."
                );

                return;
            }

            const publish =
                document.getElementById(
                    "studentStoryPublish"
                );

            publish.disabled =
                true;

            publish.textContent =
                "جاري الحفظ...";

            const text =
                document.getElementById(
                    "studentStoryText"
                ).value.trim();

            const background =
                document.getElementById(
                    "studentStoryBackground"
                ).value.trim() ||
                "#1877f2";

            const textColor =
                document.getElementById(
                    "studentStoryTextColor"
                ).value.trim() ||
                "#ffffff";

            const file =
                document.getElementById(
                    "studentStoryFile"
                ).files[0] || null;

            let type =
                "text";

            let mediaUrl =
                editStory
                    ? editStory.media_url
                    : null;

            /* =========================
               Media
            ========================= */

            if (storyMode === "media") {

                if (!file) {

                    alert(
                        "اختر صورة أو فيديو أولًا."
                    );

                    publish.disabled =
                        false;

                    publish.textContent =
                        "نشر";

                    return;
                }

                if (
                    !file.type.startsWith(
                        "image/"
                    ) &&
                    !file.type.startsWith(
                        "video/"
                    )
                ) {

                    alert(
                        "الملف يجب أن يكون صورة أو فيديو."
                    );

                    publish.disabled =
                        false;

                    publish.textContent =
                        "نشر";

                    return;
                }

                type =
                    file.type.startsWith(
                        "video/"
                    )
                        ? "video"
                        : "image";

                const uploaded =
                    await uploadStoryFile(
                        file
                    );

                mediaUrl =
                    uploaded.url;
            }

            /* =========================
               Text Story
            ========================= */

            if (
                storyMode === "text" &&
                !text
            ) {

                alert(
                    "اكتب نص الستوري أولًا."
                );

                publish.disabled =
                    false;

                publish.textContent =
                    "نشر";

                return;
            }

            /* =========================
               UPDATE
            ========================= */

            if (editStory) {

                const {
                    data,
                    error
                } =
                    await sb
                        .from("stories")
                        .update({
                            type,
                            content:
                                text,

                            media_url:
                                mediaUrl,

                            background_color:
                                background,

                            text_color:
                                textColor
                        })
                        .eq(
                            "id",
                            editStory.id
                        )
                        .eq(
                            "user_id",
                            currentUser.id
                        )
                        .select()
                        .single();

                if (error) {
                    throw error;
                }

                console.log(
                    "Story updated:",
                    data
                );

                alert(
                    "تم تعديل الستوري بنجاح."
                );

            }

            /* =========================
               INSERT
            ========================= */

            else {

                const {
                    data,
                    error
                } =
                    await sb
                        .from("stories")
                        .insert({
                            user_id:
                                currentUser.id,

                            type,

                            content:
                                text,

                            media_url:
                                mediaUrl,

                            background_color:
                                background,

                            text_color:
                                textColor,

                            created_at:
                                new Date()
                                    .toISOString(),

                            expires_at:
                                new Date(
                                    Date.now() +
                                    24 *
                                    60 *
                                    60 *
                                    1000
                                ).toISOString()
                        })
                        .select()
                        .single();

                if (error) {
                    throw error;
                }

                console.log(
                    "Story created:",
                    data
                );

                alert(
                    "تم نشر الستوري بنجاح."
                );
            }

            editStory =
                null;

            closeCreateModal();

            await loadStories();

        } catch (error) {

            console.error(
                "SAVE STORY ERROR:",
                error
            );

            alert(
                error.message ||
                "حدث خطأ أثناء حفظ الستوري."
            );

        } finally {

            const publish =
                document.getElementById(
                    "studentStoryPublish"
                );

            publish.disabled =
                false;

            publish.textContent =
                "نشر";
        }
    }

    /* =====================================================
       LOAD STORIES
       ===================================================== */

    async function loadStories() {

        if (!sb) {
            return;
        }

        const container =
            getStoriesContainer();

        if (!container) {
            return;
        }

        await loadUser();

        const oldAdd =
            container.querySelector(
                ".stories-add-new"
            );

        container.innerHTML =
            "";

        /* Add button */

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

        /* =========================
           Query
        ========================= */

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
                        ascending:false
                    }
                );

        if (error) {

            console.error(
                "LOAD STORIES ERROR:",
                error
            );

            const message =
                document.createElement(
                    "div"
                );

            message.style.padding =
                "10px";

            message.style.color =
                "#777";

            message.textContent =
                "تعذر تحميل القصص.";

            container.appendChild(
                message
            );

            return;
        }

        if (
            !data ||
            data.length === 0
        ) {
            return;
        }

        /* =========================
           One first story per user
        ========================= */

        const firstStories =
            new Map();

        data.forEach(
            story => {

                if (
                    !firstStories.has(
                        story.user_id
                    )
                ) {
                    firstStories.set(
                        story.user_id,
                        story
                    );
                }

            }
        );

        firstStories.forEach(
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

        /* Preview */

        if (
            story.type ===
            "image"
            &&
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

            img.alt =
                "Story";

            inner.appendChild(
                img
            );

        }

        else if (
            story.type ===
            "video"
            &&
            story.media_url
        ) {

            const video =
                document.createElement(
                    "video"
                );

            video.className =
                "story-preview";

            video.src =
                story.media_url;

            video.muted =
                true;

            video.playsInline =
                true;

            inner.appendChild(
                video
            );

        }

        else {

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

                const userStories =
                    allStories.filter(
                        s =>
                            s.user_id ===
                            story.user_id
                    );

                openStory(
                    userStories[0],
                    userStories
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

        if (!story) {
            return;
        }

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

        const progress =
            viewer.querySelector(
                ".student-story-progress span"
            );

        viewer.classList.add(
            "active"
        );

        ownerMenu.classList.remove(
            "show"
        );

        progress.style.width =
            "100%";

        content.innerHTML =
            "";

        content.style.background =
            "#111";

        /* =========================
           Text
        ========================= */

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
        }

        /* =========================
           Image
        ========================= */

        else if (
            story.type ===
            "image"
        ) {

            const img =
                document.createElement(
                    "img"
                );

            img.src =
                story.media_url;

            img.alt =
                "Story";

            content.appendChild(
                img
            );
        }

        /* =========================
           Video
        ========================= */

        else if (
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

        /* Owner */

        if (
            story.user_id ===
            currentUser?.id
        ) {

            document.getElementById(
                "studentStoryMenu"
            ).style.display =
                "block";

        } else {

            document.getElementById(
                "studentStoryMenu"
            ).style.display =
                "none";
        }

        await registerView(
            story.id
        );

        await loadViewCount(
            story.id
        );
    }

    /* =====================================================
       REGISTER VIEW
       ===================================================== */

    async function registerView(
        storyId
    ) {

        if (!currentUser) {
            return;
        }

        try {

            const {
                data: existing
            } =
                await sb
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

            if (existing) {
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
                "VIEW ERROR:",
                error
            );
        }
    }

    /* =====================================================
       VIEW COUNT
       ===================================================== */

    async function loadViewCount(
        storyId
    ) {

        const {
            count,
            error
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
                    storyId
                );

        if (error) {

            console.error(
                error
            );

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

        if (
            currentViewingStory.user_id !==
            currentUser.id
        ) {
            return;
        }

        const ok =
            confirm(
                "هل تريد حذف هذه الستوري؟"
            );

        if (!ok) {
            return;
        }

        try {

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

            alert(
                "تم حذف الستوري."
            );

        } catch (error) {

            console.error(error);

            alert(
                error.message ||
                "تعذر حذف الستوري."
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

        if (
            currentViewingStory.user_id !==
            currentUser.id
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

        document.getElementById(
            "studentStoryFile"
        ).value =
            "";

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
       REACTION
       ===================================================== */

    async function reactToStory(
        reaction
    ) {

        if (
            !currentViewingStory
        ) {
            return;
        }

        await loadUser();

        if (!currentUser) {

            alert(
                "يجب تسجيل الدخول أولًا."
            );

            return;
        }

        try {

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
                                currentViewingStory.id,

                            user_id:
                                currentUser.id,

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

        } catch (error) {

            console.error(
                error
            );

            alert(
                error.message ||
                "تعذر تسجيل التفاعل."
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

                    /*
                     * افتح معرض الهاتف مباشرة
                     */
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

                    const file =
                        event.target.files[0];

                    showFilePreview(
                        file
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

        document
            .getElementById(
                "studentStoryViewer"
            )
            .addEventListener(
                "click",
                event => {

                    if (
                        event.target.id ===
                        "studentStoryViewer"
                    ) {

                        event.currentTarget
                            .classList
                            .remove(
                                "active"
                            );
                    }

                }
            );

        document
            .getElementById(
                "studentStoryCreateModal"
            )
            .addEventListener(
                "click",
                event => {

                    if (
                        event.target.id ===
                        "studentStoryCreateModal"
                    ) {

                        closeCreateModal();

                    }

                }
            );
    }

    /* =====================================================
       AUTH STATE
       ===================================================== */

    function watchAuth() {

        if (!sb) {
            return;
        }

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
       INITIALIZE
       ===================================================== */

    async function initialize() {

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

    /* =====================================================
       START
       ===================================================== */

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
