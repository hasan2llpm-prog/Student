/* =========================================================
   Student - Posts System
   منشور نصي + صورة
   نشر Reels يتم من داخل reels.js
========================================================= */

(function () {

    "use strict";

    if (window.__studentPostsLoaded) {
        return;
    }

    window.__studentPostsLoaded = true;

    let overlay = null;


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
            document.createElement("style");

        style.id =
            "student-posts-style";

        style.textContent = `

            #student-posts-overlay {
                position:fixed;
                inset:0;
                z-index:9999996;
                background:rgba(0,0,0,.42);
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
                border-bottom:1px solid #eee;
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
                font-size:20px;
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

            .student-post-textarea {
                width:100%;
                box-sizing:border-box;
                border:1px solid #ddd;
                border-radius:13px;
                padding:13px;
                outline:none;
                font-size:14px;
                background:#fff;
                min-height:150px;
                resize:vertical;
            }

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

        document.head.appendChild(style);
    }


    /* =====================================================
       إنشاء النافذة
    ===================================================== */

    function createOverlay() {

        if (overlay) {
            return;
        }

        overlay =
            document.createElement("div");

        overlay.id =
            "student-posts-overlay";

        overlay.innerHTML = `

            <div class="student-posts-window">

                <div class="student-posts-header">

                    <div
                        id="student-posts-title"
                        class="student-posts-title"
                    >
                        إضافة
                    </div>

                    <button
                        id="student-posts-close"
                        class="student-posts-close"
                        type="button"
                    >
                        ×
                    </button>

                </div>

                <div
                    id="student-posts-body"
                    class="student-posts-body"
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
       فتح نافذة الإضافة
    ===================================================== */

    function openPostCreator() {

        injectStyles();
        createOverlay();

        overlay.classList.add(
            "show"
        );

        showPostTypes();
    }


    function closePosts() {

        if (overlay) {
            overlay.classList.remove(
                "show"
            );
        }
    }


    function setTitle(title) {

        const element =
            document.getElementById(
                "student-posts-title"
            );

        if (element) {
            element.textContent =
                title;
        }
    }


    function setBody(html) {

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
       القائمة الرئيسية
       فقط نص + صورة
    ===================================================== */

    function showPostTypes() {

        setTitle(
            "إضافة"
        );

        setBody(`

            <div class="student-post-type-grid">

                <button
                    id="create-story-item"
                    class="student-post-type"
                    type="button"
                >

                    <div class="student-post-type-icon">
                        <i class="fa-regular fa-circle-play"></i>
                    </div>

                    <div>

                        <div class="student-post-type-title">
                            إضافة ستوري
                        </div>

                        <div class="student-post-type-desc">
                            صورة أو فيديو أو نص لمدة 24 ساعة
                        </div>

                    </div>

                </button>


                <button
                    id="create-reel-item"
                    class="student-post-type"
                    type="button"
                >

                    <div class="student-post-type-icon">
                        <i class="fa-solid fa-clapperboard"></i>
                    </div>

                    <div>

                        <div class="student-post-type-title">
                            نشر ريلز
                        </div>

                        <div class="student-post-type-desc">
                            اختر فيديو قصيرًا للنشر
                        </div>

                    </div>

                </button>

            </div>
        `);


        document
            .getElementById(
                "create-story-item"
            )
            ?.addEventListener(
                "click",
                function() {

                    closePosts();

                    if (
                        typeof window.openStudentStoryCreator ===
                        "function"
                    ) {

                        window.openStudentStoryCreator();
                        return;
                    }

                    console.error(
                        "Story creator is not ready"
                    );
                }
            );


        document
            .getElementById(
                "create-reel-item"
            )
            ?.addEventListener(
                "click",
                function() {

                    showReelForm();
                }
            );
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
                class="student-post-back"
                type="button"
            >
                ←
            </button>

            <form
                id="text-post-form"
                class="student-post-form"
                style="margin-top:14px;"
            >

                <textarea
                    id="text-post-content"
                    class="student-post-textarea"
                    maxlength="5000"
                    placeholder="ماذا تريد أن تقول؟"
                    required
                ></textarea>

                <button
                    id="text-post-submit"
                    class="student-post-submit"
                    type="submit"
                >
                    نشر
                </button>

                <div
                    id="text-post-message"
                    class="student-post-message"
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


        button.disabled = true;
        button.textContent =
            "جارٍ النشر...";


        try {

            const {
                data:{
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
                class="student-post-back"
                type="button"
            >
                ←
            </button>

            <form
                id="image-post-form"
                class="student-post-form"
                style="margin-top:14px;"
            >

                <label
                    class="student-post-file"
                    for="image-post-file"
                >

                    <div class="student-post-file-icon">
                        <i class="fa-regular fa-image"></i>
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
                    class="student-post-preview"
                    alt=""
                />


                <textarea
                    id="image-post-caption"
                    class="student-post-textarea"
                    maxlength="2000"
                    placeholder="اكتب وصفًا للصورة (اختياري)"
                    style="min-height:100px;"
                ></textarea>


                <button
                    id="image-post-submit"
                    class="student-post-submit"
                    type="submit"
                >
                    نشر
                </button>


                <div
                    id="image-post-message"
                    class="student-post-message"
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


        preview.src =
            URL.createObjectURL(
                file
            );

        preview.style.display =
            "block";
    }


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


        button.disabled = true;
        button.textContent =
            "جارٍ الرفع...";


        try {

            const {
                data:{
                    user
                }
            } =
                await client.auth.getUser();


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
                error:uploadError
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
                data:publicData
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
       ضغط Reel للإنترنت المتوسط والضعيف
       - يحتفظ بالملف الأصلي للجودة العالية
       - ينشئ نسخة MP4 بعرض أقصى 480px
       - يعود للملف الأصلي تلقائيًا إذا تعذر الضغط
    ===================================================== */

    let reelFFmpegLoader = null;
    let reelFFmpegInstance = null;

    function loadExternalScript(src, id) {

        const existing = document.getElementById(id);

        if (existing) {
            if (existing.dataset.loaded === "true") {
                return Promise.resolve();
            }

            return new Promise(function(resolve, reject) {
                existing.addEventListener("load", resolve, { once:true });
                existing.addEventListener("error", reject, { once:true });
            });
        }

        return new Promise(function(resolve, reject) {
            const script = document.createElement("script");
            script.id = id;
            script.src = src;
            script.async = true;
            script.crossOrigin = "anonymous";

            script.addEventListener("load", function() {
                script.dataset.loaded = "true";
                resolve();
            }, { once:true });

            script.addEventListener("error", function() {
                reject(new Error("تعذر تحميل أداة ضغط الفيديو."));
            }, { once:true });

            document.head.appendChild(script);
        });
    }

    async function getReelFFmpeg(onProgress) {

        if (reelFFmpegInstance) {
            if (typeof reelFFmpegInstance.setProgress === "function") {
                reelFFmpegInstance.setProgress(function({ ratio }) {
                    onProgress?.(Math.max(0, Math.min(1, Number(ratio || 0))));
                });
            }
            return reelFFmpegInstance;
        }

        if (!reelFFmpegLoader) {
            reelFFmpegLoader = (async function() {
                await loadExternalScript(
                    "https://unpkg.com/@ffmpeg/ffmpeg@0.11.6/dist/ffmpeg.min.js",
                    "student-ffmpeg-script"
                );

                if (!window.FFmpeg?.createFFmpeg || !window.FFmpeg?.fetchFile) {
                    throw new Error("أداة ضغط الفيديو غير مدعومة على هذا الجهاز.");
                }

                const instance = window.FFmpeg.createFFmpeg({
                    log: false,
                    corePath: "https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js"
                });

                instance.setProgress(function({ ratio }) {
                    onProgress?.(Math.max(0, Math.min(1, Number(ratio || 0))));
                });

                await instance.load();
                reelFFmpegInstance = instance;
                return instance;
            })();
        }

        try {
            return await reelFFmpegLoader;
        } catch (error) {
            reelFFmpegLoader = null;
            throw error;
        }
    }

    async function createMediumReelVersion(file, onProgress) {

        const ffmpeg = await getReelFFmpeg(onProgress);
        const inputExtension = getFileExtension(file.name) || "mp4";
        const token = crypto.randomUUID();
        const inputName = `reel-input-${token}.${inputExtension}`;
        const outputName = `reel-medium-${token}.mp4`;

        try {
            ffmpeg.FS("writeFile", inputName, await window.FFmpeg.fetchFile(file));

            await ffmpeg.run(
                "-i", inputName,
                "-vf", "scale=if(gt(iw\\,480)\\,480\\,iw):-2",
                "-c:v", "libx264",
                "-preset", "ultrafast",
                "-crf", "30",
                "-maxrate", "700k",
                "-bufsize", "1400k",
                "-pix_fmt", "yuv420p",
                "-movflags", "+faststart",
                "-c:a", "aac",
                "-b:a", "64k",
                "-ac", "2",
                outputName
            );

            const data = ffmpeg.FS("readFile", outputName);

            return new File(
                [data.buffer],
                `${Date.now()}-medium.mp4`,
                { type:"video/mp4" }
            );

        } finally {
            try { ffmpeg.FS("unlink", inputName); } catch (_) {}
            try { ffmpeg.FS("unlink", outputName); } catch (_) {}
        }
    }

    async function uploadReelFile(client, bucket, path, file) {

        const { error } = await client.storage
            .from(bucket)
            .upload(path, file, {
                cacheControl:"3600",
                upsert:false,
                contentType:file.type || "video/mp4"
            });

        if (error) throw error;

        const { data } = client.storage
            .from(bucket)
            .getPublicUrl(path);

        if (!data?.publicUrl) {
            throw new Error("تعذر الحصول على رابط الفيديو.");
        }

        return data.publicUrl;
    }

    /* =====================================================
       Reels
       هذه الدالة لا تظهر في قائمة ➕
       ويتم استدعاؤها من reels.js
    ===================================================== */

    function showReelForm() {

        injectStyles();
        createOverlay();

        overlay.classList.add(
            "show"
        );


        setTitle(
            "نشر Reel"
        );


        setBody(`

            <button
                id="reel-back"
                class="student-post-back"
                type="button"
            >
                ←
            </button>


            <form
                id="reel-form"
                class="student-post-form"
                style="margin-top:14px;"
            >

                <label
                    class="student-post-file"
                    for="reel-file"
                >

                    <div class="student-post-file-icon">
                        🎬
                    </div>

                    <strong>
                        اختر فيديو
                    </strong>

                    <div style="
                        margin-top:5px;
                        font-size:12px;
                        color:#888;
                    ">
                        فيديو قصير
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
                    class="student-reels-video-preview"
                    controls
                    playsinline
                ></video>


                <textarea
                    id="reel-caption"
                    class="student-post-textarea"
                    maxlength="2000"
                    placeholder="اكتب وصف الـReel (اختياري)"
                    style="min-height:100px;"
                ></textarea>


                <button
                    id="reel-submit"
                    class="student-post-submit"
                    type="submit"
                >
                    نشر Reel
                </button>


                <div
                    id="reel-message"
                    class="student-post-message"
                ></div>

            </form>
        `);


        document
            .getElementById(
                "reel-back"
            )
            ?.addEventListener(
                "click",
                function() {

                    closePosts();

                    if (
                        typeof window.openStudentReels ===
                        "function"
                    ) {

                        window.openStudentReels(
                            0
                        );
                    }
                }
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


        preview.src =
            URL.createObjectURL(
                file
            );

        preview.style.display =
            "block";
    }


    async function submitReel(
        event
    ) {

        event.preventDefault();

        const client = getSupabase();

        if (!client) {
            showPostMessage(
                "reel-message",
                "الخدمة غير متاحة حاليًا.",
                true
            );
            return;
        }

        const file = document
            .getElementById("reel-file")
            ?.files?.[0];

        const caption = document
            .getElementById("reel-caption")
            ?.value
            .trim();

        const button = document.getElementById("reel-submit");

        if (!file) {
            showPostMessage("reel-message", "اختر فيديو أولًا.", true);
            return;
        }

        const MAX_REEL_SIZE = 30 * 1024 * 1024;

        if (!file.type.startsWith("video/")) {
            showPostMessage("reel-message", "الملف المختار ليس فيديو صالحًا.", true);
            return;
        }

        if (file.size > MAX_REEL_SIZE) {
            showPostMessage(
                "reel-message",
                "حجم الفيديو كبير. اختر فيديو أقل من 30MB لتشغيل أسرع.",
                true
            );
            return;
        }

        button.disabled = true;

        let uploadedPaths = [];

        try {
            const { data:{ user } } = await client.auth.getUser();

            if (!user) {
                throw new Error("يجب تسجيل الدخول أولًا.");
            }

            let mediumFile = null;

            try {
                button.textContent = "جارٍ تجهيز جودة سريعة 0%";

                mediumFile = await createMediumReelVersion(
                    file,
                    function(ratio) {
                        const percent = Math.round(ratio * 100);
                        button.textContent = `جارٍ تجهيز جودة سريعة ${percent}%`;
                        showPostMessage(
                            "reel-message",
                            "يتم إنشاء نسخة أخف للإنترنت المتوسط والضعيف. لا تغلق الصفحة.",
                            false
                        );
                    }
                );
            } catch (compressionError) {
                console.warn("Reel compression fallback:", compressionError);
                mediumFile = null;
                showPostMessage(
                    "reel-message",
                    "تعذر الضغط على هذا الجهاز؛ سيُنشر الفيديو بالجودة الأصلية.",
                    false
                );
            }

            const bucket = "post-media";
            const stamp = Date.now();
            const id = crypto.randomUUID();
            const originalExtension = getFileExtension(file.name) || "mp4";
            const highPath = `${user.id}/reels/${stamp}-${id}-high.${originalExtension}`;

            button.textContent = "جارٍ رفع الجودة العالية...";
            const highURL = await uploadReelFile(client, bucket, highPath, file);
            uploadedPaths.push(highPath);

            let mediumURL = highURL;

            if (mediumFile && mediumFile.size > 0) {
                const mediumPath = `${user.id}/reels/${stamp}-${id}-medium.mp4`;
                button.textContent = "جارٍ رفع الجودة السريعة...";
                mediumURL = await uploadReelFile(client, bucket, mediumPath, mediumFile);
                uploadedPaths.push(mediumPath);
            }

            button.textContent = "جارٍ حفظ الـReel...";

            const { error } = await client
                .from("reels")
                .insert({
                    user_id:user.id,
                    video_url:mediumURL,
                    video_url_low:mediumURL,
                    video_url_medium:mediumURL,
                    video_url_high:highURL,
                    caption:caption || null
                });

            if (error) throw error;

            showPostMessage(
                "reel-message",
                mediumFile
                    ? "تم نشر الـReel بجودتين ويتغير التشغيل حسب سرعة الإنترنت."
                    : "تم نشر الـReel بنجاح.",
                false
            );

            setTimeout(async function() {
                closePosts();

                if (typeof window.openStudentReels === "function") {
                    await window.openStudentReels(0);
                }
            }, 700);

        } catch (error) {
            console.error("Reel error:", error);

            if (uploadedPaths.length) {
                try {
                    await client.storage
                        .from("post-media")
                        .remove(uploadedPaths);
                } catch (_) {}
            }

            showPostMessage(
                "reel-message",
                error?.message || "تعذر نشر الـReel.",
                true
            );

        } finally {
            button.disabled = false;
            button.textContent = "نشر Reel";
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
       امتداد الملف
    ===================================================== */

    function getFileExtension(
        filename
    ) {

        const parts =
            String(
                filename || ""
            ).split(".");


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
       زر ➕
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
            function(event) {

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

    window.openStudentReelCreator =
        showReelForm;

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
(function () {

    if (
        document.querySelector(
            'script[data-student-reels="true"]'
        )
    ) {
        return;
    }


    const script =
        document.createElement(
            "script"
        );


    script.src =
        "reels.js";

    script.async =
        true;

    script.dataset.studentReels =
        "true";


    script.onload =
        function() {

            console.log(
                "Student Reels loaded."
            );
        };


    script.onerror =
        function() {

            console.error(
                "تعذر تحميل reels.js"
            );
        };


    document.body.appendChild(
        script
    );

})();
