/* =========================================================
   Student - Reels Manage

   ✏️ تعديل الـReel
   🔒 خصوصية الـReel
   🗑️ حذف الـReel
========================================================= */

(function () {

    "use strict";


    if (window.__studentReelsManageLoaded) {
        return;
    }


    window.__studentReelsManageLoaded =
        true;


    let manageUserId = null;


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
            manageUserId = null;
            return null;
        }


        try {

            const {
                data: {
                    user
                }
            } =
                await client
                    .auth
                    .getUser();


            manageUserId =
                user?.id || null;


            return user || null;


        } catch (error) {

            console.error(
                "Manage auth error:",
                error
            );


            manageUserId = null;

            return null;
        }
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
       Toast
    ===================================================== */

    function toast(
        message
    ) {

        const old =
            document.getElementById(
                "student-manage-toast"
            );


        if (old) {
            old.remove();
        }


        const element =
            document.createElement(
                "div"
            );


        element.id =
            "student-manage-toast";


        element.textContent =
            message;


        element.style.cssText = `
            position:fixed;
            left:50%;
            bottom:30px;
            transform:translateX(-50%);
            z-index:100000600;
            background:#222;
            color:#fff;
            padding:11px 16px;
            border-radius:12px;
            font-size:13px;
            direction:rtl;
            box-shadow:
                0 8px 30px
                rgba(0,0,0,.3);
        `;


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
       الحصول على Reel
    ===================================================== */

    function getReelFromButton(
        button
    ) {

        return button?.closest(
            ".student-reel"
        );
    }


    function getReelId(
        reel
    ) {

        return (
            reel?.dataset?.id ||
            ""
        );
    }


    /* =====================================================
       نافذة عائمة
    ===================================================== */

    function closeDialog() {

        const dialog =
            document.getElementById(
                "student-manage-dialog"
            );


        if (dialog) {
            dialog.remove();
        }
    }


    function showDialog(
        title,
        content,
        buttonsHTML,
        onReady
    ) {

        closeDialog();


        const dialog =
            document.createElement(
                "div"
            );


        dialog.id =
            "student-manage-dialog";


        dialog.style.cssText = `
            position:fixed;
            inset:0;
            z-index:100000550;
            display:flex;
            align-items:center;
            justify-content:center;
            padding:20px;
            background:rgba(0,0,0,.5);
            direction:rtl;
        `;


        dialog.innerHTML = `

            <div style="
                width:100%;
                max-width:440px;
                max-height:90vh;
                overflow:auto;
                background:#fff;
                border-radius:22px;
                padding:20px;
                box-sizing:border-box;
                box-shadow:
                    0 20px 60px
                    rgba(0,0,0,.3);
            ">

                <div style="
                    display:flex;
                    align-items:center;
                    gap:10px;
                    margin-bottom:16px;
                ">

                    <strong style="
                        flex:1;
                        font-size:19px;
                        color:#222;
                    ">
                        ${escapeHTML(title)}
                    </strong>


                    <button
                        id="student-manage-close"
                        type="button"
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


                <div
                    id="student-manage-content"
                >
                    ${content}
                </div>


                <div style="
                    display:flex;
                    gap:10px;
                    margin-top:17px;
                ">
                    ${buttonsHTML}
                </div>

            </div>
        `;


        document.body.appendChild(
            dialog
        );


        document
            .getElementById(
                "student-manage-close"
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


        if (typeof onReady === "function") {
            onReady(dialog);
        }
    }


    /* =====================================================
       الحصول على بيانات الـReel
    ===================================================== */

    async function getReel(
        reelId
    ) {

        const client =
            getSupabase();


        if (!client) {
            return null;
        }


        try {

            const {
                data,
                error
            } =
                await client
                    .from(
                        "reels"
                    )
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
                    .eq(
                        "id",
                        reelId
                    )
                    .maybeSingle();


            if (error) {
                throw error;
            }


            return data || null;


        } catch (error) {

            console.error(
                "Get Reel error:",
                error
            );


            return null;
        }
    }


    /* =====================================================
       تعديل Reel
    ===================================================== */

    async function openEditReel(
        reelId
    ) {

        await loadCurrentUser();


        if (!manageUserId) {

            toast(
                "يجب تسجيل الدخول أولًا."
            );

            return;
        }


        const reel =
            await getReel(
                reelId
            );


        if (!reel) {

            toast(
                "تعذر العثور على الـReel."
            );

            return;
        }


        if (
            String(
                reel.user_id
            ) !==
            String(
                manageUserId
            )
        ) {

            toast(
                "لا يمكنك تعديل هذا الـReel."
            );

            return;
        }


        showDialog(

            "تعديل Reel",

            `

            <div style="
                display:flex;
                flex-direction:column;
                gap:10px;
            ">

                <label style="
                    font-size:13px;
                    font-weight:700;
                    color:#333;
                ">
                    الوصف
                </label>


                <textarea
                    id="student-manage-caption"
                    maxlength="2000"
                    placeholder="اكتب وصف الـReel..."
                    style="
                        width:100%;
                        min-height:130px;
                        box-sizing:border-box;
                        border:1px solid #ddd;
                        border-radius:14px;
                        padding:13px;
                        resize:none;
                        outline:none;
                        font-size:14px;
                    "
                >${escapeHTML(
                    reel.caption || ""
                )}</textarea>


                <div style="
                    padding:12px;
                    border-radius:13px;
                    background:#f7f8fa;
                    color:#777;
                    font-size:12px;
                    line-height:1.7;
                ">
                    التعديل الحالي يغيّر وصف الـReel
                    فقط. سنضيف تغيير الفيديو والغلاف
                    في مرحلة التحرير المتقدم.
                </div>


                <div
                    id="student-manage-message"
                    style="
                        min-height:20px;
                        text-align:center;
                        font-size:13px;
                    "
                ></div>

            </div>

            `,

            `

            <button
                id="student-manage-edit-cancel"
                type="button"
                style="
                    flex:1;
                    border:0;
                    padding:13px;
                    border-radius:12px;
                    background:#f1f3f5;
                    cursor:pointer;
                    font-weight:700;
                "
            >
                إلغاء
            </button>


            <button
                id="student-manage-edit-save"
                type="button"
                style="
                    flex:1;
                    border:0;
                    padding:13px;
                    border-radius:12px;
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

                dialog
                    .querySelector(
                        "#student-manage-edit-cancel"
                    )
                    ?.addEventListener(
                        "click",
                        closeDialog
                    );


                dialog
                    .querySelector(
                        "#student-manage-edit-save"
                    )
                    ?.addEventListener(
                        "click",
                        function () {

                            saveReelEdit(
                                reelId,
                                dialog
                            );

                        }
                    );
            }
        );
    }


    async function saveReelEdit(
        reelId,
        dialog
    ) {

        const client =
            getSupabase();


        const input =
            dialog.querySelector(
                "#student-manage-caption"
            );


        const message =
            dialog.querySelector(
                "#student-manage-message"
            );


        const button =
            dialog.querySelector(
                "#student-manage-edit-save"
            );


        if (
            !client ||
            !manageUserId ||
            !input
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
                    .from(
                        "reels"
                    )
                    .update({

                        caption:
                            input.value.trim() ||
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
                        manageUserId
                    );


            if (error) {
                throw error;
            }


            message.style.color =
                "#16803c";


            message.textContent =
                "تم تعديل الـReel بنجاح.";


            /*
               تحديث النص الظاهر
               بدون إعادة تحميل الصفحة.
            */

            const reelElement =
                document.querySelector(
                    `.student-reel[data-id="${CSS.escape(
                        String(reelId)
                    )}"]`
                );


            const captionElement =
                reelElement?.querySelector(
                    ".student-reel-caption"
                );


            if (captionElement) {

                captionElement.textContent =
                    input.value.trim();

            } else if (
                input.value.trim() &&
                reelElement
            ) {

                const userArea =
                    reelElement.querySelector(
                        ".student-reel-user"
                    );


                if (userArea) {

                    const caption =
                        document.createElement(
                            "div"
                        );


                    caption.className =
                        "student-reel-caption";


                    caption.textContent =
                        input.value.trim();


                    userArea.appendChild(
                        caption
                    );
                }
            }


            setTimeout(
                closeDialog,
                500
            );


        } catch (error) {

            console.error(
                "Save Reel edit error:",
                error
            );


            message.style.color =
                "#d93025";


            message.textContent =
                error?.message ||
                "تعذر تعديل الـReel.";


        } finally {

            button.disabled =
                false;

            button.textContent =
                "حفظ";
        }
    }


    /* =====================================================
       الخصوصية
    ===================================================== */

    async function openPrivacy(
        reelId
    ) {

        await loadCurrentUser();


        if (!manageUserId) {

            toast(
                "يجب تسجيل الدخول أولًا."
            );

            return;
        }


        const reel =
            await getReel(
                reelId
            );


        if (!reel) {

            toast(
                "تعذر العثور على الـReel."
            );

            return;
        }


        if (
            String(
                reel.user_id
            ) !==
            String(
                manageUserId
            )
        ) {

            toast(
                "لا يمكنك تعديل خصوصية هذا الـReel."
            );

            return;
        }


        const visibility =
            reel.visibility ||
            "public";


        showDialog(

            "خصوصية Reel",

            `

            <div style="
                display:flex;
                flex-direction:column;
                gap:12px;
            ">

                <label
                    style="
                        display:flex;
                        align-items:center;
                        gap:10px;
                        padding:14px;
                        border:1px solid #eee;
                        border-radius:14px;
                        cursor:pointer;
                    "
                >

                    <input
                        type="radio"
                        name="student-reel-visibility"
                        value="public"
                        ${
                            visibility ===
                            "public"
                                ? "checked"
                                : ""
                        }
                    >

                    <div>

                        <strong>
                            عام
                        </strong>

                        <div style="
                            color:#888;
                            font-size:12px;
                            margin-top:3px;
                        ">
                            يمكن للجميع مشاهدة الـReel.
                        </div>

                    </div>

                </label>


                <label
                    style="
                        display:flex;
                        align-items:center;
                        gap:10px;
                        padding:14px;
                        border:1px solid #eee;
                        border-radius:14px;
                        cursor:pointer;
                    "
                >

                    <input
                        type="radio"
                        name="student-reel-visibility"
                        value="followers"
                        ${
                            visibility ===
                            "followers"
                                ? "checked"
                                : ""
                        }
                    >

                    <div>

                        <strong>
                            المتابعون
                        </strong>

                        <div style="
                            color:#888;
                            font-size:12px;
                            margin-top:3px;
                        ">
                            المتابعون فقط يمكنهم المشاهدة.
                        </div>

                    </div>

                </label>


                <label
                    style="
                        display:flex;
                        align-items:center;
                        gap:10px;
                        padding:14px;
                        border:1px solid #eee;
                        border-radius:14px;
                        cursor:pointer;
                    "
                >

                    <input
                        type="radio"
                        name="student-reel-visibility"
                        value="private"
                        ${
                            visibility ===
                            "private"
                                ? "checked"
                                : ""
                        }
                    >

                    <div>

                        <strong>
                            خاص
                        </strong>

                        <div style="
                            color:#888;
                            font-size:12px;
                            margin-top:3px;
                        ">
                            أنت فقط يمكنه مشاهدة الـReel.
                        </div>

                    </div>

                </label>


                <div
                    id="student-manage-message"
                    style="
                        min-height:20px;
                        text-align:center;
                        font-size:13px;
                    "
                ></div>

            </div>

            `,

            `

            <button
                id="student-manage-privacy-cancel"
                type="button"
                style="
                    flex:1;
                    border:0;
                    padding:13px;
                    border-radius:12px;
                    background:#f1f3f5;
                    cursor:pointer;
                    font-weight:700;
                "
            >
                إلغاء
            </button>


            <button
                id="student-manage-privacy-save"
                type="button"
                style="
                    flex:1;
                    border:0;
                    padding:13px;
                    border-radius:12px;
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

                dialog
                    .querySelector(
                        "#student-manage-privacy-cancel"
                    )
                    ?.addEventListener(
                        "click",
                        closeDialog
                    );


                dialog
                    .querySelector(
                        "#student-manage-privacy-save"
                    )
                    ?.addEventListener(
                        "click",
                        function () {

                            savePrivacy(
                                reelId,
                                dialog
                            );

                        }
                    );
            }
        );
    }


    async function savePrivacy(
        reelId,
        dialog
    ) {

        const client =
            getSupabase();


        const selected =
            dialog.querySelector(
                'input[name="student-reel-visibility"]:checked'
            );


        const message =
            dialog.querySelector(
                "#student-manage-message"
            );


        const button =
            dialog.querySelector(
                "#student-manage-privacy-save"
            );


        if (
            !client ||
            !manageUserId ||
            !selected
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
                    .from(
                        "reels"
                    )
                    .update({

                        visibility:
                            selected.value,

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
                        manageUserId
                    );


            if (error) {
                throw error;
            }


            message.style.color =
                "#16803c";


            message.textContent =
                "تم حفظ الخصوصية.";


            setTimeout(
                closeDialog,
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


        } finally {

            button.disabled =
                false;

            button.textContent =
                "حفظ";
        }
    }


    /* =====================================================
       حذف Reel
    ===================================================== */

    function openDelete(
        reelId
    ) {

        showDialog(

            "حذف Reel",

            `

            <div style="
                text-align:center;
                padding:8px 0;
            ">

                <div style="
                    font-size:44px;
                    margin-bottom:10px;
                ">
                    🗑️
                </div>

                <div style="
                    font-size:15px;
                    color:#555;
                    line-height:1.8;
                ">
                    هل أنت متأكد من حذف هذا الـReel؟
                    <br>
                    لا يمكن التراجع عن هذه العملية.
                </div>


                <div
                    id="student-manage-message"
                    style="
                        min-height:20px;
                        text-align:center;
                        font-size:13px;
                        margin-top:10px;
                    "
                ></div>

            </div>

            `,

            `

            <button
                id="student-manage-delete-cancel"
                type="button"
                style="
                    flex:1;
                    border:0;
                    padding:13px;
                    border-radius:12px;
                    background:#f1f3f5;
                    cursor:pointer;
                    font-weight:700;
                "
            >
                إلغاء
            </button>


            <button
                id="student-manage-delete-confirm"
                type="button"
                style="
                    flex:1;
                    border:0;
                    padding:13px;
                    border-radius:12px;
                    background:#d93025;
                    color:#fff;
                    cursor:pointer;
                    font-weight:700;
                "
            >
                حذف
            </button>

            `,

            function (dialog) {

                dialog
                    .querySelector(
                        "#student-manage-delete-cancel"
                    )
                    ?.addEventListener(
                        "click",
                        closeDialog
                    );


                dialog
                    .querySelector(
                        "#student-manage-delete-confirm"
                    )
                    ?.addEventListener(
                        "click",
                        function () {

                            deleteReel(
                                reelId,
                                dialog
                            );

                        }
                    );
            }
        );
    }


    async function deleteReel(
        reelId,
        dialog
    ) {

        await loadCurrentUser();


        const client =
            getSupabase();


        const message =
            dialog.querySelector(
                "#student-manage-message"
            );


        const button =
            dialog.querySelector(
                "#student-manage-delete-confirm"
            );


        if (
            !client ||
            !manageUserId
        ) {

            toast(
                "يجب تسجيل الدخول أولًا."
            );

            return;
        }


        button.disabled =
            true;


        button.textContent =
            "جارٍ الحذف...";


        try {

            const {
                error
            } =
                await client
                    .from(
                        "reels"
                    )
                    .delete()
                    .eq(
                        "id",
                        reelId
                    )
                    .eq(
                        "user_id",
                        manageUserId
                    );


            if (error) {
                throw error;
            }


            message.style.color =
                "#16803c";


            message.textContent =
                "تم حذف الـReel.";


            /*
               حذف العنصر من الشاشة فورًا.
            */

            const reelElement =
                document.querySelector(
                    `.student-reel[data-id="${CSS.escape(
                        String(reelId)
                    )}"]`
                );


            reelElement?.remove();


            setTimeout(
                closeDialog,
                500
            );


            toast(
                "تم حذف الـReel بنجاح."
            );


        } catch (error) {

            console.error(
                "Delete Reel error:",
                error
            );


            message.style.color =
                "#d93025";


            message.textContent =
                error?.message ||
                "تعذر حذف الـReel.";


        } finally {

            button.disabled =
                false;

            button.textContent =
                "حذف";
        }
    }


    /* =====================================================
       اعتراض أزرار الإدارة
    ===================================================== */

    function bindManageButtons() {

        document.addEventListener(
            "click",
            function (event) {

                /*
                   تعديل
                */

                const editButton =
                    event.target.closest(
                        ".student-reel [data-edit]"
                    );


                if (editButton) {

                    event.preventDefault();
                    event.stopImmediatePropagation();


                    const reel =
                        getReelFromButton(
                            editButton
                        );


                    const reelId =
                        getReelId(
                            reel
                        );


                    if (reelId) {

                        openEditReel(
                            reelId
                        );
                    }


                    return;
                }


                /*
                   الخصوصية
                */

                const privacyButton =
                    event.target.closest(
                        ".student-reel [data-privacy]"
                    );


                if (privacyButton) {

                    event.preventDefault();
                    event.stopImmediatePropagation();


                    const reel =
                        getReelFromButton(
                            privacyButton
                        );


                    const reelId =
                        getReelId(
                            reel
                        );


                    if (reelId) {

                        openPrivacy(
                            reelId
                        );
                    }


                    return;
                }


                /*
                   حذف
                */

                const deleteButton =
                    event.target.closest(
                        ".student-reel [data-delete]"
                    );


                if (deleteButton) {

                    event.preventDefault();
                    event.stopImmediatePropagation();


                    const reel =
                        getReelFromButton(
                            deleteButton
                        );


                    const reelId =
                        getReelId(
                            reel
                        );


                    if (reelId) {

                        openDelete(
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

    window.StudentReelsManage =
        window.StudentReelsManage ||
        {};


    window.StudentReelsManage.openEditReel =
        openEditReel;


    window.StudentReelsManage.openPrivacy =
        openPrivacy;


    window.StudentReelsManage.openDelete =
        openDelete;


    /* =====================================================
       Start
    ===================================================== */

    async function start() {

        await loadCurrentUser();

        bindManageButtons();
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
