/* =========================================================
   Student - Reels Social
   ❤️ إعجاب الـReel
   💬 التعليقات
   ❤️ إعجاب التعليق
   ✏️ تعديل التعليق
   🗑️ حذف التعليق
   ↗️ مشاركة الـReel
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


            socialUserId =
                null;


            return null;
        }
    }


    function getUserId() {

        return socialUserId;
    }


    /* =====================================================
       HTML Protection
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
       Toast
    ===================================================== */

    function toast(
        message
    ) {

        const element =
            document.createElement(
                "div"
            );


        element.textContent =
            message;


        element.style.cssText = `
            position:fixed;
            left:50%;
            bottom:30px;
            transform:translateX(-50%);
            z-index:100000200;
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
       Comments Box
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
                border-radius:
                    24px 24px 0 0;
                display:flex;
                flex-direction:column;
                overflow:hidden;
            ">

                <div style="
                    display:flex;
                    align-items:center;
                    gap:10px;
                    padding:15px;
                    border-bottom:
                        1px solid #eee;
                    flex-shrink:0;
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
                        border-top:
                            1px solid #eee;
                        flex-shrink:0;
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
       Open Comments
    ===================================================== */

    async function openComments(
        reelId
    ) {

        const client =
            getSupabase();


        if (!client) {

            toast(
                "الخدمة غير متاحة."
            );

            return;
        }


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
       Load Comments
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
                        created_at,
                        updated_at
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


            /* ============================================
               Profiles
            ============================================ */

            const userIds =
                Array.from(
                    new Set(
                        comments.map(
                            item =>
                                item.user_id
                        )
                    )
                );


            let profiles = {};


            if (userIds.length) {

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
                                userIds
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
                        "Profiles unavailable:",
                        profileError
                    );
                }
            }


            /* ============================================
               Comment Likes
            ============================================ */

            const commentIds =
                comments.map(
                    item =>
                        item.id
                );


            let likesMap = {};
            let myLikes = {};


            if (commentIds.length) {

                try {

                    const {
                        data:
                            likes
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


                    (likes || [])
                        .forEach(
                            function(like) {

                                const id =
                                    like.comment_id;


                                if (
                                    !likesMap[id]
                                ) {

                                    likesMap[id] =
                                        0;
                                }


                                likesMap[id]++;


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

                } catch (likeError) {

                    console.warn(
                        "Comment likes unavailable:",
                        likeError
                    );
                }
            }


            /* ============================================
               Render
            ============================================ */

            list.innerHTML =
                comments
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
                                        <div style="
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

                                        <div style="
                                            font-size:13px;
                                            font-weight:800;
                                            color:#222;
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
                                            gap:14px;
                                            margin-top:7px;
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
                "Comments load error:",
                error
            );


            list.innerHTML = `
                <div style="
                    padding:40px 15px;
                    text-align:center;
                    color:#d93025;
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

                            const comment =
                                button.closest(
                                    "[data-social-comment]"
                                );


                            toggleCommentLike(
                                comment?.dataset.commentId,
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

                            const comment =
                                button.closest(
                                    "[data-social-comment]"
                                );


                            openEditComment(
                                comment
                            );

                        }
                    );
                }
            );


        list
            .querySelectorAll(
                "[data-comment-delete]"
            )
            .forEach(
                function(button) {

                    button.addEventListener(
                        "click",
                        function() {

                            const comment =
                                button.closest(
                                    "[data-social-comment]"
                                );


                            deleteComment(
                                comment?.dataset.commentId,
                                reelId
                            );

                        }
                    );
                }
            );
    }


    /* =====================================================
       Comment Like
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
                count
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
                data:nowLiked
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
                !!nowLiked;


            const icon =
                button.querySelector(
                    "i"
                );


            const count =
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


            if (count) {

                count.textContent =
                    count === null
                        ? 0
                        : count;

            }


            const countElement =
                button.querySelector(
                    "[data-comment-like-count]"
                );


            if (countElement) {

                countElement.textContent =
                    String(
                        count || 0
                    );
            }


        } catch (error) {

            console.error(
                "Comment like error:",
                error
            );


            toast(
                "تعذر تحديث إعجاب التعليق."
            );


        } finally {

            button.disabled =
                false;
        }
    }


    /* =====================================================
       Edit Comment
    ===================================================== */

    function openEditComment(
        commentElement
    ) {

        if (!commentElement) {
            return;
        }


        const textElement =
            commentElement.querySelector(
                "[data-comment-text]"
            );


        const oldText =
            textElement?.textContent.trim() ||
            "";


        const value =
            prompt(
                "تعديل التعليق:",
                oldText
            );


        if (
            value ===
            null
        ) {
            return;
        }


        const content =
            value.trim();


        if (!content) {

            toast(
                "التعليق لا يمكن أن يكون فارغًا."
            );

            return;
        }


        updateComment(
            commentElement.dataset.commentId,
            content
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
                "Edit comment error:",
                error
            );


            toast(
                "تعذر تعديل التعليق."
            );
        }
    }


    /* =====================================================
       Delete Comment
    ===================================================== */

    async function deleteComment(
        commentId,
        reelId
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


            updateReelCommentCount(
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
                "تعذر حذف التعليق."
            );
        }
    }


    /* =====================================================
       Add Comment
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


            updateReelCommentCount(
                reelId
            );


        } catch (error) {

            console.error(
                "Add comment error:",
                error
            );


            toast(
                "تعذر نشر التعليق."
            );
        }
    }


    /* =====================================================
       Reel Comment Count
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
       Reel Like
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
                count:likeCount
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
                        likeCount || 0
                    );
            }


        } catch (error) {

            console.error(
                "Reel like error:",
                error
            );


            toast(
                "تعذر تحديث الإعجاب."
            );


        } finally {

            button.disabled =
                false;
        }
    }


    /* =====================================================
       Share
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
       Initialize
    ===================================================== */

    loadCurrentUser();


    /* =====================================================
       Capture Reels buttons
    ===================================================== */

    document.addEventListener(
        "click",
        function (event) {

            /* Comments */

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


            /* Like */

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


            /* Share */

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
