/* =========================================================
   Student - Reel Publisher
   ناشر ريلز خفيف ومستقل
========================================================= */

(function () {
    "use strict";

    if (window.__studentReelPublisherLoaded) return;
    window.__studentReelPublisherLoaded = true;

    const MAX_REEL_SIZE = 30 * 1024 * 1024;
    const MAX_REEL_DURATION = 90;

    let overlay = null;
    let creatorHistoryActive = false;
    let closingFromHistory = false;
    let selectedObjectUrl = "";

    function db() {
        if (typeof supabaseClient !== "undefined" && supabaseClient) {
            return supabaseClient;
        }
        return window.supabaseClient || null;
    }

    function randomId() {
        if (window.crypto?.randomUUID) return window.crypto.randomUUID();
        return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    function fileExtension(name) {
        const match = String(name || "").toLowerCase().match(/\.([a-z0-9]{2,8})$/);
        return match ? match[1] : "mp4";
    }

    function injectStyles() {
        if (document.getElementById("student-reel-publisher-style")) return;

        const style = document.createElement("style");
        style.id = "student-reel-publisher-style";
        style.textContent = `
            #student-reel-publisher {
                position:fixed;
                inset:0;
                z-index:9999998;
                display:none;
                align-items:center;
                justify-content:center;
                padding:14px;
                background:rgba(0,0,0,.48);
                direction:rtl;
                box-sizing:border-box;
            }
            #student-reel-publisher.show { display:flex; }
            .student-reel-publisher-window {
                width:100%;
                max-width:520px;
                max-height:94vh;
                display:flex;
                flex-direction:column;
                overflow:hidden;
                background:#fff;
                border-radius:22px;
                box-shadow:0 22px 70px rgba(0,0,0,.28);
            }
            .student-reel-publisher-header {
                min-height:66px;
                display:grid;
                grid-template-columns:46px 1fr 46px;
                align-items:center;
                gap:10px;
                padding:10px 14px;
                border-bottom:1px solid #eceff2;
                background:#fff;
                flex-shrink:0;
            }
            .student-reel-publisher-title {
                text-align:center;
                font-size:19px;
                font-weight:800;
                color:#1f2937;
            }
            .student-reel-publisher-close {
                grid-column:3;
                width:42px;
                height:42px;
                border:0;
                border-radius:50%;
                background:#f1f3f5;
                color:#222;
                font-size:22px;
                cursor:pointer;
                touch-action:manipulation;
            }
            .student-reel-publisher-spacer { grid-column:1; }
            .student-reel-publisher-body {
                flex:1;
                overflow-y:auto;
                padding:16px;
                background:#fff;
            }
            .student-reel-form {
                display:flex;
                flex-direction:column;
                gap:14px;
            }
            .student-reel-file {
                width:100%;
                min-height:128px;
                display:flex;
                flex-direction:column;
                align-items:center;
                justify-content:center;
                gap:7px;
                border:2px dashed #cbd5e1;
                border-radius:18px;
                background:#f8fafc;
                color:#334155;
                cursor:pointer;
                box-sizing:border-box;
                text-align:center;
                padding:18px;
            }
            .student-reel-file i { font-size:34px; color:#0095f6; }
            .student-reel-file small { color:#7b8794; line-height:1.6; }
            .student-reel-preview {
                width:100%;
                max-height:380px;
                display:none;
                object-fit:contain;
                border-radius:16px;
                background:#000;
            }
            .student-reel-caption {
                width:100%;
                min-height:94px;
                resize:vertical;
                border:1px solid #d9dee5;
                border-radius:14px;
                padding:13px;
                outline:none;
                font-size:14px;
                box-sizing:border-box;
                background:#fff;
            }
            .student-reel-caption:focus {
                border-color:#0095f6;
                box-shadow:0 0 0 3px rgba(0,149,246,.09);
            }
            .student-reel-submit {
                width:100%;
                min-height:48px;
                border:0;
                border-radius:14px;
                background:#0095f6;
                color:#fff;
                font-size:16px;
                font-weight:800;
                cursor:pointer;
                touch-action:manipulation;
            }
            .student-reel-submit:disabled { opacity:.58; cursor:not-allowed; }
            .student-reel-message {
                min-height:24px;
                text-align:center;
                font-size:13px;
                line-height:1.7;
                color:#5f6b76;
            }
            .student-reel-message.error { color:#c62828; }
            @media (max-width:560px) {
                #student-reel-publisher { padding:0; align-items:stretch; }
                .student-reel-publisher-window {
                    max-width:none;
                    max-height:none;
                    height:100%;
                    border-radius:0;
                }
            }
        `;
        document.head.appendChild(style);
    }

    function createOverlay() {
        if (overlay) return;

        overlay = document.createElement("div");
        overlay.id = "student-reel-publisher";
        overlay.setAttribute("aria-hidden", "true");
        overlay.innerHTML = `
            <div class="student-reel-publisher-window" role="dialog" aria-modal="true" aria-labelledby="student-reel-publisher-title">
                <div class="student-reel-publisher-header">
                    <div class="student-reel-publisher-spacer" aria-hidden="true"></div>
                    <div id="student-reel-publisher-title" class="student-reel-publisher-title">نشر ريلز</div>
                    <button id="student-reel-publisher-close" class="student-reel-publisher-close" type="button" aria-label="إغلاق">×</button>
                </div>
                <div class="student-reel-publisher-body">
                    <form id="student-reel-form" class="student-reel-form">
                        <label class="student-reel-file" for="student-reel-file-input">
                            <i class="fa-solid fa-clapperboard"></i>
                            <strong>اختر مقطع فيديو</strong>
                            <small>الحد الأقصى 30MB ومدة 90 ثانية</small>
                        </label>
                        <input id="student-reel-file-input" type="file" accept="video/*" hidden required>
                        <video id="student-reel-preview" class="student-reel-preview" controls playsinline preload="metadata"></video>
                        <textarea id="student-reel-caption" class="student-reel-caption" maxlength="2000" placeholder="اكتب وصف الريلز (اختياري)"></textarea>
                        <button id="student-reel-submit" class="student-reel-submit" type="submit">نشر الريلز</button>
                        <div id="student-reel-message" class="student-reel-message" role="status"></div>
                    </form>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        document.getElementById("student-reel-publisher-close")?.addEventListener("click", function (event) {
            event.preventDefault();
            event.stopPropagation();
            closeCreator();
        });

        document.getElementById("student-reel-file-input")?.addEventListener("change", previewFile);
        document.getElementById("student-reel-form")?.addEventListener("submit", publishReel);
    }

    function setMessage(message, isError = false) {
        const element = document.getElementById("student-reel-message");
        if (!element) return;
        element.textContent = message || "";
        element.classList.toggle("error", Boolean(isError));
    }

    function resetForm() {
        const form = document.getElementById("student-reel-form");
        const preview = document.getElementById("student-reel-preview");
        const button = document.getElementById("student-reel-submit");

        form?.reset();
        setMessage("");

        if (selectedObjectUrl) {
            URL.revokeObjectURL(selectedObjectUrl);
            selectedObjectUrl = "";
        }

        if (preview) {
            preview.pause();
            preview.removeAttribute("src");
            preview.style.display = "none";
            preview.load();
        }

        if (button) {
            button.disabled = false;
            button.textContent = "نشر الريلز";
        }
    }

    function openCreator() {
        injectStyles();
        createOverlay();
        resetForm();

        overlay.classList.add("show");
        overlay.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";

        if (!creatorHistoryActive) {
            history.pushState({ studentReelCreator: true }, "", location.href);
            creatorHistoryActive = true;
        }

        window.dispatchEvent(new CustomEvent("student:reel-creator-opened"));
    }

    function hideCreator() {
        if (!overlay) return;
        overlay.classList.remove("show");
        overlay.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
        resetForm();
        window.dispatchEvent(new CustomEvent("student:reel-creator-closed"));
    }

    function closeCreator(fromHistory = false) {
        if (fromHistory) {
            creatorHistoryActive = false;
            hideCreator();
            return;
        }

        if (creatorHistoryActive && !closingFromHistory) {
            closingFromHistory = true;
            creatorHistoryActive = false;
            history.back();
            setTimeout(function () { closingFromHistory = false; }, 0);
            return;
        }

        hideCreator();
    }

    window.addEventListener("popstate", function () {
        if (creatorHistoryActive && overlay?.classList.contains("show")) {
            closeCreator(true);
        }
    });

    function videoDuration(file) {
        return new Promise(function (resolve, reject) {
            const video = document.createElement("video");
            const url = URL.createObjectURL(file);
            video.preload = "metadata";
            video.onloadedmetadata = function () {
                const duration = Number(video.duration || 0);
                URL.revokeObjectURL(url);
                resolve(duration);
            };
            video.onerror = function () {
                URL.revokeObjectURL(url);
                reject(new Error("تعذر قراءة الفيديو المختار."));
            };
            video.src = url;
        });
    }

    async function validateFile(file) {
        if (!file) throw new Error("اختر فيديو أولًا.");
        if (!String(file.type || "").startsWith("video/")) {
            throw new Error("الملف المختار ليس فيديو صالحًا.");
        }
        if (file.size > MAX_REEL_SIZE) {
            throw new Error("حجم الفيديو كبير. اختر فيديو أقل من 30MB.");
        }

        const duration = await videoDuration(file);
        if (!Number.isFinite(duration) || duration <= 0) {
            throw new Error("تعذر قراءة مدة الفيديو.");
        }
        if (duration > MAX_REEL_DURATION) {
            throw new Error("مدة الفيديو طويلة. الحد الأقصى 90 ثانية.");
        }
        return duration;
    }

    async function previewFile(event) {
        const file = event.target.files?.[0];
        const preview = document.getElementById("student-reel-preview");
        if (!file || !preview) return;

        try {
            await validateFile(file);
            if (selectedObjectUrl) URL.revokeObjectURL(selectedObjectUrl);
            selectedObjectUrl = URL.createObjectURL(file);
            preview.src = selectedObjectUrl;
            preview.style.display = "block";
            setMessage("");
        } catch (error) {
            event.target.value = "";
            preview.style.display = "none";
            setMessage(error.message || "تعذر استخدام الفيديو.", true);
        }
    }

    async function uploadVideo(client, userId, file) {
        const extension = fileExtension(file.name);
        const path = `${userId}/reels/${Date.now()}-${randomId()}.${extension}`;

        const { error } = await client.storage
            .from("post-media")
            .upload(path, file, {
                cacheControl: "31536000",
                upsert: false,
                contentType: file.type || "video/mp4"
            });

        if (error) throw error;

        const { data } = client.storage.from("post-media").getPublicUrl(path);
        if (!data?.publicUrl) {
            await client.storage.from("post-media").remove([path]).catch(function () {});
            throw new Error("تعذر إنشاء رابط الفيديو.");
        }

        return { path, url: data.publicUrl };
    }

    async function publishReel(event) {
        event.preventDefault();
        event.stopPropagation();

        const client = db();
        const file = document.getElementById("student-reel-file-input")?.files?.[0];
        const caption = document.getElementById("student-reel-caption")?.value?.trim() || null;
        const button = document.getElementById("student-reel-submit");

        if (!client) {
            setMessage("الخدمة غير متاحة حاليًا.", true);
            return;
        }

        if (!button || button.disabled) return;

        let uploadedPath = "";
        button.disabled = true;

        try {
            await validateFile(file);

            const { data: { user }, error: userError } = await client.auth.getUser();
            if (userError) throw userError;
            if (!user) throw new Error("يجب تسجيل الدخول أولًا.");

            button.textContent = "جارٍ رفع الفيديو...";
            setMessage("لا تغلق الصفحة حتى يكتمل النشر.");

            const uploaded = await uploadVideo(client, user.id, file);
            uploadedPath = uploaded.path;

            button.textContent = "جارٍ حفظ الريلز...";

            const { error } = await client.from("reels").insert({
                user_id: user.id,
                video_url: uploaded.url,
                video_url_low: uploaded.url,
                video_url_medium: uploaded.url,
                video_url_high: uploaded.url,
                caption
            });

            if (error) throw error;

            setMessage("تم نشر الريلز بنجاح.");
            window.dispatchEvent(new CustomEvent("student:reel-published"));

            setTimeout(function () {
                closeCreator();
            }, 450);
        } catch (error) {
            console.error("Student reel publish:", error);

            if (uploadedPath) {
                try {
                    await client.storage.from("post-media").remove([uploadedPath]);
                } catch (_) {}
            }

            setMessage(error?.message || "تعذر نشر الريلز.", true);
        } finally {
            button.disabled = false;
            button.textContent = "نشر الريلز";
        }
    }

    window.openStudentReelCreator = openCreator;
    window.closeStudentPostCreator = closeCreator;

    /* توافق مؤقت مع أي زر قديم: يفتح ناشر الريلز فقط. */
    window.openStudentPostCreator = openCreator;
})();
