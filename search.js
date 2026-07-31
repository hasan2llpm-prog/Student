/* =========================================================
   Student - Search System
   نظام البحث
========================================================= */

(function () {
    "use strict";

    if (window.__studentSearchLoaded) return;
    window.__studentSearchLoaded = true;


    let overlay = null;
    let searchTimeout = null;


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
                "student-search-style"
            )
        ) {
            return;
        }

        const style =
            document.createElement("style");

        style.id =
            "student-search-style";

        style.textContent = `

            #student-search-overlay {
                position:fixed;
                inset:0;
                z-index:9999997;
                background:rgba(0,0,0,.40);
                display:none;
                align-items:center;
                justify-content:center;
                padding:15px;
                box-sizing:border-box;
                direction:rtl;
            }

            #student-search-overlay.show {
                display:flex;
            }

            .student-search-window {
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

            .student-search-header {
                flex-shrink:0;
                padding:16px;
                border-bottom:1px solid #eee;
                background:#fff;
            }

            .student-search-header-row {
                display:flex;
                align-items:center;
                gap:10px;
                margin-bottom:12px;
            }

            .student-search-title {
                flex:1;
                font-size:20px;
                font-weight:700;
                color:#222;
            }

            .student-search-close {
                width:40px;
                height:40px;
                border:none;
                border-radius:50%;
                background:#f1f3f5;
                color:#333;
                cursor:pointer;
                font-size:16px;
            }

            .student-search-input-wrap {
                position:relative;
            }

            .student-search-input {
                width:100%;
                box-sizing:border-box;
                padding:13px 44px 13px 14px;
                border:1px solid #ddd;
                border-radius:13px;
                outline:none;
                font-size:15px;
                direction:rtl;
                background:#fff;
            }

            .student-search-input:focus {
                border-color:#0095f6;
            }

            .student-search-icon {
                position:absolute;
                right:15px;
                top:50%;
                transform:translateY(-50%);
                color:#999;
                pointer-events:none;
            }

            .student-search-body {
                flex:1;
                overflow-y:auto;
                padding:15px;
                background:#fff;
            }

            .student-search-message {
                text-align:center;
                padding:45px 15px;
                color:#888;
                line-height:1.8;
            }

            .student-search-user {
                width:100%;
                border:none;
                background:#f7f8fa;
                border-radius:15px;
                padding:12px;
                margin-bottom:10px;
                display:flex;
                align-items:center;
                gap:12px;
                direction:rtl;
                text-align:right;
                cursor:pointer;
            }

            .student-search-user:hover {
                background:#eef2f5;
            }

            .student-search-avatar {
                width:52px;
                height:52px;
                border-radius:50%;
                object-fit:cover;
                flex-shrink:0;
                background:#eaf5ff;
            }

            .student-search-avatar-placeholder {
                width:52px;
                height:52px;
                border-radius:50%;
                flex-shrink:0;
                background:#eaf5ff;
                color:#0095f6;
                display:flex;
                align-items:center;
                justify-content:center;
                font-size:20px;
            }

            .student-search-user-info {
                flex:1;
                min-width:0;
            }

            .student-search-name {
                font-size:15px;
                font-weight:700;
                color:#222;
            }

            .student-search-username {
                margin-top:4px;
                font-size:12px;
                color:#0095f6;
                direction:ltr;
                text-align:right;
            }

            .student-search-bio {
                margin-top:4px;
                font-size:11px;
                color:#888;
                overflow:hidden;
                text-overflow:ellipsis;
                white-space:nowrap;
            }

            .student-search-arrow {
                color:#aaa;
                font-size:12px;
            }

            .student-public-profile {
                padding:5px;
            }

            .student-public-profile-top {
                text-align:center;
                margin-bottom:20px;
            }

            .student-public-profile-avatar {
                width:96px;
                height:96px;
                border-radius:50%;
                margin:0 auto 12px;
                object-fit:cover;
                background:#eaf5ff;
            }

            .student-public-profile-placeholder {
                width:96px;
                height:96px;
                border-radius:50%;
                margin:0 auto 12px;
                background:#eaf5ff;
                color:#0095f6;
                display:flex;
                align-items:center;
                justify-content:center;
                font-size:40px;
            }

            .student-public-profile-name {
                font-size:21px;
                font-weight:700;
                color:#222;
            }

            .student-public-profile-username {
                margin-top:5px;
                color:#0095f6;
                font-size:13px;
                direction:ltr;
            }

            .student-public-profile-bio {
                margin-top:15px;
                padding:14px;
                background:#f7f8fa;
                border-radius:14px;
                color:#666;
                line-height:1.8;
                text-align:right;
            }

            .student-public-profile-private {
                margin-top:15px;
                padding:15px;
                background:#fff8e8;
                color:#8a6d1d;
                border-radius:14px;
                text-align:center;
                font-size:13px;
            }

            @media (max-width:480px) {

                #student-search-overlay {
                    padding:0;
                    align-items:stretch;
                }

                .student-search-window {
                    max-width:none;
                    max-height:none;
                    height:100%;
                    border-radius:0;
                }
            }

        `;

        document.head.appendChild(
            style
        );
    }


    /* =====================================================
       النافذة
    ===================================================== */

    function createOverlay() {

        if (overlay) return;

        overlay =
            document.createElement("div");

        overlay.id =
            "student-search-overlay";

        overlay.innerHTML = `

            <div class="student-search-window">

                <div class="student-search-header">

                    <div class="student-search-header-row">

                        <div class="student-search-title">
                            البحث
                        </div>

                        <button
                            id="student-search-close"
                            class="student-search-close"
                            type="button"
                        >
                            <i class="fa-solid fa-xmark"></i>
                        </button>

                    </div>


                    <div class="student-search-input-wrap">

                        <i
                            class="fa-solid fa-magnifying-glass student-search-icon"
                        ></i>

                        <input
                            id="student-search-input"
                            class="student-search-input"
                            type="search"
                            placeholder="ابحث عن طالب..."
                            autocomplete="off"
                        />

                    </div>

                </div>


                <div
                    id="student-search-body"
                    class="student-search-body"
                ></div>

            </div>
        `;

        document.body.appendChild(
            overlay
        );


        document
            .getElementById(
                "student-search-close"
            )
            ?.addEventListener(
                "click",
                closeSearch
            );


        document
            .getElementById(
                "student-search-input"
            )
            ?.addEventListener(
                "input",
                handleSearchInput
            );


        /* لا نغلق بالضغط على الخلفية */
    }


    /* =====================================================
       فتح البحث
    ===================================================== */

    function openSearch() {

        injectStyles();
        createOverlay();

        overlay.classList.add(
            "show"
        );


        const input =
            document.getElementById(
                "student-search-input"
            );


        const body =
            document.getElementById(
                "student-search-body"
            );


        if (body) {

            body.innerHTML = `
                <div class="student-search-message">

                    <div style="
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
                    ">
                        <i class="fa-solid fa-magnifying-glass"></i>
                    </div>

                    اكتب اسم الطالب أو اسم المستخدم للبحث.

                </div>
            `;
        }


        setTimeout(
            function () {

                input?.focus();

            },
            100
        );
    }


    /* =====================================================
       إغلاق
    ===================================================== */

    function closeSearch() {

        if (overlay) {

            overlay.classList.remove(
                "show"
            );
        }
    }


    /* =====================================================
       إدخال البحث
    ===================================================== */

    function handleSearchInput() {

        clearTimeout(
            searchTimeout
        );


        const input =
            document.getElementById(
                "student-search-input"
            );


        const term =
            input?.value.trim() ||
            "";


        if (term.length < 2) {

            const body =
                document.getElementById(
                    "student-search-body"
                );

            if (body) {

                body.innerHTML = `
                    <div class="student-search-message">

                        اكتب حرفين على الأقل
                        لبدء البحث.

                    </div>
                `;
            }

            return;
    }
