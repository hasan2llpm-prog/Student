/* =========================================================
   Student - Saved System
   نظام المحفوظات
========================================================= */

(function () {
    "use strict";

    if (window.__studentSavedLoaded) return;
    window.__studentSavedLoaded = true;


    /* =====================================================
       الاتصال
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
       أدوات
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
       إنشاء واجهة مستقلة
       السلوك الأصلي خارج القائمة يبقى كما هو
    ===================================================== */

    let overlay = null;


    function injectStyles() {

        if (
            document.getElementById(
                "student-saved-style"
            )
        ) {
            return;
        }

        const style =
            document.createElement("style");

        style.id =
            "student-saved-style";

        style.textContent = `

            #student-saved-overlay {
                position:fixed;
                inset:0;
                z-index:9999998;
                background:rgba(0,0,0,.4);
                display:none;
                align-items:center;
                justify-content:center;
                padding:15px;
                box-sizing:border-box;
                direction:rtl;
            }

            #student-saved-overlay.show {
                display:flex;
            }

            .student-saved-window {
                width:100%;
                max-width:560px;
                max-height:92vh;
                overflow:hidden;
                background:#fff;
                border-radius:22px;
                box-shadow:0 20px 60px rgba(0,0,0,.25);
                display:flex;
                flex-direction:column;
            }

            .student-saved-header {
                flex-shrink:0;
                display:flex;
                align-items:center;
                gap:12px;
                padding:16px 18px;
                border-bottom:1px solid #eee;
                background:#fff;
            }

            .student-saved-title {
                flex:1;
                font-size:20px;
                font-weight:700;
                color:#222;
            }

            .student-saved-close {
                width:40px;
                height:40px;
                border:none;
                border-radius:50%;
                background:#f1f3f5;
                color:#333;
                cursor:pointer;
                font-size:17px;
            }

            .student-saved-body {
                overflow-y:auto;
                padding:15px;
            }

            .student-saved-filter {
                display:flex;
                gap:8px;
                overflow-x:auto;
                padding-bottom:10px;
                margin-bottom:5px;
            }

            .student-saved-filter button {
                flex-shrink:0;
                border:none;
                background:#f2f5f8;
                color:#555;
                padding:9px 14px;
                border-radius:20px;
                cursor:pointer;
                font-size:12px;
            }

            .student-saved-filter button.active {
                background:#0095f6;
                color:#fff;
            }

            .student-saved-item {
                display:flex;
                align-items:center;
                gap:12px;
                padding:14px;
                background:#f7f8fa;
                border-radius:15px;
                margin-bottom:10px;
            }

            .student-saved-icon {
                width:44px;
                height:44px;
                border-radius:13px;
                background:#eaf5ff;
                color:#0095f6;
                display:flex;
                align-items:center;
                justify-content:center;
                flex-shrink:0;
                font-size:17px;
            }

            .student-saved-info {
                flex:1;
                min-width:0;
            }

            .student-saved-type {
                font-size:12px;
                color:#0095f6;
                font-weight:700;
            }

            .student-saved-id {
                margin-top:4px;
                font-size:13px;
                color:#555;
                direction:ltr;
                text-align:right;
                overflow:hidden;
                text-overflow:ellipsis;
                white-space:nowrap;
            }

            .student-saved-date {
                margin-top:4px;
                font-size:11px;
                color:#999;
            }

            .student-saved-delete {
                width:38px;
                height:38px;
                border:none;
                border-radius:50%;
                background:#fff2f2;
                color:#d93025;
                cursor:pointer;
                flex-shrink:0;
            }

            .student-saved-empty {
                text-align:center;
                padding:50px 15px;
                color:#888;
            }

            .student-saved-empty-icon {
                width:75px;
                height:75px;
                margin:0 auto 15px;
                border-radius:22px;
                background:#eaf5ff;
                color:#0095f6;
                display:flex;
                align-items:center;
                justify-content:center;
                font-size:30px;
            }

            /* =========================================
               تنسيق المحفوظات داخل القائمة الرئيسية
            ========================================= */

            .student-saved-menu-container {
                color:#222;
            }

            .student-saved-menu-container
            .student-saved-filter {
                margin-top:0;
            }

            .student-saved-menu-container
            .student-saved-item {
                background:rgba(255,255,255,.72);
                border:1px solid rgba(255,255,255,.35);
            }

            .student-saved-menu-container
            .student-saved-icon {
                background:rgba(255,255,255,.75);
                color:#07518e;
            }

            .student-saved-menu-container
            .student-saved-type {
                color:#07518e;
            }

            .student-saved-menu-container
            .student-saved-empty-icon {
                background:rgba(255,255,255,.75);
                color:#07518e;
            }

            @media (max-width:480px) {

                #student-saved-overlay {
                    padding:0;
                    align-items:stretch;
                }

                .student-saved-window {
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
       إنشاء النافذة الأصلية
    ===================================================== */

    function createOverlay() {

        if (overlay) {
            return;
        }

        overlay =
            document.createElement("div");

        overlay.id =
            "student-saved-overlay";

        overlay.innerHTML = `

            <div class="student-saved-window">

                <div class="student-saved-header">

                    <div class="student-saved-title">
                        المحفوظات
                    </div>

                    <button
                        id="student-saved-close"
                        class="student-saved-close"
                        type="button"
                        aria-label="إغلاق"
                    >
                        <i class="fa-solid fa-xmark"></i>
                    </button>

                </div>

                <div
                    id="student-saved-body"
                    class="student-saved-body"
                ></div>

            </div>
        `;

        document.body.appendChild(
            overlay
        );


        document
            .getElementById(
                "student-saved-close"
            )
            ?.addEventListener(
                "click",
                closeSaved
            );

        /* لا نغلق بالضغط على الخلفية */
    }


    /* =====================================================
       هل نحن داخل القائمة الرئيسية؟
    ===================================================== */

    function isInsideStudentMenu() {

        const menu =
            document.getElementById(
                "student-main-menu"
            );

        return !!(
            menu &&
            menu.classList.contains(
                "is-open"
            )
        );
    }


    /* =====================================================
       فتح داخل القائمة الرئيسية
    ===================================================== */

    function openSavedInsideMenu() {

        if (
            typeof window.StudentMenuOpenView !==
            "function"
        ) {
            return false;
        }


        const menuHTML = `

            <div
                id="student-saved-menu-container"
                class="student-saved-menu-container"
            >

                <div
                    id="student-saved-menu-body"
                >
                    <div style="
                        text-align:center;
                        padding:30px;
                        color:#555;
                    ">
                        جاري تحميل المحفوظات...
                    </div>
                </div>

            </div>
        `;


        window.StudentMenuOpenView(
            "المحفوظات",
            menuHTML,
            function () {

                const body =
                    document.getElementById(
                        "student-saved-menu-body"
                    );


                if (body) {

                    renderSaved(
                        "all",
                        body
                    );
                }

            }
        );


        return true;
    }


    /* =====================================================
       فتح
    ===================================================== */

    async function openSaved() {

        injectStyles();


        /*
           إذا كانت القائمة الرئيسية مفتوحة،
           نستخدمها بدل النافذة العائمة.
        */

        if (
            isInsideStudentMenu()
        ) {

            if (
                openSavedInsideMenu()
            ) {
                return;
            }
        }


        /*
           السلوك الأصلي
        */

        createOverlay();

        overlay.classList.add(
            "show"
        );

        await renderSaved(
            "all"
        );
    }


    /* =====================================================
       إغلاق
    ===================================================== */

    function closeSaved() {

        if (overlay) {

            overlay.classList.remove(
                "show"
            );
        }
    }


    /* =====================================================
       تحميل المحفوظات
    ===================================================== */

    async function loadSavedItems(
        contentType = "all"
    ) {

        const client =
            getSupabase();

        if (!client) {
            return {
                data: [],
                error: new Error(
                    "Supabase غير متاح."
                )
            };
        }


        let query =
            client
                .from("saved_items")
                .select(
                    "id, content_type, content_id, created_at"
                )
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );


        if (
            contentType !== "all"
        ) {

            query =
                query.eq(
                    "content_type",
                    contentType
                );
        }


        return await query;
    }


    /* =====================================================
       أسماء الأنواع
    ===================================================== */

    function getTypeLabel(
        type
    ) {

        const labels = {

            post: "منشور",

            story: "Story",

            lesson: "درس",

            file: "ملف",

            video: "فيديو"
        };


        return (
            labels[type] ||
            type ||
            "محتوى"
        );
    }


    /* =====================================================
       أيقونات
    ===================================================== */

    function getTypeIcon(
        type
    ) {

        const icons = {

            post:
                "fa-regular fa-image",

            story:
                "fa-regular fa-circle-play",

            lesson:
                "fa-solid fa-book-open",

            file:
                "fa-regular fa-file",

            video:
                "fa-solid fa-video"
        };


        return (
            icons[type] ||
            "fa-regular fa-bookmark"
        );
    }


    /* =====================================================
       التاريخ
    ===================================================== */

    function formatDate(
        value
    ) {

        if (!value) {
            return "";
        }


        const date =
            new Date(value);


        if (
            isNaN(
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
       العرض
       targetBody اختياري:
       - بدون target = النظام الأصلي
       - مع target = داخل القائمة
    ===================================================== */

    async function renderSaved(
        filter = "all",
        targetBody = null
    ) {

        const body =
            targetBody ||
            document.getElementById(
                "student-saved-body"
            );


        if (!body) {
            return;
        }


        body.innerHTML = `

            <div style="
                text-align:center;
                padding:30px;
                color:#666;
            ">
                جاري تحميل المحفوظات...
            </div>
        `;


        const result =
            await loadSavedItems(
                filter
            );


        if (result.error) {

            console.error(
                "Saved items error:",
                result.error
            );


            body.innerHTML = `

                <div class="student-saved-empty">

                    <div class="student-saved-empty-icon">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                    </div>

                    <div>
                        تعذر تحميل المحفوظات.
                    </div>

                </div>
            `;

            return;
        }


        const items =
            result.data || [];


        const filterHTML = `

            <div class="student-saved-filter">

                <button
                    data-saved-filter="all"
                    class="${
                        filter === "all"
                            ? "active"
                            : ""
                    }"
                >
                    الكل
                </button>

                <button
                    data-saved-filter="post"
                    class="${
                        filter === "post"
                            ? "active"
                            : ""
                    }"
                >
                    المنشورات
                </button>

                <button
                    data-saved-filter="story"
                    class="${
                        filter === "story"
                            ? "active"
                            : ""
                    }"
                >
                    Stories
                </button>

                <button
                    data-saved-filter="lesson"
                    class="${
                        filter === "lesson"
                            ? "active"
                            : ""
                    }"
                >
                    الدروس
                </button>

                <button
                    data-saved-filter="file"
                    class="${
                        filter === "file"
                            ? "active"
                            : ""
                    }"
                >
                    الملفات
                </button>

            </div>
        `;


        if (!items.length) {

            body.innerHTML =
                filterHTML +
                `

                <div class="student-saved-empty">

                    <div class="student-saved-empty-icon">
                        <i class="fa-regular fa-bookmark"></i>
                    </div>

                    <div style="
                        font-weight:700;
                        color:#555;
                        margin-bottom:7px;
                    ">
                        لا توجد محفوظات
                    </div>

                    <div style="
                        font-size:13px;
                        line-height:1.8;
                    ">
                        عندما تحفظ محتوى سيظهر هنا.
                    </div>

                </div>
            `;

        } else {

            body.innerHTML =
                filterHTML +
                items.map(
                    function (item) {

                        return `
                            <div
                                class="student-saved-item"
                                data-saved-id="${item.id}"
                            >

                                <div class="student-saved-icon">
                                    <i class="${getTypeIcon(
                                        item.content_type
                                    )}"></i>
                                </div>


                                <div class="student-saved-info">

                                    <div class="student-saved-type">
                                        ${escapeHTML(
                                            getTypeLabel(
                                                item.content_type
                                            )
                                        )}
                                    </div>

                                    <div class="student-saved-id">
                                        ${escapeHTML(
                                            item.content_id
                                        )}
                                    </div>

                                    <div class="student-saved-date">
                                        ${escapeHTML(
                                            formatDate(
                                                item.created_at
                                            )
                                        )}
                                    </div>

                                </div>


                                <button
                                    type="button"
                                    class="student-saved-delete"
                                    data-delete-saved="${item.id}"
                                    title="إلغاء الحفظ"
                                >
                                    <i class="fa-solid fa-trash"></i>
                                </button>

                            </div>
                        `;

                    }
                ).join("");
        }


        /* =================================================
           الفلاتر
        ================================================= */

        body
            .querySelectorAll(
                "[data-saved-filter]"
            )
            .forEach(
                function (button) {

                    button.addEventListener(
                        "click",
                        async function () {

                            await renderSaved(
                                button.dataset
                                    .savedFilter,
                                body
                            );

                        }
                    );
                }
            );


        /* =================================================
           حذف
        ================================================= */

        body
            .querySelectorAll(
                "[data-delete-saved]"
            )
            .forEach(
                function (button) {

                    button.addEventListener(
                        "click",
                        async function () {

                            await deleteSavedItem(
                                button.dataset
                                    .deleteSaved,
                                filter,
                                body
                            );

                        }
                    );
                }
            );
    }


    /* =====================================================
       حذف محفوظ
    ===================================================== */

    async function deleteSavedItem(
        id,
        currentFilter,
        targetBody = null
    ) {

        const client =
            getSupabase();

        if (!client) {
            return;
        }


        const confirmed =
            window.confirm(
                "هل تريد إزالة هذا العنصر من المحفوظات؟"
            );


        if (!confirmed) {
            return;
        }


        const {
            error
        } =
            await client
                .from("saved_items")
                .delete()
                .eq(
                    "id",
                    id
                );


        if (error) {

            console.error(
                "Delete saved error:",
                error
            );

            return;
        }


        await renderSaved(
            currentFilter,
            targetBody
        );
    }


    /* =====================================================
       حفظ عنصر
       contentType:
       post / story / lesson / file / video
    ===================================================== */

    async function saveItem(
        contentType,
        contentId
    ) {

        const client =
            getSupabase();


        if (
            !client ||
            !contentType ||
            !contentId
        ) {

            return {
                success: false,
                error:
                    "بيانات الحفظ غير مكتملة."
            };
        }


        try {

            const {
                data: {
                    user
                }
            } =
                await client.auth.getUser();


            if (!user) {

                return {
                    success: false,
                    error:
                        "يجب تسجيل الدخول أولًا."
                };
            }


            const {
                error
            } =
                await client
                    .from("saved_items")
                    .insert({
                        user_id:
                            user.id,

                        content_type:
                            contentType,

                        content_id:
                            String(
                                contentId
                            )
                    });


            if (error) {

                if (
                    error.code ===
                    "23505"
                ) {

                    return {
                        success: true,
                        alreadySaved: true
                    };
                }


                throw error;
            }


            return {
                success: true,
                alreadySaved: false
            };

        } catch (error) {

            console.error(
                "Save item error:",
                error
            );

            return {
                success: false,
                error:
                    error?.message ||
                    "تعذر حفظ العنصر."
            };
        }
    }


    /* =====================================================
       إلغاء حفظ عنصر
    ===================================================== */

    async function unsaveItem(
        contentType,
        contentId
    ) {

        const client =
            getSupabase();


        if (
            !client ||
            !contentType ||
            !contentId
        ) {

            return {
                success: false
            };
        }


        try {

            const {
                data: {
                    user
                }
            } =
                await client.auth.getUser();


            if (!user) {

                return {
                    success: false
                };
            }


            const {
                error
            } =
                await client
                    .from("saved_items")
                    .delete()
                    .eq(
                        "user_id",
                        user.id
                    )
                    .eq(
                        "content_type",
                        contentType
                    )
                    .eq(
                        "content_id",
                        String(
                            contentId
                        )
                    );


            if (error) {
                throw error;
            }


            return {
                success: true
            };

        } catch (error) {

            console.error(
                "Unsave error:",
                error
            );

            return {
                success: false,
                error:
                    error?.message
            };
        }
    }


    /* =====================================================
       التحقق من الحفظ
    ===================================================== */

    async function isSaved(
        contentType,
        contentId
    ) {

        const client =
            getSupabase();


        if (
            !client ||
            !contentType ||
            !contentId
        ) {
            return false;
        }


        try {

            const {
                data: {
                    user
                }
            } =
                await client.auth.getUser();


            if (!user) {
                return false;
            }


            const {
                data,
                error
            } =
                await client
                    .from("saved_items")
                    .select("id")
                    .eq(
                        "user_id",
                        user.id
                    )
                    .eq(
                        "content_type",
                        contentType
                    )
                    .eq(
                        "content_id",
                        String(
                            contentId
                        )
                    )
                    .maybeSingle();


            if (error) {
                return false;
            }


            return !!data;

        } catch (error) {

            console.error(
                "Is saved error:",
                error
            );

            return false;
        }
    }


    /* =====================================================
       دوال عامة
    ===================================================== */

    window.openStudentSaved =
        openSaved;

    window.closeStudentSaved =
        closeSaved;

    window.saveStudentItem =
        saveItem;

    window.unsaveStudentItem =
        unsaveItem;

    window.isStudentItemSaved =
        isSaved;


})();
