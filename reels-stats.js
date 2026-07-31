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
            } =
                await client.auth.getUser();

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
            z-index:100001000;
            background:#222;
            color:#fff;
            padding:11px 16px;
            border-radius:12px;
            font-size:13px;
            direction:rtl;
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
       نافذة الإحصائيات
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


    function showStatsDialog(
        title,
        content
    ) {

        closeStats();

        const dialog =
            document.createElement("div");

        dialog.id =
            "student-reels-stats-dialog";

        dialog.style.cssText = `
            position:fixed;
            inset:0;
            z-index:100000900;
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
                border-radius:24px;
                padding:20px;
                box-sizing:border-box;
                box-shadow:0 20px 70px rgba(0,0,0,.3);
            ">

                <div style="
                    display:flex;
                    align-items:center;
                    gap:10px;
                    margin-bottom:18px;
                ">

                    <strong style="
                        flex:1;
                        font-size:20px;
                    ">
                        ${escapeHTML(title)}
                    </strong>

                    <button
                        id="student-stats-close"
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

                ${content}

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
    }


    /* =====================================================
       جلب الإحصائيات
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
                reelResult.data?.created_at || null,

            visibility:
                reelResult.data?.visibility ||
                "public"
        };
    }


    /* =====================================================
       عرض الإحصائيات
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
                String(reel.user_id) !==
                String(statsUserId)
            ) {

                toast(
                    "الإحصائيات متاحة لصاحب الـReel فقط."
                );

                return;
            }


            showStatsDialog(
                "إحصائيات الـReel",
                `
                <div style="
                    display:grid;
                    grid-template-columns:1fr 1fr;
                    gap:10px;
                ">

                    ${statCard(
                        "👁️",
                        "المشاهدات",
                        "..."
                    )}

                    ${statCard(
                        "❤️",
                        "الإعجابات",
                        "..."
                    )}

                    ${statCard(
                        "💬",
                        "التعليقات",
                        "..."
                    )}

                    ${statCard(
                        "🔖",
                        "المحفوظات",
                        "..."
                    )}

                </div>

                <div
                    id="student-stats-extra"
                    style="
                        margin-top:15px;
                    "
                >
                    جاري تحميل التفاصيل...
                </div>
                `
            );


            const stats =
                await getStats(
                    reelId
                );


            setStatValue(
                "المشاهدات",
                stats.views
            );

            setStatValue(
                "الإعجابات",
                stats.likes
            );

            setStatValue(
                "التعليقات",
                stats.comments
            );

            setStatValue(
                "المحفوظات",
                stats.saves
            );


            const visibility =
                stats.visibility ===
                "private"
                    ? "خاص"
                    : stats.visibility ===
                      "followers"
                        ? "المتابعون"
                        : "عام";


            const created =
                stats.createdAt
                    ? new Date(
                        stats.createdAt
                    ).toLocaleString(
                        "ar-IQ"
                    )
                    : "غير معروف";


            const extra =
                document.getElementById(
                    "student-stats-extra"
                );


            if (extra) {

                extra.innerHTML = `

                    <div style="
                        background:#f7f8fa;
                        border-radius:15px;
                        padding:14px;
                    ">

                        <div style="
                            display:flex;
                            justify-content:space-between;
                            gap:10px;
                            padding:7px 0;
                        ">

                            <span>
                                الخصوصية
                            </span>

                            <strong>
                                ${escapeHTML(
                                    visibility
                                )}
                            </strong>

                        </div>


                        <div style="
                            display:flex;
                            justify-content:space-between;
                            gap:10px;
                            padding:7px 0;
                        ">

                            <span>
                                تاريخ النشر
                            </span>

                            <strong style="
                                font-size:12px;
                            ">
                                ${escapeHTML(
                                    created
                                )}
                            </strong>

                        </div>

                    </div>
                `;
            }

        } catch (error) {

            console.error(
                "Stats error:",
                error
            );

            toast(
                error?.message ||
                "تعذر تحميل الإحصائيات."
            );
        }
    }


    function statCard(
        icon,
        title,
        value
    ) {

        return `
            <div
                data-stat-card="${escapeHTML(
                    title
                )}"
                style="
                    background:#f7f8fa;
                    border-radius:18px;
                    padding:18px 12px;
                    text-align:center;
                "
            >

                <div style="
                    font-size:26px;
                ">
                    ${icon}
                </div>

                <div style="
                    margin-top:7px;
                    color:#777;
                    font-size:12px;
                ">
                    ${escapeHTML(title)}
                </div>

                <strong
                    data-stat-value="${escapeHTML(
                        title
                    )}"
                    style="
                        display:block;
                        margin-top:5px;
                        font-size:22px;
                    "
                >
                    ${escapeHTML(value)}
                </strong>

            </div>
        `;
    }


    function setStatValue(
        title,
        value
    ) {

        const element =
            document.querySelector(
                `[data-stat-value="${CSS.escape(
                    title
                )}"]`
            );

        if (element) {

            element.textContent =
                String(value);
        }
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

                    /*
                       نبحث عن قائمة المالك.
                    */

                    const menu =
                        reel.querySelector(
                            "[data-menu]"
                        );


                    if (!menu) {
                        return;
                    }


                    /*
                       إذا كان زر الإحصائيات
                       موجودًا فلا نكرر إضافته.
                    */

                    if (
                        menu.querySelector(
                            "[data-stats]"
                        )
                    ) {
                        return;
                    }


                    /*
                       لا نضيفه إلا إذا كانت
                       قائمة المالك تحتوي
                       تعديل/خصوصية/حذف.
                    */

                    const isOwner =
                        !!menu.querySelector(
                            "[data-edit], [data-privacy], [data-delete]"
                        );


                    if (!isOwner) {
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
       زر الإحصائيات
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
       مراقبة DOM
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
       Start
    ===================================================== */

    async function start() {

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
            start
        );

    } else {

        start();
    }

})();
