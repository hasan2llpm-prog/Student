/* =========================================================
   Student - Reels Social
   ❤️ Reel Likes
   💬 Comments
   ❤️ Comment Likes
   ✏️ Edit Comment
   🗑️ Delete Comment
   ↗️ Share
========================================================= */

(function () {

    "use strict";

    if (window.__studentReelsSocialLoaded) {
        return;
    }

    window.__studentReelsSocialLoaded = true;

    let socialUserId = null;


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
            socialUserId = null;
            return null;
        }

        try {

            const {
                data: {
                    user
                }
            } =
                await client.auth.getUser();

            socialUserId =
                user?.id || null;

            return user || null;

        } catch (error) {

            console.error(
                "Social auth error:",
                error
            );

            socialUserId = null;

            return null;
        }
    }


    function getUserId() {

        return socialUserId;
    }


    /* =====================================================
       حماية HTML
    ===================================================== */

    function escapeHTML(value) {

        return String(value || "")
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
       التاريخ
    ===================================================== */

    function formatDate(value) {

        if (!value) {
            return "";
        }

        const date =
            new Date(value);

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
                dateStyle: "medium",
                timeStyle: "short"
            }
        );
    }


    /* =====================================================
       Toast
    ===================================================== */

    function toast(message) {

        const old =
            document.getElementById(
                "student-social-toast"
            );

        if (old) {
            old.remove();
        }

        const element =
            document.createElement(
                "div"
            );

        element.id =
            "student-social-toast";

        element.textContent =
            message;

        element.style.cssText = `
            position:fixed;
            left:50%;
            bottom:30px;
            transform:translateX(-50%);
            z-index:100000500;
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
       نافذة عائمة عامة
    ===================================================== */

    function showSocialDialog(
        title,
        content,
        actionText,
        actionStyle,
        onAction
    ) {

        const old =
            document.getElementById(
                "student-social-dialog"
            );

        if (old) {
            old.remove();
        }

        const dialog =
            document.createElement(
                "div"
            );

        dialog.id =
            "student-social-dialog";

        dialog.style.cssText = `
            position:fixed;
            inset:0;
            z-index:100000400;
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
                max-width:430px;
                background:#fff;
                border-radius:22px;
                padding:20px;
                box-sizing:border-box;
                box-shadow:
                    0 20px 60px
                    rgba(0,0,0,.3);
            ">

                <div style="
                    font-size:19px;
                    font-weight:800;
                    color:#222;
                    margin-bottom:14px;
                ">
                    ${escapeHTML(title)}
                </div>

                <div
                    id="student-social-dialog-content"
                >
                    ${content}
                </div>

                <div style="
                    display:flex;
                    gap:10px;
                    margin-top:17px;
                ">

                    <button
                        id="student-social-dialog-cancel"
                        type="button"
                        style="
                            flex:1;
                            border:0;
                            padding:13px;
                            border-radius:12px;
                            background:#f1f3f5;
                            color:#333;
                            cursor:pointer;
                            font-weight:700;
                        "
                    >
                        إلغاء
                    </button>

                    <button
                        id="student-social-dialog-action"
                        type="button"
                        style="
                            flex:1;
                            border:0;
                            padding:13px;
                            border-radius:12px;
                            cursor:pointer;
                            font-weight:700;
                            ${actionStyle}
                        "
                    >
                        ${escapeHTML(actionText)}
                    </button>

                </div>

            </div>
        `;

        document.body.appendChild(
            dialog
        );

        document
            .getElementById(
                "student-social-dialog-cancel"
            )
            ?.addEventListener(
                "click",
                function () {

                    dialog.remove();

                }
            );

        dialog.addEventListener(
            "click",
            function (event) {

                if (
                    event.target ===
                    dialog
                ) {

                    dialog.remove();

                }

            }
        );

        document
            .getElementById(
                "student-social-dialog-action"
            )
            ?.addEventListener(
                "click",
                function () {

                    onAction(dialog);

                }
            );
    }


    /* =====================================================
       نافذة التعليقات
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
                height:min(80vh,680px);
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

        await loadCurrentUser();

        if (!getUserId()) {

            toast(
                "يجب تسجيل الدخول أولًا."
            );

            return;
        }

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
                data:comments,
                error
            } =
                await client
                    .from("reel_comments")
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

            const rows =
                comments || [];

            if (!rows.length) {

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


            /* Profiles */

            const userIds =
                Array.from(
                    new Set(
                        rows.map(
                            item =>
                                item.user_id
                        )
                    )
                );

            let profiles = {};

            if (userIds.length) {

                try {

                    const {
                        data:profileRows
                    } =
                        await client
                            .from("profiles")
                            .select(`
                                id,
                                full_name,
                                username,
                                avatar_url
                            `)
                            .in(
                                "id",
                                userIds
                            );

                    (profileRows || [])
                        .forEach(
                            function(profile) {

                                profiles[
                                    profile.id
                                ] =
                                    profile;
                            }
                        );

                } catch (error) {

                    console.warn(
                        "Profiles skipped:",
                        error
                    );
                }
            }


            /* Comment Likes */

            const commentIds =
                rows.map(
                    item =>
                        item.id
                );

            let likesMap = {};
            let myLikes = {};

            if (commentIds.length) {

                try {

                    const {
                        data:likeRows
                    } =
                        await client
                            .from(
                                "reel_comment_likes"
                            )
                            .select(`
                                comment_id,
                                user_id
                            `)
                            .in(
                                "comment_id",
                                commentIds
                            );

                    (likeRows || [])
                        .forEach(
                            function(like) {

                                const id =
                                    like.comment_id;

                                likesMap[id] =
                                    (
                                        likesMap[id] ||
                                        0
                                    ) + 1;

                                if (
                                    String(
                                        like.user_id
                                    ) ===
                                    String(
                                        getUserId()
                                    )
                                ) {

                                    myLikes[id] =
                                        true;
                                }

                            }
                        );

                } catch (error) {

                    console.warn(
                        "Comment likes skipped:",
                        error
                    );
                }
            }


            /* Render */

            list.innerHTML =
                rows
                    .map(
                        function(comment) {

                            const profile =
                                profiles[
                                    comment.user_id
                                ] || {};

                            const name =
                                profile.username ||
                                profile.full_name ||
                                "مستخدم";

                            const mine =
                                String(
                                    comment.user_id
                                ) ===
                                String(
                                    getUserId()
                                );

                            const liked =
                                !!myLikes[
                                    comment.id
                                ];

                            const likeCount =
                                likesMap[
                                    comment.id
                                ] || 0;

                            const avatar =
                                profile.avatar_url
                                    ? `
                                        <img
                                            src="${escapeHTML(
                                                profile.avatar_url
                                            )}"
                                            alt=""
                                            data-comment-profile
                                            style="
                                                width:40px;
                                                height:40px;
                                                border-radius:50%;
                                                object-fit:cover;
                                                flex-shrink:0;
                                            "
                                        >
                                      `
                                    : `
                                        <div
                                            data-comment-profile
                                            style="
                                            width:40px;
                                            height:40px;
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

                            return `

                                <div
                                    data-social-comment
                                    data-comment-id="${escapeHTML(
                                        comment.id
                                    )}"
                                    data-comment-user-id="${escapeHTML(comment.user_id)}"
                                    data-comment-username="${escapeHTML(name)}"
                                    style="
                                        display:flex;
                                        gap:10px;
                                        padding:12px 3px;
                                    "
                                >

                                    ${avatar}

                                    <div style="
                                        flex:1;
                                        min-width:0;
                                    ">

                                        <div
                                            data-comment-profile
                                            style="
                                            font-size:13px;
                                            font-weight:800;
                                            cursor:pointer;
                                        ">
                                            @${escapeHTML(
                                                name
                                            )}
                                        </div>


                                        <div
                                            data-comment-text
                                            style="
                                                margin-top:4px;
                                                color:#444;
                                                font-size:13px;
                                                line-height:1.7;
                                                white-space:pre-wrap;
                                                word-break:break-word;
                                            "
                                        >
                                            ${escapeHTML(
                                                comment.content
                                            )}
                                        </div>


                                        <div style="
                                            display:flex;
                                            align-items:center;
                                            gap:13px;
                                            margin-top:8px;
                                        ">

                                            <button
                                                type="button"
                                                data-comment-like
                                                style="
                                                    border:0;
                                                    background:transparent;
                                                    padding:0;
                                                    cursor:pointer;
                                                    color:${
                                                        liked
                                                            ? "#ff3040"
                                                            : "#777"
                                                    };
                                                "
                                            >

                                                <i class="
                                                    ${
                                                        liked
                                                            ? "fa-solid"
                                                            : "fa-regular"
                                                    }
                                                    fa-heart
                                                "></i>

                                                <span
                                                    data-comment-like-count
                                                >
                                                    ${likeCount}
                                                </span>

                                            </button>

                                            <button
                                                type="button"
                                                data-comment-reply
                                                style="
                                                    border:0;
                                                    background:transparent;
                                                    color:#555;
                                                    cursor:pointer;
                                                    padding:0;
                                                    font-weight:700;
                                                "
                                            >
                                                رد
                                            </button>


                                            ${
                                                mine
                                                    ? `
                                                        <button
                                                            type="button"
                                                            data-comment-edit
                                                            style="
                                                                border:0;
                                                                background:transparent;
                                                                color:#777;
                                                                cursor:pointer;
                                                                padding:0;
                                                            "
                                                        >
                                                            ✏️ تعديل
                                                        </button>


                                                        <button
                                                            type="button"
                                                            data-comment-delete
                                                            style="
                                                                border:0;
                                                                background:transparent;
                                                                color:#d93025;
                                                                cursor:pointer;
                                                                padding:0;
                                                            "
                                                        >
                                                            🗑️ حذف
                                                        </button>
                                                      `
                                                    : ""
                                            }

                                        </div>


                                        <div style="
                                            margin-top:5px;
                                            color:#999;
                                            font-size:10px;
                                        ">
                                            ${formatDate(
                                                comment.created_at
                                            )}
                                        </div>

                                    </div>

                                </div>
                            `;
                        }
                    )
                    .join("");


            bindCommentActions(
                reelId
            );


        } catch (error) {

            console.error(
                "Comments error:",
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
       Bind comment actions
    ===================================================== */

    function bindCommentActions(
        reelId
    ) {

        const list =
            document.getElementById(
                "student-social-comments-list"
            );

        if (!list) return;


        list
            .querySelectorAll(
                "[data-comment-like]"
            )
            .forEach(
                function(button) {

                    button.addEventListener(
                        "click",
                        function() {

                            const item =
                                button.closest(
                                    "[data-social-comment]"
                                );

                            toggleCommentLike(
                                item?.dataset.commentId,
                                button
                            );

                        }
                    );

                }
            );


        list
            .querySelectorAll(
                "[data-comment-edit]"
            )
            .forEach(
                function(button) {

                    button.addEventListener(
                        "click",
                        function() {

                            const item =
                                button.closest(
                                    "[data-social-comment]"
                                );

                            openEditComment(
                                item
                            );

                        }
                    );

                }
            );


        list
            .querySelectorAll("[data-comment-reply]")
            .forEach(function(button) {
                button.addEventListener("click", function() {
                    const item = button.closest("[data-social-comment]");
                    const username = item?.dataset.commentUsername || "";
                    const input = document.getElementById("student-social-comments-input");
                    if (!input) return;
                    input.value = username ? `@${username} ` : "";
                    input.focus();
                    input.setSelectionRange(input.value.length, input.value.length);
                });
            });

        list
            .querySelectorAll("[data-comment-profile]")
            .forEach(function(element) {
                element.addEventListener("click", function() {
                    const item = element.closest("[data-social-comment]");
                    const userId = item?.dataset.commentUserId;
                    window.StudentReelsUsers?.openProfileByUserId?.(userId);
                });
            });


        list
            .querySelectorAll(
                "[data-comment-delete]"
            )
            .forEach(
                function(button) {

                    button.addEventListener(
                        "click",
                        function() {

                            const item =
                                button.closest(
                                    "[data-social-comment]"
                                );

                            deleteComment(
                                item?.dataset.commentId,
                                reelId
                            );

                        }
                    );

                }
            );
    }


    /* =====================================================
       إعجاب التعليق
    ===================================================== */

    async function toggleCommentLike(
        commentId,
        button
    ) {

        const client =
            getSupabase();

        const userId =
            getUserId();

        if (
            !client ||
            !userId ||
            !commentId
        ) {

            toast(
                "يجب تسجيل الدخول أولًا."
            );

            return;
        }

        button.disabled =
            true;

        try {

            const {
                data:existing
            } =
                await client
                    .from(
                        "reel_comment_likes"
                    )
                    .select(
                        "comment_id"
                    )
                    .eq(
                        "comment_id",
                        commentId
                    )
                    .eq(
                        "user_id",
                        userId
                    )
                    .maybeSingle();


            if (existing) {

                const {
                    error
                } =
                    await client
                        .from(
                            "reel_comment_likes"
                        )
                        .delete()
                        .eq(
                            "comment_id",
                            commentId
                        )
                        .eq(
                            "user_id",
                            userId
                        );

                if (error) {
                    throw error;
                }

            } else {

                const {
                    error
                } =
                    await client
                        .from(
                            "reel_comment_likes"
                        )
                        .insert({

                            comment_id:
                                commentId,

                            user_id:
                                userId

                        });

                if (error) {
                    throw error;
                }
            }


            const {
                count:totalLikes
            } =
                await client
                    .from(
                        "reel_comment_likes"
                    )
                    .select(
                        "comment_id",
                        {
                            count:
                                "exact",
                            head:
                                true
                        }
                    )
                    .eq(
                        "comment_id",
                        commentId
                    );


            const {
                data:currentLike
            } =
                await client
                    .from(
                        "reel_comment_likes"
                    )
                    .select(
                        "comment_id"
                    )
                    .eq(
                        "comment_id",
                        commentId
                    )
                    .eq(
                        "user_id",
                        userId
                    )
                    .maybeSingle();


            const liked =
                !!currentLike;


            const icon =
                button.querySelector(
                    "i"
                );

            const counter =
                button.querySelector(
                    "[data-comment-like-count]"
                );


            button.style.color =
                liked
                    ? "#ff3040"
                    : "#777";


            if (icon) {

                icon.classList.toggle(
                    "fa-solid",
                    liked
                );

                icon.classList.toggle(
                    "fa-regular",
                    !liked
                );
            }


            if (counter) {

                counter.textContent =
                    String(
                        totalLikes || 0
                    );
            }


        } catch (error) {

            console.error(
                "Comment like error:",
                error
            );

            toast(
                error?.message ||
                "تعذر تحديث إعجاب التعليق."
            );

        } finally {

            button.disabled =
                false;
        }
    }


    /* =====================================================
       تعديل التعليق
    ===================================================== */

    function openEditComment(
        element
    ) {

        if (!element) {
            return;
        }


        const textElement =
            element.querySelector(
                "[data-comment-text]"
            );


        const oldText =
            textElement?.textContent.trim() ||
            "";


        showSocialDialog(
            "تعديل التعليق",

            `
            <textarea
                id="student-social-edit-input"
                maxlength="1000"
                style="
                    width:100%;
                    min-height:115px;
                    box-sizing:border-box;
                    border:1px solid #ddd;
                    border-radius:14px;
                    padding:13px;
                    resize:none;
                    outline:none;
                    font-size:14px;
                "
            >${escapeHTML(
                oldText
            )}</textarea>
            `,

            "حفظ",

            `
            background:#0095f6;
            color:#fff;
            `,

            async function(dialog) {

                const input =
                    dialog.querySelector(
                        "#student-social-edit-input"
                    );


                const content =
                    input?.value.trim();


                if (!content) {

                    toast(
                        "التعليق لا يمكن أن يكون فارغًا."
                    );

                    return;
                }


                dialog.remove();


                await updateComment(
                    element.dataset.commentId,
                    content
                );

            }
        );
    }


    async function updateComment(
        commentId,
        content
    ) {

        const client =
            getSupabase();

        const userId =
            getUserId();

        if (
            !client ||
            !userId
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
                    .update({

                        content:
                            content,

                        updated_at:
                            new Date().toISOString()

                    })
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


            const box =
                document.getElementById(
                    "student-social-comments"
                );


            const reelId =
                box?.dataset.reelId;


            await loadComments(
                reelId
            );


            toast(
                "تم تعديل التعليق."
            );


        } catch (error) {

            console.error(
                "Update comment error:",
                error
            );


            toast(
                error?.message ||
                "تعذر تعديل التعليق."
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

        showSocialDialog(
            "حذف التعليق",

            `
            <div style="
                color:#666;
                line-height:1.8;
            ">
                هل أنت متأكد من حذف هذا التعليق؟
            </div>
            `,

            "حذف",

            `
            background:#d93025;
            color:#fff;
            `,

            async function(dialog) {

                dialog.remove();


                const client =
                    getSupabase();

                const userId =
                    getUserId();


                if (
                    !client ||
                    !userId
                ) {

                    toast(
                        "يجب تسجيل الدخول أولًا."
                    );

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


                    await updateReelCommentCount(
                        reelId
                    );


                    toast(
                        "تم حذف التعليق."
                    );


                } catch (error) {

                    console.error(
                        "Delete comment error:",
                        error
                    );


                    toast(
                        error?.message ||
                        "تعذر حذف التعليق."
                    );
                }

            }
        );
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

        const userId =
            getUserId();


        if (
            !client ||
            !userId
        ) {

            toast(
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


            input.value =
                "";


            await loadComments(
                reelId
            );


            await updateReelCommentCount(
                reelId
            );


        } catch (error) {

            console.error(
                "Add comment error:",
                error
            );


            toast(
                error?.message ||
                "تعذر نشر التعليق."
            );
        }
    }


    /* =====================================================
       عداد التعليقات
    ===================================================== */

    async function updateReelCommentCount(
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
                        head:
                            true
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
                String(
                    count || 0
                );
        }
    }


    /* =====================================================
       إعجاب الـReel
    ===================================================== */

    async function toggleReelLike(
        reelId,
        button
    ) {

        const client =
            getSupabase();

        const userId =
            getUserId();


        if (
            !client ||
            !userId
        ) {

            toast(
                "يجب تسجيل الدخول أولًا."
            );

            return;
        }


        button.disabled =
            true;


        try {

            const {
                data:existing
            } =
                await client
                    .from(
                        "reel_likes"
                    )
                    .select(
                        "reel_id"
                    )
                    .eq(
                        "reel_id",
                        reelId
                    )
                    .eq(
                        "user_id",
                        userId
                    )
                    .maybeSingle();


            if (existing) {

                const {
                    error
                } =
                    await client
                        .from(
                            "reel_likes"
                        )
                        .delete()
                        .eq(
                            "reel_id",
                            reelId
                        )
                        .eq(
                            "user_id",
                            userId
                        );


                if (error) {
                    throw error;
                }

            } else {

                const {
                    error
                } =
                    await client
                        .from(
                            "reel_likes"
                        )
                        .insert({

                            reel_id:
                                reelId,

                            user_id:
                                userId

                        });


                if (error) {
                    throw error;
                }
            }


            const {
                count:totalLikes
            } =
                await client
                    .from(
                        "reel_likes"
                    )
                    .select(
                        "reel_id",
                        {
                            count:
                                "exact",
                            head:
                                true
                        }
                    )
                    .eq(
                        "reel_id",
                        reelId
                    );


            const {
                data:likedRow
            } =
                await client
                    .from(
                        "reel_likes"
                    )
                    .select(
                        "reel_id"
                    )
                    .eq(
                        "reel_id",
                        reelId
                    )
                    .eq(
                        "user_id",
                        userId
                    )
                    .maybeSingle();


            const liked =
                !!likedRow;


            const icon =
                button.querySelector(
                    "i"
                );


            const slide =
                button.closest(
                    ".student-reel"
                );


            const counter =
                slide?.querySelector(
                    "[data-like-count]"
                );


            button.classList.toggle(
                "active",
                liked
            );


            if (icon) {

                icon.classList.toggle(
                    "fa-solid",
                    liked
                );

                icon.classList.toggle(
                    "fa-regular",
                    !liked
                );
            }


            if (counter) {

                counter.textContent =
                    String(
                        totalLikes || 0
                    );
            }


        } catch (error) {

            console.error(
                "Reel like error:",
                error
            );


            toast(
                error?.message ||
                "تعذر تحديث الإعجاب."
            );


        } finally {

            button.disabled =
                false;
        }
    }


    /* =====================================================
       مشاركة
    ===================================================== */

    async function shareReel(
        reelId
    ) {

        const url =
            `${location.origin}${location.pathname}#reel=${reelId}`;


        if (
            navigator.share
        ) {

            try {

                await navigator.share({

                    title:
                        "Student Reel",

                    text:
                        "شاهد هذا الـReel",

                    url:
                        url

                });

                return;

            } catch (error) {}
        }


        try {

            await navigator.clipboard.writeText(
                url
            );


            toast(
                "تم نسخ رابط الـReel."
            );


        } catch (error) {

            toast(
                "تعذر نسخ الرابط."
            );
        }
    }


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


    window.StudentReelsSocial.toggleReelLike =
        toggleReelLike;


    window.StudentReelsSocial.shareReel =
        shareReel;


    /* =====================================================
       تشغيل
    ===================================================== */

    loadCurrentUser();


    /* =====================================================
       اعتراض أزرار Reels
    ===================================================== */

    document.addEventListener(
        "click",
        function (event) {

            const commentButton =
                event.target.closest(
                    "[data-comments]"
                );


            if (commentButton) {

                const reel =
                    commentButton.closest(
                        ".student-reel"
                    );


                const reelId =
                    reel?.dataset.id;


                if (reelId) {

                    event.preventDefault();
                    event.stopImmediatePropagation();


                    openComments(
                        reelId
                    );

                    return;
                }
            }


            const likeButton =
                event.target.closest(
                    "[data-like]"
                );


            if (likeButton) {

                const reel =
                    likeButton.closest(
                        ".student-reel"
                    );


                const reelId =
                    reel?.dataset.id;


                if (reelId) {

                    event.preventDefault();
                    event.stopImmediatePropagation();


                    toggleReelLike(
                        reelId,
                        likeButton
                    );

                    return;
                }
            }


            const shareButton =
                event.target.closest(
                    "[data-share]"
                );


            if (shareButton) {

                const reel =
                    shareButton.closest(
                        ".student-reel"
                    );


                const reelId =
                    reel?.dataset.id;


                if (reelId) {

                    event.preventDefault();
                    event.stopImmediatePropagation();


                    shareReel(
                        reelId
                    );

                    return;
                }
            }

        },
        true
    );


})();
