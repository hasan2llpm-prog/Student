/* =========================================================
   Student - Reels Core
   تحسين التحميل والتشغيل واستهلاك الذاكرة
========================================================= */

(function () {

    "use strict";

    if (window.StudentReelsCore?.version) return;

    let observer = null;
    let observedContainer = null;
    let playRequest = 0;

    function waitUntilPlayable(video) {
        if (!video) return Promise.resolve(false);

        if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
            return Promise.resolve(true);
        }

        return new Promise(function (resolve) {
            let finished = false;

            function finish(result) {
                if (finished) return;
                finished = true;
                video.removeEventListener("canplay", onReady);
                video.removeEventListener("loadeddata", onReady);
                video.removeEventListener("error", onError);
                clearTimeout(timer);
                resolve(result);
            }

            function onReady() {
                finish(true);
            }

            function onError() {
                finish(false);
            }

            video.addEventListener("canplay", onReady, { once: true });
            video.addEventListener("loadeddata", onReady, { once: true });
            video.addEventListener("error", onError, { once: true });

            const timer = setTimeout(function () {
                finish(video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA);
            }, 4000);
        });
    }

    function loadVideo(video) {
        if (!video) return Promise.resolve(false);

        video.preload = "auto";

        if (video.dataset.loaded !== "true") {
            const source = video.dataset.src;

            if (!source) return Promise.resolve(false);

            video.src = source;
            video.dataset.loaded = "true";
            video.load();
        }

        return waitUntilPlayable(video);
    }

    function unloadFarVideo(video) {
        if (!video || video.dataset.keepLoaded === "true") return;

        video.pause();
        video.removeAttribute("src");
        video.dataset.loaded = "false";
        video.load();
    }

    function prepareAround(container, activeIndex) {
        if (!container) return;

        const videos = Array.from(
            container.querySelectorAll(".student-reel video")
        );

        videos.forEach(function (video, index) {
            const distance = Math.abs(index - activeIndex);

            if (distance <= 1) {
                video.dataset.keepLoaded = "true";
                video.preload = "auto";
                loadVideo(video);
            } else {
                video.dataset.keepLoaded = "false";

                if (distance > 3 && video.dataset.loaded === "true") {
                    unloadFarVideo(video);
                }
            }
        });
    }

    async function setActive(container, activeIndex) {
        if (!container) return;

        const requestId = ++playRequest;
        prepareAround(container, activeIndex);

        const videos = Array.from(
            container.querySelectorAll(".student-reel video")
        );

        videos.forEach(function (video, index) {
            if (index !== activeIndex) video.pause();
        });

        const activeVideo = videos[activeIndex];
        if (!activeVideo) return;

        const ready = await loadVideo(activeVideo);

        if (!ready || requestId !== playRequest) return;

        try {
            await activeVideo.play();
        } catch (_) {
            /* سيعمل بالنقر إذا منع المتصفح التشغيل التلقائي */
        }
    }

    function observe(container) {
        if (!container || observedContainer === container) return;

        observer?.disconnect();
        observedContainer = container;

        if (!("IntersectionObserver" in window)) return;

        observer = new IntersectionObserver(
            function (entries) {
                entries.forEach(function (entry) {
                    if (!entry.isIntersecting) return;

                    const reel = entry.target;
                    const index = Number(reel.dataset.index || 0);

                    prepareAround(container, index);
                });
            },
            {
                root: container,
                rootMargin: "150% 0px",
                threshold: 0.01
            }
        );

        container
            .querySelectorAll(".student-reel")
            .forEach(function (reel) {
                observer.observe(reel);
            });
    }

    function destroy() {
        playRequest += 1;
        observer?.disconnect();
        observer = null;
        observedContainer = null;
    }

    function debounce(fn, delay = 180) {
        let timer = null;

        return function (...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    window.StudentReelsCore = {
        version: "1.1.0",
        loadVideo,
        prepareAround,
        setActive,
        observe,
        destroy,
        debounce
    };

})();
