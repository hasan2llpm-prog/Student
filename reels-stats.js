/* =========================================================
   Student - Reels Stats
   📊 إحصائيات الـReel
========================================================= */

(function () {

    "use strict";

    if (window.__studentReelsStatsLoaded) {
        return;
    }

    window.__studentReelsStatsLoaded = true;

    let statsUserId = null;


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


    async function loadUser() {

        const client = getSupabase();

        if (!client) {
            statsUserId = null;
            return null;
        }

        try {

            const {
                data: {
                    user
                }
            } = await client.auth.getUser();

            statsUserId =
                user?.id || null;

            return user || null;

        } catch (error) {

            console.error(
                "Stats auth error:",
                error
            );

            statsUserId = null;

            return null;
        }
    }


    /* =====================================================
       حماية
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
                "student-stats-toast"
            );

        if (old) {
            old.remove();
        }

        const element =
            document.createElement("div");

        element.id =
            "student-stats-toast";

        element.textContent =
            message;

        element.style.cssText = `
            position:fixed;
            left:50%;
            bottom:30px;
            transform:translateX(-50%);
            z-index:100001500;
            background:#111;
            color:#fff;
            padding:12px 18px;
            border-radius:14px;
            font-size:13px;
            direction:rtl;
            box-shadow:0 10px 35px rgba(0,0,0,.25);
        `;

        document.body.appendChild(element);

        setTimeout(
            function () {
                element.remove();
            },
            2200
        );
    }


    /* =====================================================
       CSS
    ===================================================== */

    function injectStyles() {

        if (
            document.getElementById(
                "student-reels-stats-style"
            )
        ) {
            return;
        }

        const style =
            document.createElement("style");

        style.id =
            "student-reels-stats-style";

        style.textContent = `

            #student-reels-stats-dialog {
                position:fixed;
                inset:0;
                z-index:100001400;
                display:flex;
                align-items:center;
                justify-content:center;
                padding:18px;
                background:rgba(0,0,0,.58);
                backdrop-filter:blur(6px);
                direction:rtl;
                box-sizing:border-box;
            }

            .student-stats-card {
                width:100%;
                max-width:470px;
                max-height:92vh;
                overflow:hidden;
                background:#fff;
                border-radius:28px;
                box-shadow:
                    0 25px 80px
                    rgba(0,0,0,.30);
                display:flex;
                flex-direction:column;
                animation:
                    studentStatsIn
                    .22s
                    ease-out;
            }

            @keyframes studentStatsIn {

                from {
                    opacity:0;
                    transform:
                        translateY(15px)
                        scale(.97);
                }

                to {
                    opacity:1;
                    transform:
                        translateY(0)
                        scale(1);
                }
            }

            .student-stats-header {
                padding:18px 18px 14px;
                display:flex;
                align-items:center;
                gap:12px;
                border-bottom:
                    1px solid #f0f0f0;
                flex-shrink:0;
            }

            .student-stats-header-title {
                flex:1;
            }

            .student-stats-header-title strong {
                display:block;
                font-size:20px;
                color:#111;
                font-weight:800;
            }

            .student-stats-header-title span {
                display:block;
                margin-top:4px;
                font-size:12px;
                color:#999;
            }

            .student-stats-close {
                width:40px;
                height:40px;
                border:0;
                border-radius:50%;
                background:#f3f4f6;
                color:#222;
                font-size:22px;
                cursor:pointer;
                display:flex;
                align-items:center;
                justify-content:center;
            }

            .student-stats-body {
                padding:18px;
                overflow-y:auto;
            }

            .student-stats-grid {
                display:grid;
                grid-template-columns:
                    repeat(2, minmax(0, 1fr));
                gap:12px;
            }

            .student-stat-item {
                position:relative;
                min-height:125px;
                border-radius:20px;
                padding:16px;
                box-sizing:border-box;
                background:#f8fafc;
                border:1px solid #edf0f3;
                display:flex;
                flex-direction:column;
                justify-content:space-between;
            }

            .student-stat-icon {
                width:42px;
                height:42px;
                border-radius:14px;
                display:flex;
                align-items:center;
                justify-content:center;
                font-size:19px;
                background:#fff;
                box-shadow:
                    0 4px 14px
                    rgba(0,0,0,.06);
            }

            .student-stat-title {
                margin-top:12px;
                color:#80868b;
                font-size:12px;
                font-weight:600;
            }

            .student-stat-number {
                margin-top:3px;
                color:#111;
                font-size:27px;
                line-height:1;
                font-weight:900;
            }

            .student-stats-section {
                margin-top:16px;
                padding:16px;
                border-radius:20px;
                background:#f8fafc;
                border:1px solid #edf0f3;
            }

            .student-stats-section-title {
                font-size:14px;
                font-weight:800;
                color:#222;
                margin-bottom:10px;
            }

            .student-stats-row {
                min-height:44px;
                display:flex;
                align-items:center;
                justify-content:space-between;
                gap:12px;
                border-bottom:1px solid #e9edf1;
            }

            .student-stats-row:last-child {
                border-bottom:0;
            }

            .student-stats-row-label {
                color:#777;
                font-size:13px;
            }

            .student-stats-row-value {
                color:#222;
                font-size:13px;
                font-weight:800;
                text-align:left;
            }

            .student-stats-footer {
                padding:14px 18px 18px;
                border-top:1px solid #f0f0f0;
                flex-shrink:0;
            }

            .student-stats-close-button {
                width:100%;
                border:0;
                padding:13px;
                border-radius:14px;
                background:#111;
                color:#fff;
                cursor:pointer;
                font-size:14px;
                font-weight:800;
            }

            @media (max-width:480px) {

                #student-reels-stats-dialog {
                    padding:0;
                    align-items:flex-end;
                }

                .student-stats-card {
                    max-width:none;
                    max-height:90vh;
                    border-radius:
                        26px 26px 0 0;
                }
            }
        `;

        document.head.appendChild(
            style
        );
    }


    /* =====================================================
       إغلاق
    ===================================================== */

    function closeStats() {

        const dialog =
            document.getElementById(
                "student-reels-stats-dialog"
            );

        if (dialog) {
            dialog.remove();
        }
    }


    /* =====================================================
       الإحصائيات
    ===================================================== */

    async function getStats(
        reelId
    ) {

        const client =
            getSupabase();

        if (!client) {
            throw new Error(
                "Supabase غير متاح."
            );
        }


        const [
            viewsResult,
            likesResult,
            commentsResult,
            savesResult,
            reelResult
        ] =
            await Promise.all([

                client
                    .from("reel_views")
                    .select(
                        "reel_id",
                        {
                            count:"exact",
                            head:true
                        }
                    )
                    .eq(
                        "reel_id",
                        reelId
                    ),

                client
                    .from("reel_likes")
                    .select(
                        "reel_id",
                        {
                            count:"exact",
                            head:true
                        }
                    )
                    .eq(
                        "reel_id",
                        reelId
                    ),

                client
                    .from("reel_comments")
                    .select(
                        "id",
                        {
                            count:"exact",
                            head:true
                        }
                    )
                    .eq(
                        "reel_id",
                        reelId
                    ),

                client
                    .from("saved_items")
                    .select(
                        "id",
                        {
                            count:"exact",
                            head:true
                        }
                    )
                    .eq(
                        "content_type",
                        "reel"
                    )
                    .eq(
                        "content_id",
                        String(reelId)
                    ),

                client
                    .from("reels")
                    .select(`
                        id,
                        user_id,
                        created_at,
                        visibility
                    `)
                    .eq(
                        "id",
                        reelId
                    )
                    .maybeSingle()
            ]);


        if (viewsResult.error) {
            throw viewsResult.error;
        }

        if (likesResult.error) {
            throw likesResult.error;
        }

        if (commentsResult.error) {
            throw commentsResult.error;
        }

        if (savesResult.error) {
            throw savesResult.error;
        }

        if (reelResult.error) {
            throw reelResult.error;
        }


        return {

            views:
                viewsResult.count || 0,

            likes:
                likesResult.count || 0,

            comments:
                commentsResult.count || 0,

            saves:
                savesResult.count || 0,

            createdAt:
                reelResult.data?.created_at ||
                null,

            visibility:
                reelResult.data?.visibility ||
                "public"
        };
    }


    /* =====================================================
       بطاقة إحصائية
    ===================================================== */

    function statCard(
        icon,
        title,
        value,
        id
    ) {

        return `
            <div
                class="student-stat-item"
            >

                <div
                    class="student-stat-icon"
                >
                    ${icon}
                </div>

                <div>

                    <div
                        class="student-stat-title"
                    >
                        ${escapeHTML(title)}
                    </div>

                    <div
                        id="${escapeHTML(id)}"
                        class="student-stat-number"
                    >
                        ${escapeHTML(value)}
                    </div>

                </div>

            </div>
        `;
    }


    /* =====================================================
       عرض النافذة
    ===================================================== */

    function renderStatsDialog() {

        const dialog =
            document.createElement("div");

        dialog.id =
            "student-reels-stats-dialog";

        dialog.innerHTML = `

            <div
                class="student-stats-card"
            >

                <div
                    class="student-stats-header"
                >

                    <div
                        class="student-stats-header-title"
                    >

                        <strong>
                            إحصائيات الـReel
                        </strong>

                        <span>
                            أداء المحتوى الخاص بك
                        </span>

                    </div>


                    <button
                        type="button"
                        class="student-stats-close"
                        id="student-stats-close"
                    >
                        ×
                    </button>

                </div>


                <div
                    class="student-stats-body"
                >

                    <div
                        class="student-stats-grid"
                    >

                        ${statCard(
                            "👁️",
                            "المشاهدات",
                            "—",
                            "student-stat-views"
                        )}

                        ${statCard(
                            "❤️",
                            "الإعجابات",
                            "—",
                            "student-stat-likes"
                        )}

                        ${statCard(
                            "💬",
                            "التعليقات",
                            "—",
                            "student-stat-comments"
                        )}

                        ${statCard(
                            "🔖",
                            "المحفوظات",
                            "—",
                            "student-stat-saves"
                        )}

                    </div>


                    <div
                        class="student-stats-section"
                    >

                        <div
                            class="student-stats-section-title"
                        >
                            معلومات الـReel
                        </div>


                        <div
                            class="student-stats-row"
                        >

                            <span
                                class="student-stats-row-label"
                            >
                                الخصوصية
                            </span>

                            <strong
                                id="student-stat-visibility"
                                class="student-stats-row-value"
                            >
                                —
                            </strong>

                        </div>


                        <div
                            class="student-stats-row"
                        >

                            <span
                                class="student-stats-row-label"
                            >
                                تاريخ النشر
                            </span>

                            <strong
                                id="student-stat-date"
                                class="student-stats-row-value"
                            >
                                —
                            </strong>

                        </div>

                    </div>


                    <div
                        class="student-stats-section"
                    >

                        <div
                            class="student-stats-section-title"
                        >
                            ملاحظة
                        </div>

                        <div style="
                            color:#888;
                            font-size:12px;
                            line-height:1.8;
                        ">
                            هذه الأرقام تعتمد على البيانات
                            المحفوظة فعليًا في قاعدة البيانات.
                            سنضيف لاحقًا الإحصائيات المتقدمة
                            مثل نسبة إكمال الفيديو ومتوسط
                            مدة المشاهدة والمشاركات.
                        </div>

                    </div>

                </div>


                <div
                    class="student-stats-footer"
                >

                    <button
                        type="button"
                        id="student-stats-close-bottom"
                        class="student-stats-close-button"
                    >
                        إغلاق
                    </button>

                </div>

            </div>
        `;

        document.body.appendChild(
            dialog
        );


        document
            .getElementById(
                "student-stats-close"
            )
            ?.addEventListener(
                "click",
                closeStats
            );


        document
            .getElementById(
                "student-stats-close-bottom"
            )
            ?.addEventListener(
                "click",
                closeStats
            );


        dialog.addEventListener(
            "click",
            function (event) {

                if (
                    event.target ===
                    dialog
                ) {
                    closeStats();
                }

            }
        );


        return dialog;
    }


    /* =====================================================
       فتح الإحصائيات
    ===================================================== */

    async function openStats(
        reelId
    ) {

        await loadUser();

        if (!statsUserId) {

            toast(
                "يجب تسجيل الدخول أولًا."
            );

            return;
        }


        const client =
            getSupabase();


        try {

            const {
                data: reel,
                error
            } =
                await client
                    .from("reels")
                    .select(`
                        id,
                        user_id,
                        created_at,
                        visibility
                    `)
                    .eq(
                        "id",
                        reelId
                    )
                    .maybeSingle();


            if (error) {
                throw error;
            }


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
                    statsUserId
                )
            ) {

                toast(
                    "الإحصائيات متاحة لصاحب الـReel فقط."
                );

                return;
            }


            renderStatsDialog();


            const stats =
                await getStats(
                    reelId
                );


            const views =
                document.getElementById(
                    "student-stat-views"
                );

            const likes =
                document.getElementById(
                    "student-stat-likes"
                );

            const comments =
                document.getElementById(
                    "student-stat-comments"
                );

            const saves =
                document.getElementById(
                    "student-stat-saves"
                );


            if (views) {
                views.textContent =
                    formatNumber(
                        stats.views
                    );
            }

            if (likes) {
                likes.textContent =
                    formatNumber(
                        stats.likes
                    );
            }

            if (comments) {
                comments.textContent =
                    formatNumber(
                        stats.comments
                    );
            }

            if (saves) {
                saves.textContent =
                    formatNumber(
                        stats.saves
                    );
            }


            const visibility =
                stats.visibility ===
                "private"
                    ? "خاص"
                    : stats.visibility ===
                      "followers"
                        ? "المتابعون"
                        : "عام";


            const visibilityElement =
                document.getElementById(
                    "student-stat-visibility"
                );


            if (visibilityElement) {

                visibilityElement.textContent =
                    visibility;
            }


            const dateElement =
                document.getElementById(
                    "student-stat-date"
                );


            if (dateElement) {

                dateElement.textContent =
                    formatDate(
                        stats.createdAt
                    );
            }


        } catch (error) {

            console.error(
                "Stats error:",
                error
            );

            closeStats();

            toast(
                error?.message ||
                "تعذر تحميل الإحصائيات."
            );
        }
    }


    /* =====================================================
       تنسيق الأرقام
    ===================================================== */

    function formatNumber(
        value
    ) {

        const number =
            Number(value || 0);

        return number.toLocaleString(
            "ar-IQ"
        );
    }


    /* =====================================================
       التاريخ
    ===================================================== */

    function formatDate(
        value
    ) {

        if (!value) {
            return "غير معروف";
        }

        const date =
            new Date(value);

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return "غير معروف";
        }

        return date.toLocaleString(
            "ar-IQ",
            {
                dateStyle:"medium",
                timeStyle:"short"
            }
        );
    }


    /* =====================================================
       إضافة زر الإحصائيات لصاحب الـReel
    ===================================================== */

    function addStatsButtons() {

        document
            .querySelectorAll(
                ".student-reel"
            )
            .forEach(
                function(reel) {

                    const menu =
                        reel.querySelector(
                            "[data-menu]"
                        );

                    if (!menu) {
                        return;
                    }


                    if (
                        menu.querySelector(
                            "[data-stats]"
                        )
                    ) {
                        return;
                    }


                    const owner =
                        !!menu.querySelector(
                            "[data-edit], [data-privacy], [data-delete]"
                        );


                    if (!owner) {
                        return;
                    }


                    const button =
                        document.createElement(
                            "button"
                        );


                    button.type =
                        "button";

                    button.dataset.stats =
                        "true";

                    button.innerHTML =
                        "📊 إحصائيات";

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


                    menu.insertBefore(
                        button,
                        menu.firstChild
                    );
                }
            );
    }


    /* =====================================================
       التقاط الزر
    ===================================================== */

    function bindStatsButtons() {

        document.addEventListener(
            "click",
            function(event) {

                const button =
                    event.target.closest(
                        ".student-reel [data-stats]"
                    );

                if (!button) {
                    return;
                }


                event.preventDefault();
                event.stopImmediatePropagation();


                const reel =
                    button.closest(
                        ".student-reel"
                    );


                const reelId =
                    reel?.dataset?.id;


                if (reelId) {

                    openStats(
                        reelId
                    );
                }

            },
            true
        );
    }


    /* =====================================================
       مراقبة العناصر الجديدة
    ===================================================== */

    function observeDOM() {

        const observer =
            new MutationObserver(
                function() {
                    addStatsButtons();
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


    /* =====================================================
       API
    ===================================================== */

    window.StudentReelsStats =
        window.StudentReelsStats ||
        {};


    window.StudentReelsStats.open =
        openStats;


    /* =====================================================
       تشغيل
    ===================================================== */

    async function start() {

        injectStyles();

        await loadUser();

        addStatsButtons();

        bindStatsButtons();

        observeDOM();
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
