/* =========================================================
   Student - Posts System
   منشور نصي + صورة + Reels
========================================================= */

(function () {

    "use strict";


    if (
        window.__studentPostsLoaded
    ) {
        return;
    }


    window.__studentPostsLoaded =
        true;


    let overlay = null;


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


    /* =====================================================
       حماية
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
                "student-posts-style"
            )
        ) {

            return;
        }


        const style =
            document.createElement(
                "style"
            );


        style.id =
            "student-posts-style";


        style.textContent = `

            #student-posts-overlay {
                position:fixed;
                inset:0;
                z-index:9999996;
                background:
                    rgba(0,0,0,.42);
                display:none;
                align-items:center;
                justify-content:center;
                padding:15px;
                box-sizing:border-box;
                direction:rtl;
            }

            #student-posts-overlay.show {
                display:flex;
            }

            .student-posts-window {
                width:100%;
                max-width:520px;
                max-height:92vh;
                overflow:hidden;
                background:#fff;
                border-radius:24px;
                box-shadow:
                    0 20px 70px
                    rgba(0,0,0,.28);
                display:flex;
                flex-direction:column;
            }

            .student-posts-header {
                display:flex;
                align-items:center;
                gap:12px;
                padding:16px;
                border-bottom:
                    1px solid #eee;
                flex-shrink:0;
            }

            .student-posts-title {
                flex:1;
                font-size:20px;
                font-weight:800;
                color:#222;
            }

            .student-posts-close {
                width:40px;
                height:40px;
                border:none;
                border-radius:50%;
                background:#f1f3f5;
                color:#333;
                cursor:pointer;
            }

            .student-posts-body {
                overflow-y:auto;
                padding:16px;
            }

            .student-post-type-grid {
                display:grid;
                grid-template-columns:1fr;
                gap:10px;
            }

            .student-post-type {
                width:100%;
                border:none;
                background:#f7f8fa;
                border-radius:17px;
                padding:17px;
                display:flex;
                align-items:center;
                gap:13px;
                direction:rtl;
                text-align:right;
                cursor:pointer;
            }

            .student-post-type:hover {
                background:#eef3f7;
            }

            .student-post-type-icon {
                width:48px;
                height:48px;
                border-radius:14px;
                background:#eaf5ff;
                color:#0095f6;
                display:flex;
                align-items:center;
                justify-content:center;
                font-size:20px;
                flex-shrink:0;
            }

            .student-post-type-title {
                font-size:15px;
                font-weight:800;
                color:#222;
            }

            .student-post-type-desc {
                margin-top:4px;
                font-size:12px;
                color:#888;
            }

            .student-post-form {
                display:flex;
                flex-direction:column;
                gap:12px;
            }

            .student-post-input,
            .student-post-textarea {
                width:100%;
                box-sizing:border-box;
                border:1px solid #ddd;
                border-radius:13px;
                padding:13px;
                outline:none;
                font-size:14px;
                background:#fff;
            }

            .student-post-textarea {
                min-height:150px;
                resize:vertical;
            }

            .student-post-input:focus,
            .student-post-textarea:focus {
                border-color:#0095f6;
                box-shadow:
                    0 0 0 3px
                    rgba(0,149,246,.08);
            }

            .student-post-file {
                width:100%;
                box-sizing:border-box;
                border:2px dashed #cfd6dc;
                border-radius:16px;
                padding:25px 15px;
                text-align:center;
                cursor:pointer;
                background:#fafbfc;
            }

            .student-post-file-icon {
                font-size:35px;
                color:#0095f6;
                margin-bottom:9px;
            }

            .student-post-preview {
                width:100%;
                max-height:320px;
                object-fit:contain;
                border-radius:15px;
                background:#f3f4f6;
                display:none;
            }

            .student-post-submit {
                border:none;
                background:#0095f6;
                color:#fff;
                padding:14px;
                border-radius:13px;
                cursor:pointer;
                font-size:15px;
                font-weight:700;
            }

            .student-post-submit:disabled {
                opacity:.6;
                cursor:not-allowed;
            }

            .student-post-message {
                min-height:22px;
                text-align:center;
                font-size:13px;
                line-height:1.7;
            }

            .student-reels-create-box {
                background:
                    linear-gradient(
                        145deg,
                        #111,
                        #2a2a2a
                    );
                color:#fff;
                border-radius:18px;
                padding:20px;
            }

            .student-post-back {
                border:none;
                background:#f1f3f5;
                width:40px;
                height:40px;
                border-radius:50%;
                cursor:pointer;
            }

            .student-reels-video-preview {
                width:100%;
                max-height:380px;
                border-radius:16px;
                background:#000;
                display:none;
                margin-top:10px;
            }

            @media (max-width:480px) {

                #student-posts-overlay {
                    padding:0;
                    align-items:stretch;
                }

                .student-posts-window {
                    max-width:none;
                    max-height:none;
                    height:100%;
                    border-radius:0;
                }
            }
        `;


        document.head.appendChild(
            style
        );
    }


    /* =====================================================
       إنشاء النافذة
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
            "student-posts-overlay";


        overlay.innerHTML = `

            <div class="
                student-posts-window
            ">

                <div class="
                    student-posts-header
                ">

                    <div
                        id="student-posts-title"
                        class="
                            student-posts-title
                        "
                    >
                        إضافة
                    </div>


                    <button
                        id="student-posts-close"
                        class="
                            student-posts-close
                        "
                        type="button"
                    >
                        <i class="
                            fa-solid
                            fa-xmark
                        "></i>
                    </button>

                </div>


                <div
                    id="student-posts-body"
                    class="
                        student-posts-body
                    "
                ></div>

            </div>
        `;


        document.body.appendChild(
            overlay
        );


        document
            .getElementById(
                "student-posts-close"
            )
            ?.addEventListener(
                "click",
                closePosts
            );
    }


    /* =====================================================
       فتح
    ===================================================== */

    function openPostCreator() {

        injectStyles();

        createOverlay();

        overlay.classList.add(
            "show"
        );

        showPostTypes();
    }


    /* =====================================================
       إغلاق
    ===================================================== */

    function closePosts() {

        if (overlay) {

            overlay.classList.remove(
                "show"
            );
        }
    }


    /* =====================================================
       العنوان والمحتوى
    ===================================================== */

    function setTitle(
        title
    ) {

        const element =
            document.getElementById(
                "student-posts-title"
            );


        if (element) {

            element.textContent =
                title;
        }
    }


    function setBody(
        html
    ) {

        const body =
            document.getElementById(
                "student-posts-body"
            );


        if (body) {

            body.innerHTML =
                html;
        }
    }


    /* =====================================================
       الخيارات الثلاثة
    ===================================================== */

    function showPostTypes() {

        setTitle(
            "إضافة"
        );


        setBody(`

            <div class="
                student-post-type-grid
            ">

                <button
                    id="create-text-post"
                    class="student-post-type"
                    type="button"
                >

                    <div class="
                        student-post-type-icon
                    ">
                        <i class="
                            fa-solid
                            fa-pen
                        "></i>
                    </div>

                    <div>

                        <div class="
                            student-post-type-title
                        ">
                            منشور نصي
                        </div>

                        <div class="
                            student-post-type-desc
                        ">
                            اكتب أفكارك أو رأيك
                        </div>

                    </div>

                </button>


                <button
                    id="create-image-post"
                    class="student-post-type"
                    type="button"
                >

                    <div class="
                        student-post-type-icon
                    ">
                        <i class="
                            fa-regular
                            fa-image
                        "></i>
                    </div>

                    <div>

                        <div class="
                            student-post-type-title
                        ">
                            صورة
                        </div>

                        <div class="
                            student-post-type-desc
                        ">
                            انشر صورة مع وصف اختياري
                        </div>

                    </div>

                </button>


                <button
                    id="create-reel-post"
                    class="student-post-type"
                    type="button"
                >

                    <div class="
                        student-post-type-icon
                    ">
                        <i class="
                            fa-solid
                            fa-clapperboard
                        "></i>
                    </div>

                    <div>

                        <div class="
                            student-post-type-title
                        ">
                            Reels
                        </div>

                        <div class="
                            student-post-type-desc
                        ">
                            انشر فيديو قصير
                        </div>

                    </div>

                </button>

            </div>
        `);


        document
            .getElementById(
                "create-text-post"
            )
            ?.addEventListener(
                "click",
                showTextPostForm
            );


        document
            .getElementById(
                "create-image-post"
            )
            ?.addEventListener(
                "click",
                showImagePostForm
            );


        document
            .getElementById(
                "create-reel-post"
            )
            ?.addEventListener(
                "click",
                showReelForm
            );
    }


    function backToTypes() {

        showPostTypes();
    }


    /* =====================================================
       منشور نصي
    ===================================================== */

    function showTextPostForm() {

        setTitle(
            "منشور نصي"
        );


        setBody(`

            <button
                id="text-post-back"
                class="
                    student-post-back
                "
                type="button"
            >
                <i class="
                    fa-solid
                    fa-arrow-right
                "></i>
            </button>


            <form
                id="text-post-form"
                class="
                    student-post-form
                "
                style="margin-top:14px;"
            >

                <textarea
                    id="text-post-content"
                    class="
                        student-post-textarea
                    "
                    maxlength="5000"
                    placeholder="ماذا تريد أن تقول؟"
                    required
                ></textarea>


                <button
                    id="text-post-submit"
                    class="
                        student-post-submit
                    "
                    type="submit"
                >
                    نشر
                </button>


                <div
                    id="text-post-message"
                    class="
                        student-post-message
                    "
                ></div>

            </form>
        `);


        document
            .getElementById(
                "text-post-back"
            )
            ?.addEventListener(
                "click",
                backToTypes
            );


        document
            .getElementById(
                "text-post-form"
            )
            ?.addEventListener(
                "submit",
                submitTextPost
            );
    }


    async function submitTextPost(
        event
    ) {

        event.preventDefault();


        const client =
            getSupabase();


        if (!client) {

            showPostMessage(
                "text-post-message",
                "الخدمة غير متاحة حاليًا.",
                true
            );

            return;
        }


        const content =
            document
                .getElementById(
                    "text-post-content"
                )
                ?.value
                .trim();


        if (!content) {

            showPostMessage(
                "text-post-message",
                "اكتب محتوى المنشور أولًا.",
                true
            );

            return;
        }


        const button =
            document.getElementById(
                "text-post-submit"
            );


        button.disabled =
            true;


        button.textContent =
            "جارٍ النشر...";


        try {

            const {
                data: {
                    user
                }
            } =
                await client.auth.getUser();


            if (!user) {

                throw new Error(
                    "يجب تسجيل الدخول أولًا."
                );
            }


            const {
                error
            } =
                await client
                    .from("posts")
                    .insert({

                        user_id:
                            user.id,

                        post_type:
                            "text",

                        content:
                            content
                    });


            if (error) {
                throw error;
            }


            showPostMessage(
                "text-post-message",
                "تم نشر المنشور بنجاح.",
                false
            );


            setTimeout(
                closePosts,
                700
            );


        } catch (error) {

            console.error(
                "Text post error:",
                error
            );


            showPostMessage(
                "text-post-message",
                error?.message ||
                "تعذر نشر المنشور.",
                true
            );


        } finally {

            button.disabled =
                false;

            button.textContent =
                "نشر";
        }
    }


    /* =====================================================
       الصورة
    ===================================================== */

    function showImagePostForm() {

        setTitle(
            "نشر صورة"
        );


        setBody(`

            <button
                id="image-post-back"
                class="
                    student-post-back
                "
                type="button"
            >
                <i class="
                    fa-solid
                    fa-arrow-right
                "></i>
            </button>


            <form
                id="image-post-form"
                class="
                    student-post-form
                "
                style="
                    margin-top:14px;
                "
            >

                <label
                    class="
                        student-post-file
                    "
                    for="image-post-file"
                >

                    <div class="
                        student-post-file-icon
                    ">
                        <i class="
                            fa-regular
                            fa-image
                        "></i>
                    </div>

                    <strong>
                        اختر صورة
                    </strong>

                    <div style="
                        margin-top:5px;
                        font-size:12px;
                        color:#888;
                    ">
                        JPG / PNG / WEBP
                    </div>

                </label>


                <input
                    id="image-post-file"
                    type="file"
                    accept="image/*"
                    hidden
                    required
                />


                <img
                    id="image-post-preview"
                    class="
                        student-post-preview
                    "
                    alt="معاينة الصورة"
                />


                <textarea
                    id="image-post-caption"
                    class="
                        student-post-textarea
                    "
                    maxlength="2000"
                    placeholder="اكتب وصفًا للصورة (اختياري)"
                    style="
                        min-height:100px;
                    "
                ></textarea>


                <button
                    id="image-post-submit"
                    class="
                        student-post-submit
                    "
                    type="submit"
                >
                    نشر
                </button>


                <div
                    id="image-post-message"
                    class="
                        student-post-message
                    "
                ></div>

            </form>
        `);


        document
            .getElementById(
                "image-post-back"
            )
            ?.addEventListener(
                "click",
                backToTypes
            );


        document
            .getElementById(
                "image-post-file"
            )
            ?.addEventListener(
                "change",
                previewImage
            );


        document
            .getElementById(
                "image-post-form"
            )
            ?.addEventListener(
                "submit",
                submitImagePost
            );
    }


    function previewImage(
        event
    ) {

        const file =
            event.target.files?.[0];


        const preview =
            document.getElementById(
                "image-post-preview"
            );


        if (
            !file ||
            !preview
        ) {
            return;
        }


        if (
            !file.type.startsWith(
                "image/"
            )
        ) {
            return;
        }


        const url =
            URL.createObjectURL(
                file
            );


        preview.src =
            url;


        preview.style.display =
            "block";
    }


    /* =====================================================
       حفظ الصورة
    ===================================================== */

    async function submitImagePost(
        event
    ) {

        event.preventDefault();


        const client =
            getSupabase();


        if (!client) {

            showPostMessage(
                "image-post-message",
                "الخدمة غير متاحة حاليًا.",
                true
            );

            return;
        }


        const file =
            document
                .getElementById(
                    "image-post-file"
                )
                ?.files?.[0];


        const caption =
            document
                .getElementById(
                    "image-post-caption"
                )
                ?.value
                .trim();


        const button =
            document.getElementById(
                "image-post-submit"
            );


        if (!file) {

            showPostMessage(
                "image-post-message",
                "اختر صورة أولًا.",
                true
            );

            return;
        }


        if (
            !file.type.startsWith(
                "image/"
            )
        ) {

            showPostMessage(
                "image-post-message",
                "الملف المختار ليس صورة.",
                true
            );

            return;
        }


        button.disabled =
            true;


        button.textContent =
            "جارٍ الرفع...";


        try {

            const {
                data: {
                    user
                }
            } =
                await client.auth
                    .getUser();


            if (!user) {

                throw new Error(
                    "يجب تسجيل الدخول أولًا."
                );
            }


            const extension =
                getFileExtension(
                    file.name
                );


            const filePath =
                `${user.id}/${Date.now()}-${crypto.randomUUID()}.${extension}`;


            const {
                error:
                    uploadError
            } =
                await client.storage
                    .from(
                        "post-media"
                    )
                    .upload(
                        filePath,
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


            if (uploadError) {
                throw uploadError;
            }


            const {
                data:
                    publicData
            } =
                client.storage
                    .from(
                        "post-media"
                    )
                    .getPublicUrl(
                        filePath
                    );


            const mediaURL =
                publicData?.publicUrl;


            if (!mediaURL) {

                throw new Error(
                    "تعذر الحصول على رابط الصورة."
                );
            }


            const {
                error
            } =
                await client
                    .from("posts")
                    .insert({

                        user_id:
                            user.id,

                        post_type:
                            "image",

                        content:
                            caption ||
                            null,

                        media_url:
                            mediaURL
                    });


            if (error) {
                throw error;
            }


            showPostMessage(
                "image-post-message",
                "تم نشر الصورة بنجاح.",
                false
            );


            setTimeout(
                closePosts,
                700
            );


        } catch (error) {

            console.error(
                "Image post error:",
                error
            );


            showPostMessage(
                "image-post-message",
                error?.message ||
                "تعذر نشر الصورة.",
                true
            );


        } finally {

            button.disabled =
                false;

            button.textContent =
                "نشر";
        }
    }


    /* =====================================================
       Reels
    ===================================================== */

    function showReelForm() {

        setTitle(
            "نشر Reels"
        );


        setBody(`

            <button
                id="reel-back"
                class="
                    student-post-back
                "
                type="button"
            >
                <i class="
                    fa-solid
                    fa-arrow-right
                "></i>
            </button>


            <form
                id="reel-form"
                class="
                    student-post-form
                    student-reels-create-box
                "
                style="
                    margin-top:14px;
                "
            >

                <label
                    class="
                        student-post-file
                    "
                    for="reel-file"
                    style="
                        background:#181818;
                        border-color:#444;
                        color:#fff;
                    "
                >

                    <div class="
                        student-post-file-icon
                    ">
                        <i class="
                            fa-solid
                            fa-video
                        "></i>
                    </div>

                    <strong>
                        اختر فيديو
                    </strong>

                    <div style="
                        margin-top:5px;
                        font-size:12px;
                        color:#aaa;
                    ">
                        Reels قصيرة
                    </div>

                </label>


                <input
                    id="reel-file"
                    type="file"
                    accept="video/*"
                    hidden
                    required
                />


                <video
                    id="reel-preview"
                    class="
                        student-reels-video-preview
                    "
                    controls
                    playsinline
                ></video>


                <textarea
                    id="reel-caption"
                    class="
                        student-post-textarea
                    "
                    maxlength="2000"
                    placeholder="اكتب وصف الريل (اختياري)"
                    style="
                        min-height:100px;
                        background:#222;
                        color:#fff;
                        border-color:#444;
                    "
                ></textarea>


                <button
                    id="reel-submit"
                    class="
                        student-post-submit
                    "
                    type="submit"
                >
                    نشر Reels
                </button>


                <div
                    id="reel-message"
                    class="
                        student-post-message
                    "
                ></div>

            </form>
        `);


        document
            .getElementById(
                "reel-back"
            )
            ?.addEventListener(
                "click",
                backToTypes
            );


        document
            .getElementById(
                "reel-file"
            )
            ?.addEventListener(
                "change",
                previewReel
            );


        document
            .getElementById(
                "reel-form"
            )
            ?.addEventListener(
                "submit",
                submitReel
            );
    }


    function previewReel(
        event
    ) {

        const file =
            event.target.files?.[0];


        const preview =
            document.getElementById(
                "reel-preview"
            );


        if (
            !file ||
            !preview
        ) {
            return;
        }


        if (
            !file.type.startsWith(
                "video/"
            )
        ) {
            return;
        }


        const url =
            URL.createObjectURL(
                file
            );


        preview.src =
            url;


        preview.style.display =
            "block";
    }


    /* =====================================================
       حفظ Reels
    ===================================================== */

    async function submitReel(
        event
    ) {

        event.preventDefault();


        const client =
            getSupabase();


        if (!client) {

            showPostMessage(
                "reel-message",
                "الخدمة غير متاحة حاليًا.",
                true
            );

            return;
        }


        const file =
            document
                .getElementById(
                    "reel-file"
                )
                ?.files?.[0];


        const caption =
            document
                .getElementById(
                    "reel-caption"
                )
                ?.value
                .trim();


        const button =
            document.getElementById(
                "reel-submit"
            );


        if (!file) {

            showPostMessage(
                "reel-message",
                "اختر فيديو أولًا.",
                true
            );

            return;
        }


        if (
            !file.type.startsWith(
                "video/"
            )
        ) {

            showPostMessage(
                "reel-message",
                "الملف المختار ليس فيديو.",
                true
            );

            return;
        }


        button.disabled =
            true;


        button.textContent =
            "جارٍ رفع الفيديو...";


        try {

            const {
                data: {
                    user
                }
            } =
                await client.auth
                    .getUser();


            if (!user) {

                throw new Error(
                    "يجب تسجيل الدخول أولًا."
                );
            }


            const extension =
                getFileExtension(
                    file.name
                );


            const filePath =
                `${user.id}/reels/${Date.now()}-${crypto.randomUUID()}.${extension}`;


            const {
                error:
                    uploadError
            } =
                await client.storage
                    .from(
                        "post-media"
                    )
                    .upload(
                        filePath,
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


            if (
                uploadError
            ) {
                throw uploadError;
            }


            const {
                data:
                    publicData
            } =
                client.storage
                    .from(
                        "post-media"
                    )
                    .getPublicUrl(
                        filePath
                    );


            const videoURL =
                publicData?.publicUrl;


            if (!videoURL) {

                throw new Error(
                    "تعذر الحصول على رابط الفيديو."
                );
            }


            const {
                error
            } =
                await client
                    .from("reels")
                    .insert({

                        user_id:
                            user.id,

                        video_url:
                            videoURL,

                        caption:
                            caption ||
                            null
                    });


            if (error) {
                throw error;
            }


            showPostMessage(
                "reel-message",
                "تم نشر الـReels بنجاح.",
                false
            );


            setTimeout(
                closePosts,
                700
            );


        } catch (error) {

            console.error(
                "Reel error:",
                error
            );


            showPostMessage(
                "reel-message",
                error?.message ||
                "تعذر نشر الـReels.",
                true
            );


        } finally {

            button.disabled =
                false;

            button.textContent =
                "نشر Reels";
        }
    }


    /* =====================================================
       رسائل
    ===================================================== */

    function showPostMessage(
        elementId,
        message,
        isError
    ) {

        const element =
            document.getElementById(
                elementId
            );


        if (!element) {
            return;
        }


        element.style.color =
            isError
                ? "#d93025"
                : "#16803c";


        element.textContent =
            message;
    }


    /* =====================================================
       امتداد
    ===================================================== */

    function getFileExtension(
        filename
    ) {

        const parts =
            String(
                filename || ""
            )
            .split(".");


        return (

            parts.length > 1
                ? parts.pop()
                : "bin"

        )
            .toLowerCase()

            .replace(
                /[^a-z0-9]/g,
                ""
            ) || "bin";
    }


    /* =====================================================
       التقاط زر ➕
    ===================================================== */

    function bindAddButton() {

        const nav =
            document.querySelector(
                "nav"
            );


        if (!nav) {
            return;
        }


        if (
            nav.dataset.studentPostsBound ===
            "true"
        ) {
            return;
        }


        nav.dataset.studentPostsBound =
            "true";


        nav.addEventListener(
            "click",
            function (event) {

                const link =
                    event.target.closest(
                        "a"
                    );


                if (!link) {
                    return;
                }


                const links =
                    Array.from(
                        nav.querySelectorAll(
                            "a"
                        )
                    );


                const index =
                    links.indexOf(
                        link
                    );


                /*
                   0 = الرئيسية
                   1 = البحث
                   2 = الإضافة
                   3 = الرسائل
                   4 = الملف الشخصي
                */

                if (
                    index !== 2
                ) {
                    return;
                }


                event.preventDefault();

                event.stopImmediatePropagation();


                openPostCreator();

            },
            true
        );
    }


    /* =====================================================
       API
    ===================================================== */

    window.openStudentPostCreator =
        openPostCreator;


    window.closeStudentPostCreator =
        closePosts;


    /* =====================================================
       تشغيل
    ===================================================== */

    injectStyles();


    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            bindAddButton
        );

    } else {

        bindAddButton();
    }

})();
