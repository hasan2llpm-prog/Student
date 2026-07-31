/* =========================================================
   Student - Reels Advanced

   📌 تثبيت / إلغاء تثبيت
   🛠️ تحرير الوصف
   #️⃣ هاشتاغ
   @️⃣ منشن
   🎬 استبدال الفيديو
   🖼️ تغيير الغلاف

   Storage:
   post-media/reels/
   post-media/reels/covers/
========================================================= */

(function () {

    "use strict";

    if (window.__studentReelsAdvancedLoaded) {
        return;
    }

    window.__studentReelsAdvancedLoaded = true;

    let currentUserId = null;


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


    async function loadCurrentUser() {

        const client = getSupabase();

        if (!client) {
            currentUserId = null;
            return null;
        }

        try {

            const {
                data: {
                    user
                }
            } = await client.auth.getUser();

            currentUserId =
                user?.id || null;

            return user || null;

        } catch (error) {

            console.error(
                "Advanced auth error:",
                error
            );

            currentUserId = null;

            return null;
        }
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
       Toast
    ===================================================== */

    function toast(message) {

        const old =
            document.getElementById(
                "student-advanced-toast"
            );

        if (old) {
            old.remove();
        }

        const element =
            document.createElement("div");

        element.id =
            "student-advanced-toast";

        element.textContent =
            message;

        element.style.cssText = `
            position:fixed;
            left:50%;
            bottom:30px;
            transform:translateX(-50%);
            z-index:100001600;
            background:#111;
            color:#fff;
            padding:11px 16px;
            border-radius:13px;
            direction:rtl;
            font-size:13px;
            box-shadow:0 10px 35px rgba(0,0,0,.28);
        `;

        document.body.appendChild(element);

        setTimeout(
            function () {
                element.remove();
            },
            2500
        );
    }


    /* =====================================================
       Reel Helpers
    ===================================================== */

    function getReel(button) {

        return button?.closest(
            ".student-reel"
        );
    }


    function getReelId(reel) {

        return reel?.dataset?.id || "";
    }


    /* =====================================================
       Dialog
    ===================================================== */

    function closeDialog() {

        const dialog =
            document.getElementById(
                "student-advanced-dialog"
            );

        if (dialog) {
            dialog.remove();
        }

        /* لا يوجد history.back() */
    }


    function openDialog(
        title,
        content,
        buttons,
        ready
    ) {

        closeDialog();

        const dialog =
            document.createElement(
                "div"
            );

        dialog.id =
            "student-advanced-dialog";

        dialog.style.cssText = `
            position:fixed;
            inset:0;
            z-index:100001550;
            display:flex;
            align-items:center;
            justify-content:center;
            padding:18px;
            background:rgba(0,0,0,.58);
            direction:rtl;
        `;

        dialog.innerHTML = `

            <div style="
                width:100%;
                max-width:470px;
                max-height:92vh;
                overflow:auto;
                background:#fff;
                border-radius:24px;
                padding:20px;
                box-sizing:border-box;
                box-shadow:0 20px 70px rgba(0,0,0,.32);
            ">

                <div style="
                    display:flex;
                    align-items:center;
                    margin-bottom:16px;
                ">

                    <strong style="
                        flex:1;
                        font-size:19px;
                        color:#111;
                    ">
                        ${escapeHTML(title)}
                    </strong>

                    <button
                        type="button"
                        id="student-advanced-close"
                        style="
                            width:40px;
                            height:40px;
                            border:0;
                            border-radius:50%;
                            background:#f1f3f5;
                            font-size:20px;
                            cursor:pointer;
                        "
                    >
                        ×
                    </button>

                </div>

                ${content}

                <div style="
                    display:flex;
                    gap:10px;
                    margin-top:17px;
                ">
                    ${buttons}
                </div>

            </div>
        `;

        document.body.appendChild(dialog);

        dialog
            .querySelector(
                "#student-advanced-close"
            )
            ?.addEventListener(
                "click",
                closeDialog
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

        if (
            typeof ready ===
            "function"
        ) {
            ready(dialog);
        }

        return dialog;
    }


    /* =====================================================
       Confirmation
    ===================================================== */

    function confirmAction(
        title,
        message,
        actionText,
        actionColor,
        onConfirm
    ) {

        const existing =
            document.getElementById(
                "student-advanced-confirm"
            );

        if (existing) {
            existing.remove();
        }

        const dialog =
            document.createElement(
                "div"
            );

        dialog.id =
            "student-advanced-confirm";

        dialog.style.cssText = `
            position:fixed;
            inset:0;
            z-index:100001800;
            display:flex;
            align-items:center;
            justify-content:center;
            padding:20px;
            background:rgba(0,0,0,.55);
            direction:rtl;
        `;

        dialog.innerHTML = `

            <div style="
                width:100%;
                max-width:390px;
                background:#fff;
                border-radius:22px;
                padding:20px;
                box-sizing:border-box;
                box-shadow:0 20px 70px rgba(0,0,0,.3);
            ">

                <div style="
                    font-size:19px;
                    font-weight:800;
                    color:#111;
                    margin-bottom:12px;
                ">
                    ${escapeHTML(title)}
                </div>

                <div style="
                    color:#666;
                    line-height:1.8;
                    font-size:14px;
                ">
                    ${escapeHTML(message)}
                </div>

                <div style="
                    display:flex;
                    gap:10px;
                    margin-top:18px;
                ">

                    <button
                        type="button"
                        id="advanced-confirm-cancel"
                        style="
                            flex:1;
                            border:0;
                            padding:13px;
                            border-radius:13px;
                            background:#f1f3f5;
                            cursor:pointer;
                            font-weight:700;
                        "
                    >
                        إلغاء
                    </button>

                    <button
                        type="button"
                        id="advanced-confirm-action"
                        style="
                            flex:1;
                            border:0;
                            padding:13px;
                            border-radius:13px;
                            background:${actionColor};
                            color:#fff;
                            cursor:pointer;
                            font-weight:700;
                        "
                    >
                        ${escapeHTML(actionText)}
                    </button>

                </div>
            </div>
        `;

        document.body.appendChild(dialog);

        dialog
            .querySelector(
                "#advanced-confirm-cancel"
            )
            ?.addEventListener(
                "click",
                function () {
                    dialog.remove();
                }
            );

        dialog
            .querySelector(
                "#advanced-confirm-action"
            )
            ?.addEventListener(
                "click",
                async function () {

                    this.disabled = true;
                    this.textContent = "جارٍ التنفيذ...";

                    try {
                        await onConfirm();
                    } finally {
                        dialog.remove();
                    }

                }
            );
    }


    /* =====================================================
       Own Reel
    ===================================================== */

    async function getOwnReel(
        reelId
    ) {

        const client =
            getSupabase();

        if (
            !client ||
            !currentUserId
        ) {
            return null;
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
                    caption,
                    video_url,
                    thumbnail_url,
                    created_at,
                    pinned_at
                `)
                .eq(
                    "id",
                    reelId
                )
                .maybeSingle();

        if (error) {
            throw error;
        }

        if (
            !data ||
            String(data.user_id) !==
            String(currentUserId)
        ) {
            return null;
        }

        return data;
    }


    /* =====================================================
       Tags
    ===================================================== */

    function extractTags(text) {

        const hashtags =
            text.match(
                /#[\u0600-\u06FFa-zA-Z0-9_]+/g
            ) || [];

        const mentions =
            text.match(
                /@[\u0600-\u06FFa-zA-Z0-9_.]+/g
            ) || [];

        return {

            hashtags:
                [...new Set(hashtags)],

            mentions:
                [...new Set(mentions)]
        };
    }


    /* =====================================================
       Advanced Edit
    ===================================================== */

    async function openAdvancedEdit(
        reelId
    ) {

        await loadCurrentUser();

        if (!currentUserId) {

            toast(
                "يجب تسجيل الدخول أولًا."
            );

            return;
        }

        let reel;

        try {

            reel =
                await getOwnReel(
                    reelId
                );

        } catch (error) {

            toast(
                error?.message ||
                "تعذر تحميل الـReel."
            );

            return;
        }

        if (!reel) {

            toast(
                "لا يمكنك تعديل هذا الـReel."
            );

            return;
        }


        openDialog(

            "تحرير Reel",

            `
            <label style="
                display:block;
                font-size:13px;
                font-weight:700;
                margin-bottom:8px;
            ">
                الوصف
            </label>

            <textarea
                id="advanced-caption"
                maxlength="2000"
                style="
                    width:100%;
                    min-height:130px;
                    box-sizing:border-box;
                    border:1px solid #ddd;
                    border-radius:15px;
                    padding:13px;
                    resize:none;
                    outline:none;
                    font-size:14px;
                "
            >${escapeHTML(
                reel.caption || ""
            )}</textarea>

            <div
                id="advanced-tags"
                style="
                    margin-top:10px;
                    padding:12px;
                    background:#f7f8fa;
                    border-radius:14px;
                    font-size:12px;
                    color:#777;
                    line-height:1.8;
                "
            ></div>


            <div style="
                margin-top:16px;
                display:grid;
                gap:10px;
            ">

                <button
                    type="button"
                    id="advanced-video"
                    style="
                        width:100%;
                        border:1px solid #e4e7eb;
                        background:#fff;
                        padding:14px;
                        border-radius:14px;
                        text-align:right;
                        cursor:pointer;
                        font-weight:700;
                    "
                >
                    🎬 استبدال الفيديو
                </button>


                <button
                    type="button"
                    id="advanced-cover"
                    style="
                        width:100%;
                        border:1px solid #e4e7eb;
                        background:#fff;
                        padding:14px;
                        border-radius:14px;
                        text-align:right;
                        cursor:pointer;
                        font-weight:700;
                    "
                >
                    🖼️ تغيير الغلاف
                </button>


                <input
                    id="advanced-video-input"
                    type="file"
                    accept="video/*"
                    style="display:none"
                >


                <input
                    id="advanced-cover-input"
                    type="file"
                    accept="image/*"
                    style="display:none"
                >

            </div>


            <div
                id="advanced-file-status"
                style="
                    margin-top:10px;
                    color:#777;
                    font-size:12px;
                    line-height:1.7;
                "
            >
                لا توجد تغييرات على الفيديو أو الغلاف.
            </div>
            `,

            `
            <button
                type="button"
                id="advanced-cancel"
                style="
                    flex:1;
                    border:0;
                    padding:13px;
                    border-radius:13px;
                    background:#f1f3f5;
                    cursor:pointer;
                    font-weight:700;
                "
            >
                إلغاء
            </button>

            <button
                type="button"
                id="advanced-save"
                style="
                    flex:1;
                    border:0;
                    padding:13px;
                    border-radius:13px;
                    background:#0095f6;
                    color:#fff;
                    cursor:pointer;
                    font-weight:700;
                "
            >
                حفظ التغييرات
            </button>
            `,

            function (dialog) {

                const caption =
                    dialog.querySelector(
                        "#advanced-caption"
                    );

                const tags =
                    dialog.querySelector(
                        "#advanced-tags"
                    );

                const videoButton =
                    dialog.querySelector(
                        "#advanced-video"
                    );

                const coverButton =
                    dialog.querySelector(
                        "#advanced-cover"
                    );

                const videoInput =
                    dialog.querySelector(
                        "#advanced-video-input"
                    );

                const coverInput =
                    dialog.querySelector(
                        "#advanced-cover-input"
                    );

                const status =
                    dialog.querySelector(
                        "#advanced-file-status"
                    );


                let selectedVideo = null;
                let selectedCover = null;


                function updateTags() {

                    const result =
                        extractTags(
                            caption.value
                        );

                    tags.innerHTML = `

                        <strong>
                            الهاشتاغ:
                        </strong>

                        ${
                            result.hashtags.length
                                ? escapeHTML(
                                    result.hashtags.join(" ")
                                )
                                : "لا يوجد"
                        }

                        <br>

                        <strong>
                            المنشن:
                        </strong>

                        ${
                            result.mentions.length
                                ? escapeHTML(
                                    result.mentions.join(" ")
                                )
                                : "لا يوجد"
                        }
                    `;
                }


                updateTags();


                caption.addEventListener(
                    "input",
                    updateTags
                );


                videoButton.addEventListener(
                    "click",
                    function () {

                        videoInput.click();

                    }
                );


                coverButton.addEventListener(
                    "click",
                    function () {

                        coverInput.click();

                    }
                );


                videoInput.addEventListener(
                    "change",
                    function () {

                        selectedVideo =
                            this.files?.[0] ||
                            null;


                        updateFileStatus();

                    }
                );


                coverInput.addEventListener(
                    "change",
                    function () {

                        selectedCover =
                            this.files?.[0] ||
                            null;


                        updateFileStatus();

                    }
                );


                function updateFileStatus() {

                    const parts = [];


                    if (selectedVideo) {

                        parts.push(
                            `🎬 فيديو جديد: ${selectedVideo.name}`
                        );
                    }


                    if (selectedCover) {

                        parts.push(
                            `🖼️ غلاف جديد: ${selectedCover.name}`
                        );
                    }


                    status.innerHTML =
                        parts.length
                            ? parts.join("<br>")
                            : "لا توجد تغييرات على الفيديو أو الغلاف.";
                }


                dialog
                    .querySelector(
                        "#advanced-cancel"
                    )
                    ?.addEventListener(
                        "click",
                        closeDialog
                    );


                dialog
                    .querySelector(
                        "#advanced-save"
                    )
                    ?.addEventListener(
                        "click",
                        function () {

                            confirmSaveChanges(
                                reelId,
                                caption.value,
                                selectedVideo,
                                selectedCover,
                                this
                            );

                        }
                    );
            }
        );
    }


    /* =====================================================
       Confirm edit
    ===================================================== */

    function confirmSaveChanges(
        reelId,
        caption,
        selectedVideo,
        selectedCover,
        button
    ) {

        const changes = [];


        if (
            caption.trim()
        ) {
            changes.push(
                "تعديل الوصف"
            );
        }


        if (selectedVideo) {
            changes.push(
                "استبدال الفيديو"
            );
        }


        if (selectedCover) {
            changes.push(
                "تغيير الغلاف"
            );
        }


        if (!changes.length) {

            toast(
                "لم يتم اختيار أي تغيير."
            );

            return;
        }


        confirmAction(
            "تأكيد التغييرات",
            `سيتم تنفيذ: ${changes.join("، ")}. هل تريد المتابعة؟`,
            "نعم، حفظ",
            "#0095f6",
            async function () {

                await saveAdvancedChanges(
                    reelId,
                    caption,
                    selectedVideo,
                    selectedCover,
                    button
                );

            }
        );
    }


    /* =====================================================
       Storage Path
    ===================================================== */

    function makeSafeFileName(
        file
    ) {

        const extension =
            file.name.includes(".")
                ? file.name
                    .split(".")
                    .pop()
                    .toLowerCase()
                : "bin";


        return (
            Date.now() +
            "-" +
            crypto.randomUUID() +
            "." +
            extension
        );
    }


    /* =====================================================
       Upload Video
    ===================================================== */

    async function uploadVideo(
        file,
        reelId
    ) {

        const client =
            getSupabase();

        const path =
            `${currentUserId}/reels/${makeSafeFileName(file)}`;


        const {
            error
        } =
            await client
                .storage
                .from("post-media")
                .upload(
                    path,
                    file,
                    {
                        cacheControl:
                            "3600",

                        upsert:
                            false,

                        contentType:
                            file.type
                    }
                );


        if (error) {
            throw error;
        }


        const {
            data
        } =
            client
                .storage
                .from("post-media")
                .getPublicUrl(
                    path
                );


        return {
            url:
                data.publicUrl,

            path:
                path
        };
    }


    /* =====================================================
       Upload Cover
    ===================================================== */

    async function uploadCover(
        file
    ) {

        const client =
            getSupabase();

        const path =
            `${currentUserId}/reels/covers/${makeSafeFileName(file)}`;


        const {
            error
        } =
            await client
                .storage
                .from("post-media")
                .upload(
                    path,
                    file,
                    {
                        cacheControl:
                            "3600",

                        upsert:
                            false,

                        contentType:
                            file.type
                    }
                );


        if (error) {
            throw error;
        }


        const {
            data
        } =
            client
                .storage
                .from("post-media")
                .getPublicUrl(
                    path
                );


        return {
            url:
                data.publicUrl,

            path:
                path
        };
    }


    /* =====================================================
       Extract Storage Path From Public URL
    ===================================================== */

    function extractStoragePath(
        url
    ) {

        if (!url) {
            return null;
        }


        const marker =
            "/storage/v1/object/public/post-media/";


        const index =
            url.indexOf(
                marker
            );


        if (
            index ===
            -1
        ) {
            return null;
        }


        return decodeURIComponent(
            url.substring(
                index +
                marker.length
            )
        );
    }


    /* =====================================================
       Delete Old Storage Object
    ===================================================== */

    async function deleteOldObject(
        path
    ) {

        const client =
            getSupabase();


        if (!client || !path) {
            return;
        }


        try {

            const {
                error
            } =
                await client
                    .storage
                    .from("post-media")
                    .remove([
                        path
                    ]);


            if (error) {

                console.warn(
                    "Old file removal skipped:",
                    error
                );
            }

        } catch (error) {

            console.warn(
                "Old file removal error:",
                error
            );
        }
    }


    /* =====================================================
       Save Changes
    ===================================================== */

    async function saveAdvancedChanges(
        reelId,
        caption,
        selectedVideo,
        selectedCover,
        button
    ) {

        const client =
            getSupabase();


        if (
            !client ||
            !currentUserId
        ) {

            toast(
                "يجب تسجيل الدخول أولًا."
            );

            return;
        }


        button.disabled =
            true;

        button.textContent =
            "جارٍ الحفظ...";


        let newVideo = null;
        let newCover = null;


        try {

            const reel =
                await getOwnReel(
                    reelId
                );


            if (!reel) {

                throw new Error(
                    "لا يمكنك تعديل هذا الـReel."
                );
            }


            /* ---------------------------------------------
               Upload video
            --------------------------------------------- */

            if (selectedVideo) {

                newVideo =
                    await uploadVideo(
                        selectedVideo,
                        reelId
                    );
            }


            /* ---------------------------------------------
               Upload cover
            --------------------------------------------- */

            if (selectedCover) {

                newCover =
                    await uploadCover(
                        selectedCover
                    );
            }


            const updateData = {

                caption:
                    caption.trim() ||
                    null,

                updated_at:
                    new Date()
                        .toISOString()
            };


            if (newVideo) {

                updateData.video_url =
                    newVideo.url;
            }


            if (newCover) {

                updateData.thumbnail_url =
                    newCover.url;
            }


            const {
                error
            } =
                await client
                    .from("reels")
                    .update(
                        updateData
                    )
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


            /* ---------------------------------------------
               حذف الملفات القديمة بعد نجاح DB update
            --------------------------------------------- */

            if (
                newVideo &&
                reel.video_url
            ) {

                const oldVideoPath =
                    extractStoragePath(
                        reel.video_url
                    );


                if (oldVideoPath) {

                    await deleteOldObject(
                        oldVideoPath
                    );
                }
            }


            if (
                newCover &&
                reel.thumbnail_url
            ) {

                const oldCoverPath =
                    extractStoragePath(
                        reel.thumbnail_url
                    );


                if (oldCoverPath) {

                    await deleteOldObject(
                        oldCoverPath
                    );
                }
            }


            /* ---------------------------------------------
               تحديث الفيديو في الشاشة
            --------------------------------------------- */

            const reelElement =
                document.querySelector(
                    `.student-reel[data-id="${CSS.escape(
                        String(reelId)
                    )}"]`
                );


            if (reelElement) {

                const captionElement =
                    reelElement.querySelector(
                        ".student-reel-caption"
                    );


                if (captionElement) {

                    captionElement.textContent =
                        caption.trim();
                }


                if (newVideo) {

                    const video =
                        reelElement.querySelector(
                            "video"
                        );


                    if (video) {

                        video.pause();

                        video.src =
                            newVideo.url;

                        video.load();

                    }
                }


                if (newCover) {

                    const video =
                        reelElement.querySelector(
                            "video"
                        );


                    if (video) {

                        video.poster =
                            newCover.url;
                    }
                }
            }


            closeDialog();


            toast(
                "تم حفظ تعديلات الـReel بنجاح."
            );


        } catch (error) {

            console.error(
                "Advanced save error:",
                error
            );


            /*
               إذا رفعنا ملفًا جديدًا لكن
               فشل تحديث قاعدة البيانات،
               نحاول حذف الملف الجديد حتى
               لا يبقى ملفًا غير مستخدم.
            */

            if (newVideo?.path) {

                await deleteOldObject(
                    newVideo.path
                );
            }


            if (newCover?.path) {

                await deleteOldObject(
                    newCover.path
                );
            }


            toast(
                error?.message ||
                "تعذر حفظ التعديلات."
            );


        } finally {

            button.disabled =
                false;

            button.textContent =
                "حفظ التغييرات";
        }
    }


    /* =====================================================
       Pin State
    ===================================================== */

    async function getPinnedState(
        reelId
    ) {

        const client =
            getSupabase();

        if (!client) {
            return false;
        }

        try {

            const {
                data,
                error
            } =
                await client
                    .from("reels")
                    .select(
                        "pinned_at"
                    )
                    .eq(
                        "id",
                        reelId
                    )
                    .eq(
                        "user_id",
                        currentUserId
                    )
                    .maybeSingle();

            if (error) {
                throw error;
            }

            return !!data?.pinned_at;

        } catch (error) {

            console.warn(
                "Pinned state error:",
                error
            );

            return false;
        }
    }


    /* =====================================================
       Pin / Unpin
    ===================================================== */

    async function pinReel(
        reelId,
        shouldUnpin = false
    ) {

        await loadCurrentUser();

        const client =
            getSupabase();

        if (
            !client ||
            !currentUserId
        ) {

            toast(
                "يجب تسجيل الدخول أولًا."
            );

            return;
        }


        confirmAction(
            shouldUnpin
                ? "إلغاء تثبيت Reel"
                : "تثبيت Reel",

            shouldUnpin
                ? "هل تريد إلغاء تثبيت هذا الـReel؟"
                : "هل تريد تثبيت هذا الـReel؟",

            shouldUnpin
                ? "نعم، إلغاء التثبيت"
                : "نعم، تثبيت",

            "#0095f6",

            async function () {

                try {

                    const {
                        error
                    } =
                        await client
                            .from("reels")
                            .update({

                                pinned_at:
                                    shouldUnpin
                                        ? null
                                        : new Date()
                                            .toISOString(),

                                updated_at:
                                    new Date()
                                        .toISOString()
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


                    updatePinButton(
                        reelId,
                        !shouldUnpin
                    );


                    toast(
                        shouldUnpin
                            ? "تم إلغاء تثبيت الـReel."
                            : "تم تثبيت الـReel."
                    );


                } catch (error) {

                    console.error(
                        "Pin error:",
                        error
                    );


                    toast(
                        error?.message ||
                        "تعذر تحديث التثبيت."
                    );
                }
            }
        );
    }


    function updatePinButton(
        reelId,
        pinned
    ) {

        const reel =
            document.querySelector(
                `.student-reel[data-id="${CSS.escape(
                    String(reelId)
                )}"]`
            );


        const button =
            reel?.querySelector(
                "[data-pin]"
            );


        if (!button) {
            return;
        }


        button.textContent =
            pinned
                ? "📍 إلغاء التثبيت"
                : "📌 تثبيت";


        button.dataset.pinned =
            pinned
                ? "true"
                : "false";
    }


    /* =====================================================
       Add Advanced Buttons
    ===================================================== */

    async function addAdvancedButtons() {

        document
            .querySelectorAll(
                ".student-reel"
            )
            .forEach(
                async function (reel) {

                    const menu =
                        reel.querySelector(
                            "[data-menu]"
                        );


                    if (!menu) {
                        return;
                    }


                    const owner =
                        !!menu.querySelector(
                            "[data-edit], [data-privacy], [data-delete]"
                        );


                    if (!owner) {
                        return;
                    }


                    const reelId =
                        getReelId(
                            reel
                        );


                    if (!reelId) {
                        return;
                    }


                    if (
                        !menu.querySelector(
                            "[data-advanced-edit]"
                        )
                    ) {

                        const button =
                            document.createElement(
                                "button"
                            );

                        button.type =
                            "button";

                        button.dataset.advancedEdit =
                            "true";

                        button.textContent =
                            "🛠️ تحرير متقدم";

                        button.style.cssText = `
                            width:100%;
                            border:0;
                            background:#fff;
                            padding:15px;
                            text-align:right;
                            cursor:pointer;
                            font-size:14px;
                            border-bottom:1px solid #eee;
                        `;

                        menu.appendChild(
                            button
                        );
                    }


                    let pinButton =
                        menu.querySelector(
                            "[data-pin]"
                        );


                    if (!pinButton) {

                        pinButton =
                            document.createElement(
                                "button"
                            );

                        pinButton.type =
                            "button";

                        pinButton.dataset.pin =
                            "true";

                        pinButton.style.cssText = `
                            width:100%;
                            border:0;
                            background:#fff;
                            padding:15px;
                            text-align:right;
                            cursor:pointer;
                            font-size:14px;
                            border-bottom:1px solid #eee;
                        `;

                        menu.appendChild(
                            pinButton
                        );
                    }


                    try {

                        const pinned =
                            await getPinnedState(
                                reelId
                            );


                        updatePinButton(
                            reelId,
                            pinned
                        );

                    } catch (error) {

                        console.warn(
                            "Pin state skipped:",
                            error
                        );
                    }

                }
            );
    }


    /* =====================================================
       Bind Buttons
    ===================================================== */

    function bindAdvancedButtons() {

        document.addEventListener(
            "click",
            function (event) {

                const edit =
                    event.target.closest(
                        ".student-reel [data-advanced-edit]"
                    );


                if (edit) {

                    event.preventDefault();
                    event.stopImmediatePropagation();


                    const reel =
                        getReel(
                            edit
                        );


                    const reelId =
                        getReelId(
                            reel
                        );


                    if (reelId) {

                        openAdvancedEdit(
                            reelId
                        );
                    }


                    return;
                }


                const pin =
                    event.target.closest(
                        ".student-reel [data-pin]"
                    );


                if (pin) {

                    event.preventDefault();
                    event.stopImmediatePropagation();


                    const reel =
                        getReel(
                            pin
                        );


                    const reelId =
                        getReelId(
                            reel
                        );


                    if (!reelId) {
                        return;
                    }


                    const currentlyPinned =
                        pin.dataset.pinned ===
                        "true";


                    pinReel(
                        reelId,
                        currentlyPinned
                    );


                    return;
                }

            },
            true
        );
    }


    /* =====================================================
       API
    ===================================================== */

    window.StudentReelsAdvanced =
        window.StudentReelsAdvanced ||
        {};


    window.StudentReelsAdvanced.edit =
        openAdvancedEdit;


    window.StudentReelsAdvanced.pin =
        pinReel;


    /* =====================================================
       Start
    ===================================================== */

    async function start() {

        await loadCurrentUser();

        await addAdvancedButtons();

        bindAdvancedButtons();


        const observer =
            new MutationObserver(
                function () {

                    addAdvancedButtons();

                }
            );


        observer.observe(
            document.body,
            {
                childList:true,
                subtree:true
            }
        );
    }


    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            start,
            {
                once:true
            }
        );

    } else {

        start();
    }


})();
