/* =========================================================
   Student - Reels Core
   تحسين التحميل والتشغيل واستهلاك الذاكرة
========================================================= */

(function () {

    "use strict";

    if (window.StudentReelsCore?.version) return;

    let observer = null;
    let observedContainer = null;

    function loadVideo(video) {
        if (!video || video.dataset.loaded === "true") return;

        const source = video.dataset.src;

        if (!source) return;

        video.src = source;
        video.dataset.loaded = "true";
        video.load();
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
                loadVideo(video);
            } else {
                video.dataset.keepLoaded = "false";

                if (distance > 3 && video.dataset.loaded === "true") {
                    unloadFarVideo(video);
                }
            }
        });
    }

    function setActive(container, activeIndex) {
        if (!container) return;

        prepareAround(container, activeIndex);

        const videos = Array.from(
            container.querySelectorAll(".student-reel video")
        );

        videos.forEach(function (video, index) {
            if (index === activeIndex) {
                loadVideo(video);

                const playPromise = video.play();

                if (playPromise?.catch) {
                    playPromise.catch(function () {});
                }
            } else {
                video.pause();
            }
        });
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
                rootMargin: "100% 0px",
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
        version: "1.0.0",
        loadVideo,
        prepareAround,
        setActive,
        observe,
        destroy,
        debounce
    };

})();
