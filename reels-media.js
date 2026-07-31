/* =========================================================
   Student - Reels Media

   🔖 المحفوظات
   👁️ المشاهدات
   🔊 الصوت
========================================================= */

(function () {

    "use strict";


    if (window.__studentReelsMediaLoaded) {
        return;
    }


    window.__studentReelsMediaLoaded =
        true;


    let mediaUserId = null;


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

            mediaUserId =
                null;

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


            mediaUserId =
                user?.id || null;


            return user || null;


        } catch (error) {

            console.error(
                "Media auth error:",
                error
            );


            mediaUserId =
                null;


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
                "student-media-toast"
            );


        if (old) {
            old.remove();
        }


        const element =
            document.createElement(
                "div"
            );


        element.id =
            "student-media-toast";


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
       الحصول على Reel ID
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
       تحديث شكل زر الحفظ
    ===================================================== */

    function setSavedButton(
        button,
        saved
    ) {

        if (!button) {
            return;
        }


        const icon =
            button.querySelector(
                "i"
            );


        button.classList.toggle(
            "saved",
            saved
        );


        if (icon) {

            icon.classList.toggle(
                "fa-solid",
                saved
            );


            icon.classList.toggle(
                "fa-regular",
                !saved
            );
        }
    }


    /* =====================================================
       معرفة هل Reel محفوظ
    ===================================================== */

    async function isSaved(
        reelId
    ) {

        const client =
            getSupabase();


        if (
            !client ||
            !mediaUserId ||
            !reelId
        ) {

            return false;
        }


        try {

            const {
                data,
                error
            } =
                await client
                    .from(
                        "saved_items"
                    )
                    .select(
                        "id"
                    )
                    .eq(
                        "user_id",
                        mediaUserId
                    )
                    .eq(
                        "content_type",
                        "reel"
                    )
                    .eq(
                        "content_id",
                        String(
                            reelId
                        )
                    )
                    .maybeSingle();


            if (error) {
                throw error;
            }


            return !!data;


        } catch (error) {

            console.error(
                "Saved state error:",
                error
            );


            return false;
        }
    }


    /* =====================================================
       تهيئة أزرار الحفظ الموجودة
    ===================================================== */

    async function initializeSaveButtons() {

        if (!mediaUserId) {
            return;
        }


        const buttons =
            document.querySelectorAll(
                ".student-reel [data-save]"
            );


        for (
            const button of buttons
        ) {

            const reel =
                getReelFromButton(
                    button
                );


            const reelId =
                getReelId(
                    reel
                );


            if (!reelId) {
                continue;
            }


            const saved =
                await isSaved(
                    reelId
                );


            setSavedButton(
                button,
                saved
            );
        }
    }


    /* =====================================================
       تبديل الحفظ
    ===================================================== */

    async function toggleSave(
        button
    ) {

        const client =
            getSupabase();


        if (!client) {

            toast(
                "الخدمة غير متاحة."
            );

            return;
        }


        if (!mediaUserId) {

            await loadCurrentUser();
        }


        if (!mediaUserId) {

            toast(
                "يجب تسجيل الدخول أولًا."
            );

            return;
        }


        const reel =
            getReelFromButton(
                button
            );


        const reelId =
            getReelId(
                reel
            );


        if (!reelId) {

            toast(
                "تعذر تحديد الـReel."
            );

            return;
        }


        button.disabled =
            true;


        try {

            const saved =
                await isSaved(
                    reelId
                );


            if (saved) {

                const {
                    error
                } =
                    await client
                        .from(
                            "saved_items"
                        )
                        .delete()
                        .eq(
                            "user_id",
                            mediaUserId
                        )
                        .eq(
                            "content_type",
                            "reel"
                        )
                        .eq(
                            "content_id",
                            String(
                                reelId
                            )
                        );


                if (error) {
                    throw error;
                }


                setSavedButton(
                    button,
                    false
                );


                toast(
                    "تم إلغاء حفظ الـReel."
                );


            } else {

                const {
                    error
                } =
                    await client
                        .from(
                            "saved_items"
                        )
                        .insert({

                            user_id:
                                mediaUserId,

                            content_type:
                                "reel",

                            content_id:
                                String(
                                    reelId
                                )
                        });


                if (error) {
                    throw error;
                }


                setSavedButton(
                    button,
                    true
                );


                toast(
                    "تم حفظ الـReel."
                );
            }


        } catch (error) {

            console.error(
                "Save Reel error:",
                error
            );


            toast(
                error?.message ||
                "تعذر تحديث المحفوظات."
            );


        } finally {

            button.disabled =
                false;
        }
    }


    /* =====================================================
       تحديث عدد المشاهدات
    ===================================================== */

    async function getViewCount(
        reelId
    ) {

        const client =
            getSupabase();


        if (
            !client ||
            !reelId
        ) {
            return 0;
        }


        try {

            const {
                count
            } =
                await client
                    .from(
                        "reel_views"
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


            return count || 0;


        } catch (error) {

            console.error(
                "View count error:",
                error
            );


            return 0;
        }
    }


    /* =====================================================
       تسجيل المشاهدة
    ===================================================== */

    async function registerView(
        reelId
    ) {

        const client =
            getSupabase();


        if (
            !client ||
            !mediaUserId ||
            !reelId
        ) {
            return;
        }


        try {

            /*
               لأن المفتاح الأساسي هو:
               reel_id + user_id

               فإن المستخدم نفسه لا
               ينشئ مشاهدة مكررة.
            */

            const {
                error
            } =
                await client
                    .from(
                        "reel_views"
                    )
                    .upsert(

                        {
                            reel_id:
                                reelId,

                            user_id:
                                mediaUserId,

                            viewed_at:
                                new Date()
                                    .toISOString()
                        },

                        {
                            onConflict:
                                "reel_id,user_id"
                        }
                    );


            if (error) {
                throw error;
            }


            updateViewCounter(
                reelId
            );


        } catch (error) {

            console.error(
                "Register view error:",
                error
            );
        }
    }


    /* =====================================================
       تحديث عداد المشاهدة على الشاشة
    ===================================================== */

    async function updateViewCounter(
        reelId
    ) {

        const count =
            await getViewCount(
                reelId
            );


        const reel =
            document.querySelector(
                `.student-reel[data-id="${CSS.escape(
                    String(
                        reelId
                    )
                )}"]`
            );


        if (!reel) {
            return;
        }


        /*
           إذا وضعنا لاحقًا
           data-view-count
           سيتم تحديثه مباشرة.
        */

        const counter =
            reel.querySelector(
                "[data-view-count]"
            );


        if (counter) {

            counter.textContent =
                String(
                    count
                );
        }


        /*
           دعم النسخة الحالية أيضًا.
           نبحث عن زر المشاهدات.
        */

        const button =
            reel.querySelector(
                "[data-views]"
            );


        if (button) {

            let label =
                button.parentElement
                    ?.querySelector(
                        ".student-reel-count"
                    );


            if (label) {

                label.textContent =
                    String(
                        count
                    );
            }
        }
    }


    /* =====================================================
       مراقبة ظهور الـReel
    ===================================================== */

    function watchReels() {

        if (!mediaUserId) {
            return;
        }


        const reels =
            document.querySelectorAll(
                ".student-reel"
            );


        if (!reels.length) {
            return;
        }


        const observer =
            new IntersectionObserver(
                function(entries) {

                    entries.forEach(
                        function(entry) {

                            if (
                                !entry.isIntersecting ||
                                entry.intersectionRatio <
                                    0.7
                            ) {
                                return;
                            }


                            const reel =
                                entry.target;


                            const reelId =
                                getReelId(
                                    reel
                                );


                            if (!reelId) {
                                return;
                            }


                            /*
                               نسجل المشاهدة
                               مرة واحدة لكل
                               ظهور أثناء الجلسة.
                            */

                            if (
                                reel.dataset.studentViewed ===
                                "true"
                            ) {

                                return;
                            }


                            reel.dataset.studentViewed =
                                "true";


                            registerView(
                                reelId
                            );

                        }
                    );
                },
                {
                    threshold:0.7
                }
            );


        reels.forEach(
            function(reel) {

                observer.observe(
                    reel
                );
            }
        );
    }


    /* =====================================================
       الصوت
    ===================================================== */

    function toggleVolume(
        button
    ) {

        const reel =
            getReelFromButton(
                button
            );


        const video =
            reel?.querySelector(
                "video"
            );


        if (!video) {
            return;
        }


        video.muted =
            !video.muted;


        const icon =
            button.querySelector(
                "i"
            );


        if (!icon) {
            return;
        }


        if (
            video.muted
        ) {

            icon.classList.remove(
                "fa-volume-high"
            );


            icon.classList.add(
                "fa-volume-xmark"
            );


        } else {

            icon.classList.remove(
                "fa-volume-xmark"
            );


            icon.classList.add(
                "fa-volume-high"
            );
        }


        /*
           نحفظ الحالة في العنصر
           حتى لا نعيدها بالخطأ.
        */

        reel.dataset.studentMuted =
            video.muted
                ? "true"
                : "false";
    }


    /* =====================================================
       تهيئة الفيديوهات
    ===================================================== */

    function initializeVideos() {

        const videos =
            document.querySelectorAll(
                ".student-reel video"
            );


        videos.forEach(
            function(video) {

                /*
                   لا نكسر التشغيل الحالي.
                */

                video.playsInline =
                    true;


                video.addEventListener(
                    "volumechange",
                    function() {

                        const reel =
                            video.closest(
                                ".student-reel"
                            );


                        if (!reel) {
                            return;
                        }


                        reel.dataset.studentMuted =
                            video.muted
                                ? "true"
                                : "false";
                    }
                );
            }
        );
    }


    /* =====================================================
       اعتراض زر الحفظ والصوت والمشاهدات
    ===================================================== */

    function bindMediaButtons() {

        /*
           الحفظ
        */

        document.addEventListener(
            "click",
            function(event) {

                const button =
                    event.target.closest(
                        ".student-reel [data-save]"
                    );


                if (!button) {
                    return;
                }


                event.preventDefault();
                event.stopImmediatePropagation();


                toggleSave(
                    button
                );

            },
            true
        );


        /*
           الصوت
        */

        document.addEventListener(
            "click",
            function(event) {

                const button =
                    event.target.closest(
                        ".student-reel [data-volume]"
                    );


                if (!button) {
                    return;
                }


                event.preventDefault();
                event.stopImmediatePropagation();


                toggleVolume(
                    button
                );

            },
            true
        );


        /*
           المشاهدات
        */

        document.addEventListener(
            "click",
            function(event) {

                const button =
                    event.target.closest(
                        ".student-reel [data-views]"
                    );


                if (!button) {
                    return;
                }


                event.preventDefault();
                event.stopImmediatePropagation();


                const reel =
                    getReelFromButton(
                        button
                    );


                const reelId =
                    getReelId(
                        reel
                    );


                if (reelId) {

                    updateViewCounter(
                        reelId
                    );

                    toast(
                        "يتم احتساب المشاهدة عند مشاهدة الـReel."
                    );
                }

            },
            true
        );
    }


    /* =====================================================
       مراقبة إضافة Reels جديدة للصفحة
    ===================================================== */

    function observeDOM() {

        const observer =
            new MutationObserver(
                function() {

                    initializeVideos();

                    watchReels();

                    initializeSaveButtons();

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

    window.StudentReelsMedia =
        window.StudentReelsMedia ||
        {};


    window.StudentReelsMedia.toggleSave =
        toggleSave;


    window.StudentReelsMedia.registerView =
        registerView;


    window.StudentReelsMedia.toggleVolume =
        toggleVolume;


    window.StudentReelsMedia.updateViewCounter =
        updateViewCounter;


    /* =====================================================
       Start
    ===================================================== */

    async function start() {

        await loadCurrentUser();


        bindMediaButtons();


        initializeVideos();


        watchReels();


        initializeSaveButtons();


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
