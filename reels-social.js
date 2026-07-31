/* =========================================================
   Student - Reels Social
   ❤️ Likes
   💬 Comments
   ↗️ Share
========================================================= */

(function () {

    "use strict";


    if (window.__studentReelsSocialLoaded) {
        return;
    }


    window.__studentReelsSocialLoaded = true;


    function getSupabase() {

        if (
            typeof supabaseClient !== "undefined" &&
            supabaseClient
        ) {
            return supabaseClient;
        }

        return null;
    }


    function escapeHTML(value) {

        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    function getCurrentUserId() {

        try {

            return (
                window.currentUser?.id ||
                null
            );

        } catch (error) {

            return null;
        }
    }


    /* =====================================================
       إنشاء نافذة التعليقات الخاصة بنا
    ===================================================== */

    function createCommentsBox() {

        let box =
            document.getElementById(
                "student-social-comments"
            );


        if (box) {
            return box;
        }


        box =
            document.createElement(
                "div"
            );


        box.id =
            "student-social-comments";


        box.style.cssText = `
            position:fixed;
            inset:0;
            z-index:100000050;
            display:none;
            align-items:flex-end;
            justify-content:center;
            background:rgba(0,0,0,.45);
            direction:rtl;
        `;


        box.innerHTML = `

            <div style="
                width:100%;
                max-width:620px;
                height:min(78vh,650px);
                background:#fff;
                border-radius:24px 24px 0 0;
                display:flex;
                flex-direction:column;
                overflow:hidden;
            ">

                <div style="
                    display:flex;
                    align-items:center;
                    gap:10px;
                    padding:15px;
                    border-bottom:1px solid #eee;
                ">

                    <strong style="
                        flex:1;
                        font-size:17px;
                    ">
                        التعليقات
                    </strong>


                    <button
                        id="student-social-comments-close"
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
                    id="student-social-comments-list"
                    style="
                        flex:1;
                        overflow-y:auto;
                        padding:12px;
                    "
                ></div>


                <form
                    id="student-social-comments-form"
                    style="
                        display:flex;
                        gap:8px;
                        padding:10px;
                        border-top:1px solid #eee;
                    "
                >

                    <textarea
                        id="student-social-comments-input"
                        maxlength="1000"
                        required
                        placeholder="اكتب تعليقًا..."
                        style="
                            flex:1;
                            height:44px;
                            resize:none;
                            box-sizing:border-box;
                            border:1px solid #ddd;
                            border-radius:13px;
                            padding:11px;
                            outline:none;
                        "
                    ></textarea>


                    <button
                        type="submit"
                        style="
                            width:48px;
                            height:44px;
                            border:0;
                            border-radius:13px;
                            background:#0095f6;
                            color:#fff;
                            cursor:pointer;
                        "
                    >
                        <i class="
                            fa-solid
                            fa-paper-plane
                        "></i>
                    </button>

                </form>

            </div>
        `;


        document.body.appendChild(
            box
        );


        document
            .getElementById(
                "student-social-comments-close"
            )
            ?.addEventListener(
                "click",
                closeComments
            );


        box.addEventListener(
            "click",
            function (event) {

                if (
                    event.target ===
                    box
                ) {

                    closeComments();
                }

            }
        );


        document
            .getElementById(
                "student-social-comments-form"
            )
            ?.addEventListener(
                "submit",
                submitComment
            );


        return box;
    }


    function closeComments() {

        const box =
            document.getElementById(
                "student-social-comments"
            );


        if (box) {

            box.style.display =
                "none";
        }
    }


    /* =====================================================
       فتح التعليقات
    ===================================================== */

    async function openComments(
        reelId
    ) {

        const box =
            createCommentsBox();


        box.dataset.reelId =
            String(reelId);


        box.style.display =
            "flex";


        await loadComments(
            reelId
        );
    }


    /* =====================================================
       تحميل التعليقات
       لا يعتمد على profiles
       حتى لا تفشل النافذة إذا تعذر
       تحميل معلومات المستخدم
    ===================================================== */

    async function loadComments(
        reelId
    ) {

        const client =
            getSupabase();


        const list =
            document.getElementById(
                "student-social-comments-list"
            );


        if (
            !client ||
            !list
        ) {
            return;
        }


        list.innerHTML = `
            <div style="
                padding:40px;
                text-align:center;
                color:#999;
            ">
                جاري تحميل التعليقات...
            </div>
        `;


        try {

            const {
                data,
                error
            } =
                await client
                    .from(
                        "reel_comments"
                    )
                    .select(`
                        id,
                        reel_id,
                        user_id,
                        content,
                        created_at
                    `)
                    .eq(
                        "reel_id",
                        reelId
                    )
                    .order(
                        "created_at",
                        {
                            ascending:true
                        }
                    );


            if (error) {
                throw error;
            }


            const comments =
                data || [];


            if (!comments.length) {

                list.innerHTML = `
                    <div style="
                        padding:50px 15px;
                        text-align:center;
                        color:#999;
                    ">
                        لا توجد تعليقات بعد.
                    </div>
                `;

                return;
            }


            /*
               نحاول تحميل profiles بشكل منفصل.
               لكن إذا فشل لن نفشل التعليق.
            */

            const ids =
                Array.from(
                    new Set(
                        comments.map(
                            item =>
                                item.user_id
                        )
                    )
                );


            let profiles = {};


            if (ids.length) {

                try {

                    const {
                        data:
                            profileData
                    } =
                        await client
                            .from(
                                "profiles"
                            )
                            .select(`
                                id,
                                full_name,
                                username,
                                avatar_url
                            `)
                            .in(
                                "id",
                                ids
                            );


                    (profileData || [])
                        .forEach(
                            function(profile) {

                                profiles[
                                    profile.id
                                ] =
                                    profile;
                            }
                        );

                } catch (profileError) {

                    console.warn(
                        "Profile loading skipped:",
                        profileError
                    );
                }
            }


            list.innerHTML =
                comments.map(
                    function(comment) {

                        const profile =
                            profiles[
                                comment.user_id
                            ] || {};


                        const name =
                            profile.username ||
                            profile.full_name ||
                            "مستخدم";


                        const avatar =
                            profile.avatar_url
                                ? `
                                    <img
                                        src="${escapeHTML(
                                            profile.avatar_url
                                        )}"
                                        style="
                                            width:38px;
                                            height:38px;
                                            border-radius:50%;
                                            object-fit:cover;
                                            background:#eee;
                                            flex-shrink:0;
                                        "
                                        alt=""
                                    >
                                  `
                                : `
                                    <div style="
                                        width:38px;
                                        height:38px;
                                        border-radius:50%;
                                        background:#eaf5ff;
                                        color:#0095f6;
                                        display:flex;
                                        align-items:center;
                                        justify-content:center;
                                        flex-shrink:0;
                                    ">
                                        <i class="
                                            fa-solid
                                            fa-user
                                        "></i>
                                    </div>
                                  `;


                        const myComment =
                            String(
                                comment.user_id
                            ) ===
                            String(
                                getCurrentUserId()
                            );


                        return `

                            <div
                                data-social-comment-id="${escapeHTML(
                                    comment.id
                                )}"
                                style="
                                    display:flex;
                                    gap:10px;
                                    padding:10px 3px;
                                "
                            >

                                ${avatar}


                                <div style="
                                    flex:1;
                                    min-width:0;
                                ">

                                    <div style="
                                        font-size:13px;
                                        font-weight:800;
                                        color:#222;
                                    ">
                                        @${escapeHTML(
                                            name
                                        )}
                                    </div>


                                    <div style="
                                        margin-top:4px;
                                        font-size:13px;
                                        color:#444;
                                        line-height:1.7;
                                        white-space:pre-wrap;
                                        word-break:break-word;
                                    ">
                                        ${escapeHTML(
                                            comment.content
                                        )}
                                    </div>


                                    <div style="
                                        margin-top:4px;
                                        color:#999;
                                        font-size:10px;
                                    ">
                                        ${formatDate(
                                            comment.created_at
                                        )}
                                    </div>

                                </div>


                                ${
                                    myComment
                                        ? `
                                            <button
                                                type="button"
                                                data-delete-social-comment="${escapeHTML(
                                                    comment.id
                                                )}"
                                                style="
                                                    border:0;
                                                    background:transparent;
                                                    color:#d93025;
                                                    cursor:pointer;
                                                    font-size:11px;
                                                    align-self:center;
                                                "
                                            >
                                                حذف
                                            </button>
                                          `
                                        : ""
                                }

                            </div>
                        `;

                    }
                )
                .join("");


            list
                .querySelectorAll(
                    "[data-delete-social-comment]"
                )
                .forEach(
                    function(button) {

                        button.addEventListener(
                            "click",
                            function() {

                                deleteComment(
                                    this.dataset
                                        .deleteSocialComment,
                                    reelId
                                );

                            }
                        );

                    }
                );


        } catch (error) {

            console.error(
                "Social comments error:",
                error
            );


            list.innerHTML = `
                <div style="
                    padding:40px 15px;
                    text-align:center;
                    color:#d93025;
                    line-height:1.8;
                ">
                    تعذر تحميل التعليقات.
                    <br>
                    <small>
                        ${escapeHTML(
                            error?.message || ""
                        )}
                    </small>
                </div>
            `;
        }
    }


    /* =====================================================
       إضافة تعليق
    ===================================================== */

    async function submitComment(
        event
    ) {

        event.preventDefault();


        const client =
            getSupabase();


        if (!client) {
            return;
        }


        const userId =
            getCurrentUserId();


        if (!userId) {

            showToast(
                "يجب تسجيل الدخول أولًا."
            );

            return;
        }


        const box =
            document.getElementById(
                "student-social-comments"
            );


        const reelId =
            box?.dataset.reelId;


        const input =
            document.getElementById(
                "student-social-comments-input"
            );


        const content =
            input?.value.trim();


        if (
            !reelId ||
            !content
        ) {
            return;
        }


        try {

            const {
                error
            } =
                await client
                    .from(
                        "reel_comments"
                    )
                    .insert({

                        reel_id:
                            reelId,

                        user_id:
                            userId,

                        content:
                            content
                    });


            if (error) {
                throw error;
            }


            input.value = "";


            await loadComments(
                reelId
            );


            await updateCount(
                reelId
            );


        } catch (error) {

            console.error(
                "Comment insert error:",
                error
            );


            showToast(
                error?.message ||
                "تعذر نشر التعليق."
            );
        }
    }


    /* =====================================================
       حذف التعليق
    ===================================================== */

    async function deleteComment(
        commentId,
        reelId
    ) {

        const client =
            getSupabase();


        const userId =
            getCurrentUserId();


        if (
            !client ||
            !userId
        ) {
            return;
        }


        if (
            !confirm(
                "هل تريد حذف التعليق؟"
            )
        ) {
            return;
        }


        try {

            const {
                error
            } =
                await client
                    .from(
                        "reel_comments"
                    )
                    .delete()
                    .eq(
                        "id",
                        commentId
                    )
                    .eq(
                        "user_id",
                        userId
                    );


            if (error) {
                throw error;
            }


            await loadComments(
                reelId
            );


            await updateCount(
                reelId
            );


        } catch (error) {

            console.error(
                "Delete comment error:",
                error
            );


            showToast(
                error?.message ||
                "تعذر حذف التعليق."
            );
        }
    }


    /* =====================================================
       تحديث العداد
    ===================================================== */

    async function updateCount(
        reelId
    ) {

        const client =
            getSupabase();


        if (!client) {
            return;
        }


        const {
            count
        } =
            await client
                .from(
                    "reel_comments"
                )
                .select(
                    "id",
                    {
                        count:
                            "exact",
                        head:true
                    }
                )
                .eq(
                    "reel_id",
                    reelId
                );


        const slide =
            document.querySelector(
                `.student-reel[data-id="${CSS.escape(
                    String(reelId)
                )}"]`
            );


        const counter =
            slide?.querySelector(
                "[data-comment-count]"
            );


        if (counter) {

            counter.textContent =
                count || 0;
        }
    }


    /* =====================================================
       تنسيق التاريخ
    ===================================================== */

    function formatDate(
        value
    ) {

        if (!value) {
            return "";
        }


        const date =
            new Date(
                value
            );


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return "";
        }


        return date.toLocaleString(
            "ar-IQ",
            {
                dateStyle:
                    "medium",
                timeStyle:
                    "short"
            }
        );
    }


    /* =====================================================
       Toast
    ===================================================== */

    function showToast(
        message
    ) {

        const toast =
            document.createElement(
                "div"
            );


        toast.textContent =
            message;


        toast.style.cssText = `
            position:fixed;
            left:50%;
            bottom:30px;
            transform:translateX(-50%);
            z-index:100000100;
            background:#222;
            color:#fff;
            padding:11px 16px;
            border-radius:12px;
            font-size:13px;
            direction:rtl;
        `;


        document.body.appendChild(
            toast
        );


        setTimeout(
            function() {
                toast.remove();
            },
            2200
        );
    }


    /* =====================================================
       اعتراض زر التعليقات القديم
    ===================================================== */

    document.addEventListener(
        "click",
        function(event) {

            const button =
                event.target.closest(
                    "[data-comments]"
                );


            if (!button) {
                return;
            }


            const reel =
                button.closest(
                    ".student-reel"
                );


            const reelId =
                reel?.dataset.id;


            if (!reelId) {
                return;
            }


            /*
               نمنع reels.js القديم من
               تشغيل نافذة التعليقات القديمة.
            */

            event.preventDefault();
            event.stopImmediatePropagation();


            openComments(
                reelId
            );

        },
        true
    );


    /* =====================================================
       API
    ===================================================== */

    window.StudentReelsSocial =
        window.StudentReelsSocial ||
        {};


    window.StudentReelsSocial.openComments =
        openComments;


    window.StudentReelsSocial.closeComments =
        closeComments;


})();
