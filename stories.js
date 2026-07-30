/* =========================================================
   STORIES SYSTEM
   Text + Image + Video
   Publish + View + Delete + Edit + Views + Reactions
   ========================================================= */

(async function () {
    "use strict";

    /* =========================
       Supabase
       ========================= */

    let sb = window.studentSupabase || window.supabaseClient || null;

    if (!sb) {
        if (!window.supabase || !window.supabase.createClient) {
            alert("Supabase لم يتم تحميله.");
            return;
        }

        try {
            const response = await fetch("/config.json", {
                cache: "no-store"
            });

            if (!response.ok) {
                throw new Error("لم يتم العثور على config.json");
            }

            const config = await response.json();

            if (!config.supabase_url || !config.supabase_key) {
                throw new Error("بيانات Supabase غير صحيحة.");
            }

            sb = window.supabase.createClient(
                config.supabase_url,
                config.supabase_key
            );

            window.studentSupabase = sb;

        } catch (error) {
            console.error(error);
            alert("تعذر الاتصال بـ Supabase.");
            return;
        }
    }

    /* =========================
       Current User
       ========================= */

    let currentUser = null;

    async function loadUser() {
        const {
            data,
            error
        } = await sb.auth.getUser();

        if (error) {
            console.error(error);
            return null;
        }

        currentUser = data.user || null;
        return currentUser;
    }

    await loadUser();

    /* =========================
       CSS
       ========================= */

    const style = document.createElement("style");

    style.textContent = `
        .stories-system * {
            box-sizing: border-box;
            font-family: Arial, sans-serif;
        }

        .stories-floating-btn {
            position: fixed;
            left: 18px;
            bottom: 85px;
            width: 58px;
            height: 58px;
            border-radius: 50%;
            border: none;
            background: #1877f2;
            color: #fff;
            font-size: 30px;
            cursor: pointer;
            z-index: 9998;
            box-shadow: 0 7px 24px rgba(0,0,0,.20);
        }

        .stories-floating-btn:active {
            transform: scale(.95);
        }

        .stories-strip {
            display: flex;
            gap: 12px;
            overflow-x: auto;
            padding: 12px 4px;
            margin-bottom: 10px;
            scrollbar-width: none;
        }

        .stories-strip::-webkit-scrollbar {
            display: none;
        }

        .story-circle {
            min-width: 72px;
            width: 72px;
            text-align: center;
            cursor: pointer;
        }

        .story-avatar {
            width: 62px;
            height: 62px;
            border-radius: 50%;
            padding: 3px;
            margin: auto;
            background: linear-gradient(135deg,#1877f2,#00a8ff);
        }

        .story-avatar-inner {
            width: 100%;
            height: 100%;
            border-radius: 50%;
            background: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #1877f2;
            font-weight: bold;
        }

        .story-circle small {
            display: block;
            margin-top: 5px;
            font-size: 11px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .stories-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,.88);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 99999;
            padding: 15px;
        }

        .stories-overlay.active {
            display: flex;
        }

        .story-viewer {
            width: min(430px,100%);
            height: min(760px,94vh);
            background: #111;
            border-radius: 18px;
            overflow: hidden;
            position: relative;
            color: #fff;
        }

        .story-progress {
            position: absolute;
            top: 9px;
            left: 10px;
            right: 10px;
            height: 3px;
            background: rgba(255,255,255,.35);
            border-radius: 10px;
            z-index: 5;
        }

        .story-progress span {
            display: block;
            height: 100%;
            width: 100%;
            background: #fff;
            border-radius: 10px;
        }

        .story-top {
            position: absolute;
            top: 17px;
            left: 12px;
            right: 12px;
            z-index: 6;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .story-close,
        .story-menu {
            border: none;
            background: rgba(0,0,0,.35);
            color: #fff;
            width: 38px;
            height: 38px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 20px;
        }

        .story-content-area {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
        }

        .story-content-area img,
        .story-content-area video {
            width: 100%;
            height: 100%;
            object-fit: contain;
        }

        .story-text-content {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 30px;
            font-size: 30px;
            font-weight: bold;
            line-height: 1.4;
            word-break: break-word;
        }

        .story-footer {
            position: absolute;
            bottom: 14px;
            left: 12px;
            right: 12px;
            z-index: 8;
            display: flex;
            gap: 8px;
            align-items: center;
        }

        .story-reaction-btn {
            flex: 1;
            border: none;
            background: rgba(255,255,255,.15);
            color: #fff;
            border-radius: 20px;
            padding: 10px;
            cursor: pointer;
        }

        .story-actions-row {
            position: absolute;
            bottom: 65px;
            left: 12px;
            right: 12px;
            display: none;
            z-index: 10;
            gap: 7px;
        }

        .story-actions-row button {
            flex: 1;
            border: none;
            border-radius: 12px;
            padding: 9px;
            cursor: pointer;
        }

        .story-modal {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,.55);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 99998;
            padding: 15px;
        }

        .story-modal.active {
            display: flex;
        }

        .story-form {
            width: min(440px,100%);
            background: #fff;
            border-radius: 20px;
            padding: 20px;
            direction: rtl;
        }

        .story-form h3 {
            margin-top: 0;
            margin-bottom: 15px;
        }

        .story-form textarea,
        .story-form input {
            width: 100%;
            border: 1px solid #ddd;
            border-radius: 12px;
            padding: 12px;
            margin-bottom: 10px;
            font-size: 15px;
        }

        .story-form textarea {
            resize: vertical;
            min-height: 120px;
        }

        .story-type-buttons {
            display: flex;
            gap: 7px;
            margin-bottom: 10px;
        }

        .story-type-buttons button {
            flex: 1;
            border: 1px solid #ddd;
            background: #f7f7f7;
            padding: 10px;
            border-radius: 10px;
            cursor: pointer;
        }

        .story-form-actions {
            display: flex;
            gap: 8px;
            margin-top: 10px;
        }

        .story-form-actions button {
            flex: 1;
            border: none;
            border-radius: 12px;
            padding: 12px;
            cursor: pointer;
        }

        .story-publish {
            background: #1877f2;
            color: #fff;
        }

        .story-cancel {
            background: #eee;
        }

        .story-loading {
            text-align: center;
            padding: 15px;
            color: #777;
        }

        .story-view-count {
            position: absolute;
            top: 65px;
            right: 12px;
            z-index: 7;
            background: rgba(0,0,0,.4);
            padding: 6px 10px;
            border-radius: 15px;
            font-size: 12px;
        }
    `;

    document.head.appendChild(style);

    /* =========================
       HTML
       ========================= */

    const root = document.createElement("div");
    root.className = "stories-system";

    root.innerHTML = `
        <button class="stories-floating-btn" id="storiesAddBtn">+</button>

        <div class="stories-strip" id="storiesStrip">
            <div class="story-loading">
                جاري تحميل القصص...
            </div>
        </div>

        <div class="story-modal" id="storyCreateModal">
            <div class="story-form">

                <h3 id="storyFormTitle">
                    إضافة ستوري
                </h3>

                <div class="story-type-buttons">
                    <button type="button" id="storyTextType">
                        نص
                    </button>

                    <button type="button" id="storyMediaType">
                        صورة / فيديو
                    </button>
                </div>

                <textarea
                    id="storyText"
                    placeholder="اكتب شيئًا..."
                ></textarea>

                <input
                    id="storyMedia"
                    type="file"
                    accept="image/*,video/*"
                    style="display:none"
                >

                <input
                    id="storyBackground"
                    type="text"
                    value="#1877f2"
                    placeholder="لون الخلفية"
                >

                <input
                    id="storyTextColor"
                    type="text"
                    value="#ffffff"
                    placeholder="لون النص"
                >

                <div class="story-form-actions">

                    <button
                        class="story-cancel"
                        id="storyCancelBtn"
                    >
                        إلغاء
                    </button>

                    <button
                        class="story-publish"
                        id="storyPublishBtn"
                    >
                        نشر
                    </button>

                </div>

            </div>
        </div>

        <div
            class="stories-overlay"
            id="storyViewerOverlay"
        >

            <div class="story-viewer">

                <div class="story-progress">
                    <span></span>
                </div>

                <div class="story-top">

                    <button
                        class="story-close"
                        id="storyCloseBtn"
                    >
                        ×
                    </button>

                    <button
                        class="story-menu"
                        id="storyMenuBtn"
                    >
                        ⋮
                    </button>

                </div>

                <div
                    class="story-view-count"
                    id="storyViewCount"
                >
                    👁 0
                </div>

                <div
                    class="story-content-area"
                    id="storyContentArea"
                ></div>

                <div
                    class="story-actions-row"
                    id="storyActionsRow"
                >

                    <button id="storyEditBtn">
                        تعديل
                    </button>

                    <button
                        id="storyDeleteBtn"
                        style="color:#d00"
                    >
                        حذف
                    </button>

                </div>

                <div class="story-footer">

                    <button
                        class="story-reaction-btn"
                        data-reaction="❤️"
                    >
                        ❤️
                    </button>

                    <button
                        class="story-reaction-btn"
                        data-reaction="😂"
                    >
                        😂
                    </button>

                    <button
                        class="story-reaction-btn"
                        data-reaction="🔥"
                    >
                        🔥
                    </button>

                    <button
                        class="story-reaction-btn"
                        data-reaction="👏"
                    >
                        👏
                    </button>

                </div>

            </div>

        </div>
    `;

    document.body.appendChild(root);

    /* =========================
       Elements
       ========================= */

    const addBtn =
        document.getElementById("storiesAddBtn");

    const strip =
        document.getElementById("storiesStrip");

    const createModal =
        document.getElementById("storyCreateModal");

    const viewerOverlay =
        document.getElementById("storyViewerOverlay");

    const cancelBtn =
        document.getElementById("storyCancelBtn");

    const publishBtn =
        document.getElementById("storyPublishBtn");

    const textType =
        document.getElementById("storyTextType");

    const mediaType =
        document.getElementById("storyMediaType");

    const textInput =
        document.getElementById("storyText");

    const mediaInput =
        document.getElementById("storyMedia");

    const backgroundInput =
        document.getElementById("storyBackground");

    const textColorInput =
        document.getElementById("storyTextColor");

    const formTitle =
        document.getElementById("storyFormTitle");

    const viewerContent =
        document.getElementById("storyContentArea");

    const closeViewerBtn =
        document.getElementById("storyCloseBtn");

    const menuBtn =
        document.getElementById("storyMenuBtn");

    const actionsRow =
        document.getElementById("storyActionsRow");

    const editBtn =
        document.getElementById("storyEditBtn");

    const deleteBtn =
        document.getElementById("storyDeleteBtn");

    const viewCount =
        document.getElementById("storyViewCount");

    let storyMode = "text";
    let editStory = null;
    let currentViewingStory = null;

    /* =========================
       Story Type
       ========================= */

    textType.addEventListener("click", () => {

        storyMode = "text";

        mediaInput.style.display = "none";
        textInput.style.display = "block";

    });

    mediaType.addEventListener("click", () => {

        storyMode = "media";

        mediaInput.style.display = "block";
        textInput.style.display = "block";

    });

    /* =========================
       Open Create Modal
       ========================= */

    addBtn.addEventListener("click", async () => {

        await loadUser();

        if (!currentUser) {
            alert("يجب تسجيل الدخول أولًا.");
            return;
        }

        editStory = null;

        formTitle.textContent =
            "إضافة ستوري";

        textInput.value = "";
        mediaInput.value = "";

        backgroundInput.value =
            "#1877f2";

        textColorInput.value =
            "#ffffff";

        storyMode = "text";

        mediaInput.style.display =
            "none";

        createModal.classList.add(
            "active"
        );

    });

    /* =========================
       Cancel
       ========================= */

    cancelBtn.addEventListener("click", () => {

        createModal.classList.remove(
            "active"
        );

    });

    /* =========================
       Upload File
       ========================= */

    async function uploadStoryFile(
        file,
        userId
    ) {

        const extension =
            file.name
                .split(".")
                .pop()
                .toLowerCase();

        const fileName =
            `${Date.now()}_${Math.random()
                .toString(36)
                .substring(2)}.${extension}`;

        const filePath =
            `${userId}/${fileName}`;

        const {
            error
        } = await sb.storage
            .from("stories")
            .upload(
                filePath,
                file,
                {
                    cacheControl: "3600",
                    contentType: file.type,
                    upsert: false
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

        return {
            url: data.publicUrl,
            path: filePath
        };
    }

    /* =========================
       Publish / Update
       ========================= */

    publishBtn.addEventListener(
        "click",
        async () => {

            try {

                await loadUser();

                if (!currentUser) {
                    alert(
                        "يجب تسجيل الدخول أولًا."
                    );
                    return;
                }

                publishBtn.disabled =
                    true;

                publishBtn.textContent =
                    "جاري الحفظ...";

                let mediaUrl =
                    editStory
                        ? editStory.media_url
                        : null;

                let type =
                    editStory
                        ? editStory.type
                        : "text";

                /* Media */

                if (
                    mediaInput.files &&
                    mediaInput.files.length > 0
                ) {

                    const file =
                        mediaInput.files[0];

                    if (
                        !file.type.startsWith(
                            "image/"
                        ) &&
                        !file.type.startsWith(
                            "video/"
                        )
                    ) {
                        throw new Error(
                            "نوع الملف غير مدعوم."
                        );
                    }

                    const uploaded =
                        await uploadStoryFile(
                            file,
                            currentUser.id
                        );

                    mediaUrl =
                        uploaded.url;

                    type =
                        file.type.startsWith(
                            "video/"
                        )
                            ? "video"
                            : "image";
                }

                /* Update */

                if (editStory) {

                    const {
                        error
                    } = await sb
                        .from("stories")
                        .update({
                            type,
                            content:
                                textInput
                                    .value
                                    .trim(),

                            media_url:
                                mediaUrl,

                            background_color:
                                backgroundInput
                                    .value
                                    .trim(),

                            text_color:
                                textColorInput
                                    .value
                                    .trim()
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

                    alert(
                        "تم تعديل الستوري."
                    );

                }

                /* Insert */

                else {

                    const {
                        error
                    } = await sb
                        .from("stories")
                        .insert({
                            user_id:
                                currentUser.id,

                            type,

                            content:
                                textInput
                                    .value
                                    .trim(),

                            media_url:
                                mediaUrl,

                            background_color:
                                backgroundInput
                                    .value
                                    .trim(),

                            text_color:
                                textColorInput
                                    .value
                                    .trim()
                        });

                    if (error) {
                        throw error;
                    }

                    alert(
                        "تم نشر الستوري."
                    );
                }

                createModal.classList.remove(
                    "active"
                );

                editStory = null;

                await loadStories();

            } catch (error) {

                console.error(error);

                alert(
                    error.message ||
                    "حدث خطأ أثناء حفظ الستوري."
                );

            } finally {

                publishBtn.disabled =
                    false;

                publishBtn.textContent =
                    "نشر";
            }

        }
    );

    /* =========================
       Load Stories
       ========================= */

    async function loadStories() {

        strip.innerHTML =
            `
            <div class="story-loading">
                جاري تحميل القصص...
            </div>
            `;

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
                    ascending: false
                }
            );

        if (error) {

            console.error(error);

            strip.innerHTML =
                `
                <div class="story-loading">
                    تعذر تحميل القصص
                </div>
                `;

            return;
        }

        if (
            !data ||
            data.length === 0
        ) {

            strip.innerHTML =
                `
                <div class="story-loading">
                    لا توجد قصص حاليًا
                </div>
                `;

            return;
        }

        strip.innerHTML = "";

        const grouped =
            new Map();

        data.forEach(story => {

            if (
                !grouped.has(
                    story.user_id
                )
            ) {
                grouped.set(
                    story.user_id,
                    story
                );
            }

        });

        grouped.forEach(story => {

            const item =
                document.createElement(
                    "div"
                );

            item.className =
                "story-circle";

            const avatar =
                document.createElement(
                    "div"
                );

            avatar.className =
                "story-avatar";

            const avatarInner =
                document.createElement(
                    "div"
                );

            avatarInner.className =
                "story-avatar-inner";

            avatarInner.textContent =
                story.user_id ===
                currentUser?.id
                    ? "أنت"
                    : "S";

            avatar.appendChild(
                avatarInner
            );

            const name =
                document.createElement(
                    "small"
                );

            name.textContent =
                story.user_id ===
                currentUser?.id
                    ? "قصتي"
                    : "ستوري";

            item.appendChild(
                avatar
            );

            item.appendChild(
                name
            );

            item.addEventListener(
                "click",
                () =>
                    openStoryGroup(
                        story.user_id,
                        data
                    )
            );

            strip.appendChild(
                item
            );

        });

    }

    /* =========================
       Open Group
       ========================= */

    async function openStoryGroup(
        userId,
        allStories
    ) {

        const stories =
            allStories.filter(
                story =>
                    story.user_id ===
                    userId
            );

        if (!stories.length) {
            return;
        }

        await openStory(
            stories[0],
            stories
        );
    }

    /* =========================
       Open Story
       ========================= */

    async function openStory(
        story,
        group
    ) {

        currentViewingStory =
            story;

        viewerOverlay.classList.add(
            "active"
        );

        const progress =
            document.querySelector(
                ".story-progress span"
            );

        progress.style.width =
            "100%";

        actionsRow.style.display =
            "none";

        viewerContent.innerHTML =
            "";

        /* Text */

        if (
            story.type ===
            "text"
        ) {

            viewerContent.style.background =
                story.background_color ||
                "#1877f2";

            const text =
                document.createElement(
                    "div"
                );

            text.className =
                "story-text-content";

            text.style.color =
                story.text_color ||
                "#ffffff";

            text.textContent =
                story.content ||
                "";

            viewerContent.appendChild(
                text
            );

        }

        /* Image */

        else if (
            story.type ===
            "image"
        ) {

            viewerContent.style.background =
                "#000";

            const image =
                document.createElement(
                    "img"
                );

            image.src =
                story.media_url;

            image.alt =
                "Story";

            viewerContent.appendChild(
                image
            );

        }

        /* Video */

        else if (
            story.type ===
            "video"
        ) {

            viewerContent.style.background =
                "#000";

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

            viewerContent.appendChild(
                video
            );
        }

        await registerView(
            story.id
        );

        await loadViewCount(
            story.id
        );

        menuBtn.onclick = () => {

            if (
                story.user_id ===
                currentUser?.id
            ) {

                actionsRow.style.display =
                    actionsRow.style.display ===
                    "flex"
                        ? "none"
                        : "flex";
            }

        };

    }

    /* =========================
       Register View
       ========================= */

    async function registerView(
        storyId
    ) {

        await loadUser();

        if (!currentUser) {
            return;
        }

        const {
            data: existing,
            error: selectError
        } = await sb
            .from("story_views")
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

        if (selectError) {
            console.error(
                selectError
            );
            return;
        }

        if (existing) {
            return;
        }

        const {
            error
        } = await sb
            .from("story_views")
            .insert({
                story_id:
                    storyId,

                user_id:
                    currentUser.id
            });

        if (error) {
            console.error(error);
        }

    }

    /* =========================
       View Count
       ========================= */

    async function loadViewCount(
        storyId
    ) {

        const {
            count,
            error
        } = await sb
            .from("story_views")
            .select("*", {
                count: "exact",
                head: true
            })
            .eq(
                "story_id",
                storyId
            );

        if (error) {
            console.error(error);
            return;
        }

        viewCount.textContent =
            `👁 ${count || 0}`;
    }

    /* =========================
       Delete
       ========================= */

    deleteBtn.addEventListener(
        "click",
        async () => {

            if (!currentViewingStory) {
                return;
            }

            if (
                currentViewingStory.user_id !==
                currentUser?.id
            ) {
                return;
            }

            const confirmed =
                confirm(
                    "هل تريد حذف هذه الستوري؟"
                );

            if (!confirmed) {
                return;
            }

            const {
                error
            } = await sb
                .from("stories")
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

                console.error(
                    error
                );

                alert(
                    error.message ||
                    "تعذر حذف الستوري."
                );

                return;
            }

            viewerOverlay.classList.remove(
                "active"
            );

            await loadStories();

            alert(
                "تم حذف الستوري."
            );
        }
    );

    /* =========================
       Edit
       ========================= */

    editBtn.addEventListener(
        "click",
        () => {

            if (!currentViewingStory) {
                return;
            }

            if (
                currentViewingStory.user_id !==
                currentUser?.id
            ) {
                return;
            }

            editStory =
                currentViewingStory;

            formTitle.textContent =
                "تعديل الستوري";

            textInput.value =
                currentViewingStory
                    .content || "";

            backgroundInput.value =
                currentViewingStory
                    .background_color ||
                "#1877f2";

            textColorInput.value =
                currentViewingStory
                    .text_color ||
                "#ffffff";

            mediaInput.value = "";

            storyMode =
                currentViewingStory
                    .type === "text"
                        ? "text"
                        : "media";

            mediaInput.style.display =
                storyMode === "media"
                    ? "block"
                    : "none";

            createModal.classList.add(
                "active"
            );

            viewerOverlay.classList.remove(
                "active"
            );

        }
    );

    /* =========================
       Reactions
       ========================= */

    document
        .querySelectorAll(
            ".story-reaction-btn"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                async () => {

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

                    const reaction =
                        button.dataset.reaction;

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

                                reaction
                            },
                            {
                                onConflict:
                                    "story_id,user_id"
                            }
                        );

                    if (error) {

                        console.error(
                            error
                        );

                        alert(
                            "تعذر تسجيل التفاعل."
                        );

                        return;
                    }

                    button.style.transform =
                        "scale(1.25)";

                    setTimeout(() => {

                        button.style.transform =
                            "";

                    }, 200);

                }
            );

        });

    /* =========================
       Close Viewer
       ========================= */

    closeViewerBtn.addEventListener(
        "click",
        () => {

            viewerOverlay.classList.remove(
                "active"
            );

            viewerContent.innerHTML =
                "";

        }
    );

    viewerOverlay.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                viewerOverlay
            ) {

                viewerOverlay.classList.remove(
                    "active"
                );

            }

        }
    );

    /* =========================
       Load
       ========================= */

    await loadStories();

    setInterval(
        async () => {
            await loadStories();
        },
        60000
    );

})();
