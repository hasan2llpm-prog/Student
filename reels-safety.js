/* =========================================================
   Student - Reels Safety

   🚩 الإبلاغ
   🚫 إخفاء Reel
   🔗 نسخ الرابط
========================================================= */

(function () {

    "use strict";

    if (window.__studentReelsSafetyLoaded) {
        return;
    }

    window.__studentReelsSafetyLoaded = true;

    let safetyUserId = null;


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

        const client = getSupabase();

        if (!client) {
            safetyUserId = null;
            return null;
        }

        try {

            const {
                data: {
                    user
                }
            } = await client.auth.getUser();

            safetyUserId =
                user?.id || null;

            return user || null;

        } catch (error) {

            console.error(
                "Safety auth error:",
                error
            );

            safetyUserId = null;

            return null;
        }
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
       Toast
    ===================================================== */

    function toast(message) {

        const old =
            document.getElementById(
                "student-safety-toast"
            );

        if (old) {
            old.remove();
        }

        const element =
            document.createElement("div");

        element.id =
            "student-safety-toast";

        element.textContent =
            message;

        element.style.cssText = `
            position:fixed;
            left:50%;
            bottom:30px;
            transform:translateX(-50%);
            z-index:100000700;
            background:#222;
            color:#fff;
            padding:11px 16px;
            border-radius:12px;
            font-size:13px;
            direction:rtl;
            box-shadow:0 8px 30px rgba(0,0,0,.3);
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
       Reel helpers
    ===================================================== */

    function getReelFromButton(button) {

        return button?.closest(
            ".student-reel"
        );
    }


    function getReelId(reel) {

        return reel?.dataset?.id || "";
    }


    function isOwnerReel(reel) {

        if (!reel) {
            return false;
        }

        return !!reel.querySelector(
            "[data-edit], [data-privacy], [data-delete]"
        );
    }


    /* =====================================================
       نافذة عائمة
    ===================================================== */

    function closeDialog() {

        const dialog =
            document.getElementById(
                "student-safety-dialog"
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
            "student-safety-dialog";

        dialog.style.cssText = `
            position:fixed;
            inset:0;
            z-index:100000650;
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
                box-shadow:0 20px 60px rgba(0,0,0,.3);
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
                        id="student-safety-close"
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

                <div>
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
                "student-safety-close"
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

        if (
            typeof onReady ===
            "function"
        ) {
            onReady(dialog);
        }
    }


    /* =====================================================
       الإبلاغ
    ===================================================== */

    function openReportDialog(
        reelId
    ) {

        showDialog(

            "الإبلاغ عن Reel",

            `
            <div style="
                color:#666;
                line-height:1.8;
                margin-bottom:12px;
            ">
                اختر سبب الإبلاغ:
            </div>

            <select
                id="student-safety-report-reason"
                style="
                    width:100%;
                    box-sizing:border-box;
                    padding:12px;
                    border:1px solid #ddd;
                    border-radius:12px;
                    outline:none;
                    font-size:14px;
                "
            >

                <option value="spam">
                    محتوى مزعج أو غير مرغوب
                </option>

                <option value="violence">
                    عنف أو محتوى خطير
                </option>

                <option value="harassment">
                    تنمر أو مضايقة
                </option>

                <option value="sexual">
                    محتوى غير مناسب
                </option>

                <option value="copyright">
                    انتهاك حقوق
                </option>

                <option value="other">
                    سبب آخر
                </option>

            </select>

            <textarea
                id="student-safety-report-details"
                maxlength="500"
                placeholder="تفاصيل إضافية (اختياري)"
                style="
                    width:100%;
                    box-sizing:border-box;
                    min-height:90px;
                    margin-top:10px;
                    padding:12px;
                    border:1px solid #ddd;
                    border-radius:12px;
                    resize:none;
                    outline:none;
                "
            ></textarea>

            <div
                id="student-safety-message"
                style="
                    min-height:20px;
                    text-align:center;
                    font-size:13px;
                    margin-top:8px;
                "
            ></div>
            `,

            `
            <button
                id="student-safety-report-cancel"
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
                id="student-safety-report-send"
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
                إرسال البلاغ
            </button>
            `,

            function (dialog) {

                dialog
                    .querySelector(
                        "#student-safety-report-cancel"
                    )
                    ?.addEventListener(
                        "click",
                        closeDialog
                    );

                dialog
                    .querySelector(
                        "#student-safety-report-send"
                    )
                    ?.addEventListener(
                        "click",
                        function () {

                            submitReport(
                                reelId,
                                dialog
                            );

                        }
                    );
            }
        );
    }


    async function submitReport(
        reelId,
        dialog
    ) {

        await loadCurrentUser();

        const client =
            getSupabase();

        if (
            !client ||
            !safetyUserId
        ) {

            toast(
                "يجب تسجيل الدخول أولًا."
            );

            return;
        }

        const reason =
            dialog
                .querySelector(
                    "#student-safety-report-reason"
                )
                ?.value;

        const details =
            dialog
                .querySelector(
                    "#student-safety-report-details"
                )
                ?.value
                ?.trim();

        const message =
            dialog
                .querySelector(
                    "#student-safety-message"
                );

        const button =
            dialog
                .querySelector(
                    "#student-safety-report-send"
                );

        if (!reason) {
            return;
        }

        button.disabled = true;
        button.textContent =
            "جارٍ الإرسال...";

        try {

            const finalReason =
                details
                    ? `${reason}: ${details}`
                    : reason;

            const {
                error
            } =
                await client
                    .from(
                        "reel_reports"
                    )
                    .insert({

                        reel_id:
                            reelId,

                        user_id:
                            safetyUserId,

                        reason:
                            finalReason
                    });

            if (error) {
                throw error;
            }

            message.style.color =
                "#16803c";

            message.textContent =
                "تم إرسال البلاغ بنجاح.";

            setTimeout(
                closeDialog,
                700
            );

        } catch (error) {

            console.error(
                "Report Reel error:",
                error
            );

            if (
                String(
                    error?.message || ""
                )
                    .toLowerCase()
                    .includes(
                        "duplicate"
                    )
            ) {

                message.style.color =
                    "#d93025";

                message.textContent =
                    "لقد أبلغت عن هذا الـReel سابقًا.";

            } else {

                message.style.color =
                    "#d93025";

                message.textContent =
                    error?.message ||
                    "تعذر إرسال البلاغ.";
            }

        } finally {

            button.disabled = false;
            button.textContent =
                "إرسال البلاغ";
        }
    }


    /* =====================================================
       إخفاء Reel مع تأكيد
    ===================================================== */

    function hideReel(
        reel
    ) {

        if (!reel) {
            return;
        }


        showDialog(

            "إخفاء Reel",

            `
            <div style="
                text-align:center;
                color:#666;
                line-height:1.8;
                padding:8px 0;
            ">

                <div style="
                    font-size:42px;
                    margin-bottom:10px;
                ">
                    🚫
                </div>

                <div>
                    هل أنت متأكد من إخفاء هذا الـReel؟
                </div>

                <div style="
                    margin-top:6px;
                    color:#999;
                    font-size:12px;
                ">
                    لن يظهر لك مرة أخرى في هذه الجلسة.
                </div>

            </div>
            `,

            `
            <button
                id="student-safety-hide-cancel"
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
                id="student-safety-hide-confirm"
                type="button"
                style="
                    flex:1;
                    border:0;
                    padding:13px;
                    border-radius:12px;
                    background:#555;
                    color:#fff;
                    cursor:pointer;
                    font-weight:700;
                "
            >
                نعم، إخفاء
            </button>
            `,

            function (dialog) {

                dialog
                    .querySelector(
                        "#student-safety-hide-cancel"
                    )
                    ?.addEventListener(
                        "click",
                        closeDialog
                    );


                dialog
                    .querySelector(
                        "#student-safety-hide-confirm"
                    )
                    ?.addEventListener(
                        "click",
                        function () {

                            closeDialog();


                            reel.style.transition =
                                "opacity .2s ease, transform .2s ease";

                            reel.style.opacity =
                                "0";

                            reel.style.transform =
                                "scale(.97)";


                            setTimeout(
                                function () {

                                    reel.remove();

                                },
                                220
                            );


                            toast(
                                "تم إخفاء الـReel."
                            );

                        }
                    );

            }
        );
    }


    /* =====================================================
       نسخ الرابط
    ===================================================== */

    async function copyReelLink(
        reelId
    ) {

        const url =
            `${location.origin}${location.pathname}#reel=${reelId}`;

        try {

            if (
                navigator.clipboard &&
                navigator.clipboard.writeText
            ) {

                await navigator.clipboard.writeText(
                    url
                );

            } else {

                const input =
                    document.createElement(
                        "textarea"
                    );

                input.value =
                    url;

                input.style.position =
                    "fixed";

                input.style.opacity =
                    "0";

                document.body.appendChild(
                    input
                );

                input.select();

                document.execCommand(
                    "copy"
                );

                input.remove();
            }

            toast(
                "تم نسخ رابط الـReel."
            );

        } catch (error) {

            console.error(
                "Copy link error:",
                error
            );

            toast(
                "تعذر نسخ الرابط."
            );
        }
    }


    /* =====================================================
       قائمة Safety
    ===================================================== */

    function openSafetyMenu(
        button
    ) {

        const reel =
            getReelFromButton(
                button
            );

        if (!reel) {
            return;
        }


        /*
           Reel المستخدم نفسه له قائمة
           الإدارة الخاصة به.
        */

        if (
            isOwnerReel(
                reel
            )
        ) {

            return;
        }


        const reelId =
            getReelId(
                reel
            );


        showDialog(

            "المزيد",

            `
            <div style="
                display:flex;
                flex-direction:column;
                gap:9px;
            ">

                <button
                    type="button"
                    data-safety-report
                    style="
                        width:100%;
                        border:0;
                        background:#fff2f2;
                        color:#d93025;
                        padding:14px;
                        border-radius:13px;
                        text-align:right;
                        cursor:pointer;
                        font-size:14px;
                    "
                >
                    🚩 الإبلاغ عن Reel
                </button>


                <button
                    type="button"
                    data-safety-hide
                    style="
                        width:100%;
                        border:0;
                        background:#f7f8fa;
                        padding:14px;
                        border-radius:13px;
                        text-align:right;
                        cursor:pointer;
                        font-size:14px;
                    "
                >
                    🚫 إخفاء هذا الـReel
                </button>


                <button
                    type="button"
                    data-safety-copy
                    style="
                        width:100%;
                        border:0;
                        background:#f7f8fa;
                        padding:14px;
                        border-radius:13px;
                        text-align:right;
                        cursor:pointer;
                        font-size:14px;
                    "
                >
                    🔗 نسخ رابط الـReel
                </button>

            </div>
            `,

            `
            <button
                id="student-safety-menu-close"
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
                إغلاق
            </button>
            `,

            function (dialog) {

                dialog
                    .querySelector(
                        "#student-safety-menu-close"
                    )
                    ?.addEventListener(
                        "click",
                        closeDialog
                    );


                dialog
                    .querySelector(
                        "[data-safety-copy]"
                    )
                    ?.addEventListener(
                        "click",
                        function () {

                            closeDialog();

                            copyReelLink(
                                reelId
                            );

                        }
                    );


                dialog
                    .querySelector(
                        "[data-safety-report]"
                    )
                    ?.addEventListener(
                        "click",
                        function () {

                            closeDialog();

                            openReportDialog(
                                reelId
                            );

                        }
                    );


                dialog
                    .querySelector(
                        "[data-safety-hide]"
                    )
                    ?.addEventListener(
                        "click",
                        function () {

                            closeDialog();

                            hideReel(
                                reel
                            );

                        }
                    );

            }
        );
    }


    /* =====================================================
       التقاط الأزرار
    ===================================================== */

    function bindSafetyButtons() {

        document.addEventListener(
            "click",
            function (event) {

                /* =========================================
                   زر المزيد
                ========================================= */

                const more =
                    event.target.closest(
                        ".student-reel [data-more]"
                    );


                if (more) {

                    const reel =
                        getReelFromButton(
                            more
                        );


                    /*
                       إذا كان صاحب الـReel:
                       اترك الزر لـreels-manage.js
                    */

                    if (
                        isOwnerReel(
                            reel
                        )
                    ) {

                        return;
                    }


                    event.preventDefault();
                    event.stopImmediatePropagation();


                    openSafetyMenu(
                        more
                    );


                    return;
                }


                /* =========================================
                   Report مباشر
                ========================================= */

                const report =
                    event.target.closest(
                        ".student-reel [data-report]"
                    );


                if (report) {

                    const reel =
                        getReelFromButton(
                            report
                        );


                    if (
                        isOwnerReel(
                            reel
                        )
                    ) {

                        return;
                    }


                    event.preventDefault();
                    event.stopImmediatePropagation();


                    const reelId =
                        getReelId(
                            reel
                        );


                    if (reelId) {

                        openReportDialog(
                            reelId
                        );
                    }


                    return;
                }


                /* =========================================
                   Hide مباشر
                ========================================= */

                const hide =
                    event.target.closest(
                        ".student-reel [data-hide]"
                    );


                if (hide) {

                    const reel =
                        getReelFromButton(
                            hide
                        );


                    if (
                        isOwnerReel(
                            reel
                        )
                    ) {

                        return;
                    }


                    event.preventDefault();
                    event.stopImmediatePropagation();


                    hideReel(
                        reel
                    );


                    return;
                }


                /* =========================================
                   Copy link مباشر
                ========================================= */

                const copy =
                    event.target.closest(
                        ".student-reel [data-copy-link]"
                    );


                if (copy) {

                    const reel =
                        getReelFromButton(
                            copy
                        );


                    event.preventDefault();
                    event.stopImmediatePropagation();


                    const reelId =
                        getReelId(
                            reel
                        );


                    if (reelId) {

                        copyReelLink(
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

    window.StudentReelsSafety =
        window.StudentReelsSafety ||
        {};


    window.StudentReelsSafety.report =
        openReportDialog;


    window.StudentReelsSafety.hide =
        hideReel;


    window.StudentReelsSafety.copyLink =
        copyReelLink;


    /* =====================================================
       Start
    ===================================================== */

    async function start() {

        await loadCurrentUser();

        bindSafetyButtons();
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
