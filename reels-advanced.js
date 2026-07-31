/* =========================================================
   Student - Reels Advanced

   📌 تثبيت Reel
   #️⃣ هاشتاغ
   @️⃣ منشن
   ✏️ تحرير متقدم
   💾 واجهة المسودات
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

        const client =
            getSupabase();

        if (!client) {
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
       Helpers
    ===================================================== */

    function escapeHTML(value) {

        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    function getReel(button) {

        return button?.closest(
            ".student-reel"
        );
    }


    function getReelId(reel) {

        return reel?.dataset?.id || "";
    }


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
        `;

        document.body.appendChild(
            element
        );

        setTimeout(
            () => element.remove(),
            2200
        );
    }


    /* =====================================================
       Dialog
    ===================================================== */

    function closeDialog() {

        document
            .getElementById(
                "student-advanced-dialog"
            )
            ?.remove();
    }


    function openDialog(
        title,
        content,
        buttons,
        ready
    ) {

        closeDialog();

        const dialog =
            document.createElement("div");

        dialog.id =
            "student-advanced-dialog";

        dialog.style.cssText = `
            position:fixed;
            inset:0;
            z-index:100001550;
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
                max-width:460px;
                max-height:90vh;
                overflow:auto;
                background:#fff;
                border-radius:24px;
                padding:20px;
                box-sizing:border-box;
            ">

                <div style="
                    display:flex;
                    align-items:center;
                    margin-bottom:16px;
                ">

                    <strong style="
                        flex:1;
                        font-size:19px;
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

        document.body.appendChild(
            dialog
        );

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

        if (ready) {
            ready(dialog);
        }
    }


    /* =====================================================
       التحقق من الملكية
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
                    created_at
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
       هاشتاغ + منشن
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
       تحرير متقدم
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
                    min-height:140px;
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
            >
                سيتم استخراج الهاشتاغ والمنشن من الوصف تلقائيًا.
            </div>


            <div style="
                margin-top:14px;
                padding:14px;
                background:#f7f8fa;
                border-radius:15px;
                line-height:1.8;
                color:#777;
                font-size:12px;
            ">
                🖼️ تغيير الغلاف و🎵 الموسيقى و🎬 استبدال
                الفيديو تحتاج ربط Storage ونظام رفع الملفات.
                سنضيفها في نفس هذا الملف بعد ربط التخزين.
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
                حفظ
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
                                    result.hashtags.join(
                                        " "
                                    )
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
                                    result.mentions.join(
                                        " "
                                    )
                                )
                                : "لا يوجد"
                        }
                    `;
                }


                caption.addEventListener(
                    "input",
                    updateTags
                );


                updateTags();


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
                        async function () {

                            await saveAdvancedEdit(
                                reelId,
                                caption.value,
                                this
                            );

                        }
                    );
            }
        );
    }


    async function saveAdvancedEdit(
        reelId,
        caption,
        button
    ) {

        const client =
            getSupabase();

        if (
            !client ||
            !currentUserId
        ) {
            return;
        }

        button.disabled =
            true;

        button.textContent =
            "جارٍ الحفظ...";

        try {

            const {
                error
            } =
                await client
                    .from("reels")
                    .update({
                        caption:
                            caption.trim() ||
                            null,

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


            const reel =
                document.querySelector(
                    `.student-reel[data-id="${CSS.escape(
                        String(reelId)
                    )}"]`
                );


            const captionElement =
                reel?.querySelector(
                    ".student-reel-caption"
                );


            if (captionElement) {

                captionElement.textContent =
                    caption.trim();

            }


            closeDialog();

            toast(
                "تم تحديث الـReel."
            );

        } catch (error) {

            console.error(
                "Advanced edit error:",
                error
            );

            toast(
                error?.message ||
                "تعذر حفظ التعديل."
            );

        } finally {

            button.disabled =
                false;

            button.textContent =
                "حفظ";
        }
    }


    /* =====================================================
       تثبيت Reel
       ملاحظة: يعتمد على وجود pin column أو نظام
       تثبيت عندك. لا ننفذ كتابة وهمية.
    ===================================================== */

    async function pinReel(
        reelId
    ) {

        const client =
            getSupabase();

        if (
            !client ||
            !currentUserId
        ) {
            return;
        }


        /*
           نحاول استخدام pinned_at إذا كان
           موجودًا. إذا لم يكن موجودًا،
           لا نغيّر قاعدة البيانات بصمت.
        */

        try {

            const {
                error
            } =
                await client
                    .from("reels")
                    .update({
                        pinned_at:
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

                toast(
                    "التثبيت يحتاج إضافة عمود pinned_at في جدول reels."
                );

                return;
            }


            toast(
                "تم تثبيت الـReel."
            );

        } catch (error) {

            console.error(
                "Pin error:",
                error
            );

            toast(
                "تعذر تثبيت الـReel."
            );
        }
    }


    /* =====================================================
       واجهة التثبيت
    ===================================================== */

    function addAdvancedButtons() {

        document
            .querySelectorAll(
                ".student-reel"
            )
            .forEach(
                function (reel) {

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


                    if (
                        !menu.querySelector(
                            "[data-pin]"
                        )
                    ) {

                        const button =
                            document.createElement(
                                "button"
                            );

                        button.type =
                            "button";

                        button.dataset.pin =
                            "true";

                        button.textContent =
                            "📌 تثبيت";

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

                }
            );
    }


    /* =====================================================
       الأزرار
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

                    if (reelId) {

                        pinReel(
                            reelId
                        );
                    }

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

        addAdvancedButtons();

        bindAdvancedButtons();

        new MutationObserver(
            function () {
                addAdvancedButtons();
            }
        ).observe(
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
