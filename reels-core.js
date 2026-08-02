/* =========================================================
   Student - Reels Core
   تشغيل سريع ومتكيّف مع سرعة الإنترنت
========================================================= */

(function () {

    "use strict";

    if (window.StudentReelsCore?.version) return;

    let observer = null;
    let observedContainer = null;
    let playRequest = 0;
    let measuredMbps = 0;

    function connectionInfo() {
        const connection =
            navigator.connection ||
            navigator.mozConnection ||
            navigator.webkitConnection ||
            null;

        const effectiveType = String(connection?.effectiveType || "");
        const saveData = Boolean(connection?.saveData);
        const downlink = Number(connection?.downlink || 0);

        let tier = "medium";

        if (saveData || effectiveType === "slow-2g" || effectiveType === "2g") {
            tier = "low";
        } else if (effectiveType === "4g" || downlink >= 4 || measuredMbps >= 4) {
            tier = "high";
        } else if (effectiveType === "3g" || downlink > 0 || measuredMbps > 0) {
            tier = "medium";
        }

        return { tier, effectiveType, saveData, downlink };
    }

    function getSource(video, tier) {
        if (!video) return "";

        const low = video.dataset.srcLow || "";
        const medium = video.dataset.srcMedium || "";
        const high = video.dataset.srcHigh || "";
        const fallback = video.dataset.src || "";

        if (tier === "low") return low || medium || fallback || high;
        if (tier === "high") return high || medium || fallback || low;
        return medium || low || fallback || high;
    }

    function waitUntilPlayable(video, timeoutMs = 3500) {
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

            function onReady() { finish(true); }
            function onError() { finish(false); }

            video.addEventListener("canplay", onReady, { once: true });
            video.addEventListener("loadeddata", onReady, { once: true });
            video.addEventListener("error", onError, { once: true });

            const timer = setTimeout(function () {
                finish(video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA);
            }, timeoutMs);
        });
    }

    function loadVideo(video, forcedTier) {
        if (!video) return Promise.resolve(false);

        const info = connectionInfo();
        const tier = forcedTier || info.tier;
        const source = getSource(video, tier);

        if (!source) return Promise.resolve(false);

        const preload = tier === "low" ? "metadata" : "auto";
        video.preload = preload;

        if (video.dataset.currentSource !== source || video.dataset.loaded !== "true") {
            const currentTime = Number(video.currentTime || 0);
            const wasPlaying = !video.paused;

            video.src = source;
            video.dataset.currentSource = source;
            video.dataset.currentTier = tier;
            video.dataset.loaded = "true";
            video.load();

            if (currentTime > 0) {
                video.addEventListener("loadedmetadata", function restoreTime() {
                    try { video.currentTime = Math.min(currentTime, video.duration || currentTime); } catch (_) {}
                    if (wasPlaying) video.play().catch(function () {});
                }, { once: true });
            }
        }

        return waitUntilPlayable(video, tier === "low" ? 5000 : 3200);
    }

    function unloadFarVideo(video) {
        if (!video || video.dataset.keepLoaded === "true") return;

        video.pause();
        video.removeAttribute("src");
        video.dataset.loaded = "false";
        video.dataset.currentSource = "";
        video.load();
    }

    function prepareAround(container, activeIndex) {
        if (!container) return;

        const videos = Array.from(container.querySelectorAll(".student-reel video"));
        const tier = connectionInfo().tier;
        const preloadDistance = tier === "high" ? 1 : 0;

        videos.forEach(function (video, index) {
            const distance = Math.abs(index - activeIndex);

            if (distance <= preloadDistance) {
                video.dataset.keepLoaded = "true";
                loadVideo(video);
            } else {
                video.dataset.keepLoaded = "false";
                video.preload = "none";

                if (distance > 1 && video.dataset.loaded === "true") {
                    unloadFarVideo(video);
                }
            }
        });
    }

    function bindAdaptiveFallback(video) {
        if (!video || video.dataset.adaptiveBound === "true") return;
        video.dataset.adaptiveBound = "true";

        let stallStartedAt = 0;
        let lastProgressAt = performance.now();
        let lastBufferedEnd = 0;

        video.addEventListener("progress", function () {
            try {
                if (!video.buffered.length) return;
                const end = video.buffered.end(video.buffered.length - 1);
                const now = performance.now();
                const secondsAdded = Math.max(0, end - lastBufferedEnd);
                const elapsed = Math.max(0.1, (now - lastProgressAt) / 1000);

                if (secondsAdded > 0.15) {
                    const estimated = Math.min(20, Math.max(0.2, secondsAdded / elapsed));
                    measuredMbps = measuredMbps ? (measuredMbps * 0.7 + estimated * 0.3) : estimated;
                    lastBufferedEnd = end;
                    lastProgressAt = now;
                }
            } catch (_) {}
        });

        video.addEventListener("waiting", function () {
            stallStartedAt = Date.now();

            setTimeout(function () {
                if (!stallStartedAt || !video.dataset.srcLow) return;
                if (Date.now() - stallStartedAt < 900) return;
                if (video.dataset.currentTier === "low") return;

                loadVideo(video, "low").then(function (ready) {
                    if (ready) video.play().catch(function () {});
                });
            }, 1000);
        });

        video.addEventListener("playing", function () {
            stallStartedAt = 0;
        });

        video.addEventListener("stalled", function () {
            if (video.dataset.srcLow && video.dataset.currentTier !== "low") {
                loadVideo(video, "low");
            }
        });
    }

    async function setActive(container, activeIndex) {
        if (!container) return;

        const requestId = ++playRequest;
        prepareAround(container, activeIndex);

        const videos = Array.from(container.querySelectorAll(".student-reel video"));

        videos.forEach(function (video, index) {
            bindAdaptiveFallback(video);
            if (index !== activeIndex) video.pause();
        });

        const activeVideo = videos[activeIndex];
        if (!activeVideo) return;

        activeVideo.preload = "auto";
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

        container.querySelectorAll(".student-reel video").forEach(bindAdaptiveFallback);

        if (!("IntersectionObserver" in window)) return;

        observer = new IntersectionObserver(
            function (entries) {
                entries.forEach(function (entry) {
                    if (!entry.isIntersecting) return;
                    const index = Number(entry.target.dataset.index || 0);
                    prepareAround(container, index);
                });
            },
            {
                root: container,
                rootMargin: "70% 0px",
                threshold: 0.01
            }
        );

        container.querySelectorAll(".student-reel").forEach(function (reel) {
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
        version: "1.2.0",
        connectionInfo,
        loadVideo,
        prepareAround,
        setActive,
        observe,
        destroy,
        debounce
    };

})();
